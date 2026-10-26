<?php
require_once __DIR__ . '/../src/bootstrap.php';

$user = require_role(array('admin', 'manager', 'viewer'));
leads_housekeeping();
$is_admin = is_admin_user($user);
$is_viewer = $user['role'] === 'viewer'; // руководитель: только просмотр
$see_all = $is_admin || $is_viewer;

$id = isset($_GET['id']) ? (int) $_GET['id'] : 0;
$lead = $id ? lead_get($id) : null;
if (!$lead || !lead_matches_user_visibility($lead, $user)) {
    http_response_code(404);
    render_header('Не найдено', $user, 'leads');
    echo '<div class="empty-state">Запись не найдена или недоступна. <a href="leads.php">К списку</a></div>';
    render_footer();
    exit;
}

$stmt = db()->prepare('SELECT * FROM users WHERE id = ? LIMIT 1');
$stmt->execute(array($user['id']));
$me = $stmt->fetch();

$status = $lead['status'];
$is_owner = (int) $lead['owner_id'] === (int) $user['id'];
$is_new = $status === 'new';
$taken = $status === 'taken';
$after_send = in_array($status, LEAD_FOLLOWUP_STATUSES, true);
$postponed = $status === 'postponed';
$due_info = lead_due_info($lead);
$can_act = $is_owner || $is_admin;

// Что показывать как письмо.
if ($is_new) {
    $raw = lead_compose_body($lead['greeting'], $lead['body']);
    $subject_view = $see_all ? $lead['subject'] : lead_render_template($lead['subject'], $me);
    $body_view = $see_all ? $raw : lead_render_template($raw, $me);
    $instr_view = $see_all ? $lead['instructions'] : lead_render_template($lead['instructions'], $me);
} else {
    $subject_view = $lead['subject_final'] !== null ? $lead['subject_final'] : $lead['subject'];
    $body_view = $lead['body_final'] !== null ? $lead['body_final'] : lead_compose_body($lead['greeting'], $lead['body']);
    $instr_view = $lead['instructions'];
}

function copy_row($key, $label, $value, $multiline = false) {
    $value = (string) $value;
    ?>
<div class="copy-row">
    <div class="copy-row__label"><?php echo h($label); ?></div>
    <?php if ($multiline): ?>
    <pre class="copy-row__value copy-row__value--text" id="copy-<?php echo h($key); ?>"><?php echo h($value); ?></pre>
    <?php else: ?>
    <div class="copy-row__value" id="copy-<?php echo h($key); ?>"><?php echo $value !== '' ? h($value) : '<span class="dim">—</span>'; ?></div>
    <?php endif; ?>
    <?php if ($value !== ''): ?><button type="button" class="btn btn--sm btn--secondary" data-copy="copy-<?php echo h($key); ?>">Скопировать</button><?php endif; ?>
</div>
    <?php
}

function post_button($action, $lead_id, $label, $class = 'btn btn--sm', $extra = array(), $confirm = '') {
    ?>
<form method="post" action="lead-action.php" style="display:inline;"<?php echo $confirm !== '' ? ' data-confirm="' . h($confirm) . '"' : ''; ?>>
    <?php echo csrf_field(); ?>
    <input type="hidden" name="action" value="<?php echo h($action); ?>">
    <input type="hidden" name="lead_id" value="<?php echo (int) $lead_id; ?>">
    <?php foreach ($extra as $k => $v): ?><input type="hidden" name="<?php echo h($k); ?>" value="<?php echo h($v); ?>"><?php endforeach; ?>
    <button type="submit" class="<?php echo h($class); ?>"><?php echo h($label); ?></button>
</form>
    <?php
}

$recommended = sample_recommended_category_ids($lead['segment']);
$sample_cats = array();
foreach (sample_categories() as $c) {
    $c['samples'] = sample_list($c['id']);
    if ($c['samples']) {
        $sample_cats[] = $c;
    }
}

render_header($lead['company'], $user, 'leads');
flash_messages();
?>

<div class="toolbar">
    <a href="leads.php" class="btn btn--secondary btn--sm">← К списку</a>
    <h1 class="h1" style="margin:0; flex:1 1 auto;"><?php echo h($lead['company']); ?></h1>
    <?php echo lead_badge($status); ?>
    <?php if ($due_info): ?><span class="badge badge--due-<?php echo h($due_info[1]); ?>"><?php echo h($due_info[0]); ?></span><?php endif; ?>
    <?php if ($postponed && $lead['remind_at']): ?><span class="badge badge--remind">напомнить <?php echo h(date('d.m.Y', strtotime($lead['remind_at']))); ?></span><?php endif; ?>
    <?php if ($lead['is_archived']): ?><span class="badge badge--archived">архив<?php echo $lead['archive_reason'] !== '' ? ': ' . h($lead['archive_reason']) : ''; ?></span><?php endif; ?>
    <?php if ($is_admin): ?><a href="lead-edit.php?id=<?php echo (int) $lead['id']; ?>" class="btn btn--sm">Править</a><?php endif; ?>
</div>

<div class="product-layout lead-layout">
<div>
    <div class="panel">
        <h2>О клиенте</h2>
        <dl class="view-fields">
            <dt>Сайт</dt>
            <dd><?php if ($lead['site'] !== ''): $href = preg_match('~^https?://~i', $lead['site']) ? $lead['site'] : 'http://' . $lead['site']; ?>
                <a href="<?php echo h($href); ?>" target="_blank" rel="noopener noreferrer"><?php echo h($lead['site']); ?></a><?php else: ?><span class="dim">—</span><?php endif; ?></dd>
            <dt>Сегмент</dt><dd><?php echo $lead['segment'] !== '' ? h($lead['segment']) : '<span class="dim">—</span>'; ?></dd>
            <?php if ($lead['hook'] !== null && trim($lead['hook']) !== ''): ?>
            <dt>Повод для письма</dt><dd><?php echo nl2br(h($lead['hook'])); ?></dd>
            <?php endif; ?>
            <?php if ($lead['samples_hint'] !== null && trim($lead['samples_hint']) !== ''): ?>
            <dt>Какие образцы приложить</dt><dd><?php echo nl2br(h($lead['samples_hint'])); ?></dd>
            <?php endif; ?>
            <?php if ($lead['sent_at']): ?>
            <dt>Отправлено</dt><dd><?php echo h(date('d.m.Y', strtotime($lead['sent_at']))); ?> (<?php echo (int) lead_days_since($lead['sent_at']); ?> дн. назад)</dd>
            <?php endif; ?>
            <?php if ($see_all): ?>
            <dt>Ведёт</dt>
            <dd><?php echo $lead['owner_name'] ? h($lead['owner_name']) : ($lead['pinned_name'] ? h($lead['pinned_name']) . ' (закреплён)' : ($lead['manager_name'] !== '' ? h($lead['manager_name']) . ' (не зарегистрирован)' : '—')); ?></dd>
            <dt>Источник / партия</dt><dd><?php echo h(trim($lead['source'] . ' ' . $lead['batch'])) ?: '—'; ?></dd>
            <?php endif; ?>
        </dl>
    </div>

    <?php $recycled = lead_recycle_history($lead['id']); if ($recycled): ?>
    <div class="panel">
        <h2>Раньше с этим клиентом работали</h2>
        <ul class="events">
            <?php foreach ($recycled as $rc): ?>
            <li><time><?php echo h(date('d.m.Y', strtotime($rc['created_at']))); ?></time><?php echo h($rc['message']); ?></li>
            <?php endforeach; ?>
        </ul>
    </div>
    <?php endif; ?>

    <?php if ($can_act && !$is_new): ?>
    <div class="panel">
        <h2>Заметка</h2>
        <form method="post" action="lead-action.php">
            <?php echo csrf_field(); ?>
            <input type="hidden" name="action" value="note">
            <input type="hidden" name="lead_id" value="<?php echo (int) $lead['id']; ?>">
            <div class="field"><textarea name="note" rows="4" placeholder="Что ответили, о чём договорились"><?php echo h($lead['note']); ?></textarea></div>
            <button type="submit" class="btn btn--sm btn--secondary">Сохранить заметку</button>
        </form>
    </div>
    <?php elseif ($see_all && trim((string) $lead['note']) !== ''): ?>
    <div class="panel"><h2>Заметка</h2><p style="margin:0;"><?php echo nl2br(h($lead['note'])); ?></p></div>
    <?php endif; ?>

    <?php if ($is_admin): ?>
    <div class="panel">
        <h2>Админ</h2>
        <form method="post" action="lead-action.php" class="field">
            <?php echo csrf_field(); ?>
            <input type="hidden" name="action" value="assign">
            <input type="hidden" name="lead_id" value="<?php echo (int) $lead['id']; ?>">
            <label for="assign-user"><?php echo $is_new ? 'Закрепить за менеджером' : 'Ведёт менеджер'; ?></label>
            <div style="display:flex; gap:8px;">
                <select name="user_id" id="assign-user">
                    <option value="0">— никто —</option>
                    <?php foreach (managers_list() as $m): $cur = $is_new ? $lead['pinned_user_id'] : $lead['owner_id']; ?>
                    <option value="<?php echo (int) $m['id']; ?>" <?php echo (int) $cur === (int) $m['id'] ? 'selected' : ''; ?>><?php echo h(user_full_name($m)); ?></option>
                    <?php endforeach; ?>
                </select>
                <button type="submit" class="btn btn--sm btn--secondary">Назначить</button>
            </div>
        </form>
        <form method="post" action="lead-action.php" class="field">
            <?php echo csrf_field(); ?>
            <input type="hidden" name="action" value="admin_status">
            <input type="hidden" name="lead_id" value="<?php echo (int) $lead['id']; ?>">
            <label for="adm-status">Поставить статус</label>
            <div style="display:flex; gap:8px;">
                <select name="status" id="adm-status">
                    <?php foreach (LEAD_STATUS_LABELS as $code => $label): ?>
                    <option value="<?php echo h($code); ?>" <?php echo $status === $code ? 'selected' : ''; ?>><?php echo h($label); ?></option>
                    <?php endforeach; ?>
                </select>
                <button type="submit" class="btn btn--sm btn--secondary">Применить</button>
            </div>
        </form>
        <?php if ($lead['is_archived']): ?>
            <?php if ($status !== 'blocked'): post_button('restore', $lead['id'], 'Вернуть из архива', 'btn btn--sm btn--secondary'); endif; ?>
        <?php else: ?>
        <form method="post" action="lead-action.php" style="display:flex; gap:8px;">
            <?php echo csrf_field(); ?>
            <input type="hidden" name="action" value="archive">
            <input type="hidden" name="lead_id" value="<?php echo (int) $lead['id']; ?>">
            <input type="text" name="reason" placeholder="Причина (необязательно)" style="flex:1; padding:6px 8px; border:1px solid var(--color-border); border-radius:8px;">
            <button type="submit" class="btn btn--sm btn--secondary">В архив</button>
        </form>
        <?php endif; ?>
        <?php
        $dups = lead_find_duplicates($lead['domain'], array_merge(lead_email_list($lead['email_to']), lead_email_list($lead['email_cc'])), $lead['id']);
        if ($dups): ?>
        <div class="flash flash--info" style="margin:14px 0 0;">
            Похожие записи:
            <?php foreach ($dups as $d): ?><div><a href="lead.php?id=<?php echo (int) $d['id']; ?>"><?php echo h(lead_duplicate_text($d)); ?></a></div><?php endforeach; ?>
        </div>
        <?php endif; ?>
    </div>
    <?php endif; ?>
</div>

<div>
    <?php if ($is_new): ?>
    <div class="panel">
        <h2>Письмо</h2>
        <?php if ($lead['channel'] === 'form'): ?>
        <p class="dim" style="margin-top:0;">Этому клиенту нет смысла писать на e-mail: заявка уходит через форму на сайте или по телефону. Инструкция появится после того, как вы возьмёте клиента.</p>
        <?php else: ?>
        <p class="dim" style="margin:0 0 8px;"><strong>Кому:</strong> <?php echo h($lead['email_to']); ?><?php echo $lead['email_cc'] !== '' ? ' · <strong>Копия:</strong> ' . h($lead['email_cc']) : ''; ?></p>
        <p class="dim" style="margin:0 0 8px;"><strong>Тема:</strong> <?php echo h($subject_view); ?></p>
        <?php endif; ?>
        <pre class="letter"><?php echo h($body_view); ?></pre>
        <?php if (!$is_viewer): ?>
        <div style="margin-top:14px;">
            <?php post_button('take', $lead['id'], 'Беру в работу', 'btn'); ?>
        </div>
        <?php endif; ?>
        <?php if (!$see_all): ?>
        <p class="dim" style="font-size:12px;">После «Беру в работу» клиент исчезает у остальных менеджеров, а текст письма остаётся у вас: скопируйте его в свою почту (подпись добавится из почты). На отправку письма даётся <?php echo (int) LEAD_TAKE_WORKDAYS; ?> рабочих дня, одновременно можно держать не больше <?php echo (int) LEAD_MAX_TAKEN; ?> клиентов в работе.</p>
        <?php endif; ?>
    </div>

    <?php else: ?>

    <div class="panel">
        <h2><?php echo $lead['channel'] === 'form' ? 'Как отправить заявку' : 'Письмо'; ?></h2>

        <?php if ($lead['channel'] === 'form'): ?>
            <?php if (trim((string) $instr_view) !== ''): ?>
            <div class="instructions"><?php echo nl2br(h($instr_view)); ?></div>
            <?php endif; ?>
            <?php copy_row('text', 'Текст для вставки', $body_view, true); ?>
        <?php else: ?>
            <?php copy_row('to', 'Кому', $lead['email_to']); ?>
            <?php copy_row('cc', 'Копия', $lead['email_cc']); ?>
            <?php copy_row('subject', 'Тема', $subject_view); ?>
            <?php copy_row('text', 'Текст письма', $body_view, true); ?>
            <?php if ($lead['email_to'] !== '' && lead_mail_client($me) === 'copy'): ?>
            <p class="dim" style="margin:16px 0 0; font-size:12px;">Нажмите «Скопировать» у адреса, темы и текста и вставьте в новое письмо в своей почте. Фото прикрепите сами (скачайте ниже).</p>
            <?php elseif ($lead['email_to'] !== ''): ?>
            <p style="margin:16px 0 0;">
                <a class="btn btn--sm" href="<?php echo h(lead_compose_url(lead_mail_client($me), $lead['email_to'], $lead['email_cc'], $subject_view, $body_view)); ?>"
                    target="_blank" rel="noopener">Открыть письмо</a>
                <span class="dim" style="font-size:12px;">Откроется черновик с адресом, темой и текстом. Фото прикрепите сами (скачайте ниже).
                    Если не открывается, смените способ в <a href="profile.php">профиле</a> или пользуйтесь кнопками «Скопировать».</span>
            </p>
            <?php endif; ?>
        <?php endif; ?>

        <?php if ($can_act && !$is_new): ?>
        <details class="letter-edit">
            <summary>Изменить письмо</summary>
            <p class="dim" style="font-size:12px;">Правки сохраняются только в вашей копии письма: кнопки «Скопировать» и «Открыть письмо» будут брать новый текст.</p>
            <form method="post" action="lead-action.php">
                <?php echo csrf_field(); ?>
                <input type="hidden" name="action" value="letter_save">
                <input type="hidden" name="lead_id" value="<?php echo (int) $lead['id']; ?>">
                <?php if ($lead['channel'] !== 'form'): ?>
                <div class="field"><label for="le-subject">Тема</label><input type="text" id="le-subject" name="subject" value="<?php echo h($subject_view); ?>"></div>
                <?php endif; ?>
                <div class="field"><label for="le-body">Текст</label><textarea id="le-body" name="body" rows="14"><?php echo h($body_view); ?></textarea></div>
                <button type="submit" class="btn btn--sm">Сохранить письмо</button>
            </form>
            <form method="post" action="lead-action.php" style="margin-top:8px;" onsubmit="return confirm('Вернуть исходный текст письма? Ваши правки пропадут.');">
                <?php echo csrf_field(); ?>
                <input type="hidden" name="action" value="letter_reset">
                <input type="hidden" name="lead_id" value="<?php echo (int) $lead['id']; ?>">
                <button type="submit" class="linklike">Вернуть исходный текст</button>
            </form>
        </details>
        <?php endif; ?>

        <?php if ($can_act): ?>
        <div class="actions">
            <?php if ($taken): ?>
                <?php if ($due_info): ?><div class="actions__label">Срок: <strong><?php echo h($due_info[0]); ?></strong>. Не успеете — клиент вернётся в общий список.</div><?php endif; ?>
                <?php post_button('sent', $lead['id'], $lead['channel'] === 'form' ? 'Я отправил(а) заявку' : 'Я отправил(а) письмо', 'btn'); ?>
                <?php post_button('release', $lead['id'], 'Отпустить', 'btn btn--secondary', array(), 'Вернуть клиента в общий список?'); ?>
            <?php elseif ($after_send): ?>
                <div class="actions__label">Что ответил клиент:</div>
                <?php foreach (array('replied' => 'Ответили', 'refused' => 'Отказ', 'silent' => 'Без ответа', 'sample_sent' => 'Образец отправлен', 'order' => 'Заказ') as $code => $label):
                    if ($code === 'refused'): ?>
                <details class="postpone">
                    <summary class="btn btn--sm<?php echo $status === 'refused' ? '' : ' btn--secondary'; ?>">Отказ</summary>
                    <form method="post" action="lead-action.php" class="postpone__form">
                        <?php echo csrf_field(); ?>
                        <input type="hidden" name="action" value="status">
                        <input type="hidden" name="status" value="refused">
                        <input type="hidden" name="lead_id" value="<?php echo (int) $lead['id']; ?>">
                        <div class="dim" style="font-size:12px; margin-bottom:6px;">Почему клиент отказался? Причина обязательна: руководитель видит её в отчёте.</div>
                        <select name="refuse_reason" required>
                            <option value="">— выберите причину —</option>
                            <?php foreach (LEAD_REFUSE_REASONS as $rc => $rl): ?><option value="<?php echo h($rc); ?>"><?php echo h($rl); ?></option><?php endforeach; ?>
                        </select>
                        <input type="text" name="refuse_note" maxlength="250" placeholder="Комментарий (для «Другое» обязателен)" style="min-width:240px;">
                        <button type="submit" class="btn btn--sm">Отметить отказ</button>
                    </form>
                </details>
                    <?php else:
                        post_button('status', $lead['id'], $label, 'btn btn--sm' . ($status === $code ? '' : ' btn--secondary'), array('status' => $code));
                    endif;
                endforeach; ?>
                <?php if ($status === 'silent'): post_button('resent', $lead['id'], 'Написал(а) повторно', 'btn btn--sm'); endif; ?>
            <?php elseif ($postponed): ?>
                <div class="actions__label">Клиент отложен<?php echo $lead['remind_at'] ? ' до ' . h(date('d.m.Y', strtotime($lead['remind_at']))) : ''; ?>.</div>
                <?php post_button('resent', $lead['id'], 'Написал(а) повторно', 'btn'); ?>
            <?php endif; ?>
            <?php if (($after_send && $status !== 'order') || $postponed): ?>
            <details class="postpone">
                <summary class="btn btn--sm btn--secondary"><?php echo $postponed ? 'Отложить ещё' : 'Напомнить позже'; ?></summary>
                <form method="post" action="lead-action.php" class="postpone__form">
                    <?php echo csrf_field(); ?>
                    <input type="hidden" name="action" value="postpone">
                    <input type="hidden" name="lead_id" value="<?php echo (int) $lead['id']; ?>">
                    <div class="dim" style="font-size:12px; margin-bottom:6px;">Клиент ответил «свяжемся позже»? В выбранный день он появится у вас на вкладке «Напомнить», и придёт письмо.</div>
                    <select name="months">
                        <?php foreach (LEAD_POSTPONE_MONTHS as $m => $mlabel): ?><option value="<?php echo (int) $m; ?>"><?php echo h($mlabel); ?></option><?php endforeach; ?>
                    </select>
                    <span class="dim">или своя дата:</span>
                    <input type="date" name="date" min="<?php echo h(date('Y-m-d', strtotime('+1 day'))); ?>">
                    <button type="submit" class="btn btn--sm">Отложить</button>
                </form>
            </details>
            <?php endif; ?>
            <?php if (!$lead['is_archived'] && !$is_new): ?>
                <?php post_button('block', $lead['id'], 'Просили не писать', 'btn btn--sm btn--danger', array(), 'Компания и все её адреса навсегда попадут в стоп-лист, запись уйдёт в архив. Продолжить?'); ?>
            <?php endif; ?>
        </div>
        <?php endif; ?>
    </div>

    <?php if ($can_act && ($taken || $postponed || $status === 'sent' || $status === 'silent' || $status === 'replied') && $sample_cats): ?>
    <div class="panel">
        <h2>Фото-образцы для письма</h2>
        <form method="post" action="sample-zip.php" id="sample-picker">
            <?php echo csrf_field(); ?>
            <?php foreach ($sample_cats as $c): $rec = in_array((int) $c['id'], $recommended, true); ?>
            <div class="sample-cat">
                <div class="sample-cat__title">
                    <?php echo h($c['name']); ?>
                    <?php if ($rec): ?><span class="badge badge--pinned">рекомендуем для «<?php echo h($lead['segment']); ?>»</span><?php endif; ?>
                    <button type="button" class="linklike" data-toggle-all="cat-<?php echo (int) $c['id']; ?>">выбрать все</button>
                </div>
                <div class="sample-grid" id="cat-<?php echo (int) $c['id']; ?>">
                    <?php foreach ($c['samples'] as $s): ?>
                    <label class="sample-item">
                        <input type="checkbox" name="ids[]" value="<?php echo (int) $s['id']; ?>" <?php echo $rec ? 'checked' : ''; ?>>
                        <img src="sample.php?id=<?php echo (int) $s['id']; ?>&amp;thumb=1" alt="<?php echo h($s['title']); ?>" loading="lazy">
                        <span><?php echo h($s['title']); ?></span>
                    </label>
                    <?php endforeach; ?>
                </div>
            </div>
            <?php endforeach; ?>
            <div class="sample-fab">
                <button type="button" class="btn" data-download-button>Скачать выбранные</button>
                <button type="button" class="linklike" data-clear-selection>снять выбор</button>
            </div>
            <p class="dim" style="font-size:12px;">Отметьте фото галочкой: кнопка «Скачать выбранные» появится справа внизу. Файлы скачиваются по одному, прикрепите их к письму. Фото для этого клиента уже отмечены, лишние можно снять.</p>
        </form>
    </div>
    <?php endif; ?>

    <?php endif; ?>

    <?php $events = lead_events($lead['id']); if ($events && ($see_all || $is_owner)): ?>
    <div class="panel">
        <h2>История</h2>
        <ul class="events">
            <?php foreach ($events as $e): ?>
            <li><time><?php echo h(date('d.m.Y H:i', strtotime($e['created_at']))); ?><?php echo $e['user_name'] ? ' · ' . h($e['user_name']) : ''; ?></time><?php echo h($e['message']); ?></li>
            <?php endforeach; ?>
        </ul>
    </div>
    <?php endif; ?>
</div>
</div>

<?php
render_footer();
