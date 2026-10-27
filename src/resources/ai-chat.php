<?php

// Серверная часть ИИ-помощника (закрытое тестовое окно для сотрудников). Вызывает ai-chat.js, POST JSON.
// Хостинг — PHP 7.3: без синтаксиса PHP 8.
//
// Всё секретное и изменяемое лежит вне веб-корня, на хостинге в /home/c112136/lazurprint.ru/ (на уровень выше www):
//   ai-config.php  — api_key OpenRouter, model, relay_url / relay_secret (посредник: прямой доступ к openrouter.ai с хостинга закрыт);
//   ai-codes.php   — коды доступа сотрудников: 'код' => array('name' => 'Имя', 'admin' => true/false);
//   ai-prompt.txt  — системная инструкция бота (правится обычным текстовым редактором, подхватывается сразу);
//   ai-log/        — журнал диалогов по дням (JSON-строки) и счётчики лимитов.
// Деплой этих файлов НЕ заливает. Шаблон конфига — ai-config.example.php в корне репозитория.
//
// Запрос: {action: init|chat|feedback, code, session, model, messages: [{role, content}], note}
// Ответ:  {ok: true, ...} или {ok: false, error: bad_code|limit|too_long|unavailable|bad_request}.
// Незнакомый код всегда получает bad_code — окно у посторонних не появляется.

header('Content-Type: application/json; charset=utf-8');
header('Cache-Control: no-store');
header('X-Robots-Tag: noindex');

const AI_ROOT = __DIR__ . '/..';

// Лимиты (тестовый режим): сообщений в сутки на человека, запросов в час с IP, суммарно в сутки; длина сообщения; глубина истории
const AI_LIMIT_CODE_DAY = 200;
const AI_LIMIT_IP_HOUR = 60;
const AI_LIMIT_TOTAL_DAY = 1500;
const AI_MAX_CHARS = 1000;
const AI_MAX_HISTORY = 24;
const AI_MAX_TOKENS = 700;

// Модели, которые можно выбрать в окне (slug OpenRouter) — других сервер не принимает
$AI_MODELS = array(
    'anthropic/claude-haiku-4.5'  => 'Claude Haiku 4.5 (быстрая, дешёвая)',
    'anthropic/claude-sonnet-4.5' => 'Claude Sonnet 4.5 (умнее, дороже)',
);

function aiOut($data, $status = 200)
{
    http_response_code($status);
    echo json_encode($data, JSON_UNESCAPED_UNICODE);
    exit;
}

function aiFail($error, $status = 200)
{
    aiOut(array('ok' => false, 'error' => $error), $status);
}

function aiLogDir()
{
    $dir = AI_ROOT . '/ai-log';
    if (!is_dir($dir)) {
        @mkdir($dir, 0700, true);
    }
    return $dir;
}

function aiLog($entry)
{
    $entry = array_merge(array('ts' => date('Y-m-d H:i:s')), $entry);
    @file_put_contents(aiLogDir() . '/' . date('Y-m-d') . '.jsonl', json_encode($entry, JSON_UNESCAPED_UNICODE) . "\n", FILE_APPEND | LOCK_EX);
}

// Счётчики лимитов (файл на сутки, под flock). Возвращает true, если лимит не исчерпан, и увеличивает счётчик.
function aiCount($codeKey, $ip)
{
    $file = aiLogDir() . '/count-' . date('Y-m-d') . '.json';
    $fh = @fopen($file, 'c+');
    if (!$fh) {
        return true; // не смогли открыть — не блокируем тестеров, но это видно в журнале ошибок
    }
    flock($fh, LOCK_EX);
    $raw = stream_get_contents($fh);
    $c = $raw ? json_decode($raw, true) : array();
    if (!is_array($c)) {
        $c = array();
    }
    $hour = date('H');
    $ipKey = 'ip:' . $ip . ':' . $hour;
    $codeN = isset($c['code:' . $codeKey]) ? $c['code:' . $codeKey] : 0;
    $ipN = isset($c[$ipKey]) ? $c[$ipKey] : 0;
    $total = isset($c['total']) ? $c['total'] : 0;
    $ok = $codeN < AI_LIMIT_CODE_DAY && $ipN < AI_LIMIT_IP_HOUR && $total < AI_LIMIT_TOTAL_DAY;
    if ($ok) {
        $c['code:' . $codeKey] = $codeN + 1;
        $c[$ipKey] = $ipN + 1;
        $c['total'] = $total + 1;
        ftruncate($fh, 0);
        rewind($fh);
        fwrite($fh, json_encode($c));
    }
    flock($fh, LOCK_UN);
    fclose($fh);
    return $ok;
}

// --- Запрос ---

if ($_SERVER['REQUEST_METHOD'] !== 'POST') {
    aiFail('bad_request', 404);
}
$in = json_decode(file_get_contents('php://input'), true);
if (!is_array($in)) {
    aiFail('bad_request');
}

$codesFile = AI_ROOT . '/ai-codes.php';
$codes = is_file($codesFile) ? include $codesFile : array();
$code = isset($in['code']) && is_string($in['code']) ? $in['code'] : '';
if (!is_array($codes) || $code === '' || !isset($codes[$code])) {
    aiFail('bad_code');
}
$user = $codes[$code];
$userName = isset($user['name']) ? $user['name'] : 'без имени';
$ip = isset($_SERVER['REMOTE_ADDR']) ? $_SERVER['REMOTE_ADDR'] : '';
$action = isset($in['action']) ? $in['action'] : 'chat';
$session = isset($in['session']) && is_string($in['session']) ? substr(preg_replace('/[^a-z0-9]/i', '', $in['session']), 0, 24) : '';

if ($action === 'init') {
    aiOut(array('ok' => true, 'name' => $userName, 'models' => $AI_MODELS, 'maxChars' => AI_MAX_CHARS));
}

if ($action === 'feedback') {
    $note = isset($in['note']) && is_string($in['note']) ? mb_substr($in['note'], 0, 1000) : '';
    $reply = isset($in['reply']) && is_string($in['reply']) ? mb_substr($in['reply'], 0, 2000) : '';
    aiLog(array('type' => 'feedback', 'user' => $userName, 'session' => $session, 'note' => $note, 'reply' => $reply));
    aiOut(array('ok' => true));
}

if ($action !== 'chat') {
    aiFail('bad_request');
}

// --- Диалог ---

$cfgFile = AI_ROOT . '/ai-config.php';
$cfg = is_file($cfgFile) ? include $cfgFile : null;
if (!is_array($cfg) || empty($cfg['api_key']) || !function_exists('curl_init')) {
    error_log('ai-chat.php: нет ai-config.php, api_key или curl');
    aiFail('unavailable');
}

$model = isset($in['model']) && is_string($in['model']) && isset($AI_MODELS[$in['model']])
    ? $in['model']
    : (!empty($cfg['model']) && isset($AI_MODELS[$cfg['model']]) ? $cfg['model'] : 'anthropic/claude-haiku-4.5');

$messages = array();
if (isset($in['messages']) && is_array($in['messages'])) {
    foreach (array_slice($in['messages'], -AI_MAX_HISTORY) as $m) {
        if (!is_array($m) || !isset($m['role'], $m['content']) || !is_string($m['content'])) {
            continue;
        }
        if ($m['role'] !== 'user' && $m['role'] !== 'assistant') {
            continue;
        }
        if (mb_strlen($m['content']) > AI_MAX_CHARS * 4) { // свои ответы бота длиннее лимита на ввод
            continue;
        }
        $messages[] = array('role' => $m['role'], 'content' => $m['content']);
    }
}
// должна заканчиваться сообщением человека
if (!$messages || $messages[count($messages) - 1]['role'] !== 'user') {
    aiFail('bad_request');
}
$last = $messages[count($messages) - 1]['content'];
if (trim($last) === '') {
    aiFail('bad_request');
}
if (mb_strlen($last) > AI_MAX_CHARS) {
    aiFail('too_long');
}
if (!aiCount($code, $ip)) {
    aiFail('limit');
}

$promptFile = AI_ROOT . '/ai-prompt.txt';
$system = is_file($promptFile) ? trim(file_get_contents($promptFile)) : '';
if ($system === '') {
    $system = 'Ты тестовый помощник сайта типографии «Лазурь» (lazurprint.ru). Отвечай по-русски, коротко и вежливо.';
}
array_unshift($messages, array('role' => 'system', 'content' => $system));

$body = json_encode(array(
    'model'      => $model,
    'max_tokens' => AI_MAX_TOKENS,
    'messages'   => $messages,
    'usage'      => array('include' => true),
), JSON_UNESCAPED_UNICODE);

// Прямой доступ к openrouter.ai с хостинга (РФ) закрыт, поэтому идём через посредника на ai.lazurprint.ru (Vercel)
$useRelay = !empty($cfg['relay_url']) && !empty($cfg['relay_secret']);
$headers = array(
    'Authorization: Bearer ' . $cfg['api_key'],
    'Content-Type: application/json',
    'HTTP-Referer: https://lazurprint.ru',
    'X-Title: Lazur site',
);
if ($useRelay) {
    $headers[] = 'X-Relay-Secret: ' . $cfg['relay_secret'];
    // Запросы крупнее ~13 КБ на пути до Vercel зависают, а инструкция бота ~26 КБ: шлём тело сжатым (русский текст сжимается втрое)
    if (function_exists('gzencode')) {
        $body = gzencode($body, 6);
        $headers[] = 'X-Body-Encoding: gzip';
    }
}
$t = microtime(true);
// Связь с посредником изредка обрывается без ответа — при обрыве (не при ошибке модели) пробуем ещё раз
$resp = false;
$http = 0;
$curlErr = '';
for ($try = 0; $try < 2 && $resp === false; $try++) {
    $ch = curl_init($useRelay ? $cfg['relay_url'] : 'https://openrouter.ai/api/v1/chat/completions');
    curl_setopt_array($ch, array(
        CURLOPT_POST           => true,
        CURLOPT_POSTFIELDS     => $body,
        CURLOPT_RETURNTRANSFER => true,
        CURLOPT_CONNECTTIMEOUT => 8,
        CURLOPT_TIMEOUT        => 28,
        CURLOPT_HTTPHEADER     => $headers,
    ));
    $resp = curl_exec($ch);
    $http = curl_getinfo($ch, CURLINFO_HTTP_CODE);
    $curlErr = curl_error($ch);
    curl_close($ch);
}
$ms = (int)round((microtime(true) - $t) * 1000);

$j = $resp === false ? null : json_decode($resp, true);
if ($http !== 200 || !isset($j['choices'][0]['message']['content'])) {
    $why = $resp === false ? $curlErr : 'HTTP ' . $http . ' ' . substr((string)$resp, 0, 300);
    error_log('ai-chat.php: ' . $why);
    aiLog(array('type' => 'error', 'user' => $userName, 'session' => $session, 'model' => $model, 'why' => $why));
    aiFail('unavailable');
}

$reply = trim($j['choices'][0]['message']['content']);
$u = isset($j['usage']) ? $j['usage'] : array();
$tin = isset($u['prompt_tokens']) ? (int)$u['prompt_tokens'] : 0;
$tout = isset($u['completion_tokens']) ? (int)$u['completion_tokens'] : 0;
$cost = isset($u['cost']) ? (float)$u['cost'] : null;

aiLog(array(
    'type' => 'chat', 'user' => $userName, 'session' => $session, 'model' => $model,
    'q' => $last, 'a' => $reply, 'tin' => $tin, 'tout' => $tout, 'cost' => $cost, 'ms' => $ms,
));

aiOut(array('ok' => true, 'reply' => $reply, 'model' => $model, 'tin' => $tin, 'tout' => $tout, 'cost' => $cost, 'ms' => $ms));
