<?php
// Отдаёт фото-образец (оригинал для письма или превью) только вошедшим пользователям.
require_once __DIR__ . '/../src/bootstrap.php';

$user = current_user();
if (!$user || $user['status'] !== 'active' || !in_array($user['role'], array('admin', 'manager'), true)) {
    http_response_code(403);
    exit;
}

$sample = sample_get(isset($_GET['id']) ? (int) $_GET['id'] : 0);
if (!$sample) {
    http_response_code(404);
    exit;
}

$thumb = !empty($_GET['thumb']);
$dir = sample_dir();
$path = $dir . '/' . ($thumb ? 'thumb_' : '') . $sample['filename'];
if (!is_file($path)) {
    $path = $dir . '/' . $sample['filename'];
}
if (!is_file($path)) {
    http_response_code(404);
    exit;
}

header('Content-Type: image/jpeg');
header('Cache-Control: private, max-age=3600');
header('Content-Length: ' . filesize($path));
if (!empty($_GET['download'])) {
    header('Content-Disposition: attachment; filename="' . sample_translit($sample['title']) . '.jpg"');
}
readfile($path);
