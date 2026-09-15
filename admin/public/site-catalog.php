<?php
require_once __DIR__ . '/../src/bootstrap.php';

$user = require_login();

// Режим "выбора": сюда можно попасть с карточки товара, чтобы привязать её к позиции
// на сайте — тогда у каждой строки есть кнопка "Выбрать", а не просто список.
$pick_for = isset($_GET['pick_for']) ? (int) $_GET['pick_for'] : 0;
$pick_product = null;
if ($pick_for) {
    $pick_product = get_product($pick_for);
    if (!$pick_product || !is_admin_user($user)) {
        http_response_code(403);
        exit('Недостаточно прав');
    }
}

if ($_SERVER['REQUEST_METHOD'] === 'POST' && isset($_POST['action'])) {
    csrf_check();

    if ($_POST['action'] === 'sync' && $user['role'] !== 'viewer') {
        try {
            $result = resync_site_catalog();
            $auto = auto_publish_after_sync($user);
            $msg = 'Список обновлён: позиций в каталоге — ' . $result['inserted'] . '.';
            if ($auto > 0) {
                $msg .= ' Автоматически отмечено опубликованными: ' . $auto . '.';
            }
            flash('success', $msg);
        } catch (Exception $e) {
            flash('error', 'Не удалось разобрать каталог сайта: ' . $e->getMessage());
        }
        redirect('site-catalog.php');
    }

    if ($_POST['action'] === 'link' && is_admin_user($user)) {
        $product_id = (int) $_POST['product_id'];
        $image_path = (string) $_POST['image_path'];
        $product = get_product($product_id);
        if ($product) {
            set_product_site_image($product_id, $image_path, $user);
            refresh_product_published_status($product_id, $user);
            flash('success', 'Карточка привязана к позиции на сайте.');
        }
        redirect('product.php?id=' . $product_id);
    }

    if ($_POST['action'] === 'unlink' && is_admin_user($user)) {
        $product_id = (int) $_POST['product_id'];
        set_product_site_image($product_id, '', $user);
        flash('success', 'Связь с сайтом снята.');
        redirect('product.php?id=' . $product_id);
    }

    // "Редактировать" у позиции из реального каталога сайта: если карточки в админке для
    // неё ещё нет — заводим (уже опубликованную), дальше открываем её на редактирование.
    if ($_POST['action'] === 'edit_from_site' && $user['role'] !== 'viewer') {
        $image_path = (string) $_POST['image_path'];
        $product = find_product_by_site_image($image_path);
        if ($product) {
            redirect('product.php?id=' . $product['id'] . '&edit=1');
        }
        $id = create_product_from_site_row(array(
            'name' => (string) $_POST['name'],
            'category' => (string) $_POST['category'],
            'subcategory' => (string) $_POST['subcategory'],
            'article' => (string) $_POST['article'],
            'price' => (string) $_POST['price'],
            'image_path' => $image_path,
        ), $user);
        redirect('product.php?id=' . $id . '&edit=1');
    }
}

$filters = array(
    'category' => isset($_GET['category']) ? $_GET['category'] : '',
    'q' => isset($_GET['q']) ? trim($_GET['q']) : '',
);
$rows = search_site_catalog($filters['category'], $filters['q']);
$categories = site_catalog_categories();
$stats = site_catalog_stats();

render_header('Что на сайте', $user, 'site');
flash_messages();
?>

<div class="toolbar">
    <h1 class="h1" style="margin:0; flex:1 1 auto;">
        <?php echo $pick_product ? 'Привязать к позиции на сайте' : 'Что на сайте'; ?>
    </h1>
    <?php if ($user['role'] !== 'viewer'): ?>
    <form method="post">
        <?php echo csrf_field(); ?>
        <input type="hidden" name="action" value="sync">
        <button type="submit" class="btn btn--secondary btn--sm">Обновить список</button>
    </form>
    <?php endif; ?>
</div>

<?php if ($pick_product): ?>
<div class="flash flash--info">
    Выбираете позицию для карточки «<?php echo h($pick_product['name'] !== '' ? $pick_product['name'] : '(без названия)'); ?>».
    <a href="product.php?id=<?php echo (int) $pick_product['id']; ?>">Отменить и вернуться к карточке</a>
</div>
<?php endif; ?>

<div class="dim" style="margin-bottom:14px; font-size:13px;">
    Позиций в снимке: <?php echo (int) $stats['c']; ?><?php echo $stats['synced_at'] ? ', обновлено ' . h(date('d.m.Y H:i', strtotime($stats['synced_at']))) : ' — список ещё ни разу не собирался'; ?>.
</div>

<form method="get" class="toolbar">
    <?php if ($pick_for): ?><input type="hidden" name="pick_for" value="<?php echo (int) $pick_for; ?>"><?php endif; ?>
    <input type="search" name="q" placeholder="Название, артикул или путь к фото" value="<?php echo h($filters['q']); ?>">
    <select name="category">
        <option value="">Все категории</option>
        <?php foreach ($categories as $cat): ?>
        <option value="<?php echo h($cat); ?>" <?php echo $filters['category'] === $cat ? 'selected' : ''; ?>><?php echo h($cat); ?></option>
        <?php endforeach; ?>
    </select>
    <button type="submit" class="btn btn--secondary btn--sm">Найти</button>
</form>

<?php if (!$rows): ?>
    <div class="empty-state">
        <?php echo $stats['c'] ? 'Ничего не нашлось по этому фильтру.' : 'Список пуст — нажмите «Обновить список», чтобы разобрать каталог сайта.'; ?>
    </div>
<?php else: ?>
<div style="overflow-x:auto;">
<table class="table">
    <thead>
        <tr>
            <th>Фото</th>
            <th>Название</th>
            <th>Категория / подраздел</th>
            <th>Артикул</th>
            <th>Цена</th>
            <?php if ($pick_product): ?><th></th><?php endif; ?>
            <?php if ($user['role'] !== 'viewer'): ?><th></th><?php endif; ?>
        </tr>
    </thead>
    <tbody>
        <?php foreach ($rows as $row): ?>
        <tr>
            <td>
                <img class="site-thumb" src="site-image.php?path=<?php echo urlencode($row['image_path']); ?>"
                    alt="" loading="lazy" title="<?php echo h($row['image_path']); ?>">
            </td>
            <td><?php echo h($row['name']); ?></td>
            <td><?php echo h($row['category']); ?><?php echo $row['subcategory'] ? ' · ' . h($row['subcategory']) : ''; ?></td>
            <td><?php echo h($row['article']); ?></td>
            <td><?php echo h($row['price']); ?></td>
            <?php if ($pick_product): ?>
            <td>
                <form method="post">
                    <?php echo csrf_field(); ?>
                    <input type="hidden" name="action" value="link">
                    <input type="hidden" name="product_id" value="<?php echo (int) $pick_product['id']; ?>">
                    <input type="hidden" name="image_path" value="<?php echo h($row['image_path']); ?>">
                    <button type="submit" class="btn btn--sm">Выбрать</button>
                </form>
            </td>
            <?php endif; ?>
            <?php if ($user['role'] !== 'viewer'): ?>
            <td>
                <form method="post">
                    <?php echo csrf_field(); ?>
                    <input type="hidden" name="action" value="edit_from_site">
                    <input type="hidden" name="image_path" value="<?php echo h($row['image_path']); ?>">
                    <input type="hidden" name="name" value="<?php echo h($row['name']); ?>">
                    <input type="hidden" name="category" value="<?php echo h($row['category']); ?>">
                    <input type="hidden" name="subcategory" value="<?php echo h($row['subcategory']); ?>">
                    <input type="hidden" name="article" value="<?php echo h($row['article']); ?>">
                    <input type="hidden" name="price" value="<?php echo h($row['price']); ?>">
                    <button type="submit" class="btn btn--sm btn--secondary" title="Изменить название/артикул/цену — например, если они поменялись у уже опубликованного товара">Редактировать</button>
                </form>
            </td>
            <?php endif; ?>
        </tr>
        <?php endforeach; ?>
    </tbody>
</table>
</div>
<?php endif; ?>

<?php
render_footer();
