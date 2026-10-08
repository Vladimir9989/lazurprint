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

    // Старые классы кнопок — пока разметка не переведена на data-open-form (партия 2 ТЗ docs/claude/js-cleanup.md).
    const LEGACY = [
        '.hero__btn', '.consultation__btn', '.footer__contacts-btn', '.catalog__btn', '.banner-reklama',
        '.ord-cta', '.sad-cta', '.cal-cta', '.len-cta-open', '.expo-cta-open', '.play-cta-open',
        '.rsk-cta-open', '.vkus-cta-open', '.petal-cta-open', '.zont-cta-open', '.etrn-cta-open',
        '#openFeedbackForm',
    ].join(', ');

    // Тексты кнопки рекламного баннера (раньше задавал work.js)
    const PRESETS = {
        'banner-reklama': {
            title: 'Заказать рекламу',
            desc: 'Оставьте заявку для заказа рекламы на нашем сайте и мы свяжемся с Вами в ближайшее время.',
            text: 'Здравствуйте, мы бы хотели заказать рекламу на вашем сайте https://lazurprint.ru',
        },
    };

    function open(options) {
        const o = options || {};
        if (o.title && title) title.textContent = o.title;
        if (o.desc && desc) desc.textContent = o.desc;
        if (o.text && textarea) textarea.value = o.text;
        modal.classList.add('modal--active');
        form.classList.remove('hidden');
        loadCaptcha();
    }

    function close() {
        modal.classList.remove('modal--active');
        if (title) title.textContent = defaults.title;
        if (desc) desc.textContent = defaults.desc;
        if (textarea) textarea.value = '';
    }

    // --- reCAPTCHA ---
    let captchaState = 'idle'; // idle → loading → ready | error
    let widgetId = null;

    function setCaptchaMsg(text) {
        if (captchaMsg) captchaMsg.textContent = text;
    }

    function renderCaptcha() {
        if (!captchaBox || !window.grecaptcha || typeof window.grecaptcha.render !== 'function') return;
        // На части страниц api.js ещё подключён статически и сам отрисовал виджет — второй раз не рисуем
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
        // Статический api.js уже на странице — он отрисует виджет сам
        if (document.querySelector('script[src*="recaptcha/api.js"]')) return;

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
    function isOpener(el) {
        if (el.hasAttribute('data-open-form')) return true;
        // ссылка со старым классом, ведущая на другую страницу (например, WhatsApp в articles3), форму не открывает
        const href = el.tagName === 'A' ? el.getAttribute('href') : null;
        return !href || href.charAt(0) === '#';
    }

    document.addEventListener('click', function (e) {
        const btn = e.target.closest('[data-open-form], ' + LEGACY);
        if (!btn || !isOpener(btn)) return;
        if (btn.tagName === 'A') e.preventDefault();

        let preset = {};
        Object.keys(PRESETS).forEach(function (cls) {
            if (btn.classList.contains(cls)) preset = PRESETS[cls];
        });
        open({
            title: btn.getAttribute('data-form-title') || preset.title,
            desc: btn.getAttribute('data-form-desc') || preset.desc,
            text: btn.getAttribute('data-form-text') || preset.text,
        });
    });

    const closeBtn = form.querySelector('.form__close');
    if (closeBtn) closeBtn.addEventListener('click', close);

    modal.addEventListener('click', function (e) {
        if (e.target === modal) close();
    });

    document.addEventListener('keydown', function (e) {
        if (e.key === 'Escape' && modal.classList.contains('modal--active')) close();
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
