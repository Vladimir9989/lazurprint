// Постраничный скрипт страницы «Как заказать» (how-to-order.html).
// Кнопки .ord-cta открывают форму расчёта, блоки плавно появляются при скролле,
// чипы-якоря подсвечивают текущий раздел.

document.addEventListener('DOMContentLoaded', function () {
    // Плавное появление блоков при скролле (скрытое стартовое состояние
    // включается только при работающем JS — без него контент виден).
    const page = document.querySelector('.ord-page');
    const reveals = document.querySelectorAll('.ord-reveal');
    if (page && reveals.length && 'IntersectionObserver' in window) {
        page.classList.add('ord-js');
        const revealObserver = new IntersectionObserver(function (entries, obs) {
            entries.forEach(function (entry) {
                if (entry.isIntersecting) {
                    entry.target.classList.add('ord-reveal--in');
                    obs.unobserve(entry.target);
                }
            });
        }, { threshold: 0.1, rootMargin: '0px 0px -6% 0px' });
        reveals.forEach(function (el) { revealObserver.observe(el); });
    }

    // Подсветка активного раздела в липкой навигации (scroll-spy).
    const spyLinks = document.querySelectorAll('.ord-chips__chip[data-spy]');
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
                    spyLinks.forEach(function (l) { l.classList.remove('ord-chips__chip--active'); });
                    const active = linkById[entry.target.id];
                    if (active) active.classList.add('ord-chips__chip--active');
                }
            });
        }, { rootMargin: '-45% 0px -50% 0px', threshold: 0 });
        sections.forEach(function (s) { spyObserver.observe(s); });
    }
});
