<?php
// Все POST-действия раздела «Клиенты для писем» (взять, отпустить, статусы и т.д.).
require_once __DIR__ . '/../src/bootstrap.php';

$user = require_role(array('admin', 'manager'));

if ($_SERVER['REQUEST_METHOD'] !== 'POST') {
    redirect('leads.php');
}
csrf_check();

$action = isset($_POST['action']) ? (string) $_POST['action'] : '';
$lead_id = isset($_POST['lead_id']) ? (int) $_POST['lead_id'] : 0;
$back = 'lead.php?id=' . $lead_id;

// Безопасный возврат: только на страницы раздела.
if (!empty($_POST['return']) && preg_match('~^(leads|leads-stoplist|lead)\.php(\?[A-Za-z0-9_=&%.-]*)?$~', $_POST['return'])) {
    $back = $_POST['return'];
}

$admin_only = array('assign', 'admin_status', 'archive', 'restore', 'notify', 'stoplist_add', 'stoplist_remove');
if (in_array($action, $admin_only, true) && !is_admin_user($user)) {
    http_response_code(403);
    exit('Недостаточно прав');
}

// Менеджер работает только с видимыми ему записями.
if ($lead_id && !is_admin_user($user)) {
    $lead = lead_get($lead_id);
    if (!$lead || !lead_matches_user_visibility($lead, $user)) {
        flash('error', 'Этого клиента уже взяли или он вам недоступен.');
        redirect('leads.php');
    }
}

function lead_result_flash($result, $ok_text) {
    if ($result === true) {
        flash('success', $ok_text);
    } else {
        flash('error', $result);
    }
}

switch ($action) {
    case 'take':
        $r = lead_take($lead_id, $user);
        lead_result_flash($r, 'Клиент у вас в работе. Отправьте письмо до ' . date('d.m', strtotime(lead_due_datetime())) . ': иначе клиент вернётся в общий список.');
        if ($r !== true) {
            $back = 'leads.php';
        }
        break;
    case 'release':
        $r = lead_release($lead_id, $user);
        lead_result_flash($r, 'Клиент возвращён в общий список.');
        if ($r === true) {
            $back = 'leads.php';
        }
        break;
    case 'sent':
        lead_result_flash(lead_mark_sent($lead_id, $user), 'Отмечено: отправлено. Если ответа не будет 10 дней, статус сменится на «Без ответа».');
        break;
    case 'postpone':
        lead_result_flash(lead_postpone($lead_id, $user, isset($_POST['months']) ? (int) $_POST['months'] : 0, isset($_POST['date']) ? (string) $_POST['date'] : ''),
            'Готово. В назначенный день клиент появится на вкладке «Напомнить», придёт письмо.');
        break;
    case 'resent':
        lead_result_flash(lead_mark_resent($lead_id, $user), 'Отмечено: написали повторно. Если ответа не будет ' . LEAD_SILENT_DAYS . ' дней, статус снова станет «Без ответа».');
        break;
    case 'status':
        lead_result_flash(lead_set_status($lead_id, $user, (string) $_POST['status'],
            isset($_POST['refuse_reason']) ? (string) $_POST['refuse_reason'] : '',
            isset($_POST['refuse_note']) ? (string) $_POST['refuse_note'] : ''), 'Статус обновлён.');
        break;
    case 'block':
        $r = lead_block($lead_id, $user);
        lead_result_flash($r, 'Компания и её адреса в стоп-листе, больше писать им не будем.');
        if ($r === true) {
            $back = 'leads.php';
        }
        break;
    case 'letter_save':
        lead_result_flash(lead_save_letter($lead_id, $user, isset($_POST['subject']) ? (string) $_POST['subject'] : '', (string) $_POST['body']), 'Письмо сохранено: «Скопировать» и «Открыть письмо» теперь берут новый текст.');
        break;
    case 'letter_reset':
        lead_result_flash(lead_reset_letter($lead_id, $user), 'Возвращён исходный текст письма.');
        break;
    case 'note':
        lead_save_note($lead_id, $user, (string) $_POST['note']);
        flash('success', 'Заметка сохранена.');
        break;
    case 'assign':
        lead_result_flash(lead_assign($lead_id, $user, (int) $_POST['user_id']), 'Менеджер назначен.');
        break;
    case 'admin_status':
        lead_result_flash(lead_admin_set_status($lead_id, $user, (string) $_POST['status']), 'Статус изменён.');
        break;
    case 'archive':
        lead_archive($lead_id, $user, isset($_POST['reason']) ? (string) $_POST['reason'] : '');
        flash('success', 'Запись в архиве.');
        break;
    case 'restore':
        lead_restore($lead_id, $user);
        flash('success', 'Запись возвращена из архива.');
        break;
    case 'notify':
        list($sent, $total) = leads_notify_managers($user);
        flash($sent > 0 ? 'success' : 'info', $sent > 0
            ? 'Уведомление отправлено менеджерам: ' . $sent . '. Новых клиентов в рассылке: ' . $total . '.'
            : 'Некому отправлять или нет новых клиентов, о которых ещё не сообщали.');
        $back = 'leads.php';
        break;
    case 'stoplist_add':
        $domain = lead_normalize_domain((string) $_POST['domain']);
        $emails = lead_email_list((string) $_POST['email']);
        if ($domain === '' && !$emails) {
            flash('error', 'Укажите сайт или e-mail.');
        } else {
            lead_stoplist_add($domain, $emails, trim((string) $_POST['company']), trim((string) $_POST['reason']) ?: 'Просили не писать', $user['id']);
            flash('success', 'Добавлено в стоп-лист.');
        }
        $back = 'leads-stoplist.php';
        break;
    case 'stoplist_remove':
        db()->prepare('DELETE FROM lead_stoplist WHERE id = ?')->execute(array((int) $_POST['id']));
        flash('success', 'Удалено из стоп-листа.');
        $back = 'leads-stoplist.php';
        break;
    default:
        flash('error', 'Неизвестное действие.');
        $back = 'leads.php';
}

redirect($back);
