<?php
require_once __DIR__ . '/../src/bootstrap.php';

$user = require_login();

$id = isset($_GET['id']) ? (int) $_GET['id'] : 0;
$is_new = $id === 0;

if ($is_new && $user['role'] === 'viewer') {
    http_response_code(403);
    exit('Недостаточно прав');
}

$product = null;
if (!$is_new) {
    $product = get_product_with_photo_count($id);
    if (!$product) {
        http_response_code(404);
        exit('Карточка не найдена');
    }
}

$error = null;

if ($_SERVER['REQUEST_METHOD'] === 'POST' && isset($_POST['action']) && $_POST['action'] === 'save') {
    csrf_check();
    if ($user['role'] === 'viewer') {
        http_response_code(403);
        exit('Недостаточно прав');
    }

    $data = array(
        'name' => trim((string) $_POST['name']),
        'category' => (string) $_POST['category'],
        'subcategory' => trim((string) $_POST['subcategory']),
        'article' => trim((string) $_POST['article']),
        'price' => trim((string) $_POST['price']),
        'note' => trim((string) $_POST['note']),
    );

    if (!in_array($data['category'], PRODUCT_CATEGORIES, true)) {
        $error = 'Выберите категорию из списка.';
    } elseif ($data['price'] !== '' && !is_numeric(str_replace(',', '.', $data['price']))) {
        $error = 'Цена должна быть числом.';
    } else {
        if ($data['price'] !== '') {
            $data['price'] = str_replace(',', '.', $data['price']);
        }
        if ($is_new) {
            $id = create_product($data, $user);
            flash('success', 'Карточка создана.');
            redirect('product.php?id=' . $id);
        } else {
            update_product($id, $data, $user);
            flash('success', 'Изменения сохранены.');
            redirect('product.php?id=' . $id);
        }
    }
}

if (!$is_new && $_SERVER['REQUEST_METHOD'] === 'POST' && isset($_POST['action'])) {
    csrf_check();
    if ($_POST['action'] === 'toggle_published' && is_admin_user($user)) {
        set_published($id, empty($product['is_published']), $user);
        redirect('product.php?id=' . $id);
    }
    if ($_POST['action'] === 'toggle_archived' && is_admin_user($user)) {
        set_archived($id, empty($product['is_archived']), $user);
        redirect('product.php?id=' . $id);
    }
    if ($_POST['action'] === 'delete' && is_admin_user($user)) {
        delete_product($id);
        flash('success', 'Карточка удалена.');
        redirect('index.php');
    }
    if ($_POST['action'] === 'ack_note') {
        ack_note($id, $user);
        redirect('product.php?id=' . $id);
    }
    if ($_POST['action'] === 'unlink_site' && is_admin_user($user)) {
        set_product_site_image($id, '', $user);
        flash('success', 'Связь с сайтом снята.');
        redirect('product.php?id=' . $id);
    }
    if ($_POST['action'] === 'mark_site_updated' && is_admin_user($user)) {
        mark_site_updated($id, $user);
        flash('success', 'Отметили: изменения перенесены на сайт.');
        redirect('product.php?id=' . $id);
    }
    if ($_POST['action'] === 'delete_originals' && is_admin_user($user)) {
        delete_product_originals($id, $user['id']);
        flash('success', 'Оригиналы фото удалены, превью остались на месте.');
        redirect('product.php?id=' . $id);
    }
}

if (!$is_new) {
    $product = get_product_with_photo_count($id);
    $photos = list_product_photos($id);
    $status = product_status($product);
    $note_unread = is_note_unread($product, $user['id']);
    $note_acked_at = get_note_ack($id, $user['id']);
    $events = db()->prepare('SELECT e.*, u.first_name, u.last_name FROM product_events e
        LEFT JOIN users u ON u.id = e.user_id WHERE e.product_id = ? ORDER BY e.created_at DESC');
    $events->execute(array($id));
    $events = $events->fetchAll();
}

// Карточка открывается в режиме просмотра; форма — для новой карточки, по кнопке
// «Редактировать» или когда сохранение не прошло валидацию (чтобы не потерять ввод).
$edit_mode = $is_new || $error || !empty($_GET['edit']);
$form = $error ? $data : ($is_new ? array(
    'name' => '', 'category' => '', 'subcategory' => '', 'article' => '', 'price' => '', 'note' => '',
) : array_merge($product, array('price' => format_price_plain($product['price']))));

render_header($is_new ? 'Новый товар' : $product['name'], $user, 'work');
flash_messages();
?>

<?php if ($error): ?><div class="flash flash--error"><?php echo h($error); ?></div><?php endif; ?>

<div class="product-layout">
    <div>
        <?php if (!$is_new): ?>
        <div class="panel">
            <h2>Фотографии</h2>
            <div class="photo-grid" id="photo-grid">
                <?php foreach ($photos as $photo): ?>
                <div class="photo-grid__item" data-photo-id="<?php echo (int) $photo['id']; ?>">
                    <img src="photo.php?id=<?php echo (int) $photo['id']; ?>&thumb=1" alt="">
                    <?php if ($photo['is_main']): ?><span class="photo-grid__main-badge">Главное</span><?php endif; ?>
                    <?php if ($user['role'] !== 'viewer'): ?>
                    <button type="button" class="photo-grid__delete" data-delete-photo="<?php echo (int) $photo['id']; ?>" title="Удалить">×</button>
                    <?php endif; ?>
                </div>
                <?php endforeach; ?>
            </div>
            <?php if ($user['role'] !== 'viewer' && count($photos) < 10): ?>
            <div class="photo-upload-drop" id="photo-upload-drop" style="margin-top:12px;">
                Нажмите или перетащите фото сюда (до 10 шт.)
                <input type="file" id="photo-input" accept="image/*" multiple style="display:none;">
            </div>
            <?php endif; ?>
        </div>
        <?php endif; ?>

        <?php if (!$is_new && $events): ?>
        <div class="panel">
            <h2>История</h2>
            <ul class="events">
                <?php foreach ($events as $ev): ?>
                <li>
                    <time><?php echo h(date('d.m.Y H:i', strtotime($ev['created_at']))); ?><?php echo $ev['first_name'] ? ' · ' . h($ev['first_name'] . ' ' . $ev['last_name']) : ''; ?></time>
                    <?php echo h($ev['message']); ?>
                </li>
                <?php endforeach; ?>
            </ul>
        </div>
        <?php endif; ?>

        <?php if (!$is_new && is_admin_user($user)): ?>
        <div class="panel">
            <h2>Публикация</h2>
            <div class="dim" style="font-size:13px; margin-bottom:10px;">
                Связь с сайтом:
                <?php if (!empty($product['site_image_path'])): ?>
                    <span style="word-break:break-all;"><?php echo h($product['site_image_path']); ?></span>
                    <?php if (product_site_match_exists($product)): ?>
                        · найдена в последнем снимке каталога
                    <?php else: ?>
                        · в последнем снимке каталога не найдена (сверьте после «Обновить список»)
                    <?php endif; ?>
                <?php else: ?>
                    не привязано
                <?php endif; ?>
            </div>
            <?php if (!empty($product['needs_site_update'])): ?>
            <div class="flash flash--error" style="margin-bottom:14px;">
                Название/артикул/цена изменились после публикации — на сайте ещё старые данные.
                <form method="post" style="margin-top:8px;">
                    <?php echo csrf_field(); ?>
                    <input type="hidden" name="action" value="mark_site_updated">
                    <button type="submit" class="btn btn--sm">Отметить: перенесено на сайт</button>
                </form>
            </div>
            <?php endif; ?>
            <div class="pill-row" style="margin-bottom:14px;">
                <a href="site-catalog.php?pick_for=<?php echo (int) $id; ?>" class="btn btn--sm btn--secondary">
                    <?php echo $product['site_image_path'] ? 'Изменить привязку' : 'Выбрать из списка «Что на сайте»'; ?>
                </a>
                <?php if ($product['site_image_path']): ?>
                <form method="post">
                    <?php echo csrf_field(); ?>
                    <input type="hidden" name="action" value="unlink_site">
                    <button type="submit" class="btn btn--sm btn--secondary">Снять привязку</button>
                </form>
                <?php endif; ?>
            </div>
            <?php if (!empty($product['is_published'])): ?>
            <div class="dim" style="font-size:13px; margin-bottom:14px;">
                <?php if (!empty($product['originals_deleted_at'])): ?>
                    Оригиналы фото удалены <?php echo h(date('d.m.Y', strtotime($product['originals_deleted_at']))); ?> — превью остались.
                <?php elseif ($photos): ?>
                    Оригиналы фото ещё на диске.
                    <form method="post" style="display:inline;" onsubmit="return confirm('Удалить оригиналы фото? Превью останутся, карточка и история — тоже. Действие необратимо.');">
                        <?php echo csrf_field(); ?>
                        <input type="hidden" name="action" value="delete_originals">
                        <button type="submit" class="btn btn--sm btn--secondary">Удалить оригиналы</button>
                    </form>
                <?php endif; ?>
            </div>
            <?php endif; ?>
            <div class="pill-row">
                <form method="post">
                    <?php echo csrf_field(); ?>
                    <input type="hidden" name="action" value="toggle_published">
                    <button type="submit" class="btn btn--sm <?php echo $product['is_published'] ? 'btn--secondary' : ''; ?>">
                        <?php echo $product['is_published'] ? 'Снять отметку «опубликован»' : 'Отметить опубликованным'; ?>
                    </button>
                </form>
                <form method="post">
                    <?php echo csrf_field(); ?>
                    <input type="hidden" name="action" value="toggle_archived">
                    <button type="submit" class="btn btn--sm btn--secondary">
                        <?php echo $product['is_archived'] ? 'Вернуть из архива' : 'В архив (снято с производства)'; ?>
                    </button>
                </form>
                <form method="post" onsubmit="return confirm('Удалить карточку без возможности восстановления?');">
                    <?php echo csrf_field(); ?>
                    <input type="hidden" name="action" value="delete">
                    <button type="submit" class="btn btn--sm btn--danger">Удалить карточку</button>
                </form>
            </div>
        </div>
        <?php endif; ?>
    </div>

    <div class="panel">
        <div style="display:flex; align-items:center; justify-content:space-between; gap:12px;">
            <h2 style="margin:0;"><?php echo $is_new ? 'Новая карточка' : 'Данные товара'; ?></h2>
            <a href="index.php" class="btn btn--secondary btn--sm" title="Закрыть и вернуться в «В работе»">✕ Закрыть</a>
        </div>
        <?php if (!$is_new): ?>
        <div class="pill-row" style="margin-bottom:14px;">
            <span class="badge badge--<?php echo h($status['code']); ?>"><?php echo h($status['label']); ?></span>
            <?php if ($note_unread): ?>
            <span class="badge badge-note badge-note--unread">💬 Новый комментарий</span>
            <?php elseif (trim((string) $product['note']) !== ''): ?>
            <span class="badge badge-note">💬 Комментарий прочитан</span>
            <?php endif; ?>
        </div>
        <?php endif; ?>

        <?php if ($edit_mode): ?>
        <form method="post">
            <?php echo csrf_field(); ?>
            <input type="hidden" name="action" value="save">
            <div class="field">
                <label for="name">Название (как будет на сайте)</label>
                <input type="text" id="name" name="name" placeholder='Магнит "Екатеринбург" 50x70'
                    value="<?php echo h($form['name']); ?>">
            </div>
            <div class="field">
                <label for="category">Категория</label>
                <select id="category" name="category" required>
                    <option value="">Выберите…</option>
                    <?php foreach (PRODUCT_CATEGORIES as $cat): ?>
                    <option value="<?php echo h($cat); ?>" <?php echo $form['category'] === $cat ? 'selected' : ''; ?>><?php echo h($cat); ?></option>
                    <?php endforeach; ?>
                </select>
            </div>
            <div class="field">
                <label for="subcategory">Подраздел</label>
                <input type="text" id="subcategory" name="subcategory" placeholder='Например, «Магнит 50×70»'
                    value="<?php echo h($form['subcategory']); ?>">
            </div>
            <div class="field">
                <label for="article">Артикул</label>
                <input type="text" id="article" name="article" value="<?php echo h($form['article']); ?>">
            </div>
            <div class="field">
                <label for="price">Цена, руб.</label>
                <input type="text" id="price" name="price" value="<?php echo h($form['price']); ?>">
            </div>
            <div class="field">
                <label for="note">Комментарий</label>
                <textarea id="note" name="note" rows="3"><?php echo h($form['note']); ?></textarea>
            </div>
            <div class="pill-row">
                <button type="submit" class="btn"><?php echo $is_new ? 'Создать карточку' : 'Сохранить'; ?></button>
                <?php if (!$is_new): ?>
                <a href="product.php?id=<?php echo (int) $id; ?>" class="btn btn--secondary">Отмена</a>
                <?php endif; ?>
            </div>
        </form>
        <?php else: ?>
        <dl class="view-fields">
            <dt>Название</dt><dd><?php echo $product['name'] !== '' ? h($product['name']) : '<span class="dim">(без названия)</span>'; ?></dd>
            <dt>Категория</dt><dd><?php echo h($product['category']); ?></dd>
            <dt>Подраздел</dt><dd><?php echo $product['subcategory'] !== '' && $product['subcategory'] !== null ? h($product['subcategory']) : '—'; ?></dd>
            <dt>Артикул</dt><dd><?php echo $product['article'] !== '' && $product['article'] !== null ? h($product['article']) : '—'; ?></dd>
            <dt>Цена</dt><dd><?php echo $product['price'] !== null ? h(format_price($product['price'])) : '—'; ?></dd>
            <dt>Комментарий</dt>
            <dd>
                <?php echo $product['note'] !== '' && $product['note'] !== null ? nl2br(h($product['note'])) : '—'; ?>
                <?php if ($note_unread): ?>
                <form method="post" style="margin-top:10px;">
                    <?php echo csrf_field(); ?>
                    <input type="hidden" name="action" value="ack_note">
                    <button type="submit" class="btn btn--sm">Отметить, что прочитал(а)</button>
                </form>
                <?php elseif ($note_acked_at && trim((string) $product['note']) !== ''): ?>
                <div class="dim" style="font-size:12px; margin-top:6px;">
                    Прочитано вами <?php echo h(date('d.m.Y H:i', strtotime($note_acked_at))); ?>
                </div>
                <?php endif; ?>
            </dd>
        </dl>
        <?php if ($user['role'] !== 'viewer'): ?>
        <a href="product.php?id=<?php echo (int) $id; ?>&edit=1" class="btn">Редактировать</a>
        <?php endif; ?>
        <?php endif; ?>
    </div>
</div>

<?php
render_footer();
