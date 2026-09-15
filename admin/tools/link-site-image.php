<?php
// CLI-утилита (не веб!): привязать карточку в админке к пути на сайте в обход
// веб-интерфейса "Что на сайте". Нужна для сквозного процесса публикации новой
// продукции: как только товар добавлен в catalog-suvenir.html, сразу проставляем
// ту же site_image_path в базе — тогда следующий клик "Обновить список" в разделе
// "Что на сайте" сам найдёт совпадение и отметит карточку "опубликован",
// без ручного "Выбрать" по каждой карточке. См. docs/admin-panel.md, раздел 6.
//
// Использование:
//   php admin/tools/link-site-image.php <product_id> <site_image_path>
// Пример:
//   php admin/tools/link-site-image.php 42 images/img/rs/Magnity/ekaterinburg/magnit-ekaterinburg-03.jpg

require_once __DIR__ . '/../src/db.php';
require_once __DIR__ . '/../src/products.php';
require_once __DIR__ . '/../src/site_catalog.php';

if ($argc < 3) {
    fwrite(STDERR, "Использование: php link-site-image.php <product_id> <site_image_path>\n");
    exit(1);
}

$id = (int) $argv[1];
$image_path = trim($argv[2]);

$product = get_product($id);
if (!$product) {
    fwrite(STDERR, "Товар #{$id} не найден.\n");
    exit(1);
}
if ($image_path === '') {
    fwrite(STDERR, "Путь к картинке не может быть пустым.\n");
    exit(1);
}

$system_user = array('id' => null);
set_product_site_image($id, $image_path, $system_user);

echo "OK: товар #{$id} («{$product['name']}») привязан к {$image_path}\n";
echo "Статус \"опубликован\" проставится автоматически при следующем нажатии\n";
echo "\"Обновить список\" в разделе «Что на сайте» — если товар с таким же\n";
echo "путём и артикулом реально нашёлся в catalog-suvenir.html.\n";
