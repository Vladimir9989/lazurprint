if (typeof Swiper !== 'undefined') {
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
}



const reviewsItem = document.querySelectorAll('.reviews__item');
if (reviewsItem) {
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
}


// кнопка каталога 

const galleryBtn = document.querySelector('.hero__btn');
const bannerReklama = document.querySelector('.banner-reklama');
const consultationBtn = document.querySelector('.consultation__btn');
const footerContactsBtn = document.querySelector('.footer__contacts-btn');
const formModal = document.querySelector('.form__modal');
const form = document.querySelector('.form');
const formBtn = document.querySelector('.form__btn');
const formClose = document.querySelector('.form__close');
const formTitle = document.querySelector('.form__title');
const formDesc = document.querySelector('.form__desc');
const formTextarea = document.querySelector('#textarea');

formClose.addEventListener('click', () => {
    formModal.classList.remove('modal--active');
    formTitle.textContent = 'Рассчитать стоимость';
    formDesc.textContent = 'Оставьте заявку на расчет стоимости и мы свяжемся с Вами в ближайшее время.';
    formTextarea.value = '';
});

formModal.addEventListener('click', (e) => {
    if (e.target === formModal) {
        formModal.classList.remove('modal--active');
        formTitle.textContent = 'Рассчитать стоимость';
        formDesc.textContent = 'Оставьте заявку на расчет стоимости и мы свяжемся с Вами в ближайшее время.';
        formTextarea.value = '';
    }
});


footerContactsBtn.addEventListener('click', () => {
    formModal.classList.add('modal--active');
    form.classList.remove('hidden');
});
if (galleryBtn) {
    galleryBtn.addEventListener('click', () => {
        formModal.classList.add('modal--active');
        form.classList.remove('hidden');
    });
}

if (bannerReklama) {
    bannerReklama.addEventListener('click', () => {
        formTitle.textContent = 'Заказать рекламу';
        formDesc.textContent = 'Оставьте заявку для заказа рекламы на нашем сайте и мы свяжемся с Вами в ближайшее время.';
        formTextarea.value = 'Здравствуйте, мы бы хотели заказать рекламу на вашем сайте https://lazurprint.ru';
        formModal.classList.add('modal--active');
        form.classList.remove('hidden');
    });
}

if (consultationBtn) {
    consultationBtn.addEventListener('click', () => {
        formModal.classList.add('modal--active');
        form.classList.remove('hidden');
    })
}
