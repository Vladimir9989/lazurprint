<?php
// Раздел «Клиенты для писем» (docs/growth/leads-admin.md). PHP 7.3: без match, ??=,
// стрелочных функций и типизированных свойств.

define('LEAD_SILENT_DAYS', 10);
// Решение Татьяны Александровны 2026-10-20: срок на отправку после «Беру в работу» и лимит «в работе».
define('LEAD_TAKE_WORKDAYS', 2);
define('LEAD_MAX_TAKEN', 5);
// Решение Татьяны Александровны 2026-10-26: отказавший или молчащий клиент через 60 дней снова доступен другим менеджерам.
define('LEAD_RECYCLE_DAYS', 60);

// Причины отказа (менеджер выбирает обязательно). Код попадает в тип события: refuse_<код>.
define('LEAD_REFUSE_REASONS', array(
    'no_need' => 'Нет надобности',
    'price' => 'Дорого',
    'other_supplier' => 'Нашли другого',
    'terms' => 'Не устроили сроки',
    'communication' => 'Не сложилось общение',
    'other' => 'Другое',
));

define('LEAD_STATUS_LABELS', array(
    'new' => 'Новый',
    'taken' => 'Взят в работу',
    'sent' => 'Отправлено',
    'replied' => 'Ответили',
    'refused' => 'Отказ',
    'silent' => 'Без ответа',
    'sample_sent' => 'Образец отправлен',
    'order' => 'Заказ',
    'blocked' => 'Не писать',
    'postponed' => 'Напомнить позже',
));

// Статусы, которые менеджер ставит одной кнопкой после отправки письма.
define('LEAD_FOLLOWUP_STATUSES', array('sent', 'replied', 'refused', 'silent', 'sample_sent', 'order'));

// Из каких статусов клиента можно отложить («свяжемся позже»).
define('LEAD_POSTPONE_FROM', array('sent', 'replied', 'refused', 'silent', 'sample_sent'));

// Варианты срока «Напомнить позже» (месяцев).
define('LEAD_POSTPONE_MONTHS', array(1 => 'через месяц', 3 => 'через 3 месяца', 6 => 'через полгода'));

// Вкладки менеджера: код => [название, статусы].
define('LEAD_TABS', array(
    'new' => array('Новые', array('new')),
    'taken' => array('В работе', array('taken')),
    'sent' => array('Отправлено', array('sent', 'silent')),
    'dialog' => array('Диалог', array('replied', 'sample_sent')),
    'later' => array('Напомнить', array('postponed')),
    'closed' => array('Закрытые', array('order', 'refused', 'blocked')),
));

// Бесплатные почтовые домены: по ним нельзя определять «ту же компанию».
define('LEAD_FREE_MAIL', array(
    'mail.ru', 'bk.ru', 'list.ru', 'inbox.ru', 'internet.ru', 'yandex.ru', 'ya.ru', 'yandex.com',
    'gmail.com', 'googlemail.com', 'rambler.ru', 'hotmail.com', 'outlook.com', 'icloud.com',
    'me.com', 'yahoo.com', 'ukr.net', 'tut.by', 'live.ru',
));

// Способы открыть письмо. По умолчанию Mail.ru (почта у менеджеров на Mail.ru); «mailto» убран:
// он зависит от программы, назначенной в Windows, и у многих открывает пустую страницу.
define('MAIL_CLIENTS', array(
    'mailru' => 'Mail.ru (веб)',
    'yandex' => 'Яндекс.Почта (веб)',
    'mailto' => 'Почтовая программа / почта по умолчанию в браузере (mailto)',
    'copy' => 'Рабочая почта на lazurprint.ru (Kerio): только кнопки «Скопировать»',
));

function lead_mail_client($user_row) {
    $c = isset($user_row['mail_client']) ? $user_row['mail_client'] : '';
    $c = isset(MAIL_CLIENTS[$c]) ? $c : 'mailru';
    // Рабочая почта компании (Kerio, не Mail.ru): веб-ссылки Mail.ru/Яндекса ей не подходят.
    if ($c === 'mailru' && isset($user_row['email']) && preg_match('/@lazurprint\.ru$/i', $user_row['email'])) {
        return 'copy';
    }
    return $c;
}

function lead_status_label($status) {
    return isset(LEAD_STATUS_LABELS[$status]) ? LEAD_STATUS_LABELS[$status] : $status;
}

function user_full_name($row) {
    return trim($row['first_name'] . ' ' . $row['last_name']);
}

// ---------- вывод ----------

function lead_badge($status) {
    return '<span class="badge badge--lead-' . h($status) . '">' . h(lead_status_label($status)) . '</span>';
}

function short_text($text, $len = 110) {
    $text = trim(preg_replace('/\s+/u', ' ', (string) $text));
    return mb_strlen($text) > $len ? mb_substr($text, 0, $len - 1) . '…' : $text;
}

// ---------- нормализация ----------

function lead_normalize_domain($site, $email_hint = '') {
    $site = trim((string) $site);
    $host = '';
    if ($site !== '') {
        $url = preg_match('~^[a-z][a-z0-9+.-]*://~i', $site) ? $site : 'http://' . $site;
        $parsed = parse_url($url);
        if (!empty($parsed['host'])) {
            $host = $parsed['host'];
        }
    }
    if ($host === '' && $email_hint !== '') {
        $emails = lead_email_list($email_hint);
        if ($emails) {
            $parts = explode('@', $emails[0]);
            $candidate = end($parts);
            if (!in_array($candidate, LEAD_FREE_MAIL, true)) {
                $host = $candidate;
            }
        }
    }
    $host = mb_strtolower(trim($host, ". \t"));
    if (strpos($host, 'www.') === 0) {
        $host = substr($host, 4);
    }
    return $host;
}

// "a@x.ru, B@Y.ru; c" -> только похожие на адрес, в нижнем регистре, без повторов.
function lead_email_list($text) {
    $result = array();
    foreach (preg_split('/[\s,;]+/u', (string) $text) as $part) {
        $part = mb_strtolower(trim($part, " \t<>()"));
        if ($part !== '' && strpos($part, '@') !== false && !in_array($part, $result, true)) {
            $result[] = $part;
        }
    }
    return $result;
}

function lead_valid_emails($text) {
    foreach (lead_email_list($text) as $e) {
        if (!filter_var($e, FILTER_VALIDATE_EMAIL)) {
            return false;
        }
    }
    return true;
}

// Подставляет данные менеджера в метки {имя}, {фамилия}, {фио}, {должность}, {телефон}.
function lead_render_template($text, $user_row) {
    $map = array(
        'имя' => $user_row['first_name'],
        'фамилия' => $user_row['last_name'],
        'фио' => user_full_name($user_row),
        'должность' => isset($user_row['position']) ? $user_row['position'] : '',
        'телефон' => isset($user_row['phone']) ? $user_row['phone'] : '',
    );
    return preg_replace_callback('/\{([^{}]+)\}/u', function ($m) use ($map) {
        $key = mb_strtolower(trim($m[1]));
        return isset($map[$key]) ? $map[$key] : $m[0];
    }, (string) $text);
}

// Какие метки требуют заполненного профиля (должность/телефон).
function lead_missing_profile_fields($template, $user_row) {
    $missing = array();
    $text = mb_strtolower((string) $template);
    if (strpos($text, '{должность}') !== false && trim((string) $user_row['position']) === '') {
        $missing[] = 'должность';
    }
    if (strpos($text, '{телефон}') !== false && trim((string) $user_row['phone']) === '') {
        $missing[] = 'телефон';
    }
    return $missing;
}

function lead_compose_url($client, $to, $cc, $subject, $body) {
    $to = implode(',', lead_email_list($to));
    $cc = implode(',', lead_email_list($cc));
    $body = str_replace(array("\r\n", "\r"), "\n", (string) $body);
    if ($client === 'yandex' || $client === 'mailru') {
        $base = $client === 'yandex' ? 'https://mail.yandex.ru/compose?' : 'https://e.mail.ru/compose/?';
        $q = array('to' => $to);
        if ($cc !== '') {
            $q['cc'] = $cc;
        }
        $q['subject'] = $subject;
        $q['body'] = $body;
        return $base . http_build_query($q, '', '&', PHP_QUERY_RFC3986);
    }
    $q = array();
    if ($cc !== '') {
        $q[] = 'cc=' . rawurlencode($cc);
    }
    $q[] = 'subject=' . rawurlencode($subject);
    $q[] = 'body=' . rawurlencode(str_replace("\n", "\r\n", $body));
    return 'mailto:' . str_replace(array('%40', '%2C'), array('@', ','), rawurlencode($to)) . '?' . implode('&', $q);
}

// ---------- история ----------

function lead_log($lead_id, $user_id, $type, $message = '') {
    db()->prepare('INSERT INTO lead_events (lead_id, user_id, event_type, message) VALUES (?, ?, ?, ?)')
        ->execute(array($lead_id, $user_id, $type, $message));
}

function lead_events($lead_id) {
    $stmt = db()->prepare('SELECT e.*, CONCAT(u.first_name, " ", u.last_name) AS user_name
        FROM lead_events e LEFT JOIN users u ON u.id = e.user_id
        WHERE e.lead_id = ? ORDER BY e.id DESC LIMIT 100');
    $stmt->execute(array($lead_id));
    return $stmt->fetchAll();
}

// ---------- выборки ----------

function lead_get($id) {
    $stmt = db()->prepare('SELECT l.*, CONCAT(o.first_name, " ", o.last_name) AS owner_name,
        CONCAT(p.first_name, " ", p.last_name) AS pinned_name
        FROM leads l LEFT JOIN users o ON o.id = l.owner_id LEFT JOIN users p ON p.id = l.pinned_user_id
        WHERE l.id = ? LIMIT 1');
    $stmt->execute(array($id));
    return $stmt->fetch();
}

// Письмо готово к раздаче менеджерам: есть адресат/инструкция и текст.
function lead_is_ready($lead) {
    if (trim((string) $lead['body']) === '' && trim((string) $lead['body_final']) === '') {
        return false;
    }
    if ($lead['channel'] === 'form') {
        return trim((string) $lead['instructions']) !== '';
    }
    return count(lead_email_list($lead['email_to'])) > 0 && trim((string) $lead['subject']) !== '';
}

// Клиент вернулся в общий список через 60 дней: прежний менеджер его больше не получает.
function lead_was_recycled_from($lead_id, $user_id) {
    $stmt = db()->prepare("SELECT 1 FROM lead_events WHERE lead_id = ? AND event_type = 'recycled' AND user_id = ? LIMIT 1");
    $stmt->execute(array($lead_id, $user_id));
    return (bool) $stmt->fetch();
}

function lead_matches_user_visibility($lead, $user) {
    if (is_admin_user($user) || $user['role'] === 'viewer') {
        return true;
    }
    if ((int) $lead['owner_id'] === (int) $user['id']) {
        return true;
    }
    return $lead['status'] === 'new' && !$lead['is_archived'] && lead_is_ready($lead)
        && !lead_was_recycled_from($lead['id'], $user['id'])
        && (((int) $lead['pinned_user_id'] === (int) $user['id'])
            || ($lead['pinned_user_id'] === null && trim((string) $lead['manager_name']) === ''));
}

// Список для менеджера по вкладке. 'new' — общий список + закреплённые за ним.
function leads_for_manager($user, $tab) {
    $statuses = LEAD_TABS[$tab][1];
    $in = implode(',', array_fill(0, count($statuses), '?'));
    if ($tab === 'new') {
        $sql = "SELECT l.* FROM leads l WHERE l.status = 'new' AND l.is_archived = 0
            AND l.owner_id IS NULL
            AND ((l.pinned_user_id IS NULL AND l.manager_name = '') OR l.pinned_user_id = ?)
            AND NOT EXISTS (SELECT 1 FROM lead_events e WHERE e.lead_id = l.id AND e.event_type = 'recycled' AND e.user_id = ?)
            ORDER BY (l.pinned_user_id IS NULL), l.created_at DESC, l.id DESC";
        $stmt = db()->prepare($sql);
        $stmt->execute(array($user['id'], $user['id']));
        return array_values(array_filter($stmt->fetchAll(), 'lead_is_ready'));
    }
    $order = $tab === 'later' ? 'l.remind_at IS NULL, l.remind_at ASC, l.id DESC'
        : ($tab === 'taken' ? 'l.due_at IS NULL, l.due_at ASC, l.id DESC' : 'COALESCE(l.sent_at, l.taken_at, l.created_at) DESC, l.id DESC');
    $sql = "SELECT l.* FROM leads l WHERE l.owner_id = ? AND l.status IN ($in) AND l.is_archived = 0
        ORDER BY $order";
    $stmt = db()->prepare($sql);
    $stmt->execute(array_merge(array($user['id']), $statuses));
    return $stmt->fetchAll();
}

function leads_tab_counts($user) {
    $counts = array();
    foreach (array_keys(LEAD_TABS) as $tab) {
        $counts[$tab] = count(leads_for_manager($user, $tab));
    }
    return $counts;
}

function leads_for_admin($f) {
    $where = array('1=1');
    $args = array();
    if (empty($f['archived'])) {
        $where[] = 'l.is_archived = 0';
    }
    if (!empty($f['status'])) {
        $where[] = 'l.status = ?';
        $args[] = $f['status'];
    }
    if (!empty($f['segment'])) {
        $where[] = 'l.segment = ?';
        $args[] = $f['segment'];
    }
    if (!empty($f['manager'])) {
        $where[] = '(l.owner_id = ? OR l.pinned_user_id = ?)';
        $args[] = (int) $f['manager'];
        $args[] = (int) $f['manager'];
    }
    if (!empty($f['q'])) {
        $where[] = '(l.company LIKE ? OR l.domain LIKE ? OR l.email_to LIKE ? OR l.manager_name LIKE ?)';
        $like = '%' . $f['q'] . '%';
        array_push($args, $like, $like, $like, $like);
    }
    $sql = 'SELECT l.*, CONCAT(o.first_name, " ", o.last_name) AS owner_name,
        CONCAT(p.first_name, " ", p.last_name) AS pinned_name
        FROM leads l LEFT JOIN users o ON o.id = l.owner_id LEFT JOIN users p ON p.id = l.pinned_user_id
        WHERE ' . implode(' AND ', $where) . ' ORDER BY l.created_at DESC, l.id DESC LIMIT 500';
    $stmt = db()->prepare($sql);
    $stmt->execute($args);
    return $stmt->fetchAll();
}

function leads_status_totals() {
    $out = array();
    foreach (db()->query('SELECT status, COUNT(*) c FROM leads WHERE is_archived = 0 GROUP BY status')->fetchAll() as $r) {
        $out[$r['status']] = (int) $r['c'];
    }
    return $out;
}

function leads_segments() {
    $out = array();
    foreach (db()->query("SELECT DISTINCT segment FROM leads WHERE segment != '' ORDER BY segment")->fetchAll() as $r) {
        $out[] = $r['segment'];
    }
    return $out;
}

function managers_list($include_admins = true) {
    $roles = $include_admins ? "('manager','admin')" : "('manager')";
    return db()->query("SELECT * FROM users WHERE role IN $roles AND status = 'active'
        ORDER BY last_name, first_name")->fetchAll();
}

// ---------- стоп-лист и дубли ----------

function lead_stoplist_hit($domain, $emails) {
    if ($domain !== '') {
        $stmt = db()->prepare("SELECT * FROM lead_stoplist WHERE domain = ? LIMIT 1");
        $stmt->execute(array($domain));
        if ($row = $stmt->fetch()) {
            return $row;
        }
    }
    foreach ($emails as $e) {
        $stmt = db()->prepare("SELECT * FROM lead_stoplist WHERE email = ? LIMIT 1");
        $stmt->execute(array($e));
        if ($row = $stmt->fetch()) {
            return $row;
        }
    }
    return null;
}

// Похожие записи по домену или e-mail (включая архив). Для админа.
function lead_find_duplicates($domain, $emails, $exclude_id = 0) {
    $where = array();
    $args = array();
    if ($domain !== '') {
        $where[] = 'l.domain = ?';
        $args[] = $domain;
    }
    foreach ($emails as $e) {
        $where[] = 'LOWER(l.email_to) LIKE ?';
        $args[] = '%' . $e . '%';
        $where[] = 'LOWER(l.email_cc) LIKE ?';
        $args[] = '%' . $e . '%';
    }
    if (!$where) {
        return array();
    }
    $sql = 'SELECT l.*, CONCAT(o.first_name, " ", o.last_name) AS owner_name FROM leads l
        LEFT JOIN users o ON o.id = l.owner_id WHERE (' . implode(' OR ', $where) . ') AND l.id != ? LIMIT 5';
    $args[] = (int) $exclude_id;
    $stmt = db()->prepare($sql);
    $stmt->execute($args);
    return $stmt->fetchAll();
}

function lead_duplicate_text($d) {
    $who = $d['owner_name'] ? $d['owner_name'] : ($d['manager_name'] !== '' ? $d['manager_name'] : '');
    $date = $d['sent_at'] ? $d['sent_at'] : $d['created_at'];
    $text = 'Уже есть: «' . $d['company'] . '»';
    if ($who !== '') {
        $first = explode(' ', $who);
        $text .= ', ведёт ' . $first[0];
    }
    $text .= ', ' . date('d.m', strtotime($date)) . ', статус: ' . mb_strtolower(lead_status_label($d['status']));
    if ($d['is_archived']) {
        $text .= ' (в архиве)';
    }
    return $text;
}

// Письмо целиком: обращение отдельной строкой + текст. Если текст уже начинается с обращения — не дублируем.
function lead_compose_body($greeting, $body) {
    $greeting = trim((string) $greeting);
    $body = (string) $body;
    if ($greeting === '' || mb_strpos(ltrim($body), $greeting) === 0) {
        return $body;
    }
    return $greeting . "

" . $body;
}

// ---------- создание и правка ----------

function lead_clean_data($in) {
    $fields = array('company', 'site', 'segment', 'channel', 'email_to', 'email_cc', 'greeting', 'subject',
        'body', 'instructions', 'samples_hint', 'hook', 'source', 'note', 'batch', 'manager_name');
    $d = array();
    foreach ($fields as $f) {
        $d[$f] = isset($in[$f]) ? trim((string) $in[$f]) : '';
    }
    $d['channel'] = $d['channel'] === 'form' ? 'form' : 'email';
    $d['body'] = str_replace("\r\n", "\n", $d['body']);
    $d['instructions'] = str_replace("\r\n", "\n", $d['instructions']);
    $d['email_to'] = implode(', ', lead_email_list($d['email_to']));
    $d['email_cc'] = implode(', ', lead_email_list($d['email_cc']));
    $d['domain'] = lead_normalize_domain($d['site'], $d['email_to']);
    return $d;
}

// Проверка; возвращает строку-ошибку или null.
function lead_validate($d) {
    if ($d['company'] === '') {
        return 'Укажите название компании.';
    }
    if (!lead_valid_emails($d['email_to']) || !lead_valid_emails($d['email_cc'])) {
        return 'Некорректный e-mail (проверьте поля «Кому» и «Копия»).';
    }
    return null;
}

// $opts: force (создать несмотря на дубль), status, sent_at, actor_id.
// Возвращает array('id' => int) либо array('error' => text, 'dups' => [...]).
function lead_create($in, $opts = array()) {
    $d = lead_clean_data($in);
    $err = lead_validate($d);
    if ($err) {
        return array('error' => $err);
    }
    $emails = array_merge(lead_email_list($d['email_to']), lead_email_list($d['email_cc']));

    $stop = lead_stoplist_hit($d['domain'], $emails);
    if ($stop) {
        return array('error' => 'В стоп-листе («просили не писать»): ' . ($stop['company'] !== '' ? $stop['company'] : ($stop['domain'] . $stop['email'])) . '. Добавить нельзя.');
    }
    if (empty($opts['force'])) {
        $dups = lead_find_duplicates($d['domain'], $emails);
        if ($dups) {
            return array('error' => lead_duplicate_text($dups[0]), 'dups' => $dups);
        }
    }

    $status = isset($opts['status']) && isset(LEAD_STATUS_LABELS[$opts['status']]) ? $opts['status'] : 'new';
    $sent_at = isset($opts['sent_at']) ? $opts['sent_at'] : null;
    if ($status !== 'new' && $status !== 'taken' && !$sent_at) {
        $sent_at = date('Y-m-d H:i:s');
    }
    $body_final = ($status !== 'new') ? lead_compose_body($d['greeting'], $d['body']) : null;
    $subject_final = ($status !== 'new') ? $d['subject'] : null;
    $actor = isset($opts['actor_id']) ? $opts['actor_id'] : null;

    db()->prepare('INSERT INTO leads (company, site, domain, segment, channel, email_to, email_cc, greeting,
        subject, body, subject_final, body_final, instructions, samples_hint, hook, source, note, batch,
        manager_name, status, sent_at, status_changed_at, created_by)
        VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, NOW(), ?)')
        ->execute(array($d['company'], $d['site'], $d['domain'], $d['segment'], $d['channel'], $d['email_to'],
            $d['email_cc'], $d['greeting'], $d['subject'], $d['body'], $subject_final, $body_final,
            $d['instructions'], $d['samples_hint'], $d['hook'], $d['source'], $d['note'], $d['batch'],
            $d['manager_name'], $status, $sent_at, $actor));
    $id = (int) db()->lastInsertId();
    lead_log($id, $actor, 'created', 'Добавлен' . ($status !== 'new' ? ' со статусом «' . lead_status_label($status) . '»' : ''));
    leads_resolve_names();
    return array('id' => $id);
}

function lead_update($id, $in, $actor_id) {
    $lead = lead_get($id);
    if (!$lead) {
        return 'Запись не найдена.';
    }
    $d = lead_clean_data($in);
    $err = lead_validate($d);
    if ($err) {
        return $err;
    }
    // Шаблон письма правится только у ещё не взятых; у взятых «живой» текст — body_final.
    $final_sql = '';
    $args = array($d['company'], $d['site'], $d['domain'], $d['segment'], $d['channel'], $d['email_to'],
        $d['email_cc'], $d['greeting'], $d['subject'], $d['body'], $d['instructions'], $d['samples_hint'],
        $d['hook'], $d['source'], $d['note'], $d['batch']);
    if ($lead['status'] !== 'new' && isset($in['body_final'])) {
        $final_sql = ', body_final = ?, subject_final = ?';
        $args[] = str_replace("\r\n", "\n", trim((string) $in['body_final']));
        $args[] = trim((string) (isset($in['subject_final']) ? $in['subject_final'] : $lead['subject_final']));
    }
    $args[] = $id;
    db()->prepare('UPDATE leads SET company = ?, site = ?, domain = ?, segment = ?, channel = ?, email_to = ?,
        email_cc = ?, greeting = ?, subject = ?, body = ?, instructions = ?, samples_hint = ?, hook = ?,
        source = ?, note = ?, batch = ?' . $final_sql . ' WHERE id = ?')->execute($args);
    lead_log($id, $actor_id, 'edited', 'Запись изменена');
    return true;
}

// Сопоставляет «ведёт / закреплён» (ФИО текстом) с зарегистрированными менеджерами.
function leads_resolve_names() {
    $match = "u.role IN ('manager','admin') AND u.status = 'active'
        AND (LOWER(CONCAT(u.first_name, ' ', u.last_name)) = LOWER(TRIM(l.manager_name))
          OR LOWER(CONCAT(u.last_name, ' ', u.first_name)) = LOWER(TRIM(l.manager_name)))";
    db()->exec("UPDATE leads l JOIN users u ON $match SET l.owner_id = u.id
        WHERE l.manager_name != '' AND l.owner_id IS NULL AND l.status NOT IN ('new')");
    db()->exec("UPDATE leads l JOIN users u ON $match SET l.pinned_user_id = u.id
        WHERE l.manager_name != '' AND l.pinned_user_id IS NULL AND l.owner_id IS NULL AND l.status = 'new'");
}

// ---------- действия менеджера ----------

// Атомарно: «взять, если ещё свободна». Возвращает true либо текст ошибки.
function lead_take($lead_id, $user) {
    $fresh = db()->prepare('SELECT * FROM users WHERE id = ? LIMIT 1');
    $fresh->execute(array($user['id']));
    $u = $fresh->fetch();

    $lead = lead_get($lead_id);
    if (!$lead || $lead['is_archived'] || $lead['status'] !== 'new') {
        return 'Этого клиента уже взяли или он недоступен.';
    }
    if (lead_was_recycled_from($lead_id, $u['id'])) {
        return 'Этот клиент раньше был у вас и вернулся в общий список: его должен взять другой менеджер.';
    }
    if (lead_taken_count($u['id']) >= LEAD_MAX_TAKEN) {
        return 'У вас уже ' . LEAD_MAX_TAKEN . ' клиентов в работе. Сначала отправьте письма или верните лишних клиентов в общий список.';
    }
    $subject_final = lead_render_template($lead['subject'], $u);
    $body_final = lead_render_template(lead_compose_body($lead['greeting'], $lead['body']), $u);
    $instructions = lead_render_template($lead['instructions'], $u);

    $stmt = db()->prepare("UPDATE leads SET owner_id = ?, status = 'taken', taken_at = NOW(), status_changed_at = NOW(), due_at = ?, due_warned_at = NULL,
        manager_name = ?, subject_final = ?, body_final = ?, instructions = ?
        WHERE id = ? AND status = 'new' AND owner_id IS NULL AND is_archived = 0
        AND ((pinned_user_id IS NULL AND manager_name = '') OR pinned_user_id = ?)");
    $stmt->execute(array($u['id'], lead_due_datetime(), user_full_name($u), $subject_final, $body_final, $instructions, $lead_id, $u['id']));
    if ($stmt->rowCount() !== 1) {
        return 'Этого клиента уже взяли или он закреплён за другим менеджером.';
    }
    lead_log($lead_id, $u['id'], 'taken', 'Взят в работу: ' . user_full_name($u) . '. Отправить до ' . date('d.m', strtotime(lead_due_datetime())));
    return true;
}

function lead_release($lead_id, $user) {
    $stmt = db()->prepare("UPDATE leads SET owner_id = NULL, status = 'new', taken_at = NULL, due_at = NULL, due_warned_at = NULL, status_changed_at = NOW(),
        manager_name = COALESCE((SELECT CONCAT(pu.first_name, ' ', pu.last_name) FROM users pu WHERE pu.id = pinned_user_id), ''),
        subject_final = NULL, body_final = NULL
        WHERE id = ? AND status = 'taken' AND (owner_id = ? OR ?)");
    $stmt->execute(array($lead_id, $user['id'], is_admin_user($user) ? 1 : 0));
    if ($stmt->rowCount() !== 1) {
        return 'Отпустить можно только клиента «в работе», которому письмо ещё не отправлено.';
    }
    lead_log($lead_id, $user['id'], 'released', 'Возвращён в общий список');
    return true;
}

function lead_mark_sent($lead_id, $user) {
    $stmt = db()->prepare("UPDATE leads SET status = 'sent', sent_at = NOW(), status_changed_at = NOW(), due_at = NULL, due_warned_at = NULL
        WHERE id = ? AND status = 'taken' AND (owner_id = ? OR ?)");
    $stmt->execute(array($lead_id, $user['id'], is_admin_user($user) ? 1 : 0));
    if ($stmt->rowCount() !== 1) {
        return 'Не удалось отметить: письмо уже отправлено или запись не ваша.';
    }
    lead_log($lead_id, $user['id'], 'sent', 'Отмечено «отправлено»');
    return true;
}

function lead_set_status($lead_id, $user, $status, $reason = '', $reason_note = '') {
    if (!in_array($status, LEAD_FOLLOWUP_STATUSES, true)) {
        return 'Неизвестный статус.';
    }
    $reason_note = trim(mb_substr((string) $reason_note, 0, 250));
    if ($status === 'refused') {
        if (!isset(LEAD_REFUSE_REASONS[$reason])) {
            return 'Для отказа выберите причину.';
        }
        if ($reason === 'other' && $reason_note === '') {
            return 'Для причины «Другое» напишите пару слов в комментарии.';
        }
    }
    $in = implode(',', array_fill(0, count(LEAD_FOLLOWUP_STATUSES), '?'));
    $args = array_merge(array($status, $lead_id, $user['id'], is_admin_user($user) ? 1 : 0), LEAD_FOLLOWUP_STATUSES);
    $stmt = db()->prepare("UPDATE leads SET status = ?, status_changed_at = NOW()
        WHERE id = ? AND (owner_id = ? OR ?) AND status IN ($in) AND is_archived = 0");
    $stmt->execute($args);
    if ($stmt->rowCount() !== 1) {
        return 'Статус не изменён (запись не ваша или письмо ещё не отправлено).';
    }
    lead_log($lead_id, $user['id'], 'status', 'Статус: ' . lead_status_label($status));
    if ($status === 'refused') {
        // Событие пишем от имени владельца клиента (для отчёта по менеджерам), даже если отказ отметил админ.
        $lead = lead_get($lead_id);
        $who = $lead && $lead['owner_id'] ? (int) $lead['owner_id'] : (int) $user['id'];
        lead_log($lead_id, $who, 'refuse_' . $reason, 'Причина отказа: ' . LEAD_REFUSE_REASONS[$reason] . ($reason_note !== '' ? ' — ' . $reason_note : ''));
    }
    return true;
}

// Последняя причина отказа по клиенту: array(код, текст) или null.
function lead_last_refuse_reason($lead_id) {
    $types = array();
    foreach (array_keys(LEAD_REFUSE_REASONS) as $code) {
        $types[] = 'refuse_' . $code;
    }
    $in = implode(',', array_fill(0, count($types), '?'));
    $stmt = db()->prepare("SELECT event_type, message FROM lead_events WHERE lead_id = ? AND event_type IN ($in) ORDER BY id DESC LIMIT 1");
    $stmt->execute(array_merge(array($lead_id), $types));
    $r = $stmt->fetch();
    return $r ? array(substr($r['event_type'], 7), preg_replace('/^Причина отказа:\s*/u', '', $r['message'])) : null;
}

// «Раньше с этим клиентом работали»: записи о возврате в общий список (кто вёл и чем закончилось).
function lead_recycle_history($lead_id) {
    $stmt = db()->prepare("SELECT created_at, message FROM lead_events WHERE lead_id = ? AND event_type = 'recycled' ORDER BY id DESC");
    $stmt->execute(array($lead_id));
    return $stmt->fetchAll();
}

// Отказ или молчание дольше LEAD_RECYCLE_DAYS: клиент возвращается в общий список и доступен другим менеджерам
// (прежний его больше не получит). Что было — остаётся в истории и видно в карточке. Возвращает число клиентов.
function leads_auto_recycle() {
    $days = (int) LEAD_RECYCLE_DAYS;
    $rows = db()->query("SELECT l.id, l.owner_id, l.status, l.sent_at, l.status_changed_at, CONCAT(u.first_name, ' ', u.last_name) AS owner_name
        FROM leads l LEFT JOIN users u ON u.id = l.owner_id
        WHERE l.is_archived = 0 AND l.owner_id IS NOT NULL AND (
            (l.status = 'refused' AND l.status_changed_at < (NOW() - INTERVAL $days DAY))
            OR (l.status = 'silent' AND COALESCE(l.sent_at, l.status_changed_at) < (NOW() - INTERVAL $days DAY)))")->fetchAll();
    $n = 0;
    foreach ($rows as $r) {
        $reason = $r['status'] === 'refused' ? lead_last_refuse_reason($r['id']) : null;
        $upd = db()->prepare("UPDATE leads SET owner_id = NULL, status = 'new', taken_at = NULL, sent_at = NULL, due_at = NULL, due_warned_at = NULL,
            remind_at = NULL, remind_mailed_at = NULL, nudged_at = NULL, notified_at = NULL, pinned_user_id = NULL, manager_name = '',
            subject_final = NULL, body_final = NULL, status_changed_at = NOW()
            WHERE id = ? AND owner_id = ? AND status = ? AND is_archived = 0");
        $upd->execute(array($r['id'], $r['owner_id'], $r['status']));
        if ($upd->rowCount() !== 1) {
            continue;
        }
        if ($r['status'] === 'refused') {
            $result = 'отказ' . ($reason ? ' (' . $reason[1] . ')' : '') . ' ' . date('d.m.Y', strtotime($r['status_changed_at']));
        } else {
            $result = 'ответа на письмо от ' . date('d.m.Y', strtotime($r['sent_at'] ? $r['sent_at'] : $r['status_changed_at'])) . ' не было';
        }
        lead_log($r['id'], $r['owner_id'], 'recycled', 'Вернулся в общий список через ' . $days . ' дней. Раньше вёл: ' . trim($r['owner_name']) . '. Итог: ' . $result . '.');
        $n++;
    }
    return $n;
}

// «Просили не писать»: домен и адреса уходят в стоп-лист навсегда, запись — в архив.
function lead_block($lead_id, $user, $reason = '') {
    $lead = lead_get($lead_id);
    if (!$lead || (!is_admin_user($user) && (int) $lead['owner_id'] !== (int) $user['id'])) {
        return 'Нет доступа к записи.';
    }
    lead_stoplist_add($lead['domain'], array_merge(lead_email_list($lead['email_to']), lead_email_list($lead['email_cc'])),
        $lead['company'], $reason !== '' ? $reason : 'Просили не писать', $user['id']);
    db()->prepare("UPDATE leads SET status = 'blocked', is_archived = 1, archive_reason = 'Просили не писать',
        status_changed_at = NOW() WHERE id = ?")->execute(array($lead_id));
    lead_log($lead_id, $user['id'], 'blocked', 'Просили не писать — в стоп-листе');
    return true;
}

function lead_stoplist_add($domain, $emails, $company, $reason, $user_id) {
    $ins = db()->prepare('INSERT INTO lead_stoplist (domain, email, company, reason, added_by) VALUES (?, ?, ?, ?, ?)');
    if ($domain !== '') {
        $exists = db()->prepare('SELECT id FROM lead_stoplist WHERE domain = ? LIMIT 1');
        $exists->execute(array($domain));
        if (!$exists->fetch()) {
            $ins->execute(array($domain, '', $company, $reason, $user_id));
        }
    }
    foreach ($emails as $e) {
        $exists = db()->prepare('SELECT id FROM lead_stoplist WHERE email = ? LIMIT 1');
        $exists->execute(array($e));
        if (!$exists->fetch()) {
            $ins->execute(array('', $e, $company, $reason, $user_id));
        }
    }
}

function lead_save_note($lead_id, $user, $note) {
    $stmt = db()->prepare('UPDATE leads SET note = ? WHERE id = ? AND (owner_id = ? OR ?)');
    $stmt->execute(array(trim($note), $lead_id, $user['id'], is_admin_user($user) ? 1 : 0));
    lead_log($lead_id, $user['id'], 'note', 'Заметка обновлена');
}

// Менеджер (или админ) правит свою копию письма: тему и текст. Шаблон клиента не меняется.
function lead_save_letter($lead_id, $user, $subject, $body) {
    $body = trim(str_replace("
", "
", (string) $body));
    if ($body === '') {
        return 'Текст письма не может быть пустым.';
    }
    $stmt = db()->prepare("UPDATE leads SET subject_final = ?, body_final = ? WHERE id = ? AND status <> 'new' AND (owner_id = ? OR ?)");
    $stmt->execute(array(trim((string) $subject), $body, $lead_id, $user['id'], is_admin_user($user) ? 1 : 0));
    if (!$stmt->rowCount()) {
        return 'Письмо не изменено (или изменений нет).';
    }
    lead_log($lead_id, $user['id'], 'letter_edit', 'Письмо отредактировано');
    return true;
}

// Возвращает исходный текст письма (с подстановкой имени менеджера, который ведёт клиента).
function lead_reset_letter($lead_id, $user) {
    $lead = lead_get($lead_id);
    if (!$lead || $lead['status'] === 'new' || (!is_admin_user($user) && (int) $lead['owner_id'] !== (int) $user['id'])) {
        return 'Нельзя вернуть исходный текст.';
    }
    $stmt = db()->prepare('SELECT * FROM users WHERE id = ? LIMIT 1');
    $stmt->execute(array($lead['owner_id'] ? $lead['owner_id'] : $user['id']));
    $u = $stmt->fetch();
    db()->prepare('UPDATE leads SET subject_final = ?, body_final = ? WHERE id = ?')
        ->execute(array(lead_render_template($lead['subject'], $u),
            lead_render_template(lead_compose_body($lead['greeting'], $lead['body']), $u), $lead_id));
    lead_log($lead_id, $user['id'], 'letter_edit', 'Возвращён исходный текст письма');
    return true;
}

// ---------- действия админа ----------

function lead_archive($lead_id, $user, $reason) {
    db()->prepare('UPDATE leads SET is_archived = 1, archive_reason = ? WHERE id = ?')
        ->execute(array(trim($reason), $lead_id));
    lead_log($lead_id, $user['id'], 'archived', 'В архив' . (trim($reason) !== '' ? ': ' . trim($reason) : ''));
}

function lead_restore($lead_id, $user) {
    db()->prepare("UPDATE leads SET is_archived = 0, archive_reason = '' WHERE id = ? AND status != 'blocked'")
        ->execute(array($lead_id));
    lead_log($lead_id, $user['id'], 'restored', 'Возвращён из архива');
}

// Назначить или переназначить менеджера. user_id = 0 — снять.
function lead_assign($lead_id, $admin, $user_id) {
    $lead = lead_get($lead_id);
    if (!$lead) {
        return 'Запись не найдена.';
    }
    $name = '';
    if ($user_id) {
        $stmt = db()->prepare("SELECT * FROM users WHERE id = ? AND status = 'active' LIMIT 1");
        $stmt->execute(array($user_id));
        $u = $stmt->fetch();
        if (!$u) {
            return 'Менеджер не найден.';
        }
        $name = user_full_name($u);
    }
    if ($lead['status'] === 'new') {
        db()->prepare('UPDATE leads SET pinned_user_id = ?, owner_id = NULL, manager_name = ? WHERE id = ?')
            ->execute(array($user_id ? $user_id : null, $name, $lead_id));
    } else {
        db()->prepare('UPDATE leads SET owner_id = ?, pinned_user_id = NULL, manager_name = ? WHERE id = ?')
            ->execute(array($user_id ? $user_id : null, $name, $lead_id));
    }
    lead_log($lead_id, $admin['id'], 'assigned', $name !== '' ? 'Назначен: ' . $name : 'Менеджер снят');
    return true;
}

// Админ может поставить любой статус (для исправлений). Возвращает true.
function lead_admin_set_status($lead_id, $admin, $status) {
    if (!isset(LEAD_STATUS_LABELS[$status])) {
        return 'Неизвестный статус.';
    }
    $lead = lead_get($lead_id);
    if (!$lead) {
        return 'Запись не найдена.';
    }
    $sets = 'status = ?, status_changed_at = NOW()';
    if ($status === 'taken') {
        $sets .= ", due_at = '" . lead_due_datetime() . "', due_warned_at = NULL";
    } elseif ($status !== 'new') {
        $sets .= ', due_at = NULL, due_warned_at = NULL';
    }
    if ($status === 'postponed') {
        $sets .= ", remind_at = '" . date('Y-m-d', strtotime('+1 month')) . "', remind_mailed_at = NULL";
    }
    if ($status === 'new') {
        // Возврат в «новые»: клиент снова свободен (как «Отпустить»), у него не остаётся прежнего менеджера.
        $sets .= ", owner_id = NULL, taken_at = NULL, sent_at = NULL, due_at = NULL, due_warned_at = NULL, subject_final = NULL, body_final = NULL,
            manager_name = COALESCE((SELECT CONCAT(pu.first_name, ' ', pu.last_name) FROM users pu WHERE pu.id = pinned_user_id), '')";
    }
    $sent_old = $lead['sent_at'] && strtotime($lead['sent_at']) < strtotime('-' . (int) LEAD_SILENT_DAYS . ' day');
    if (in_array($status, array('sent', 'replied', 'refused', 'silent', 'sample_sent', 'order'), true) && !$lead['sent_at']) {
        $sets .= ', sent_at = NOW()';
    } elseif ($status === 'sent' && $sent_old) {
        // Письмо старше LEAD_SILENT_DAYS: иначе leads_auto_silent() тут же вернул бы «Без ответа», и статус «не применялся».
        // Отсчёт «без ответа» идёт заново, как после «Написал(а) повторно».
        $sets .= ', sent_at = NOW(), nudged_at = NULL';
    }
    if ($status !== 'new' && $lead['body_final'] === null) {
        $sets .= ', body_final = ' . db()->quote(lead_compose_body($lead['greeting'], $lead['body'])) . ', subject_final = subject';
    }
    db()->prepare("UPDATE leads SET $sets WHERE id = ?")->execute(array($status, $lead_id));
    lead_log($lead_id, $admin['id'], 'status', 'Админ: статус «' . lead_status_label($status) . '»');
    leads_resolve_names();
    return true;
}

// ---------- срок на отправку, лимит, «напомнить позже» ----------

function lead_is_workday($ts) {
    return (int) date('N', $ts) < 6;
}

// Конец (23:59:59) $n-го рабочего дня после $from_ts. Праздники не учитываются, только суббота и воскресенье.
function lead_add_workdays($from_ts, $n) {
    $ts = $from_ts;
    while ($n > 0) {
        $ts = strtotime('+1 day', $ts);
        if (lead_is_workday($ts)) {
            $n--;
        }
    }
    return strtotime(date('Y-m-d', $ts) . ' 23:59:59');
}

// Предыдущий рабочий день (дата 00:00) перед датой $ts.
function lead_prev_workday($ts) {
    do {
        $ts = strtotime('-1 day', $ts);
    } while (!lead_is_workday($ts));
    return strtotime(date('Y-m-d', $ts));
}

function lead_due_datetime($from_ts = null) {
    return date('Y-m-d H:i:s', lead_add_workdays($from_ts === null ? time() : $from_ts, LEAD_TAKE_WORKDAYS));
}

function lead_taken_count($user_id) {
    $stmt = db()->prepare("SELECT COUNT(*) c FROM leads WHERE owner_id = ? AND status = 'taken' AND is_archived = 0");
    $stmt->execute(array($user_id));
    return (int) $stmt->fetch()['c'];
}

// Подпись срока для списка/карточки: array(текст, 'ok'|'soon'|'late') или null.
function lead_due_info($lead) {
    if ($lead['status'] !== 'taken' || empty($lead['due_at'])) {
        return null;
    }
    $due = strtotime($lead['due_at']);
    $text = 'отправить до ' . date('d.m', $due);
    if ($due < time()) {
        return array($text . ' (срок вышел)', 'late');
    }
    $days = (int) floor(($due - time()) / 86400);
    return array($text, $days < 1 ? 'soon' : 'ok');
}

// Отложить клиента. Срок: $months (1/3/6) или конкретная дата Y-m-d. Возвращает true либо текст ошибки.
function lead_postpone($lead_id, $user, $months, $date) {
    $date = trim((string) $date);
    if ($date !== '') {
        $ts = preg_match('/^\d{4}-\d{2}-\d{2}$/', $date) ? strtotime($date) : false;
        if (!$ts) {
            return 'Укажите дату напоминания.';
        }
        $remind = date('Y-m-d', $ts);
    } elseif (isset(LEAD_POSTPONE_MONTHS[(int) $months])) {
        $remind = date('Y-m-d', strtotime('+' . (int) $months . ' month'));
    } else {
        return 'Выберите срок напоминания.';
    }
    if ($remind <= date('Y-m-d')) {
        return 'Дата напоминания должна быть позже сегодняшней.';
    }
    if ($remind > date('Y-m-d', strtotime('+2 year'))) {
        return 'Напоминание можно поставить не дальше чем на два года.';
    }
    $from = array_merge(LEAD_POSTPONE_FROM, array('postponed'));
    $in = implode(',', array_fill(0, count($from), '?'));
    $args = array_merge(array($remind, $lead_id, $user['id'], is_admin_user($user) ? 1 : 0), $from);
    $stmt = db()->prepare("UPDATE leads SET status = 'postponed', remind_at = ?, remind_mailed_at = NULL, status_changed_at = NOW()
        WHERE id = ? AND (owner_id = ? OR ?) AND is_archived = 0 AND status IN ($in)");
    $stmt->execute($args);
    if ($stmt->rowCount() !== 1) {
        return 'Отложить не удалось (клиент не ваш или письмо ещё не отправлено).';
    }
    lead_log($lead_id, $user['id'], 'postponed', 'Напомнить позже: ' . date('d.m.Y', strtotime($remind)));
    return true;
}

// «Написал(а) повторно»: из «Напомнить позже» или «Без ответа» — снова «Отправлено», счётчик 10 дней идёт заново.
function lead_mark_resent($lead_id, $user) {
    $stmt = db()->prepare("UPDATE leads SET status = 'sent', sent_at = NOW(), status_changed_at = NOW(), remind_at = NULL, remind_mailed_at = NULL
        WHERE id = ? AND (owner_id = ? OR ?) AND is_archived = 0 AND status IN ('postponed','silent')");
    $stmt->execute(array($lead_id, $user['id'], is_admin_user($user) ? 1 : 0));
    if ($stmt->rowCount() !== 1) {
        return 'Не удалось отметить (клиент не ваш или уже в другом статусе).';
    }
    lead_log($lead_id, $user['id'], 'resent', 'Написал(а) клиенту повторно');
    return true;
}

// Срок вышел: клиент возвращается в общий список, в истории пометка. Старым «в работе» без срока
// (до появления сроков) срок назначается от сегодняшнего дня. Возвращает число возвращённых.
function leads_auto_expire() {
    db()->prepare("UPDATE leads SET due_at = ? WHERE status = 'taken' AND due_at IS NULL")
        ->execute(array(lead_due_datetime()));
    $rows = db()->query("SELECT l.id, l.owner_id, CONCAT(u.first_name, ' ', u.last_name) AS owner_name
        FROM leads l LEFT JOIN users u ON u.id = l.owner_id
        WHERE l.status = 'taken' AND l.due_at < NOW()")->fetchAll();
    $n = 0;
    foreach ($rows as $r) {
        $upd = db()->prepare("UPDATE leads SET owner_id = NULL, status = 'new', taken_at = NULL, due_at = NULL, due_warned_at = NULL,
            status_changed_at = NOW(),
            manager_name = COALESCE((SELECT CONCAT(pu.first_name, ' ', pu.last_name) FROM users pu WHERE pu.id = pinned_user_id), ''),
            subject_final = NULL, body_final = NULL
            WHERE id = ? AND status = 'taken' AND due_at < NOW()");
        $upd->execute(array($r['id']));
        if ($upd->rowCount() === 1) {
            lead_log($r['id'], $r['owner_id'], 'expired', 'Срок отправки (' . LEAD_TAKE_WORKDAYS . ' рабочих дня) вышел: клиент вернулся в общий список (был у ' . trim($r['owner_name']) . ')');
            $n++;
        }
    }
    return $n;
}

// Одно письмо менеджеру со списком клиентов; при успехе $mark_sql ставит отметку «письмо ушло» каждому клиенту.
function leads_mail_group($rows, $subject_prefix, $intro, $outro, $mark_sql, $line_fn) {
    $sent = 0;
    $groups = array();
    foreach ($rows as $r) {
        $groups[$r['owner_id']][] = $r;
    }
    foreach ($groups as $list) {
        $first = $list[0];
        $lines = array();
        foreach ($list as $r) {
            $lines[] = '— ' . $line_fn($r);
        }
        $body = 'Здравствуйте, ' . $first['owner_first'] . "!\n\n" . $intro . "\n" . implode("\n", $lines) . "\n\n" . $outro . "\n"
            . rtrim(config('base_url'), '/') . "/leads.php\n\nЭто автоматическое уведомление, отвечать на него не нужно.";
        if (send_mail($first['owner_email'], $subject_prefix . ': ' . count($list), $body)) {
            foreach ($list as $r) {
                db()->prepare($mark_sql)->execute(array($r['id']));
                $sent++;
            }
        }
    }
    return $sent;
}

// Письма менеджерам на рабочую почту из cron: один раз на событие, одно письмо на менеджера.
// Возвращает array('warned' => n, 'remind' => n, 'nudged' => n) — сколько клиентов вошло в письма.
function leads_send_deadline_mails() {
    $out = array('warned' => 0, 'remind' => 0, 'nudged' => 0);
    $join = 'FROM leads l JOIN users u ON u.id = l.owner_id';
    $cols = 'l.*, u.email AS owner_email, u.first_name AS owner_first';

    // 1) срок на отправку заканчивается: предупреждаем в предпоследний рабочий день (за день до конца)
    $due_rows = array();
    $today = strtotime(date('Y-m-d'));
    foreach (db()->query("SELECT $cols $join WHERE l.status = 'taken' AND l.due_at IS NOT NULL AND l.due_warned_at IS NULL
        AND l.due_at > NOW() AND u.status = 'active'")->fetchAll() as $r) {
        if ($today >= lead_prev_workday(strtotime(date('Y-m-d', strtotime($r['due_at']))))) {
            $due_rows[] = $r;
        }
    }
    $out['warned'] = leads_mail_group($due_rows, 'Срок отправки писем',
        'Срок на отправку писем скоро закончится:',
        'Отправьте письма и нажмите в карточке «Я отправил(а) письмо». Если не успеть, клиент вернётся в общий список, его сможет взять другой менеджер.',
        'UPDATE leads SET due_warned_at = NOW() WHERE id = ?',
        function ($r) { return $r['company'] . ' (отправить до ' . date('d.m', strtotime($r['due_at'])) . ')'; });

    // 2) наступил день «Напомнить позже»
    $rows = db()->query("SELECT $cols $join WHERE l.status = 'postponed' AND l.remind_at IS NOT NULL AND l.remind_at <= CURDATE()
        AND l.remind_mailed_at IS NULL AND l.is_archived = 0 AND u.status = 'active'")->fetchAll();
    $out['remind'] = leads_mail_group($rows, 'Пора написать повторно',
        'Пришло время написать повторно клиентам, которых вы откладывали:',
        'Они в админке на вкладке «Напомнить».',
        'UPDATE leads SET remind_mailed_at = NOW() WHERE id = ?',
        function ($r) { return $r['company']; });

    // 3) «Без ответа» — один раз напомнить написать повторно
    $rows = db()->query("SELECT $cols $join WHERE l.status = 'silent' AND l.nudged_at IS NULL AND l.is_archived = 0
        AND u.status = 'active'")->fetchAll();
    $out['nudged'] = leads_mail_group($rows, 'Написать повторно',
        'На ваши письма больше ' . LEAD_SILENT_DAYS . ' дней нет ответа. Стоит написать этим клиентам ещё раз:',
        'Они в админке на вкладке «Отправлено» со статусом «Без ответа».',
        'UPDATE leads SET nudged_at = NOW() WHERE id = ?',
        function ($r) { return $r['company']; });
    return $out;
}

// ---------- «без ответа» через 10 дней ----------

function leads_auto_silent() {
    $stmt = db()->prepare("SELECT id FROM leads WHERE status = 'sent' AND sent_at IS NOT NULL
        AND sent_at < (NOW() - INTERVAL " . (int) LEAD_SILENT_DAYS . " DAY)");
    $stmt->execute();
    $ids = $stmt->fetchAll(PDO::FETCH_COLUMN);
    foreach ($ids as $id) {
        $upd = db()->prepare("UPDATE leads SET status = 'silent', status_changed_at = NOW()
            WHERE id = ? AND status = 'sent'");
        $upd->execute(array($id));
        if ($upd->rowCount() === 1) {
            lead_log($id, null, 'auto_silent', 'Нет ответа ' . LEAD_SILENT_DAYS . ' дней — статус «Без ответа»');
        }
    }
    return count($ids);
}

// Вызывается из страниц раздела: привязка по ФИО и автостатус — дёшево, поэтому лениво.
function leads_housekeeping() {
    leads_resolve_names();
    leads_auto_silent();
    leads_auto_expire();
    leads_auto_recycle();
}

function lead_days_since($datetime) {
    if (!$datetime) {
        return null;
    }
    return max(0, (int) floor((time() - strtotime($datetime)) / 86400));
}

// ---------- уведомление менеджеров ----------

function leads_unnotified_count_for($manager_id) {
    $stmt = db()->prepare("SELECT * FROM leads WHERE status = 'new' AND is_archived = 0 AND notified_at IS NULL
        AND ((pinned_user_id IS NULL AND manager_name = '') OR pinned_user_id = ?)");
    $stmt->execute(array($manager_id));
    return count(array_filter($stmt->fetchAll(), 'lead_is_ready'));
}

function leads_total_unnotified() {
    $rows = db()->query("SELECT * FROM leads WHERE status = 'new' AND is_archived = 0 AND notified_at IS NULL")->fetchAll();
    return count(array_filter($rows, 'lead_is_ready'));
}

// Письмо менеджерам: «добавлено N новых клиентов». Возвращает массив [отправлено, всего_новых].
function leads_notify_managers($admin) {
    $sent = 0;
    $link = rtrim(config('base_url'), '/') . '/leads.php';
    foreach (managers_list(false) as $m) {
        $n = leads_unnotified_count_for($m['id']);
        if ($n === 0) {
            continue;
        }
        $body = "Здравствуйте, " . $m['first_name'] . "!\n\n"
            . $admin['first_name'] . ' добавил(а) новых клиентов для писем: ' . $n . ". Посмотрите в админке и возьмите в работу тех, кто вам подходит:\n"
            . $link . "\n\nЭто автоматическое уведомление, отвечать на него не нужно.";
        if (send_mail($m['email'], 'Новые клиенты для писем: ' . $n, $body)) {
            $sent++;
        }
    }
    $total = leads_total_unnotified();
    // Повторно не уведомляем про те же записи.
    $rows = db()->query("SELECT * FROM leads WHERE status = 'new' AND is_archived = 0 AND notified_at IS NULL")->fetchAll();
    foreach ($rows as $r) {
        if (lead_is_ready($r)) {
            db()->prepare('UPDATE leads SET notified_at = NOW() WHERE id = ?')->execute(array($r['id']));
        }
    }
    return array($sent, $total);
}

// ---------- отчёт ----------

function leads_report_by($group_field, $from = '', $to = '') {
    $where = array('1=1');
    $args = array();
    if ($from !== '') {
        $where[] = 'COALESCE(l.sent_at, l.created_at) >= ?';
        $args[] = $from . ' 00:00:00';
    }
    if ($to !== '') {
        $where[] = 'COALESCE(l.sent_at, l.created_at) <= ?';
        $args[] = $to . ' 23:59:59';
    }
    if ($group_field === 'manager') {
        $label = "COALESCE(NULLIF(CONCAT(o.first_name, ' ', o.last_name), ' '), NULLIF(l.manager_name, ''), '— не назначен —')";
    } else {
        $label = "COALESCE(NULLIF(l.segment, ''), '— без сегмента —')";
    }
    $sql = "SELECT $label AS grp,
        COUNT(*) AS total,
        SUM(l.status = 'new') AS in_queue,
        SUM(l.status = 'taken') AS taken,
        SUM(l.sent_at IS NOT NULL) AS sent,
        SUM(l.status IN ('replied','sample_sent','order')) AS replied,
        SUM(l.status = 'refused') AS refused,
        SUM(l.status = 'silent') AS silent,
        SUM(l.status IN ('sample_sent','order')) AS samples,
        SUM(l.status = 'order') AS orders,
        SUM(l.status = 'blocked') AS blocked,
        SUM(l.status = 'postponed') AS postponed
        FROM leads l LEFT JOIN users o ON o.id = l.owner_id
        WHERE " . implode(' AND ', $where) . " GROUP BY grp ORDER BY sent DESC, total DESC";
    $stmt = db()->prepare($sql);
    $stmt->execute($args);
    return $stmt->fetchAll();
}

function leads_report_totals($from = '', $to = '') {
    $rows = leads_report_by('segment', $from, $to);
    $t = array('total' => 0, 'in_queue' => 0, 'taken' => 0, 'sent' => 0, 'replied' => 0, 'refused' => 0,
        'silent' => 0, 'samples' => 0, 'orders' => 0, 'blocked' => 0);
    foreach ($rows as $r) {
        foreach ($t as $k => $v) {
            $t[$k] += (int) $r[$k];
        }
    }
    return $t;
}

// Сколько отложенных клиентов менеджера уже ждут повторного письма (дата напоминания наступила).
function leads_due_later_count($user) {
    $stmt = db()->prepare("SELECT COUNT(*) c FROM leads WHERE owner_id = ? AND status = 'postponed' AND is_archived = 0
        AND remind_at IS NOT NULL AND remind_at <= CURDATE()");
    $stmt->execute(array($user['id']));
    return (int) $stmt->fetch()['c'];
}

// ---------- отчёт для руководителя: по менеджерам за период ----------

// Одна строка на менеджера (роль «менеджер»/админ, у которого есть клиенты). Период — даты Y-m-d (можно пустые = всё время).
// Считается: взято (события «взят»), отправлено (по дате отправки), вернулись по сроку (события «срок вышел»),
// ответили / образцы / заказы среди отправленных за период, среднее время от «взял» до «отправил»;
// и текущее состояние: сейчас «в работе», из них с горящим сроком, отложено.
function leads_manager_report($from = '', $to = '') {
    $ev_where = '1=1';
    $sent_where = 'l.sent_at IS NOT NULL';
    $ev_args = array();
    $sent_args = array();
    if ($from !== '') {
        $ev_where .= ' AND e.created_at >= ?';
        $ev_args[] = $from . ' 00:00:00';
        $sent_where .= ' AND l.sent_at >= ?';
        $sent_args[] = $from . ' 00:00:00';
    }
    if ($to !== '') {
        $ev_where .= ' AND e.created_at <= ?';
        $ev_args[] = $to . ' 23:59:59';
        $sent_where .= ' AND l.sent_at <= ?';
        $sent_args[] = $to . ' 23:59:59';
    }

    $rows = array();
    foreach (managers_list() as $m) {
        $rows[(int) $m['id']] = array('id' => (int) $m['id'], 'name' => user_full_name($m),
            'taken' => 0, 'sent' => 0, 'expired' => 0, 'replied' => 0, 'refused' => 0, 'silent' => 0,
            'samples' => 0, 'orders' => 0, 'avg_hours' => null,
            'in_work' => 0, 'in_work_soon' => 0, 'postponed' => 0, 'postponed_due' => 0);
    }

    $stmt = db()->prepare("SELECT e.user_id, e.event_type, COUNT(*) c FROM lead_events e
        WHERE e.event_type IN ('taken','expired') AND e.user_id IS NOT NULL AND $ev_where GROUP BY e.user_id, e.event_type");
    $stmt->execute($ev_args);
    foreach ($stmt->fetchAll() as $r) {
        if (isset($rows[(int) $r['user_id']])) {
            $rows[(int) $r['user_id']][$r['event_type'] === 'taken' ? 'taken' : 'expired'] = (int) $r['c'];
        }
    }

    $stmt = db()->prepare("SELECT l.owner_id, COUNT(*) sent,
        SUM(l.status IN ('replied','sample_sent','order')) replied, SUM(l.status = 'refused') refused,
        SUM(l.status = 'silent') silent, SUM(l.status IN ('sample_sent','order')) samples, SUM(l.status = 'order') orders,
        AVG(CASE WHEN l.taken_at IS NOT NULL AND l.sent_at >= l.taken_at THEN TIMESTAMPDIFF(MINUTE, l.taken_at, l.sent_at) END) avg_min
        FROM leads l WHERE l.owner_id IS NOT NULL AND $sent_where GROUP BY l.owner_id");
    $stmt->execute($sent_args);
    foreach ($stmt->fetchAll() as $r) {
        $id = (int) $r['owner_id'];
        if (!isset($rows[$id])) {
            continue;
        }
        foreach (array('sent', 'replied', 'refused', 'silent', 'samples', 'orders') as $k) {
            $rows[$id][$k] = (int) $r[$k];
        }
        $rows[$id]['avg_hours'] = $r['avg_min'] === null ? null : round($r['avg_min'] / 60, 1);
    }

    foreach (db()->query("SELECT owner_id, COUNT(*) c, SUM(due_at IS NOT NULL AND due_at < (NOW() + INTERVAL 1 DAY)) soon
        FROM leads WHERE status = 'taken' AND is_archived = 0 AND owner_id IS NOT NULL GROUP BY owner_id")->fetchAll() as $r) {
        if (isset($rows[(int) $r['owner_id']])) {
            $rows[(int) $r['owner_id']]['in_work'] = (int) $r['c'];
            $rows[(int) $r['owner_id']]['in_work_soon'] = (int) $r['soon'];
        }
    }
    foreach (db()->query("SELECT owner_id, COUNT(*) c, SUM(remind_at IS NOT NULL AND remind_at <= CURDATE()) due
        FROM leads WHERE status = 'postponed' AND is_archived = 0 AND owner_id IS NOT NULL GROUP BY owner_id")->fetchAll() as $r) {
        if (isset($rows[(int) $r['owner_id']])) {
            $rows[(int) $r['owner_id']]['postponed'] = (int) $r['c'];
            $rows[(int) $r['owner_id']]['postponed_due'] = (int) $r['due'];
        }
    }
    return array_values($rows);
}

// Причины отказов по менеджерам за период: array('rows' => [[name, total, reasons[код] => n]], 'totals' => [код => n], 'total' => n).
// Считается по журналу, поэтому отказы остаются в отчёте и после возврата клиента в общий список.
function leads_refuse_report($from = '', $to = '') {
    $types = array();
    foreach (array_keys(LEAD_REFUSE_REASONS) as $code) {
        $types[] = 'refuse_' . $code;
    }
    $where = 'e.event_type IN (' . implode(',', array_fill(0, count($types), '?')) . ')';
    $args = $types;
    if ($from !== '') {
        $where .= ' AND e.created_at >= ?';
        $args[] = $from . ' 00:00:00';
    }
    if ($to !== '') {
        $where .= ' AND e.created_at <= ?';
        $args[] = $to . ' 23:59:59';
    }
    $stmt = db()->prepare("SELECT e.user_id, e.event_type, COUNT(*) c, CONCAT(u.first_name, ' ', u.last_name) AS name
        FROM lead_events e LEFT JOIN users u ON u.id = e.user_id WHERE $where GROUP BY e.user_id, e.event_type");
    $stmt->execute($args);
    $out = array('rows' => array(), 'totals' => array_fill_keys(array_keys(LEAD_REFUSE_REASONS), 0), 'total' => 0);
    foreach ($stmt->fetchAll() as $r) {
        $code = substr($r['event_type'], 7);
        $uid = (int) $r['user_id'];
        if (!isset($out['rows'][$uid])) {
            $out['rows'][$uid] = array('name' => trim($r['name']) !== '' ? trim($r['name']) : '— не назначен —', 'total' => 0,
                'reasons' => array_fill_keys(array_keys(LEAD_REFUSE_REASONS), 0));
        }
        $out['rows'][$uid]['reasons'][$code] += (int) $r['c'];
        $out['rows'][$uid]['total'] += (int) $r['c'];
        $out['totals'][$code] += (int) $r['c'];
        $out['total'] += (int) $r['c'];
    }
    uasort($out['rows'], function ($a, $b) {
        return $b['total'] - $a['total'];
    });
    $out['rows'] = array_values($out['rows']);
    return $out;
}

// Отложенные клиенты со сроком напоминания (для отчёта), ближайшие сверху.
function leads_postponed_list() {
    return db()->query("SELECT l.id, l.company, l.remind_at, CONCAT(u.first_name, ' ', u.last_name) AS owner_name
        FROM leads l LEFT JOIN users u ON u.id = l.owner_id
        WHERE l.status = 'postponed' AND l.is_archived = 0 ORDER BY l.remind_at IS NULL, l.remind_at ASC LIMIT 200")->fetchAll();
}

// «Висят»: взяты, срок на отправку уже близко или вышел (на случай, если cron ещё не вернул).
function leads_taken_list() {
    return db()->query("SELECT l.id, l.company, l.taken_at, l.due_at, CONCAT(u.first_name, ' ', u.last_name) AS owner_name
        FROM leads l LEFT JOIN users u ON u.id = l.owner_id
        WHERE l.status = 'taken' AND l.is_archived = 0 ORDER BY l.due_at IS NULL, l.due_at ASC LIMIT 200")->fetchAll();
}

// ---------- импорт пачкой ----------

function lead_import_aliases() {
    return array(
        'company' => array('company', 'компания', 'название', 'организация'),
        'site' => array('site', 'сайт'),
        'segment' => array('segment', 'сегмент'),
        'channel' => array('channel', 'канал'),
        'email_to' => array('email_to', 'email', 'e-mail', 'кому', 'почта'),
        'email_cc' => array('email_cc', 'cc', 'копия'),
        'greeting' => array('greeting', 'обращение'),
        'subject' => array('subject', 'тема'),
        'body' => array('body', 'text', 'текст', 'письмо', 'текст письма'),
        'instructions' => array('instructions', 'инструкция'),
        'samples_hint' => array('samples_hint', 'samples', 'образцы', 'какие образцы'),
        'hook' => array('hook', 'крючок', 'повод'),
        'source' => array('source', 'источник'),
        'note' => array('note', 'заметка', 'комментарий'),
        'batch' => array('batch', 'партия'),
        'manager_name' => array('manager_name', 'manager', 'ведёт', 'веде', 'ведет', 'закреплен', 'закреплён', 'менеджер'),
        'status' => array('status', 'статус'),
        'sent_at' => array('sent_at', 'дата отправки', 'дата', 'отправлено'),
    );
}

function lead_status_from_text($text) {
    $t = mb_strtolower(trim((string) $text));
    if ($t === '') {
        return 'new';
    }
    if (isset(LEAD_STATUS_LABELS[$t])) {
        return $t;
    }
    $map = array(
        'новый' => 'new', 'в очереди' => 'new', 'взят' => 'taken', 'взят в работу' => 'taken',
        'отправлено' => 'sent', 'отправлен' => 'sent', 'ответил' => 'replied', 'ответила' => 'replied',
        'ответили' => 'replied', 'отказ' => 'refused', 'молчит' => 'silent', 'без ответа' => 'silent',
        'образец отправлен' => 'sample_sent', 'заказ' => 'order', 'не писать' => 'blocked',
    );
    foreach ($map as $k => $v) {
        if ($t === $k || strpos($t, $k) === 0) {
            return $v;
        }
    }
    return 'new';
}

function lead_parse_date($text) {
    $text = trim((string) $text);
    if ($text === '') {
        return null;
    }
    if (preg_match('/^(\d{1,2})\.(\d{1,2})\.(\d{4})$/', $text, $m)) {
        return sprintf('%04d-%02d-%02d 12:00:00', $m[3], $m[2], $m[1]);
    }
    $ts = strtotime($text);
    return $ts ? date('Y-m-d H:i:s', $ts) : null;
}

// Текст файла -> массив строк-ассоциативов с ключами-названиями полей.
function lead_parse_import($content, $filename) {
    $content = (string) $content;
    if (substr($content, 0, 3) === "\xEF\xBB\xBF") {
        $content = substr($content, 3);
    }
    if (!mb_check_encoding($content, 'UTF-8')) {
        $content = mb_convert_encoding($content, 'UTF-8', 'Windows-1251');
    }
    $rows = array();
    $trim = ltrim($content);
    if (substr($trim, 0, 1) === '[' || substr($trim, 0, 1) === '{') {
        $data = json_decode($content, true);
        if (!is_array($data)) {
            return array('error' => 'Не удалось разобрать JSON.');
        }
        if (isset($data['leads']) && is_array($data['leads'])) {
            $data = $data['leads'];
        }
        $rows = array_values($data);
    } else {
        $first = strtok($content, "\n");
        $delims = array(';' => substr_count($first, ';'), ',' => substr_count($first, ','), "\t" => substr_count($first, "\t"));
        arsort($delims);
        $delim = key($delims);
        $stream = fopen('php://temp', 'r+');
        fwrite($stream, $content);
        rewind($stream);
        $header = null;
        while (($cells = fgetcsv($stream, 0, $delim, '"')) !== false) {
            if ($cells === array(null) || (count($cells) === 1 && trim((string) $cells[0]) === '')) {
                continue;
            }
            if ($header === null) {
                $header = array();
                foreach ($cells as $c) {
                    $header[] = mb_strtolower(trim($c));
                }
                continue;
            }
            $row = array();
            foreach ($header as $i => $name) {
                $row[$name] = isset($cells[$i]) ? $cells[$i] : '';
            }
            $rows[] = $row;
        }
        fclose($stream);
    }

    // Приводим названия колонок к внутренним.
    $alias_to_field = array();
    foreach (lead_import_aliases() as $field => $aliases) {
        foreach ($aliases as $a) {
            $alias_to_field[mb_strtolower($a)] = $field;
        }
    }
    $result = array();
    foreach ($rows as $row) {
        if (!is_array($row)) {
            continue;
        }
        $out = array();
        foreach ($row as $k => $v) {
            $key = mb_strtolower(trim((string) $k));
            if (isset($alias_to_field[$key])) {
                $out[$alias_to_field[$key]] = is_array($v) ? implode(', ', $v) : (string) $v;
            }
        }
        if ($out) {
            $result[] = $out;
        }
    }
    return array('rows' => $result);
}

// Возвращает array('created' => n, 'skipped' => [текст...], 'errors' => [текст...]).
function lead_import_rows($rows, $actor_id, $dry_run, $batch = '') {
    $created = 0;
    $skipped = array();
    $errors = array();
    $seen_domains = array();
    foreach ($rows as $i => $row) {
        $n = $i + 1;
        $name = isset($row['company']) ? $row['company'] : '(без названия)';
        if ($batch !== '' && empty($row['batch'])) {
            $row['batch'] = $batch;
        }
        $status = lead_status_from_text(isset($row['status']) ? $row['status'] : '');
        $opts = array('actor_id' => $actor_id, 'status' => $status,
            'sent_at' => lead_parse_date(isset($row['sent_at']) ? $row['sent_at'] : ''));

        if ($dry_run) {
            $d = lead_clean_data($row);
            $err = lead_validate($d);
            if (!$err) {
                $emails = array_merge(lead_email_list($d['email_to']), lead_email_list($d['email_cc']));
                $stop = lead_stoplist_hit($d['domain'], $emails);
                $dups = lead_find_duplicates($d['domain'], $emails);
                if ($stop) {
                    $err = 'в стоп-листе';
                } elseif ($dups) {
                    $skipped[] = '№' . $n . ' ' . $name . ': ' . lead_duplicate_text($dups[0]);
                    continue;
                } elseif ($d['domain'] !== '' && isset($seen_domains[$d['domain']])) {
                    $skipped[] = '№' . $n . ' ' . $name . ': повтор в файле (' . $d['domain'] . ')';
                    continue;
                }
                $seen_domains[$d['domain']] = true;
            }
            if ($err) {
                $errors[] = '№' . $n . ' ' . $name . ': ' . $err;
            } else {
                $created++;
            }
            continue;
        }

        $res = lead_create($row, $opts);
        if (isset($res['id'])) {
            $created++;
        } elseif (isset($res['dups'])) {
            $skipped[] = '№' . $n . ' ' . $name . ': ' . $res['error'];
        } else {
            $errors[] = '№' . $n . ' ' . $name . ': ' . $res['error'];
        }
    }
    return array('created' => $created, 'skipped' => $skipped, 'errors' => $errors);
}
