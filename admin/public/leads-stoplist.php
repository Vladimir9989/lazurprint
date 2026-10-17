<?php
require_once __DIR__ . '/../src/bootstrap.php';

$user = require_role(array('admin'));

$rows = db()->query('SELECT s.*, CONCAT(u.first_name, " ", u.last_name) AS who FROM lead_stoplist s
    LEFT JOIN users u ON u.id = s.added_by ORDER BY s.id DESC')->fetchAll();

render_header('Стоп-лист', $user, 'leads');
flash_messages();
?>

<div class="toolbar">
    <a href="leads.php" class="btn btn--secondary btn--sm">← К списку</a>
    <h1 class="h1" style="margin:0;">Стоп-лист («просили не писать»)</h1>
</div>

<p class="dim" style="max-width:760px;">
    Компании и адреса отсюда нельзя добавить в базу клиентов: реклама по e-mail регулируется законом. Записи появляются сами,
    когда менеджер нажимает «Просили не писать». Вручную можно добавить домен или адрес здесь.
</p>

<div class="panel" style="max-width:760px;">
    <form method="post" action="lead-action.php" class="form-grid">
        <?php echo csrf_field(); ?>
        <input type="hidden" name="action" value="stoplist_add">
        <div class="field"><label for="sl-domain">Сайт / домен</label><input type="text" id="sl-domain" name="domain" placeholder="example.ru"></div>
        <div class="field"><label for="sl-email">E-mail</label><input type="text" id="sl-email" name="email"></div>
        <div class="field"><label for="sl-company">Компания</label><input type="text" id="sl-company" name="company"></div>
        <div class="field"><label for="sl-reason">Причина</label><input type="text" id="sl-reason" name="reason" placeholder="Просили не писать"></div>
        <div><button type="submit" class="btn btn--sm">Добавить</button></div>
    </form>
</div>

<?php if (!$rows): ?>
<div class="empty-state">Стоп-лист пуст.</div>
<?php else: ?>
<div class="panel" style="padding:0; overflow-x:auto;">
<table class="table">
    <thead><tr><th>Домен / e-mail</th><th>Компания</th><th>Причина</th><th>Добавил(а)</th><th>Дата</th><th></th></tr></thead>
    <tbody>
    <?php foreach ($rows as $r): ?>
    <tr>
        <td><?php echo h($r['domain'] !== '' ? $r['domain'] : $r['email']); ?></td>
        <td><?php echo h($r['company']); ?></td>
        <td><?php echo h($r['reason']); ?></td>
        <td><?php echo h($r['who']); ?></td>
        <td class="dim"><?php echo h(date('d.m.Y', strtotime($r['created_at']))); ?></td>
        <td>
            <form method="post" action="lead-action.php" data-confirm="Убрать из стоп-листа? После этого клиента можно будет снова добавить.">
                <?php echo csrf_field(); ?>
                <input type="hidden" name="action" value="stoplist_remove">
                <input type="hidden" name="id" value="<?php echo (int) $r['id']; ?>">
                <button type="submit" class="btn btn--sm btn--secondary">Убрать</button>
            </form>
        </td>
    </tr>
    <?php endforeach; ?>
    </tbody>
</table>
</div>
<?php endif; ?>

<?php
render_footer();
