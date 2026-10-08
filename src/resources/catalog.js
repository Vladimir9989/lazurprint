// Страница «Каталог работ» (catalog.html): выбор раздела (Choices), слайдеры галереи, увеличение работы.
// Нужны swiper-bundle.min.js и choices.min.js раньше этого файла.
(function () {
    // Слайдеры галереи — по одному на раздел, создаются один раз при загрузке.
    // Кнопки и счётчик заданы общими классами, но лежат внутри каждого .gallery-swiper-container —
    // Swiper (uniqueNavElements) берёт свои, поэтому каждая галерея листается своими стрелками.
    // Скрытые разделы (display:none) при показе пересчитываются через swiper.update().
    function initGalleries() {
        if (typeof Swiper === 'undefined') return;
        document.querySelectorAll('.gallery-swiper-container').forEach(el => {
            if (el.swiper) return;
            new Swiper(el, {
                slidesPerView: 3,
                slidesPerGroup: 2,
                spaceBetween: 50,

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
                        slidesPerGroup: 1,
                    },

                    577: {
                        slidesPerView: 2,
                        spaceBetween: 36,
                        slidesPerGroup: 2,
                    },

                    940: {
                        slidesPerView: 2,
                        spaceBetween: 38,
                        slidesPerGroup: 2,
                    },

                    1411: {
                        slidesPerView: 3,
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
            // у <option> нет value — значение селекта равно тексту выбранного пункта
            const target = SECTIONS[item.value] && document.querySelector(SECTIONS[item.value]);
            if (!target) return;
            swiperContainer.forEach(el => {
                el.classList.remove('gallery--active');
            });
            target.classList.add('gallery--active');
            if (target.swiper) target.swiper.update();
        });
    }

    initGalleries();

    // Модальное окно
    const modal = document.querySelector('.modal');
    const modalItemImg = document.querySelector('.modal__item-img');
    if (!modal || !modalItemImg) return;
    const close = modal.querySelector('.close');

    document.querySelectorAll('.gallery-swiper-slide').forEach(slide => {
        slide.addEventListener('click', () => {
            const src = slide.querySelector('img');
            if (!src) return;
            // копия картинки: в слайде она position:absolute, в окне — обычная
            const img = src.cloneNode(false);
            img.removeAttribute('loading');
            img.style.position = 'static';
            modalItemImg.innerHTML = '';
            modalItemImg.appendChild(img);
            modal.classList.add('modal--active');
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

    document.addEventListener('keydown', (e) => {
        if (e.key === 'Escape') modal.classList.remove('modal--active');
    });
})();
