-- Раздел «Клиенты для писем» и «Образцы» (docs/growth/leads-admin.md).
-- Применяется автоматически (src/leads_schema.php, leads_ensure_schema()) при первом заходе
-- после выкладки и вручную: node admin-remote-exec.js admin/tools/migrate-leads.php
-- Только CREATE TABLE IF NOT EXISTS — повторный запуск безопасен. Правки таблицы users
-- (роль «менеджер», должность, телефон, почтовый клиент) делает PHP-код: ADD COLUMN IF NOT
-- EXISTS в MySQL 5.7 нет. Каждое выражение заканчивается «;» в конце строки.

CREATE TABLE IF NOT EXISTS leads (
    id INT UNSIGNED NOT NULL AUTO_INCREMENT,
    company VARCHAR(255) NOT NULL,
    site VARCHAR(255) NOT NULL DEFAULT '',
    domain VARCHAR(190) NOT NULL DEFAULT '',
    segment VARCHAR(100) NOT NULL DEFAULT '',
    channel ENUM('email','form') NOT NULL DEFAULT 'email',
    email_to VARCHAR(500) NOT NULL DEFAULT '',
    email_cc VARCHAR(500) NOT NULL DEFAULT '',
    greeting VARCHAR(255) NOT NULL DEFAULT '',
    subject VARCHAR(500) NOT NULL DEFAULT '',
    body MEDIUMTEXT NULL,
    subject_final VARCHAR(500) NULL,
    body_final MEDIUMTEXT NULL,
    instructions MEDIUMTEXT NULL,
    samples_hint TEXT NULL,
    hook TEXT NULL,
    source VARCHAR(255) NOT NULL DEFAULT '',
    note TEXT NULL,
    batch VARCHAR(100) NOT NULL DEFAULT '',
    manager_name VARCHAR(190) NOT NULL DEFAULT '',
    pinned_user_id INT UNSIGNED NULL,
    owner_id INT UNSIGNED NULL,
    status ENUM('new','taken','sent','replied','refused','silent','sample_sent','order','blocked') NOT NULL DEFAULT 'new',
    is_archived TINYINT(1) NOT NULL DEFAULT 0,
    archive_reason VARCHAR(255) NOT NULL DEFAULT '',
    taken_at DATETIME NULL,
    sent_at DATETIME NULL,
    status_changed_at DATETIME NULL,
    notified_at DATETIME NULL,
    created_by INT UNSIGNED NULL,
    created_at DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
    updated_at DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
    PRIMARY KEY (id),
    KEY idx_domain (domain),
    KEY idx_status (status),
    KEY idx_owner (owner_id),
    KEY idx_pinned (pinned_user_id),
    KEY idx_archived (is_archived)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;

CREATE TABLE IF NOT EXISTS lead_events (
    id INT UNSIGNED NOT NULL AUTO_INCREMENT,
    lead_id INT UNSIGNED NOT NULL,
    user_id INT UNSIGNED NULL,
    event_type VARCHAR(50) NOT NULL,
    message TEXT NULL,
    created_at DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
    PRIMARY KEY (id),
    KEY idx_lead (lead_id),
    CONSTRAINT fk_lead_events_lead FOREIGN KEY (lead_id) REFERENCES leads(id) ON DELETE CASCADE
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;

CREATE TABLE IF NOT EXISTS lead_stoplist (
    id INT UNSIGNED NOT NULL AUTO_INCREMENT,
    domain VARCHAR(190) NOT NULL DEFAULT '',
    email VARCHAR(190) NOT NULL DEFAULT '',
    company VARCHAR(255) NOT NULL DEFAULT '',
    reason VARCHAR(255) NOT NULL DEFAULT '',
    added_by INT UNSIGNED NULL,
    created_at DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
    PRIMARY KEY (id),
    KEY idx_domain (domain),
    KEY idx_email (email)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;

CREATE TABLE IF NOT EXISTS sample_categories (
    id INT UNSIGNED NOT NULL AUTO_INCREMENT,
    name VARCHAR(100) NOT NULL,
    segments VARCHAR(500) NOT NULL DEFAULT '',
    sort_order INT NOT NULL DEFAULT 0,
    PRIMARY KEY (id)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;

CREATE TABLE IF NOT EXISTS samples (
    id INT UNSIGNED NOT NULL AUTO_INCREMENT,
    category_id INT UNSIGNED NOT NULL,
    title VARCHAR(255) NOT NULL DEFAULT '',
    filename VARCHAR(100) NOT NULL,
    original_name VARCHAR(255) NOT NULL DEFAULT '',
    size_bytes INT UNSIGNED NOT NULL DEFAULT 0,
    width SMALLINT UNSIGNED NULL,
    height SMALLINT UNSIGNED NULL,
    uploaded_by INT UNSIGNED NULL,
    created_at DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
    PRIMARY KEY (id),
    KEY idx_category (category_id),
    CONSTRAINT fk_samples_category FOREIGN KEY (category_id) REFERENCES sample_categories(id) ON DELETE CASCADE
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;
