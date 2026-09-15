<?php

define('MAX_PHOTOS_PER_PRODUCT', 10);
define('THUMB_SIZE', 400);

function product_upload_dir($product_id) {
    $dir = rtrim(config('uploads_dir'), '/\\') . '/' . $product_id;
    if (!is_dir($dir)) {
        mkdir($dir, 0775, true);
    }
    return $dir;
}

function list_product_photos($product_id) {
    $stmt = db()->prepare('SELECT * FROM product_photos WHERE product_id = ? ORDER BY is_main DESC, sort_order ASC, id ASC');
    $stmt->execute(array($product_id));
    return $stmt->fetchAll();
}

function count_product_photos($product_id) {
    $stmt = db()->prepare('SELECT COUNT(*) c FROM product_photos WHERE product_id = ?');
    $stmt->execute(array($product_id));
    return (int) $stmt->fetch()['c'];
}

// $tmp_path — путь к уже загруженному (move_uploaded_file) временному файлу.
// Возвращает true либо строку с ошибкой.
function save_product_photo($product_id, $tmp_path, $original_name, $user_id) {
    if (count_product_photos($product_id) >= MAX_PHOTOS_PER_PRODUCT) {
        return 'Достигнут лимит в ' . MAX_PHOTOS_PER_PRODUCT . ' фото на карточку.';
    }

    $finfo = new finfo(FILEINFO_MIME_TYPE);
    $mime = $finfo->file($tmp_path);
    $ext_by_mime = array(
        'image/jpeg' => 'jpg',
        'image/png' => 'png',
        'image/webp' => 'webp',
        'image/heic' => 'heic',
        'image/heif' => 'heic',
    );
    if (!isset($ext_by_mime[$mime])) {
        return 'Неподдерживаемый тип файла: ' . h($mime);
    }
    $ext = $ext_by_mime[$mime];

    $dir = product_upload_dir($product_id);
    $filename = bin2hex(random_bytes(16)) . '.' . $ext;
    $dest = $dir . '/' . $filename;

    if (!move_uploaded_file($tmp_path, $dest)) {
        return 'Не удалось сохранить файл.';
    }

    $width = null;
    $height = null;
    if (in_array($ext, array('jpg', 'png', 'webp'), true)) {
        $info = @getimagesize($dest);
        if ($info) {
            $width = $info[0];
            $height = $info[1];
        }
        make_thumbnail($dest, thumb_path($dir, $filename, $ext), $ext);
    }

    $is_main = count_product_photos($product_id) === 0 ? 1 : 0;

    db()->prepare('INSERT INTO product_photos
        (product_id, filename, original_name, size_bytes, width, height, is_main, uploaded_by)
        VALUES (?, ?, ?, ?, ?, ?, ?, ?)')
        ->execute(array($product_id, $filename, $original_name, filesize($dest), $width, $height, $is_main, $user_id));

    log_event($product_id, $user_id, 'photo_added', 'Загружено фото: ' . $original_name);
    check_ready_for_publish($product_id);

    return true;
}

// Расширение превью совпадает с оригиналом, кроме png/webp -> хранится как есть,
// но кодируется в jpg внутри make_thumbnail (кроме png, там нужна прозрачность).
function thumb_path($dir, $filename, $ext) {
    $thumb_ext = $ext === 'png' ? 'png' : 'jpg';
    return $dir . '/thumb_' . pathinfo($filename, PATHINFO_FILENAME) . '.' . $thumb_ext;
}

function make_thumbnail($src_path, $dest_path, $ext) {
    switch ($ext) {
        case 'jpg':
            $src = @imagecreatefromjpeg($src_path);
            break;
        case 'png':
            $src = @imagecreatefrompng($src_path);
            break;
        case 'webp':
            $src = function_exists('imagecreatefromwebp') ? @imagecreatefromwebp($src_path) : false;
            break;
        default:
            $src = false;
    }
    if (!$src) {
        return false;
    }

    $w = imagesx($src);
    $h = imagesy($src);
    $scale = min(1, THUMB_SIZE / max($w, $h));
    $tw = max(1, (int) round($w * $scale));
    $th = max(1, (int) round($h * $scale));

    $thumb = imagecreatetruecolor($tw, $th);
    if ($ext === 'png') {
        imagealphablending($thumb, false);
        imagesavealpha($thumb, true);
    }
    imagecopyresampled($thumb, $src, 0, 0, 0, 0, $tw, $th, $w, $h);

    if ($ext === 'png') {
        imagepng($thumb, $dest_path);
    } else {
        imagejpeg($thumb, $dest_path, 82);
    }

    imagedestroy($src);
    imagedestroy($thumb);
    return true;
}

function delete_product_photo($photo_id, $product_id, $user_id) {
    $stmt = db()->prepare('SELECT * FROM product_photos WHERE id = ? AND product_id = ? LIMIT 1');
    $stmt->execute(array($photo_id, $product_id));
    $photo = $stmt->fetch();
    if (!$photo) {
        return;
    }

    $dir = product_upload_dir($product_id);
    $ext = strtolower(pathinfo($photo['filename'], PATHINFO_EXTENSION));
    @unlink($dir . '/' . $photo['filename']);
    @unlink(thumb_path($dir, $photo['filename'], $ext));

    db()->prepare('DELETE FROM product_photos WHERE id = ?')->execute(array($photo_id));

    if (!empty($photo['is_main'])) {
        db()->prepare('UPDATE product_photos SET is_main = 1 WHERE product_id = ? ORDER BY sort_order ASC, id ASC LIMIT 1')
            ->execute(array($product_id));
    }

    log_event($product_id, $user_id, 'photo_deleted', 'Удалено фото: ' . $photo['original_name']);
}

// Удаляет только тяжёлые оригиналы (превью ~400px остаются навсегда, см. thumb_path) —
// карточка, фото-превью и история после этого остаются как есть, не пустеют. Раздел 7 ТЗ.
function delete_product_originals($product_id, $user_id) {
    $photos = list_product_photos($product_id);
    $dir = product_upload_dir($product_id);
    $deleted = 0;
    foreach ($photos as $photo) {
        if ($photo['original_deleted_at'] !== null) {
            continue;
        }
        @unlink($dir . '/' . $photo['filename']);
        db()->prepare('UPDATE product_photos SET original_deleted_at = NOW() WHERE id = ?')
            ->execute(array($photo['id']));
        $deleted++;
    }

    db()->prepare('UPDATE products SET originals_deleted_at = NOW() WHERE id = ?')->execute(array($product_id));
    log_event($product_id, $user_id, 'originals_deleted', 'Удалены оригиналы фото (' . $deleted . ' шт.), превью сохранены');
}

// Раздел 7 ТЗ, п.3: счётчик "оригиналов на диске" на главной. Берём size_bytes из базы,
// а не сканируем диск — они уже посчитаны при загрузке и не меняются, пока файл жив.
function originals_disk_usage_bytes() {
    $row = db()->query('SELECT COALESCE(SUM(size_bytes), 0) c FROM product_photos WHERE original_deleted_at IS NULL')->fetch();
    return (int) $row['c'];
}

// Раздел 7 ТЗ, п.2: автоудаление оригиналов Cron'ом раз в неделю у опубликованных
// больше $days дней назад карточек, ещё не почищенных вручную.
function products_due_for_originals_cleanup($days) {
    $stmt = db()->prepare("SELECT * FROM products WHERE is_published = 1 AND originals_deleted_at IS NULL
        AND published_at IS NOT NULL AND published_at < DATE_SUB(NOW(), INTERVAL ? DAY)");
    $stmt->execute(array($days));
    return $stmt->fetchAll();
}

// Карточки, которым до автоудаления оригиналов остаётся меньше $warn_days_before дней —
// на них нужно успеть предупредить админа письмом со списком (раздел 7 ТЗ, п.2).
function products_nearing_originals_cleanup($days, $warn_days_before) {
    $stmt = db()->prepare("SELECT * FROM products WHERE is_published = 1 AND originals_deleted_at IS NULL
        AND published_at IS NOT NULL
        AND published_at < DATE_SUB(NOW(), INTERVAL ? DAY)
        AND published_at >= DATE_SUB(NOW(), INTERVAL ? DAY)");
    $stmt->execute(array($days - $warn_days_before, $days));
    return $stmt->fetchAll();
}

function photo_disk_path($product_id, $photo, $want_thumb) {
    $dir = product_upload_dir($product_id);
    if (!$want_thumb) {
        return $dir . '/' . $photo['filename'];
    }
    $ext = strtolower(pathinfo($photo['filename'], PATHINFO_EXTENSION));
    $path = thumb_path($dir, $photo['filename'], $ext);
    return is_file($path) ? $path : $dir . '/' . $photo['filename'];
}
