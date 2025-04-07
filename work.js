const swiperReviews = new Swiper('.reviews__list', {
    // slidesPerView: 3,
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

const reviewsItem = document.querySelectorAll('.reviews__item');

reviewsItem.forEach(item => {
    const reviewsItemBottom = item.querySelector('.reviews__item-bottom');
    const reviewsItemMore = item.querySelector('.reviews__item-more');
    if (reviewsItemBottom.offsetHeight > 25) {
        reviewsItemBottom.classList.add('reviews__item-bottom--active');
        reviewsItemMore.classList.add('reviews__item-more--active');
    }
    item.addEventListener('click', () => {
        reviewsItemBottom.classList.toggle('reviews__item-bottom--active');

        if (!reviewsItemBottom.classList.contains('reviews__item-bottom--active')) {
            reviewsItemMore.textContent = 'Свернуть'
        } else {
            reviewsItemMore.textContent = 'Читать дальше'
        }
    })
});

