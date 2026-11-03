<?php
require_once __DIR__ . '/../src/bootstrap.php';

$user = require_role(array('admin', 'manager', 'viewer'));
$rows = lb_list();
$configured = lb_base_dir() !== '';

render_header('Книги о жизни', $user, 'lifebooks');
flash_messages();
?>

<div class="toolbar">
    <h1 class="h1" style="margin:0; flex:1 1 auto;">Книги о жизни: заявки</h1>
</div>

<?php if (!$configured): ?>
<div class="panel"><p>Папка заявок не настроена: добавьте <code>life_book_dir</code> в <code>config.local.php</code> (см. <code>config.example.php</code>).</p></div>
<?php elseif (!$rows): ?>
<div class="panel"><p class="dim">Заявок пока нет.</p></div>
<?php else: ?>
<table class="table">
    <thead>
        <tr><th>Дата</th><th>Чья книга</th><th>Заказчик</th><th>Переплёт</th><th>Ответов</th><th>Фото</th><th>Статус</th></tr>
    </thead>
    <tbody>
    <?php
    foreach ($rows as $r):
        $stale = $r['status'] === 'uploading';
        $sizeName = lb_binding_label($r['design']['size']);
    ?>
        <tr<?php echo $stale ? ' style="opacity:.55"' : ''; ?>>
            <td><a href="life-book.php?id=<?php echo h($r['id']); ?>"><?php echo h(date('d.m.Y H:i', strtotime($r['created']))); ?></a></td>
            <td><?php echo h($r['heroName']); ?></td>
            <td><?php echo h($r['contacts']['name']); ?><br><span class="dim"><?php echo h($r['contacts']['phone']); ?></span></td>
            <td><?php echo h($sizeName); ?></td>
            <td><?php echo (int) $r['answers_count']; ?><?php echo $r['custom_count'] ? ' + ' . (int) $r['custom_count'] : ''; ?></td>
            <td><?php echo (int) $r['photos_received']; ?>/<?php echo (int) $r['photos_expected']; ?></td>
            <td><?php echo h(lb_row_label($r)); ?></td>
        </tr>
    <?php endforeach; ?>
    </tbody>
</table>
<?php endif; ?>

<?php render_footer(); ?>
