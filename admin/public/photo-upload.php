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

$token = isset($_POST['csrf_token']) ? $_POST['csrf_token'] : '';
if (empty($_SESSION['csrf_token']) || !hash_equals($_SESSION['csrf_token'], (string) $token)) {
    http_response_code(400);
    echo json_encode(array('error' => 'Сессия устарела, обновите страницу'));
    exit;
}

$product_id = isset($_POST['product_id']) ? (int) $_POST['product_id'] : 0;
$product = $product_id ? get_product($product_id) : null;
if (!$product) {
    http_response_code(404);
    echo json_encode(array('error' => 'Карточка не найдена'));
    exit;
}

if (empty($_FILES['photo']) || $_FILES['photo']['error'] !== UPLOAD_ERR_OK) {
    http_response_code(400);
    echo json_encode(array('error' => 'Файл не получен'));
    exit;
}

$result = save_product_photo(
    $product_id,
    $_FILES['photo']['tmp_name'],
    $_FILES['photo']['name'],
    $user['id']
);

if ($result !== true) {
    http_response_code(400);
    echo json_encode(array('error' => $result));
    exit;
}

echo json_encode(array('ok' => true));
