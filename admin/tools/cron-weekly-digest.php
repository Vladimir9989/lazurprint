<?php
// CLI-утилита для Cron (раздел 8 ТЗ): еженедельная сводка "висит N карточек без
// движения" всем сотрудникам, кроме роли viewer. Порог "без движения" — настройка
// stale_product_days в config.local.php.
//
// Использование (в панели хостинга, вкладка Cron, раз в неделю):
//   php admin/tools/cron-weekly-digest.php

require_once __DIR__ . '/../src/db.php';
require_once __DIR__ . '/../src/mail.php';
require_once __DIR__ . '/../src/products.php';

$sent = notify_weekly_digest();
echo "Сводка отправлена: {$sent} адресатам.\n";
