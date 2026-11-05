(function () {
    'use strict';

    var root = document.getElementById('pp');
    if (!root) { return; }

    var ME = parseInt(root.dataset.me, 10);
    var CAN_EDIT = root.dataset.edit === '1';
    var CARDS = ['Хорхорина', 'Манькова', 'Чудова', 'Петрова', 'ПТО', 'Цифровая печать', 'CtP'];
    var CTP = 'CtP';
    var ST = [['work', 'В работе', 'work'], ['redo', 'На переделке', 'redo'], ['wait', 'Ждём согласования', 'wait'], ['ok', 'Согласовано', 'ok']];
    var CT = [['done', 'Сделано', 'ok'], ['todo', 'Не сделано', 'wait'], ['buy', 'Купить', 'note'], ['ask', 'Спросить', 'note'],
        ['call', 'Позвонить', 'note'], ['give', 'Передать', 'note'], ['order', 'Заказать', 'note'], ['clar', 'Уточнить', 'note']];
    var CLS = {};
    ST.concat(CT).forEach(function (s) { CLS[s[0]] = s[2]; });

    var S = { orders: [], rem: {}, ops: [], names: {}, now: Date.now(), today: '' };
    var offset = 0; // серверное время минус часы этого компьютера
    var view = '', filter = 'all', cfilter = 'all', lastJson = '', pending = false, remT = null, remDirty = {};

    function $(id) { return document.getElementById(id); }
    function esc(t) { return String(t).replace(/[&<>"]/g, function (c) { return { '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;' }[c]; }); }
    function nowMs() { return Date.now() + offset; }
    function pad(n) { return String(n).padStart(2, '0'); }
    function shift(s, n) { var p = s.split('-'), d = new Date(+p[0], +p[1] - 1, +p[2] + n); return d.getFullYear() + '-' + pad(d.getMonth() + 1) + '-' + pad(d.getDate()); }
    function fmt(s) { var p = s.split('-'); return p[2] + '.' + p[1] + '.' + p[0]; }
    function longFmt(s) { var p = s.split('-'); return new Date(+p[0], +p[1] - 1, +p[2]).toLocaleDateString('ru-RU', { weekday: 'short', day: 'numeric', month: 'long' }); }
    function isCt(o) { return o.card === CTP; }
    function isDone(o) { return o.st === 'ok' || o.st === 'done'; }
    function setFor(c) { return c === CTP ? CT : ST; }
    function lab(st) { var a = ST.concat(CT); for (var i = 0; i < a.length; i++) { if (a[i][0] === st) { return a[i][1]; } } return st; }
    function nameOf(id) { return S.names[id] || '?'; }
    function dur(x) { var m = Math.floor(x / 60000), h = Math.floor(m / 60); return h ? h + ' ч ' + pad(m % 60) + ' мин' : m + ' мин'; }

    function opText(o) {
        var s = '';
        if (o.op) {
            var x = (o.t && o.t['u' + o.op] || 0) + (o.since ? nowMs() - o.since : 0);
            s = 'Оператор ' + nameOf(o.op) + ' · ' + dur(x) + (o.since ? '' : ' · пауза');
        }
        Object.keys(o.t || {}).forEach(function (k) {
            var id = parseInt(k.slice(1), 10);
            if (id !== o.op && o.t[k]) { s += (s ? ' · ' : '') + 'ранее ' + nameOf(id) + ' ' + dur(o.t[k]); }
        });
        return s;
    }

    function opRow(o) {
        var b = '', t = opText(o), canTake = CAN_EDIT && S.ops.some(function (x) { return x.id === ME; });
        if (!o.op) {
            if (canTake) { b = '<button class="btn btn--sm" data-act="take" data-id="' + o.id + '">Взять в работу</button>'; }
        } else if (o.op === ME) {
            b = (o.since ? '<button class="btn btn--sm btn--secondary" data-act="pause" data-id="' + o.id + '">Пауза</button>'
                : '<button class="btn btn--sm" data-act="resume" data-id="' + o.id + '">Продолжить</button>') +
                '<button class="btn btn--sm btn--secondary" data-act="release" data-id="' + o.id + '">Отпустить</button>';
        }
        if (!t && !b) { return ''; }
        return '<div class="op' + (o.since ? ' live' : '') + '"><span data-live="' + o.id + '">' + esc(t) + '</span><span class="noprint">' + b + '</span></div>';
    }

    function chips(arr, list, cur, att) {
        var h = '<button class="chip' + (cur === 'all' ? ' on' : '') + '" ' + att + '="all">Все <b>' + list.length + '</b></button>';
        arr.forEach(function (s) {
            h += '<button class="chip' + (cur === s[0] ? ' on' : '') + '" ' + att + '="' + s[0] + '" style="--c:var(--' + s[2] + ')">' + s[1] +
                ' <b>' + list.filter(function (o) { return o.st === s[0]; }).length + '</b></button>';
        });
        return h;
    }

    function setMode(extra) {
        var el = $('pp-mode');
        if (el) { el.textContent = 'Общая доска: изменения видят все и они обновляются сами' + (extra ? ' · ' + extra : ''); }
    }

    function render() {
        var ae = document.activeElement, fi = (ae && ae.dataset) ? ae.dataset.rem : undefined, ss = fi !== undefined ? ae.selectionStart : 0;
        $('pp-dlabel').textContent = longFmt(view) + (view === S.today ? ' (сегодня)' : '');
        $('pp-title').textContent = 'Допечатная подготовка — ' + fmt(view) + (filter === 'all' ? '' : ' — ' + lab(filter)) + (cfilter === 'all' ? '' : ' — CtP: ' + lab(cfilter));
        var day = S.orders.filter(function (o) { return o.date === view; });
        var dO = day.filter(function (o) { return !isCt(o); }), dC = day.filter(isCt);
        $('pp-bar').innerHTML = '<span class="pp-sp">Заказы</span>' + chips(ST, dO, filter, 'data-f') + '<span class="pp-sp">CtP</span>' + chips(CT, dC, cfilter, 'data-c');
        $('pp-ops').innerHTML = S.ops.map(function (op) {
            var l = S.orders.filter(function (o) { return o.op === op.id && !isDone(o); });
            return '<span class="opill' + (l.some(function (o) { return o.since; }) ? ' live' : '') + '"><b>' + esc(op.name) + '</b> ' +
                (l.length ? l.map(function (o) { return esc(o.no || o.cm); }).join(', ') : 'свободен') + '</span>';
        }).join('');
        var g = '';
        CARDS.forEach(function (n, i) {
            var ct = n === CTP, all = day.filter(function (o) { return o.card === n; }), f = ct ? cfilter : filter;
            var list = all.filter(function (o) { return f === 'all' || o.st === f; });
            g += '<section class="card"><div class="ch"><h2>' + esc(n) + '</h2><input class="rem" data-rem="' + i + '" placeholder="Напоминание" maxlength="500" value="' +
                esc(S.rem[n] || '') + '" aria-label="Напоминание для ' + esc(n) + '"' + (CAN_EDIT ? '' : ' readonly') + '><span class="cnt">' + all.length + '</span></div>';
            if (!list.length) { g += '<div class="empty">' + (ct ? 'Записей нет' : 'Заказов нет') + '</div>'; }
            list.forEach(function (o) {
                var c = CLS[o.st] || 'work', main = o.no || o.cm, sub = o.no ? o.cm : '';
                var canDel = CAN_EDIT;
                g += '<div class="row r-' + c + '"><div><span class="no">' + esc(main) + '</span>' +
                    (o.from && !isDone(o) ? '<span class="carry">с ' + fmt(o.from).slice(0, 5) + '</span>' : '') + '</div>' +
                    '<div class="ctl"><select class="s-' + c + '" data-id="' + o.id + '" aria-label="Статус"' + (CAN_EDIT ? '' : ' disabled') + '>' +
                    setFor(n).map(function (s) { return '<option value="' + s[0] + '"' + (s[0] === o.st ? ' selected' : '') + '>' + s[1] + '</option>'; }).join('') +
                    '</select>' + (canDel ? '<button class="x noprint" data-del="' + o.id + '" aria-label="Удалить">×</button>' : '') + '</div>' +
                    (sub ? '<div class="cm">' + esc(sub) + '</div>' : '') + (ct ? '' : opRow(o)) + '</div>';
            });
            g += '</section>';
        });
        $('pp-grid').innerHTML = g;
        if (fi !== undefined) {
            var el = document.querySelector('[data-rem="' + fi + '"]');
            if (el) { el.focus(); try { el.setSelectionRange(ss, ss); } catch (e) { } }
        }
    }

    function take(state) {
        S = state;
        offset = state.now - Date.now();
        if (!view) { view = S.today; }
        // Пока человек выбирает статус или печатает напоминание — не перерисовываем под рукой.
        var ae = document.activeElement;
        var busy = ae && ae.closest && ae.closest('#pp-grid') && (ae.tagName === 'SELECT' || ae.tagName === 'INPUT');
        var json = JSON.stringify(state.orders) + JSON.stringify(state.rem) + JSON.stringify(state.ops);
        if (json === lastJson) { return; }
        if (busy) { return; }
        lastJson = json;
        render();
    }

    function showErr(t) { $('pp-err').textContent = t || ''; }

    function api(body) {
        var tokenEl = document.getElementById('global-csrf-token');
        var opts = { credentials: 'same-origin', cache: 'no-store' };
        if (body) {
            opts.method = 'POST';
            opts.headers = { 'Content-Type': 'application/json', 'X-CSRF-Token': tokenEl ? tokenEl.value : '' };
            opts.body = JSON.stringify(body);
        }
        return fetch('prepress-api.php', opts).then(function (r) {
            if (r.status === 401) { location.href = 'login.php'; throw new Error('auth'); }
            return r.json().then(function (d) { return { ok: r.ok, d: d }; });
        });
    }

    function poll() {
        if (pending || document.hidden) { return; }
        api().then(function (x) {
            if (x.ok) { showErr(''); setMode(''); take(x.d.state); }
        }).catch(function () { setMode('нет связи с сервером, повторяю…'); });
    }

    function send(body) {
        pending = true;
        lastJson = '';
        return api(body).then(function (x) {
            showErr(x.ok ? '' : (x.d.error || 'Не удалось сохранить.'));
            if (x.d.state) { take(x.d.state); }
            return x.ok;
        }).catch(function () { showErr('Нет связи с сервером, изменение не сохранено.'); return false; })
            .then(function (ok) { pending = false; return ok; });
    }

    function fillSt() {
        var w = $('pp-who'); if (!w) { return; }
        $('pp-st').innerHTML = setFor(w.value).map(function (s) { return '<option value="' + s[0] + '">' + s[1] + '</option>'; }).join('');
        $('pp-no').placeholder = w.value === CTP ? 'Номер заказа (необязательно)' : 'Номер заказа';
    }

    function add() {
        var no = $('pp-no'), cm = $('pp-cm'), v = no.value.trim(), c = cm.value.trim(), ct = $('pp-who').value === CTP;
        if (ct ? !(v || c) : !v) { (ct ? cm : no).focus(); return; }
        send({ act: 'add', card: $('pp-who').value, no: v, cm: c, st: $('pp-st').value }).then(function (ok) {
            if (ok) { no.value = ''; cm.value = ''; view = S.today; render(); no.focus(); }
        });
    }

    if (CAN_EDIT) {
        $('pp-who').innerHTML = CARDS.map(function (n) { return '<option>' + n + '</option>'; }).join('');
        $('pp-who').onchange = fillSt;
        $('pp-addbtn').onclick = add;
        $('pp-add').addEventListener('keydown', function (e) { if (e.key === 'Enter' && e.target.tagName === 'INPUT') { add(); } });
        fillSt();
    }
    $('pp-prev').onclick = function () { view = shift(view, -1); render(); };
    $('pp-next').onclick = function () { view = shift(view, 1); render(); };
    $('pp-today').onclick = function () { view = S.today; render(); };
    $('pp-print').onclick = function () { window.print(); };
    $('pp-bar').onclick = function (e) {
        var b = e.target.closest('.chip'); if (!b) { return; }
        if (b.dataset.f) { filter = b.dataset.f; } else { cfilter = b.dataset.c; }
        render();
    };

    var grid = $('pp-grid');
    grid.addEventListener('change', function (e) {
        var id = e.target.dataset.id; if (!id) { return; }
        e.target.blur();
        send({ act: 'status', id: id, st: e.target.value });
    });
    grid.addEventListener('input', function (e) {
        var i = e.target.dataset.rem; if (i === undefined || !CAN_EDIT) { return; }
        var n = CARDS[i];
        S.rem[n] = e.target.value;
        clearTimeout(remT);
        remT = setTimeout(function () { send({ act: 'rem', card: n, text: S.rem[n] }); }, 600);
    });
    grid.addEventListener('click', function (e) {
        var d = e.target.dataset.del;
        if (d) { if (confirm('Удалить запись?')) { send({ act: 'delete', id: d }); } return; }
        var a = e.target.closest('[data-act]'); if (!a) { return; }
        send({ act: a.dataset.act, id: a.dataset.id });
    });

    setInterval(poll, 6000);
    setInterval(function () {
        document.querySelectorAll('[data-live]').forEach(function (el) {
            var o = S.orders.filter(function (x) { return x.id === el.dataset.live; })[0];
            if (o) { el.textContent = opText(o); }
        });
    }, 15000);
    document.addEventListener('visibilitychange', function () { if (!document.hidden) { poll(); } });
    setMode('подключение…');
    poll();
}());
