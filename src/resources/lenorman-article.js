// Постраничный скрипт статьи articles123.html «Учебник переплётного дела».
// Слайдеры Swiper и подсветка чипов навигации. CTA-кнопка открывает форму сама (data-open-form).

document.addEventListener('DOMContentLoaded', function () {
    if (typeof Swiper !== 'undefined') {
        [
            { name: 'book', desktop: 2.1, tablet: 1.5 },
            { name: 'orig', desktop: 2.6, tablet: 1.8 },
        ].forEach(function (cfg) {
            if (!document.querySelector('.len-slider--' + cfg.name)) return;
            new Swiper('.len-slider--' + cfg.name, {
                slidesPerView: 1,
                spaceBetween: 18,
                grabCursor: true,
                watchOverflow: true,
                pagination: { el: '.len-pag--' + cfg.name, clickable: true },
                navigation: { nextEl: '.len-next--' + cfg.name, prevEl: '.len-prev--' + cfg.name },
                breakpoints: {
                    576: { slidesPerView: 1.3, spaceBetween: 18 },
                    768: { slidesPerView: cfg.tablet, spaceBetween: 20 },
                    1024: { slidesPerView: cfg.desktop, spaceBetween: 22 },
                },
            });
        });
    }

    var chips = document.querySelectorAll('.len-nav__chip[data-spy]');
    if (!chips.length || !('IntersectionObserver' in window)) return;
    var map = {};
    chips.forEach(function (c) { map[c.getAttribute('href').slice(1)] = c; });
    var io = new IntersectionObserver(function (entries) {
        entries.forEach(function (e) {
            if (!e.isIntersecting) return;
            chips.forEach(function (c) { c.classList.remove('is-active'); });
            if (map[e.target.id]) map[e.target.id].classList.add('is-active');
        });
    }, { rootMargin: '-30% 0px -60% 0px' });
    Object.keys(map).forEach(function (id) {
        var el = document.getElementById(id);
        if (el) io.observe(el);
    });
});
