<?php
// Разовая правка: клиентов «Без ответа» вернуть в «Отправлено» с новым сроком (отсчёт 10 дней заново).
// Нужна, потому что у старых писем дата отправки давно старше LEAD_SILENT_DAYS, и статус «Отправлено»,
// поставленный админом, тут же откатывался в «Без ответа» (исправлено в lead_admin_set_status).
//
//   node admin-remote-exec.js admin/tools/set-lead-sent.php 1 2 3 [--dry]
//
// Меняет только клиентов, которые сейчас в статусе «Без ответа».

require_once __DIR__ . '/../src/db.php';
require_once __DIR__ . '/../src/leads_schema.php';
require_once __DIR__ . '/../src/leads.php';

$dry = in_array('--dry', $argv, true);
$ids = array();
foreach (array_slice($argv, 1) as $a) {
    if (ctype_digit($a)) {
        $ids[] = (int) $a;
    }
}
if (!$ids) {
    fwrite(STDERR, "Укажите номера клиентов.\n");
    exit(1);
}

$changed = 0;
foreach ($ids as $id) {
    $stmt = db()->prepare('SELECT id, company, status FROM leads WHERE id = ?');
    $stmt->execute(array($id));
    $l = $stmt->fetch();
    if (!$l || $l['status'] !== 'silent') {
        echo "#$id пропущен (" . ($l ? 'статус «' . lead_status_label($l['status']) . '»' : 'нет такого') . ")\n";
        continue;
    }
    if (!$dry) {
        $upd = db()->prepare("UPDATE leads SET status = 'sent', sent_at = NOW(), nudged_at = NULL, status_changed_at = NOW() WHERE id = ? AND status = 'silent'");
        $upd->execute(array($id));
        if ($upd->rowCount() !== 1) {
            continue;
        }
        lead_log($id, null, 'status', 'Админ: статус «Отправлено», срок «без ответа» отсчитывается заново');
    }
    echo "#$id " . $l['company'] . ($dry ? ' (пробный прогон)' : ' → Отправлено') . "\n";
    $changed++;
}
echo "Готово: $changed.\n";
