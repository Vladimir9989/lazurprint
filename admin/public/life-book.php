<?php
require_once __DIR__ . '/../src/bootstrap.php';

$user = require_role(array('admin', 'manager', 'viewer'));
$is_viewer = $user['role'] === 'viewer'; // руководитель: только просмотр
$id = isset($_GET['id']) ? (string) $_GET['id'] : (isset($_POST['id']) ? (string) $_POST['id'] : '');
$row = lb_get($id);
if (!$row) {
    http_response_code(404);
    flash('error', 'Заявка не найдена.');
    redirect('life-books.php');
}

if ($_SERVER['REQUEST_METHOD'] === 'POST') {
    if ($is_viewer) {
        http_response_code(403);
        exit('Недостаточно прав');
    }
    csrf_check();
    $name = trim($user['first_name'] . ' ' . $user['last_name']);
    if (lb_set_admin($id, isset($_POST['status']) ? (string) $_POST['status'] : '', trim((string) (isset($_POST['note']) ? $_POST['note'] : '')), $name)) {
        flash('success', 'Сохранено.');
    } else {
        flash('error', 'Не удалось сохранить.');
    }
    redirect('life-book.php?id=' . urlencode($id));
}

$answers_data = lb_read_json(lb_base_dir() . '/' . $id . '/answers.json');
$answers = $answers_data && isset($answers_data['answers']) ? $answers_data['answers'] : array();
$custom = $answers_data && isset($answers_data['custom']) ? $answers_data['custom'] : array();
$photos = lb_photos($id);
$data = lb_data();
$statuses = lb_statuses();

render_header('Книга: ' . $row['heroName'], $user, 'lifebooks');
flash_messages();
?>

<div class="toolbar">
    <a href="life-books.php" class="btn btn--secondary btn--sm">← Все заявки</a>
    <h1 class="h1" style="margin:0 0 0 12px; flex:1 1 auto;">Книга: <?php echo h($row['heroName']); ?></h1>
</div>

<?php if ($row['status'] === 'uploading'): ?>
<div class="flash flash--error">Заявка не дошла до конца: загружено фото <?php echo (int) $row['photos_received']; ?> из <?php echo (int) $row['photos_expected']; ?>. Клиент мог закрыть страницу; можно позвонить и уточнить.</div>
<?php endif; ?>

<div class="panel">
    <h2>Заказ</h2>
    <p><b>Заказчик:</b> <?php echo h($row['contacts']['name']); ?>, <?php echo h($row['contacts']['phone']); ?><?php echo $row['contacts']['email'] !== '' ? ', ' . h($row['contacts']['email']) : ''; ?></p>
    <p><b>Заполнял:</b> <?php echo $row['who'] === 'relative' ? 'родственник' : 'сам(а) герой книги'; ?></p>
    <p><b>Переплёт:</b> <?php echo h(lb_binding_label($row['design']['size'])); ?></p>
    <p><b>Шрифт:</b> <?php echo h(lb_font_label($row['design']['font'])); ?>. <b>Надпись на обложке:</b> <?php echo h($row['design']['coverText']); ?></p>
    <p><b>Получена:</b> <?php echo h(date('d.m.Y H:i', strtotime($row['created']))); ?></p>
</div>

<div class="panel">
    <h2>Работа с заявкой</h2>
    <form method="post" class="form-grid">
        <?php echo csrf_field(); ?>
        <input type="hidden" name="id" value="<?php echo h($id); ?>">
        <div class="field"><label for="lb-status">Статус</label>
            <select id="lb-status" name="status"<?php echo $is_viewer ? ' disabled' : ''; ?>>
                <?php foreach ($statuses as $k => $label): ?>
                <option value="<?php echo h($k); ?>"<?php echo $row['admin']['status'] === $k ? ' selected' : ''; ?>><?php echo h($label); ?></option>
                <?php endforeach; ?>
            </select></div>
        <div class="field"><label for="lb-note">Заметка</label>
            <textarea id="lb-note" name="note" rows="3"<?php echo $is_viewer ? ' disabled' : ''; ?>><?php echo h($row['admin']['note']); ?></textarea></div>
        <?php if (!$is_viewer): ?><div><button type="submit" class="btn btn--sm">Сохранить</button></div><?php endif; ?>
        <?php if ($row['admin']['updated'] !== ''): ?><div class="dim">Изменено: <?php echo h(date('d.m.Y H:i', strtotime($row['admin']['updated']))); ?>, <?php echo h($row['admin']['by']); ?></div><?php endif; ?>
    </form>
</div>

<div class="panel">
    <h2>Файлы</h2>
    <p>
        <a class="btn btn--sm" href="life-book-file.php?id=<?php echo h($id); ?>&amp;f=answers">Скачать ответы (Word)</a>
        <a class="btn btn--sm btn--secondary" href="life-book-file.php?id=<?php echo h($id); ?>&amp;f=zip">Скачать фото и ответы (ZIP)</a>
    </p>
</div>

<div class="panel">
    <h2>Фотографии (<?php echo count($photos); ?>)</h2>
    <?php if (!$photos): ?><p class="dim">Фото нет.</p><?php endif; ?>
    <div style="display:grid; grid-template-columns:repeat(auto-fill,minmax(180px,1fr)); gap:12px;">
        <?php foreach ($photos as $p): ?>
        <div>
            <a href="life-book-file.php?id=<?php echo h($id); ?>&amp;f=photo&amp;n=<?php echo h($p['file']); ?>" target="_blank" rel="noopener">
                <img src="life-book-file.php?id=<?php echo h($id); ?>&amp;f=photo&amp;n=<?php echo h($p['file']); ?>" alt="" loading="lazy" style="width:100%; height:150px; object-fit:cover; border-radius:8px;">
            </a>
            <div style="font-size:13px;"><?php echo !empty($p['cover']) ? '★ На обложку. ' : ''; ?><?php echo h($p['caption']); ?></div>
        </div>
        <?php endforeach; ?>
    </div>
</div>

<div class="panel">
    <h2>Ответы</h2>
    <?php $any = false; foreach ($data['chapters'] as $chapter):
        $block = array();
        foreach ($chapter['questions'] as $q) {
            if (isset($answers[$q['id']])) {
                $block[] = array($q['text'], $answers[$q['id']]);
            }
        }
        if (!$block) { continue; }
        $any = true;
    ?>
        <h3><?php echo h($chapter['title']); ?></h3>
        <?php foreach ($block as $qa): ?>
            <p style="margin-bottom:2px;"><i><?php echo h($qa[0]); ?></i></p>
            <p style="margin-top:0; white-space:pre-wrap;"><?php echo h($qa[1]); ?></p>
        <?php endforeach; ?>
    <?php endforeach; ?>
    <?php if ($custom): ?>
        <h3>Свои вопросы</h3>
        <?php foreach ($custom as $c): ?>
            <p style="margin-bottom:2px;"><i><?php echo h($c['text']); ?></i></p>
            <p style="margin-top:0; white-space:pre-wrap;"><?php echo h($c['answer']); ?></p>
        <?php $any = true; endforeach; ?>
    <?php endif; ?>
    <?php if (!$any): ?><p class="dim">Ответов нет.</p><?php endif; ?>
</div>

<?php render_footer(); ?>
