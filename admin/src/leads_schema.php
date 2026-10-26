<?php
// Схема раздела «Клиенты для писем» + «Образцы» (docs/growth/leads-admin.md).
// leads_ensure_schema() вызывается из bootstrap на каждом запросе, но обходится одним
// дешёвым запросом: последняя миграция — колонка users.mail_client, если она есть,
// значит всё остальное уже применено. На хостинге то же делает tools/migrate-leads.php.

// Последняя миграция — колонка leads.nudged_at (сроки, «напомнить позже»).
function leads_schema_ready() {
    $stmt = db()->query("SELECT COUNT(*) c FROM information_schema.columns
        WHERE table_schema = DATABASE() AND table_name = 'leads' AND column_name = 'nudged_at'");
    return (int) $stmt->fetch()['c'] > 0;
}

function leads_column_exists($table, $column) {
    $stmt = db()->prepare('SELECT COUNT(*) c FROM information_schema.columns
        WHERE table_schema = DATABASE() AND table_name = ? AND column_name = ?');
    $stmt->execute(array($table, $column));
    return (int) $stmt->fetch()['c'] > 0;
}

function leads_ensure_schema() {
    static $checked = false;
    if ($checked) {
        return;
    }
    $checked = true;
    try {
        if (leads_schema_ready()) {
            return;
        }
        leads_run_migration();
    } catch (Exception $e) {
        error_log('Миграция раздела «Клиенты»: ' . $e->getMessage());
    }
}

function leads_run_migration() {
    $sql = file_get_contents(__DIR__ . '/../sql/leads.sql');
    // Убираем комментарии-строки, режем по «;» в конце строки.
    $sql = preg_replace('/^--.*$/m', '', $sql);
    foreach (preg_split('/;\s*\n/', $sql) as $statement) {
        $statement = trim($statement);
        if ($statement !== '') {
            db()->exec($statement);
        }
    }

    // users: роль «менеджер» и профиль для подстановки подписи.
    $row = db()->query("SELECT COLUMN_TYPE t FROM information_schema.columns
        WHERE table_schema = DATABASE() AND table_name = 'users' AND column_name = 'role'")->fetch();
    if ($row && strpos($row['t'], "'manager'") === false) {
        db()->exec("ALTER TABLE users MODIFY role ENUM('admin','warehouse','photo','accounting','viewer','manager') NOT NULL");
    }
    if (!leads_column_exists('users', 'position')) {
        db()->exec("ALTER TABLE users ADD COLUMN position VARCHAR(150) NOT NULL DEFAULT ''");
    }
    if (!leads_column_exists('users', 'phone')) {
        db()->exec("ALTER TABLE users ADD COLUMN phone VARCHAR(50) NOT NULL DEFAULT ''");
    }
    if (!leads_column_exists('users', 'mail_client')) {
        db()->exec("ALTER TABLE users ADD COLUMN mail_client VARCHAR(20) NOT NULL DEFAULT 'mailru'");
    }

    // Срок на отправку, «напомнить позже», повторное напоминание молчащим (2026-10-20).
    $row = db()->query("SELECT COLUMN_TYPE t FROM information_schema.columns
        WHERE table_schema = DATABASE() AND table_name = 'leads' AND column_name = 'status'")->fetch();
    if ($row && strpos($row['t'], "'postponed'") === false) {
        db()->exec("ALTER TABLE leads MODIFY status ENUM('new','taken','sent','replied','refused','silent','sample_sent','order','blocked','postponed') NOT NULL DEFAULT 'new'");
    }
    $new_columns = array(
        'due_at' => 'DATETIME NULL',
        'due_warned_at' => 'DATETIME NULL',
        'remind_at' => 'DATE NULL',
        'remind_mailed_at' => 'DATETIME NULL',
        'nudged_at' => 'DATETIME NULL', // последним: по нему leads_schema_ready() понимает, что миграция закончена
    );
    foreach ($new_columns as $col => $def) {
        if (!leads_column_exists('leads', $col)) {
            db()->exec("ALTER TABLE leads ADD COLUMN $col $def");
        }
    }

    leads_seed_sample_categories();
}

function leads_seed_sample_categories() {
    $count = (int) db()->query('SELECT COUNT(*) c FROM sample_categories')->fetch()['c'];
    if ($count > 0) {
        return;
    }
    // Название => сегменты, для которых категория предвыбирается в карточке клиента.
    $seed = array(
        'Книги' => 'издательство',
        'Журналы' => 'издательство, периодика',
        'Брошюры' => '',
        'Коробки' => 'производитель, упаковка',
        'Листовки и буклеты' => '',
        'Каталоги' => 'производитель, агентство',
        'Газеты' => 'периодика',
        'Плакаты' => '',
    );
    $order = 10;
    $stmt = db()->prepare('INSERT INTO sample_categories (name, segments, sort_order) VALUES (?, ?, ?)');
    foreach ($seed as $name => $segments) {
        $stmt->execute(array($name, $segments, $order));
        $order += 10;
    }
}
