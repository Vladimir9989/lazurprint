<?php
// Письма-уведомления админ-панели (раздел 8 ТЗ). Своя копия PHPMailer 6.x в
// admin/vendor/phpmailer/ (не используем src/resources/phpmailer/ сайта — админка
// разворачивается на сервере отдельно от build/, свой независимый цикл, см. CLAUDE.md).
require_once __DIR__ . '/../vendor/phpmailer/Exception.php';
require_once __DIR__ . '/../vendor/phpmailer/PHPMailer.php';
require_once __DIR__ . '/../vendor/phpmailer/SMTP.php';

use PHPMailer\PHPMailer\PHPMailer;
use PHPMailer\PHPMailer\Exception as PHPMailerException;

// Отправляет письмо и пишет исход в лог. Ошибка отправки не бросает исключение —
// письмо не должно ронять основное действие (сохранение карточки, регистрацию и т.п.).
function send_mail($to, $subject, $body) {
    if (!config('mail_enabled')) {
        error_log('[admin mail отключена] to=' . $to . ' subject=' . $subject);
        return true;
    }
    try {
        $mail = new PHPMailer(true);
        $mail->CharSet = 'utf-8';
        $mail->isSMTP();
        $mail->Host = config('smtp_host');
        $mail->SMTPAuth = true;
        $mail->Username = config('smtp_username');
        $mail->Password = config('smtp_password');
        $mail->SMTPSecure = config('smtp_secure');
        $mail->Port = config('smtp_port');
        $mail->setFrom(config('smtp_from'), config('smtp_from_name'));
        $mail->addAddress($to);
        $mail->isHTML(false);
        $mail->Subject = $subject;
        $mail->Body = $body;
        return $mail->send();
    } catch (PHPMailerException $e) {
        error_log('Ошибка отправки письма админ-панели: ' . $e->getMessage());
        return false;
    }
}

// Отправляет и логирует в mail_log только если такого письма (кому + тип события +
// опционально карточка) ещё не было — раздел 8 ТЗ: "чтобы не задваивать".
function notify_once($to, $event_type, $subject, $body, $product_id = null) {
    $stmt = db()->prepare('SELECT id FROM mail_log WHERE to_email = ? AND event_type = ?
        AND (related_product_id <=> ?) LIMIT 1');
    $stmt->execute(array($to, $event_type, $product_id));
    if ($stmt->fetch()) {
        return;
    }
    send_mail($to, $subject, $body);
    db()->prepare('INSERT INTO mail_log (to_email, event_type, related_product_id) VALUES (?, ?, ?)')
        ->execute(array($to, $event_type, $product_id));
}

function active_users_by_role($role) {
    $stmt = db()->prepare("SELECT * FROM users WHERE role = ? AND status = 'active'");
    $stmt->execute(array($role));
    return $stmt->fetchAll();
}

function active_users_except_viewer() {
    return db()->query("SELECT * FROM users WHERE role != 'viewer' AND status = 'active'")->fetchAll();
}

function admin_product_link($product_id) {
    return rtrim(config('base_url'), '/') . '/product.php?id=' . $product_id;
}

// --- События раздела 8 ТЗ, привязанные к карточке товара ---

// Новая карточка ещё без фото (всегда так на момент создания — фото грузятся отдельно
// после сохранения) уведомляет фотографов; без названия/артикула/цены — бухгалтерию.
function notify_new_product($product) {
    $id = $product['id'];
    $name = $product['name'] !== '' ? $product['name'] : '(без названия)';
    $link = admin_product_link($id);
    $has_data = trim((string) $product['name']) !== ''
        && trim((string) $product['article']) !== ''
        && $product['price'] !== null;

    foreach (active_users_by_role('photo') as $u) {
        notify_once($u['email'], 'need_photo', 'Нужно фото: ' . $name,
            "Заведена карточка «{$name}», нужно фото.\n\n{$link}", $id);
    }
    if (!$has_data) {
        foreach (active_users_by_role('accounting') as $u) {
            notify_once($u['email'], 'need_price', 'Нужны данные: ' . $name,
                "Заведена карточка «{$name}», нужны название/артикул/цена.\n\n{$link}", $id);
        }
    }
}

function notify_ready_for_publish($product_id, $name) {
    $link = admin_product_link($product_id);
    $admin_email = config('admin_email');
    notify_once($admin_email, 'ready', 'Готово к публикации: ' . $name,
        "Карточка «{$name}» готова к публикации на сайте.\n\n{$link}", $product_id);
}

// Уже опубликованный товар — поменялись название/артикул/цена (например, Надя поправила
// через "Что на сайте"), фото на сайте уже есть, менять нужно только данные. Отдельное
// письмо, чтобы разработчик сразу видел разницу с "новый товар, публикуй с нуля".
//
// Не через notify_once: этот флаг может ставиться на одну карточку много раз за её жизнь
// (поставили -> разработчик перенёс на сайт и снял mark_site_updated -> Надя снова
// поправила данные), и каждый раз это должно быть новое письмо. Вызывающий код
// (update_product()) сам проверяет переход needs_site_update 0 -> 1, поэтому в рамках
// одного "эпизода" (пока флаг не снят) сюда и так не попадёт дважды.
function notify_needs_site_update($product_id, $name) {
    $link = admin_product_link($product_id);
    send_mail(config('admin_email'), 'Нужно обновить на сайте: ' . $name,
        "У уже опубликованного товара «{$name}» изменились название/артикул/цена — "
        . "это не новый товар, фото менять не нужно, только данные в карточке на сайте.\n\n{$link}");
}

function notify_published($product_id, $name, $author_id) {
    if (!$author_id) {
        return;
    }
    $stmt = db()->prepare("SELECT email FROM users WHERE id = ? AND status = 'active' LIMIT 1");
    $stmt->execute(array($author_id));
    $author = $stmt->fetch();
    if (!$author) {
        return;
    }
    $link = admin_product_link($product_id);
    notify_once($author['email'], 'published', 'Опубликовано: ' . $name,
        "Товар «{$name}» опубликован на сайте.\n\n{$link}", $product_id);
}

// Еженедельная сводка "висит N карточек без движения" (раздел 8 ТЗ) — по Cron, см.
// admin/tools/cron-weekly-digest.php. Не через notify_once: это не разовое событие по
// карточке, а периодический срез — присылать свежий список нужно каждую неделю заново,
// а не один раз за всё время.
function notify_weekly_digest() {
    $days = (int) config('stale_product_days');
    $stale = stale_products($days);
    if (!$stale) {
        return 0;
    }
    $lines = array();
    foreach ($stale as $p) {
        $name = $p['name'] !== '' ? $p['name'] : '(без названия)';
        $lines[] = '- ' . $name . ' [' . product_status($p)['label'] . '] — ' . admin_product_link($p['id']);
    }
    $subject = 'Еженедельная сводка: висит ' . count($stale) . ' карточек без движения';
    $body = 'Карточек без движения больше ' . $days . " дней: " . count($stale) . ".\n\n" . implode("\n", $lines);

    $sent = 0;
    foreach (active_users_except_viewer() as $u) {
        send_mail($u['email'], $subject, $body);
        $sent++;
    }
    return $sent;
}

// Предупреждение админу за неделю до автоудаления оригиналов (раздел 7 ТЗ, п.2) — одним
// письмом со списком всех карточек, которым скоро автоматически почистят оригиналы.
// Дедуп на mail_log вручную (а не notify_once), потому что нужно предупредить один раз
// на карточку, но собрать все ещё не предупреждённые карточки в одно письмо, а не слать
// отдельное письмо на каждую.
function notify_originals_cleanup_warning($products) {
    if (!$products) {
        return 0;
    }
    $to = config('admin_email');
    $stmt = db()->prepare('SELECT id FROM mail_log WHERE to_email = ? AND event_type = ?
        AND related_product_id <=> ? LIMIT 1');
    $unwarned = array();
    foreach ($products as $p) {
        $stmt->execute(array($to, 'originals_warning', $p['id']));
        if (!$stmt->fetch()) {
            $unwarned[] = $p;
        }
    }
    if (!$unwarned) {
        return 0;
    }

    $lines = array();
    foreach ($unwarned as $p) {
        $name = $p['name'] !== '' ? $p['name'] : '(без названия)';
        $lines[] = '- ' . $name . ' (опубликован ' . date('d.m.Y', strtotime($p['published_at'])) . ') — ' . admin_product_link($p['id']);
    }
    $body = 'Через неделю по расписанию будут удалены оригиналы фото (превью, карточка и история '
        . "останутся — удалятся только тяжёлые исходники) у " . count($unwarned) . " товаров:\n\n"
        . implode("\n", $lines);
    send_mail($to, 'Скоро удалятся оригиналы фото: ' . count($unwarned) . ' товаров', $body);

    $insert = db()->prepare('INSERT INTO mail_log (to_email, event_type, related_product_id) VALUES (?, ?, ?)');
    foreach ($unwarned as $p) {
        $insert->execute(array($to, 'originals_warning', $p['id']));
    }
    return count($unwarned);
}

// --- События раздела 8 ТЗ по пользователям (не привязаны к карточке) ---

function notify_new_registration($user_row) {
    $name = $user_row['first_name'] . ' ' . $user_row['last_name'];
    send_mail(config('admin_email'), 'Новая заявка на регистрацию',
        "Заявка от {$name} ({$user_row['email']}), роль: " . role_label($user_row['role']) . ".\n\n"
        . rtrim(config('base_url'), '/') . '/users.php');
}

function notify_registration_confirmed($user_row) {
    send_mail($user_row['email'], 'Доступ открыт — панель учёта продукции «Лазурь»',
        "Здравствуйте, {$user_row['first_name']}! Ваша заявка подтверждена, можно входить.\n\n"
        . rtrim(config('base_url'), '/') . '/login.php');
}

function notify_password_reset($user_row, $link, $ttl_minutes) {
    send_mail($user_row['email'], 'Восстановление пароля — панель учёта продукции «Лазурь»',
        "Здравствуйте, {$user_row['first_name']}! Чтобы задать новый пароль, перейдите по ссылке "
        . "(действует {$ttl_minutes} минут):\n\n{$link}\n\n"
        . "Если вы не запрашивали восстановление пароля — просто проигнорируйте это письмо.");
}
