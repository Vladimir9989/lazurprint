<?php
// Шаблон секретов для src/resources/mail.php (форма заявки).
// Реальный файл называется mail-config.php (в .gitignore, в git не попадает) и лежит на хостинге
// НА УРОВЕНЬ ВЫШЕ папки сайта: /home/c112136/lazurprint.ru/mail-config.php (не в www — из интернета недоступен).
// Заливается вручную/скриптом, не через `npm run deploy`. Права желательно 0600.
return array(
    'smtp_user'        => 'noreply@info.lazurprint.ru',
    'smtp_password'    => '',
    'recaptcha_secret' => '', // секретный ключ reCAPTCHA (для сервера)
);
