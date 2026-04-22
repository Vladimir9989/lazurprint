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

const dropdownMenu = document.querySelector('.dropdown-menu');
const mainBtn = document.querySelector('.main-button');
const iconMessages = document.querySelector('.icon-cnt-messages');
const iconClose = document.querySelector('.icon-cnt-close');

mainBtn.addEventListener('click', () => {
    dropdownMenu.classList.toggle('show');
    iconMessages.classList.toggle('hidden');
    iconClose.classList.toggle('hidden');
})

// валидация

let selector = document.querySelector('.form__tel');
let im = new Inputmask('+7 (999) 999-99-99');
im.mask(selector);

let validateForms = function (selector, rules) {
    new window.JustValidate(selector, {
        rules: rules,
        messages: {
            name: 'Введите ваше имя',
            tel: 'Введите ваш телефон',
            email: 'Введите правильный Email',
        },

        submitHandler: function (form) {
            let formData = new FormData(form);

            let xhr = new XMLHttpRequest();

            xhr.onreadystatechange = function () {

                if (grecaptcha.getResponse() == "") {
                    document.getElementById('captcha').innerHTML = "Поставьте галочку";
                } else {
                    document.getElementById('captcha').innerHTML = "Отправлено";
                    form.reset();
                }
                if (xhr.readyState === 4) {
                    if (xhr.status === 200) {
                        formModal.classList.remove('modal--active');
                        window.location = 'thanks.html';
                        console.log('отправленно');
                    }
                }
            }
            xhr.open('POST', 'mail.php', true);
            xhr.send(formData);
            grecaptcha.reset();

            // fileInput.closest('label').querySelector('span').textContent = 'Прикрепить файл';
        }
    });
}

validateForms('#form', {
    name: {
        required: true,
        minLength: 2,
        maxLength: 20,
    },
    email: {
        required: true
    },
    tel: {
        required: true,
        function: () => {
            const phone = selector.inputmask.unmaskedvalue();
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









