<?php
// CLI-утилита (не веб!): подтвердить, что изменения карточки (название/артикул/цена)
// перенесены на сайт вручную — снимает флаг needs_site_update в обход веб-интерфейса.
// Пара к link-site-image.php, но для правок уже опубликованных товаров, а не для новых.
// См. admin/README.md, раздел «Публикация новой продукции на сайт», и export-updates.php.
//
// Использование:
//   php admin/tools/mark-site-updated.php <product_id>

require_once __DIR__ . '/../src/db.php';
require_once __DIR__ . '/../src/products.php';

if ($argc < 2) {
    fwrite(STDERR, "Использование: php mark-site-updated.php <product_id>\n");
    exit(1);
}

$id = (int) $argv[1];

$product = get_product($id);
if (!$product) {
    fwrite(STDERR, "Товар #{$id} не найден.\n");
    exit(1);
}

$system_user = array('id' => null);
mark_site_updated($id, $system_user);

echo "OK: товар #{$id} («{$product['name']}») — флаг \"нужно обновить на сайте\" снят.\n";
