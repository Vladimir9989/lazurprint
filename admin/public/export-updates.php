<?php
require_once __DIR__ . '/../src/bootstrap.php';

// Экспорт изменений по уже опубликованным карточкам (см. admin/README.md, раздел
// «Публикация новой продукции на сайт»): в отличие от export-publish.php фото не нужны —
// товар уже на сайте, меняются только название/артикул/цена. ZIP с одним manifest.json,
// по формату похож на export-publish.php, чтобы разбирать его тем же способом.

$user = require_login();
if (!is_admin_user($user)) {
    http_response_code(403);
    exit('Недостаточно прав');
}

$products = products_needing_site_update();
if (!$products) {
    flash('error', 'Нет карточек с изменениями, ожидающими переноса на сайт.');
    redirect('index.php');
}

$manifest = array();
foreach ($products as $p) {
    $manifest[] = array(
        'id' => (int) $p['id'],
        'name' => $p['name'],
        'category' => $p['category'],
        'subcategory' => $p['subcategory'],
        'article' => $p['article'],
        'price' => format_price_plain($p['price']),
        'site_image_path' => $p['site_image_path'],
    );
}

$tmp_zip = tempnam(sys_get_temp_dir(), 'export_updates_');
$zip = new ZipArchive();
if ($zip->open($tmp_zip, ZipArchive::OVERWRITE) !== true) {
    flash('error', 'Не удалось создать архив.');
    redirect('index.php');
}
$zip->addFromString('manifest.json', json_encode($manifest, JSON_UNESCAPED_UNICODE | JSON_PRETTY_PRINT));
$zip->close();

$filename = 'export-updates-' . date('Y-m-d-His') . '.zip';
header('Content-Type: application/zip');
header('Content-Disposition: attachment; filename="' . $filename . '"');
header('Content-Length: ' . filesize($tmp_zip));
readfile($tmp_zip);
unlink($tmp_zip);
exit;
