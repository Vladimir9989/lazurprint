<?php

define('ROLE_LABELS', array(
    'admin' => 'Веб-разработчик',
    'warehouse' => 'Кладовщик',
    'photo' => 'Фотограф',
    'accounting' => 'Бухгалтерия',
    'viewer' => 'Руководитель',
));

define('REMEMBER_COOKIE', 'lazur_remember');
define('DEVICE_COOKIE', 'lazur_device');
define('REMEMBER_DAYS', 90);
define('PASSWORD_RESET_TTL_MINUTES', 60);

function role_label($role) {
    return isset(ROLE_LABELS[$role]) ? ROLE_LABELS[$role] : $role;
}

// Пытается тихо залогинить по cookie "запомнить меня", если сессии ещё нет.
function auth_bootstrap($is_https) {
    if (!empty($_SESSION['user'])) {
        return;
    }
    if (empty($_COOKIE[REMEMBER_COOKIE])) {
        return;
    }
    $parts = explode(':', $_COOKIE[REMEMBER_COOKIE], 2);
    if (count($parts) !== 2) {
        return;
    }
    list($selector, $validator) = $parts;

    $stmt = db()->prepare('SELECT rt.*, u.* FROM remember_tokens rt
        JOIN users u ON u.id = rt.user_id
        WHERE rt.selector = ? AND rt.expires_at > NOW() LIMIT 1');
    $stmt->execute(array($selector));
    $row = $stmt->fetch();
    if (!$row) {
        return;
    }
    if (!hash_equals($row['validator_hash'], hash('sha256', $validator))) {
        // Не совпало — похоже на подбор, удаляем токен на всякий случай.
        db()->prepare('DELETE FROM remember_tokens WHERE selector = ?')->execute(array($selector));
        return;
    }
    if ($row['status'] !== 'active') {
        return;
    }

    $_SESSION['user'] = strip_user_row($row);
    session_regenerate_id(true);

    // Ротация токена при каждом использовании.
    db()->prepare('DELETE FROM remember_tokens WHERE selector = ?')->execute(array($selector));
    issue_remember_token($row['id'], $is_https);
}

function strip_user_row($row) {
    return array(
        'id' => (int) $row['id'],
        'first_name' => $row['first_name'],
        'last_name' => $row['last_name'],
        'email' => $row['email'],
        'role' => $row['role'],
        'status' => $row['status'],
    );
}

function issue_remember_token($user_id, $is_https) {
    $selector = bin2hex(random_bytes(9));
    $validator = bin2hex(random_bytes(32));
    $expires = date('Y-m-d H:i:s', time() + REMEMBER_DAYS * 86400);

    db()->prepare('INSERT INTO remember_tokens (user_id, selector, validator_hash, expires_at) VALUES (?, ?, ?, ?)')
        ->execute(array($user_id, $selector, hash('sha256', $validator), $expires));

    setcookie(REMEMBER_COOKIE, $selector . ':' . $validator, array(
        'expires' => time() + REMEMBER_DAYS * 86400,
        'path' => '/',
        'secure' => $is_https,
        'httponly' => true,
        'samesite' => 'Lax',
    ));
}

function set_device_cookie($user, $is_https) {
    $value = base64_encode(json_encode(array(
        'name' => $user['first_name'] . ' ' . $user['last_name'],
        'email' => $user['email'],
    )));
    setcookie(DEVICE_COOKIE, $value, array(
        'expires' => time() + REMEMBER_DAYS * 86400,
        'path' => '/',
        'secure' => $is_https,
        'httponly' => false,
        'samesite' => 'Lax',
    ));
}

function get_device_hint() {
    if (empty($_COOKIE[DEVICE_COOKIE])) {
        return null;
    }
    $data = json_decode(base64_decode($_COOKIE[DEVICE_COOKIE]), true);
    if (!is_array($data) || empty($data['email'])) {
        return null;
    }
    return $data;
}

function clear_device_cookie() {
    setcookie(DEVICE_COOKIE, '', array('expires' => time() - 3600, 'path' => '/'));
}

function login_rate_limited($ip) {
    $stmt = db()->prepare("SELECT COUNT(*) c FROM login_attempts
        WHERE ip_address = ? AND success = 0 AND attempted_at > (NOW() - INTERVAL 15 MINUTE)");
    $stmt->execute(array($ip));
    return (int) $stmt->fetch()['c'] >= 10;
}

function record_login_attempt($ip, $email, $success) {
    db()->prepare('INSERT INTO login_attempts (ip_address, email, success) VALUES (?, ?, ?)')
        ->execute(array($ip, $email, $success ? 1 : 0));
}

// Возвращает user-массив при успехе, либо строку с текстом ошибки.
function attempt_login($email, $password, $remember, $is_https) {
    $ip = isset($_SERVER['REMOTE_ADDR']) ? $_SERVER['REMOTE_ADDR'] : '0.0.0.0';

    if (login_rate_limited($ip)) {
        return 'Слишком много попыток входа. Попробуйте через 15 минут.';
    }

    $stmt = db()->prepare('SELECT * FROM users WHERE email = ? LIMIT 1');
    $stmt->execute(array($email));
    $row = $stmt->fetch();

    if (!$row || !password_verify($password, $row['password_hash'])) {
        record_login_attempt($ip, $email, false);
        return 'Неверная почта или пароль.';
    }

    if ($row['status'] === 'pending') {
        return 'Регистрация ещё не подтверждена администратором.';
    }
    if ($row['status'] === 'blocked') {
        return 'Доступ заблокирован. Обратитесь к администратору.';
    }

    record_login_attempt($ip, $email, true);

    $user = strip_user_row($row);
    $_SESSION['user'] = $user;
    session_regenerate_id(true);

    db()->prepare('UPDATE users SET last_login_at = NOW() WHERE id = ?')->execute(array($row['id']));

    if ($remember) {
        issue_remember_token($row['id'], $is_https);
    }
    set_device_cookie($user, $is_https);

    return $user;
}

function logout_user() {
    if (!empty($_COOKIE[REMEMBER_COOKIE])) {
        $parts = explode(':', $_COOKIE[REMEMBER_COOKIE], 2);
        if (count($parts) === 2) {
            db()->prepare('DELETE FROM remember_tokens WHERE selector = ?')->execute(array($parts[0]));
        }
        setcookie(REMEMBER_COOKIE, '', array('expires' => time() - 3600, 'path' => '/'));
    }
    $_SESSION = array();
    session_destroy();
}

// Возвращает true при успехе, либо строку с текстом ошибки.
function register_user($first_name, $last_name, $email, $password, $role, $access_code) {
    $first_name = trim($first_name);
    $last_name = trim($last_name);
    $email = trim(mb_strtolower($email));

    if ($first_name === '' || $last_name === '' || $email === '' || $password === '') {
        return 'Заполните все поля.';
    }
    if (!filter_var($email, FILTER_VALIDATE_EMAIL)) {
        return 'Некорректная почта.';
    }
    if (mb_strlen($password) < 6) {
        return 'Пароль должен быть не короче 6 символов.';
    }
    if (!isset(ROLE_LABELS[$role])) {
        return 'Выберите роль.';
    }
    if (!hash_equals(config('registration_access_code'), $access_code)) {
        return 'Неверный код доступа.';
    }

    $stmt = db()->prepare('SELECT id FROM users WHERE email = ? LIMIT 1');
    $stmt->execute(array($email));
    if ($stmt->fetch()) {
        return 'Пользователь с такой почтой уже зарегистрирован.';
    }

    db()->prepare('INSERT INTO users (first_name, last_name, email, password_hash, role, status)
        VALUES (?, ?, ?, ?, ?, "pending")')
        ->execute(array($first_name, $last_name, $email, password_hash($password, PASSWORD_DEFAULT), $role));

    notify_new_registration(array(
        'first_name' => $first_name, 'last_name' => $last_name, 'email' => $email, 'role' => $role,
    ));

    return true;
}

function confirm_user($user_id) {
    $stmt = db()->prepare("SELECT * FROM users WHERE id = ? AND status = 'pending' LIMIT 1");
    $stmt->execute(array($user_id));
    $user_row = $stmt->fetch();
    if (!$user_row) {
        return;
    }
    db()->prepare("UPDATE users SET status = 'active', confirmed_at = NOW() WHERE id = ?")
        ->execute(array($user_id));
    notify_registration_confirmed($user_row);
}

function list_pending_users() {
    return db()->query("SELECT * FROM users WHERE status = 'pending' ORDER BY created_at ASC")->fetchAll();
}

function count_active_admins() {
    return (int) db()->query("SELECT COUNT(*) c FROM users WHERE role = 'admin' AND status = 'active'")->fetch()['c'];
}

// Возвращает true при успехе, либо строку с текстом ошибки. $actor — админ, который
// выполняет действие (экран «Пользователи»), нужен, чтобы не дать самому себе отрезать
// доступ (сменить свою же роль или заблокировать себя).
function set_user_role($actor, $user_id, $role) {
    if (!isset(ROLE_LABELS[$role])) {
        return 'Некорректная роль.';
    }
    if ((int) $user_id === (int) $actor['id']) {
        return 'Нельзя менять роль самому себе.';
    }
    $stmt = db()->prepare('SELECT role, status FROM users WHERE id = ? LIMIT 1');
    $stmt->execute(array($user_id));
    $target = $stmt->fetch();
    if (!$target) {
        return 'Пользователь не найден.';
    }
    if ($target['role'] === 'admin' && $role !== 'admin' && $target['status'] === 'active'
        && count_active_admins() <= 1) {
        return 'Нельзя понизить последнего администратора.';
    }
    db()->prepare('UPDATE users SET role = ? WHERE id = ?')->execute(array($role, $user_id));
    return true;
}

// Возвращает true при успехе, либо строку с текстом ошибки.
function set_user_blocked($actor, $user_id, $blocked) {
    if ((int) $user_id === (int) $actor['id']) {
        return 'Нельзя заблокировать самого себя.';
    }
    $stmt = db()->prepare('SELECT role, status FROM users WHERE id = ? LIMIT 1');
    $stmt->execute(array($user_id));
    $target = $stmt->fetch();
    if (!$target) {
        return 'Пользователь не найден.';
    }
    if ($blocked) {
        if ($target['role'] === 'admin' && count_active_admins() <= 1) {
            return 'Нельзя заблокировать последнего администратора.';
        }
        db()->prepare("UPDATE users SET status = 'blocked' WHERE id = ?")->execute(array($user_id));
        // Немедленно разлогинивает — без этого заблокированный останется в системе до
        // конца сессии/до истечения cookie "запомнить меня" (см. require_login()).
        db()->prepare('DELETE FROM remember_tokens WHERE user_id = ?')->execute(array($user_id));
    } else {
        db()->prepare("UPDATE users SET status = 'active' WHERE id = ?")->execute(array($user_id));
    }
    return true;
}

// Восстановление пароля (раздел 12 ТЗ, этап 3): письмо со ссылкой вместо ручного сброса
// админом. Селектор/валидатор — та же схема, что у remember_tokens.
//
// Молча ничего не делает, если почта не найдена или пользователь не active — чтобы форма
// "забыли пароль" не позволяла проверять, зарегистрирован ли конкретный адрес.
function request_password_reset($email) {
    $email = trim(mb_strtolower($email));
    $stmt = db()->prepare("SELECT * FROM users WHERE email = ? AND status = 'active' LIMIT 1");
    $stmt->execute(array($email));
    $user_row = $stmt->fetch();
    if (!$user_row) {
        return;
    }

    // Старые неиспользованные ссылки этого пользователя перестают работать — если письмо
    // запросили повторно, действовать должна только последняя ссылка.
    db()->prepare('DELETE FROM password_resets WHERE user_id = ?')->execute(array($user_row['id']));

    $selector = bin2hex(random_bytes(9));
    $validator = bin2hex(random_bytes(32));
    $expires = date('Y-m-d H:i:s', time() + PASSWORD_RESET_TTL_MINUTES * 60);
    db()->prepare('INSERT INTO password_resets (user_id, selector, validator_hash, expires_at) VALUES (?, ?, ?, ?)')
        ->execute(array($user_row['id'], $selector, hash('sha256', $validator), $expires));

    $link = rtrim(config('base_url'), '/') . '/reset-password.php?selector=' . $selector . '&validator=' . $validator;
    notify_password_reset($user_row, $link, PASSWORD_RESET_TTL_MINUTES);
}

// Проверяет ссылку из письма, возвращает строку password_resets (+ данные пользователя)
// или null, если ссылка неверна/просрочена/уже использована.
function find_password_reset($selector, $validator) {
    $stmt = db()->prepare('SELECT pr.*, u.email, u.first_name FROM password_resets pr
        JOIN users u ON u.id = pr.user_id
        WHERE pr.selector = ? AND pr.expires_at > NOW() LIMIT 1');
    $stmt->execute(array($selector));
    $row = $stmt->fetch();
    if (!$row || !hash_equals($row['validator_hash'], hash('sha256', $validator))) {
        return null;
    }
    return $row;
}

function reset_password($reset_row, $new_password) {
    db()->prepare('UPDATE users SET password_hash = ? WHERE id = ?')
        ->execute(array(password_hash($new_password, PASSWORD_DEFAULT), $reset_row['user_id']));
    db()->prepare('DELETE FROM password_resets WHERE user_id = ?')->execute(array($reset_row['user_id']));
    // На всякий случай сбрасывает все "запомненные" устройства — если пароль меняли
    // из-за утечки, старые долгоживущие сессии не должны продолжать работать молча.
    db()->prepare('DELETE FROM remember_tokens WHERE user_id = ?')->execute(array($reset_row['user_id']));
}
