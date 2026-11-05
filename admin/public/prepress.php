<?php
require_once __DIR__ . '/../src/bootstrap.php';

$user = require_role(array('admin', 'viewer', 'prepress'));
$can_edit = $user['role'] !== 'viewer';

render_header('Допечатка', $user, 'prepress');
flash_messages();
?>
<div id="pp" data-me="<?php echo (int) $user['id']; ?>" data-edit="<?php echo $can_edit ? '1' : '0'; ?>" data-role="<?php echo h($user['role']); ?>">
<div class="pp-head noprint">
    <h1 class="h1" style="margin:0">Допечатная подготовка</h1>
    <div class="pp-date">
        <button class="btn btn--secondary btn--sm" id="pp-prev" aria-label="Предыдущий день">‹</button>
        <div class="pp-dlabel" id="pp-dlabel"></div>
        <button class="btn btn--secondary btn--sm" id="pp-next" aria-label="Следующий день">›</button>
        <button class="btn btn--secondary btn--sm" id="pp-today">Сегодня</button>
        <button class="btn btn--sm" id="pp-print">Печать</button>
    </div>
</div>
<div class="pp-title" id="pp-title"></div>
<?php if ($can_edit): ?>
<div class="pp-add noprint" id="pp-add">
    <select id="pp-who" aria-label="Кому"></select>
    <input id="pp-no" placeholder="Номер заказа" aria-label="Номер заказа" maxlength="100">
    <input id="pp-cm" class="pp-wide" placeholder="Комментарий" aria-label="Комментарий" maxlength="500">
    <select id="pp-st" aria-label="Статус"></select>
    <button class="btn" id="pp-addbtn">Добавить</button>
</div>
<?php endif; ?>
<div class="pp-err noprint" id="pp-err"></div>
<div class="pp-bar noprint" id="pp-bar"></div>
<div class="pp-ops noprint" id="pp-ops"></div>
<div class="pp-mode noprint" id="pp-mode"></div>
<div class="pp-grid" id="pp-grid"></div>
</div>
<link rel="stylesheet" href="assets/prepress.css?v=<?php echo (int) @filemtime(__DIR__ . '/assets/prepress.css'); ?>">
<script src="assets/prepress.js?v=<?php echo (int) @filemtime(__DIR__ . '/assets/prepress.js'); ?>"></script>
<?php render_footer(); ?>
