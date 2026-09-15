<?php
require_once __DIR__ . '/../src/bootstrap.php';

$user = require_role(array('admin'));

if ($_SERVER['REQUEST_METHOD'] === 'POST' && isset($_POST['action'])) {
    csrf_check();
    $action = $_POST['action'];
    $target_id = (int) $_POST['user_id'];

    if ($action === 'confirm') {
        confirm_user($target_id);
        flash('success', 'Пользователь подтверждён.');
    } elseif ($action === 'set_role') {
        $result = set_user_role($user, $target_id, (string) $_POST['role']);
        flash($result === true ? 'success' : 'error', $result === true ? 'Роль изменена.' : $result);
    } elseif ($action === 'block') {
        $result = set_user_blocked($user, $target_id, true);
        flash($result === true ? 'success' : 'error', $result === true ? 'Пользователь заблокирован.' : $result);
    } elseif ($action === 'unblock') {
        $result = set_user_blocked($user, $target_id, false);
        flash($result === true ? 'success' : 'error', $result === true ? 'Пользователь разблокирован.' : $result);
    } elseif ($action === 'send_reset') {
        $stmt = db()->prepare('SELECT email FROM users WHERE id = ? LIMIT 1');
        $stmt->execute(array($target_id));
        $target = $stmt->fetch();
        if ($target) {
            request_password_reset($target['email']);
        }
        flash('success', 'Ссылка для сброса пароля отправлена на почту сотрудника.');
    }
    redirect('users.php');
}

$pending = list_pending_users();
$active = db()->query("SELECT * FROM users WHERE status != 'pending' ORDER BY last_name, first_name")->fetchAll();

render_header('Пользователи', $user, 'users');
flash_messages();
?>

<h1 class="h1">Пользователи</h1>

<?php if ($pending): ?>
<div class="panel">
    <h2>Заявки на регистрацию (<?php echo count($pending); ?>)</h2>
    <table class="table">
        <thead><tr><th>Имя</th><th>Почта</th><th>Роль</th><th>Подана</th><th></th></tr></thead>
        <tbody>
        <?php foreach ($pending as $p): ?>
        <tr>
            <td><?php echo h($p['first_name'] . ' ' . $p['last_name']); ?></td>
            <td><?php echo h($p['email']); ?></td>
            <td><?php echo h(role_label($p['role'])); ?></td>
            <td><?php echo h(date('d.m.Y H:i', strtotime($p['created_at']))); ?></td>
            <td>
                <form method="post">
                    <?php echo csrf_field(); ?>
                    <input type="hidden" name="action" value="confirm">
                    <input type="hidden" name="user_id" value="<?php echo (int) $p['id']; ?>">
                    <button type="submit" class="btn btn--sm">Подтвердить</button>
                </form>
            </td>
        </tr>
        <?php endforeach; ?>
        </tbody>
    </table>
</div>
<?php endif; ?>

<div class="panel">
    <h2>Активные и заблокированные</h2>
    <table class="table">
        <thead><tr><th>Имя</th><th>Почта</th><th>Роль</th><th>Статус</th><th>Последний вход</th><th>Действия</th></tr></thead>
        <tbody>
        <?php foreach ($active as $a): $is_self = (int) $a['id'] === (int) $user['id']; ?>
        <tr>
            <td><?php echo h($a['first_name'] . ' ' . $a['last_name']); ?><?php if ($is_self): ?> <span style="color:#9ca3af;">(вы)</span><?php endif; ?></td>
            <td><?php echo h($a['email']); ?></td>
            <td>
                <?php if ($is_self): ?>
                    <?php echo h(role_label($a['role'])); ?>
                <?php else: ?>
                <form method="post" style="display:flex; gap:6px; align-items:center;">
                    <?php echo csrf_field(); ?>
                    <input type="hidden" name="action" value="set_role">
                    <input type="hidden" name="user_id" value="<?php echo (int) $a['id']; ?>">
                    <select name="role" style="padding:4px 6px;">
                        <?php foreach (ROLE_LABELS as $code => $label): ?>
                        <option value="<?php echo h($code); ?>" <?php echo $code === $a['role'] ? 'selected' : ''; ?>><?php echo h($label); ?></option>
                        <?php endforeach; ?>
                    </select>
                    <button type="submit" class="btn btn--sm btn--secondary">Сохранить</button>
                </form>
                <?php endif; ?>
            </td>
            <td><?php echo $a['status'] === 'active' ? 'Активен' : 'Заблокирован'; ?></td>
            <td><?php echo $a['last_login_at'] ? h(date('d.m.Y H:i', strtotime($a['last_login_at']))) : '—'; ?></td>
            <td>
                <?php if ($is_self): ?>
                    —
                <?php else: ?>
                <div style="display:flex; gap:6px; flex-wrap:wrap;">
                    <?php if ($a['status'] === 'active'): ?>
                    <form method="post" onsubmit="return confirm('Заблокировать этого сотрудника? Доступ отключится немедленно.');">
                        <?php echo csrf_field(); ?>
                        <input type="hidden" name="action" value="block">
                        <input type="hidden" name="user_id" value="<?php echo (int) $a['id']; ?>">
                        <button type="submit" class="btn btn--sm btn--danger">Заблокировать</button>
                    </form>
                    <?php else: ?>
                    <form method="post">
                        <?php echo csrf_field(); ?>
                        <input type="hidden" name="action" value="unblock">
                        <input type="hidden" name="user_id" value="<?php echo (int) $a['id']; ?>">
                        <button type="submit" class="btn btn--sm">Разблокировать</button>
                    </form>
                    <?php endif; ?>
                    <form method="post">
                        <?php echo csrf_field(); ?>
                        <input type="hidden" name="action" value="send_reset">
                        <input type="hidden" name="user_id" value="<?php echo (int) $a['id']; ?>">
                        <button type="submit" class="btn btn--sm btn--secondary">Сбросить пароль</button>
                    </form>
                </div>
                <?php endif; ?>
            </td>
        </tr>
        <?php endforeach; ?>
        </tbody>
    </table>
</div>

<?php
render_footer();
