<?php
// Отдаёт фото-образец (оригинал или лёгкое превью) только вошедшим пользователям.
require_once __DIR__ . '/../src/bootstrap.php';

$user = current_user();
if (!$user || $user['status'] !== 'active' || !in_array($user['role'], array('admin', 'manager', 'viewer'), true)) {
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
$path = $dir . '/' . ($thumb ? sample_preview_name($sample['filename']) : $sample['filename']);
$type = $thumb ? array('jpg', 'image/jpeg') : sample_file_type($sample['filename']);
if ($thumb && !is_file($path)) {
    $path = $dir . '/' . $sample['filename'];
    $type = sample_file_type($sample['filename']);
}
if (!is_file($path)) {
    http_response_code(404);
    exit;
}

header('Content-Type: ' . $type[1]);
header('Cache-Control: private, max-age=3600');
header('Content-Length: ' . filesize($path));
if (!empty($_GET['download'])) {
    header('Content-Disposition: attachment; filename="' . sample_translit($sample['title']) . '.' . sample_file_type($sample['filename'])[0] . '"');
}
readfile($path);
