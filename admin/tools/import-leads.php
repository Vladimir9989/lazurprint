<?php
// Загрузка клиентов пачкой из CSV/JSON (то же, что страница «Загрузить пачкой»).
//
//   php admin/tools/import-leads.php файл.csv [--dry] [--batch="неделя 2"]
//
// На хостинге файл должен лежать на сервере: node admin-remote-exec.js admin/tools/import-leads.php /путь/файл.csv
// Формат колонок — на странице leads-import.php.

require_once __DIR__ . '/../src/db.php';
require_once __DIR__ . '/../src/mail.php';
require_once __DIR__ . '/../src/auth.php';
require_once __DIR__ . '/../src/leads_schema.php';
require_once __DIR__ . '/../src/leads.php';
if (!function_exists('is_admin_user')) {
    function is_admin_user($user) {
        return $user && isset($user['role']) && $user['role'] === 'admin';
    }
}

$file = null;
$dry = false;
$batch = '';
foreach (array_slice($argv, 1) as $arg) {
    if ($arg === '--dry') {
        $dry = true;
    } elseif (strpos($arg, '--batch=') === 0) {
        $batch = substr($arg, 8);
    } else {
        $file = $arg;
    }
}
if (!$file || !is_file($file)) {
    fwrite(STDERR, "Укажите существующий файл CSV/JSON.\n");
    exit(1);
}

leads_ensure_schema();
$parsed = lead_parse_import(file_get_contents($file), basename($file));
if (isset($parsed['error'])) {
    fwrite(STDERR, $parsed['error'] . "\n");
    exit(1);
}
$res = lead_import_rows($parsed['rows'], null, $dry, $batch);
echo ($dry ? '[проверка] ' : '') . 'Строк в файле: ' . count($parsed['rows']) . ', добавлено: ' . $res['created']
    . ', дублей: ' . count($res['skipped']) . ', ошибок: ' . count($res['errors']) . "\n";
foreach ($res['skipped'] as $s) {
    echo '  дубль: ' . $s . "\n";
}
foreach ($res['errors'] as $s) {
    echo '  ошибка: ' . $s . "\n";
}
exit($res['errors'] ? 1 : 0);
