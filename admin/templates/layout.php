<?php

function render_header($title, $user = null, $active_tab = null) {
    ?>
<!doctype html>
<html lang="ru">
<head>
<meta charset="utf-8">
<meta name="viewport" content="width=device-width, initial-scale=1">
<meta name="robots" content="noindex, nofollow">
<title><?php echo h($title); ?> — Учёт продукции «Лазурь»</title>
<link rel="stylesheet" href="assets/style.css">
<link rel="stylesheet" href="assets/leads.css">
</head>
<body>
<?php if ($user): ?><input type="hidden" name="csrf_token" id="global-csrf-token" value="<?php echo h(csrf_token()); ?>"><?php endif; ?>
<header class="topbar">
    <div class="topbar__inner">
        <a href="index.php" class="topbar__logo">Лазурь — учёт продукции</a>
        <?php if ($user): ?>
        <nav class="topbar__nav">
            <?php if ($user['role'] !== 'manager'): ?>
            <a href="index.php" class="<?php echo $active_tab === 'work' ? 'is-active' : ''; ?>">В работе</a>
            <a href="site-catalog.php" class="<?php echo $active_tab === 'site' ? 'is-active' : ''; ?>">Что на сайте</a>
            <?php endif; ?>
            <?php if ($user['role'] === 'admin' || $user['role'] === 'manager'): ?>
            <a href="leads.php" class="<?php echo $active_tab === 'leads' ? 'is-active' : ''; ?>">Клиенты для писем</a>
            <a href="samples.php" class="<?php echo $active_tab === 'samples' ? 'is-active' : ''; ?>">Образцы</a>
            <?php endif; ?>
            <?php if (is_admin_user($user)): ?>
            <a href="users.php" class="<?php echo $active_tab === 'users' ? 'is-active' : ''; ?>">Пользователи</a>
            <?php endif; ?>
        </nav>
        <div class="topbar__user">
            <?php if ($user['role'] === 'admin' || $user['role'] === 'manager'): ?>
            <a href="profile.php" title="Профиль: должность, телефон, почта"><?php echo h($user['first_name']); ?> · <?php echo h(role_label($user['role'])); ?></a>
            <?php else: ?>
            <span><?php echo h($user['first_name']); ?> · <?php echo h(role_label($user['role'])); ?></span>
            <?php endif; ?>
            <a href="logout.php">Выйти</a>
        </div>
        <?php endif; ?>
    </div>
</header>
<main class="page">
<?php
}

function render_footer() {
    ?>
</main>
<script src="assets/app.js"></script>
<script src="assets/leads.js"></script>
</body>
</html>
<?php
}

function flash_messages() {
    if (empty($_SESSION['flash'])) {
        return;
    }
    foreach ($_SESSION['flash'] as $item) {
        echo '<div class="flash flash--' . h($item['type']) . '">' . h($item['text']) . '</div>';
    }
    unset($_SESSION['flash']);
}

function flash($type, $text) {
    $_SESSION['flash'][] = array('type' => $type, 'text' => $text);
}
