<?php

// Обработчик формы заявки (html/footer.html → main.js, XHR POST).
// Ответ — статус 200 и текст: при успехе — ПУСТОЙ ответ (ничего не выводить!), при ошибке — одна из строк ниже.
// main.js считает успехом только пустой ответ и узнаёт ошибки по этим строкам:
//   «Произошла ошибка» — сбой (нет конфига, капча не проверилась, письмо не ушло);
//   «ВЫ РОБОТ» — капча не пройдена;  «Заполните обязательные поля» / «Некорректный email»;
//   «Слишком много заявок» — лимит заявок с одного IP.
// Хостинг — PHP 7.3: без синтаксиса PHP 8.

// Секреты (пароль SMTP, ключ reCAPTCHA) лежат вне git и вне веб-корня: на хостинге это
// /home/c112136/lazurprint.ru/mail-config.php (на уровень выше www). Шаблон — mail-config.example.php в корне репозитория.
$configFile = dirname(__DIR__) . '/mail-config.php';
$config = is_file($configFile) ? include $configFile : null;
if (!is_array($config) || empty($config['smtp_password']) || empty($config['recaptcha_secret'])) {
    error_log('mail.php: не найден или неполон ' . $configFile);
    exit('Произошла ошибка');
}

// --- Антиспам: тихо отбрасываем ботов (отвечаем 200, чтобы они не искали обход) ---

// 1. Honeypot: скрытое поле, человек его не видит и не заполняет
if (trim(isset($_POST['website']) ? $_POST['website'] : '') !== '') {
    error_log('mail.php: spam (honeypot) ' . $_SERVER['REMOTE_ADDR']);
    exit;
}

// 2. Время заполнения: форма присылает, сколько мс прошло с загрузки страницы; быстрее 3 секунд — бот
$requireTimestamp = true;
$hasTimestamp = isset($_POST['form_ts']) && $_POST['form_ts'] !== '';
$elapsedMs = $hasTimestamp ? (int)$_POST['form_ts'] : 0;
if (($requireTimestamp || $hasTimestamp) && $elapsedMs < 3000) {
    error_log('mail.php: spam (too fast / no timestamp) ' . $_SERVER['REMOTE_ADDR']);
    exit;
}

// --- Поля: имя и телефон обязательны, email — по желанию ---

function postField($key)
{
    return trim(isset($_POST[$key]) ? (string)$_POST[$key] : '');
}

$name = postField('name');
$phone = postField('tel');
$email = postField('email');
$text = postField('textarea');

if ($name === '' || $phone === '') {
    exit('Заполните обязательные поля');
}

if ($email !== '' && !filter_var($email, FILTER_VALIDATE_EMAIL)) {
    exit('Некорректный email');
}

// --- 3. Частота: не больше 5 отправленных заявок в час с одного IP ---
// Считаются только заявки, прошедшие капчу и ушедшие менеджерам: неудачные попытки
// (не поставлена галочка, ошибка в email, сбой почты) лимит не тратят.

$rateLimit = 5;
$rateWindow = 3600;
$rateFile = sys_get_temp_dir() . '/lazur_mail_' . md5($_SERVER['REMOTE_ADDR']) . '.json';

// Отправки с этого IP за последний час. $record = true — добавить текущую и сохранить.
function rateTimes($file, $window, $record)
{
    $fh = @fopen($file, 'c+');
    if (!$fh) {
        return array();
    }
    $times = array();
    if (flock($fh, LOCK_EX)) {
        $times = json_decode(stream_get_contents($fh), true);
        $times = is_array($times) ? $times : array();
        $now = time();
        $times = array_values(array_filter($times, function ($t) use ($now, $window) {
            return $now - $t < $window;
        }));
        if ($record) {
            $times[] = $now;
            ftruncate($fh, 0);
            rewind($fh);
            fwrite($fh, json_encode($times));
        }
        flock($fh, LOCK_UN);
    }
    fclose($fh);
    return $times;
}

if (count(rateTimes($rateFile, $rateWindow, false)) >= $rateLimit) {
    error_log('mail.php: rate limit ' . $_SERVER['REMOTE_ADDR']);
    exit('Слишком много заявок');
}

// --- 4. Капча ---

$captchaResponse = postField('g-recaptcha-response');
if ($captchaResponse === '') {
    exit('ВЫ РОБОТ');
}

$ch = curl_init();
curl_setopt($ch, CURLOPT_URL, 'https://www.google.com/recaptcha/api/siteverify');
curl_setopt($ch, CURLOPT_RETURNTRANSFER, true);
curl_setopt($ch, CURLOPT_POST, true);
curl_setopt($ch, CURLOPT_TIMEOUT, 10);
curl_setopt($ch, CURLOPT_POSTFIELDS, array(
    'secret' => $config['recaptcha_secret'],
    'response' => $captchaResponse,
    'remoteip' => $_SERVER['REMOTE_ADDR'],
));
$captchaRaw = curl_exec($ch);
$curlError = curl_error($ch);
curl_close($ch);

if ($captchaRaw === false) {
    // Google не ответил — это сбой связи сервера, а не «робот»
    error_log('mail.php: reCAPTCHA недоступна: ' . $curlError);
    exit('Произошла ошибка');
}
$captcha = json_decode($captchaRaw, true);
if (!is_array($captcha) || empty($captcha['success'])) {
    exit('ВЫ РОБОТ');
}

// --- 5. Письмо менеджерам ---

require_once('phpmailer/PHPMailerAutoload.php');
$mail = new PHPMailer;
$mail->CharSet = 'utf-8';

$mail->isSMTP();
$mail->Host = 'mail.netangels.ru';
$mail->SMTPAuth = true;
$mail->Username = $config['smtp_user']; // логин и пароль почты, с которой уходят письма, — из mail-config.php
$mail->Password = $config['smtp_password'];
$mail->SMTPSecure = 'ssl';
$mail->Port = 2525;

$mail->setFrom('noreply@info.lazurprint.ru');
// Кому уходят заявки
$mail->addAddress('deeva.lazur@mail.ru');
// $mail->addAddress('av@lazurprint.ru');
$mail->addAddress('info@lazurprint.ru');
$mail->addAddress('agapovladimir89@gmail.com');
// $mail->addAddress('agapov_89@bk.ru');
// $mail->addAddress('admin@lazurprint.ru');
$mail->isHTML(true);

$h = function ($s) {
    return htmlspecialchars($s, ENT_QUOTES, 'UTF-8');
};

$mail->Subject = 'Заявка с сайта lazurprint';
$mail->Body = 'Имя: ' . $h($name)
    . '<br>Телефон: ' . $h($phone)
    . '<br>Почта: ' . ($email !== '' ? $h($email) : 'не указана')
    . '<br>Комментарий: ' . $h($text);
$mail->AltBody = '';

if ($email !== '') {
    // «Ответить» в почте — сразу клиенту
    $mail->addReplyTo($email, $name);
}

if (!$mail->send()) {
    // письмо не принято почтовым сервером — посетитель должен узнать, что заявка не ушла
    error_log('mail.php: письмо не отправлено: ' . $mail->ErrorInfo);
    exit('Произошла ошибка');
}

rateTimes($rateFile, $rateWindow, true);
