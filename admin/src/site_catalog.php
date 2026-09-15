<?php

// Этап 2: разбор реального каталога сайта (catalog-suvenir.html) и связь с карточками.
// См. docs/admin-panel.md, раздел 6. Ключ сверки — пара (путь к картинке, артикул),
// не сам артикул (он не уникален — например, все магниты "Екатеринбург 50x70" разных
// сюжетов делят один артикул).

function dom_class_has($el, $class) {
    $attr = $el->getAttribute('class');
    return in_array($class, preg_split('/\s+/', trim($attr)), true);
}

function dom_find_text($xpath, $context, $class) {
    $nodes = $xpath->query(".//*[contains(concat(' ', normalize-space(@class), ' '), ' " . $class . " ')]", $context);
    if (!$nodes->length) {
        return '';
    }
    $text = $nodes->item(0)->textContent;
    return trim(preg_replace('/\s+/u', ' ', $text));
}

// Возвращает массив строк: image_path, article, name, price, category, subcategory.
function parse_site_catalog_html($path) {
    if (!is_file($path)) {
        throw new RuntimeException('Файл каталога не найден: ' . $path);
    }
    $html = file_get_contents($path);
    if ($html === false || trim($html) === '') {
        throw new RuntimeException('Не удалось прочитать файл каталога: ' . $path);
    }

    libxml_use_internal_errors(true);
    $dom = new DOMDocument();
    // Принудительно UTF-8: DOMDocument иначе иногда не успевает увидеть <meta charset>,
    // если она не в самом начале <head> (в этом файле она не первая, после метрики).
    $dom->loadHTML('<?xml encoding="utf-8">' . $html);
    libxml_clear_errors();

    $xpath = new DOMXPath($dom);
    $sections = $xpath->query("//*[contains(concat(' ', normalize-space(@class), ' '), ' catalog__section ')]");

    $rows = array();
    foreach ($sections as $section) {
        $category = trim($section->getAttribute('data-category-name'));
        $subcategory = '';

        foreach ($section->childNodes as $child) {
            if ($child->nodeType !== XML_ELEMENT_NODE) {
                continue;
            }
            if (dom_class_has($child, 'catalog__subtitle')) {
                $subcategory = trim(preg_replace('/\s+/u', ' ', $child->textContent));
                continue;
            }
            if (!dom_class_has($child, 'catalog__list')) {
                continue;
            }
            $items = $xpath->query(".//*[contains(concat(' ', normalize-space(@class), ' '), ' catalog__item ')]", $child);
            foreach ($items as $item) {
                $imgs = $item->getElementsByTagName('img');
                $image_path = $imgs->length ? trim($imgs->item(0)->getAttribute('src')) : '';
                if ($image_path === '') {
                    continue;
                }
                $name = dom_find_text($xpath, $item, 'catalog-item__name');
                $price = dom_find_text($xpath, $item, 'catalog-item__price');
                $number = dom_find_text($xpath, $item, 'catalog-item__number');
                $article = trim(preg_replace('/^арт\.?:?\s*/ui', '', $number));

                $rows[] = array(
                    'image_path' => $image_path,
                    'article' => $article,
                    'name' => $name,
                    'price' => $price,
                    'category' => $category,
                    'subcategory' => $subcategory,
                );
            }
        }
    }

    return $rows;
}

// Полностью пересобирает таблицу site_catalog из файла каталога сайта.
function resync_site_catalog() {
    $path = config('catalog_html_path');
    $rows = parse_site_catalog_html($path);

    $pdo = db();
    $pdo->beginTransaction();
    try {
        $pdo->exec('DELETE FROM site_catalog');
        $stmt = $pdo->prepare('INSERT IGNORE INTO site_catalog (image_path, article, name, price, category, subcategory)
            VALUES (?, ?, ?, ?, ?, ?)');
        $inserted = 0;
        foreach ($rows as $r) {
            $stmt->execute(array($r['image_path'], $r['article'], $r['name'], $r['price'], $r['category'], $r['subcategory']));
            $inserted += $stmt->rowCount();
        }
        $pdo->commit();
    } catch (Exception $e) {
        $pdo->rollBack();
        throw $e;
    }

    return array('parsed' => count($rows), 'inserted' => $inserted);
}

function site_catalog_categories() {
    return db()->query('SELECT DISTINCT category FROM site_catalog WHERE category != "" ORDER BY category')->fetchAll(PDO::FETCH_COLUMN);
}

function site_catalog_stats() {
    return db()->query('SELECT COUNT(*) c, MAX(synced_at) synced_at FROM site_catalog')->fetch();
}

function search_site_catalog($category, $q, $limit = 300) {
    $where = array();
    $params = array();
    if ($category !== '') {
        $where[] = 'category = ?';
        $params[] = $category;
    }
    if ($q !== '') {
        $where[] = '(name LIKE ? OR article LIKE ? OR image_path LIKE ?)';
        $like = '%' . $q . '%';
        $params[] = $like;
        $params[] = $like;
        $params[] = $like;
    }
    $sql = 'SELECT * FROM site_catalog'
        . ($where ? ' WHERE ' . implode(' AND ', $where) : '')
        . ' ORDER BY category, subcategory, name LIMIT ' . (int) $limit;
    $stmt = db()->prepare($sql);
    $stmt->execute($params);
    return $stmt->fetchAll();
}

// "93 руб." -> "93". Формат берётся из вёрстки сайта (см. parse_site_catalog_html).
function parse_site_price($price) {
    $price = str_replace(array("\xC2\xA0", ' '), '', $price);
    $price = preg_replace('/[^\d,.]/u', '', $price);
    $price = str_replace(',', '.', $price);
    return $price === '' ? null : $price;
}

// Найти карточку в админке, уже привязанную к этой позиции на сайте (по пути к картинке —
// тот же ключ, что использует product_site_match_exists).
function find_product_by_site_image($image_path) {
    $stmt = db()->prepare('SELECT * FROM products WHERE site_image_path = ? AND is_archived = 0 ORDER BY id LIMIT 1');
    $stmt->execute(array($image_path));
    return $stmt->fetch();
}

// Кнопка "Редактировать" в разделе "Что на сайте" для позиции, у которой ещё нет карточки
// в админке: заводим карточку с данными как на сайте — она уже реально опубликована, поэтому
// is_published сразу 1, редактировать даст только name/article/price/category.
function create_product_from_site_row($row, $user) {
    db()->prepare('INSERT INTO products (name, category, subcategory, article, price, site_image_path,
            is_published, published_at, created_by, updated_by)
        VALUES (?, ?, ?, ?, ?, ?, 1, NOW(), ?, ?)')
        ->execute(array(
            $row['name'], $row['category'], $row['subcategory'], $row['article'],
            parse_site_price($row['price']), $row['image_path'], $user['id'], $user['id'],
        ));
    $id = (int) db()->lastInsertId();
    log_event($id, $user['id'], 'created', 'Карточка заведена из «Что на сайте» для редактирования существующей позиции');
    return $id;
}

function product_site_match_exists($product) {
    if (empty($product['site_image_path']) || $product['article'] === null || trim((string) $product['article']) === '') {
        return false;
    }
    $stmt = db()->prepare('SELECT 1 FROM site_catalog WHERE image_path = ? AND article = ? LIMIT 1');
    $stmt->execute(array($product['site_image_path'], $product['article']));
    return (bool) $stmt->fetch();
}

// Привязка карточки к позиции в каталоге сайта (выбирается из списка "Что на сайте",
// а не вписывается руками — так решили при обсуждении).
function set_product_site_image($id, $image_path, $user) {
    db()->prepare('UPDATE products SET site_image_path = ? WHERE id = ?')
        ->execute(array($image_path === '' ? null : $image_path, $id));
    log_event($id, $user['id'], 'site_link', $image_path !== ''
        ? 'Привязана карточка на сайте: ' . $image_path
        : 'Связь с карточкой на сайте снята');
}

// Если у карточки есть привязка и она находится в свежем снимке каталога — ставим
// "опубликован" автоматически. Обратного (снятия отметки) не делаем — это осталось
// ручным действием админа, автоматика только продвигает вперёд.
function refresh_product_published_status($product_id, $user) {
    $product = get_product($product_id);
    if (!$product || !empty($product['is_published'])) {
        return false;
    }
    if (product_site_match_exists($product)) {
        set_published($product_id, true, $user, true);
        return true;
    }
    return false;
}

function auto_publish_after_sync($user) {
    $ids = db()->query("SELECT id FROM products WHERE is_published = 0 AND is_archived = 0
        AND site_image_path IS NOT NULL AND site_image_path != ''
        AND article IS NOT NULL AND article != ''")->fetchAll(PDO::FETCH_COLUMN);
    $count = 0;
    foreach ($ids as $id) {
        if (refresh_product_published_status($id, $user)) {
            $count++;
        }
    }
    return $count;
}
