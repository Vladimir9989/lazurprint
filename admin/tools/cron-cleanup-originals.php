<?php
// CLI-утилита для Cron (раздел 7 ТЗ, п.2): автоудаление тяжёлых оригиналов фото у
// карточек, опубликованных больше originals_auto_delete_days дней назад (превью,
// карточка и история остаются). За originals_warning_days_before дней до удаления
// уходит одно письмо-предупреждение админу со списком.
//
// Использование (в панели хостинга, вкладка Cron, раз в неделю):
//   php admin/tools/cron-cleanup-originals.php

require_once __DIR__ . '/../src/db.php';
require_once __DIR__ . '/../src/mail.php';
require_once __DIR__ . '/../src/products.php';
require_once __DIR__ . '/../src/photos.php';

$days = (int) config('originals_auto_delete_days');
$warn_days_before = (int) config('originals_warning_days_before');

$warned = notify_originals_cleanup_warning(products_nearing_originals_cleanup($days, $warn_days_before));

$due = products_due_for_originals_cleanup($days);
$deleted = 0;
foreach ($due as $p) {
    delete_product_originals($p['id'], null);
    $deleted++;
}

echo "Предупреждений отправлено: {$warned}. Удалены оригиналы у карточек: {$deleted}.\n";
