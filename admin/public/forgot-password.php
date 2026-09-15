<?php
require_once __DIR__ . '/../src/bootstrap.php';

if (current_user()) {
    redirect('index.php');
}

$sent = false;

if ($_SERVER['REQUEST_METHOD'] === 'POST') {
    csrf_check();
    request_password_reset((string) $_POST['email']);
    $sent = true;
}
?>
<!doctype html>
<html lang="ru">
<head>
<meta charset="utf-8">
<meta name="viewport" content="width=device-width, initial-scale=1">
<meta name="robots" content="noindex, nofollow">
<title>Восстановление пароля — Учёт продукции «Лазурь»</title>
<link rel="stylesheet" href="assets/style.css">
</head>
<body>
<div class="auth-page">
<div class="auth-box">
    <h1>Восстановление пароля</h1>

    <?php if ($sent): ?>
        <div class="flash flash--success">
            Если такая почта зарегистрирована, на неё отправлена ссылка для сброса пароля.
            Ссылка действует <?php echo (int) PASSWORD_RESET_TTL_MINUTES; ?> минут.
        </div>
        <p><a href="login.php">Вернуться ко входу</a></p>
    <?php else: ?>
        <p style="font-size:13px; color:#6b7280; margin-top:0;">
            Укажите почту, с которой регистрировались — пришлём ссылку для сброса пароля.
        </p>
        <form method="post" autocomplete="on">
            <?php echo csrf_field(); ?>
            <div class="field">
                <label for="email">Почта</label>
                <input type="email" id="email" name="email" autocomplete="username" required autofocus>
            </div>
            <button type="submit" class="btn btn--block">Отправить ссылку</button>
        </form>
        <p style="margin-top:18px; font-size:13px; color:#6b7280;">
            <a href="login.php">Вернуться ко входу</a>
        </p>
    <?php endif; ?>
</div>
</div>
</body>
</html>
