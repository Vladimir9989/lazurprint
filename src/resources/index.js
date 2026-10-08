// Главная страница: слайдеры (hero-баннер, «Наша продукция», дипломы), счётчики цифр, увеличение диплома.
// Нужен swiper-bundle.min.js раньше этого файла.
(function () {
    function initSwiper(selector, options) {
        if (typeof Swiper === 'undefined' || !document.querySelector(selector)) return null;
        return new Swiper(selector, options);
    }

    // Слайдер продукции (блок «Наша продукция»). Подпись справа (заголовок + описание) меняется
    // вместе со слайдом — берём data-title/data-desc с активного слайда. В Swiper 11 loop не клонирует
    // слайды, а переставляет их, поэтому slides[activeIndex] — именно видимый слайд.
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
            productsInfoTitle.textContent = title || '';
            productsInfoDesc.textContent = desc || '';
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
        // Swiper при смене брейкпоинта меняет только указанные в нём параметры, поэтому centeredSlides
        // задан в обоих: иначе после сужения окна ниже 1320px и обратного расширения центровка не возвращалась.
        breakpoints: {
            1320: {
                centeredSlides: true,
            },
            300: {
                centeredSlides: false,
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

    // Счётчики цифр — считают один раз, когда блок .counter впервые появляется на экране, дальше стоят на итоговых числах
    const counter = document.querySelector('.counter');
    const COUNT_TIME = 1500;
    const COUNTERS = [
        // [id, итоговое число, шаг]
        ['out-1', 114, 1],
        ['out-2', 29, 1],
        ['out-3', 98, 1],
        ['out-4', 93, 1],
        ['out-5', 445, 10],
        ['out-6', 104, 1],
    ];
    const running = {}; // id → интервал (защита от второго счёта поверх первого)

    function outNum(id, num, step) {
        const el = document.getElementById(id);
        if (!el) return;
        clearInterval(running[id]);
        let n = 0;
        const t = Math.round(COUNT_TIME / (num / step));
        running[id] = setInterval(function () {
            n = n + step;
            if (n >= num) {
                n = num;
                clearInterval(running[id]);
            }
            el.textContent = n;
        }, t);
    }

    if (counter && 'IntersectionObserver' in window) {
        new IntersectionObserver(function (entries, obs) {
            entries.forEach(function (entry) {
                if (entry.isIntersecting) {
                    COUNTERS.forEach(function (c) { outNum(c[0], c[1], c[2]); });
                    obs.unobserve(entry.target);
                }
            });
        }, { threshold: [0.5] }).observe(counter);
    } else if (counter) {
        // старый браузер без IntersectionObserver — сразу итоговые числа, а не пустые места
        COUNTERS.forEach(function (c) {
            const el = document.getElementById(c[0]);
            if (el) el.textContent = c[1];
        });
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

    document.addEventListener('keydown', function (e) {
        if (e.key === 'Escape') benefitModal.classList.remove('benefit-modal--active');
    });
})();
