// Общая логика всех страниц (бандл app.js): бургер, выпадающие меню шапки, форма заявки (проверка и отправка),
// аккордеон подвала, увеличение фото в статьях. Всё в IIFE — в глобальную область ничего не попадает.
(function () {
    // Бургер меню
    const burger = document.querySelector('.burger');
    const menu = document.querySelector('.header__menu');

    function setMenuOpen(open) {
        if (!burger || !menu) return;
        burger.classList.toggle('burger--active', open);
        menu.classList.toggle('header__menu--active', open);
        document.body.classList.toggle('stop-scroll', open);
        burger.setAttribute('aria-expanded', open ? 'true' : 'false');
        burger.setAttribute('aria-label', open ? 'Закрыть меню' : 'Открыть меню');
    }

    if (burger && menu) {
        burger.addEventListener('click', function () {
            setMenuOpen(!menu.classList.contains('header__menu--active'));
        });
        menu.querySelectorAll('.header__elem-link').forEach(function (el) {
            el.addEventListener('click', function () {
                setMenuOpen(false);
            });
        });
    }

    // Выпадающие списки шапки. Широкий экран (>1024px, как $breakpoint_xl) — по наведению,
    // узкий (меню в бургере) — по нажатию на пункт, закрытые подсписки скрыты классом .hide.
    // Режим проверяется в момент события, а при пересечении границы (поворот планшета, изменение окна)
    // классы пересчитываются — раньше режим выбирался один раз при загрузке.
    const wideMenu = window.matchMedia ? window.matchMedia('(min-width: 1025px)') : null;
    const isWide = function () {
        return wideMenu ? wideMenu.matches : window.innerWidth > 1024;
    };

    function subList(item) {
        return item.children.length > 1 ? item.children[1] : null;
    }

    function setSubOpen(item, open) {
        const list = subList(item);
        if (!list) return;
        const link = item.querySelector('.header__link');
        if (isWide()) list.classList.toggle('header__list--active', open);
        else list.classList.toggle('hide', !open);
        list.setAttribute('aria-hidden', open ? 'false' : 'true');
        if (link) link.setAttribute('aria-expanded', open ? 'true' : 'false');
    }

    const headerItems = document.querySelectorAll('.header__item');

    function applyMenuMode() {
        headerItems.forEach(function (item) {
            const list = subList(item);
            if (!list) return;
            list.classList.remove('header__list--active');
            list.classList.toggle('hide', !isWide());
            list.setAttribute('aria-hidden', 'true');
            const link = item.querySelector('.header__link');
            if (link) link.setAttribute('aria-expanded', 'false');
        });
    }

    applyMenuMode();
    if (wideMenu) {
        if (wideMenu.addEventListener) wideMenu.addEventListener('change', applyMenuMode);
        else if (wideMenu.addListener) wideMenu.addListener(applyMenuMode);
    }

    headerItems.forEach(function (item) {
        item.addEventListener('mouseenter', function () {
            if (isWide()) setSubOpen(item, true);
        });
        item.addEventListener('mouseleave', function () {
            if (isWide()) setSubOpen(item, false);
        });
        // фокус ушёл из пункта (Tab дальше) — закрыть его список на широком экране
        item.addEventListener('focusout', function (e) {
            if (isWide() && !item.contains(e.relatedTarget)) setSubOpen(item, false);
        });
        const link = item.querySelector('.header__link');
        if (!link) return;
        link.addEventListener('click', function (e) {
            const list = subList(item);
            if (!list) return;
            if (!isWide()) {
                setSubOpen(item, list.classList.contains('hide'));
            } else if (e.detail === 0) {
                // на широком экране мышь открывает по наведению; Enter/пробел с клавиатуры (detail 0) — переключают
                setSubOpen(item, !list.classList.contains('header__list--active'));
            }
        });
    });

    // Кнопка соцсетей отключена (2026-09-24) — тестируем чат Битрикс24 вместо неё.
    // const dropdownMenu = document.querySelector('.dropdown-menu');
    // const mainBtn = document.querySelector('.main-button');
    // const iconMessages = document.querySelector('.icon-cnt-messages');
    // const iconClose = document.querySelector('.icon-cnt-close');

    // mainBtn.addEventListener('click', () => {
    //     dropdownMenu.classList.toggle('show');
    //     iconMessages.classList.toggle('hidden');
    //     iconClose.classList.toggle('hidden');
    // })

    // валидация

    // inputmask.min.js и just-validate.min.js должны стоять на странице перед app.js (см. CLAUDE.md, «Форма заявки»)
    const telInput = document.querySelector('.form__tel');
    const formLibsReady = typeof window.Inputmask !== 'undefined' && typeof window.JustValidate !== 'undefined';
    if (document.getElementById('form') && !formLibsReady) {
        console.error('Форма заявки: не подключены inputmask.min.js / just-validate.min.js перед app.js');
    }
    if (telInput && typeof window.Inputmask !== 'undefined') {
        new Inputmask('+7 (999) 999-99-99').mask(telInput);
    }

    // антиспам: запоминаем момент загрузки страницы; при отправке в form_ts уходит, сколько мс прошло
    // (сервер отсекает слишком быстрые отправки; длительность, а не время — чтобы не зависеть от часов посетителя).
    // Поля добавляются отсюда, а не в разметку: так защита работает на всех страницах без перевыкладки HTML.
    const pageLoadedAt = Date.now();
    (function () {
        const antispamForm = document.getElementById('form');
        if (!antispamForm) return;
        const trap = document.createElement('div');
        trap.setAttribute('aria-hidden', 'true');
        trap.style.cssText = 'position:absolute;left:-9999px;width:1px;height:1px;overflow:hidden;';
        trap.innerHTML = '<label>Сайт <input type="text" name="website" tabindex="-1" autocomplete="off"></label>';
        const ts = document.createElement('input');
        ts.type = 'hidden';
        ts.name = 'form_ts';
        ts.id = 'form_ts';
        antispamForm.appendChild(trap);
        antispamForm.appendChild(ts);
    })();

    let validateForms = function (selector, rules) {
        new window.JustValidate(selector, {
            rules: rules,
            messages: {
                name: 'Введите ваше имя',
                tel: 'Введите ваш телефон',
                email: 'Введите правильный Email',
            },

            submitHandler: function (form) {
                // капча и модалка — src/js/components/form-modal.js
                const lazurForm = window.lazurForm;
                const captchaMsg = document.getElementById('captcha');
                const submitBtn = form.querySelector('.form__btn');
                // ошибки — красным (как задано в разметке), «Отправляем…» — обычным цветом текста
                const say = (text, neutral) => {
                    if (!captchaMsg) return;
                    captchaMsg.textContent = text;
                    captchaMsg.style.color = neutral ? '#333' : 'red';
                };
                if (form.dataset.sending === '1') return;

                const captcha = lazurForm ? lazurForm.getCaptchaResponse() : null;
                if (captcha === null) {
                    if (lazurForm) lazurForm.loadCaptcha();
                    say('Проверка «Я не робот» ещё не загрузилась. Подождите пару секунд и отправьте снова.');
                    return;
                }
                if (captcha === '') {
                    say('Поставьте галочку «Я не робот»');
                    return;
                }

                const formTs = document.getElementById('form_ts');
                if (formTs) formTs.value = Date.now() - pageLoadedAt;
                let formData = new FormData(form);

                say('Отправляем…', true);
                form.dataset.sending = '1';
                if (submitBtn) submitBtn.disabled = true;

                let xhr = new XMLHttpRequest();

                xhr.onreadystatechange = function () {
                    if (xhr.readyState !== 4) return;
                    form.dataset.sending = '';
                    // mail.php отвечает статусом 200: при успехе — пустым телом, при ошибке — текстом.
                    // Успех — только пустой ответ: любой другой текст (в т.ч. сообщение PHP о сбое) — ошибка.
                    const answer = (xhr.responseText || '').trim();
                    let error = '';
                    if (xhr.status !== 200 || answer.indexOf('Произошла ошибка') !== -1) {
                        error = 'Не удалось отправить заявку. Попробуйте ещё раз или позвоните нам.';
                    } else if (answer.indexOf('ВЫ РОБОТ') !== -1) {
                        error = 'Проверка «Я не робот» не пройдена. Поставьте галочку ещё раз.';
                    } else if (answer.indexOf('Слишком много заявок') !== -1) {
                        // лимит считает только ушедшие заявки — значит, предыдущие менеджеры уже получили
                        error = 'Вы уже отправили несколько заявок за последний час — мы их получили и свяжемся с вами. Если вопрос срочный, позвоните нам.';
                    } else if (answer.indexOf('Заполните обязательные поля') !== -1 || answer.indexOf('Некорректный email') !== -1) {
                        error = answer;
                    } else if (answer !== '') {
                        console.warn('Форма заявки: неожиданный ответ mail.php:', answer.slice(0, 300));
                        error = 'Не удалось отправить заявку. Попробуйте ещё раз или позвоните нам.';
                    }
                    // кнопку разблокируем и при успехе: «Назад» со страницы «спасибо» может вернуть эту страницу из кэша браузера
                    if (submitBtn) submitBtn.disabled = false;
                    if (!error) {
                        say('', true);
                        if (lazurForm) lazurForm.resetCaptcha();
                        form.reset();
                        if (lazurForm) lazurForm.close();
                        window.location = 'thanks.html';
                        return;
                    }
                    if (lazurForm) lazurForm.resetCaptcha();
                    say(error);
                };
                xhr.open('POST', 'mail.php', true);
                // без ответа 30 с (обрыв связи) — readyState 4 со статусом 0, ветка ошибки выше разблокирует кнопку
                xhr.timeout = 30000;
                xhr.send(formData);
            }
        });
    }

    if (document.getElementById('form') && formLibsReady) validateForms('#form', {
        name: {
            required: true,
            minLength: 2,
            maxLength: 50,
        },
        // email — по желанию: пустое поле проходит, заполненное проверяется по формату.
        // email: true обязательно — свои правила поля заменяют встроенные just-validate целиком
        email: {
            email: true,
        },
        tel: {
            required: true,
            function: () => {
                const phone = telInput && telInput.inputmask ? telInput.inputmask.unmaskedvalue() : '';
                return phone.length === 10;
            }
        }
    });
    // footer accordion
    const footerMenuBtn = document.querySelectorAll('.footer__menu-btn');

    footerMenuBtn.forEach(item => {
        item.addEventListener('click', () => {
            const list = item.nextElementSibling;
            if (list) list.classList.toggle('footer-spoller--active');
            item.classList.toggle('footer__menu-btn--active');
        })
    });

    // Увеличение фото в статьях/новостях (.news__img-cnt img → модалка .img-modal, есть не на всех страницах)
    const imgModal = document.querySelector('.img-modal');
    const imgModalCnt = imgModal && imgModal.querySelector('.img-modal__cnt');
    if (imgModal && imgModalCnt) {
        const closeImg = function () {
            imgModal.classList.remove('img-modal--active');
        };
        document.querySelectorAll('.news__img-cnt img').forEach(function (item) {
            item.addEventListener('click', function () {
                // элемент, а не HTML-строка: кавычки в alt не ломают разметку
                const img = document.createElement('img');
                img.src = item.currentSrc || item.src;
                img.alt = item.alt || '';
                imgModalCnt.innerHTML = '';
                imgModalCnt.appendChild(img);
                imgModal.classList.add('img-modal--active');
            });
        });
        const imgModalClose = imgModal.querySelector('.img__modal-close');
        if (imgModalClose) imgModalClose.addEventListener('click', closeImg);
        imgModal.addEventListener('click', function (e) {
            if (e.target === imgModal) closeImg();
        });
        document.addEventListener('keydown', function (e) {
            if (e.key === 'Escape' && imgModal.classList.contains('img-modal--active')) closeImg();
        });
    }
})();
