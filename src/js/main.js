// Бургер меню
let burger = document.querySelector('.burger');
let burgerLine = document.querySelectorAll('.burger__line');
let menu = document.querySelector('.header__menu');
let menuLinks = menu.querySelectorAll('.header__elem-link');

burger.addEventListener('click',
    function () {

        burger.classList.toggle('burger--active');

        menu.classList.toggle('header__menu--active')

        document.body.classList.toggle('stop-scroll');
    }
)
menuLinks.forEach(function (el) {
    el.addEventListener('click', function () {
        burger.classList.remove('burger--active');

        menu.classList.remove('header__menu--active');

        document.body.classList.remove('stop-scroll');
    })
});
// Выпадающий список header
let headerItem = document.getElementsByClassName('header__item');
const headerList = document.querySelectorAll('.header__list');
const headerLink = document.querySelectorAll('.header__link');

if (window.innerWidth > 1024) {
    for (let i = 0; i < headerItem.length; i++) {
        headerItem[i].addEventListener("mouseover", showSub, false);
        headerItem[i].addEventListener("mouseout", hideSub, false);
    }
} else {
    headerList.forEach(el => {
        el.classList.add('hide');
    });
    headerLink.forEach(elem => {
        elem.addEventListener('click', () => {
            elem.nextElementSibling.classList.toggle('hide');
        })
    })
}

function showSub(e) {
    if (this.children.length > 1) {
        this.children[1].classList.add('header__list--active');
    } else {
        return false;
    }
}

function hideSub(e) {
    if (this.children.length > 1) {
        this.children[1].classList.remove('header__list--active');
    } else {
        return false;
    }
}

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
let selector = document.querySelector('.form__tel');
const formLibsReady = typeof window.Inputmask !== 'undefined' && typeof window.JustValidate !== 'undefined';
if (document.getElementById('form') && !formLibsReady) {
    console.error('Форма заявки: не подключены inputmask.min.js / just-validate.min.js перед app.js');
}
if (selector && typeof window.Inputmask !== 'undefined') {
    new Inputmask('+7 (999) 999-99-99').mask(selector);
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
        maxLength: 20,
    },
    // email: true обязательно — свои правила поля заменяют встроенные just-validate целиком,
    // без него формат адреса не проверялся до отправки
    email: {
        required: true,
        email: true,
    },
    tel: {
        required: true,
        function: () => {
            const phone = selector && selector.inputmask ? selector.inputmask.unmaskedvalue() : '';
            return phone.length === 10;
        }
    }
});
// footer accordion
const footerMenuBtn = document.querySelectorAll('.footer__menu-btn');

footerMenuBtn.forEach(item => {
    item.addEventListener('click', () => {
        item.nextElementSibling.classList.toggle('footer-spoller--active');
        item.classList.toggle('footer__menu-btn--active');
    })
});

const newsImg = document.querySelectorAll('.news__img-cnt img');
const imgModal = document.querySelector('.img-modal');
const imgModalCnt = document.querySelector('.img-modal__cnt');
const imgModalClose = document.querySelector('.img__modal-close');

newsImg.forEach(item => {
    if (imgModal) {
        item.addEventListener('click', (e) => {
            let self = e.currentTarget;
            let src = self.src;
            let alt = self.alt
            imgModalCnt.innerHTML = '';
            imgModalCnt.insertAdjacentHTML('afterbegin', generateImg(src, alt));
            imgModal.classList.add('img-modal--active');
        })
    }
});

if (imgModalClose) {
    imgModalClose.addEventListener('click', () => {
        imgModal.classList.remove('img-modal--active');
    })
}

if (imgModal) {
    imgModal.addEventListener('click', (e) => {
        let self = e.target;
        if (self === imgModal) {
            imgModal.classList.remove('img-modal--active');
        }
    })
}

function generateImg(src, alt) {
    return `
        <img src="${src}" alt="${alt}">
    `
}









