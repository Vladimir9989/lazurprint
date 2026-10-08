// Постраничный скрипт страницы магазина «Райский сад» (raiskiy-sad.html).
// Слайдеры Swiper с витринами, плавное появление блоков при скролле, подсветка чипов-якорей.
// CTA-кнопки открывают форму сами (data-open-form, form-modal.js в app.js).

document.addEventListener('DOMContentLoaded', function () {
    if (typeof Swiper !== 'undefined') {
        document.querySelectorAll('[data-sad-slider]').forEach(function (el) {
            new Swiper(el, {
                slidesPerView: 1.15,
                spaceBetween: 16,
                grabCursor: true,
                watchOverflow: true,
                pagination: { el: el.querySelector('.sad-slider__pagination'), clickable: true },
                navigation: {
                    nextEl: el.querySelector('.sad-slider__btn--next'),
                    prevEl: el.querySelector('.sad-slider__btn--prev'),
                },
                breakpoints: {
                    576: { slidesPerView: 1.8, spaceBetween: 18 },
                    768: { slidesPerView: 2.4, spaceBetween: 20 },
                    1024: { slidesPerView: 3, spaceBetween: 22 },
                },
            });
        });
    }

    // Плавное появление блоков при скролле (скрытое стартовое состояние
    // включается только при работающем JS — без него контент виден).
    const page = document.querySelector('.sad-page');
    const reveals = document.querySelectorAll('.sad-reveal');
    if (page && reveals.length && 'IntersectionObserver' in window) {
        page.classList.add('sad-js');
        const revealObserver = new IntersectionObserver(function (entries, obs) {
            entries.forEach(function (entry) {
                if (entry.isIntersecting) {
                    entry.target.classList.add('sad-reveal--in');
                    obs.unobserve(entry.target);
                }
            });
        }, { threshold: 0.12, rootMargin: '0px 0px -8% 0px' });
        reveals.forEach(function (el) { revealObserver.observe(el); });
    }

    // Подсветка чипа текущего раздела.
    const chips = document.querySelectorAll('.sad-chip');
    if (chips.length && 'IntersectionObserver' in window) {
        const byId = {};
        chips.forEach(function (chip) { byId[chip.getAttribute('href').slice(1)] = chip; });
        const spy = new IntersectionObserver(function (entries) {
            entries.forEach(function (entry) {
                if (entry.isIntersecting && byId[entry.target.id]) {
                    chips.forEach(function (c) { c.classList.remove('is-active'); });
                    byId[entry.target.id].classList.add('is-active');
                }
            });
        }, { rootMargin: '-35% 0px -55% 0px' });
        Object.keys(byId).forEach(function (id) {
            const section = document.getElementById(id);
            if (section) spy.observe(section);
        });
    }
});
