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
            { sel: '.cal-slider--design', prev: '.cal-prev--design', next: '.cal-next--design', pag: '.cal-pag--design' },
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

    // Плавное появление блоков при скролле.
    // Класс cal-js включает скрытое стартовое состояние только при работающем JS,
    // поэтому без JS контент остаётся видимым.
    const article = document.querySelector('.cal-article');
    const reveals = document.querySelectorAll('.cal-reveal');
    if (article && reveals.length) {
        if ('IntersectionObserver' in window) {
            article.classList.add('cal-js');
            const revealObserver = new IntersectionObserver(function (entries, obs) {
                entries.forEach(function (entry) {
                    if (entry.isIntersecting) {
                        entry.target.classList.add('cal-reveal--in');
                        obs.unobserve(entry.target);
                    }
                });
            }, { threshold: 0.12, rootMargin: '0px 0px -8% 0px' });
            reveals.forEach(function (el) { revealObserver.observe(el); });
        }
    }

    // Подсветка активного раздела в липкой навигации (scroll-spy).
    const spyLinks = document.querySelectorAll('.cal-types__chip[data-spy]');
    if (spyLinks.length && 'IntersectionObserver' in window) {
        const linkById = {};
        const sections = [];
        spyLinks.forEach(function (link) {
            const id = link.getAttribute('href').slice(1);
            const section = document.getElementById(id);
            if (section) {
                linkById[id] = link;
                sections.push(section);
            }
        });
        const spyObserver = new IntersectionObserver(function (entries) {
            entries.forEach(function (entry) {
                if (entry.isIntersecting) {
                    spyLinks.forEach(function (l) { l.classList.remove('cal-types__chip--active'); });
                    const active = linkById[entry.target.id];
                    if (active) active.classList.add('cal-types__chip--active');
                }
            });
        }, { rootMargin: '-45% 0px -50% 0px', threshold: 0 });
        sections.forEach(function (s) { spyObserver.observe(s); });
    }
});
