// Модальная форма заявки «Рассчитать стоимость» (разметка — html/footer.html, есть на всех страницах).
// Открывается любой кнопкой с атрибутом data-open-form; необязательные data-form-title / data-form-desc /
// data-form-text подменяют заголовок, описание и текст комментария. При закрытии всё возвращается к тексту из разметки.
//
// Антиспам (с 2026-11-13 вместо reCAPTCHA Google, серверная часть — mail.php):
//   - при открытии формы (или фокусе в ней) берётся «пропуск» GET mail.php?token → скрытое поле form_token;
//   - любое нажатие/касание/ввод в форме ставит form_hi=1 (признак живого человека);
//   - в поле page уходит адрес страницы (виден в письме менеджерам).
// Наружу — window.lazurForm: open / close / ensureToken / tokenAge (их использует main.js).
(function () {
    const modal = document.querySelector('.form__modal');
    const form = modal && modal.querySelector('.form');
    if (!modal || !form) return;

    const title = form.querySelector('.form__title');
    const desc = form.querySelector('.form__desc');
    const textarea = form.querySelector('#textarea');

    const defaults = {
        title: title ? title.textContent : '',
        desc: desc ? desc.textContent : '',
    };

    // скрытые поля антиспама
    function hidden(name) {
        let el = form.querySelector('input[name="' + name + '"]');
        if (!el) {
            el = document.createElement('input');
            el.type = 'hidden';
            el.name = name;
            form.appendChild(el);
        }
        return el;
    }
    const tokenInput = hidden('form_token');
    const humanInput = hidden('form_hi');
    hidden('page').value = location.pathname + location.search;

    ['keydown', 'input', 'pointerdown', 'touchstart', 'mousedown'].forEach(function (type) {
        form.addEventListener(type, function () {
            humanInput.value = '1';
        }, { passive: true });
    });

    // для экранных читалок — это диалоговое окно; сама форма принимает фокус при открытии (без клавиатуры на телефоне)
    modal.setAttribute('role', 'dialog');
    modal.setAttribute('aria-modal', 'true');
    if (title) {
        if (!title.id) title.id = 'form-title';
        modal.setAttribute('aria-labelledby', title.id);
    }
    form.setAttribute('tabindex', '-1');
    form.style.outline = 'none';

    let opener = null;     // кнопка, которой открыли форму, — вернуть на неё фокус при закрытии
    let prefilled = '';    // текст комментария из data-form-text — стираем при закрытии, только если его не меняли

    function isOpen() {
        return modal.classList.contains('modal--active');
    }

    function open(options) {
        const o = options || {};
        if (o.title && title) title.textContent = o.title;
        if (o.desc && desc) desc.textContent = o.desc;
        if (o.text && textarea) {
            textarea.value = o.text;
            prefilled = o.text;
        }
        if (!isOpen()) opener = document.activeElement;
        modal.classList.add('modal--active');
        form.classList.remove('hidden');
        ensureToken();
        try {
            form.focus({ preventScroll: true });
        } catch (e) {
            form.focus();
        }
    }

    function close() {
        const wasOpen = isOpen();
        modal.classList.remove('modal--active');
        if (title) title.textContent = defaults.title;
        if (desc) desc.textContent = defaults.desc;
        // свой комментарий посетителя не теряем при случайном закрытии; подставленный кнопкой — убираем
        if (textarea && prefilled && textarea.value === prefilled) textarea.value = '';
        prefilled = '';
        if (wasOpen && opener && typeof opener.focus === 'function' && document.contains(opener)) opener.focus();
        opener = null;
    }

    // --- пропуск формы ---
    // tokenAt — когда получен (по часам посетителя: нужна только разница, не точное время).
    // Пропуск живёт сутки; через 20 часов на открытой странице берём новый.
    let tokenAt = 0;
    let waiters = null; // колбэки, ждущие текущий запрос; null — запроса нет

    function tokenAge() {
        return tokenInput.value ? Date.now() - tokenAt : -1;
    }

    // cb(true) — пропуск есть, cb(false) — не удалось получить (нет связи). Обрыв соединения — до 3 попыток.
    function ensureToken(cb) {
        if (tokenInput.value && tokenAge() < 20 * 3600 * 1000) {
            if (cb) cb(true);
            return;
        }
        if (waiters) {
            if (cb) waiters.push(cb);
            return;
        }
        waiters = cb ? [cb] : [];
        let tries = 0;
        const done = function (ok) {
            const list = waiters;
            waiters = null;
            list.forEach(function (f) { f(ok); });
        };
        const attempt = function () {
            tries++;
            const xhr = new XMLHttpRequest();
            xhr.onreadystatechange = function () {
                if (xhr.readyState !== 4) return;
                const t = (xhr.responseText || '').trim();
                if (xhr.status === 200 && /^\d+\.[0-9a-f]{32}$/.test(t)) {
                    tokenInput.value = t;
                    tokenAt = Date.now();
                    done(true);
                } else if (tries < 3) {
                    setTimeout(attempt, 1000 * tries);
                } else {
                    done(false);
                }
            };
            xhr.open('GET', 'mail.php?token=' + Date.now(), true);
            xhr.timeout = 15000;
            xhr.send();
        };
        attempt();
    }

    // --- события ---
    document.addEventListener('click', function (e) {
        const btn = e.target.closest('[data-open-form]');
        if (!btn) return;
        if (btn.tagName === 'A') e.preventDefault();
        open({
            title: btn.getAttribute('data-form-title'),
            desc: btn.getAttribute('data-form-desc'),
            text: btn.getAttribute('data-form-text'),
        });
    });

    const closeBtn = form.querySelector('.form__close');
    if (closeBtn) closeBtn.addEventListener('click', close);

    modal.addEventListener('click', function (e) {
        if (e.target === modal) close();
    });

    document.addEventListener('keydown', function (e) {
        if (!isOpen()) return;
        if (e.key === 'Escape') {
            close();
            return;
        }
        // Tab не уходит из открытой формы на страницу под ней
        if (e.key === 'Tab') {
            const items = Array.prototype.filter.call(
                form.querySelectorAll('input:not([type="hidden"]):not([tabindex="-1"]), textarea, button, a[href]'),
                function (el) { return !el.disabled; }
            );
            if (!items.length) return;
            const first = items[0];
            const last = items[items.length - 1];
            const active = document.activeElement;
            if (e.shiftKey && (active === first || active === form)) {
                e.preventDefault();
                last.focus();
            } else if (!e.shiftKey && active === last) {
                e.preventDefault();
                first.focus();
            } else if (!form.contains(active)) {
                e.preventDefault();
                first.focus();
            }
        }
    });

    // на случай, если форма видна без открытия модалки
    form.addEventListener('focusin', function () {
        ensureToken();
    });

    window.lazurForm = {
        open: open,
        close: close,
        ensureToken: ensureToken,
        tokenAge: tokenAge,
    };
})();
