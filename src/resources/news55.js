// Постраничный скрипт новости news55.html «"Лазурь" в "Коммерсантъ Review"».
// Модалка-«читалка» номера: главный слайдер Swiper по 16 страницам
// журнала + лента миниатюр для быстрого перехода. Открывается по
// кнопке "Читать номер" или по клику на разворот со статьёй —
// обе точки входа передают номер слайда через data-slide.

document.addEventListener('DOMContentLoaded', function () {
    var modal = document.querySelector('.press-modal');
    if (!modal || typeof Swiper === 'undefined') return;

    var pageCurrent = modal.querySelector('.press-modal__page-current');

    var thumbsSwiper = new Swiper('.press-modal__thumbs', {
        slidesPerView: 'auto',
        spaceBetween: 8,
        watchSlidesProgress: true,
        freeMode: true,
    });

    var mainSwiper = new Swiper('.press-modal__main', {
        spaceBetween: 20,
        navigation: {
            nextEl: '.press-modal__nav--next',
            prevEl: '.press-modal__nav--prev',
        },
        keyboard: { enabled: true },
        zoom: { maxRatio: 3, minRatio: 1 },
        thumbs: { swiper: thumbsSwiper },
        on: {
            slideChange: function () {
                if (pageCurrent) pageCurrent.textContent = this.activeIndex + 1;
                this.zoom.out();
            },
        },
    });

    var zoomInBtn = modal.querySelector('.press-modal__zoom-in');
    var zoomOutBtn = modal.querySelector('.press-modal__zoom-out');
    if (zoomInBtn) zoomInBtn.addEventListener('click', function () { mainSwiper.zoom.in(); });
    if (zoomOutBtn) zoomOutBtn.addEventListener('click', function () { mainSwiper.zoom.out(); });

    function openModal(slideIndex) {
        modal.classList.add('press-modal--active');
        document.body.classList.add('press-modal-open');
        mainSwiper.slideTo(slideIndex, 0);
        if (pageCurrent) pageCurrent.textContent = slideIndex + 1;
    }

    function closeModal() {
        modal.classList.remove('press-modal--active');
        document.body.classList.remove('press-modal-open');
        mainSwiper.zoom.out();
    }

    document.querySelectorAll('.press-open').forEach(function (btn) {
        btn.addEventListener('click', function () {
            var idx = parseInt(btn.getAttribute('data-slide') || '0', 10);
            openModal(idx);
        });
    });

    var closeBtn = modal.querySelector('.press-modal__close');
    if (closeBtn) closeBtn.addEventListener('click', closeModal);

    modal.addEventListener('click', function (e) {
        if (e.target === modal) closeModal();
    });

    document.addEventListener('keydown', function (e) {
        if (e.key === 'Escape' && modal.classList.contains('press-modal--active')) closeModal();
    });
});
