<?php
require_once __DIR__ . '/../src/bootstrap.php';

if (current_user()) {
    redirect('index.php');
}

$selector = isset($_GET['selector']) ? (string) $_GET['selector'] : (isset($_POST['selector']) ? (string) $_POST['selector'] : '');
$validator = isset($_GET['validator']) ? (string) $_GET['validator'] : (isset($_POST['validator']) ? (string) $_POST['validator'] : '');

$reset_row = ($selector !== '' && $validator !== '') ? find_password_reset($selector, $validator) : null;

$error = null;
$success = false;

if ($reset_row && $_SERVER['REQUEST_METHOD'] === 'POST') {
    csrf_check();
    $password = (string) $_POST['password'];
    $password2 = (string) $_POST['password2'];
    if (mb_strlen($password) < 6) {
        $error = 'Пароль должен быть не короче 6 символов.';
    } elseif ($password !== $password2) {
        $error = 'Пароли не совпадают.';
    } else {
        reset_password($reset_row, $password);
        $success = true;
    }
}
?>
<!doctype html>
<html lang="ru">
<head>
<meta charset="utf-8">
<meta name="viewport" content="width=device-width, initial-scale=1">
<meta name="robots" content="noindex, nofollow">
<title>Новый пароль — Учёт продукции «Лазурь»</title>
<link rel="stylesheet" href="assets/style.css">
</head>
<body>
<div class="auth-page">
<div class="auth-box">
    <h1>Новый пароль</h1>

    <?php if ($success): ?>
        <div class="flash flash--success">Пароль обновлён, можно входить.</div>
        <p><a href="login.php">Войти</a></p>
    <?php elseif (!$reset_row): ?>
        <div class="flash flash--error">Ссылка недействительна или устарела.</div>
        <p><a href="forgot-password.php">Запросить новую ссылку</a></p>
    <?php else: ?>
        <?php if ($error): ?><div class="flash flash--error"><?php echo h($error); ?></div><?php endif; ?>
        <form method="post" autocomplete="on">
            <?php echo csrf_field(); ?>
            <input type="hidden" name="selector" value="<?php echo h($selector); ?>">
            <input type="hidden" name="validator" value="<?php echo h($validator); ?>">
            <div class="field">
                <label for="password">Новый пароль</label>
                <input type="password" id="password" name="password" autocomplete="new-password" minlength="6" required autofocus>
            </div>
            <div class="field">
                <label for="password2">Повторите пароль</label>
                <input type="password" id="password2" name="password2" autocomplete="new-password" minlength="6" required>
            </div>
            <button type="submit" class="btn btn--block">Сохранить пароль</button>
        </form>
    <?php endif; ?>
</div>
</div>
</body>
</html>
