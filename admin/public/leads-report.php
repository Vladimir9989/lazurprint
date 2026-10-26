<?php
require_once __DIR__ . '/../src/bootstrap.php';

$user = require_role(array('admin', 'viewer'));
leads_housekeeping();

$from = isset($_GET['from']) && preg_match('/^\d{4}-\d{2}-\d{2}$/', $_GET['from']) ? $_GET['from'] : '';
$to = isset($_GET['to']) && preg_match('/^\d{4}-\d{2}-\d{2}$/', $_GET['to']) ? $_GET['to'] : '';

$by_manager = leads_report_by('manager', $from, $to);
$by_segment = leads_report_by('segment', $from, $to);
$totals = leads_report_totals($from, $to);

function pct($part, $whole) {
    return $whole > 0 ? round($part * 100 / $whole) . '%' : '—';
}

$columns = array(
    'sent' => 'Отправлено', 'replied' => 'Ответили', 'refused' => 'Отказ', 'silent' => 'Без ответа',
    'samples' => 'Образцы', 'orders' => 'Заказы',
);

if (!empty($_GET['csv'])) {
    header('Content-Type: text/csv; charset=utf-8');
    header('Content-Disposition: attachment; filename="lazur-pisma-otchet-' . date('Y-m-d') . '.csv"');
    echo "\xEF\xBB\xBF";
    $out = fopen('php://output', 'w');
    foreach (array('Менеджер' => $by_manager, 'Сегмент' => $by_segment) as $title => $rows) {
        fputcsv($out, array($title, 'Всего', 'В очереди', 'В работе', 'Отправлено', 'Ответили', 'Отказ', 'Без ответа', 'Образцы', 'Заказы', '% ответов'), ';');
        foreach ($rows as $r) {
            fputcsv($out, array($r['grp'], $r['total'], $r['in_queue'], $r['taken'], $r['sent'], $r['replied'], $r['refused'],
                $r['silent'], $r['samples'], $r['orders'], pct($r['replied'], $r['sent'])), ';');
        }
        fputcsv($out, array(), ';');
    }
    fclose($out);
    exit;
}

function report_table($title, $rows, $columns) {
    ?>
<div class="panel" style="padding:0; overflow-x:auto;">
<table class="table">
    <thead><tr>
        <th><?php echo h($title); ?></th><th>Всего</th><th>В очереди</th><th>В работе</th>
        <?php foreach ($columns as $label): ?><th><?php echo h($label); ?></th><?php endforeach; ?>
        <th>% ответов</th>
    </tr></thead>
    <tbody>
    <?php foreach ($rows as $r): ?>
    <tr>
        <td><strong><?php echo h($r['grp']); ?></strong></td>
        <td><?php echo (int) $r['total']; ?></td><td><?php echo (int) $r['in_queue']; ?></td><td><?php echo (int) $r['taken']; ?></td>
        <?php foreach ($columns as $key => $label): ?><td><?php echo (int) $r[$key]; ?></td><?php endforeach; ?>
        <td><?php echo pct($r['replied'], $r['sent']); ?></td>
    </tr>
    <?php endforeach; ?>
    </tbody>
</table>
</div>
    <?php
}

render_header('Отчёт по письмам', $user, 'leads');
flash_messages();
?>

<div class="toolbar">
    <a href="leads.php" class="btn btn--secondary btn--sm">← К списку</a>
    <h1 class="h1" style="margin:0; flex:1 1 auto;">Отчёт по письмам</h1>
    <a href="leads-report.php?csv=1&amp;from=<?php echo h($from); ?>&amp;to=<?php echo h($to); ?>" class="btn btn--secondary btn--sm">Скачать CSV (Excel)</a>
</div>

<form method="get" class="toolbar">
    <label class="dim">с <input type="date" name="from" value="<?php echo h($from); ?>"></label>
    <label class="dim">по <input type="date" name="to" value="<?php echo h($to); ?>"></label>
    <button type="submit" class="btn btn--secondary btn--sm">Показать</button>
    <span class="dim" style="font-size:12px;">Период считается по дате отправки письма (для не отправленных — по дате добавления).</span>
</form>

<div class="stat-row">
    <div class="stat"><div class="stat__n"><?php echo (int) $totals['sent']; ?></div><div class="stat__l">писем отправлено</div></div>
    <div class="stat"><div class="stat__n"><?php echo (int) $totals['replied']; ?></div><div class="stat__l">ответили (<?php echo pct($totals['replied'], $totals['sent']); ?>)</div></div>
    <div class="stat"><div class="stat__n"><?php echo (int) $totals['samples']; ?></div><div class="stat__l">образцов отправлено</div></div>
    <div class="stat"><div class="stat__n"><?php echo (int) $totals['orders']; ?></div><div class="stat__l">заказов</div></div>
    <div class="stat"><div class="stat__n"><?php echo (int) $totals['refused']; ?></div><div class="stat__l">отказов</div></div>
    <div class="stat"><div class="stat__n"><?php echo (int) $totals['silent']; ?></div><div class="stat__l">без ответа</div></div>
</div>

<h2 class="h2">По менеджерам</h2>
<?php report_table('Менеджер', $by_manager, $columns); ?>

<h2 class="h2">По сегментам</h2>
<?php report_table('Сегмент', $by_segment, $columns); ?>

<p class="dim" style="font-size:12px;">«Ответили» включает тех, кто дошёл до образца и заказа. «Без ответа» ставится само через <?php echo (int) LEAD_SILENT_DAYS; ?> дней после отправки.</p>

<?php
render_footer();
