<?php
// Отчёт по менеджерам за период (для руководителя и админа): сколько взято и отправлено,
// кто тянет со сроком, кто ответил, образцы, заказы, отложенные клиенты.
require_once __DIR__ . '/../src/bootstrap.php';

$user = require_role(array('admin', 'viewer'));
leads_housekeeping();

$today = date('Y-m-d');
$preset = isset($_GET['p']) ? (string) $_GET['p'] : '';
$from = isset($_GET['from']) && preg_match('/^\d{4}-\d{2}-\d{2}$/', $_GET['from']) ? $_GET['from'] : '';
$to = isset($_GET['to']) && preg_match('/^\d{4}-\d{2}-\d{2}$/', $_GET['to']) ? $_GET['to'] : '';
if ($preset === 'week') {
    $from = date('Y-m-d', strtotime('-6 day'));
    $to = $today;
} elseif ($preset === 'month') {
    $from = date('Y-m-01');
    $to = $today;
} elseif ($preset === 'prev-month') {
    $from = date('Y-m-01', strtotime('first day of last month'));
    $to = date('Y-m-t', strtotime('first day of last month'));
} elseif ($preset === 'all') {
    $from = '';
    $to = '';
} elseif ($from === '' && $to === '') {
    $preset = 'week';
    $from = date('Y-m-d', strtotime('-6 day'));
    $to = $today;
}

$rows = leads_manager_report($from, $to);
// Менеджеры без единого действия за период и без текущих клиентов в таблицу не попадают.
$rows = array_values(array_filter($rows, function ($r) {
    return $r['taken'] || $r['sent'] || $r['expired'] || $r['in_work'] || $r['postponed'];
}));

$sum = array('taken' => 0, 'sent' => 0, 'expired' => 0, 'replied' => 0, 'samples' => 0, 'orders' => 0, 'in_work' => 0, 'postponed' => 0);
foreach ($rows as $r) {
    foreach ($sum as $k => $v) {
        $sum[$k] += $r[$k];
    }
}

function rpt_pct($part, $whole) {
    return $whole > 0 ? round($part * 100 / $whole) . '%' : '—';
}

function rpt_hours($h) {
    if ($h === null) {
        return '—';
    }
    return $h < 48 ? str_replace('.', ',', (string) $h) . ' ч' : str_replace('.', ',', (string) round($h / 24, 1)) . ' дн.';
}

if (!empty($_GET['csv'])) {
    header('Content-Type: text/csv; charset=utf-8');
    header('Content-Disposition: attachment; filename="lazur-otchet-menedzhery-' . date('Y-m-d') . '.csv"');
    echo "\xEF\xBB\xBF";
    $out = fopen('php://output', 'w');
    fputcsv($out, array('Период', $from !== '' ? $from : 'всё время', $to !== '' ? $to : ''), ';');
    fputcsv($out, array('Менеджер', 'Взято', 'Отправлено', 'Ср. время до отправки (ч)', 'Вернулись по сроку', 'Сейчас в работе',
        'Из них срок кончается', 'Ответили', '% ответов', 'Образцы', 'Заказы', 'Отложено', 'Из них пора писать'), ';');
    foreach ($rows as $r) {
        fputcsv($out, array($r['name'], $r['taken'], $r['sent'], $r['avg_hours'] === null ? '' : $r['avg_hours'], $r['expired'],
            $r['in_work'], $r['in_work_soon'], $r['replied'], rpt_pct($r['replied'], $r['sent']), $r['samples'], $r['orders'],
            $r['postponed'], $r['postponed_due']), ';');
    }
    fclose($out);
    exit;
}

$refuse = leads_refuse_report($from, $to);
$taken_list = leads_taken_list();
$postponed_list = leads_postponed_list();
$qs = 'from=' . urlencode($from) . '&to=' . urlencode($to);

render_header('Отчёт по менеджерам', $user, 'report');
flash_messages();
?>

<div class="toolbar">
    <a href="leads.php" class="btn btn--secondary btn--sm">← К клиентам</a>
    <h1 class="h1" style="margin:0; flex:1 1 auto;">Отчёт по менеджерам</h1>
    <a href="report-managers.php?csv=1&amp;<?php echo h($qs); ?>" class="btn btn--secondary btn--sm">Скачать CSV (Excel)</a>
</div>

<div class="chips">
    <a class="chip <?php echo $preset === 'week' ? 'is-active' : ''; ?>" href="report-managers.php?p=week">7 дней</a>
    <a class="chip <?php echo $preset === 'month' ? 'is-active' : ''; ?>" href="report-managers.php?p=month">Этот месяц</a>
    <a class="chip <?php echo $preset === 'prev-month' ? 'is-active' : ''; ?>" href="report-managers.php?p=prev-month">Прошлый месяц</a>
    <a class="chip <?php echo $preset === 'all' ? 'is-active' : ''; ?>" href="report-managers.php?p=all">Всё время</a>
</div>

<form method="get" class="toolbar">
    <label class="dim">с <input type="date" name="from" value="<?php echo h($from); ?>"></label>
    <label class="dim">по <input type="date" name="to" value="<?php echo h($to); ?>"></label>
    <button type="submit" class="btn btn--secondary btn--sm">Показать</button>
    <span class="dim" style="font-size:12px;">Период: <?php echo $from !== '' ? h(date('d.m.Y', strtotime($from))) : 'с начала'; ?> — <?php echo $to !== '' ? h(date('d.m.Y', strtotime($to))) : 'сегодня'; ?>.</span>
</form>

<div class="stat-row">
    <div class="stat"><div class="stat__n"><?php echo (int) $sum['taken']; ?></div><div class="stat__l">клиентов взято в работу</div></div>
    <div class="stat"><div class="stat__n"><?php echo (int) $sum['sent']; ?></div><div class="stat__l">писем отправлено</div></div>
    <div class="stat"><div class="stat__n"><?php echo (int) $sum['expired']; ?></div><div class="stat__l">вернулись: не успели отправить</div></div>
    <div class="stat"><div class="stat__n"><?php echo (int) $sum['replied']; ?></div><div class="stat__l">ответили (<?php echo rpt_pct($sum['replied'], $sum['sent']); ?>)</div></div>
    <div class="stat"><div class="stat__n"><?php echo (int) $sum['samples']; ?></div><div class="stat__l">дошли до образцов</div></div>
    <div class="stat"><div class="stat__n"><?php echo (int) $sum['orders']; ?></div><div class="stat__l">заказов</div></div>
</div>

<h2 class="h2">По менеджерам</h2>
<?php if (!$rows): ?>
<div class="empty-state">За этот период действий нет.</div>
<?php else: ?>
<div class="panel" style="padding:0; overflow-x:auto;">
<table class="table">
    <thead><tr>
        <th>Менеджер</th><th>Взято</th><th>Отправлено</th><th title="Среднее время от «Беру в работу» до «Я отправил(а)»">Ср. время до отправки</th>
        <th title="Взял, но не отправил за 2 рабочих дня — клиент вернулся в общий список">Не успели</th>
        <th title="Сейчас в работе; в скобках — у скольких срок кончается в ближайшие сутки">Сейчас в работе</th>
        <th>Ответили</th><th>Образцы</th><th>Заказы</th>
        <th title="Отложены «на потом»; в скобках — у скольких пора писать">Отложено</th>
    </tr></thead>
    <tbody>
    <?php foreach ($rows as $r): ?>
    <tr>
        <td><strong><?php echo h($r['name']); ?></strong></td>
        <td><?php echo (int) $r['taken']; ?></td>
        <td><?php echo (int) $r['sent']; ?></td>
        <td><?php echo h(rpt_hours($r['avg_hours'])); ?></td>
        <td><?php echo $r['expired'] > 0 ? '<span class="badge badge--due-late">' . (int) $r['expired'] . '</span>' : '0'; ?></td>
        <td><?php echo (int) $r['in_work']; ?><?php if ($r['in_work_soon'] > 0): ?> <span class="badge badge--due-soon">срок горит: <?php echo (int) $r['in_work_soon']; ?></span><?php endif; ?></td>
        <td><?php echo (int) $r['replied']; ?> <span class="dim">(<?php echo rpt_pct($r['replied'], $r['sent']); ?>)</span></td>
        <td><?php echo (int) $r['samples']; ?></td>
        <td><?php echo (int) $r['orders']; ?></td>
        <td><?php echo (int) $r['postponed']; ?><?php if ($r['postponed_due'] > 0): ?> <span class="badge badge--remind">пора писать: <?php echo (int) $r['postponed_due']; ?></span><?php endif; ?></td>
    </tr>
    <?php endforeach; ?>
    </tbody>
</table>
</div>
<?php endif; ?>

<h2 class="h2">Почему клиенты отказываются</h2>
<?php if (!$refuse['total']): ?>
<div class="empty-state">За этот период отказов с указанной причиной нет.</div>
<?php else: ?>
<div class="panel" style="padding:0; overflow-x:auto;">
<table class="table">
    <thead><tr>
        <th>Менеджер</th>
        <?php foreach (LEAD_REFUSE_REASONS as $rl): ?><th><?php echo h($rl); ?></th><?php endforeach; ?>
        <th>Всего</th>
    </tr></thead>
    <tbody>
    <?php foreach ($refuse['rows'] as $r): ?>
    <tr>
        <td><strong><?php echo h($r['name']); ?></strong></td>
        <?php foreach (LEAD_REFUSE_REASONS as $rc => $rl): ?><td><?php echo $r['reasons'][$rc] ?: '<span class="dim">0</span>'; ?></td><?php endforeach; ?>
        <td><strong><?php echo (int) $r['total']; ?></strong></td>
    </tr>
    <?php endforeach; ?>
    <tr>
        <td><strong>Все менеджеры</strong></td>
        <?php foreach (LEAD_REFUSE_REASONS as $rc => $rl): ?><td><strong><?php echo (int) $refuse['totals'][$rc]; ?></strong> <span class="dim">(<?php echo rpt_pct($refuse['totals'][$rc], $refuse['total']); ?>)</span></td><?php endforeach; ?>
        <td><strong><?php echo (int) $refuse['total']; ?></strong></td>
    </tr>
    </tbody>
</table>
</div>
<?php endif; ?>

<h2 class="h2">Сейчас в работе (не отправлено)</h2>
<?php if (!$taken_list): ?>
<div class="empty-state">Нет клиентов, взятых без отправки.</div>
<?php else: ?>
<div class="panel" style="padding:0; overflow-x:auto;">
<table class="table">
    <thead><tr><th>Клиент</th><th>Менеджер</th><th>Взят</th><th>Срок отправки</th></tr></thead>
    <tbody>
    <?php foreach ($taken_list as $t): $di = lead_due_info(array('status' => 'taken', 'due_at' => $t['due_at'])); ?>
    <tr>
        <td><a href="lead.php?id=<?php echo (int) $t['id']; ?>"><?php echo h($t['company']); ?></a></td>
        <td><?php echo h($t['owner_name']); ?></td>
        <td class="dim"><?php echo $t['taken_at'] ? h(date('d.m.Y', strtotime($t['taken_at']))) : '—'; ?></td>
        <td><?php if ($di): ?><span class="badge badge--due-<?php echo h($di[1]); ?>"><?php echo h($di[0]); ?></span><?php else: ?>—<?php endif; ?></td>
    </tr>
    <?php endforeach; ?>
    </tbody>
</table>
</div>
<?php endif; ?>

<h2 class="h2">Отложенные клиенты («свяжемся позже»)</h2>
<?php if (!$postponed_list): ?>
<div class="empty-state">Отложенных клиентов нет.</div>
<?php else: ?>
<div class="panel" style="padding:0; overflow-x:auto;">
<table class="table">
    <thead><tr><th>Клиент</th><th>Менеджер</th><th>Напомнить</th></tr></thead>
    <tbody>
    <?php foreach ($postponed_list as $p): $is_due = $p['remind_at'] && $p['remind_at'] <= $today; ?>
    <tr>
        <td><a href="lead.php?id=<?php echo (int) $p['id']; ?>"><?php echo h($p['company']); ?></a></td>
        <td><?php echo h($p['owner_name']); ?></td>
        <td><?php echo $p['remind_at'] ? h(date('d.m.Y', strtotime($p['remind_at']))) : '—'; ?>
            <?php if ($is_due): ?><span class="badge badge--remind">пора писать</span><?php endif; ?></td>
    </tr>
    <?php endforeach; ?>
    </tbody>
</table>
</div>
<?php endif; ?>

<p class="dim" style="font-size:12px;">«Взято» считается по числу нажатий «Беру в работу» за период (включая тех, кого потом вернули). «Отправлено», «ответили», образцы и заказы — по письмам, отправленным за период. «Не успели» — клиент не отправлен за <?php echo (int) LEAD_TAKE_WORKDAYS; ?> рабочих дня и вернулся в общий список. Выходные учитываются, праздники пока нет. Отказы и молчащие клиенты через <?php echo (int) LEAD_RECYCLE_DAYS; ?> дней возвращаются в общий список, прежний менеджер этого клиента больше не получает; причины отказов в отчёте остаются.</p>

<?php
render_footer();
