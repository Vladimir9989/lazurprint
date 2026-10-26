<?php
// Удаляет пользователя админки по номеру (для тестовых учётных записей) и показывает,
// есть ли на него ссылки в других таблицах. Если ссылки есть, без --force не удаляет.
//
//   php admin/tools/delete-user.php --find Фамилия          # найти по фамилии или почте
//   php admin/tools/delete-user.php 7 [--dry] [--force]     # удалить по номеру
//
// Администраторов не удаляет. На хостинге: node admin-remote-exec.js admin/tools/delete-user.php ...

require_once __DIR__ . '/../src/db.php';

$args = array_slice($argv, 1);
if (isset($args[0]) && $args[0] === '--find') {
    $q = '%' . (isset($args[1]) ? $args[1] : '') . '%';
    $st = db()->prepare('SELECT id, first_name, last_name, email, role, status FROM users WHERE last_name LIKE ? OR email LIKE ?');
    $st->execute(array($q, $q));
    foreach ($st->fetchAll() as $u) {
        echo "#{$u['id']} {$u['first_name']} {$u['last_name']} <{$u['email']}> {$u['role']}/{$u['status']}\n";
    }
    exit;
}

$id = null;
$dry = in_array('--dry', $args, true);
$force = in_array('--force', $args, true);
foreach ($args as $a) {
    if (ctype_digit($a)) {
        $id = (int) $a;
    }
}
if (!$id) {
    fwrite(STDERR, "Укажите номер пользователя.\n");
    exit(1);
}
$st = db()->prepare('SELECT * FROM users WHERE id = ?');
$st->execute(array($id));
$u = $st->fetch();
if (!$u) {
    echo "Пользователь #$id не найден.\n";
    exit(1);
}
if ($u['role'] === 'admin') {
    echo "#$id — администратор, не удаляю.\n";
    exit(1);
}

$refs = array(
    'products (создал)' => 'SELECT COUNT(*) FROM products WHERE created_by = ' . $id . ' OR updated_by = ' . $id,
    'photos' => 'SELECT COUNT(*) FROM product_photos WHERE uploaded_by = ' . $id,
    'product_events' => 'SELECT COUNT(*) FROM product_events WHERE user_id = ' . $id,
    'клиенты у него в работе' => 'SELECT COUNT(*) FROM leads WHERE owner_id = ' . $id . ' OR pinned_user_id = ' . $id,
    'клиенты (создал)' => 'SELECT COUNT(*) FROM leads WHERE created_by = ' . $id,
    'история клиентов' => 'SELECT COUNT(*) FROM lead_events WHERE user_id = ' . $id,
    'фото-образцы' => 'SELECT COUNT(*) FROM samples WHERE uploaded_by = ' . $id,
);
$blocking = 0;
echo "Пользователь #$id {$u['first_name']} {$u['last_name']} <{$u['email']}> {$u['role']}\n";
foreach ($refs as $label => $sql) {
    try {
        $n = (int) db()->query($sql)->fetchColumn();
    } catch (Exception $e) {
        $n = 0; // такой таблицы нет
    }
    echo "  $label: $n\n";
    $blocking += $n;
}
if ($dry) {
    echo "(проверка, ничего не удалено)\n";
    exit;
}
if ($blocking && !$force) {
    echo "Есть связанные записи, не удаляю (нужен --force).\n";
    exit(1);
}
db()->prepare('DELETE FROM users WHERE id = ?')->execute(array($id));
echo "Удалён.\n";
