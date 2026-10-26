<?php

function config($key) {
    static $config = null;
    if ($config === null) {
        $override = getenv('LAZUR_ADMIN_CONFIG');
        $config = require ($override ? $override : __DIR__ . '/../config.local.php');
    }
    if (!array_key_exists($key, $config)) {
        throw new Exception('Нет ключа конфига: ' . $key);
    }
    return $config[$key];
}

// Необязательный ключ: если его нет в config.local.php — значение по умолчанию (без исключения).
function config_get($key, $default = '') {
    try {
        return config($key);
    } catch (Exception $e) {
        return $default;
    }
}

function db() {
    static $pdo = null;
    if ($pdo === null) {
        $dsn = 'mysql:host=' . config('db_host') . ';port=' . config('db_port')
            . ';dbname=' . config('db_name') . ';charset=utf8mb4';
        $pdo = new PDO($dsn, config('db_user'), config('db_password'), array(
            PDO::ATTR_ERRMODE => PDO::ERRMODE_EXCEPTION,
            PDO::ATTR_DEFAULT_FETCH_MODE => PDO::FETCH_ASSOC,
            PDO::ATTR_EMULATE_PREPARES => false,
        ));
    }
    return $pdo;
}
