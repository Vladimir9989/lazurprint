<?php 

// Секреты (пароль SMTP, ключ reCAPTCHA) лежат вне git и вне веб-корня: на хостинге это
// /home/c112136/lazurprint.ru/mail-config.php (на уровень выше www). Шаблон — mail-config.example.php в корне репозитория.
$configFile = dirname(__DIR__) . '/mail-config.php';
$config = is_file($configFile) ? include $configFile : null;
if (!is_array($config) || empty($config['smtp_password']) || empty($config['recaptcha_secret'])) {
    error_log('mail.php: не найден или неполон ' . $configFile);
    exit('Произошла ошибка');
}

require_once('phpmailer/PHPMailerAutoload.php');
$mail = new PHPMailer;
$mail->CharSet = 'utf-8';

// --- Антиспам: тихо отбрасываем ботов (отвечаем 200, чтобы они не искали обход) ---

// 1. Honeypot: скрытое поле, человек его не видит и не заполняет
if (trim($_POST['website'] ?? '') !== '') {
    error_log('mail.php: spam (honeypot) ' . $_SERVER['REMOTE_ADDR']);
    exit;
}

// 2. Время заполнения: форма присылает, сколько мс прошло с загрузки страницы; быстрее 3 секунд — бот
// Строгий режим (включён при деплое 1.0.14): раньше у посетителей со старым закэшированным app.js поля form_ts ещё нет — их заявки пропускаем,
// чтобы не терять настоящих клиентов. Когда на хостинге обновятся все страницы (новый ?_v=), поставить true.
$requireTimestamp = true;
$hasTimestamp = isset($_POST['form_ts']) && $_POST['form_ts'] !== '';
$elapsedMs = (int)($_POST['form_ts'] ?? 0);
if (($requireTimestamp || $hasTimestamp) && $elapsedMs < 3000) {
    error_log('mail.php: spam (too fast / no timestamp) ' . $_SERVER['REMOTE_ADDR']);
    exit;
}

// 3. Частота: не больше 5 заявок в час с одного IP
$rateLimit = 5;
$rateWindow = 3600;
$rateFile = sys_get_temp_dir() . '/lazur_mail_' . md5($_SERVER['REMOTE_ADDR']) . '.json';
$fh = @fopen($rateFile, 'c+');
if ($fh && flock($fh, LOCK_EX)) {
    $times = json_decode(stream_get_contents($fh), true);
    $times = is_array($times) ? $times : array();
    $now = time();
    $times = array_values(array_filter($times, function ($t) use ($now, $rateWindow) {
        return $now - $t < $rateWindow;
    }));
    if (count($times) >= $rateLimit) {
        flock($fh, LOCK_UN);
        fclose($fh);
        error_log('mail.php: spam (rate limit) ' . $_SERVER['REMOTE_ADDR']);
        exit;
    }
    $times[] = $now;
    ftruncate($fh, 0);
    rewind($fh);
    fwrite($fh, json_encode($times));
    flock($fh, LOCK_UN);
}
if ($fh) {
    fclose($fh);
}

$name = trim($_POST['name'] ?? '');
$phone = trim($_POST['tel'] ?? '');
$email = trim($_POST['email'] ?? '');
$text = trim($_POST['textarea'] ?? '');

if ($name === '' || $phone === '' || $email === '') {
    exit('Заполните обязательные поля');
}

if (!filter_var($email, FILTER_VALIDATE_EMAIL)) {
    exit('Некорректный email');
}

$name = htmlspecialchars($name, ENT_QUOTES, 'UTF-8');
$phone = htmlspecialchars($phone, ENT_QUOTES, 'UTF-8');
$email = htmlspecialchars($email, ENT_QUOTES, 'UTF-8');
$text = htmlspecialchars($text, ENT_QUOTES, 'UTF-8');

//$mail->SMTPDebug = 3;                               // Enable verbose debug output

$mail->isSMTP();                                      // Set mailer to use SMTP
$mail->Host = 'mail.netangels.ru';  																							// Specify main and backup SMTP servers
$mail->SMTPAuth = true;                               // Enable SMTP authentication
$mail->Username = $config['smtp_user']; // логин и пароль почты, с которой уходят письма, — из mail-config.php
$mail->Password = $config['smtp_password'];
$mail->SMTPSecure = 'ssl';                            // Enable TLS encryption, `ssl` also accepted
$mail->Port = 2525; // TCP port to connect to / этот порт может отличаться у других провайдеров

$mail->setFrom('noreply@info.lazurprint.ru'); // от кого будет уходить письмо?
$mail->addAddress('deeva.lazur@mail.ru');     // Кому будет уходить письмо 
// $mail->addAddress('av@lazurprint.ru');     // Кому будет уходить письмо 
$mail->addAddress('info@lazurprint.ru');     // Кому будет уходить письмо
$mail->addAddress('agapovladimir89@gmail.com');     // Кому будет уходить письмо 
// $mail->addAddress('agapov_89@bk.ru');     // Кому будет уходить письмо 
// $mail->addAddress('admin@lazurprint.ru');     // Кому будет уходить письмо 
//$mail->addAddress('ellen@example.com');               // Name is optional
//$mail->addReplyTo('info@example.com', 'Information');
//$mail->addCC('cc@example.com');
//$mail->addBCC('bcc@example.com');
//$mail->addAttachment('/var/tmp/file.tar.gz');         // Add attachments
// $mail->addAttachment($_FILES['upload']['tmp_name'], $_FILES['upload']['name']);    // Optional name
$mail->isHTML(true);                                  // Set email format to HTML

$mail->Subject = 'Заявка с сайта lazurprint';
$mail->Body    = 'Имя: ' .$name . ' <br>Телефон: ' .$phone . ' <br>Почта: ' .$email . '<br>Комментарий: ' .$text;
$mail->AltBody = '';

// if(!$mail->send()) {
//     echo 'Error';
// } else {
//     header('location: thanks.html');
// }

// $mail->send();


if (!$_POST["g-recaptcha-response"]) {
    // Если данных нет, то программа останавливается и выводит ошибку
    exit("Произошла ошибка");
} else { // Иначе создаём запрос для проверки капчи
    // URL куда отправлять запрос для проверки
    $url = "https://www.google.com/recaptcha/api/siteverify";
    // Ключ для сервера
    $key = $config['recaptcha_secret'];
    
    $response = null;
    // Данные для запроса
    $query = array(
        "secret" => $key, // Ключ для сервера
        "response" => $_POST["g-recaptcha-response"], // Данные от капчи
        "remoteip" => $_SERVER['REMOTE_ADDR'] // Адрес сервера
    );
 
    // Создаём запрос для отправки
    $ch = curl_init();
    // Настраиваем запрос 
    curl_setopt($ch, CURLOPT_URL, $url); 
    curl_setopt($ch, CURLOPT_RETURNTRANSFER, true); 
    curl_setopt($ch, CURLOPT_POST, true); 
    curl_setopt($ch, CURLOPT_POSTFIELDS, $query); 
    // отправляет и возвращает данные
    $data = json_decode(curl_exec($ch), $assoc=true); 
    // Закрытие соединения
    curl_close($ch);


    // Если нет success то
    if (!$data['success']) {
        // Останавливает программу и выводит "ВЫ РОБОТ"
        exit("ВЫ РОБОТ");
    } else {
        $mail->send();
    }
}

?>