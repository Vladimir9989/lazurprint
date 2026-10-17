<?php
require_once __DIR__ . '/../src/bootstrap.php';

$user = require_role(array('admin', 'manager'));
leads_housekeeping();

$is_admin = is_admin_user($user);

render_header('Клиенты для писем', $user, 'leads');
flash_messages();

if (!$is_admin) {
    $tab = isset($_GET['tab']) && isset(LEAD_TABS[$_GET['tab']]) ? $_GET['tab'] : 'new';
    $counts = leads_tab_counts($user);
    $leads = leads_for_manager($user, $tab);
    ?>
<div class="toolbar">
    <h1 class="h1" style="margin:0; flex:1 1 auto;">Клиенты для писем</h1>
    <a href="samples.php" class="btn btn--secondary btn--sm">Фото-образцы</a>
</div>

<nav class="tabs">
    <?php foreach (LEAD_TABS as $code => $def): ?>
    <a href="leads.php?tab=<?php echo h($code); ?>" class="tabs__item <?php echo $tab === $code ? 'is-active' : ''; ?>">
        <?php echo h($def[0]); ?> <span class="tabs__count"><?php echo (int) $counts[$code]; ?></span>
    </a>
    <?php endforeach; ?>
</nav>

    <?php if (!$leads): ?>
<div class="empty-state">
        <?php if ($tab === 'new'): ?>Свободных клиентов пока нет. Когда появятся новые, придёт письмо на почту.
        <?php elseif ($tab === 'taken'): ?>Нет клиентов «в работе». Возьмите кого-нибудь на вкладке «Новые».
        <?php elseif ($tab === 'sent'): ?>Пока нет отправленных писем без ответа.
        <?php else: ?>Здесь пока пусто.<?php endif; ?>
</div>
    <?php else: ?>
<div class="panel" style="padding:0; overflow-x:auto;">
<table class="table">
    <thead><tr>
        <th>Компания</th><th>Сегмент</th><th>Повод</th>
        <?php if ($tab === 'sent'): ?><th>Отправлено</th><?php endif; ?>
        <th>Статус</th><th></th>
    </tr></thead>
    <tbody>
        <?php foreach ($leads as $l): $days = lead_days_since($l['sent_at']); ?>
    <tr>
        <td>
            <a href="lead.php?id=<?php echo (int) $l['id']; ?>"><strong><?php echo h($l['company']); ?></strong></a>
            <?php if ($l['domain'] !== ''): ?><div class="dim"><?php echo h($l['domain']); ?></div><?php endif; ?>
            <?php if ($tab === 'new' && (int) $l['pinned_user_id'] === (int) $user['id']): ?><span class="badge badge--pinned">закреплён за вами</span><?php endif; ?>
        </td>
        <td><?php echo h($l['segment']); ?></td>
        <td class="dim"><?php echo h(short_text($l['hook'])); ?></td>
        <?php if ($tab === 'sent'): ?>
        <td>
            <?php echo $l['sent_at'] ? h(date('d.m.Y', strtotime($l['sent_at']))) : '—'; ?>
            <?php if ($days !== null): ?><div class="dim"><?php echo (int) $days; ?> дн. назад</div><?php endif; ?>
            <?php if ($l['status'] === 'sent' && $days !== null && $days >= 7): ?><span class="badge badge--remind">пора напомнить</span><?php endif; ?>
        </td>
        <?php endif; ?>
        <td>
            <?php echo lead_badge($l['status']); ?>
        </td>
        <td style="white-space:nowrap;">
            <?php if ($tab === 'new'): ?>
            <form method="post" action="lead-action.php" style="display:inline;">
                <?php echo csrf_field(); ?>
                <input type="hidden" name="action" value="take">
                <input type="hidden" name="lead_id" value="<?php echo (int) $l['id']; ?>">
                <button type="submit" class="btn btn--sm">Беру в работу</button>
            </form>
            <?php endif; ?>
            <a href="lead.php?id=<?php echo (int) $l['id']; ?>" class="btn btn--sm btn--secondary">Открыть</a>
        </td>
    </tr>
        <?php endforeach; ?>
    </tbody>
</table>
</div>
    <?php endif; ?>
    <?php
    render_footer();
    exit;
}

// ---------- админ ----------
$filters = array(
    'q' => isset($_GET['q']) ? trim($_GET['q']) : '',
    'status' => isset($_GET['status']) ? $_GET['status'] : '',
    'segment' => isset($_GET['segment']) ? $_GET['segment'] : '',
    'manager' => isset($_GET['manager']) ? (int) $_GET['manager'] : 0,
    'archived' => !empty($_GET['archived']),
);
$leads = leads_for_admin($filters);
$totals = leads_status_totals();
$managers = managers_list();
$segments = leads_segments();
$unnotified = leads_total_unnotified();
?>
<div class="toolbar">
    <h1 class="h1" style="margin:0; flex:1 1 auto;">Клиенты для писем</h1>
    <a href="lead-edit.php" class="btn">+ Добавить клиента</a>
    <a href="leads-import.php" class="btn btn--secondary btn--sm">Загрузить пачкой</a>
    <a href="leads-report.php" class="btn btn--secondary btn--sm">Отчёт</a>
    <a href="leads-stoplist.php" class="btn btn--secondary btn--sm">Стоп-лист</a>
    <form method="post" action="lead-action.php" style="display:inline;"
        <?php if ($unnotified > 0): ?>data-confirm="Отправить менеджерам письмо о новых клиентах (<?php echo (int) $unnotified; ?>)?"<?php endif; ?>>
        <?php echo csrf_field(); ?>
        <input type="hidden" name="action" value="notify">
        <button type="submit" class="btn btn--sm" <?php echo $unnotified === 0 ? 'disabled style="opacity:.5;cursor:default;"' : ''; ?>
            title="Всем менеджерам уйдёт письмо «добавлены новые клиенты»">Уведомить менеджеров (<?php echo (int) $unnotified; ?>)</button>
    </form>
</div>

<div class="chips">
    <?php foreach (LEAD_STATUS_LABELS as $code => $label): if (empty($totals[$code])) continue; ?>
    <a class="chip <?php echo $filters['status'] === $code ? 'is-active' : ''; ?>" href="leads.php?status=<?php echo h($code); ?>"><?php echo h($label); ?> · <?php echo (int) $totals[$code]; ?></a>
    <?php endforeach; ?>
    <?php if ($filters['status'] !== ''): ?><a class="chip" href="leads.php">Все</a><?php endif; ?>
</div>

<form method="get" class="toolbar">
    <input type="search" name="q" placeholder="Компания, сайт, e-mail, менеджер" value="<?php echo h($filters['q']); ?>">
    <select name="status">
        <option value="">Любой статус</option>
        <?php foreach (LEAD_STATUS_LABELS as $code => $label): ?>
        <option value="<?php echo h($code); ?>" <?php echo $filters['status'] === $code ? 'selected' : ''; ?>><?php echo h($label); ?></option>
        <?php endforeach; ?>
    </select>
    <select name="segment">
        <option value="">Все сегменты</option>
        <?php foreach ($segments as $s): ?>
        <option value="<?php echo h($s); ?>" <?php echo $filters['segment'] === $s ? 'selected' : ''; ?>><?php echo h($s); ?></option>
        <?php endforeach; ?>
    </select>
    <select name="manager">
        <option value="">Все менеджеры</option>
        <?php foreach ($managers as $m): ?>
        <option value="<?php echo (int) $m['id']; ?>" <?php echo $filters['manager'] === (int) $m['id'] ? 'selected' : ''; ?>><?php echo h(user_full_name($m)); ?></option>
        <?php endforeach; ?>
    </select>
    <label class="dim"><input type="checkbox" name="archived" value="1" <?php echo $filters['archived'] ? 'checked' : ''; ?>> с архивом</label>
    <button type="submit" class="btn btn--secondary btn--sm">Найти</button>
</form>

<?php if (!$leads): ?>
<div class="empty-state">Ничего нет. Добавьте клиента или <a href="leads-import.php">загрузите файл</a>.</div>
<?php else: ?>
<div class="panel" style="padding:0; overflow-x:auto;">
<table class="table">
    <thead><tr><th>Компания</th><th>Сегмент</th><th>Канал</th><th>Статус</th><th>Ведёт</th><th>Дата</th><th></th></tr></thead>
    <tbody>
    <?php foreach ($leads as $l): ?>
    <tr class="<?php echo $l['is_archived'] ? 'is-archived' : ''; ?>">
        <td>
            <a href="lead.php?id=<?php echo (int) $l['id']; ?>"><strong><?php echo h($l['company']); ?></strong></a>
            <?php if ($l['domain'] !== ''): ?><div class="dim"><?php echo h($l['domain']); ?></div><?php endif; ?>
            <?php if (!lead_is_ready($l)): ?><span class="badge badge--remind" title="Нет темы, адреса или текста: менеджеры такого клиента не видят">не готово</span><?php endif; ?>
            <?php if ($l['is_archived']): ?><span class="badge badge--archived">архив</span><?php endif; ?>
        </td>
        <td><?php echo h($l['segment']); ?></td>
        <td><?php echo $l['channel'] === 'form' ? 'форма / звонок' : 'e-mail'; ?></td>
        <td><?php echo lead_badge($l['status']); ?></td>
        <td>
            <?php if ($l['owner_name']): echo h($l['owner_name']);
            elseif ($l['pinned_name']): echo h($l['pinned_name']) . ' <span class="dim">(закреплён)</span>';
            elseif ($l['manager_name'] !== ''): echo h($l['manager_name']) . ' <span class="dim">(не зарегистрирован)</span>';
            else: echo '—'; endif; ?>
        </td>
        <td class="dim"><?php echo h(date('d.m.Y', strtotime($l['sent_at'] ? $l['sent_at'] : $l['created_at']))); ?></td>
        <td><a href="lead.php?id=<?php echo (int) $l['id']; ?>" class="btn btn--sm btn--secondary">Открыть</a></td>
    </tr>
    <?php endforeach; ?>
    </tbody>
</table>
</div>
<?php endif; ?>

<?php
render_footer();
