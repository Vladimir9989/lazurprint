<?php
// Заявки «Книга о вашей жизни» (docs/life-book-spec.md). Заявку создаёт src/resources/life-book.php
// на сайте: папка life_book_dir/<id>/ с meta.json, answers.json, answers.doc, photos/, photos.json.
// Здесь только чтение и пометки менеджера (admin.json в той же папке: статус, заметка). Файлы лежат вне
// web-корня и отдаются через life-book-file.php только вошедшим. PHP 7.3.

function lb_base_dir() {
    return rtrim(config_get('life_book_dir', ''), '/\\');
}

function lb_valid_id($id) {
    return (bool) preg_match('/^[0-9]{8}-[0-9]{6}-[a-f0-9]{6}$/', (string) $id);
}

function lb_statuses() {
    return array(
        'new' => 'Новая',
        'work' => 'В работе',
        'proof' => 'Вычитка',
        'layout' => 'Вёрстка',
        'client' => 'Макет у клиента',
        'approved' => 'Утверждена',
        'printed' => 'Напечатана',
        'rejected' => 'Отказ',
    );
}

function lb_read_json($path) {
    if (!is_file($path)) {
        return null;
    }
    $data = json_decode(file_get_contents($path), true);
    return is_array($data) ? $data : null;
}

// Заявка целиком (meta + пометки менеджера) или null
function lb_get($id) {
    $base = lb_base_dir();
    if ($base === '' || !lb_valid_id($id) || !is_dir($base . '/' . $id)) {
        return null;
    }
    $meta = lb_read_json($base . '/' . $id . '/meta.json');
    if (!$meta) {
        return null;
    }
    $admin = lb_read_json($base . '/' . $id . '/admin.json');
    $meta['admin'] = array_merge(array('status' => 'new', 'note' => '', 'updated' => '', 'by' => ''), $admin ? $admin : array());
    return $meta;
}

function lb_list() {
    $base = lb_base_dir();
    $rows = array();
    if ($base === '' || !is_dir($base)) {
        return $rows;
    }
    foreach (scandir($base) as $name) {
        if (lb_valid_id($name)) {
            $row = lb_get($name);
            if ($row) {
                $rows[] = $row;
            }
        }
    }
    usort($rows, function ($a, $b) {
        return strcmp($b['id'], $a['id']);
    });
    return $rows;
}

function lb_set_admin($id, $status, $note, $user_name) {
    $base = lb_base_dir();
    if (!lb_valid_id($id) || !is_dir($base . '/' . $id) || !array_key_exists($status, lb_statuses())) {
        return false;
    }
    $data = array(
        'status' => $status,
        'note' => mb_substr($note, 0, 5000),
        'updated' => date('c'),
        'by' => $user_name,
    );
    return file_put_contents($base . '/' . $id . '/admin.json', json_encode($data, JSON_UNESCAPED_UNICODE | JSON_PRETTY_PRINT)) !== false;
}

function lb_photos($id) {
    $base = lb_base_dir();
    $list = lb_read_json($base . '/' . $id . '/photos.json');
    return $list ? $list : array();
}

// Заявка, которую начали отправлять, но не закончили, и прошло больше суток
function lb_is_stale($row) {
    return $row['status'] === 'uploading' && strtotime($row['created']) < time() - 86400;
}

function lb_row_label($row) {
    if ($row['status'] === 'uploading') {
        return lb_is_stale($row) ? 'Не отправлена до конца' : 'Загружается…';
    }
    $s = lb_statuses();
    return isset($s[$row['admin']['status']]) ? $s[$row['admin']['status']] : $row['admin']['status'];
}

// Отдаёт ZIP с фото и ответами заявки и завершает запрос. Возвращает текст ошибки.
function lb_send_zip($id) {
    $base = lb_base_dir();
    if (!lb_valid_id($id) || !is_dir($base . '/' . $id)) {
        return 'Заявка не найдена.';
    }
    if (!class_exists('ZipArchive')) {
        return 'На сервере нет ZIP. Скачивайте фото по одному.';
    }
    $tmp = tempnam(sys_get_temp_dir(), 'lbz');
    $zip = new ZipArchive();
    if ($zip->open($tmp, ZipArchive::OVERWRITE) !== true) {
        return 'Не удалось собрать архив.';
    }
    foreach (glob($base . '/' . $id . '/photos/*') as $file) {
        $zip->addFile($file, 'photos/' . basename($file));
    }
    foreach (array('answers.doc', 'photos.json') as $extra) {
        if (is_file($base . '/' . $id . '/' . $extra)) {
            $zip->addFile($base . '/' . $id . '/' . $extra, $extra);
        }
    }
    $zip->close();
    header('Content-Type: application/zip');
    header('Content-Disposition: attachment; filename="kniga-' . $id . '.zip"');
    header('Content-Length: ' . filesize($tmp));
    header('X-Content-Type-Options: nosniff');
    readfile($tmp);
    unlink($tmp);
    exit;
}

// Справочник вопросов/переплётов/шрифтов: на хостинге лежит в корне сайта (рядом с admin/), локально — в dist/ или src/resources/
function lb_data() {
    static $data = null;
    if ($data === null) {
        $root = dirname(__DIR__, 2);
        $data = array('chapters' => array(), 'bindings' => array(), 'fonts' => array());
        foreach (array('/life-book-data.json', '/dist/life-book-data.json', '/src/resources/life-book-data.json') as $rel) {
            $loaded = lb_read_json($root . $rel);
            if ($loaded) {
                $data = $loaded;
                break;
            }
        }
    }
    return $data;
}

function lb_binding_label($size_id) {
    $data = lb_data();
    foreach ($data['bindings'] as $b) {
        foreach ($b['sizes'] as $s) {
            if ($s['id'] === $size_id) {
                return $b['name'] . ', ' . $s['name'];
            }
        }
    }
    return (string) $size_id;
}

function lb_font_label($font_id) {
    $data = lb_data();
    foreach ($data['fonts'] as $f) {
        if ($f['id'] === $font_id) {
            return $f['name'];
        }
    }
    return (string) $font_id;
}
