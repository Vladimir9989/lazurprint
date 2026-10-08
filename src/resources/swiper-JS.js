// Общие слайдеры страниц услуг, «О компании», главной и др.: этапы работы (.steps__swiper),
// преимущества (.benefit__right-cnt).
// Нужен swiper-bundle.min.js раньше этого файла. Слайдер создаётся, только если его блок есть на странице.
(function () {
    if (typeof Swiper === 'undefined') return;

    function init(selector, options) {
        if (document.querySelector(selector)) new Swiper(selector, options);
    }

    init('.steps__swiper', {
        spaceBetween: 30,
        breakpoints: {
            1024: {
                slidesPerView: 3.5,
            },
            720: {
                slidesPerView: 2.5,
            },
            550: {
                slidesPerView: 1.8,
            },
        },
        navigation: {
            nextEl: '.swiper-button-next5',
            prevEl: '.swiper-button-prev5',
        },
    });

    init('.benefit__right-cnt', {
        breakpoints: {
            676: {
                slidesPerView: 2,
                grid: {
                    rows: 2,
                },
            },
            320: {
                slidesPerView: 1,
                grid: {
                    rows: 2,
                },
            },
        },
        spaceBetween: 24,
        navigation: {
            nextEl: '.swiper-button-next2',
            prevEl: '.swiper-button-prev2',
        },
    });
})();
