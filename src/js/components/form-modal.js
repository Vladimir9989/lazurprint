// Модальная форма заявки «Рассчитать стоимость» (разметка — html/footer.html, есть на всех страницах).
// Открывается любой кнопкой с атрибутом data-open-form; необязательные data-form-title / data-form-desc /
// data-form-text подменяют заголовок, описание и текст комментария. При закрытии всё возвращается к тексту из разметки.
// Капча reCAPTCHA грузится лениво — при первом открытии формы (или фокусе в ней), а не со страницей.
// Наружу — window.lazurForm: open / close / loadCaptcha / getCaptchaResponse / resetCaptcha (их использует main.js).
(function () {
    const modal = document.querySelector('.form__modal');
    const form = modal && modal.querySelector('.form');
    if (!modal || !form) return;

    const title = form.querySelector('.form__title');
    const desc = form.querySelector('.form__desc');
    const textarea = form.querySelector('#textarea');
    const captchaBox = form.querySelector('.g-recaptcha');
    const captchaMsg = form.querySelector('#captcha');

    const defaults = {
        title: title ? title.textContent : '',
        desc: desc ? desc.textContent : '',
    };

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
        if (captchaState !== 'error') setCaptchaMsg('');
        loadCaptcha();
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

    // --- reCAPTCHA ---
    let captchaState = 'idle'; // idle → loading → ready | error
    let widgetId = null;

    function setCaptchaMsg(text) {
        if (!captchaMsg) return;
        captchaMsg.textContent = text;
        captchaMsg.style.color = 'red';
    }

    function renderCaptcha() {
        if (!captchaBox || !window.grecaptcha || typeof window.grecaptcha.render !== 'function') return;
        if (captchaBox.childElementCount === 0) {
            try {
                widgetId = window.grecaptcha.render(captchaBox, { sitekey: captchaBox.getAttribute('data-sitekey') });
            } catch (e) {
                // уже отрисован
            }
        }
        captchaState = 'ready';
    }

    function loadCaptcha() {
        if (!captchaBox || captchaState === 'loading' || captchaState === 'ready') return;
        if (window.grecaptcha && typeof window.grecaptcha.render === 'function') {
            renderCaptcha();
            return;
        }

        captchaState = 'loading';
        window.lazurCaptchaOnload = function () {
            setCaptchaMsg('');
            renderCaptcha();
        };
        const script = document.createElement('script');
        script.src = 'https://www.google.com/recaptcha/api.js?onload=lazurCaptchaOnload&render=explicit';
        script.async = true;
        script.defer = true;
        script.onerror = function () {
            captchaState = 'error';
            script.remove();
            setCaptchaMsg('Не загрузилась проверка «Я не робот». Проверьте интернет и откройте форму ещё раз или позвоните нам.');
        };
        document.head.appendChild(script);
    }

    // Ответ капчи: строка-токен, '' — галочка не поставлена, null — капча не загружена
    function getCaptchaResponse() {
        if (!window.grecaptcha || typeof window.grecaptcha.getResponse !== 'function') return null;
        try {
            return widgetId === null ? window.grecaptcha.getResponse() : window.grecaptcha.getResponse(widgetId);
        } catch (e) {
            return null;
        }
    }

    function resetCaptcha() {
        if (!window.grecaptcha || typeof window.grecaptcha.reset !== 'function') return;
        try {
            if (widgetId === null) window.grecaptcha.reset(); else window.grecaptcha.reset(widgetId);
        } catch (e) {
            // виджета нет
        }
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
                form.querySelectorAll('input:not([type="hidden"]):not([tabindex="-1"]), textarea:not([name="g-recaptcha-response"]), button, a[href], iframe'),
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
    form.addEventListener('focusin', loadCaptcha);

    window.lazurForm = {
        open: open,
        close: close,
        loadCaptcha: loadCaptcha,
        getCaptchaResponse: getCaptchaResponse,
        resetCaptcha: resetCaptcha,
    };
})();
