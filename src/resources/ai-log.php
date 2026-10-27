<?php

// Просмотр журнала тестов ИИ-помощника (только для кода с 'admin' => true в ai-codes.php).
// Открывать: https://lazurprint.ru/ai-log.php?code=КОД_ВЛАДИМИРА[&date=ГГГГ-ММ-ДД][&user=Имя]
// Журнал пишет ai-chat.php; файлы лежат вне веб-корня (/home/c112136/lazurprint.ru/ai-log/). PHP 7.3.

header('Content-Type: text/html; charset=utf-8');
header('Cache-Control: no-store');
header('X-Robots-Tag: noindex');

$root = __DIR__ . '/..';
$codes = is_file($root . '/ai-codes.php') ? include $root . '/ai-codes.php' : array();
$code = isset($_GET['code']) ? (string)$_GET['code'] : '';
if (!is_array($codes) || !isset($codes[$code]) || empty($codes[$code]['admin'])) {
    http_response_code(404);
    exit('Not found');
}

function h($s)
{
    return htmlspecialchars((string)$s, ENT_QUOTES, 'UTF-8');
}

$date = isset($_GET['date']) && preg_match('/^\d{4}-\d{2}-\d{2}$/', $_GET['date']) ? $_GET['date'] : date('Y-m-d');
$onlyUser = isset($_GET['user']) ? (string)$_GET['user'] : '';
$file = $root . '/ai-log/' . $date . '.jsonl';
$rows = array();
if (is_file($file)) {
    foreach (file($file, FILE_IGNORE_NEW_LINES | FILE_SKIP_EMPTY_LINES) as $line) {
        $r = json_decode($line, true);
        if (is_array($r) && ($onlyUser === '' || (isset($r['user']) && $r['user'] === $onlyUser))) {
            $rows[] = $r;
        }
    }
}

$sum = array();
$total = 0;
foreach ($rows as $r) {
    if (isset($r['type']) && $r['type'] === 'chat') {
        $m = isset($r['model']) ? $r['model'] : '?';
        if (!isset($sum[$m])) {
            $sum[$m] = array('n' => 0, 'cost' => 0);
        }
        $sum[$m]['n']++;
        $sum[$m]['cost'] += isset($r['cost']) ? (float)$r['cost'] : 0;
        $total += isset($r['cost']) ? (float)$r['cost'] : 0;
    }
}
$days = array();
foreach (glob($root . '/ai-log/*.jsonl') ?: array() as $f) {
    $days[] = basename($f, '.jsonl');
}
rsort($days);
$q = '?code=' . urlencode($code);
?>
<!doctype html>
<html lang="ru"><head><meta charset="utf-8"><meta name="viewport" content="width=device-width,initial-scale=1">
<meta name="robots" content="noindex"><title>Журнал ИИ-помощника</title>
<style>
body{font:14px/1.45 system-ui,Arial,sans-serif;margin:16px;color:#222;max-width:1000px}
h1{font-size:20px}.row{border:1px solid #dde3f0;border-radius:8px;padding:10px 12px;margin:8px 0;background:#fff}
.q{color:#081f5c;font-weight:600;white-space:pre-wrap}.a{white-space:pre-wrap;margin-top:6px}
.meta{color:#777;font-size:12px;margin-top:6px}.fb{background:#fff4e5;border-color:#f3c98b}.err{background:#fdeaea;border-color:#e9a3a3}
a{color:#3E77FB}
</style></head><body>
<h1>Журнал ИИ-помощника — <?= h($date) ?><?= $onlyUser !== '' ? ', ' . h($onlyUser) : '' ?></h1>
<p>Дни: <?php foreach (array_slice($days, 0, 14) as $d) { ?><a href="<?= h($q) ?>&date=<?= h($d) ?>"><?= h($d) ?></a> <?php } ?></p>
<p><b>Расход за день: $<?= number_format($total, 4) ?></b> (<?= round($total * 95, 2) ?> ₽ по 95 ₽/$ примерно).
<?php foreach ($sum as $m => $s) { ?><br><?= h($m) ?>: <?= (int)$s['n'] ?> ответов, $<?= number_format($s['cost'], 4) ?><?php } ?></p>
<?php foreach (array_reverse($rows) as $r) {
    $type = isset($r['type']) ? $r['type'] : '';
    $cls = $type === 'feedback' ? 'row fb' : ($type === 'error' ? 'row err' : 'row'); ?>
<div class="<?= $cls ?>">
<?php if ($type === 'chat') { ?>
  <div class="q"><?= h($r['q']) ?></div><div class="a"><?= h($r['a']) ?></div>
  <div class="meta"><?= h($r['ts']) ?> · <a href="<?= h($q) ?>&date=<?= h($date) ?>&user=<?= urlencode($r['user']) ?>"><?= h($r['user']) ?></a> · <?= h($r['model']) ?> · вход <?= (int)$r['tin'] ?> / выход <?= (int)$r['tout'] ?> · <?= $r['cost'] === null ? '?' : '$' . h($r['cost']) ?> · <?= round($r['ms'] / 1000, 1) ?> с · диалог <?= h($r['session']) ?></div>
<?php } elseif ($type === 'feedback') { ?>
  <div class="q">Замечание: <?= h($r['note']) ?></div><div class="a">К ответу: <?= h($r['reply']) ?></div>
  <div class="meta"><?= h($r['ts']) ?> · <?= h($r['user']) ?> · диалог <?= h($r['session']) ?></div>
<?php } else { ?>
  <div class="q">Ошибка</div><div class="a"><?= h(isset($r['why']) ? $r['why'] : '') ?></div>
  <div class="meta"><?= h($r['ts']) ?> · <?= h($r['user']) ?> · <?= h(isset($r['model']) ? $r['model'] : '') ?></div>
<?php } ?>
</div>
<?php } ?>
<?php if (!$rows) { ?><p>За этот день записей нет.</p><?php } ?>
</body></html>
