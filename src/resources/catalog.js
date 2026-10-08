// Страница «Каталог работ» (catalog.html): выбор раздела (Choices), слайдеры галереи, увеличение работы.
// Нужны swiper-bundle.min.js и choices.min.js раньше этого файла.
(function () {
    // Слайдер каталога
    function slader() {
        if (typeof Swiper === 'undefined') return;
        document.querySelectorAll('.gallery-swiper-container').forEach(el => {
            new Swiper(el, {
                slidesPerView: 3,
                slidesPerColumnFill: 'row',
                slidesPerColumn: 2,
                slidesPerGroup: 2,
                spaceBetween: 50,
                direction: 'horizontal',

                pagination: {
                    el: '.gallery-button__pagination',
                    type: 'fraction',
                },

                navigation: {
                    nextEl: '.swiper-button-next',
                    prevEl: '.swiper-button-prev',
                },

                breakpoints: {
                    300: {
                        slidesPerView: 1,
                        slidesPerColumn: 1,
                        slidesPerGroup: 1,
                    },

                    577: {
                        slidesPerView: 2,
                        slidesPerColumn: 1,
                        spaceBetween: 36,
                        slidesPerGroup: 2,
                    },

                    940: {
                        slidesPerView: 2,
                        slidesPerColumn: 1,
                        spaceBetween: 38,
                        slidesPerGroup: 2,
                    },

                    1411: {
                        slidesPerView: 3,
                        slidesPerColumn: 1,
                        spaceBetween: 45,
                        slidesPerGroup: 3,
                    },
                }
            });
        });
    }

    // Селект в каталоге: показывает выбранный раздел галереи
    const SECTIONS = {
        'Книги и журналы': '.swp1',
        'Учебники и игры': '.swp2',
        'Газеты и плакаты': '.swp3',
        'Упаковка и этикетки': '.swp4',
        'Сувенирная продукция': '.swp5',
        'Листовки брошюры и флаеры': '.swp6',
        'Визитки пакеты и календари': '.swp7',
    };

    const item = document.querySelector('#selectGallery');
    if (item && typeof Choices !== 'undefined') {
        const swiperContainer = document.querySelectorAll('.gallery-swp');
        const choices = new Choices(item, {
            searchEnabled: false,
            itemSelectText: '',
            sorter: function (a, b) { },
        });

        choices.passedElement.element.addEventListener('change', () => {
            swiperContainer.forEach(el => {
                el.classList.remove('gallery--active');
            });
            const target = SECTIONS[item.textContent] && document.querySelector(SECTIONS[item.textContent]);
            if (target) {
                target.classList.add('gallery--active');
                slader();
            }
        });
    }

    slader();

    // Модальное окно
    const modal = document.querySelector('.modal');
    const modalItemImg = document.querySelector('.modal__item-img');
    const close = document.querySelector('.close');
    if (!modal || !modalItemImg) return;

    document.querySelectorAll('.gallery-swiper-slide').forEach(slide => {
        slide.addEventListener('click', () => {
            modal.classList.add('modal--active');
            slide.children[0].style.position = 'static';
            modalItemImg.innerHTML = slide.innerHTML;
            slide.children[0].style.position = 'absolute';
        });
    });

    if (close) {
        close.addEventListener('click', () => {
            modal.classList.remove('modal--active');
        });
    }

    modal.addEventListener('click', (e) => {
        if (e.target === modal) {
            modal.classList.remove('modal--active');
        }
    });
})();
