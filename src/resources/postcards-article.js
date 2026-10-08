// Постраничный скрипт статьи articles112.html «Открытки».
// Слайдеры Swiper по разделам статьи, плавное появление блоков, подсветка чипов-якорей.
// CTA-кнопки открывают форму сами (data-open-form, form-modal.js в app.js).

document.addEventListener('DOMContentLoaded', function () {
    if (typeof Swiper !== 'undefined') {
        const sliders = [
            { sel: '.cal-slider--trust',   prev: '.cal-prev--trust',   next: '.cal-next--trust',   pag: '.cal-pag--trust'   },
            { sel: '.cal-slider--history', prev: '.cal-prev--history', next: '.cal-next--history', pag: '.cal-pag--history' },
            { sel: '.cal-slider--quality', prev: '.cal-prev--quality', next: '.cal-next--quality', pag: '.cal-pag--quality' },
            { sel: '.cal-slider--singles', prev: '.cal-prev--singles', next: '.cal-next--singles', pag: '.cal-pag--singles' },
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
                    768: { slidesPerView: 2,   spaceBetween: 24 },
                    1024: { slidesPerView: 2.3, spaceBetween: 24 },
                },
            });
        });

        // Слайдер «Формы и конструкции» — карточки с текстом, поэтому
        // показываем меньше слайдов за раз, чем в чисто фото-слайдерах.
        if (document.querySelector('.cal-slider--forms')) {
            new Swiper('.cal-slider--forms', {
                slidesPerView: 1,
                spaceBetween: 20,
                grabCursor: true,
                watchOverflow: true,
                pagination: { el: '.cal-pag--forms', clickable: true },
                navigation: { nextEl: '.cal-next--forms', prevEl: '.cal-prev--forms' },
                breakpoints: {
                    576: { slidesPerView: 1.3, spaceBetween: 20 },
                    768: { slidesPerView: 1.7, spaceBetween: 24 },
                    1024: { slidesPerView: 2.1, spaceBetween: 24 },
                },
            });
        }
    }

    // Плавное появление блоков при скролле.
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
