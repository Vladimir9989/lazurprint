<?php
require_once __DIR__ . '/../src/bootstrap.php';

// Работает только пока в базе нет ни одного пользователя — создаёт первого админа,
// дальше все остальные регистрируются через register.php и подтверждаются им.
$users_count = (int) db()->query('SELECT COUNT(*) c FROM users')->fetch()['c'];
if ($users_count > 0) {
    redirect('login.php');
}

$error = null;

if ($_SERVER['REQUEST_METHOD'] === 'POST') {
    csrf_check();
    $first_name = trim((string) $_POST['first_name']);
    $last_name = trim((string) $_POST['last_name']);
    $email = trim(mb_strtolower((string) $_POST['email']));
    $password = (string) $_POST['password'];

    if ($first_name === '' || $last_name === '' || $email === '' || $password === '') {
        $error = 'Заполните все поля.';
    } elseif (!filter_var($email, FILTER_VALIDATE_EMAIL)) {
        $error = 'Некорректная почта.';
    } elseif (mb_strlen($password) < 6) {
        $error = 'Пароль должен быть не короче 6 символов.';
    } else {
        db()->prepare("INSERT INTO users (first_name, last_name, email, password_hash, role, status, confirmed_at)
            VALUES (?, ?, ?, ?, 'admin', 'active', NOW())")
            ->execute(array($first_name, $last_name, $email, password_hash($password, PASSWORD_DEFAULT)));
        redirect('login.php');
    }
}
?>
<!doctype html>
<html lang="ru">
<head>
<meta charset="utf-8">
<meta name="viewport" content="width=device-width, initial-scale=1">
<meta name="robots" content="noindex, nofollow">
<title>Первичная настройка — Учёт продукции «Лазурь»</title>
<link rel="stylesheet" href="assets/style.css">
</head>
<body>
<div class="auth-page">
<div class="auth-box">
    <h1>Первый запуск</h1>
    <p style="font-size:13px; color:#6b7280; margin-top:-12px;">
        Пользователей в базе ещё нет. Заведите свою учётку — она сразу станет
        администратором, дальше все остальные регистрируются сами и подтверждаются вами.
    </p>
    <?php if ($error): ?><div class="flash flash--error"><?php echo h($error); ?></div><?php endif; ?>
    <form method="post" autocomplete="on">
        <?php echo csrf_field(); ?>
        <div class="field">
            <label for="first_name">Имя</label>
            <input type="text" id="first_name" name="first_name" required>
        </div>
        <div class="field">
            <label for="last_name">Фамилия</label>
            <input type="text" id="last_name" name="last_name" required>
        </div>
        <div class="field">
            <label for="email">Почта</label>
            <input type="email" id="email" name="email" autocomplete="username" required>
        </div>
        <div class="field">
            <label for="password">Пароль</label>
            <input type="password" id="password" name="password" autocomplete="new-password" minlength="6" required>
        </div>
        <button type="submit" class="btn btn--block">Создать администратора</button>
    </form>
</div>
</div>
</body>
</html>
