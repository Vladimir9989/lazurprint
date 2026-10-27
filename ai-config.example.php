<?php
// Шаблон секретов ИИ-помощника сайта (OpenRouter).
// Реальный файл называется ai-config.php (в .gitignore, в git не попадает) и лежит на хостинге
// НА УРОВЕНЬ ВЫШЕ папки сайта: /home/c112136/lazurprint.ru/ai-config.php (не в www — из интернета недоступен).
// Создаётся вручную через файловый менеджер, не через `npm run deploy`. Права желательно 0600.
return array(
    'api_key' => '',                              // ключ OpenRouter вида sk-or-v1-...
    'model'   => 'anthropic/claude-haiku-4.5',    // модель для проверки и первых тестов
);
