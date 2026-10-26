<?php
// Cron (раз в сутки утром, лучше в рабочие дни, например 09:00): «Без ответа» через LEAD_SILENT_DAYS дней,
// возврат клиентов в общий список по истёкшему сроку отправки (LEAD_TAKE_WORKDAYS рабочих дня) и письма
// менеджерам: срок скоро кончится / пора написать повторно («Напомнить позже») / написать молчащим ещё раз.
// Состояния (статусы, возврат) админка пересчитывает и сама при заходе в раздел; cron нужен ради писем
// и чтобы статусы были верными без заходов.
//
//   php admin/tools/cron-leads.php

require_once __DIR__ . '/../src/db.php';
require_once __DIR__ . '/../src/mail.php';
require_once __DIR__ . '/../src/leads_schema.php';
require_once __DIR__ . '/../src/leads.php';

try {
    leads_ensure_schema();
    leads_resolve_names();
    $silent = leads_auto_silent();
    $expired = leads_auto_expire();
    $recycled = leads_auto_recycle();
    $mails = leads_send_deadline_mails();
    echo 'OK: «Без ответа» — ' . $silent . '; вернулось по сроку — ' . $expired . '; вернулось через ' . LEAD_RECYCLE_DAYS . ' дней — ' . $recycled
        . '; в письмах: срок кончается — ' . $mails['warned'] . ', пора написать повторно — ' . $mails['remind']
        . ', молчащим — ' . $mails['nudged'] . ".\n";
} catch (Exception $e) {
    fwrite(STDERR, 'Ошибка: ' . $e->getMessage() . "\n");
    exit(1);
}
