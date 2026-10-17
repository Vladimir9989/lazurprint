<?php
// Выгрузка реестра клиентов в виде таблицы Markdown — для файла docs/growth/outreach-sent.md,
// который читает Тестер, чтобы не искать клиентов, уже найденных раньше.
//
//   node admin-remote-exec.js admin/tools/leads-registry.php   (прод-база)
//   php admin/tools/leads-registry.php                          (локальная база)
//
// Вывод — в консоль; вставьте его в outreach-sent.md.

require_once __DIR__ . '/../src/db.php';
require_once __DIR__ . '/../src/leads_schema.php';
require_once __DIR__ . '/../src/leads.php';

leads_ensure_schema();

$rows = db()->query('SELECT l.*, CONCAT(o.first_name, " ", o.last_name) AS owner_name FROM leads l
    LEFT JOIN users o ON o.id = l.owner_id ORDER BY l.id')->fetchAll();

echo "| № | Компания | Сайт | E-mail | Ведёт | Дата | Статус |\n|---|---|---|---|---|---|---|\n";
foreach ($rows as $r) {
    $who = $r['owner_name'] ? $r['owner_name'] : ($r['manager_name'] !== '' ? $r['manager_name'] : '—');
    $date = $r['sent_at'] ? date('Y-m-d', strtotime($r['sent_at'])) : '—';
    $status = lead_status_label($r['status']) . ($r['is_archived'] ? ' (архив)' : '');
    $email = $r['channel'] === 'form' ? 'форма / звонок' : $r['email_to'];
    echo '| ' . $r['id'] . ' | ' . str_replace('|', '/', $r['company']) . ' | ' . $r['domain'] . ' | ' . $email
        . ' | ' . $who . ' | ' . $date . ' | ' . mb_strtolower($status) . " |\n";
}
