<?php
// Прокси картинок реального сайта для миниатюр во вкладке "Что на сайте" — сами картинки
// лежат вне web-корня админки (в dist/ у разработчика, в www/ на хостинге), пути к ним
// берутся из site_catalog.image_path (относительно catalog_html_path, см. config.local.php).
require_once __DIR__ . '/../src/bootstrap.php';

require_login();

$rel = isset($_GET['path']) ? (string) $_GET['path'] : '';
$rel = ltrim(str_replace('\\', '/', $rel), '/');

if ($rel === '' || strpos($rel, '..') !== false) {
    http_response_code(400);
    exit;
}

$root = realpath(dirname(config('catalog_html_path')));
$full = $root !== false ? realpath($root . '/' . $rel) : false;

if ($root === false || $full === false || strpos($full, $root) !== 0 || !is_file($full)) {
    http_response_code(404);
    exit;
}

$types = array(
    'jpg' => 'image/jpeg', 'jpeg' => 'image/jpeg', 'png' => 'image/png',
    'webp' => 'image/webp', 'gif' => 'image/gif',
);
$ext = strtolower(pathinfo($full, PATHINFO_EXTENSION));

header('Content-Type: ' . (isset($types[$ext]) ? $types[$ext] : 'application/octet-stream'));
header('Content-Length: ' . filesize($full));
header('Cache-Control: private, max-age=600');
readfile($full);
