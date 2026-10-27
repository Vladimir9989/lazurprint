<?php
// Журнал ИИ-помощника (только админ): диалоги сотрудников из закрытого тестового окна сайта.
// Пишет журнал src/resources/ai-chat.php: JSON-строки по дням в /home/c112136/lazurprint.ru/ai-log/ (вне веб-корня).
// Вкладки — по людям (имена из ai-codes.php рядом с журналом), период — 1 день / неделя / месяц / всё или свои даты.
require_once __DIR__ . '/../src/bootstrap.php';

$user = require_role(array('admin'));

$logDir = rtrim((string) config_get('ai_log_dir', dirname(rtrim(config('uploads_dir'), '/\\')) . '/ai-log'), '/\\');
$codesFile = dirname($logDir) . '/ai-codes.php';

// --- Период ---
$today = date('Y-m-d');
$preset = isset($_GET['p']) ? (string) $_GET['p'] : '';
$from = isset($_GET['from']) && preg_match('/^\d{4}-\d{2}-\d{2}$/', $_GET['from']) ? $_GET['from'] : '';
$to = isset($_GET['to']) && preg_match('/^\d{4}-\d{2}-\d{2}$/', $_GET['to']) ? $_GET['to'] : '';
if ($preset === 'today' || ($preset === '' && $from === '' && $to === '')) {
    $preset = 'today';
    $from = $to = $today;
} elseif ($preset === 'yesterday') {
    $from = $to = date('Y-m-d', strtotime('-1 day'));
} elseif ($preset === 'week') {
    $from = date('Y-m-d', strtotime('-6 day'));
    $to = $today;
} elseif ($preset === 'month') {
    $from = date('Y-m-01');
    $to = $today;
} elseif ($preset === 'all') {
    $from = $to = '';
} else {
    $preset = '';
}
$onlyUser = isset($_GET['u']) ? (string) $_GET['u'] : '';
$onlyFlag = !empty($_GET['flag']);

// --- Чтение журнала за период ---
$entries = array();
$files = glob($logDir . '/*.jsonl');
if (!is_array($files)) {
    $files = array();
}
sort($files);
foreach ($files as $f) {
    $day = basename($f, '.jsonl');
    if (($from !== '' && $day < $from) || ($to !== '' && $day > $to)) {
        continue;
    }
    foreach (file($f, FILE_IGNORE_NEW_LINES | FILE_SKIP_EMPTY_LINES) as $line) {
        $r = json_decode($line, true);
        if (is_array($r) && isset($r['ts'])) {
            $entries[] = $r;
        }
    }
}

// Все люди: из файла кодов (чтобы вкладка была и у тех, кто ещё не писал) + кто есть в журнале
$people = array();
$codes = is_file($codesFile) ? include $codesFile : array();
if (is_array($codes)) {
    foreach ($codes as $c) {
        if (isset($c['name'])) {
            $people[$c['name']] = 0;
        }
    }
}
foreach ($entries as $r) {
    $name = isset($r['user']) ? $r['user'] : '';
    if ($name !== '' && !isset($people[$name]) && isset($r['type']) && $r['type'] === 'chat') {
        $people[$name] = 0;
    }
}
foreach ($entries as $r) {
    if (isset($r['type']) && $r['type'] === 'chat' && isset($people[$r['user']])) {
        $people[$r['user']]++;
    }
}
$allCount = array_sum($people);

// --- Диалоги: записи одного человека с одним session ---
$dialogs = array();
foreach ($entries as $r) {
    $name = isset($r['user']) ? $r['user'] : '';
    if ($onlyUser !== '' && $name !== $onlyUser) {
        continue;
    }
    $key = $name . '|' . (isset($r['session']) && $r['session'] !== '' ? $r['session'] : $r['ts']);
    if (!isset($dialogs[$key])) {
        $dialogs[$key] = array('user' => $name, 'start' => $r['ts'], 'end' => $r['ts'], 'chats' => array(), 'notes' => array(),
            'errors' => 0, 'cost' => 0.0, 'models' => array());
    }
    $d = &$dialogs[$key];
    $d['end'] = $r['ts'];
    $type = isset($r['type']) ? $r['type'] : '';
    if ($type === 'chat') {
        $d['chats'][] = $r;
        $d['cost'] += isset($r['cost']) ? (float) $r['cost'] : 0;
        $d['models'][isset($r['model']) ? str_replace('anthropic/', '', $r['model']) : '?'] = true;
    } elseif ($type === 'feedback') {
        $d['notes'][] = $r;
    } elseif ($type === 'error') {
        $d['errors']++;
    }
    unset($d);
}
$dialogs = array_filter($dialogs, function ($d) use ($onlyFlag) {
    if (!$d['chats'] && !$d['notes']) {
        return false; // только ошибки связи без ответов — в счётчик ошибок, не в список
    }
    return !$onlyFlag || $d['notes'];
});
usort($dialogs, function ($a, $b) {
    return strcmp($b['start'], $a['start']);
});

$totalCost = 0.0;
$totalAnswers = 0;
$totalNotes = 0;
$totalErrors = 0;
foreach ($dialogs as $d) {
    $totalCost += $d['cost'];
    $totalAnswers += count($d['chats']);
    $totalNotes += count($d['notes']);
    $totalErrors += $d['errors'];
}
$limit = 150;
$shown = array_slice($dialogs, 0, $limit);

function jr_url($over = array()) {
    global $preset, $from, $to, $onlyUser, $onlyFlag;
    $q = array();
    if ($preset !== '') {
        $q['p'] = $preset;
    } else {
        $q['from'] = $from;
        $q['to'] = $to;
    }
    if ($onlyUser !== '') {
        $q['u'] = $onlyUser;
    }
    if ($onlyFlag) {
        $q['flag'] = 1;
    }
    foreach ($over as $k => $v) {
        if ($v === null) {
            unset($q[$k]);
        } else {
            $q[$k] = $v;
        }
    }
    return 'journal.php?' . http_build_query($q);
}

function jr_time($ts) {
    return date('d.m H:i', strtotime($ts));
}

render_header('Журнал', $user, 'journal');
flash_messages();
?>

<h1 class="h1">Журнал ИИ-помощника</h1>

<div class="tabs">
    <a class="tabs__item <?php echo $onlyUser === '' ? 'is-active' : ''; ?>" href="<?php echo h(jr_url(array('u' => null))); ?>">Все <span class="tabs__count"><?php echo (int) $allCount; ?></span></a>
    <?php foreach ($people as $name => $n): ?>
    <a class="tabs__item <?php echo $onlyUser === $name ? 'is-active' : ''; ?>" href="<?php echo h(jr_url(array('u' => $name))); ?>"><?php echo h($name); ?> <span class="tabs__count"><?php echo (int) $n; ?></span></a>
    <?php endforeach; ?>
</div>

<div class="chips">
    <?php foreach (array('today' => 'Сегодня', 'yesterday' => 'Вчера', 'week' => '7 дней', 'month' => 'Этот месяц', 'all' => 'Всё время') as $k => $label): ?>
    <a class="chip <?php echo $preset === $k ? 'is-active' : ''; ?>" href="<?php echo h(jr_url(array('p' => $k, 'from' => null, 'to' => null))); ?>"><?php echo h($label); ?></a>
    <?php endforeach; ?>
    <a class="chip <?php echo $onlyFlag ? 'is-active' : ''; ?>" href="<?php echo h(jr_url(array('flag' => $onlyFlag ? null : 1))); ?>">Только с замечаниями «ответ неверный»</a>
</div>

<form method="get" class="toolbar">
    <?php if ($onlyUser !== ''): ?><input type="hidden" name="u" value="<?php echo h($onlyUser); ?>"><?php endif; ?>
    <?php if ($onlyFlag): ?><input type="hidden" name="flag" value="1"><?php endif; ?>
    <label class="dim">с <input type="date" name="from" value="<?php echo h($from); ?>"></label>
    <label class="dim">по <input type="date" name="to" value="<?php echo h($to); ?>"></label>
    <button type="submit" class="btn btn--secondary btn--sm">Показать</button>
    <span class="dim" style="font-size:12px;">Период: <?php echo $from !== '' ? h(date('d.m.Y', strtotime($from))) : 'с начала'; ?> — <?php echo $to !== '' ? h(date('d.m.Y', strtotime($to))) : 'сегодня'; ?></span>
</form>

<div class="stat-row">
    <div class="stat"><div class="stat__n"><?php echo count($dialogs); ?></div><div class="stat__l">диалогов</div></div>
    <div class="stat"><div class="stat__n"><?php echo (int) $totalAnswers; ?></div><div class="stat__l">ответов бота</div></div>
    <div class="stat"><div class="stat__n"><?php echo (int) $totalNotes; ?></div><div class="stat__l">замечаний «неверно»</div></div>
    <div class="stat"><div class="stat__n">$<?php echo number_format($totalCost, 4, '.', ''); ?></div><div class="stat__l">расход (≈ <?php echo round($totalCost * 95, 1); ?> ₽)</div></div>
    <?php if ($totalErrors): ?><div class="stat"><div class="stat__n"><?php echo (int) $totalErrors; ?></div><div class="stat__l">сбоев связи</div></div><?php endif; ?>
</div>

<?php if (!is_dir($logDir)): ?>
<div class="empty-state">Папка журнала не найдена (<?php echo h($logDir); ?>). Она появится после первого сообщения в окне помощника.</div>
<?php elseif (!$shown): ?>
<div class="empty-state">За выбранный период диалогов нет.</div>
<?php else: ?>
<div class="toolbar">
    <span class="dim">Показано диалогов: <?php echo count($shown); ?><?php echo count($dialogs) > $limit ? ' из ' . count($dialogs) . ' (сузьте период)' : ''; ?>. Новые сверху.</span>
    <span class="toolbar__spacer"></span>
    <button type="button" class="btn btn--secondary btn--sm" data-journal-toggle="open">Раскрыть все</button>
    <button type="button" class="btn btn--secondary btn--sm" data-journal-toggle="close">Свернуть все</button>
</div>

<?php foreach ($shown as $d):
    $first = $d['chats'] ? $d['chats'][0]['q'] : '';
    $preview = preg_match('/^.{1,90}/su', $first, $pm) ? $pm[0] . (strlen($first) > strlen($pm[0]) ? '…' : '') : $first; ?>
<details class="panel journal__dialog" style="margin-bottom:10px;">
    <summary style="cursor:pointer;">
        <strong><?php echo h($d['user']); ?></strong>
        <span class="dim"> · <?php echo h(jr_time($d['start'])); ?> · сообщений: <?php echo count($d['chats']); ?> · <?php echo h(implode(', ', array_keys($d['models']))); ?> · $<?php echo number_format($d['cost'], 4, '.', ''); ?></span>
        <?php if ($d['notes']): ?><span class="badge badge--due-late">замечаний: <?php echo count($d['notes']); ?></span><?php endif; ?>
        <br><span><?php echo h($preview); ?></span>
    </summary>
    <div style="margin-top:12px;">
    <?php foreach ($d['chats'] as $c): ?>
        <div style="margin-bottom:12px;">
            <div style="color:#081f5c;font-weight:600;white-space:pre-wrap;"><?php echo h($c['q']); ?></div>
            <div style="white-space:pre-wrap;margin-top:4px;"><?php echo h($c['a']); ?></div>
            <div class="dim" style="font-size:12px;margin-top:4px;"><?php echo h(jr_time($c['ts'])); ?> · <?php echo h(str_replace('anthropic/', '', isset($c['model']) ? $c['model'] : '?')); ?> · вход <?php echo (int) $c['tin']; ?> / выход <?php echo (int) $c['tout']; ?> · <?php echo isset($c['cost']) && $c['cost'] !== null ? '$' . h($c['cost']) : '?'; ?> · <?php echo round(((int) $c['ms']) / 1000, 1); ?> с</div>
        </div>
    <?php endforeach; ?>
    <?php foreach ($d['notes'] as $n): ?>
        <div class="flash flash--error" style="margin-top:8px;">
            <strong>Замечание (<?php echo h(jr_time($n['ts'])); ?>):</strong> <?php echo $n['note'] !== '' ? h($n['note']) : '— без пояснения —'; ?>
            <div class="dim" style="white-space:pre-wrap;margin-top:4px;">К ответу: <?php echo h($n['reply']); ?></div>
        </div>
    <?php endforeach; ?>
    </div>
</details>
<?php endforeach; ?>
<script>
document.addEventListener('click', function (e) {
    var b = e.target.closest ? e.target.closest('[data-journal-toggle]') : null;
    if (!b) return;
    var open = b.getAttribute('data-journal-toggle') === 'open';
    document.querySelectorAll('.journal__dialog').forEach(function (d) { d.open = open; });
});
</script>
<?php endif; ?>

<?php render_footer(); ?>
