<?php
require_once __DIR__ . '/../src/bootstrap.php';

$user = require_role(array('admin', 'manager'));

if ($_SERVER['REQUEST_METHOD'] !== 'POST') {
    redirect('samples.php');
}
csrf_check();

$error = sample_send_zip(isset($_POST['ids']) ? $_POST['ids'] : array());
// Сюда попадаем только при ошибке: при успехе sample_send_zip() сама отдаёт файл и завершает запрос.
flash('error', $error);
$back = isset($_SERVER['HTTP_REFERER']) ? basename(parse_url($_SERVER['HTTP_REFERER'], PHP_URL_PATH)) : '';
$query = isset($_SERVER['HTTP_REFERER']) ? parse_url($_SERVER['HTTP_REFERER'], PHP_URL_QUERY) : '';
if (in_array($back, array('lead.php', 'samples.php'), true)) {
    redirect($back . ($query ? '?' . preg_replace('/[^A-Za-z0-9_=&%.-]/', '', $query) : ''));
}
redirect('samples.php');
