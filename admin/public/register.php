<?php
require_once __DIR__ . '/../src/bootstrap.php';

if (current_user()) {
    redirect('index.php');
}

$error = null;
$success = false;

if ($_SERVER['REQUEST_METHOD'] === 'POST') {
    csrf_check();
    $result = register_user(
        (string) $_POST['first_name'],
        (string) $_POST['last_name'],
        (string) $_POST['email'],
        (string) $_POST['password'],
        (string) $_POST['role'],
        (string) $_POST['access_code']
    );
    if ($result === true) {
        $success = true;
    } else {
        $error = $result;
    }
}
?>
<!doctype html>
<html lang="ru">
<head>
<meta charset="utf-8">
<meta name="viewport" content="width=device-width, initial-scale=1">
<meta name="robots" content="noindex, nofollow">
<title>Регистрация — Учёт продукции «Лазурь»</title>
<link rel="stylesheet" href="assets/style.css">
</head>
<body>
<div class="auth-page">
<div class="auth-box" style="max-width:440px;">
    <h1>Заявка на регистрацию</h1>

    <?php if ($success): ?>
        <div class="flash flash--success">
            Ваша заявка отправлена. Администратор подтвердит доступ, после этого можно будет войти.
        </div>
        <p><a href="login.php">Вернуться ко входу</a></p>
    <?php else: ?>
        <?php if ($error): ?><div class="flash flash--error"><?php echo h($error); ?></div><?php endif; ?>
        <form method="post" autocomplete="on">
            <?php echo csrf_field(); ?>
            <div class="field">
                <label for="first_name">Имя</label>
                <input type="text" id="first_name" name="first_name" required
                    value="<?php echo h(isset($_POST['first_name']) ? $_POST['first_name'] : ''); ?>">
            </div>
            <div class="field">
                <label for="last_name">Фамилия</label>
                <input type="text" id="last_name" name="last_name" required
                    value="<?php echo h(isset($_POST['last_name']) ? $_POST['last_name'] : ''); ?>">
            </div>
            <div class="field">
                <label for="email">Рабочая почта</label>
                <input type="email" id="email" name="email" autocomplete="username" required
                    value="<?php echo h(isset($_POST['email']) ? $_POST['email'] : ''); ?>">
            </div>
            <div class="field">
                <label for="password">Пароль</label>
                <input type="password" id="password" name="password" autocomplete="new-password" minlength="6" required>
            </div>
            <div class="field">
                <label for="role">Роль</label>
                <select id="role" name="role" required>
                    <option value="">Выберите роль…</option>
                    <?php foreach (ROLE_LABELS as $code => $label): if ($code === 'admin') continue; ?>
                    <option value="<?php echo h($code); ?>"><?php echo h($label); ?></option>
                    <?php endforeach; ?>
                </select>
            </div>
            <div class="field">
                <label for="access_code">Код доступа</label>
                <input type="text" id="access_code" name="access_code" required>
            </div>
            <button type="submit" class="btn btn--block">Отправить заявку</button>
        </form>
        <p style="margin-top:18px; font-size:13px; color:#6b7280;">
            Уже есть доступ? <a href="login.php">Войти</a>
        </p>
    <?php endif; ?>
</div>
</div>
</body>
</html>
