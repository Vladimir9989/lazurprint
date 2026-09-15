<?php
require_once __DIR__ . '/../src/bootstrap.php';

// Экспорт для публикации на сайт (см. docs/admin-panel.md, раздел 7 и 12): один ZIP
// с оригиналами фото всех карточек, готовых к публикации, плюс manifest.json с их
// данными (название/категория/артикул/цена). Разработчик скачивает этот архив и
// просит Claude разместить продукцию на сайте, не открывая админку по каждой карточке.

$user = require_login();
if (!is_admin_user($user)) {
    http_response_code(403);
    exit('Недостаточно прав');
}

$products = ready_to_publish_products();
if (!$products) {
    flash('error', 'Нет карточек, готовых к публикации (нужны фото, название, артикул и цена).');
    redirect('index.php');
}

$tmp_zip = tempnam(sys_get_temp_dir(), 'export_publish_');
$zip = new ZipArchive();
if ($zip->open($tmp_zip, ZipArchive::OVERWRITE) !== true) {
    flash('error', 'Не удалось создать архив.');
    redirect('index.php');
}

$manifest = array();
foreach ($products as $p) {
    $photos = list_product_photos($p['id']);
    $entry_photos = array();
    $i = 0;
    foreach ($photos as $photo) {
        $disk_path = photo_disk_path($p['id'], $photo, false);
        if (!is_file($disk_path)) {
            continue;
        }
        $i++;
        $ext = strtolower(pathinfo($photo['filename'], PATHINFO_EXTENSION));
        $zip_name = 'products/' . $p['id'] . '/' . str_pad((string) $i, 2, '0', STR_PAD_LEFT) . '.' . $ext;
        $zip->addFile($disk_path, $zip_name);
        $entry_photos[] = $zip_name;
    }
    $manifest[] = array(
        'id' => (int) $p['id'],
        'name' => $p['name'],
        'category' => $p['category'],
        'subcategory' => $p['subcategory'],
        'article' => $p['article'],
        'price' => format_price_plain($p['price']),
        'photos' => $entry_photos,
    );
}

$zip->addFromString('manifest.json', json_encode($manifest, JSON_UNESCAPED_UNICODE | JSON_PRETTY_PRINT));
$zip->close();

$filename = 'export-publish-' . date('Y-m-d-His') . '.zip';
header('Content-Type: application/zip');
header('Content-Disposition: attachment; filename="' . $filename . '"');
header('Content-Length: ' . filesize($tmp_zip));
readfile($tmp_zip);
unlink($tmp_zip);
exit;
