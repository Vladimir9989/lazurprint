// Постраничный скрипт статьи articles111.html «Календари на заказ».
// Инициализирует слайдеры Swiper по типам календарей и навешивает
// обработчики на CTA-кнопки, открывающие модальную форму расчёта.

document.addEventListener('DOMContentLoaded', function () {
    if (typeof Swiper !== 'undefined') {
        const sliders = [
            { sel: '.cal-slider--quarterly', prev: '.cal-prev--quarterly', next: '.cal-next--quarterly', pag: '.cal-pag--quarterly' },
            { sel: '.cal-slider--desk', prev: '.cal-prev--desk', next: '.cal-next--desk', pag: '.cal-pag--desk' },
            { sel: '.cal-slider--book', prev: '.cal-prev--book', next: '.cal-next--book', pag: '.cal-pag--book' },
            { sel: '.cal-slider--premium', prev: '.cal-prev--premium', next: '.cal-next--premium', pag: '.cal-pag--premium' },
            { sel: '.cal-slider--themed', prev: '.cal-prev--themed', next: '.cal-next--themed', pag: '.cal-pag--themed' },
        ];

        sliders.forEach(function (cfg) {
            if (!document.querySelector(cfg.sel)) return;
            new Swiper(cfg.sel, {
                slidesPerView: 1,
                spaceBetween: 20,
                grabCursor: true,
                watchOverflow: true,
                pagination: { el: cfg.pag, clickable: true },
                navigation: { nextEl: cfg.next, prevEl: cfg.prev },
                breakpoints: {
                    576: { slidesPerView: 1.4, spaceBetween: 20 },
                    768: { slidesPerView: 2, spaceBetween: 24 },
                    1024: { slidesPerView: 2.3, spaceBetween: 24 },
                },
            });
        });
    }

    // CTA-кнопки открывают модальную форму расчёта (та же, что в футере).
    const formModal = document.querySelector('.form__modal');
    const form = document.querySelector('.form');
    if (formModal && form) {
        document.querySelectorAll('.cal-cta').forEach(function (btn) {
            btn.addEventListener('click', function () {
                formModal.classList.add('modal--active');
                form.classList.remove('hidden');
            });
        });
    }
});
