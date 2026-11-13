<?php
// Шаблон секретов для src/resources/mail.php (форма заявки).
// Реальный файл называется mail-config.php (в .gitignore, в git не попадает) и лежит на хостинге
// НА УРОВЕНЬ ВЫШЕ папки сайта: /home/c112136/lazurprint.ru/mail-config.php (не в www — из интернета недоступен).
// Заливается вручную/скриптом, не через `npm run deploy`. Права желательно 0600.
return array(
    'smtp_user'        => 'noreply@info.lazurprint.ru',
    'smtp_password'    => '',
    'life_book_dir'    => '/home/c112136/lazurprint.ru/life-book', // заявки «Книга о жизни» (life-book.php); папку создать вручную
    'recaptcha_secret' => '', // секретный ключ reCAPTCHA — только для анкеты «Книга о жизни» (life-book.php); форма заявки с 2026-11-13 без капчи
    // 'form_secret'   => '', // необязательно: ключ подписи пропуска формы заявки; без него mail.php выводит ключ из smtp_password
);
