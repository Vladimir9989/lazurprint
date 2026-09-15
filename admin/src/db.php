<?php

function config($key) {
    static $config = null;
    if ($config === null) {
        $config = require __DIR__ . '/../config.local.php';
    }
    if (!array_key_exists($key, $config)) {
        throw new Exception('Нет ключа конфига: ' . $key);
    }
    return $config[$key];
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
