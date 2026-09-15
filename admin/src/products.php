<?php

define('PRODUCT_CATEGORIES', array(
    'Магниты', 'Блокноты', 'Футболки', 'Кружки', 'Открытки',
    'Значки', 'Чай', 'Сладкие сувениры', 'Раскраски', 'Разное',
));

// Число без хвостовых нулей: "93.00" -> "93", "93.50" -> "93.5".
function format_price_plain($price) {
    if ($price === null || $price === '') {
        return '';
    }
    return rtrim(rtrim(number_format((float) $price, 2, '.', ''), '0'), '.');
}

function format_price($price) {
    $formatted = format_price_plain($price);
    return $formatted === '' ? '' : $formatted . ' руб.';
}

// Статус карточки вычисляется из трёх независимых признаков, отдельно не хранится.
function product_status($product) {
    if (!empty($product['is_archived'])) {
        return array('code' => 'archived', 'label' => 'Архив');
    }
    $has_photos = !empty($product['photo_count']);
    $has_data = trim((string) $product['name']) !== ''
        && trim((string) $product['article']) !== ''
        && $product['price'] !== null;

    if (!empty($product['is_published']) && !empty($product['needs_site_update'])) {
        return array('code' => 'needs_update', 'label' => 'Изменено — обновить на сайте');
    }
    if (!empty($product['is_published'])) {
        return array('code' => 'published', 'label' => 'Опубликован');
    }
    if ($has_photos && $has_data) {
        return array('code' => 'ready', 'label' => 'Готов к публикации');
    }
    if ($has_photos && !$has_data) {
        return array('code' => 'need_price', 'label' => 'Ждёт цену');
    }
    if (!$has_photos && $has_data) {
        return array('code' => 'need_photo', 'label' => 'Ждёт фото');
    }
    return array('code' => 'draft', 'label' => 'Черновик');
}

function log_event($product_id, $user_id, $type, $message) {
    db()->prepare('INSERT INTO product_events (product_id, user_id, event_type, message) VALUES (?, ?, ?, ?)')
        ->execute(array($product_id, $user_id, $type, $message));
}

function create_product($data, $user) {
    $note_updated_at = trim($data['note']) !== '' ? date('Y-m-d H:i:s') : null;
    db()->prepare('INSERT INTO products (name, category, subcategory, article, price, note, note_updated_at, created_by, updated_by)
        VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?)')
        ->execute(array(
            $data['name'], $data['category'], $data['subcategory'], $data['article'],
            $data['price'] === '' ? null : $data['price'], $data['note'], $note_updated_at,
            $user['id'], $user['id'],
        ));
    $id = (int) db()->lastInsertId();
    log_event($id, $user['id'], 'created', 'Карточка создана (' . role_label($user['role']) . ')');
    if ($note_updated_at) {
        // Автор комментария явно знает, что в нём написано — свою же карточку не помечаем непрочитанной.
        ack_note($id, $user, false);
    }
    notify_new_product(get_product($id));
    return $id;
}

// Общая проверка после действий, способных перевести карточку в статус "Готов к публикации"
// (правка данных, добавление/удаление фото) — раздел 8 ТЗ, письмо админу. notify_once сам
// не даёт продублировать письмо по одной и той же карточке.
function check_ready_for_publish($product_id) {
    $product = get_product_with_photo_count($product_id);
    if ($product && product_status($product)['code'] === 'ready') {
        notify_ready_for_publish($product_id, $product['name']);
    }
}

function update_product($id, $data, $user) {
    $before = get_product($id);
    $note_changed = trim((string) $before['note']) !== trim($data['note']);
    $note_updated_at = $note_changed
        ? (trim($data['note']) !== '' ? date('Y-m-d H:i:s') : null)
        : $before['note_updated_at'];

    // Если товар уже опубликован и меняется что-то из того, что видно на сайте (не просто
    // комментарий) — ставим флаг "требует обновления на сайте": разработчик правит
    // catalog-suvenir.html руками, автоматика этого сделать не может.
    $site_fields_changed = false;
    foreach (array('name', 'category', 'subcategory', 'article', 'price') as $field) {
        $old = (string) $before[$field];
        $new = (string) $data[$field];
        if ($old !== $new) {
            $site_fields_changed = true;
            break;
        }
    }
    $needs_site_update = $before['needs_site_update'];
    if (!empty($before['is_published']) && $site_fields_changed) {
        $needs_site_update = 1;
    }

    db()->prepare('UPDATE products SET name = ?, category = ?, subcategory = ?, article = ?, price = ?, note = ?,
        note_updated_at = ?, needs_site_update = ?, updated_by = ?, updated_at = NOW() WHERE id = ?')
        ->execute(array(
            $data['name'], $data['category'], $data['subcategory'], $data['article'],
            $data['price'] === '' ? null : $data['price'], $data['note'], $note_updated_at,
            $needs_site_update, $user['id'], $id,
        ));

    $changes = array();
    foreach (array('name' => 'название', 'category' => 'категория', 'subcategory' => 'подраздел',
                   'article' => 'артикул', 'price' => 'цена') as $field => $label) {
        $old = (string) $before[$field];
        $new = (string) $data[$field];
        if ($old !== $new) {
            $changes[] = $label . ': "' . $old . '" -> "' . $new . '"';
        }
    }
    if ($changes) {
        log_event($id, $user['id'], 'field_changed', implode('; ', $changes) . ' (' . role_label($user['role']) . ')');
        if (!empty($before['is_published']) && empty($before['needs_site_update'])) {
            log_event($id, $user['id'], 'needs_site_update', 'Изменения на опубликованном товаре — нужно поправить сайт');
            notify_needs_site_update($id, $data['name']);
        }
    }
    if ($note_changed) {
        log_event($id, $user['id'], 'note_changed', trim($data['note']) !== ''
            ? 'Изменён комментарий (' . role_label($user['role']) . ')'
            : 'Комментарий удалён (' . role_label($user['role']) . ')');
        if (trim($data['note']) !== '') {
            ack_note($id, $user, false);
        }
    }

    check_ready_for_publish($id);
}

// Отметить комментарий карточки прочитанным для конкретного пользователя.
// $log = false используется при автопометке автору при создании/правке — это не
// самостоятельное событие для истории, только служебное состояние.
function ack_note($product_id, $user, $log = true) {
    db()->prepare('INSERT INTO product_note_acks (product_id, user_id, acked_at) VALUES (?, ?, NOW())
        ON DUPLICATE KEY UPDATE acked_at = NOW()')
        ->execute(array($product_id, $user['id']));
    if ($log) {
        log_event($product_id, $user['id'], 'note_read', 'Отметил(а) комментарий прочитанным (' . role_label($user['role']) . ')');
    }
}

function get_note_ack($product_id, $user_id) {
    $stmt = db()->prepare('SELECT acked_at FROM product_note_acks WHERE product_id = ? AND user_id = ? LIMIT 1');
    $stmt->execute(array($product_id, $user_id));
    $row = $stmt->fetch();
    return $row ? $row['acked_at'] : null;
}

// Комментарий не прочитан для пользователя, если он вообще не отмечал его прочитанным,
// либо с тех пор комментарий поменяли.
function is_note_unread($product, $user_id) {
    if (trim((string) $product['note']) === '') {
        return false;
    }
    $acked_at = get_note_ack($product['id'], $user_id);
    if (!$acked_at) {
        return true;
    }
    return strtotime($acked_at) < strtotime($product['note_updated_at']);
}

function get_product($id) {
    $stmt = db()->prepare('SELECT * FROM products WHERE id = ? LIMIT 1');
    $stmt->execute(array($id));
    return $stmt->fetch();
}

function get_product_with_photo_count($id) {
    $stmt = db()->prepare('SELECT p.*, (SELECT COUNT(*) FROM product_photos WHERE product_id = p.id) photo_count
        FROM products p WHERE p.id = ? LIMIT 1');
    $stmt->execute(array($id));
    return $stmt->fetch();
}

function set_published($id, $published, $user, $auto = false) {
    if ($published) {
        db()->prepare('UPDATE products SET is_published = 1, published_at = NOW() WHERE id = ?')->execute(array($id));
        log_event($id, $user['id'], 'published', $auto
            ? 'Автоматически отмечен опубликованным (найден в каталоге сайта)'
            : 'Товар опубликован на сайте');
        $product = get_product($id);
        notify_published($id, $product['name'], $product['created_by']);
    } else {
        db()->prepare('UPDATE products SET is_published = 0, published_at = NULL WHERE id = ?')->execute(array($id));
        log_event($id, $user['id'], 'unpublished', 'Отметка "опубликован" снята');
    }
}

// Разработчик подтверждает, что перенёс изменения (цену/артикул/название) на сайт вручную.
function mark_site_updated($id, $user) {
    db()->prepare('UPDATE products SET needs_site_update = 0 WHERE id = ?')->execute(array($id));
    log_event($id, $user['id'], 'site_updated', 'Изменения перенесены на сайт');
}

function set_archived($id, $archived, $user) {
    db()->prepare('UPDATE products SET is_archived = ? WHERE id = ?')->execute(array($archived ? 1 : 0, $id));
    log_event($id, $user['id'], $archived ? 'archived' : 'unarchived', $archived ? 'Товар снят с производства (архив)' : 'Товар возвращён из архива');
}

function delete_product($id) {
    db()->prepare('DELETE FROM products WHERE id = ?')->execute(array($id));
}

// Карточки, готовые к выгрузке для публикации на сайте: есть фото, название, артикул,
// цена — но ещё не опубликованы и не в архиве. См. export-publish.php.
function ready_to_publish_products() {
    $sql = 'SELECT p.*, (SELECT COUNT(*) FROM product_photos WHERE product_id = p.id) photo_count
        FROM products p
        WHERE is_archived = 0 AND is_published = 0
        HAVING photo_count > 0 AND name != "" AND article IS NOT NULL AND article != "" AND price IS NOT NULL
        ORDER BY category, name';
    return db()->query($sql)->fetchAll();
}

// Уже опубликованные карточки, у которых после публикации поменялись название/артикул/цена
// (флаг needs_site_update) — для них нужен отдельный экспорт без фото (см. export-updates.php):
// фото на сайте уже есть, меняются только данные существующей позиции.
function products_needing_site_update() {
    $sql = 'SELECT * FROM products
        WHERE is_archived = 0 AND is_published = 1 AND needs_site_update = 1
            AND site_image_path IS NOT NULL AND site_image_path != ""
        ORDER BY category, name';
    return db()->query($sql)->fetchAll();
}

// Карточки "без движения" для еженедельной сводки по Cron (раздел 8 ТЗ): ещё не в
// финальном состоянии (не опубликован без хвостов, или опубликован, но требует правки
// на сайте) и не архивные, и по ним никто не отчитывался дольше $days дней.
function stale_products($days) {
    $stmt = db()->prepare('SELECT * FROM products
        WHERE is_archived = 0 AND NOT (is_published = 1 AND needs_site_update = 0)
            AND updated_at < DATE_SUB(NOW(), INTERVAL ? DAY)
        ORDER BY updated_at ASC');
    $stmt->execute(array($days));
    return $stmt->fetchAll();
}

// Список карточек для таба "В работе" с приоритетом задач роли текущего пользователя.
function list_work_products($user, $filters) {
    // photo_count/note_unread — вычисляемые алиасы, MySQL не даёт ссылаться на них в WHERE,
    // только в HAVING (это же справедливо и для условий по photo_count из фильтра статуса).
    $where = array('is_archived = 0');
    $having = array();
    $params = array();

    if (!empty($filters['status'])) {
        switch ($filters['status']) {
            case 'need_photo':
                $having[] = 'photo_count = 0 AND name != "" AND article IS NOT NULL AND article != "" AND price IS NOT NULL';
                break;
            case 'need_price':
                $having[] = 'photo_count > 0 AND (name = "" OR article IS NULL OR article = "" OR price IS NULL)';
                break;
            case 'ready':
                $having[] = 'photo_count > 0 AND name != "" AND article IS NOT NULL AND article != "" AND price IS NOT NULL AND is_published = 0';
                break;
            case 'published':
                $having[] = 'is_published = 1';
                break;
            case 'needs_update':
                $where[] = 'is_published = 1 AND needs_site_update = 1';
                break;
            case 'draft':
                $having[] = 'photo_count = 0 AND (name = "" OR article IS NULL OR article = "" OR price IS NULL)';
                break;
        }
    }
    if (!empty($filters['category'])) {
        $where[] = 'category = ?';
        $params[] = $filters['category'];
    }
    if (!empty($filters['q'])) {
        $where[] = '(name LIKE ? OR article LIKE ?)';
        $like = '%' . $filters['q'] . '%';
        $params[] = $like;
        $params[] = $like;
    }

    $sql = 'SELECT p.*, (SELECT COUNT(*) FROM product_photos WHERE product_id = p.id) photo_count,
            (p.note IS NOT NULL AND p.note != "" AND (a.acked_at IS NULL OR a.acked_at < p.note_updated_at)) note_unread
        FROM products p
        LEFT JOIN product_note_acks a ON a.product_id = p.id AND a.user_id = ?
        WHERE ' . implode(' AND ', $where)
        . ($having ? ' HAVING ' . implode(' AND ', $having) : '')
        . ' ORDER BY p.updated_at DESC';

    $stmt = db()->prepare($sql);
    $stmt->execute(array_merge(array($user['id']), $params));
    $rows = $stmt->fetchAll();

    $mine_first = array('warehouse' => 'need_photo', 'photo' => 'need_photo', 'accounting' => 'need_price', 'admin' => 'ready');
    $priority_status = isset($mine_first[$user['role']]) ? $mine_first[$user['role']] : null;

    usort($rows, function ($a, $b) use ($priority_status) {
        if ($priority_status) {
            $sa = product_status($a)['code'];
            $sb = product_status($b)['code'];
            $pa = $sa === $priority_status ? 0 : 1;
            $pb = $sb === $priority_status ? 0 : 1;
            if ($pa !== $pb) {
                return $pa - $pb;
            }
        }
        return strtotime($b['updated_at']) - strtotime($a['updated_at']);
    });

    return $rows;
}
