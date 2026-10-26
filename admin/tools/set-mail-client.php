<?php
// Способ открытия письма менеджера: php admin/tools/set-mail-client.php [--list] | <часть e-mail> <mailru|yandex|mailto|copy>
// На хостинге: node admin-remote-exec.js admin/tools/set-mail-client.php --list
require_once __DIR__ . '/../src/db.php';
require_once __DIR__ . '/../src/leads.php';

if (!isset($argv[1]) || $argv[1] === '--list') {
    foreach (db()->query("SELECT id, first_name, last_name, email, role, status, mail_client FROM users ORDER BY id")->fetchAll() as $u) {
        echo $u['id'] . "\t" . $u['first_name'] . ' ' . $u['last_name'] . "\t" . $u['email'] . "\t" . $u['role'] . "/" . $u['status'] . "\t" . $u['mail_client'] . "\n";
    }
    exit;
}
$client = isset($argv[2]) ? $argv[2] : '';
if (!isset(MAIL_CLIENTS[$client])) {
    fwrite(STDERR, "Неизвестный способ. Допустимо: " . implode(', ', array_keys(MAIL_CLIENTS)) . "\n");
    exit(1);
}
$stmt = db()->prepare('UPDATE users SET mail_client = ? WHERE email LIKE ?');
$stmt->execute(array($client, '%' . $argv[1] . '%'));
echo 'Обновлено: ' . $stmt->rowCount() . "\n";
