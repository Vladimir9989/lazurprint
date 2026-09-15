<?php
// CLI-утилита для Cron (раздел 6/12 ТЗ): ночная сверка каталога сайта. Делает то же
// самое, что кнопка "Обновить список" на вкладке "Что на сайте" — разбирает свежий
// catalog-suvenir.html и автоматически отмечает найденные там карточки опубликованными.
//
// Использование (в панели хостинга, вкладка Cron, раз в сутки ночью):
//   php admin/tools/cron-nightly-sync.php

require_once __DIR__ . '/../src/db.php';
require_once __DIR__ . '/../src/mail.php';
require_once __DIR__ . '/../src/products.php';
require_once __DIR__ . '/../src/site_catalog.php';

$system_user = array('id' => null);

try {
    $result = resync_site_catalog();
    $auto = auto_publish_after_sync($system_user);
    echo "OK: разобрано позиций — {$result['parsed']}, вставлено — {$result['inserted']}, "
        . "автоматически отмечено опубликованными — {$auto}.\n";
} catch (Exception $e) {
    fwrite(STDERR, 'Ошибка ночной сверки каталога: ' . $e->getMessage() . "\n");
    exit(1);
}
