<?php
require_once __DIR__ . '/../src/bootstrap.php';

$user = require_role(array('admin', 'manager'));

$stmt = db()->prepare('SELECT * FROM users WHERE id = ? LIMIT 1');
$stmt->execute(array($user['id']));
$row = $stmt->fetch();

if ($_SERVER['REQUEST_METHOD'] === 'POST') {
    csrf_check();
    if (isset($_POST['action']) && $_POST['action'] === 'password') {
        $cur = (string) $_POST['current_password'];
        $new = (string) $_POST['new_password'];
        if (!password_verify($cur, $row['password_hash'])) {
            flash('error', 'Текущий пароль указан неверно.');
        } elseif (mb_strlen($new) < 8) {
            flash('error', 'Новый пароль должен быть не короче 8 символов.');
        } elseif ($new !== (string) $_POST['new_password2']) {
            flash('error', 'Новые пароли не совпадают.');
        } else {
            db()->prepare('UPDATE users SET password_hash = ? WHERE id = ?')
                ->execute(array(password_hash($new, PASSWORD_DEFAULT), $user['id']));
            // Запомненные устройства сбрасываем: на других компьютерах придётся войти заново.
            db()->prepare('DELETE FROM remember_tokens WHERE user_id = ?')->execute(array($user['id']));
            flash('success', 'Пароль изменён.');
        }
        redirect('profile.php');
    }
    $client = isset(MAIL_CLIENTS[$_POST['mail_client']]) ? $_POST['mail_client'] : 'mailru';
    db()->prepare('UPDATE users SET mail_client = ? WHERE id = ?')
        ->execute(array($client, $user['id']));
    flash('success', 'Профиль сохранён.');
    redirect('profile.php');
}

render_header('Профиль', $user, null);
flash_messages();
?>

<h1 class="h1">Профиль</h1>

<div class="panel" style="max-width:560px;">
    <p class="dim" style="margin-top:0;">
        <strong><?php echo h(user_full_name($row)); ?></strong> · <?php echo h($row['email']); ?><br>
        Подпись в письме не нужна: она уже настроена в вашей почте.
    </p>
    <form method="post">
        <?php echo csrf_field(); ?>
        <div class="field">
            <label for="mail_client">Как открывать письмо кнопкой «Открыть письмо»</label>
            <select id="mail_client" name="mail_client">
                <?php foreach (MAIL_CLIENTS as $code => $label): ?>
                <option value="<?php echo h($code); ?>" <?php echo lead_mail_client($row) === $code ? 'selected' : ''; ?>><?php echo h($label); ?></option>
                <?php endforeach; ?>
            </select>
        </div>
        <button type="submit" class="btn">Сохранить</button>
    </form>
</div>

<div class="panel" style="max-width:560px;">
    <h2 style="margin-top:0;">Сменить пароль</h2>
    <form method="post" autocomplete="off">
        <?php echo csrf_field(); ?>
        <input type="hidden" name="action" value="password">
        <div class="field"><label for="cur-pass">Текущий пароль</label>
            <input type="password" id="cur-pass" name="current_password" autocomplete="current-password" required></div>
        <div class="field"><label for="new-pass">Новый пароль (не короче 8 символов)</label>
            <input type="password" id="new-pass" name="new_password" minlength="8" autocomplete="new-password" required></div>
        <div class="field"><label for="new-pass2">Повторите новый пароль</label>
            <input type="password" id="new-pass2" name="new_password2" minlength="8" autocomplete="new-password" required></div>
        <button type="submit" class="btn">Сменить пароль</button>
    </form>
</div>

<?php
render_footer();
