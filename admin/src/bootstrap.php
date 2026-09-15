<?php

error_reporting(E_ALL);
ini_set('display_errors', '0');
ini_set('log_errors', '1');

require_once __DIR__ . '/db.php';
require_once __DIR__ . '/csrf.php';
require_once __DIR__ . '/mail.php';
require_once __DIR__ . '/auth.php';
require_once __DIR__ . '/products.php';
require_once __DIR__ . '/photos.php';
require_once __DIR__ . '/site_catalog.php';
require_once __DIR__ . '/../templates/layout.php';

$is_https = (!empty($_SERVER['HTTPS']) && $_SERVER['HTTPS'] !== 'off')
    || (isset($_SERVER['HTTP_X_FORWARDED_PROTO']) && $_SERVER['HTTP_X_FORWARDED_PROTO'] === 'https');

session_set_cookie_params(array(
    'lifetime' => 0,
    'path' => '/',
    'domain' => '',
    'secure' => $is_https,
    'httponly' => true,
    'samesite' => 'Lax',
));
session_name('lazur_admin_sid');
session_start();

auth_bootstrap($is_https);

function h($value) {
    return htmlspecialchars((string) $value, ENT_QUOTES, 'UTF-8');
}

function redirect($path) {
    header('Location: ' . $path);
    exit;
}

function current_user() {
    return isset($_SESSION['user']) ? $_SESSION['user'] : null;
}

// Каждый запрос сверяет статус/роль со свежими данными из БД, а не с тем, что было
// закэшировано в сессии при входе — иначе блокировка или смена роли на экране
// "Пользователи" подействовала бы только после того, как сотрудник сам перелогинится.
function require_login() {
    $user = current_user();
    if (!$user) {
        redirect('login.php');
    }
    $stmt = db()->prepare('SELECT status, role FROM users WHERE id = ? LIMIT 1');
    $stmt->execute(array($user['id']));
    $fresh = $stmt->fetch();
    if (!$fresh) {
        logout_user();
        redirect('login.php');
    }
    if ($fresh['status'] === 'blocked') {
        logout_user();
        redirect('login.php?blocked=1');
    }
    if ($fresh['status'] !== $user['status'] || $fresh['role'] !== $user['role']) {
        $user['status'] = $fresh['status'];
        $user['role'] = $fresh['role'];
        $_SESSION['user'] = $user;
    }
    if ($user['status'] !== 'active') {
        redirect('pending.php');
    }
    return $user;
}

function require_role($roles) {
    $user = require_login();
    if (!in_array($user['role'], $roles, true)) {
        http_response_code(403);
        exit('Недостаточно прав');
    }
    return $user;
}

function is_admin_user($user) {
    return $user && $user['role'] === 'admin';
}
