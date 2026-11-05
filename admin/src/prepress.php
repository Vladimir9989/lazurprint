<?php
// Доска «Допечатка»: заказы по людям на день, статусы, учёт времени операторов.
// Доступна ролям prepress/admin/viewer; данные — в MySQL, страница опрашивает prepress-api.php.

define('PREPRESS_PAGES', array('prepress.php', 'prepress-api.php', 'profile.php'));
define('PREPRESS_CARDS', array('Хорхорина', 'Манькова', 'Чудова', 'Петрова', 'ПТО', 'Цифровая печать', 'CtP'));
define('PREPRESS_CTP', 'CtP');
define('PREPRESS_ST', array('work', 'redo', 'wait', 'ok'));
define('PREPRESS_CT', array('done', 'todo', 'buy', 'ask', 'call', 'give', 'order', 'clar'));

function prepress_ensure_schema() {
    static $checked = false;
    if ($checked) {
        return;
    }
    $checked = true;
    try {
        $stmt = db()->query("SELECT COUNT(*) c FROM information_schema.tables
            WHERE table_schema = DATABASE() AND table_name = 'prepress_orders'");
        if ((int) $stmt->fetch()['c'] > 0 && leads_column_exists('users', 'prepress_op')) {
            return;
        }
        db()->exec("CREATE TABLE IF NOT EXISTS prepress_orders (
            id VARCHAR(20) NOT NULL PRIMARY KEY,
            card VARCHAR(40) NOT NULL,
            order_no VARCHAR(100) NOT NULL DEFAULT '',
            comment VARCHAR(500) NOT NULL DEFAULT '',
            status VARCHAR(10) NOT NULL,
            work_date DATE NOT NULL,
            from_date DATE NULL,
            op_user_id INT NULL,
            since_at BIGINT NOT NULL DEFAULT 0,
            times TEXT NULL,
            created_by INT NOT NULL,
            created_at DATETIME NOT NULL,
            updated_at DATETIME NOT NULL,
            KEY idx_date (work_date),
            KEY idx_op (op_user_id)
        ) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4");
        db()->exec("CREATE TABLE IF NOT EXISTS prepress_reminders (
            card VARCHAR(40) NOT NULL PRIMARY KEY,
            text VARCHAR(500) NOT NULL DEFAULT ''
        ) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4");
        $row = db()->query("SELECT COLUMN_TYPE t FROM information_schema.columns
            WHERE table_schema = DATABASE() AND table_name = 'users' AND column_name = 'role'")->fetch();
        if ($row && strpos($row['t'], "'prepress'") === false) {
            db()->exec("ALTER TABLE users MODIFY role ENUM('admin','warehouse','photo','accounting','viewer','manager','prepress') NOT NULL");
        }
        if (!leads_column_exists('users', 'prepress_op')) {
            db()->exec("ALTER TABLE users ADD COLUMN prepress_op TINYINT NOT NULL DEFAULT 0");
        }
    } catch (Exception $e) {
        error_log('Миграция «Допечатка»: ' . $e->getMessage());
    }
}

function pp_now_ms() {
    return (int) round(microtime(true) * 1000);
}

function pp_is_done($o) {
    return $o['status'] === 'ok' || $o['status'] === 'done';
}

// Конец суток даты (мс) — до него считается время оператора по перенесённому заказу.
function pp_eod_ms($date) {
    return strtotime($date . ' 00:00:00 +1 day') * 1000;
}

function pp_stop_timer(&$o, $at) {
    if ($o['since_at'] && $o['op_user_id']) {
        $k = 'u' . $o['op_user_id'];
        $o['times'][$k] = (isset($o['times'][$k]) ? $o['times'][$k] : 0) + max(0, $at - $o['since_at']);
    }
    $o['since_at'] = 0;
}

function pp_row_to_order($r) {
    $r['times'] = $r['times'] ? (json_decode($r['times'], true) ?: array()) : array();
    $r['since_at'] = (int) $r['since_at'];
    $r['op_user_id'] = $r['op_user_id'] === null ? 0 : (int) $r['op_user_id'];
    return $r;
}

function pp_save_order($o) {
    db()->prepare('UPDATE prepress_orders SET card=?, order_no=?, comment=?, status=?, work_date=?, from_date=?,
        op_user_id=?, since_at=?, times=?, updated_at=NOW() WHERE id=?')
        ->execute(array($o['card'], $o['order_no'], $o['comment'], $o['status'], $o['work_date'],
            $o['from_date'] ? $o['from_date'] : null, $o['op_user_id'] ? $o['op_user_id'] : null, $o['since_at'],
            $o['times'] ? json_encode($o['times']) : '{}', $o['id']));
}

function pp_get($id) {
    $stmt = db()->prepare('SELECT * FROM prepress_orders WHERE id = ? LIMIT 1');
    $stmt->execute(array($id));
    $r = $stmt->fetch();
    return $r ? pp_row_to_order($r) : null;
}

// Невыполненное с прошлых дней переезжает на сегодня; таймер останавливается на конец того дня.
function pp_rollover() {
    $today = date('Y-m-d');
    $stmt = db()->prepare("SELECT * FROM prepress_orders WHERE work_date < ? AND status NOT IN ('ok','done')");
    $stmt->execute(array($today));
    foreach ($stmt->fetchAll() as $r) {
        $o = pp_row_to_order($r);
        pp_stop_timer($o, min(pp_now_ms(), pp_eod_ms($o['work_date'])));
        if (!$o['from_date']) {
            $o['from_date'] = $o['work_date'];
        }
        $o['work_date'] = $today;
        pp_save_order($o);
    }
}

function pp_can_delete($user, $o) {
    return in_array($user['role'], array('admin', 'prepress'), true);
}

function pp_state() {
    pp_rollover();
    $orders = array();
    $rows = db()->query("SELECT * FROM prepress_orders WHERE work_date >= (CURDATE() - INTERVAL 60 DAY) ORDER BY created_at, id")->fetchAll();
    foreach ($rows as $r) {
        $o = pp_row_to_order($r);
        $orders[] = array(
            'id' => $o['id'], 'card' => $o['card'], 'no' => $o['order_no'], 'cm' => $o['comment'],
            'st' => $o['status'], 'date' => $o['work_date'], 'from' => $o['from_date'],
            'op' => $o['op_user_id'], 'since' => $o['since_at'], 't' => (object) $o['times'],
            'by' => (int) $o['created_by'],
        );
    }
    $rem = array();
    foreach (db()->query('SELECT card, text FROM prepress_reminders')->fetchAll() as $r) {
        $rem[$r['card']] = $r['text'];
    }
    $ops = array();
    foreach (db()->query("SELECT id, last_name FROM users WHERE role = 'prepress' AND status = 'active' ORDER BY last_name")->fetchAll() as $r) {
        $ops[] = array('id' => (int) $r['id'], 'name' => $r['last_name']);
    }
    $names = array();
    foreach (db()->query('SELECT id, last_name FROM users')->fetchAll() as $r) {
        $names[(int) $r['id']] = $r['last_name'];
    }
    return array('orders' => $orders, 'rem' => (object) $rem, 'ops' => $ops, 'names' => (object) $names,
        'now' => pp_now_ms(), 'today' => date('Y-m-d'));
}

function pp_valid_status($card, $st) {
    return in_array($st, $card === PREPRESS_CTP ? PREPRESS_CT : PREPRESS_ST, true);
}

// Возвращает null при успехе или текст ошибки.
function pp_action($user, $act, $p) {
    $uid = (int) $user['id'];
    if ($act === 'add') {
        $card = isset($p['card']) ? (string) $p['card'] : '';
        $no = mb_substr(trim(isset($p['no']) ? (string) $p['no'] : ''), 0, 100);
        $cm = mb_substr(trim(isset($p['cm']) ? (string) $p['cm'] : ''), 0, 500);
        $st = isset($p['st']) ? (string) $p['st'] : '';
        if (!in_array($card, PREPRESS_CARDS, true) || !pp_valid_status($card, $st)) {
            return 'Некорректные данные.';
        }
        if ($card === PREPRESS_CTP ? ($no === '' && $cm === '') : $no === '') {
            return 'Укажите номер заказа.';
        }
        db()->prepare('INSERT INTO prepress_orders (id, card, order_no, comment, status, work_date, times, created_by, created_at, updated_at)
            VALUES (?, ?, ?, ?, ?, CURDATE(), ?, ?, NOW(), NOW())')
            ->execute(array(bin2hex(random_bytes(6)), $card, $no, $cm, $st, '{}', $uid));
        return null;
    }
    if ($act === 'rem') {
        $card = isset($p['card']) ? (string) $p['card'] : '';
        if (!in_array($card, PREPRESS_CARDS, true)) {
            return 'Некорректные данные.';
        }
        db()->prepare('INSERT INTO prepress_reminders (card, text) VALUES (?, ?) ON DUPLICATE KEY UPDATE text = VALUES(text)')
            ->execute(array($card, mb_substr(isset($p['text']) ? (string) $p['text'] : '', 0, 500)));
        return null;
    }
    $o = pp_get(isset($p['id']) ? (string) $p['id'] : '');
    if (!$o) {
        return 'Запись не найдена (возможно, её уже удалили).';
    }
    $now = pp_now_ms();
    if ($act === 'delete') {
        if (!pp_can_delete($user, $o)) {
            return 'Удалять записи могут операторы.';
        }
        db()->prepare('DELETE FROM prepress_orders WHERE id = ?')->execute(array($o['id']));
        return null;
    }
    if (in_array($act, array('take', 'pause', 'resume', 'release'), true) && $o['card'] === PREPRESS_CTP) {
        return 'Для записей CtP время оператора не ведётся.';
    }
    if ($act === 'status') {
        $st = isset($p['st']) ? (string) $p['st'] : '';
        if (!pp_valid_status($o['card'], $st)) {
            return 'Некорректный статус.';
        }
        $o['status'] = $st;
        if ($st === 'wait' || pp_is_done($o)) {
            pp_stop_timer($o, $now);
        }
        if (pp_is_done($o)) {
            $o['from_date'] = null;
        }
    } elseif ($act === 'take') {
        if ($user['role'] !== 'prepress') {
            return 'Брать в работу могут только операторы.';
        }
        if ($o['op_user_id'] && $o['op_user_id'] !== $uid) {
            return 'Заказ уже взял другой оператор.';
        }
        $o['op_user_id'] = $uid;
        $o['since_at'] = $now;
        if ($o['status'] !== 'redo') {
            $o['status'] = 'work';
        }
    } elseif ($act === 'pause' || $act === 'resume' || $act === 'release') {
        if ($o['op_user_id'] !== $uid) {
            return 'Это не ваш заказ.';
        }
        if ($act === 'resume') {
            $o['since_at'] = $now;
            if ($o['status'] === 'wait' || $o['status'] === 'ok') {
                $o['status'] = 'work';
            }
        } else {
            pp_stop_timer($o, $now);
            if ($act === 'release') {
                $o['op_user_id'] = 0;
            }
        }
    } else {
        return 'Неизвестное действие.';
    }
    pp_save_order($o);
    return null;
}
