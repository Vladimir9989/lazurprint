<?php
require_once __DIR__ . '/../src/bootstrap.php';

$user = require_role(array('admin', 'manager'));

$stmt = db()->prepare('SELECT * FROM users WHERE id = ? LIMIT 1');
$stmt->execute(array($user['id']));
$row = $stmt->fetch();

if ($_SERVER['REQUEST_METHOD'] === 'POST') {
    csrf_check();
    $position = trim((string) $_POST['position']);
    $phone = trim((string) $_POST['phone']);
    $client = isset(MAIL_CLIENTS[$_POST['mail_client']]) ? $_POST['mail_client'] : 'mailto';
    db()->prepare('UPDATE users SET position = ?, phone = ?, mail_client = ? WHERE id = ?')
        ->execute(array($position, $phone, $client, $user['id']));
    flash('success', 'Профиль сохранён. Новые данные подставятся в письма, которые вы возьмёте дальше.');
    redirect('profile.php');
}

render_header('Профиль', $user, null);
flash_messages();
?>

<h1 class="h1">Профиль</h1>

<div class="panel" style="max-width:560px;">
    <p class="dim" style="margin-top:0;">
        <strong><?php echo h(user_full_name($row)); ?></strong> · <?php echo h($row['email']); ?><br>
        Должность и телефон подставляются в подпись письма вместо меток <code>{должность}</code> и <code>{телефон}</code>
        в момент, когда вы берёте клиента в работу. Уже взятые письма не меняются.
    </p>
    <form method="post">
        <?php echo csrf_field(); ?>
        <div class="field">
            <label for="position">Должность</label>
            <input type="text" id="position" name="position" value="<?php echo h($row['position']); ?>"
                placeholder="менеджер по продажам, типография «Лазурь»">
        </div>
        <div class="field">
            <label for="phone">Телефон</label>
            <input type="text" id="phone" name="phone" value="<?php echo h($row['phone']); ?>" placeholder="+7 (343) 227-23-23">
        </div>
        <div class="field">
            <label for="mail_client">Как открывать письмо кнопкой «Открыть письмо»</label>
            <select id="mail_client" name="mail_client">
                <?php foreach (MAIL_CLIENTS as $code => $label): ?>
                <option value="<?php echo h($code); ?>" <?php echo $row['mail_client'] === $code ? 'selected' : ''; ?>><?php echo h($label); ?></option>
                <?php endforeach; ?>
            </select>
        </div>
        <button type="submit" class="btn">Сохранить</button>
    </form>
</div>

<?php
render_footer();
