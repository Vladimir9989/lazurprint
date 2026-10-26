<?php
// Массовая загрузка фото-образцов с диска (то же, что форма на странице «Образцы»).
//
//   php admin/tools/import-samples.php /путь/к/папке [--dry]
//
// В папке — файлы JPG/PNG/WebP и manifest.json: [{"file":"a.jpg","category":"Книги","title":"Название"}, ...].
// Нет такой категории — создаётся. Фото записываются на имя первого администратора.
// На хостинге папку нужно сначала залить на сервер, потом: node admin-remote-exec.js admin/tools/import-samples.php /путь

require_once __DIR__ . '/../src/db.php';
require_once __DIR__ . '/../src/samples.php';

$dir = null;
$dry = false;
foreach (array_slice($argv, 1) as $arg) {
    if ($arg === '--dry') {
        $dry = true;
    } else {
        $dir = rtrim($arg, '/\\');
    }
}
if (!$dir || !is_file($dir . '/manifest.json')) {
    fwrite(STDERR, "Укажите папку с manifest.json.\n");
    exit(1);
}
$items = json_decode(file_get_contents($dir . '/manifest.json'), true);
if (!is_array($items)) {
    fwrite(STDERR, "manifest.json не читается.\n");
    exit(1);
}

$admin = db()->query("SELECT id FROM users WHERE role = 'admin' AND status = 'active' ORDER BY id LIMIT 1")->fetch();
$uid = $admin ? (int) $admin['id'] : null;

$ok = 0;
$bad = 0;
foreach ($items as $it) {
    $path = $dir . '/' . $it['file'];
    if (!is_file($path)) {
        echo "НЕТ ФАЙЛА: {$it['file']}\n";
        $bad++;
        continue;
    }
    if ($dry) {
        echo "ok: {$it['file']} → {$it['category']} / {$it['title']}\n";
        $ok++;
        continue;
    }
    $stmt = db()->prepare('SELECT id FROM sample_categories WHERE name = ? LIMIT 1');
    $stmt->execute(array($it['category']));
    $row = $stmt->fetch();
    if ($row) {
        $cat = (int) $row['id'];
    } else {
        $max = (int) db()->query('SELECT COALESCE(MAX(sort_order), 0) m FROM sample_categories')->fetch()['m'];
        db()->prepare('INSERT INTO sample_categories (name, segments, sort_order) VALUES (?, ?, ?)')
            ->execute(array($it['category'], '', $max + 10));
        $cat = (int) db()->lastInsertId();
    }
    $r = sample_save_upload($path, $it['file'], $cat, $it['title'], $uid);
    if ($r === true) {
        $ok++;
    } else {
        echo "ОШИБКА: $r\n";
        $bad++;
    }
}
echo "Готово: загружено $ok, ошибок $bad" . ($dry ? ' (проверка, ничего не записано)' : '') . "\n";
