// Постраничный скрипт страницы «Портфолио» (portfolio.html).
// Та же логика, что в calendars-article.js, но универсальная: слайдеры
// находятся по классу .cal-slider, стрелки и пагинация берутся внутри
// каждого слайдера — новую секцию можно добавлять копированием блока.

document.addEventListener('DOMContentLoaded', function () {
    if (typeof Swiper !== 'undefined') {
        document.querySelectorAll('.cal-slider').forEach(function (el) {
            new Swiper(el, {
                slidesPerView: 1,
                spaceBetween: 20,
                grabCursor: true,
                watchOverflow: true,
                pagination: { el: el.querySelector('.cal-slider__pagination'), clickable: true },
                navigation: {
                    nextEl: el.querySelector('.cal-slider__btn--next'),
                    prevEl: el.querySelector('.cal-slider__btn--prev'),
                },
                breakpoints: {
                    576: { slidesPerView: 1.4, spaceBetween: 20 },
                    768: { slidesPerView: 2, spaceBetween: 24 },
                    1024: { slidesPerView: 2.3, spaceBetween: 24 },
                },
            });
        });
    }

    // Просмотр фото крупно: клик по слайду открывает модальное окно,
    // стрелки и клавиши ← → листают фото того же слайдера, Esc/фон/крестик закрывают.
    const icon = function (d) {
        return '<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2.6" stroke-linecap="round" stroke-linejoin="round" aria-hidden="true"><path d="' + d + '"/></svg>';
    };
    const box = document.createElement('div');
    box.className = 'pf-lightbox';
    box.setAttribute('role', 'dialog');
    box.setAttribute('aria-modal', 'true');
    box.setAttribute('aria-label', 'Просмотр фото');
    box.innerHTML =
        '<button type="button" class="pf-lightbox__btn pf-lightbox__btn--close" aria-label="Закрыть">' + icon('M6 6l12 12M18 6L6 18') + '</button>' +
        '<button type="button" class="pf-lightbox__btn pf-lightbox__btn--prev" aria-label="Предыдущее фото">' + icon('M15 5l-7 7 7 7') + '</button>' +
        '<button type="button" class="pf-lightbox__btn pf-lightbox__btn--next" aria-label="Следующее фото">' + icon('M9 5l7 7-7 7') + '</button>' +
        '<figure class="pf-lightbox__figure"><img class="pf-lightbox__img" alt=""><figcaption class="pf-lightbox__caption"></figcaption></figure>';
    document.body.appendChild(box);

    const lbImg = box.querySelector('.pf-lightbox__img');
    const lbCaption = box.querySelector('.pf-lightbox__caption');
    const lbClose = box.querySelector('.pf-lightbox__btn--close');
    let group = [];
    let index = 0;
    let opener = null;

    const showPhoto = function () {
        const img = group[index];
        lbImg.src = img.currentSrc || img.src;
        lbImg.alt = img.alt;
        lbCaption.textContent = img.alt;
        const single = group.length < 2;
        box.querySelector('.pf-lightbox__btn--prev').hidden = single;
        box.querySelector('.pf-lightbox__btn--next').hidden = single;
    };
    const closeBox = function () {
        box.classList.remove('is-open');
        document.body.classList.remove('pf-lock');
        if (opener) opener.focus();
    };
    const step = function (dir) {
        if (group.length < 2) return;
        index = (index + dir + group.length) % group.length;
        showPhoto();
    };

    document.querySelectorAll('.cal-slider').forEach(function (slider) {
        const imgs = Array.prototype.slice.call(slider.querySelectorAll('.cal-slide img'));
        imgs.forEach(function (img, i) {
            const slide = img.closest('.cal-slide');
            slide.setAttribute('tabindex', '0');
            slide.setAttribute('role', 'button');
            slide.setAttribute('aria-label', 'Открыть фото крупно: ' + img.alt);
            const open = function () {
                group = imgs;
                index = i;
                opener = slide;
                showPhoto();
                box.classList.add('is-open');
                document.body.classList.add('pf-lock');
                lbClose.focus();
            };
            slide.addEventListener('click', open);
            slide.addEventListener('keydown', function (e) {
                if (e.key === 'Enter' || e.key === ' ') { e.preventDefault(); open(); }
            });
        });
    });

    lbClose.addEventListener('click', closeBox);
    box.querySelector('.pf-lightbox__btn--prev').addEventListener('click', function () { step(-1); });
    box.querySelector('.pf-lightbox__btn--next').addEventListener('click', function () { step(1); });
    box.addEventListener('click', function (e) {
        if (e.target === box || e.target === box.querySelector('.pf-lightbox__figure')) closeBox();
    });
    document.addEventListener('keydown', function (e) {
        if (!box.classList.contains('is-open')) return;
        if (e.key === 'Escape') closeBox();
        else if (e.key === 'ArrowLeft') step(-1);
        else if (e.key === 'ArrowRight') step(1);
    });

    // Плавное появление блоков при скролле (скрытое стартовое состояние
    // включается только при работающем JS — без него контент виден).
    const article = document.querySelector('.cal-article');
    const reveals = document.querySelectorAll('.cal-reveal');
    if (article && reveals.length && 'IntersectionObserver' in window) {
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
