// Swiper hero

const heroBanner = new Swiper('.hero__banner', {
    autoplay: {
        delay: 4000,
    },
    slidesPerView: 1.6,
    spaceBetween: 20,
    centeredSlides: true,
    loop: true,
    grabCursor: true,
    breakpoints: {
        1720: {
            slidesPerView: 1.6,
        },
        1320: {
            slidesPerView: 'auto',
        },
        300: {
            centeredSlides: false,
            slidesPerView: 'auto',
        },
      },
    pagination: {
        el: '.swiper-pagination-banner',
        dynamicBullets: true,
    },
})

const heroSwiper = new Swiper('.hero__left-cnt', {
    slidesPerView: 1,
    loop: true,
    autoplay: {
        delay: 5000,
    },
    pagination: {
        el: '.swiper-pagination-staff',
        dynamicBullets: true,
    },
    navigation: {
        nextEl: '.swiper-button-next11',
        prevEl: '.swiper-button-prev11',
    }
});
const heroTopSwiper = new Swiper('.hero__right-cnt', {
    slidesPerView: 1,
    loop: true,
    autoplay: {
        delay: 5000,
    },
    pagination: {
        el: '.swiper-pagination-news',
        dynamicBullets: true,
    },
    navigation: {
        nextEl: '.swiper-button-next12',
        prevEl: '.swiper-button-prev12',
    }
});

const swiper = new Swiper('.benefit__left-cnt', {
    loop: true,
    // autoplay: {
    //     delay: 5000,
    // },
    effect: "cube",
    grabCursor: true,
    cubeEffect: {
        shadow: true,
        slideShadows: true,
        shadowOffset: 20,
        shadowScale: 0.94,
    },

    navigation: {
        nextEl: '.swiper-button-next1',
        prevEl: '.swiper-button-prev1',
    }

});

// Counter

const time = 1500;

function outNum(num, elem, step) {
    let el = document.querySelector('#' + elem);
    let n = 0;
    let t = Math.round(time / (num / step));
    let inteval = setInterval(() => {
        n = n + step;
        if (n >= num) {
            n = num;
            clearInterval(inteval);
        }
        el.textContent = n;
    }, t)
}
// animation counter

let options = {
    threshold: [0.5],
};
let options2 = {
    threshold: [1],
};

let observer = new IntersectionObserver(onEntry, options);
let elements = document.querySelector('.counter');

function onEntry(entry) {
    entry.forEach(change => {
        if (change.isIntersecting) {
            outNum(104, 'out-1', 1);
            outNum(28, 'out-2', 1);
            outNum(93, 'out-3', 1);
            outNum(13, 'out-4', 1);
            outNum(387, 'out-5', 10);
            outNum(95, 'out-6', 1);
            // observer.unobserve(change.target);
        }
    });
}

observer.observe(elements);

// Анимация текста

const heroTitle = document.querySelector('.hero__title--animation');
const heroDescrCnt = document.querySelector('.hero__descr-cnt--animation');
const heroBtn = document.querySelector('.hero__btn--animation');
function animationTextHero() {
    heroDescrCnt.classList.add('active');
}
function animationTitleHero() {
    heroTitle.classList.add('active');
}
function animationBtnHero() {
    heroBtn.classList.add('active');
}

setTimeout(animationBtnHero, 200);
setTimeout(animationTextHero, 150);
setTimeout(animationTitleHero, 100);

const benefitSlide = document.querySelectorAll('.benefit__slide img');
const tenderInfo = document.querySelector('.tender__info');
const benefitModal = document.querySelector('.benefit-modal');
const benefitModalCnt = document.querySelector('.benefit-modal__cnt');
const benefitModalClose = document.querySelector('.benefit__modal-close');

benefitSlide.forEach(item => {
    item.addEventListener('click', (e) => {
        let self = e.currentTarget;
        let src = self.src;
        benefitModalCnt.innerHTML = '';
        benefitModalCnt.insertAdjacentHTML('afterbegin', generateImg(src));
        benefitModal.classList.add('benefit-modal--active');
    })
});

tenderInfo.addEventListener('click', () => {
    benefitModalCnt.innerHTML = '';
    benefitModalCnt.insertAdjacentHTML('afterbegin', generateInfo());
    benefitModal.classList.add('benefit-modal--active');
})

benefitModalClose.addEventListener('click', () => {
    benefitModal.classList.remove('benefit-modal--active');
})

benefitModal.addEventListener('click', (e) => {
    let self = e.target;
    if (self === benefitModal) {
        benefitModal.classList.remove('benefit-modal--active');
    }
})

function generateImg(src) {
    return `
        <img src="${src}" alt="Наши дипломы">
    `
}
function generateInfo() {
    return `
        <div class="tender__content">
            <p class="tender__desc desc text">
                ООО Издательско-полиграфический комплекс "Лазурь" объявляет о проведении открытого тендера на
                поставку  расходных материалов для полиграфии. Просим Вас предоставить свои ценовые предложения на
                весь ассортимент поставляемой вами продукции, заверенные руководством компании, в срок до 1апреля
                2025 г.  На основании ваших КП, нами будет произведен анализ и заключены договоры до 1апреля 2026
                года.
            </p>
            <p class="tender__desc desc text">
                Просьба, учесть условия поставки: автомобильным транспортом или транспортной компанией за счет
                продавца на склад типографии, расположенный по адресу Свердловская обл., г.Реж, ул.П.Морозова, 61.
            </p>
            <p class="tender__desc desc text">
                Условия оплаты: отсрочка платежа до 30 календарных дней.
            </p>
            <p class="tender__desc desc text">
                Приветствуется технологическая поддержка.
            </p>
            <p class="tender__desc desc text">
                Предложения направлять на адрес электронной почты: info@lazurprint.ru
                Контактное лицо: Ефремова Яна, тел. +7(343)227-23-23 +7 922 149-00-97
            </p>
            <p class="tender__desc desc text">
                С уважением к Вам и Вашему бизнесу, <br>
                Генеральный директор ООО ИПК «Лазурь» <br>
                Голендухин А.В. <br>
            </p>
        </div>
        
    `
}



