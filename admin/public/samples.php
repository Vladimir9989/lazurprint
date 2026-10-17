<?php
require_once __DIR__ . '/../src/bootstrap.php';

$user = require_role(array('admin', 'manager'));
$is_admin = is_admin_user($user);

if ($_SERVER['REQUEST_METHOD'] === 'POST') {
    if (!$is_admin) {
        http_response_code(403);
        exit('Недостаточно прав');
    }
    csrf_check();
    $action = isset($_POST['action']) ? $_POST['action'] : '';

    if ($action === 'upload') {
        $category_id = (int) $_POST['category_id'];
        $title = trim((string) $_POST['title']);
        $ok = 0;
        $errors = array();
        if (!empty($_FILES['photos']['name'][0])) {
            $count = count($_FILES['photos']['name']);
            for ($i = 0; $i < $count; $i++) {
                if ($_FILES['photos']['error'][$i] !== UPLOAD_ERR_OK) {
                    $errors[] = $_FILES['photos']['name'][$i] . ': ошибка загрузки (возможно, файл слишком большой).';
                    continue;
                }
                $r = sample_save_upload($_FILES['photos']['tmp_name'][$i], $_FILES['photos']['name'][$i], $category_id,
                    $count === 1 ? $title : '', $user['id']);
                if ($r === true) {
                    $ok++;
                } else {
                    $errors[] = $r;
                }
            }
        } else {
            $errors[] = 'Выберите хотя бы один файл.';
        }
        if ($ok) {
            flash('success', 'Загружено фото: ' . $ok . '.');
        }
        foreach ($errors as $e) {
            flash('error', $e);
        }
    } elseif ($action === 'delete') {
        sample_delete((int) $_POST['id']);
        flash('success', 'Фото удалено.');
    } elseif ($action === 'move') {
        db()->prepare('UPDATE samples SET category_id = ?, title = ? WHERE id = ?')
            ->execute(array((int) $_POST['category_id'], trim((string) $_POST['title']), (int) $_POST['id']));
        flash('success', 'Сохранено.');
    } elseif ($action === 'cat_add') {
        $name = trim((string) $_POST['name']);
        if ($name === '') {
            flash('error', 'Введите название категории.');
        } else {
            $max = (int) db()->query('SELECT COALESCE(MAX(sort_order), 0) m FROM sample_categories')->fetch()['m'];
            db()->prepare('INSERT INTO sample_categories (name, segments, sort_order) VALUES (?, ?, ?)')
                ->execute(array($name, trim((string) $_POST['segments']), $max + 10));
            flash('success', 'Категория добавлена.');
        }
    } elseif ($action === 'cat_save') {
        db()->prepare('UPDATE sample_categories SET name = ?, segments = ? WHERE id = ?')
            ->execute(array(trim((string) $_POST['name']), trim((string) $_POST['segments']), (int) $_POST['id']));
        flash('success', 'Категория сохранена.');
    } elseif ($action === 'cat_delete') {
        sample_category_delete((int) $_POST['id']);
        flash('success', 'Категория и её фото удалены.');
    }
    redirect('samples.php' . (isset($_POST['manage']) ? '?manage=1' : ''));
}

$manage = $is_admin && !empty($_GET['manage']);
$categories = sample_categories();

render_header('Образцы', $user, 'samples');
flash_messages();
?>

<div class="toolbar">
    <h1 class="h1" style="margin:0; flex:1 1 auto;">Фото-образцы для писем</h1>
    <?php if ($is_admin): ?>
    <a href="samples.php<?php echo $manage ? '' : '?manage=1'; ?>" class="btn btn--secondary btn--sm"><?php echo $manage ? 'Обычный вид' : 'Управление: загрузка и категории'; ?></a>
    <?php endif; ?>
</div>

<?php if ($manage): ?>
<div class="panel">
    <h2>Загрузить фото</h2>
    <p class="dim" style="margin-top:0;">Загружайте любой исходник (JPG, PNG, WebP). Сервер сам сделает версию для письма (длинная сторона до 1600 px, до 800 КБ) и превью для списка.</p>
    <form method="post" enctype="multipart/form-data" class="form-grid">
        <?php echo csrf_field(); ?>
        <input type="hidden" name="action" value="upload">
        <input type="hidden" name="manage" value="1">
        <div class="field"><label for="up-cat">Категория</label>
            <select id="up-cat" name="category_id" required>
                <?php foreach ($categories as $c): ?><option value="<?php echo (int) $c['id']; ?>"><?php echo h($c['name']); ?></option><?php endforeach; ?>
            </select></div>
        <div class="field"><label for="up-title">Название (если файл один)</label><input type="text" id="up-title" name="title" placeholder="Журнал «Стольник», разворот"></div>
        <div class="field"><label for="up-files">Файлы (можно несколько)</label><input type="file" id="up-files" name="photos[]" accept="image/jpeg,image/png,image/webp" multiple required></div>
        <div><button type="submit" class="btn btn--sm">Загрузить</button></div>
    </form>
</div>

<div class="panel">
    <h2>Категории</h2>
    <p class="dim" style="margin-top:0;">«Для сегментов» — какие сегменты клиентов предвыбирают эту категорию в карточке (через запятую, например: издательство, периодика).</p>
    <?php foreach ($categories as $c): ?>
    <form method="post" class="cat-form">
        <?php echo csrf_field(); ?>
        <input type="hidden" name="manage" value="1">
        <input type="hidden" name="id" value="<?php echo (int) $c['id']; ?>">
        <input type="text" name="name" value="<?php echo h($c['name']); ?>" required>
        <input type="text" name="segments" value="<?php echo h($c['segments']); ?>" placeholder="для сегментов: издательство, периодика">
        <span class="dim"><?php echo (int) $c['cnt']; ?> фото</span>
        <button type="submit" name="action" value="cat_save" class="btn btn--sm btn--secondary">Сохранить</button>
        <button type="submit" name="action" value="cat_delete" class="btn btn--sm btn--danger"
            onclick="return confirm('Удалить категорию «<?php echo h(addslashes($c['name'])); ?>» вместе с <?php echo (int) $c['cnt']; ?> фото?');">Удалить</button>
    </form>
    <?php endforeach; ?>
    <form method="post" class="cat-form" style="margin-top:12px;">
        <?php echo csrf_field(); ?>
        <input type="hidden" name="action" value="cat_add">
        <input type="hidden" name="manage" value="1">
        <input type="text" name="name" placeholder="Новая категория" required>
        <input type="text" name="segments" placeholder="для сегментов (необязательно)">
        <button type="submit" class="btn btn--sm">Добавить</button>
    </form>
</div>
<?php endif; ?>

<form method="post" action="sample-zip.php" id="sample-picker">
    <?php echo csrf_field(); ?>
    <?php $any = false; foreach ($categories as $c):
        $items = sample_list($c['id']);
        if (!$items && !$manage) continue;
        $any = $any || $items; ?>
    <div class="panel sample-cat">
        <div class="sample-cat__title">
            <?php echo h($c['name']); ?> <span class="dim">(<?php echo count($items); ?>)</span>
            <?php if ($items): ?><button type="button" class="linklike" data-toggle-all="cat-<?php echo (int) $c['id']; ?>">выбрать все</button><?php endif; ?>
        </div>
        <?php if ($items): ?>
        <div class="sample-grid" id="cat-<?php echo (int) $c['id']; ?>">
            <?php foreach ($items as $s): ?>
            <div class="sample-item">
                <label>
                    <input type="checkbox" name="ids[]" value="<?php echo (int) $s['id']; ?>">
                    <img src="sample.php?id=<?php echo (int) $s['id']; ?>&amp;thumb=1" alt="<?php echo h($s['title']); ?>" loading="lazy">
                    <span><?php echo h($s['title']); ?></span>
                </label>
                <div class="sample-item__links">
                    <a href="sample.php?id=<?php echo (int) $s['id']; ?>&amp;download=1">скачать</a>
                    <a href="sample.php?id=<?php echo (int) $s['id']; ?>" target="_blank" rel="noopener">открыть</a>
                    <?php if ($manage): ?>
                    <button type="submit" class="linklike linklike--danger" form="del-<?php echo (int) $s['id']; ?>"
                        onclick="return confirm('Удалить это фото?');">удалить</button>
                    <?php endif; ?>
                </div>
            </div>
            <?php endforeach; ?>
        </div>
        <?php else: ?>
        <div class="dim">Пока нет фото.</div>
        <?php endif; ?>
    </div>
    <?php endforeach; ?>

    <?php if (!$any && !$manage): ?>
    <div class="empty-state">Фото-образцов пока нет.<?php echo $is_admin ? ' Загрузите их в режиме «Управление».' : ''; ?></div>
    <?php else: ?>
    <div class="sticky-bar">
        <button type="submit" class="btn" data-zip-button>Скачать выбранные (ZIP)</button>
        <span class="dim" style="font-size:12px;">Отметьте фото, скачайте архив, распакуйте и прикрепите файлы к письму.</span>
    </div>
    <?php endif; ?>
</form>

<?php if ($manage): foreach ($categories as $c): foreach (sample_list($c['id']) as $s): ?>
<form method="post" id="del-<?php echo (int) $s['id']; ?>">
    <?php echo csrf_field(); ?>
    <input type="hidden" name="action" value="delete">
    <input type="hidden" name="manage" value="1">
    <input type="hidden" name="id" value="<?php echo (int) $s['id']; ?>">
</form>
<?php endforeach; endforeach; endif; ?>

<?php
render_footer();
