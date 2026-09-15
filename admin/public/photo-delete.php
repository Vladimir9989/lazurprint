<?php
require_once __DIR__ . '/../src/bootstrap.php';

header('Content-Type: application/json; charset=utf-8');

$user = current_user();
if (!$user || $user['status'] !== 'active' || $user['role'] === 'viewer') {
    http_response_code(403);
    echo json_encode(array('error' => 'Недостаточно прав'));
    exit;
}

if ($_SERVER['REQUEST_METHOD'] !== 'POST') {
    http_response_code(405);
    exit;
}

$input = json_decode(file_get_contents('php://input'), true);
if (!is_array($input)) {
    $input = $_POST;
}

$token = isset($input['csrf_token']) ? $input['csrf_token'] : '';
if (empty($_SESSION['csrf_token']) || !hash_equals($_SESSION['csrf_token'], (string) $token)) {
    http_response_code(400);
    echo json_encode(array('error' => 'Сессия устарела, обновите страницу'));
    exit;
}

$photo_id = isset($input['photo_id']) ? (int) $input['photo_id'] : 0;
$stmt = db()->prepare('SELECT product_id FROM product_photos WHERE id = ? LIMIT 1');
$stmt->execute(array($photo_id));
$row = $stmt->fetch();
if (!$row) {
    http_response_code(404);
    echo json_encode(array('error' => 'Фото не найдено'));
    exit;
}

delete_product_photo($photo_id, $row['product_id'], $user['id']);

echo json_encode(array('ok' => true));
