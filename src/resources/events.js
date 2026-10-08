// events.js — страница мероприятий (events.html): фотослайдеры разделов, подпись картин «Андеграунда»,
// увеличение фото (модалка со слайдером), видео, аккордеон программы, «пароль» к архиву фото.
// Нужен swiper-bundle.min.js раньше этого файла.
document.addEventListener('DOMContentLoaded', function() {
    // Фотослайдеры разделов. Два вида: «сетка» — 1/2/3 фото в ряд по ширине экрана,
    // «auto» — ширина слайда из CSS. Общее: loop, отступ 20, свои стрелки и точки внутри блока.
    const GRID = { slidesPerView: 1, breakpoints: { 768: { slidesPerView: 2 }, 1024: { slidesPerView: 3 } } };
    const AUTO = { slidesPerView: 'auto' };
    const SLIDERS = {
        'greeting': GRID,
        'installations': AUTO,
        'exhibition-halls': GRID,
        'endograund': AUTO,
        'irbit': GRID,
        'women': AUTO,
        'workshops': AUTO,
        'living-paintings': GRID,
        'lazur-collection': AUTO,
        'noskova': AUTO,
        'vyatkin': AUTO,
        'models': GRID,
        'models-horizontal': {
            slidesPerView: 1,
            breakpoints: { 768: { slidesPerView: 2, spaceBetween: 20 }, 1024: { slidesPerView: 2, spaceBetween: 30 } },
        },
        'banquet': AUTO,
        'guests': AUTO,
        'jazz': GRID,
    };

    // Подписи к картинам слайдера «Андеграунд» — по порядку слайдов
    const endograundPaintings = [
        'Гущина Дарья Алексеевна — искусствовед, сотрудница музея Андеграунда',
        'Полисский Николай (р. 1957). Общая тельняшка. 1996. Холст, масло. Санкт-Петербург',
        'Юрий Галецкий (р. 1944). Кладбище кораблей. 1977. Холст, масло. Санкт-Петербург',
        'Владимир Стерлигов (1904–1973). Ангел. 1954. Бумага, темпера. Санкт-Петербург',
        'Фигурина Елена (р. 1955). Красная фигура. 2000. Холст, масло. Санкт-Петербург',
        'Булатов Эрик (1933–2025). Слава КПСС. 1994. Цветной эстамп. Москва',
        'Зверев Анатолий (1931–1986). Кони. 1984. Бумага, гуашь. Москва',
        'Немухин Владимир (1925–2016). Бубновый валет. 1971. Бумага, акварель. Москва',
        'Рабин Оскар (1928–2018). Пейзаж с мусором. 1990. Холст, масло, коллаж. Москва',
        'Басанец Валерий (р. 1941). Сон. 1992. Холст, масло. Одесса',
        'Рахманин Евгений (р. 1947). Одесский пейзаж. 1980-е гг. Бумага, акварель. Одесса',
        'Арт-группа «Картинник». Крепче заваривай ча.., иначе – не отвеча...ю! 1990-е гг. Фанера, масло. Екатеринбург',
        'Видунов Сергей (1946–2004). На пожар. 1999. Бумага, смешанная техника. Екатеринбург',
        'Гаврилов Валерий (1948–1982). Рафаэль. 1970-е гг. Бумага, аэрограф. Екатеринбург',
        'Гаврилов Валерий (1948–1982). Демон. 1970-е гг. Оргалит, масло. Екатеринбург',
        'Дьяченко Валерий (р. 1939). Наша марка. 1980-е гг. Картон, масло. Екатеринбург',
        'Еловой Олег (1967–2001). Кошки. 1997. Холст, масло. Екатеринбург',
        'Жуков Владимир (1941–2023). Мадонна. 1977. Металл, эмаль. Екатеринбург',
        'Лебедев Алексей (1938–2017). Ван Гог. 2000. Бумага, гуашь. Екатеринбург',
        'Махотин Виктор (1946–2002). Утренняя звезда. 1996. Холст, масло. Екатеринбург',
        'Павлов Валерий (р. 1949). Цветы проходящему. 1978. Холст, масло. Екатеринбург'
    ];


    const endograundInfoEl = document.getElementById('endograundInfo');
    const endograundAuthorEl = endograundInfoEl ? endograundInfoEl.querySelector('.events__painting-author') : null;

    function updateEndograundInfo(swiper) {
        if (endograundAuthorEl) endograundAuthorEl.textContent = endograundPaintings[swiper.realIndex] || '';
    }

    if (typeof Swiper !== 'undefined') {
        Object.keys(SLIDERS).forEach(function (name) {
            const el = document.querySelector('.events__slider--' + name);
            if (!el) return;
            const options = Object.assign({
                loop: true,
                spaceBetween: 20,
                pagination: { el: el.querySelector('.swiper-pagination'), clickable: true },
                navigation: { nextEl: el.querySelector('.swiper-button-next'), prevEl: el.querySelector('.swiper-button-prev') },
            }, JSON.parse(JSON.stringify(SLIDERS[name]))); // копия: GRID/AUTO общие для нескольких слайдеров
            if (name === 'endograund') options.on = { init: updateEndograundInfo, slideChange: updateEndograundInfo };
            new Swiper(el, options);
        });
    }

    // Аккордеон для музыкальной программы
    const accordionBtns = document.querySelectorAll('.events__accordion-btn');
    accordionBtns.forEach(btn => {
        btn.addEventListener('click', function() {
            const content = this.nextElementSibling;
            if (content) {
                content.classList.toggle('events__accordion-content--open');
            }
        });
    });

    // Модальное окно для изображений со слайдером
    const modal = document.getElementById('eventsModal');
    if (!modal || typeof Swiper === 'undefined') return;
    const modalClose = modal.querySelector('.events__modal-close');
    const modalSwiperWrapper = modal.querySelector('.swiper-wrapper');
    const modalPrevBtn = modal.querySelector('.events__modal-prev');
    const modalNextBtn = modal.querySelector('.events__modal-next');
    const modalPagination = modal.querySelector('.events__modal-pagination');
    let modalSwiperInstance = null;

    // Объект для хранения данных слайдеров
    const eventsSliderData = {};

    // Собираем данные из всех слайдеров
    const sliders = document.querySelectorAll('.events__slider');
    sliders.forEach(slider => {
        const sliderId = slider.getAttribute('data-slider');
        if (sliderId) {
            const slides = slider.querySelectorAll('.swiper-slide img');
            const images = [];
            slides.forEach(img => {
                const src = img.getAttribute('src');
                if (src) {
                    images.push(src);
                    // Добавляем data-атрибуты к изображениям
                    img.setAttribute('data-slider', sliderId);
                    img.setAttribute('data-index', images.length - 1);
                }
            });
            if (images.length > 0) {
                eventsSliderData[sliderId] = images;
            }
        }
    });

    // Открытие модального окна: images — адреса фото, index — с какого начать
    function openModal(images, index) {
        if (modalSwiperInstance) {
            modalSwiperInstance.destroy(true, true);
            modalSwiperInstance = null;
        }

        modalSwiperWrapper.innerHTML = '';

        // Создаем слайды
        images.forEach((src, i) => {
            const slide = document.createElement('div');
            slide.className = 'swiper-slide';
            const img = document.createElement('img');
            img.src = src;
            img.alt = 'Изображение ' + (i + 1);
            slide.appendChild(img);
            modalSwiperWrapper.appendChild(slide);
        });

        // Инициализируем Swiper в модальном окне
        const isSingleImage = images.length === 1;
        
        // Скрываем/показываем кнопки навигации
        if (isSingleImage) {
            modalPrevBtn.style.display = 'none';
            modalNextBtn.style.display = 'none';
            modalPagination.style.display = 'none';
        } else {
            modalPrevBtn.style.display = 'flex';
            modalNextBtn.style.display = 'flex';
            modalPagination.style.display = 'block';
        }

        modalSwiperInstance = new Swiper('#eventsModalSwiper', {
            initialSlide: index || 0,
            loop: !isSingleImage,
            pagination: {
                el: modalPagination,
                clickable: true
            },
            navigation: {
                nextEl: modalNextBtn,
                prevEl: modalPrevBtn
            },
            watchSlidesProgress: true,
        });

        modal.classList.add('events__modal--open');
        document.body.style.overflow = 'hidden';

        // Обновляем Swiper после открытия модалки (до этого она была скрыта — размеры нулевые)
        setTimeout(function() {
            if (modalSwiperInstance) {
                modalSwiperInstance.update();
                modalSwiperInstance.navigation.update();
            }
        }, 100);
    }

    // Функция закрытия модального окна
    function closeModal() {
        if (modalSwiperInstance) {
            modalSwiperInstance.destroy(true, true);
            modalSwiperInstance = null;
        }
        modalSwiperWrapper.innerHTML = '';
        modal.classList.remove('events__modal--open');
        document.body.style.overflow = '';
    }

    // Обработчик клика по изображениям внутри .events__img-cnt и .swiper-slide
    const images = document.querySelectorAll('.events__img-cnt img, .swiper-slide img');
    images.forEach(img => {
        img.addEventListener('click', function(e) {
            e.stopPropagation();
            // Не открываем фото-модалку для видео-заглушек
            if (e.target.closest('.events__video-thumb')) {
                return;
            }
            const sliderId = this.getAttribute('data-slider');
            const index = parseInt(this.getAttribute('data-index'), 10);
            
            if (sliderId && eventsSliderData[sliderId] && !isNaN(index)) {
                // Изображение из слайдера — листаются все фото этого слайдера
                openModal(eventsSliderData[sliderId], index);
            } else {
                // Одиночное изображение
                const src = this.getAttribute('src');
                if (src) openModal([src], 0);
            }
        });
    });

    // Переменные для видео-модалки
    const videoModal = document.getElementById('eventsVideoModal');
    const videoPlayer = document.getElementById('eventsVideoPlayer');

    if (videoModal && videoPlayer) {
        // Открытие видео при клике на заглушку
        document.querySelectorAll('.events__video-thumb').forEach(function(thumb) {
            thumb.addEventListener('click', function(e) {
                // Не открываем фото-модалку при клике на видео-заглушку
                e.stopPropagation();

                videoPlayer.src = this.getAttribute('data-video');
                videoModal.classList.add('events__modal--open');
                document.body.style.overflow = 'hidden';
                // браузер может запретить автозапуск — тогда посетитель нажмёт «play» сам, без ошибки в консоли
                const playing = videoPlayer.play();
                if (playing && playing.catch) playing.catch(function () {});
            });
        });

        // Закрытие видео-модалки
        const closeVideoModal = function () {
            videoModal.classList.remove('events__modal--open');
            document.body.style.overflow = '';
            videoPlayer.pause();
            // src = '' заставлял браузер запрашивать адрес самой страницы как видео
            videoPlayer.removeAttribute('src');
            videoPlayer.load();
        };

        // Закрытие по крестику
        const videoClose = videoModal.querySelector('.events__modal-close');
        if (videoClose) videoClose.addEventListener('click', closeVideoModal);

        // Закрытие по клику на фон (пустое место вокруг видео)
        videoModal.addEventListener('click', function(e) {
            if (e.target === videoModal || e.target.classList.contains('events__video-container')) {
                closeVideoModal();
            }
        });

        // Закрытие по Escape
        document.addEventListener('keydown', function(e) {
            if (e.key === 'Escape' && videoModal.classList.contains('events__modal--open')) {
                closeVideoModal();
            }
        });
    }

    // Обработчик клика по кнопке закрытия
    if (modalClose) {
        modalClose.addEventListener('click', closeModal);
    }

    // Обработчик клика по фону модального окна: закрываем, если клик не по картинке,
    // стрелкам (.events__modal-prev/-next) или точкам (.events__modal-pagination)
    modal.addEventListener('click', function(e) {
        const isClickOnImage = e.target.tagName === 'IMG';
        const isClickOnNav = e.target.closest('.events__modal-prev, .events__modal-next, .events__modal-pagination');
        if (!isClickOnImage && !isClickOnNav) {
            closeModal();
        }
    });

    // Обработчик нажатия клавиши Escape
    document.addEventListener('keydown', function(e) {
        if (e.key === 'Escape' && modal.classList.contains('events__modal--open')) {
            closeModal();
        }
    });

    // «Пароль» к архиву фотографий. ВНИМАНИЕ: это не защита — пароль и ссылка на Яндекс.Диск видны
    // в коде страницы любому. Настоящая защита — пароль на самой папке Яндекс.Диска.
    const photoArchiveBtn = document.getElementById('photoArchiveBtn');
    const photoArchivePassword = document.getElementById('photoArchivePassword');
    const photoArchiveError = document.getElementById('photoArchiveError');
    const photoArchiveLink = document.getElementById('photoArchiveLink');

    if (photoArchiveBtn) {
        photoArchiveBtn.addEventListener('click', function() {
            if (!photoArchivePassword || !photoArchiveError || !photoArchiveLink) return;
            const password = photoArchivePassword.value.trim();
            
            if (password === 'Lazur29') {
                photoArchiveError.classList.remove('events__password-error--visible');
                photoArchiveLink.style.display = 'block';
            } else {
                photoArchiveError.classList.add('events__password-error--visible');
                photoArchiveLink.style.display = 'none';
            }
        });
    }

    // Также открывать при нажатии Enter в поле ввода
    if (photoArchivePassword) {
        photoArchivePassword.addEventListener('keydown', function(e) {
            if (e.key === 'Enter') {
                if (photoArchiveBtn) {
                    photoArchiveBtn.click();
                }
            }
        });
    }
});
