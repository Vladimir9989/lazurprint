<?php
require_once __DIR__ . '/../src/bootstrap.php';

$user = require_role(array('admin'));

$id = isset($_GET['id']) ? (int) $_GET['id'] : 0;
$lead = $id ? lead_get($id) : null;
if ($id && !$lead) {
    http_response_code(404);
    exit('Запись не найдена');
}

$error = null;
$dups = array();
$show_force = false;
$values = $lead ? $lead : array('channel' => 'email', 'segment' => '', 'status' => 'new');

if ($_SERVER['REQUEST_METHOD'] === 'POST') {
    csrf_check();
    $values = array_merge($values, $_POST);
    if ($lead) {
        $result = lead_update($id, $_POST, $user['id']);
        if ($result === true) {
            flash('success', 'Сохранено.');
            redirect('lead.php?id=' . $id);
        }
        $error = $result;
    } else {
        $manager_id = (int) $_POST['manager_id'];
        if ($manager_id) {
            $m = db()->prepare("SELECT * FROM users WHERE id = ? AND status = 'active'");
            $m->execute(array($manager_id));
            if ($mu = $m->fetch()) {
                $_POST['manager_name'] = user_full_name($mu);
            }
        }
        $result = lead_create($_POST, array('force' => !empty($_POST['force']), 'actor_id' => $user['id']));
        if (isset($result['id'])) {
            flash('success', 'Клиент добавлен.');
            redirect('lead.php?id=' . $result['id']);
        }
        $error = $result['error'];
        if (isset($result['dups'])) {
            $dups = $result['dups'];
            $show_force = true;
        }
    }
}

function val($values, $key) {
    return isset($values[$key]) ? (string) $values[$key] : '';
}

$segments = leads_segments();
$managers = managers_list();

render_header($lead ? 'Правка клиента' : 'Новый клиент', $user, 'leads');
flash_messages();
?>

<div class="toolbar">
    <a href="<?php echo $lead ? 'lead.php?id=' . (int) $id : 'leads.php'; ?>" class="btn btn--secondary btn--sm">← Назад</a>
    <h1 class="h1" style="margin:0;"><?php echo $lead ? 'Правка: ' . h($lead['company']) : 'Новый клиент'; ?></h1>
</div>

<?php if ($error): ?>
<div class="flash flash--error">
    <?php echo h($error); ?>
    <?php foreach ($dups as $d): ?><div><a href="lead.php?id=<?php echo (int) $d['id']; ?>">Открыть: <?php echo h($d['company']); ?></a></div><?php endforeach; ?>
</div>
<?php endif; ?>

<form method="post" class="panel" style="max-width:860px;">
    <?php echo csrf_field(); ?>
    <div class="form-grid">
        <div class="field"><label for="company">Компания *</label>
            <input type="text" id="company" name="company" required value="<?php echo h(val($values, 'company')); ?>"></div>
        <div class="field"><label for="site">Сайт</label>
            <input type="text" id="site" name="site" placeholder="stolnick.ru" value="<?php echo h(val($values, 'site')); ?>"></div>
        <div class="field"><label for="segment">Сегмент</label>
            <input type="text" id="segment" name="segment" list="segment-list" placeholder="издательство, агентство, производитель…" value="<?php echo h(val($values, 'segment')); ?>">
            <datalist id="segment-list"><?php foreach ($segments as $s): ?><option value="<?php echo h($s); ?>"><?php endforeach; ?></datalist></div>
        <div class="field"><label for="channel">Канал</label>
            <select id="channel" name="channel">
                <option value="email" <?php echo val($values, 'channel') !== 'form' ? 'selected' : ''; ?>>E-mail</option>
                <option value="form" <?php echo val($values, 'channel') === 'form' ? 'selected' : ''; ?>>Форма на сайте / звонок</option>
            </select></div>
        <div class="field"><label for="email_to">E-mail «Кому» (несколько — через запятую)</label>
            <input type="text" id="email_to" name="email_to" value="<?php echo h(val($values, 'email_to')); ?>"></div>
        <div class="field"><label for="email_cc">E-mail «Копия»</label>
            <input type="text" id="email_cc" name="email_cc" value="<?php echo h(val($values, 'email_cc')); ?>"></div>
        <div class="field"><label for="greeting">Обращение</label>
            <input type="text" id="greeting" name="greeting" placeholder="Здравствуйте, Сергей!" value="<?php echo h(val($values, 'greeting')); ?>"></div>
        <div class="field"><label for="subject">Тема письма</label>
            <input type="text" id="subject" name="subject" value="<?php echo h(val($values, 'subject')); ?>"></div>
    </div>

    <div class="field"><label for="body">Текст письма (метки: {имя} {фамилия} {фио} {должность} {телефон})</label>
        <textarea id="body" name="body" rows="14"><?php echo h(val($values, 'body')); ?></textarea></div>
    <div class="field"><label for="instructions">Инструкция для менеджера (только для канала «форма / звонок»: что открыть и куда вставить текст)</label>
        <textarea id="instructions" name="instructions" rows="5"><?php echo h(val($values, 'instructions')); ?></textarea></div>

    <div class="form-grid">
        <div class="field"><label for="hook">Повод для письма («крючок»)</label>
            <textarea id="hook" name="hook" rows="3"><?php echo h(val($values, 'hook')); ?></textarea></div>
        <div class="field"><label for="samples_hint">Какие образцы приложить</label>
            <textarea id="samples_hint" name="samples_hint" rows="3"><?php echo h(val($values, 'samples_hint')); ?></textarea></div>
        <div class="field"><label for="source">Источник</label>
            <input type="text" id="source" name="source" value="<?php echo h(val($values, 'source')); ?>"></div>
        <div class="field"><label for="batch">Партия</label>
            <input type="text" id="batch" name="batch" placeholder="неделя 2" value="<?php echo h(val($values, 'batch')); ?>"></div>
        <div class="field"><label for="note">Заметка</label>
            <textarea id="note" name="note" rows="3"><?php echo h(val($values, 'note')); ?></textarea></div>
        <?php if (!$lead): ?>
        <div class="field"><label for="manager_id">Закрепить за менеджером (необязательно)</label>
            <select id="manager_id" name="manager_id">
                <option value="0">— общий список —</option>
                <?php foreach ($managers as $m): ?>
                <option value="<?php echo (int) $m['id']; ?>"><?php echo h(user_full_name($m)); ?></option>
                <?php endforeach; ?>
            </select></div>
        <?php endif; ?>
    </div>

    <?php if ($lead && $lead['status'] !== 'new'): ?>
    <div class="flash flash--info">Клиента уже взяли: менеджер видит и копирует «живую» версию письма (с его подписью). Исправить её можно здесь.</div>
    <div class="field"><label for="subject_final">Тема, как у менеджера</label>
        <input type="text" id="subject_final" name="subject_final" value="<?php echo h((string) $lead['subject_final']); ?>"></div>
    <div class="field"><label for="body_final">Текст, как у менеджера</label>
        <textarea id="body_final" name="body_final" rows="12"><?php echo h((string) $lead['body_final']); ?></textarea></div>
    <?php endif; ?>

    <?php if ($show_force): ?>
    <label class="field--checkbox field"><input type="checkbox" name="force" value="1"> Всё равно добавить (это другой контакт той же компании)</label>
    <?php endif; ?>

    <button type="submit" class="btn"><?php echo $lead ? 'Сохранить' : 'Добавить'; ?></button>
</form>

<?php
render_footer();
