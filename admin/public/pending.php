<?php
require_once __DIR__ . '/../src/bootstrap.php';

$user = current_user();
if (!$user) {
    redirect('login.php');
}
if ($user['status'] === 'active') {
    redirect('index.php');
}
?>
<!doctype html>
<html lang="ru">
<head>
<meta charset="utf-8">
<meta name="viewport" content="width=device-width, initial-scale=1">
<meta name="robots" content="noindex, nofollow">
<title>Заявка отправлена — Учёт продукции «Лазурь»</title>
<link rel="stylesheet" href="assets/style.css">
</head>
<body>
<div class="auth-page">
<div class="auth-box" style="text-align:center;">
    <h1>Ваша заявка отправлена</h1>
    <p style="color:#6b7280;">Администратор ещё не подтвердил доступ. Загляните позже.</p>
    <p><a href="logout.php">Выйти</a></p>
</div>
</div>
</body>
</html>
