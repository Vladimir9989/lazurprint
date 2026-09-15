<?php
require_once __DIR__ . '/../src/bootstrap.php';

if (current_user()) {
    redirect('index.php');
}

if ((int) db()->query('SELECT COUNT(*) c FROM users')->fetch()['c'] === 0) {
    redirect('setup.php');
}

$error = isset($_GET['blocked']) ? 'Доступ заблокирован. Обратитесь к администратору.' : null;
$switch_user = isset($_GET['switch']);
if ($switch_user) {
    clear_device_cookie();
}
$hint = $switch_user ? null : get_device_hint();

if ($_SERVER['REQUEST_METHOD'] === 'POST') {
    csrf_check();
    $email = trim((string) $_POST['email']);
    $password = (string) $_POST['password'];
    $remember = !empty($_POST['remember']);

    $result = attempt_login($email, $password, $remember, $is_https);
    if (is_array($result)) {
        redirect('index.php');
    }
    $error = $result;
}
?>
<!doctype html>
<html lang="ru">
<head>
<meta charset="utf-8">
<meta name="viewport" content="width=device-width, initial-scale=1">
<meta name="robots" content="noindex, nofollow">
<title>Вход — Учёт продукции «Лазурь»</title>
<link rel="stylesheet" href="assets/style.css">
</head>
<body>
<div class="auth-page">
<div class="auth-box">
    <h1>Учёт продукции «Лазурь»</h1>
    <?php if ($error): ?><div class="flash flash--error"><?php echo h($error); ?></div><?php endif; ?>

    <?php if ($hint): ?>
    <div class="device-tile">
        <div>
            <div class="device-tile__name"><?php echo h($hint['name']); ?></div>
            <div class="device-tile__switch"><a href="login.php?switch=1">это не я</a></div>
        </div>
    </div>
    <?php endif; ?>

    <form method="post" autocomplete="on">
        <?php echo csrf_field(); ?>
        <div class="field">
            <label for="email">Почта</label>
            <input type="email" id="email" name="email" autocomplete="username" required
                value="<?php echo h($hint ? $hint['email'] : ''); ?>">
        </div>
        <div class="field">
            <label for="password">Пароль</label>
            <input type="password" id="password" name="password" autocomplete="current-password" required autofocus>
        </div>
        <div class="field field--checkbox">
            <input type="checkbox" id="remember" name="remember" value="1" checked>
            <label for="remember" style="margin:0;">Запомнить меня на этом устройстве</label>
        </div>
        <button type="submit" class="btn btn--block">Войти</button>
    </form>
    <p style="margin-top:18px; font-size:13px; color:#6b7280;">
        Нет доступа? <a href="register.php">Подать заявку на регистрацию</a><br>
        Забыли пароль? <a href="forgot-password.php">Восстановить</a>
    </p>
</div>
</div>
</body>
</html>
