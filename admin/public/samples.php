<?php
require_once __DIR__ . '/../src/bootstrap.php';

$user = require_role(array('admin', 'manager', 'viewer'));
$is_admin = is_admin_user($user);
$is_viewer = $user['role'] === 'viewer'; // руководитель: только просмотр и скачивание

if ($_SERVER['REQUEST_METHOD'] === 'POST') {
    if ($is_viewer) {
        http_response_code(403);
        exit('Недостаточно прав');
    }
    csrf_check();
    $action = isset($_POST['action']) ? $_POST['action'] : '';
    // Категориями управляет только админ; фото загружает любой вошедший, менять и удалять —
    // админ или тот, кто загрузил.
    if (strpos($action, 'cat_') === 0 && !$is_admin) {
        http_response_code(403);
        exit('Недостаточно прав');
    }
    if (in_array($action, array('delete', 'move'), true)) {
        $own = sample_get((int) $_POST['id']);
        if (!$own || (!$is_admin && (int) $own['uploaded_by'] !== (int) $user['id'])) {
            http_response_code(403);
            exit('Недостаточно прав');
        }
    }

    if ($action === 'upload') {
        $category_id = (int) $_POST['category_id'];
        $new_cat = trim((string) (isset($_POST['new_category']) ? $_POST['new_category'] : ''));
        if ($new_cat !== '') {
            $category_id = sample_category_ensure($new_cat);
        }
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
    redirect('samples.php' . (isset($_POST['manage']) && $is_admin ? '?manage=1' : ''));
}

$manage = $is_admin && !empty($_GET['manage']);
$categories = sample_categories();

render_header('Образцы', $user, 'samples');
flash_messages();
?>

<div class="toolbar">
    <h1 class="h1" style="margin:0; flex:1 1 auto;">Фото-образцы для писем</h1>
    <?php if ($is_admin): ?>
    <a href="samples.php<?php echo $manage ? '' : '?manage=1'; ?>" class="btn btn--secondary btn--sm"><?php echo $manage ? 'Обычный вид' : 'Управление: категории'; ?></a>
    <?php endif; ?>
</div>

<?php if (!$is_viewer): ?>
<details class="panel" id="sample-upload"<?php echo !empty($_GET['up']) ? ' open' : ''; ?>>
    <summary style="cursor:pointer; font-weight:600;">Добавить свои фото</summary>
    <p class="dim">Выберите категорию или впишите новую: тогда она появится сама. Загрузите фото как есть (JPG, PNG, WebP, до 30 МБ). Оригинал сохраняется без потери качества и скачивается именно он; в списке показывается лёгкая копия, чтобы страница не тормозила.</p>
    <form method="post" enctype="multipart/form-data" class="form-grid">
        <?php echo csrf_field(); ?>
        <input type="hidden" name="action" value="upload">
        <div class="field"><label for="up-cat">Категория</label>
            <select id="up-cat" name="category_id" required>
                <?php foreach ($categories as $c): ?><option value="<?php echo (int) $c['id']; ?>"><?php echo h($c['name']); ?></option><?php endforeach; ?>
            </select></div>
        <div class="field"><label for="up-newcat">Нужной категории нет? Впишите новую</label><input type="text" id="up-newcat" name="new_category" maxlength="100" placeholder="Например: Блокноты"></div>
        <div class="field"><label for="up-title">Название (если файл один)</label><input type="text" id="up-title" name="title" placeholder="Журнал «Стольник», разворот"><div class="dim" style="font-size:12px;margin-top:4px;">Если файлов несколько, названия возьмутся из имён файлов, потом их можно изменить кнопкой «изменить».</div></div>
        <div class="field"><label for="up-files">Файлы (можно несколько)</label><input type="file" id="up-files" name="photos[]" accept="image/jpeg,image/png,image/webp" multiple required></div>
        <div><button type="submit" class="btn btn--sm">Загрузить</button></div>
    </form>
</details>
<?php endif; ?>

<?php if ($manage): ?>
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
                    <span class="dim" style="font-size:11px;">оригинал <?php echo $s['size_bytes'] >= 1048576 ? number_format($s['size_bytes'] / 1048576, 1, ',', '') . ' МБ' : (int) round($s['size_bytes'] / 1024) . ' КБ'; ?><?php echo $s['width'] ? ', ' . (int) $s['width'] . '×' . (int) $s['height'] : ''; ?></span>
                </label>
                <div class="sample-item__links">
                    <a href="sample.php?id=<?php echo (int) $s['id']; ?>&amp;download=1">скачать</a>
                    <a href="sample.php?id=<?php echo (int) $s['id']; ?>" target="_blank" rel="noopener">открыть</a>
                    <?php if ($is_admin || (int) $s['uploaded_by'] === (int) $user['id']): ?>
                    <a href="#edit-<?php echo (int) $s['id']; ?>" data-edit="edit-<?php echo (int) $s['id']; ?>">изменить</a>
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
    <div class="empty-state">Фото-образцов пока нет.<?php echo $is_admin ? ' Раскройте «Добавить свои фото» выше.' : ''; ?></div>
    <?php else: ?>
    <div class="sample-fab">
        <button type="button" class="btn" data-download-button>Скачать выбранные</button>
        <button type="button" class="linklike" data-clear-selection>снять выбор</button>
    </div>
    <p class="dim" style="font-size:12px;">Отметьте фото галочкой: кнопка «Скачать выбранные» появится справа внизу. Файлы скачиваются по одному, их можно сразу прикрепить к письму. Если браузер спросит про несколько файлов, нажмите «Разрешить».</p>
    <?php endif; ?>
</form>

<?php foreach ($categories as $c): foreach (sample_list($c['id']) as $s):
    if (!$is_admin && (int) $s['uploaded_by'] !== (int) $user['id']) continue; ?>
<form method="post" id="del-<?php echo (int) $s['id']; ?>">
    <?php echo csrf_field(); ?>
    <input type="hidden" name="action" value="delete">
    <input type="hidden" name="manage" value="<?php echo $manage ? 1 : 0; ?>">
    <input type="hidden" name="id" value="<?php echo (int) $s['id']; ?>">
</form>
<form method="post" class="panel edit-form" id="edit-<?php echo (int) $s['id']; ?>" hidden style="margin-top:12px;">
    <?php echo csrf_field(); ?>
    <input type="hidden" name="action" value="move">
    <input type="hidden" name="manage" value="<?php echo $manage ? 1 : 0; ?>">
    <input type="hidden" name="id" value="<?php echo (int) $s['id']; ?>">
    <strong>Изменить фото</strong>
    <input type="text" name="title" value="<?php echo h($s['title']); ?>" placeholder="Название">
    <select name="category_id"><?php foreach ($categories as $c2): ?><option value="<?php echo (int) $c2['id']; ?>"<?php echo (int) $c2['id'] === (int) $s['category_id'] ? ' selected' : ''; ?>><?php echo h($c2['name']); ?></option><?php endforeach; ?></select>
    <button type="submit" class="btn btn--sm">Сохранить</button>
    <button type="button" class="btn btn--sm btn--secondary" data-edit-close>Отмена</button>
</form>
<?php endforeach; endforeach; ?>

<script>
document.addEventListener('click', function (e) {
    var x = e.target.closest('[data-edit-close]');
    if (x) { x.closest('form').hidden = true; return; }
    var a = e.target.closest('[data-edit]');
    if (!a) return;
    e.preventDefault();
    var f = document.getElementById(a.getAttribute('data-edit'));
    if (f) { f.hidden = !f.hidden; if (!f.hidden) f.scrollIntoView({ block: 'center' }); }
});
</script>

<?php
render_footer();
