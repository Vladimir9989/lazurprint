<?php
require_once __DIR__ . '/../src/bootstrap.php';

$user = require_login();

$filters = array(
    'status' => isset($_GET['status']) ? $_GET['status'] : '',
    'category' => isset($_GET['category']) ? $_GET['category'] : '',
    'q' => isset($_GET['q']) ? trim($_GET['q']) : '',
);

$products = list_work_products($user, $filters);
$ready_count = is_admin_user($user) ? count(ready_to_publish_products()) : 0;
$updates_count = is_admin_user($user) ? count(products_needing_site_update()) : 0;
$originals_bytes = is_admin_user($user) ? originals_disk_usage_bytes() : 0;

render_header('В работе', $user, 'work');
flash_messages();
?>

<div class="toolbar">
    <h1 class="h1" style="margin:0; flex:1 1 auto;">В работе</h1>
    <?php if ($ready_count > 0): ?>
    <a href="export-publish.php" class="btn btn--secondary btn--sm" title="Оригиналы фото + название/категория/артикул/цена одним ZIP">⬇ Экспорт для публикации (<?php echo $ready_count; ?>)</a>
    <?php endif; ?>
    <?php if ($updates_count > 0): ?>
    <a href="export-updates.php" class="btn btn--secondary btn--sm" title="Только изменившиеся данные (название/артикул/цена) уже опубликованных товаров, без фото">⬇ Экспорт изменений (<?php echo $updates_count; ?>)</a>
    <?php endif; ?>
    <?php if ($user['role'] !== 'viewer'): ?>
    <a href="product.php" class="btn">+ Добавить товар</a>
    <?php endif; ?>
</div>

<?php if (is_admin_user($user) && $originals_bytes > 0): ?>
<div class="dim" style="font-size:12px; margin:-10px 0 14px;">
    Оригиналы фото на диске: <?php echo number_format($originals_bytes / 1048576, 1, ',', ' '); ?> МБ
</div>
<?php endif; ?>

<form method="get" class="toolbar">
    <input type="search" name="q" placeholder="Название или артикул" value="<?php echo h($filters['q']); ?>">
    <select name="category">
        <option value="">Все категории</option>
        <?php foreach (PRODUCT_CATEGORIES as $cat): ?>
        <option value="<?php echo h($cat); ?>" <?php echo $filters['category'] === $cat ? 'selected' : ''; ?>><?php echo h($cat); ?></option>
        <?php endforeach; ?>
    </select>
    <select name="status">
        <option value="">Любой статус</option>
        <option value="draft" <?php echo $filters['status'] === 'draft' ? 'selected' : ''; ?>>Черновик</option>
        <option value="need_price" <?php echo $filters['status'] === 'need_price' ? 'selected' : ''; ?>>Ждёт цену</option>
        <option value="need_photo" <?php echo $filters['status'] === 'need_photo' ? 'selected' : ''; ?>>Ждёт фото</option>
        <option value="ready" <?php echo $filters['status'] === 'ready' ? 'selected' : ''; ?>>Готов к публикации</option>
        <option value="published" <?php echo $filters['status'] === 'published' ? 'selected' : ''; ?>>Опубликован</option>
        <option value="needs_update" <?php echo $filters['status'] === 'needs_update' ? 'selected' : ''; ?>>Изменено — обновить на сайте</option>
    </select>
    <button type="submit" class="btn btn--secondary btn--sm">Найти</button>
</form>

<?php if (!$products): ?>
    <div class="empty-state">Пока ничего нет. Нажмите «Добавить товар», чтобы завести первую карточку.</div>
<?php else: ?>
<div class="cards-grid">
    <?php foreach ($products as $p): $status = product_status($p); $photos = list_product_photos($p['id']); $main = $photos ? $photos[0] : null; ?>
    <a href="product.php?id=<?php echo (int) $p['id']; ?>" class="card" style="text-decoration:none;">
        <div class="card__thumb">
            <?php if ($main): ?>
            <img src="photo.php?id=<?php echo (int) $main['id']; ?>&thumb=1" alt="">
            <?php else: ?>
            нет фото
            <?php endif; ?>
        </div>
        <div class="pill-row">
            <span class="badge badge--<?php echo h($status['code']); ?>"><?php echo h($status['label']); ?></span>
            <?php if (!empty($p['note_unread'])): ?>
            <span class="badge badge-note badge-note--unread" title="<?php echo h($p['note']); ?>">💬 новый</span>
            <?php elseif (trim((string) $p['note']) !== ''): ?>
            <span class="badge badge-note" title="<?php echo h($p['note']); ?>">💬</span>
            <?php endif; ?>
        </div>
        <div class="card__name"><?php echo h($p['name'] !== '' ? $p['name'] : '(без названия)'); ?></div>
        <div class="card__meta">
            <?php echo h($p['category']); ?><?php echo $p['article'] ? ' · арт. ' . h($p['article']) : ''; ?>
            <?php if ($p['price'] !== null): ?><br><?php echo h(format_price($p['price'])); ?><?php endif; ?>
        </div>
    </a>
    <?php endforeach; ?>
</div>
<?php endif; ?>

<?php
render_footer();
