<?php
require_once __DIR__ . '/../src/bootstrap.php';

$user = require_role(array('admin'));

$result = null;
$error = null;

if ($_SERVER['REQUEST_METHOD'] === 'POST') {
    csrf_check();
    $content = '';
    $filename = '';
    if (!empty($_FILES['file']['tmp_name']) && is_uploaded_file($_FILES['file']['tmp_name'])) {
        $content = file_get_contents($_FILES['file']['tmp_name']);
        $filename = $_FILES['file']['name'];
    } elseif (trim((string) $_POST['pasted']) !== '') {
        $content = (string) $_POST['pasted'];
    }
    if ($content === '') {
        $error = 'Выберите файл или вставьте текст.';
    } else {
        $parsed = lead_parse_import($content, $filename);
        if (isset($parsed['error'])) {
            $error = $parsed['error'];
        } elseif (!$parsed['rows']) {
            $error = 'В файле не нашлось строк. Проверьте, что в первой строке названия колонок (company, email_to, subject, body…).';
        } else {
            $dry = !empty($_POST['dry']);
            $result = lead_import_rows($parsed['rows'], $user['id'], $dry, trim((string) $_POST['batch']));
            $result['dry'] = $dry;
            $result['total'] = count($parsed['rows']);
        }
    }
}

render_header('Загрузка клиентов', $user, 'leads');
flash_messages();
?>

<div class="toolbar">
    <a href="leads.php" class="btn btn--secondary btn--sm">← К списку</a>
    <h1 class="h1" style="margin:0;">Загрузить клиентов пачкой</h1>
</div>

<?php if ($error): ?><div class="flash flash--error"><?php echo h($error); ?></div><?php endif; ?>

<?php if ($result): ?>
<div class="flash flash--<?php echo $result['errors'] ? 'error' : 'success'; ?>">
    <?php if ($result['dry']): ?>
    Проверка (в базу ничего не записано): строк в файле — <?php echo (int) $result['total']; ?>, добавилось бы — <?php echo (int) $result['created']; ?>,
    пропущено как дубли — <?php echo count($result['skipped']); ?>, с ошибками — <?php echo count($result['errors']); ?>.
    <?php else: ?>
    Добавлено клиентов: <?php echo (int) $result['created']; ?> из <?php echo (int) $result['total']; ?>.
    Пропущено как дубли: <?php echo count($result['skipped']); ?>, с ошибками: <?php echo count($result['errors']); ?>.
    <?php endif; ?>
</div>
    <?php if ($result['skipped']): ?>
<div class="panel"><h2>Пропущены (уже есть в базе)</h2><ul><?php foreach ($result['skipped'] as $s): ?><li><?php echo h($s); ?></li><?php endforeach; ?></ul></div>
    <?php endif; ?>
    <?php if ($result['errors']): ?>
<div class="panel"><h2>Ошибки</h2><ul><?php foreach ($result['errors'] as $s): ?><li><?php echo h($s); ?></li><?php endforeach; ?></ul></div>
    <?php endif; ?>
<?php endif; ?>

<div class="panel" style="max-width:820px;">
    <p class="dim" style="margin-top:0;">
        Файл <strong>CSV</strong> (разделитель «;» или «,», кодировка UTF-8 или Windows-1251, Excel подходит) либо <strong>JSON</strong> (список объектов).
        В первой строке CSV — названия колонок. Понимаются русские и английские названия:
    </p>
    <p style="font-size:13px; line-height:1.7;">
        <code>company</code>/компания, <code>site</code>/сайт, <code>segment</code>/сегмент, <code>channel</code>/канал (<code>email</code> или <code>form</code>),
        <code>email_to</code>/кому, <code>email_cc</code>/копия, <code>greeting</code>/обращение, <code>subject</code>/тема, <code>body</code>/текст,
        <code>instructions</code>/инструкция, <code>samples_hint</code>/образцы, <code>hook</code>/крючок, <code>source</code>/источник, <code>note</code>/заметка,
        <code>batch</code>/партия, <code>manager_name</code>/ведёт, <code>status</code>/статус, <code>sent_at</code>/дата отправки.
    </p>
    <p class="dim" style="font-size:13px;">
        «Ведёт» — ФИО менеджера. Если статус «новый», запись закрепляется за ним, если «отправлено» и дальше — становится его записью.
        Когда менеджер зарегистрируется и вы его подтвердите, записи привяжутся сами. Дубли (по сайту и e-mail) и стоп-лист пропускаются.
    </p>
    <form method="post" enctype="multipart/form-data">
        <?php echo csrf_field(); ?>
        <div class="field"><label for="file">Файл</label><input type="file" id="file" name="file" accept=".csv,.json,.txt"></div>
        <div class="field"><label for="pasted">…или вставьте текст файла сюда</label><textarea id="pasted" name="pasted" rows="6"></textarea></div>
        <div class="field"><label for="batch">Партия (метка, необязательно)</label><input type="text" id="batch" name="batch" placeholder="неделя 2"></div>
        <label class="field--checkbox field"><input type="checkbox" name="dry" value="1" checked> Сначала только проверить (ничего не записывать)</label>
        <button type="submit" class="btn">Загрузить</button>
    </form>
</div>

<?php
render_footer();
