// Главная страница: слайдеры (hero-баннер, «Наша продукция», дипломы), счётчики цифр, увеличение диплома.
// Нужен swiper-bundle.min.js раньше этого файла.
(function () {
    function initSwiper(selector, options) {
        if (typeof Swiper === 'undefined' || !document.querySelector(selector)) return null;
        return new Swiper(selector, options);
    }

    // Слайдер продукции (блок «Наша продукция»). Подпись справа (заголовок + описание) меняется
    // вместе со слайдом — берём data-title/data-desc с активного слайда (в т.ч. клонов loop-режима,
    // у них те же data-атрибуты, что и у оригинала).
    const productsInfoTitle = document.querySelector('.products-showcase__info-title');
    const productsInfoDesc = document.querySelector('.products-showcase__info-desc');
    const productsInfoBlock = document.querySelector('.products-showcase__info');

    function updateProductsInfo(swiper) {
        const activeSlide = swiper.slides[swiper.activeIndex];
        if (!activeSlide || !productsInfoTitle || !productsInfoDesc || !productsInfoBlock) return;

        const title = activeSlide.dataset.title;
        const desc = activeSlide.dataset.desc;
        if (!title && !desc) return;

        productsInfoBlock.classList.add('is-changing');
        setTimeout(function () {
            productsInfoTitle.textContent = title;
            productsInfoDesc.textContent = desc;
            productsInfoBlock.classList.remove('is-changing');
        }, 200);
    }

    initSwiper('.products-showcase__swiper', {
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

    // Hero-баннер
    initSwiper('.hero__banner', {
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
    });

    // Дипломы (куб)
    initSwiper('.benefit__left-cnt', {
        loop: true,
        autoplay: {
            delay: 5000,
        },
        effect: 'cube',
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
        },
    });

    // Счётчики цифр — запускаются, когда блок .counter появляется на экране
    const counter = document.querySelector('.counter');
    const COUNT_TIME = 1500;

    function outNum(num, id, step) {
        const el = document.getElementById(id);
        if (!el) return;
        let n = 0;
        const t = Math.round(COUNT_TIME / (num / step));
        const interval = setInterval(function () {
            n = n + step;
            if (n >= num) {
                n = num;
                clearInterval(interval);
            }
            el.textContent = n;
        }, t);
    }

    if (counter && 'IntersectionObserver' in window) {
        new IntersectionObserver(function (entries) {
            entries.forEach(function (entry) {
                if (entry.isIntersecting) {
                    outNum(114, 'out-1', 1);
                    outNum(29, 'out-2', 1);
                    outNum(98, 'out-3', 1);
                    outNum(93, 'out-4', 1);
                    outNum(445, 'out-5', 10);
                    outNum(104, 'out-6', 1);
                }
            });
        }, { threshold: [0.5] }).observe(counter);
    }

    // Увеличение диплома по клику
    const benefitModal = document.querySelector('.benefit-modal');
    const benefitModalCnt = document.querySelector('.benefit-modal__cnt');
    const benefitModalClose = document.querySelector('.benefit__modal-close');
    if (!benefitModal || !benefitModalCnt) return;

    document.querySelectorAll('.benefit__slide img').forEach(function (img) {
        img.addEventListener('click', function () {
            const big = document.createElement('img');
            big.src = img.src;
            big.alt = img.alt || 'Наши дипломы';
            benefitModalCnt.innerHTML = '';
            benefitModalCnt.appendChild(big);
            benefitModal.classList.add('benefit-modal--active');
        });
    });

    if (benefitModalClose) {
        benefitModalClose.addEventListener('click', function () {
            benefitModal.classList.remove('benefit-modal--active');
        });
    }

    benefitModal.addEventListener('click', function (e) {
        if (e.target === benefitModal) benefitModal.classList.remove('benefit-modal--active');
    });
})();
