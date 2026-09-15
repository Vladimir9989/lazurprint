<?php
// Скопируй в config.local.php и заполни реальными значениями.
// config.local.php в .gitignore — реальные пароли никогда не коммитятся.

return array(
    // MySQL
    'db_host' => '127.0.0.1',
    'db_port' => 3306,
    'db_name' => 'lazur_admin',
    'db_user' => 'lazur_admin',
    'db_password' => 'lazur_admin_local',

    // Слово, которое админ сообщает сотрудникам устно для регистрации
    'registration_access_code' => 'lazur2026',

    // Папка для фото, ВНЕ web-корня. На хостинге:
    // /home/c112136/lazurprint.ru/uploads
    // Локально — папка рядом с admin/, не публикуемая через php -S (см. admin/README.md)
    'uploads_dir' => __DIR__ . '/uploads',

    // Куда уходят письма админу (новая заявка на регистрацию, карточка готова к публикации)
    'admin_email' => 'agapovladimir89@gmail.com',

    // Путь к catalog-suvenir.html для разбора реального каталога сайта (этап 2).
    // На хостинге: /home/c112136/lazurprint.ru/www/catalog-suvenir.html
    // Локально — собранный gulp'ом dist/catalog-suvenir.html (у пользователя свой dev-сервер,
    // файл всегда свежий; сам не пересобираем, см. CLAUDE.md).
    'catalog_html_path' => __DIR__ . '/../dist/catalog-suvenir.html',

    // Cron-задачи (раздел 7 и 8 ТЗ) — см. admin/tools/cron-*.php и вкладку Cron на хостинге:
    // карточка без движения дольше stale_product_days дней попадает в еженедельную сводку;
    // оригиналы фото удаляются через originals_auto_delete_days дней после публикации,
    // за originals_warning_days_before дней до этого админу уходит письмо-предупреждение.
    'stale_product_days' => 14,
    'originals_auto_delete_days' => 45,
    'originals_warning_days_before' => 7,

    // Письма-уведомления (раздел 8 ТЗ). На локальной разработке держать false — иначе
    // любое тестирование будет слать настоящие письма реальным сотрудникам. На сервере — true.
    'mail_enabled' => false,
    // Адрес, с которого приходит панель — сотрудникам отвечать не нужно, можно тот же ящик,
    // что уже используется формой на сайте (src/resources/mail.php), либо завести отдельный.
    'smtp_host' => 'mail.netangels.ru',
    'smtp_port' => 2525,
    'smtp_secure' => 'ssl',
    'smtp_username' => 'noreply@info.lazurprint.ru',
    'smtp_password' => '',
    'smtp_from' => 'noreply@info.lazurprint.ru',
    'smtp_from_name' => 'Учёт продукции «Лазурь»',

    // Базовый адрес админки — используется только для ссылок в письмах (без хвостового /).
    // На сервере: https://lazurprint.ru/admin
    'base_url' => 'http://127.0.0.1:8000',
);
