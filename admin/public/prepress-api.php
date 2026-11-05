<?php
require_once __DIR__ . '/../src/bootstrap.php';

header('Content-Type: application/json; charset=utf-8');
header('Cache-Control: no-store');

// Не require_login(): при устаревшей сессии нужен JSON, а не редирект на страницу входа.
$user = current_user();
if (!$user) {
    http_response_code(401);
    echo json_encode(array('error' => 'Нужно войти заново.'));
    exit;
}
$user = require_role(array('admin', 'viewer', 'prepress'));

if ($_SERVER['REQUEST_METHOD'] === 'POST') {
    $token = isset($_SERVER['HTTP_X_CSRF_TOKEN']) ? $_SERVER['HTTP_X_CSRF_TOKEN'] : '';
    if (empty($_SESSION['csrf_token']) || !hash_equals($_SESSION['csrf_token'], $token)) {
        http_response_code(400);
        echo json_encode(array('error' => 'Сессия устарела, обновите страницу.'));
        exit;
    }
    $p = json_decode(file_get_contents('php://input'), true);
    if (!is_array($p) || empty($p['act'])) {
        http_response_code(400);
        echo json_encode(array('error' => 'Некорректный запрос.'));
        exit;
    }
    // «Руководитель» только смотрит.
    if ($user['role'] === 'viewer') {
        http_response_code(403);
        echo json_encode(array('error' => 'У роли «Руководитель» доска только для просмотра.'));
        exit;
    }
    $err = pp_action($user, (string) $p['act'], $p);
    if ($err !== null) {
        http_response_code(409);
        echo json_encode(array('error' => $err, 'state' => pp_state()));
        exit;
    }
}

echo json_encode(array('state' => pp_state(), 'me' => (int) $user['id'], 'role' => $user['role']));
