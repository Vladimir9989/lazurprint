<?php
// Проверка связи хостинга с OpenRouter: один короткий запрос, печатает ответ, токены, стоимость и время.
// Ключ не печатается. Запуск: node admin-remote-exec.js admin/tools/ai-ping.php
// Читает /home/c112136/lazurprint.ru/ai-config.php (на уровень выше www).
if (PHP_SAPI !== 'cli') { http_response_code(404); exit; }

$cfgFile = dirname(__DIR__, 3) . '/ai-config.php';
if (!is_file($cfgFile)) { echo "ОШИБКА: нет файла $cfgFile\n"; exit(1); }
$cfg = include $cfgFile;
if (!is_array($cfg) || empty($cfg['api_key'])) { echo "ОШИБКА: в ai-config.php пустой api_key\n"; exit(1); }
$model = !empty($cfg['model']) ? $cfg['model'] : 'anthropic/claude-haiku-4.5';

if (!function_exists('curl_init')) { echo "ОШИБКА: на хостинге нет расширения curl\n"; exit(1); }

$body = json_encode(array(
    'model'      => $model,
    'max_tokens' => 60,
    'messages'   => array(array('role' => 'user', 'content' => 'Ответь одной короткой фразой по-русски: ты на связи?')),
    'usage'      => array('include' => true),
), JSON_UNESCAPED_UNICODE);

$t = microtime(true);
// Если задан relay_url (Cloudflare Worker), идём через него: хостинг в РФ openrouter.ai блокирует.
$useRelay = !empty($cfg['relay_url']) && !empty($cfg['relay_secret']);
$ch = curl_init($useRelay ? $cfg['relay_url'] : 'https://openrouter.ai/api/v1/chat/completions');
curl_setopt_array($ch, array(
    CURLOPT_POST           => true,
    CURLOPT_POSTFIELDS     => $body,
    CURLOPT_RETURNTRANSFER => true,
    CURLOPT_TIMEOUT        => 40,
    CURLOPT_HTTPHEADER     => array_merge(array(
        'Authorization: Bearer ' . $cfg['api_key'],
        'Content-Type: application/json',
        'HTTP-Referer: https://lazurprint.ru',
        'X-Title: Lazur site',
    ), $useRelay ? array('X-Relay-Secret: ' . $cfg['relay_secret']) : array()),
));
$resp = curl_exec($ch);
$err  = curl_error($ch);
$code = curl_getinfo($ch, CURLINFO_HTTP_CODE);
curl_close($ch);
$sec = round(microtime(true) - $t, 2);

if ($resp === false) { echo "ОШИБКА соединения: $err (до openrouter.ai не достучались)\n"; exit(1); }
$j = json_decode($resp, true);
if ($code !== 200 || !isset($j['choices'][0]['message']['content'])) {
    $msg = isset($j['error']['message']) ? $j['error']['message'] : substr($resp, 0, 300);
    echo "ОШИБКА: HTTP $code — $msg\n";
    exit(1);
}
echo "OK (HTTP 200, {$sec} с)\n";
echo 'Модель: ' . (isset($j['model']) ? $j['model'] : $model) . "\n";
echo 'Ответ: ' . trim($j['choices'][0]['message']['content']) . "\n";
if (isset($j['usage'])) {
    $u = $j['usage'];
    echo 'Токены: вход ' . (isset($u['prompt_tokens']) ? $u['prompt_tokens'] : '?') . ', выход ' . (isset($u['completion_tokens']) ? $u['completion_tokens'] : '?') . "\n";
    if (isset($u['cost'])) echo 'Стоимость запроса: $' . $u['cost'] . "\n";
}
