# Запуск локального сервера админ-панели (PHP built-in server + Laragon MySQL).
# Перед запуском: открыть Laragon и нажать "Start All" (MySQL должен быть поднят).

$php = "C:\laragon\bin\php\php-8.3.33-Win32-vs16-x64\php.exe"
$docroot = Join-Path $PSScriptRoot "public"

Write-Host "Админка: http://127.0.0.1:8000/  (Ctrl+C для остановки)"
# Лимиты загрузки подняты: фото-образцы для писем бывают в несколько МБ.
& $php -d upload_max_filesize=40M -d post_max_size=80M -d memory_limit=512M -S 127.0.0.1:8000 -t $docroot
