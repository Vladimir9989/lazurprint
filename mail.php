<?php 

require_once('phpmailer/PHPMailerAutoload.php');
$mail = new PHPMailer;
$mail->CharSet = 'utf-8';

$name = $_POST['name'];
$phone = $_POST['tel'];
$email = $_POST['email'];
$text = $_POST['textarea'];

//$mail->SMTPDebug = 3;                               // Enable verbose debug output

$mail->isSMTP();                                      // Set mailer to use SMTP
$mail->Host = 'mail.netangels.ru';  																							// Specify main and backup SMTP servers
$mail->SMTPAuth = true;                               // Enable SMTP authentication
$mail->Username = 'noreply@info.lazurprint.ru'; // Ваш логин от почты с которой будут отправляться письма
$mail->Password = 'Lazurprint1998'; // Ваш пароль от почты с которой будут отправляться письма
$mail->SMTPSecure = 'ssl';                            // Enable TLS encryption, `ssl` also accepted
$mail->Port = 2525; // TCP port to connect to / этот порт может отличаться у других провайдеров

$mail->setFrom('noreply@info.lazurprint.ru'); // от кого будет уходить письмо?
$mail->addAddress('deeva.lazur@mail.ru');     // Кому будет уходить письмо 
// $mail->addAddress('av@lazurprint.ru');     // Кому будет уходить письмо 
// $mail->addAddress('info@lazurprint.ru');     // Кому будет уходить письмо 
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
    $key = "6LfEyyEnAAAAAP6IGbe5zCygkBrB5MetacMF7wc1";
    
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