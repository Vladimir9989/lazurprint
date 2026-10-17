<?php
// Каталог образцов для писем (docs/growth/leads-admin.md, часть 3). Загружается одно
// фото: сервер делает оригинал для письма (длинная сторона до 1600 px, до ~800 КБ) и
// превью ~300 px. Файлы лежат вне web-корня (uploads_dir/samples), отдаются через
// sample.php только вошедшим пользователям.

define('SAMPLE_MAX_SIDE', 1600);
define('SAMPLE_THUMB_SIDE', 300);
define('SAMPLE_MAX_BYTES', 800 * 1024);

function sample_dir() {
    $dir = rtrim(config('uploads_dir'), '/\\') . '/samples';
    if (!is_dir($dir)) {
        mkdir($dir, 0775, true);
    }
    return $dir;
}

function sample_categories() {
    return db()->query('SELECT c.*, (SELECT COUNT(*) FROM samples s WHERE s.category_id = c.id) AS cnt
        FROM sample_categories c ORDER BY c.sort_order, c.id')->fetchAll();
}

function sample_list($category_id = 0) {
    if ($category_id) {
        $stmt = db()->prepare('SELECT * FROM samples WHERE category_id = ? ORDER BY id DESC');
        $stmt->execute(array($category_id));
        return $stmt->fetchAll();
    }
    return db()->query('SELECT * FROM samples ORDER BY category_id, id DESC')->fetchAll();
}

function sample_get($id) {
    $stmt = db()->prepare('SELECT * FROM samples WHERE id = ? LIMIT 1');
    $stmt->execute(array($id));
    return $stmt->fetch();
}

// Категории, рекомендованные для сегмента клиента (список сегментов через запятую).
function sample_recommended_category_ids($segment) {
    $segment = mb_strtolower(trim((string) $segment));
    $ids = array();
    if ($segment === '') {
        return $ids;
    }
    foreach (sample_categories() as $c) {
        foreach (explode(',', mb_strtolower($c['segments'])) as $s) {
            if (trim($s) !== '' && trim($s) === $segment) {
                $ids[] = (int) $c['id'];
                break;
            }
        }
    }
    return $ids;
}

function sample_load_image($path, $mime) {
    switch ($mime) {
        case 'image/jpeg':
            $img = @imagecreatefromjpeg($path);
            if ($img && function_exists('exif_read_data')) {
                $exif = @exif_read_data($path);
                $o = isset($exif['Orientation']) ? (int) $exif['Orientation'] : 1;
                $angle = ($o === 3) ? 180 : (($o === 6) ? -90 : (($o === 8) ? 90 : 0));
                if ($angle) {
                    $rot = imagerotate($img, $angle, 0);
                    if ($rot) {
                        imagedestroy($img);
                        $img = $rot;
                    }
                }
            }
            return $img;
        case 'image/png':
            return @imagecreatefrompng($path);
        case 'image/webp':
            return function_exists('imagecreatefromwebp') ? @imagecreatefromwebp($path) : false;
    }
    return false;
}

function sample_resize($src, $max_side) {
    $w = imagesx($src);
    $h = imagesy($src);
    $scale = min(1, $max_side / max($w, $h));
    $tw = max(1, (int) round($w * $scale));
    $th = max(1, (int) round($h * $scale));
    $dst = imagecreatetruecolor($tw, $th);
    // Белая подложка: у PNG/WebP с прозрачностью иначе получился бы чёрный фон.
    imagefill($dst, 0, 0, imagecolorallocate($dst, 255, 255, 255));
    imagecopyresampled($dst, $src, 0, 0, 0, 0, $tw, $th, $w, $h);
    return $dst;
}

// $tmp_path — загруженный временный файл. Возвращает true либо текст ошибки.
function sample_save_upload($tmp_path, $original_name, $category_id, $title, $user_id) {
    @ini_set('memory_limit', '512M');
    $stmt = db()->prepare('SELECT id FROM sample_categories WHERE id = ? LIMIT 1');
    $stmt->execute(array($category_id));
    if (!$stmt->fetch()) {
        return 'Выберите категорию.';
    }
    $finfo = new finfo(FILEINFO_MIME_TYPE);
    $mime = $finfo->file($tmp_path);
    if (!in_array($mime, array('image/jpeg', 'image/png', 'image/webp'), true)) {
        return $original_name . ': допустимы JPG, PNG, WebP.';
    }
    $src = sample_load_image($tmp_path, $mime);
    if (!$src) {
        return $original_name . ': не удалось прочитать изображение.';
    }

    $full = sample_resize($src, SAMPLE_MAX_SIDE);
    imagedestroy($src);

    $base = bin2hex(random_bytes(12));
    $filename = $base . '.jpg';
    $dir = sample_dir();
    $dest = $dir . '/' . $filename;

    $quality = 85;
    do {
        imagejpeg($full, $dest, $quality);
        clearstatcache(true, $dest);
        $quality -= 7;
    } while (filesize($dest) > SAMPLE_MAX_BYTES && $quality >= 55);

    $thumb = sample_resize($full, SAMPLE_THUMB_SIDE);
    imagejpeg($thumb, $dir . '/thumb_' . $filename, 80);
    $w = imagesx($full);
    $h = imagesy($full);
    imagedestroy($thumb);
    imagedestroy($full);

    if ($title === '') {
        $title = pathinfo($original_name, PATHINFO_FILENAME);
    }
    db()->prepare('INSERT INTO samples (category_id, title, filename, original_name, size_bytes, width, height, uploaded_by)
        VALUES (?, ?, ?, ?, ?, ?, ?, ?)')
        ->execute(array($category_id, mb_substr($title, 0, 255), $filename, mb_substr($original_name, 0, 255),
            filesize($dest), $w, $h, $user_id));
    return true;
}

function sample_delete($id) {
    $s = sample_get($id);
    if (!$s) {
        return;
    }
    $dir = sample_dir();
    @unlink($dir . '/' . $s['filename']);
    @unlink($dir . '/thumb_' . $s['filename']);
    db()->prepare('DELETE FROM samples WHERE id = ?')->execute(array($id));
}

function sample_category_delete($id) {
    foreach (sample_list($id) as $s) {
        sample_delete($s['id']);
    }
    db()->prepare('DELETE FROM sample_categories WHERE id = ?')->execute(array($id));
}

function sample_translit($text) {
    $map = array('а' => 'a', 'б' => 'b', 'в' => 'v', 'г' => 'g', 'д' => 'd', 'е' => 'e', 'ё' => 'e', 'ж' => 'zh',
        'з' => 'z', 'и' => 'i', 'й' => 'y', 'к' => 'k', 'л' => 'l', 'м' => 'm', 'н' => 'n', 'о' => 'o', 'п' => 'p',
        'р' => 'r', 'с' => 's', 'т' => 't', 'у' => 'u', 'ф' => 'f', 'х' => 'h', 'ц' => 'ts', 'ч' => 'ch', 'ш' => 'sh',
        'щ' => 'sch', 'ъ' => '', 'ы' => 'y', 'ь' => '', 'э' => 'e', 'ю' => 'yu', 'я' => 'ya');
    $text = strtr(mb_strtolower($text), $map);
    $text = preg_replace('/[^a-z0-9]+/', '-', $text);
    return trim($text, '-') !== '' ? trim($text, '-') : 'foto';
}

// Отправляет ZIP выбранных образцов и завершает запрос. Возвращает текст ошибки, если не вышло.
function sample_send_zip($ids) {
    if (!class_exists('ZipArchive')) {
        return 'На сервере нет расширения zip.';
    }
    $ids = array_values(array_unique(array_filter(array_map('intval', (array) $ids))));
    if (!$ids) {
        return 'Отметьте хотя бы одно фото.';
    }
    $in = implode(',', array_fill(0, count($ids), '?'));
    $stmt = db()->prepare("SELECT s.*, c.name AS category_name FROM samples s
        JOIN sample_categories c ON c.id = s.category_id WHERE s.id IN ($in) ORDER BY s.category_id, s.id");
    $stmt->execute($ids);
    $rows = $stmt->fetchAll();
    if (!$rows) {
        return 'Фото не найдены.';
    }
    $tmp = tempnam(sys_get_temp_dir(), 'smp');
    $zip = new ZipArchive();
    if ($zip->open($tmp, ZipArchive::CREATE | ZipArchive::OVERWRITE) !== true) {
        return 'Не удалось собрать архив.';
    }
    $dir = sample_dir();
    $n = 0;
    foreach ($rows as $r) {
        $path = $dir . '/' . $r['filename'];
        if (is_file($path)) {
            $n++;
            $zip->addFile($path, sprintf('%02d-%s-%s.jpg', $n, sample_translit($r['category_name']), sample_translit($r['title'])));
        }
    }
    $zip->close();
    if ($n === 0) {
        @unlink($tmp);
        return 'Файлы фото не найдены на диске.';
    }
    header('Content-Type: application/zip');
    header('Content-Disposition: attachment; filename="lazur-obrazcy-' . date('Y-m-d') . '.zip"');
    header('Content-Length: ' . filesize($tmp));
    readfile($tmp);
    @unlink($tmp);
    exit;
}
