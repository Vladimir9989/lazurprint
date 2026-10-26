<?php
// Удаляет клиентов (вместе с историей) по номерам. Нужен для чистки тестовых записей после проверки.
//
//   php admin/tools/delete-leads.php 11 12 13 14 [--dry] [--force]
//
// Без --force удаляются только записи, у которых название компании начинается с «ТЕСТ».
// На хостинге: node admin-remote-exec.js admin/tools/delete-leads.php 11 12 --dry

require_once __DIR__ . '/../src/db.php';

$ids = array();
$dry = false;
$force = false;
foreach (array_slice($argv, 1) as $arg) {
    if ($arg === '--dry') {
        $dry = true;
    } elseif ($arg === '--force') {
        $force = true;
    } elseif (ctype_digit($arg)) {
        $ids[] = (int) $arg;
    }
}
if (!$ids) {
    fwrite(STDERR, "Укажите номера клиентов.\n");
    exit(1);
}

$sel = db()->prepare('SELECT id, company, status, is_archived FROM leads WHERE id = ?');
$del = db()->prepare('DELETE FROM leads WHERE id = ?');
foreach ($ids as $id) {
    $sel->execute(array($id));
    $row = $sel->fetch();
    if (!$row) {
        echo "#$id: не найден\n";
        continue;
    }
    $is_test = mb_strpos(mb_strtoupper($row['company']), 'ТЕСТ') === 0;
    if (!$is_test && !$force) {
        echo "#$id «{$row['company']}»: не тестовая запись, пропущено (нужен --force)\n";
        continue;
    }
    if ($dry) {
        echo "#$id «{$row['company']}» ({$row['status']}): будет удалена\n";
        continue;
    }
    $del->execute(array($id)); // история удаляется каскадом
    echo "#$id «{$row['company']}»: удалена\n";
}
