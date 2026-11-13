<?php

// Обработчик формы заявки (html/footer.html → src/js/main.js, XHR POST). Хостинг — PHP 7.3: без синтаксиса PHP 8.
//
// GET  mail.php?token — выдаёт «пропуск» формы (form-modal.js берёт его при открытии формы).
// POST mail.php       — заявка. Ответ — статус 200 и текст: при успехе — ПУСТОЙ ответ (ничего не выводить!),
// при ошибке — одна из строк ниже. main.js считает успехом только пустой ответ и узнаёт ошибки по этим строкам:
//   «Произошла ошибка» — сбой (нет конфига, письмо не ушло);
//   «Обновите страницу» — нет пропуска или он старше суток (страница открыта давно / старая версия скриптов);
//   «Слишком быстро» — отправка меньше чем через 2 с после открытия формы;
//   «Заполните обязательные поля» / «Некорректный email»;
//   «Слишком много заявок» — лимит заявок с одного IP.
//
// Антиспам (с 2026-11-13 вместо reCAPTCHA Google):
//   1) honeypot — скрытое поле website (добавляет main.js); заполнено → тихо отбрасываем;
//   2) пропуск: метка времени + HMAC-подпись сервера. Бот, который шлёт POST напрямую, не открыв страницу, его не имеет;
//      поддельная подпись → тихо отбрасываем; нет пропуска → «Обновите страницу» (живой человек со старой страницей увидит);
//   3) не меньше 2 с от выдачи пропуска до отправки;
//   4) лимит 5 ушедших заявок в час с IP;
//   5) «мягкие» признаки (никаких нажатий/касаний в форме, >3 ссылок, HTML/BB-теги) — заявка НЕ теряется,
//      а уходит только на $suspectTo с пометкой в теме: живого клиента можно переслать менеджерам руками.
// Каждая попытка пишется в журнал ../form-log/ГГГГ-ММ.log (вне www; без имён и телефонов).

// Секреты лежат вне git и вне веб-корня: на хостинге /home/c112136/lazurprint.ru/mail-config.php.
// Шаблон — mail-config.example.php в корне репозитория.
$configFile = dirname(__DIR__) . '/mail-config.php';
$config = is_file($configFile) ? include $configFile : null;
if (!is_array($config) || empty($config['smtp_password'])) {
    error_log('mail.php: не найден или неполон ' . $configFile);
    exit('Произошла ошибка');
}

// Ключ подписи пропуска: свой form_secret из конфига или производный от пароля SMTP (отдельный ключ необязателен)
$tokenKey = !empty($config['form_secret']) ? $config['form_secret'] : hash('sha256', 'lazur-form|' . $config['smtp_password']);
$tokenMinAge = 2;          // секунд от выдачи пропуска до отправки
$tokenMaxAge = 24 * 3600;  // пропуск действует сутки

$suspectTo = 'agapovladimir89@gmail.com'; // куда уходят заявки с «мягкими» признаками спама

function formLog($result, $detail)
{
    $dir = dirname(__DIR__) . '/form-log';
    if (!is_dir($dir)) {
        @mkdir($dir, 0700, true);
    }
    $page = isset($_POST['page']) ? (string)$_POST['page'] : (isset($_SERVER['HTTP_REFERER']) ? $_SERVER['HTTP_REFERER'] : '');
    $ua = isset($_SERVER['HTTP_USER_AGENT']) ? $_SERVER['HTTP_USER_AGENT'] : '';
    $line = date('Y-m-d H:i:s') . "\t" . $_SERVER['REMOTE_ADDR'] . "\t" . $result . "\t" . $detail
        . "\t" . substr(preg_replace('/\s+/', ' ', $page), 0, 120) . "\t" . substr(preg_replace('/\s+/', ' ', $ua), 0, 160) . "\n";
    @file_put_contents($dir . '/' . date('Y-m') . '.log', $line, FILE_APPEND | LOCK_EX);
}

function makeToken($key)
{
    $ts = (string)time();
    return $ts . '.' . substr(hash_hmac('sha256', $ts, $key), 0, 32);
}

// --- Выдача пропуска ---
if ($_SERVER['REQUEST_METHOD'] === 'GET') {
    header('Content-Type: text/plain; charset=utf-8');
    header('Cache-Control: no-store, no-cache, must-revalidate');
    header('X-Robots-Tag: noindex');
    if (isset($_GET['token'])) {
        echo makeToken($tokenKey);
    }
    exit;
}

function postField($key)
{
    return trim(isset($_POST[$key]) ? (string)$_POST[$key] : '');
}

// --- 1. Honeypot: скрытое поле, человек его не видит и не заполняет ---
if (postField('website') !== '') {
    formLog('spam', 'honeypot');
    exit;
}

// --- 2–3. Пропуск ---
$token = postField('form_token');
if ($token === '') {
    formLog('error', 'no-token');
    exit('Обновите страницу');
}
$parts = explode('.', $token, 2);
if (count($parts) !== 2 || !ctype_digit($parts[0])
    || !hash_equals(substr(hash_hmac('sha256', $parts[0], $tokenKey), 0, 32), $parts[1])) {
    formLog('spam', 'bad-token');
    exit;
}
$age = time() - (int)$parts[0];
if ($age > $tokenMaxAge) {
    formLog('error', 'old-token ' . $age . 's');
    exit('Обновите страницу');
}
if ($age < $tokenMinAge) {
    formLog('error', 'too-fast ' . $age . 's');
    exit('Слишком быстро');
}

// --- Поля: имя и телефон обязательны, email — по желанию ---
$name = postField('name');
$phone = postField('tel');
$email = postField('email');
$text = postField('textarea');
$page = postField('page');

if ($name === '' || $phone === '') {
    formLog('error', 'empty-fields');
    exit('Заполните обязательные поля');
}

if ($email !== '' && !filter_var($email, FILTER_VALIDATE_EMAIL)) {
    formLog('error', 'bad-email');
    exit('Некорректный email');
}

// --- 4. Частота: не больше 5 отправленных заявок в час с одного IP ---
// Считаются только заявки, ушедшие на почту: неудачные попытки лимит не тратят.

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
    formLog('limit', 'rate');
    exit('Слишком много заявок');
}

// --- 5. Мягкие признаки спама: заявку не теряем, но шлём только на $suspectTo ---
$suspect = array();
if (postField('form_hi') === '') {
    $suspect[] = 'в форме не было ни нажатий, ни касаний';
}
$allText = $name . ' ' . $text . ' ' . $email;
$links = preg_match_all('~https?://|www\.~i', $allText);
if ($links > 3) {
    $suspect[] = 'ссылок: ' . $links;
}
if (preg_match('~<\s*a\s|\[url|\[/?link~i', $allText)) {
    $suspect[] = 'HTML/BB-ссылки в тексте';
}

// --- 6. Письмо ---

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
if ($suspect) {
    $mail->addAddress($suspectTo);
    $mail->Subject = 'ПРОВЕРИТЬ (похоже на спам): заявка с сайта lazurprint';
} else {
    // Кому уходят заявки
    $mail->addAddress('deeva.lazur@mail.ru');
    // $mail->addAddress('av@lazurprint.ru');
    $mail->addAddress('info@lazurprint.ru');
    $mail->addAddress('agapovladimir89@gmail.com');
    // $mail->addAddress('agapov_89@bk.ru');
    // $mail->addAddress('admin@lazurprint.ru');
    $mail->Subject = 'Заявка с сайта lazurprint';
}
$mail->isHTML(true);

$h = function ($s) {
    return htmlspecialchars($s, ENT_QUOTES, 'UTF-8');
};

$mail->Body = ($suspect ? '<b>Антиспам сайта сомневается:</b> ' . $h(implode('; ', $suspect))
        . '. Если это живой клиент — перешлите письмо менеджерам.<br><br>' : '')
    . 'Имя: ' . $h($name)
    . '<br>Телефон: ' . $h($phone)
    . '<br>Почта: ' . ($email !== '' ? $h($email) : 'не указана')
    . '<br>Комментарий: ' . nl2br($h($text))
    . ($page !== '' ? '<br>Страница: ' . $h(substr($page, 0, 200)) : '');
$mail->AltBody = '';

if ($email !== '') {
    // «Ответить» в почте — сразу клиенту
    $mail->addReplyTo($email, $name);
}

if (!$mail->send()) {
    // письмо не принято почтовым сервером — посетитель должен узнать, что заявка не ушла
    error_log('mail.php: письмо не отправлено: ' . $mail->ErrorInfo);
    formLog('error', 'smtp: ' . substr($mail->ErrorInfo, 0, 150));
    exit('Произошла ошибка');
}

rateTimes($rateFile, $rateWindow, true);
formLog($suspect ? 'sent-suspect' : 'sent', $suspect ? implode('; ', $suspect) : 'ok');
