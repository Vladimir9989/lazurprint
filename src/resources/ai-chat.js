// Закрытое тестовое окно ИИ-помощника для сотрудников (грузит src/js/components/ai-loader.js, только если есть код доступа).
// Сервер — ai-chat.php: он сам проверяет код, поэтому подделка localStorage ничего не даёт.
// Диалог хранится в sessionStorage вкладки (переживает переходы по сайту). Окно слева внизу.
(function () {
    const code = window.lzAiCode;
    if (!code || document.querySelector('.lzai-fab')) return;

    const API = '/ai-chat.php';
    const KEY = 'lzAiDialog';
    let state = { session: '', messages: [], model: '' };
    let busy = false;

    try {
        const saved = JSON.parse(sessionStorage.getItem(KEY) || 'null');
        if (saved && Array.isArray(saved.messages)) state = saved;
    } catch (e) { /* без сохранения тоже работает */ }
    if (!state.session) state.session = Math.random().toString(36).slice(2, 10) + Date.now().toString(36);

    function save() {
        try { sessionStorage.setItem(KEY, JSON.stringify(state)); } catch (e) { /* ignore */ }
    }

    function api(payload) {
        payload.code = code;
        payload.session = state.session;
        return fetch(API, {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify(payload),
        }).then(function (r) { return r.json(); });
    }

    function el(tag, cls, text) {
        const n = document.createElement(tag);
        if (cls) n.className = cls;
        if (text !== undefined) n.textContent = text;
        return n;
    }

    // Сначала спрашиваем сервер, наш ли это код: окно появляется только после «ok»
    api({ action: 'init' }).then(function (info) {
        if (!info || !info.ok) {
            try { localStorage.removeItem('lzAiCode'); } catch (e) { /* ignore */ }
            return;
        }
        build(info);
    }).catch(function () { /* сеть — тихо ничего не показываем */ });

    function build(info) {
        const fab = el('button', 'lzai-fab', 'Помощник (тест)');
        fab.type = 'button';
        const panel = el('div', 'lzai-panel');
        panel.setAttribute('role', 'dialog');
        panel.setAttribute('aria-label', 'Виртуальный помощник «Лазури» (тест)');

        const head = el('div', 'lzai-head');
        const title = el('div', 'lzai-title', 'Виртуальный помощник «Лазури» (тест)');
        title.appendChild(el('small', '', info.name));
        const reset = el('button', '', 'Заново');
        reset.type = 'button';
        const close = el('button', '', '✕');
        close.type = 'button';
        close.setAttribute('aria-label', 'Закрыть');
        head.append(title, reset, close);

        const bar = el('div', 'lzai-bar');
        const select = el('select');
        Object.keys(info.models).forEach(function (slug) {
            const o = el('option', '', info.models[slug]);
            o.value = slug;
            select.appendChild(o);
        });
        if (state.model && info.models[state.model]) select.value = state.model;
        state.model = select.value;
        select.addEventListener('change', function () { state.model = select.value; save(); });
        bar.appendChild(select);

        const list = el('div', 'lzai-list');
        const form = el('form', 'lzai-form');
        const input = el('textarea');
        input.maxLength = info.maxChars;
        input.placeholder = 'Напишите сообщение…';
        const send = el('button', '', 'Отправить');
        send.type = 'submit';
        form.append(input, send);
        panel.append(head, bar, list, form);
        document.body.append(fab, panel);

        function scroll() { list.scrollTop = list.scrollHeight; }

        function addMeta(reply, text) {
            const meta = el('div', 'lzai-meta', text);
            const wrong = el('button', '', 'ответ неверный');
            wrong.type = 'button';
            wrong.addEventListener('click', function () {
                wrong.remove();
                const fb = el('div', 'lzai-fb');
                const note = el('input');
                note.placeholder = 'Что не так? (необязательно)';
                const ok = el('button', '', 'Отправить');
                ok.type = 'button';
                fb.append(note, ok);
                meta.after(fb);
                note.focus();
                ok.addEventListener('click', function () {
                    api({ action: 'feedback', note: note.value, reply: reply });
                    fb.replaceWith(el('div', 'lzai-meta', 'Замечание записано'));
                });
            });
            meta.appendChild(wrong);
            list.appendChild(meta);
        }

        function metaText(d) {
            const cost = d.cost === null || d.cost === undefined ? '' : ' · $' + Number(d.cost).toFixed(5);
            return d.model.replace('anthropic/', '') + ' · ' + d.tin + '/' + d.tout + ' ток.' + cost + ' · ' + (d.ms / 1000).toFixed(1) + ' с';
        }

        function render() {
            list.textContent = '';
            if (!state.messages.length) {
                list.appendChild(el('div', 'lzai-note', 'Закрытый тест. Пишите как клиент. Ответы и расход видит только администратор.'));
            }
            state.messages.forEach(function (m) {
                list.appendChild(el('div', 'lzai-msg ' + (m.role === 'user' ? 'lzai-user' : 'lzai-bot'), m.content));
                if (m.role === 'assistant' && m.meta) addMeta(m.content, m.meta);
            });
            scroll();
        }

        function fail(text) {
            list.appendChild(el('div', 'lzai-note', text));
            scroll();
        }

        form.addEventListener('submit', function (e) {
            e.preventDefault();
            const text = input.value.trim();
            if (!text || busy) return;
            busy = true;
            send.disabled = true;
            state.messages.push({ role: 'user', content: text });
            input.value = '';
            save();
            render();
            list.appendChild(el('div', 'lzai-note', 'Помощник печатает…'));
            scroll();
            const history = state.messages.map(function (m) { return { role: m.role, content: m.content }; });
            api({ action: 'chat', model: state.model, messages: history }).then(function (d) {
                if (d.ok) {
                    state.messages.push({ role: 'assistant', content: d.reply, meta: metaText(d) });
                    save();
                    render();
                    return;
                }
                state.messages.pop(); // сообщение не ушло — можно отправить снова
                save();
                render();
                const errors = {
                    limit: 'Лимит на сегодня исчерпан.',
                    too_long: 'Сообщение слишком длинное.',
                    unavailable: 'Помощник сейчас недоступен, попробуйте позже.',
                    bad_code: 'Код доступа не подходит.',
                };
                fail(errors[d.error] || 'Не получилось отправить.');
                input.value = text;
            }).catch(function () {
                state.messages.pop();
                save();
                render();
                fail('Нет связи с сервером.');
                input.value = text;
            }).then(function () {
                busy = false;
                send.disabled = false;
                input.focus();
            });
        });

        input.addEventListener('keydown', function (e) {
            if (e.key === 'Enter' && !e.shiftKey) {
                e.preventDefault();
                form.requestSubmit ? form.requestSubmit() : send.click();
            }
        });

        function open() {
            panel.classList.add('lzai-open');
            fab.style.display = 'none';
            render();
            input.focus();
        }
        function shut() {
            panel.classList.remove('lzai-open');
            fab.style.display = '';
        }
        fab.addEventListener('click', open);
        close.addEventListener('click', shut);
        document.addEventListener('keydown', function (e) {
            if (e.key === 'Escape' && panel.classList.contains('lzai-open')) shut();
        });
        reset.addEventListener('click', function () {
            if (busy) return;
            state.messages = [];
            state.session = Math.random().toString(36).slice(2, 10) + Date.now().toString(36);
            save();
            render();
        });
    }
})();
