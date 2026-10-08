// Блок отзывов (html/reviews.html): слайдер .reviews__list и «Читать дальше» у длинных отзывов.
// Нужен swiper-bundle.min.js раньше этого файла. Подключать только на страницах с отзывами.
(function () {
    if (typeof Swiper !== 'undefined' && document.querySelector('.reviews__list')) {
        new Swiper('.reviews__list', {
            spaceBetween: 30,
            breakpoints: {
                1124: {
                    slidesPerView: 4.15,
                },
                850: {
                    slidesPerView: 3.15,
                },
                590: {
                    slidesPerView: 2.15,
                },
                320: {
                    slidesPerView: 1.15,
                },
            },
        });
    }

    document.querySelectorAll('.reviews__item').forEach(function (item) {
        const bottom = item.querySelector('.reviews__item-bottom');
        const more = item.querySelector('.reviews__item-more');
        if (!bottom || !more) return;
        if (bottom.offsetHeight > 25) {
            bottom.classList.add('reviews__item-bottom--active');
            more.classList.add('reviews__item-more--active');
        }
        item.addEventListener('click', function () {
            bottom.classList.toggle('reviews__item-bottom--active');
            more.textContent = bottom.classList.contains('reviews__item-bottom--active') ? 'Читать дальше' : 'Свернуть';
        });
    });
})();
