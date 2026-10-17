<?php
// Cron (раз в сутки): ставит «Без ответа» тем, кому отправили письмо больше LEAD_SILENT_DAYS
// дней назад и статус не менялся. То же самое админка делает сама при заходе в раздел,
// cron нужен, чтобы статусы были верными и без заходов.
//
//   php admin/tools/cron-leads.php

require_once __DIR__ . '/../src/db.php';
require_once __DIR__ . '/../src/leads_schema.php';
require_once __DIR__ . '/../src/leads.php';

try {
    leads_ensure_schema();
    leads_resolve_names();
    echo 'OK: переведено в «Без ответа» — ' . leads_auto_silent() . ".\n";
} catch (Exception $e) {
    fwrite(STDERR, 'Ошибка: ' . $e->getMessage() . "\n");
    exit(1);
}
