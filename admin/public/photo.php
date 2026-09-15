<?php
require_once __DIR__ . '/../src/bootstrap.php';

$user = current_user();
if (!$user || $user['status'] !== 'active') {
    http_response_code(403);
    exit;
}

$photo_id = isset($_GET['id']) ? (int) $_GET['id'] : 0;
$want_thumb = !empty($_GET['thumb']);

$stmt = db()->prepare('SELECT * FROM product_photos WHERE id = ? LIMIT 1');
$stmt->execute(array($photo_id));
$photo = $stmt->fetch();
if (!$photo) {
    http_response_code(404);
    exit;
}

$path = photo_disk_path($photo['product_id'], $photo, $want_thumb);
if (!is_file($path)) {
    http_response_code(404);
    exit;
}

$finfo = new finfo(FILEINFO_MIME_TYPE);
header('Content-Type: ' . $finfo->file($path));
header('Cache-Control: private, max-age=3600');
header('Content-Length: ' . filesize($path));
readfile($path);
