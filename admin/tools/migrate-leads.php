<?php
// Создаёт таблицы раздела «Клиенты для писем» и «Образцы» (sql/leads.sql) и правит users
// (роль «менеджер», должность, телефон). Безопасно запускать повторно.
// Админка делает то же сама при первом заходе; утилита нужна, чтобы выполнить миграцию
// на хостинге до первого захода людей:
//   node admin-remote-exec.js admin/tools/migrate-leads.php

require_once __DIR__ . '/../src/db.php';
require_once __DIR__ . '/../src/leads_schema.php';

try {
    if (leads_schema_ready()) {
        echo "Уже применено: схема раздела «Клиенты» на месте.\n";
        exit(0);
    }
    leads_run_migration();
    echo leads_schema_ready() ? "OK: схема раздела «Клиенты» создана.\n" : "Миграция не завершилась, смотрите лог ошибок.\n";
} catch (Exception $e) {
    fwrite(STDERR, 'Ошибка миграции: ' . $e->getMessage() . "\n");
    exit(1);
}
