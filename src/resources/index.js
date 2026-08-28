// Swiper слайдер продукции (отдельный блок «Наша продукция»)
// Подпись справа (заголовок + описание) меняется вместе со слайдом —
// берём data-title/data-desc с активного слайда (в т.ч. клонов loop-режима,
// у них те же data-атрибуты, что и у оригинала).
const productsInfoTitle = document.querySelector('.products-showcase__info-title');
const productsInfoDesc = document.querySelector('.products-showcase__info-desc');
const productsInfoBlock = document.querySelector('.products-showcase__info');

function updateProductsInfo(swiper) {
    const activeSlide = swiper.slides[swiper.activeIndex];
    if (!activeSlide || !productsInfoTitle || !productsInfoDesc) return;

    const { title, desc } = activeSlide.dataset;
    if (!title && !desc) return;

    productsInfoBlock.classList.add('is-changing');
    setTimeout(function () {
        productsInfoTitle.textContent = title;
        productsInfoDesc.textContent = desc;
        productsInfoBlock.classList.remove('is-changing');
    }, 200);
}

const productsSlider = new Swiper('.products-showcase__swiper', {
    slidesPerView: 1,
    loop: true,
    grabCursor: true,
    effect: 'fade',
    fadeEffect: {
        crossFade: true,
    },
    autoplay: {
        delay: 3500,
        disableOnInteraction: false,
    },
    pagination: {
        el: '.swiper-pagination-products',
        dynamicBullets: true,
    },
    on: {
        init: updateProductsInfo,
        slideChange: updateProductsInfo,
    },
});

// Swiper hero

const heroBanner = new Swiper('.hero__banner', {
    autoplay: {
        delay: 4000,
    },
    slidesPerView: 'auto',
    spaceBetween: 20,
    centeredSlides: true,
    loop: true,
    grabCursor: true,
    breakpoints: {
        1720: {
            slidesPerView: 'auto',
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
        delay: 4000,
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
    autoplay: {
        delay: 5000,
    },
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
            outNum(114, 'out-1', 1);
            outNum(29, 'out-2', 1);
            outNum(98, 'out-3', 1);
            outNum(93, 'out-4', 1);
            outNum(445, 'out-5', 10);
            outNum(104, 'out-6', 1);
            // observer.unobserve(change.target);
        }
    });
}

observer.observe(elements);

// Анимация текста

const heroTitle = document.querySelector('.hero__title--animation');
const heroDescrCnt = document.querySelector('.hero__descr-cnt--animation');
const heroBtn = document.querySelector('.hero__btn--animation');

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



