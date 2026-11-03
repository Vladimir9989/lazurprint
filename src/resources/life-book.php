<?php

// Приём заявок «Книга о вашей жизни» (kniga-zhizni-anketa.html → life-book-anketa.js).
// Загрузка идёт по шагам: action=start (ответы, контакты, капча) → action=photo (по одному фото) → action=finish (письмо).
// Ответ — всегда JSON: {"ok":true,...} или {"ok":false,"error":"текст для посетителя"}. (Это не mail.php: тут пустой ответ — не успех.)
// Заявки лежат вне веб-корня, в папке life_book_dir из mail-config.php (на хостинге /home/c112136/lazurprint.ru/life-book).
// Хостинг — PHP 7.3-совместимый синтаксис: без match, ??=, стрелочных функций, типизированных свойств.

header('Content-Type: application/json; charset=utf-8');
header('Cache-Control: no-store');

function lb_out($data)
{
    echo json_encode($data, JSON_UNESCAPED_UNICODE);
    exit;
}

function lb_fail($message)
{
    lb_out(array('ok' => false, 'error' => $message));
}

if ($_SERVER['REQUEST_METHOD'] !== 'POST') {
    lb_fail('Неверный запрос');
}

$configFile = dirname(__DIR__) . '/mail-config.php';
$config = is_file($configFile) ? include $configFile : null;
if (!is_array($config) || empty($config['smtp_password']) || empty($config['recaptcha_secret']) || empty($config['life_book_dir'])) {
    error_log('life-book.php: не найден или неполон ' . $configFile);
    lb_fail('Произошла ошибка. Позвоните нам, пожалуйста.');
}
$baseDir = rtrim($config['life_book_dir'], '/\\');

$dataFile = __DIR__ . '/life-book-data.json';
$data = is_file($dataFile) ? json_decode(file_get_contents($dataFile), true) : null;
if (!is_array($data)) {
    error_log('life-book.php: нет life-book-data.json');
    lb_fail('Произошла ошибка. Позвоните нам, пожалуйста.');
}
$limits = $data['limits'];

function lb_field($key)
{
    return trim(isset($_POST[$key]) ? (string)$_POST[$key] : '');
}

function lb_cut($s, $len)
{
    $s = (string)$s;
    if (function_exists('mb_substr')) {
        return mb_substr($s, 0, $len, 'UTF-8');
    }
    return preg_match('/^.{0,' . (int)$len . '}/us', $s, $m) ? $m[0] : '';
}

function lb_valid_id($id)
{
    return (bool)preg_match('/^[0-9]{8}-[0-9]{6}-[a-f0-9]{6}$/', $id);
}

// Чтение и запись meta.json под блокировкой: фото приходят подряд и обновляют счётчики
function lb_update_meta($dir, $fn)
{
    $path = $dir . '/meta.json';
    $fh = @fopen($path, 'c+');
    if (!$fh) {
        return null;
    }
    $meta = null;
    if (flock($fh, LOCK_EX)) {
        $meta = json_decode(stream_get_contents($fh), true);
        if (is_array($meta)) {
            $meta = $fn($meta);
            ftruncate($fh, 0);
            rewind($fh);
            fwrite($fh, json_encode($meta, JSON_UNESCAPED_UNICODE | JSON_PRETTY_PRINT));
        }
        flock($fh, LOCK_UN);
    }
    fclose($fh);
    return is_array($meta) ? $meta : null;
}

// Частота: не больше 3 завершённых заявок в сутки с одного IP (учитывается в finish, проверяется в start)
function lb_rate($record)
{
    $file = sys_get_temp_dir() . '/lazur_lb_' . md5($_SERVER['REMOTE_ADDR']) . '.json';
    $fh = @fopen($file, 'c+');
    if (!$fh) {
        return 0;
    }
    $times = array();
    if (flock($fh, LOCK_EX)) {
        $times = json_decode(stream_get_contents($fh), true);
        $times = is_array($times) ? $times : array();
        $now = time();
        $times = array_values(array_filter($times, function ($t) use ($now) {
            return $now - $t < 86400;
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
    return count($times);
}

$action = lb_field('action');

// ---------------------------------------------------------------- start
if ($action === 'start') {
    // Антиспам: honeypot и время на странице (вернувшийся с готовыми ответами человек успевает за 15 секунд, бот — нет)
    if (lb_field('website') !== '') {
        error_log('life-book.php: spam (honeypot) ' . $_SERVER['REMOTE_ADDR']);
        lb_fail('Произошла ошибка');
    }
    if ((int)lb_field('form_ts') < 15000) {
        error_log('life-book.php: spam (too fast) ' . $_SERVER['REMOTE_ADDR']);
        lb_fail('Произошла ошибка');
    }
    if (lb_rate(false) >= 3) {
        lb_fail('Слишком много заявок с вашего адреса. Позвоните нам, пожалуйста.');
    }

    // Капча
    $captchaResponse = lb_field('g-recaptcha-response');
    if ($captchaResponse === '') {
        lb_fail('Поставьте галочку «Я не робот».');
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
        error_log('life-book.php: reCAPTCHA недоступна: ' . $curlError);
        lb_fail('Произошла ошибка. Повторите попытку чуть позже.');
    }
    $captcha = json_decode($captchaRaw, true);
    if (!is_array($captcha) || empty($captcha['success'])) {
        lb_fail('Проверка «Я не робот» не пройдена. Поставьте галочку ещё раз.');
    }

    // Данные
    $raw = isset($_POST['payload']) ? (string)$_POST['payload'] : '';
    if ($raw === '' || strlen($raw) > 1500000) {
        lb_fail('Слишком большой объём ответов. Позвоните нам, пожалуйста.');
    }
    $in = json_decode($raw, true);
    if (!is_array($in)) {
        lb_fail('Произошла ошибка. Обновите страницу и повторите.');
    }

    $contacts = isset($in['contacts']) && is_array($in['contacts']) ? $in['contacts'] : array();
    $cName = lb_cut(isset($contacts['name']) ? trim($contacts['name']) : '', 50);
    $cPhone = lb_cut(isset($contacts['phone']) ? trim($contacts['phone']) : '', 30);
    $cEmail = lb_cut(isset($contacts['email']) ? trim($contacts['email']) : '', 100);
    if ($cName === '' || strlen(preg_replace('/\D/', '', $cPhone)) < 10) {
        lb_fail('Укажите имя и телефон.');
    }
    if ($cEmail !== '' && !filter_var($cEmail, FILTER_VALIDATE_EMAIL)) {
        lb_fail('Проверьте адрес почты.');
    }
    if (empty($contacts['consent'])) {
        lb_fail('Нужно согласие на обработку данных.');
    }

    // Ответы: только известные q01…q99, не длиннее лимита
    $answers = array();
    if (isset($in['answers']) && is_array($in['answers'])) {
        foreach ($in['answers'] as $qid => $text) {
            if (preg_match('/^q\d{2}$/', (string)$qid) && is_string($text) && trim($text) !== '') {
                $answers[$qid] = lb_cut(trim($text), (int)$limits['answerMaxChars']);
            }
        }
    }
    $custom = array();
    if (isset($in['custom']) && is_array($in['custom'])) {
        foreach (array_slice($in['custom'], 0, (int)$limits['customQuestionsMax']) as $c) {
            if (is_array($c) && isset($c['text'], $c['answer']) && trim($c['text']) !== '' && trim($c['answer']) !== '') {
                $custom[] = array(
                    'text' => lb_cut(trim($c['text']), 300),
                    'answer' => lb_cut(trim($c['answer']), (int)$limits['answerMaxChars']),
                );
            }
        }
    }

    // Оформление: значения только из life-book-data.json
    $design = isset($in['design']) && is_array($in['design']) ? $in['design'] : array();
    $binding = '';
    $size = '';
    foreach ($data['bindings'] as $b) {
        foreach ($b['sizes'] as $s) {
            if (isset($design['size']) && $design['size'] === $s['id']) {
                $binding = $b['id'];
                $size = $s['id'];
            }
        }
    }
    if ($size === '') {
        lb_fail('Выберите переплёт и объём книги.');
    }
    $fontId = 'pt-serif';
    foreach ($data['fonts'] as $f) {
        if (isset($design['font']) && $design['font'] === $f['id']) {
            $fontId = $f['id'];
        }
    }
    $who = isset($in['who']) && $in['who'] === 'relative' ? 'relative' : 'self';
    $heroName = lb_cut(isset($in['heroName']) ? trim($in['heroName']) : '', 80);
    if ($heroName === '') {
        lb_fail('Укажите, чья это книга.');
    }
    $photosCount = max(0, min((int)$limits['photosMax'], isset($in['photosCount']) ? (int)$in['photosCount'] : 0));

    // Папка заявки
    if (!is_dir($baseDir) && !@mkdir($baseDir, 0750, true)) {
        error_log('life-book.php: нет папки ' . $baseDir);
        lb_fail('Произошла ошибка. Позвоните нам, пожалуйста.');
    }
    $id = date('Ymd-His') . '-' . bin2hex(random_bytes(3));
    $dir = $baseDir . '/' . $id;
    if (!@mkdir($dir . '/photos', 0750, true)) {
        error_log('life-book.php: не создать ' . $dir);
        lb_fail('Произошла ошибка. Позвоните нам, пожалуйста.');
    }
    $token = bin2hex(random_bytes(16));

    $meta = array(
        'id' => $id,
        'created' => date('c'),
        'status' => 'uploading',
        'token_hash' => hash('sha256', $token),
        'ip' => $_SERVER['REMOTE_ADDR'],
        'heroName' => $heroName,
        'who' => $who,
        'contacts' => array('name' => $cName, 'phone' => $cPhone, 'email' => $cEmail),
        'design' => array(
            'binding' => $binding,
            'size' => $size,
            'font' => $fontId,
            'coverText' => lb_cut(isset($design['coverText']) ? trim($design['coverText']) : '', 100),
        ),
        'photos_expected' => $photosCount,
        'photos_received' => 0,
        'answers_count' => count($answers),
        'custom_count' => count($custom),
    );
    file_put_contents($dir . '/meta.json', json_encode($meta, JSON_UNESCAPED_UNICODE | JSON_PRETTY_PRINT));
    file_put_contents($dir . '/answers.json', json_encode(array('answers' => $answers, 'custom' => $custom), JSON_UNESCAPED_UNICODE | JSON_PRETTY_PRINT));
    file_put_contents($dir . '/photos.json', '[]');

    lb_out(array('ok' => true, 'id' => $id, 'token' => $token));
}

// ---------------------------------------------------------------- photo / finish: общая проверка заявки и токена
if ($action !== 'photo' && $action !== 'finish') {
    lb_fail('Неверный запрос');
}
$id = lb_field('id');
$token = lb_field('token');
if (!lb_valid_id($id) || $token === '') {
    lb_fail('Заявка не найдена. Обновите страницу.');
}
$dir = $baseDir . '/' . $id;
$metaFile = $dir . '/meta.json';
$meta = is_file($metaFile) ? json_decode(file_get_contents($metaFile), true) : null;
if (!is_array($meta) || $meta['status'] !== 'uploading' || !hash_equals($meta['token_hash'], hash('sha256', $token))) {
    lb_fail('Заявка не найдена или уже отправлена. Обновите страницу.');
}

// ---------------------------------------------------------------- photo
if ($action === 'photo') {
    if (empty($_FILES['photo']) || $_FILES['photo']['error'] !== UPLOAD_ERR_OK) {
        lb_fail('Фото не получено. Повторите.');
    }
    $tmp = $_FILES['photo']['tmp_name'];
    if (!is_uploaded_file($tmp) || filesize($tmp) > 15 * 1024 * 1024) {
        lb_fail('Файл слишком большой.');
    }
    $info = @getimagesize($tmp);
    if (!$info || ($info[2] !== IMAGETYPE_JPEG && $info[2] !== IMAGETYPE_PNG)) {
        lb_fail('Подходят только фотографии JPEG и PNG.');
    }
    $ext = $info[2] === IMAGETYPE_PNG ? 'png' : 'jpg';
    $caption = lb_cut(lb_field('caption'), 200);
    $isCover = lb_field('cover') === '1';

    $result = null;
    $meta2 = lb_update_meta($dir, function ($m) use ($limits, $tmp, $ext, $caption, $isCover, $dir, &$result) {
        if ($m['photos_received'] >= (int)$limits['photosMax']) {
            $result = 'limit';
            return $m;
        }
        $n = $m['photos_received'] + 1;
        $file = sprintf('%02d.%s', $n, $ext);
        if (!move_uploaded_file($tmp, $dir . '/photos/' . $file)) {
            $result = 'move';
            return $m;
        }
        $list = json_decode(file_get_contents($dir . '/photos.json'), true);
        $list = is_array($list) ? $list : array();
        $list[] = array('file' => $file, 'caption' => $caption, 'cover' => $isCover);
        file_put_contents($dir . '/photos.json', json_encode($list, JSON_UNESCAPED_UNICODE | JSON_PRETTY_PRINT));
        $m['photos_received'] = $n;
        $result = 'ok';
        return $m;
    });
    if ($meta2 === null || $result !== 'ok') {
        lb_fail($result === 'limit' ? 'Слишком много фотографий.' : 'Не удалось сохранить фото. Повторите.');
    }
    lb_out(array('ok' => true));
}

// ---------------------------------------------------------------- finish
if ((int)$meta['photos_received'] < (int)$meta['photos_expected']) {
    lb_fail('Загружены не все фотографии. Нажмите «Повторить».');
}
$answersData = json_decode(file_get_contents($dir . '/answers.json'), true);
$answers = isset($answersData['answers']) ? $answersData['answers'] : array();
$custom = isset($answersData['custom']) ? $answersData['custom'] : array();

$h = function ($s) {
    return htmlspecialchars((string)$s, ENT_QUOTES, 'UTF-8');
};

// Файл для вычитки и вёрстки: HTML, который открывается в Word
$doc = '<html xmlns:o="urn:schemas-microsoft-com:office:office" xmlns:w="urn:schemas-microsoft-com:office:word" xmlns="http://www.w3.org/TR/REC-html40">'
    . '<head><meta charset="utf-8"><title>Книга: ' . $h($meta['heroName']) . '</title>'
    . '<style>body{font-family:Georgia,serif;font-size:13pt;line-height:1.5}h1{font-size:24pt}h2{font-size:17pt;margin-top:28pt}h3{font-size:13pt;font-style:italic;margin-bottom:2pt}p{margin:0 0 8pt}</style></head><body>'
    . '<h1>Книга: ' . $h($meta['heroName']) . '</h1>';
$paragraphs = function ($text) use ($h) {
    $out = '';
    foreach (preg_split('/\R+/u', $text) as $p) {
        if (trim($p) !== '') {
            $out .= '<p>' . $h($p) . '</p>';
        }
    }
    return $out;
};
foreach ($data['chapters'] as $chapter) {
    $block = '';
    foreach ($chapter['questions'] as $q) {
        if (isset($answers[$q['id']])) {
            $block .= '<h3>' . $h($q['text']) . '</h3>' . $paragraphs($answers[$q['id']]);
        }
    }
    if ($block !== '') {
        $doc .= '<h2>' . $h($chapter['title']) . '</h2>' . $block;
    }
}
if ($custom) {
    $doc .= '<h2>Свои вопросы</h2>';
    foreach ($custom as $c) {
        $doc .= '<h3>' . $h($c['text']) . '</h3>' . $paragraphs($c['answer']);
    }
}
$doc .= '</body></html>';
file_put_contents($dir . '/answers.doc', "\xEF\xBB\xBF" . $doc);

// Названия оформления для письма
$bindName = '';
$sizeName = '';
foreach ($data['bindings'] as $b) {
    foreach ($b['sizes'] as $s) {
        if ($s['id'] === $meta['design']['size']) {
            $bindName = $b['name'];
            $sizeName = $s['name'];
        }
    }
}
$fontName = '';
foreach ($data['fonts'] as $f) {
    if ($f['id'] === $meta['design']['font']) {
        $fontName = $f['name'];
    }
}

require_once('phpmailer/PHPMailerAutoload.php');
$mail = new PHPMailer;
$mail->CharSet = 'utf-8';
$mail->isSMTP();
$mail->Host = 'mail.netangels.ru';
$mail->SMTPAuth = true;
$mail->Username = $config['smtp_user'];
$mail->Password = $config['smtp_password'];
$mail->SMTPSecure = 'ssl';
$mail->Port = 2525;
$mail->setFrom('noreply@info.lazurprint.ru');
// Те же получатели, что у mail.php
$mail->addAddress('deeva.lazur@mail.ru');
$mail->addAddress('info@lazurprint.ru');
$mail->addAddress('agapovladimir89@gmail.com');
$mail->isHTML(true);

$mail->Subject = 'Книга о жизни: новая заявка — ' . $meta['heroName'];
$adminLink = 'https://lazurprint.ru/admin/life-book.php?id=' . urlencode($id);
$mail->Body = 'Герой книги: ' . $h($meta['heroName'])
    . '<br>Заполнял: ' . ($meta['who'] === 'relative' ? 'родственник' : 'сам(а) герой книги')
    . '<br>Заказчик: ' . $h($meta['contacts']['name'])
    . '<br>Телефон: ' . $h($meta['contacts']['phone'])
    . '<br>Почта: ' . ($meta['contacts']['email'] !== '' ? $h($meta['contacts']['email']) : 'не указана')
    . '<br>Переплёт: ' . $h($bindName . ', ' . $sizeName)
    . '<br>Шрифт: ' . $h($fontName)
    . '<br>Надпись на обложке: ' . $h($meta['design']['coverText'])
    . '<br>Ответов: ' . (int)$meta['answers_count'] . ' из 50, своих вопросов: ' . (int)$meta['custom_count']
    . '<br>Фото: ' . (int)$meta['photos_received']
    . '<br><br>Заявка в админке: <a href="' . $h($adminLink) . '">' . $h($adminLink) . '</a>'
    . '<br>Ответы приложены файлом (Word).';
$mail->AltBody = '';
if ($meta['contacts']['email'] !== '') {
    $mail->addReplyTo($meta['contacts']['email'], $meta['contacts']['name']);
}
$mail->addAttachment($dir . '/answers.doc', 'otvety-' . $id . '.doc');

if (!$mail->send()) {
    // статус не меняем: посетитель может нажать «Повторить» и завершить ещё раз
    error_log('life-book.php: письмо не отправлено: ' . $mail->ErrorInfo);
    lb_fail('Заявка сохранена, но письмо не ушло. Нажмите «Повторить».');
}

lb_update_meta($dir, function ($m) {
    $m['status'] = 'sent';
    $m['token_hash'] = '';
    $m['finished'] = date('c');
    return $m;
});
lb_rate(true);
lb_out(array('ok' => true));
