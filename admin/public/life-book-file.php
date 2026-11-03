<?php
// Выдача файлов заявки «Книга о жизни» вошедшим сотрудникам. Файлы лежат вне web-корня.
require_once __DIR__ . '/../src/bootstrap.php';

$user = require_role(array('admin', 'manager', 'viewer'));
$id = isset($_GET['id']) ? (string) $_GET['id'] : '';
$what = isset($_GET['f']) ? (string) $_GET['f'] : '';
$row = lb_get($id);
if (!$row) {
    http_response_code(404);
    exit('Не найдено');
}
$dir = lb_base_dir() . '/' . $id;

if ($what === 'zip') {
    $error = lb_send_zip($id);
    // Сюда попадаем только при ошибке: при успехе lb_send_zip() сама отдаёт файл и завершает запрос.
    flash('error', $error);
    redirect('life-book.php?id=' . urlencode($id));
}

if ($what === 'answers') {
    $file = $dir . '/answers.doc';
    $type = 'application/msword';
    $name = 'otvety-' . $id . '.doc';
} elseif ($what === 'photo') {
    $n = isset($_GET['n']) ? (string) $_GET['n'] : '';
    if (!preg_match('/^[0-9]{2,3}\.(jpg|png)$/', $n)) {
        http_response_code(404);
        exit('Не найдено');
    }
    $file = $dir . '/photos/' . $n;
    $type = substr($n, -3) === 'png' ? 'image/png' : 'image/jpeg';
    $name = $n;
} else {
    http_response_code(404);
    exit('Не найдено');
}

if (!is_file($file)) {
    http_response_code(404);
    exit('Файл не найден');
}
header('Content-Type: ' . $type);
header('Content-Length: ' . filesize($file));
header('X-Content-Type-Options: nosniff');
header('Content-Disposition: ' . ($what === 'photo' ? 'inline' : 'attachment') . '; filename="' . $name . '"');
readfile($file);
exit;
