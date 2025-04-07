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
    this.children[1].style.height = "auto";
    this.children[1].style.overflow = "visible";
    this.children[1].style.opacity = "1";
    this.children[1].style.padding = "15px 15px 25px";
  } else {
    return false;
  }
}
function hideSub(e) {
  if (this.children.length > 1) {
    this.children[1].style.height = "0px";
    this.children[1].style.overflow = "hidden";
    this.children[1].style.opacity = "0";
    this.children[1].style.padding = "0";
  } else {
    return false;
  }
}

// Плавный скролл
const anchors = document.querySelectorAll('a[href^="#"]');

for (let anchor of anchors) {
  anchor.addEventListener('click', (e) => {
    e.preventDefault();
    const blockID = anchor.getAttribute('href');
    document.querySelector(blockID).scrollIntoView({
      behavior: "smooth",
      block: "start"
    })
  })
};
//  Навигация каталога
const navBtn = document.querySelector('.header__catalog');
const navItem = document.querySelectorAll('.catalog__nav-item');
const navMenu = document.querySelector('.catalog__nav-menu');

navBtn.addEventListener('click', () => {
  navMenu.classList.toggle('catalog__nav-menu--active');
});

navItem.forEach(el => {
  el.addEventListener('click', () => {
    navMenu.classList.remove('catalog__nav-menu--active')
  })
});


// Кнопка вверх
const btnUp = {
  el: document.querySelector('.btn-up'),
  show() {
    this.el.classList.remove('btn-up_hide');
  },
  hide() {
    this.el.classList.add('btn-up_hide');
  },
  addEventListener() {
    window.addEventListener('scroll', () => {
      const scrollY = window.scrollY || document.documentElement.scrollTop;
      scrollY > 400 ? this.show() : this.hide();
    });
    document.querySelector('.btn-up').onclick = () => {
      window.scrollTo({
        top: 0,
        left: 0,
        behavior: 'smooth'
      });
    }
  }
}

btnUp.addEventListener();

new Swiper('.swiper-container', {

  navigation: {
    nextEl: '.swiper-button-next',
    prevEl: '.swiper-button-prev',
  },

  pagination: {
    el: '.swiper-pagination',
    dynamicBullets: true,
  },
})

const tabsBtn = document.querySelectorAll('.catalog__nav-btn');
const tabsItem = document.querySelectorAll('.catalog__item');


tabsBtn.forEach(element => {
  element.addEventListener('click', (e) => {
    const path = e.currentTarget.dataset.path;
    tabsBtn.forEach(btn => { btn.classList.remove('catalog__nav-btn--active') });
    e.currentTarget.classList.add('catalog__nav-btn--active');
    tabsItem.forEach(function (element) { element.classList.remove('catalog__item--active') });
    document.querySelector(`[data-target="${path}"]`).classList.add('catalog__item--active');
    
  });
});

const galleryBtn = document.querySelector('.hero__btn');
const footerContactsBtn = document.querySelector('.footer__contacts-btn');
const formModal = document.querySelector('.form__modal');
const form = document.querySelector('.form');
const formBtn = document.querySelector('.form__btn');
const formClose = document.querySelector('.form__close');

footerContactsBtn.addEventListener('click', () => {
  formModal.classList.add('modal--active')
  form.classList.remove('hidden')
})

galleryBtn.addEventListener('click', () => {
  formModal.classList.add('modal--active')
  form.classList.remove('hidden')
})

formClose.addEventListener('click', () => {
  formModal.classList.remove('modal--active')
})

formModal.addEventListener('click', (e) => {
  if (e.target === formModal) {
      formModal.classList.remove('modal--active')
  }
});

let selector = document.querySelector('.form__tel');
let im = new Inputmask('+7 (999) 999-99-99');
im.mask(selector);

let validateForms = function (selector, rules) {
  new window.JustValidate(selector, {

      rules: rules,
      messages: {
          name: 'Введите ваше имя',
          tel: 'Введите ваш телефон',
          // email: 'Введите правильный Email',
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
      required: false
  },
  tel: {
      required: true,
      function: () => {
          const phone = selector.inputmask.unmaskedvalue();
          return phone.length === 10;
      }
  }
});

