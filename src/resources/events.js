// events.js — скрипты для страницы мероприятий
console.log(1);
document.addEventListener('DOMContentLoaded', function() {
    // Инициализация Swiper для слайдера встречи гостей
    if (document.querySelector('.events__slider--greeting')) {
        new Swiper('.events__slider--greeting', {
            loop: true,
            pagination: {
                el: '.swiper-pagination',
                clickable: true
            },
            navigation: {
                nextEl: '.swiper-button-next',
                prevEl: '.swiper-button-prev'
            },
            slidesPerView: 1,
            spaceBetween: 20,
            centeredSlides: false,
            slidesOffsetBefore: 0,
            slidesOffsetAfter: 0,
            breakpoints: {
                768: {
                    slidesPerView: 2,
                    spaceBetween: 20
                },
                1024: {
                    slidesPerView: 3,
                    spaceBetween: 20
                }
            }
        });
    }

    // Инициализация Swiper для слайдера конкурса инсталляций
    if (document.querySelector('.events__slider--installations')) {
        new Swiper('.events__slider--installations', {
            loop: true,
            pagination: {
                el: '.swiper-pagination',
                clickable: true
            },
            navigation: {
                nextEl: '.swiper-button-next',
                prevEl: '.swiper-button-prev'
            },
            slidesPerView: 'auto',
            spaceBetween: 20,
            centeredSlides: false,
            slidesOffsetBefore: 0,
            slidesOffsetAfter: 0,
            breakpoints: {
                370: {
                    slidesPerView: 'auto',
                    spaceBetween: 20
                },
                768: {
                    slidesPerView: 'auto',
                    spaceBetween: 20
                },
                1024: {
                    slidesPerView: 'auto',
                    spaceBetween: 20
                }
            }
        });
    }

    // Инициализация Swiper для слайдера выставочных залов
    if (document.querySelector('.events__slider--exhibition-halls')) {
        new Swiper('.events__slider--exhibition-halls', {
            loop: true,
            pagination: {
                el: '.swiper-pagination',
                clickable: true
            },
            navigation: {
                nextEl: '.swiper-button-next',
                prevEl: '.swiper-button-prev'
            },
            slidesPerView: 1,
            spaceBetween: 20,
            centeredSlides: false,
            slidesOffsetBefore: 0,
            slidesOffsetAfter: 0,
            breakpoints: {
                768: {
                    slidesPerView: 2,
                    spaceBetween: 20
                },
                1024: {
                    slidesPerView: 3,
                    spaceBetween: 20
                }
            }
        });
    }

    // Массив с информацией о картинах для слайдера endograund
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

    // Инициализация слайдера endograund с обновлением подписи
    // Инициализация слайдера endograund с обновлением подписи
if (document.querySelector('.events__slider--endograund')) {
   const endograundSwiper = new Swiper('.events__slider--endograund', {
       loop: true,
       centeredSlides: false,
       slidesOffsetBefore: 0,
       slidesOffsetAfter: 0,
       pagination: {
           el: '.events__slider--endograund .swiper-pagination',
           clickable: true
       },
       navigation: {
           nextEl: '.events__slider--endograund .swiper-button-next',
           prevEl: '.events__slider--endograund .swiper-button-prev'
       },
       slidesPerView: 'auto',
       spaceBetween: 20,
       breakpoints: {
           768: {
               slidesPerView: 'auto',
               spaceBetween: 20
           },
           1024: {
               slidesPerView: 'auto',
               spaceBetween: 20
           }
       },
       on: {
           init: function() {
               updateEndograundInfo(this.realIndex);
           },
           slideChange: function() {
               updateEndograundInfo(this.realIndex);
           }
       }
   });

   function updateEndograundInfo(index) {
       if (endograundAuthorEl) {
           endograundAuthorEl.textContent = endograundPaintings[index] || '';
       }
   }
}

    // Инициализация Swiper для слайдера Ирбитского музея
    if (document.querySelector('.events__slider--irbit')) {
        new Swiper('.events__slider--irbit', {
            loop: true,
            pagination: {
                el: '.swiper-pagination',
                clickable: true
            },
            navigation: {
                nextEl: '.swiper-button-next',
                prevEl: '.swiper-button-prev'
            },
            slidesPerView: 1,
            spaceBetween: 20,
            breakpoints: {
                768: {
                    slidesPerView: 2,
                    spaceBetween: 20
                },
                1024: {
                    slidesPerView: 3,
                    spaceBetween: 20
                }
            }
        });
    }

    // Инициализация Swiper для слайдера ART-выставка WOMEN
    if (document.querySelector('.events__slider--women')) {
        new Swiper('.events__slider--women', {
            loop: true,
            centeredSlides: false,
            slidesOffsetBefore: 0,
            slidesOffsetAfter: 0,
            pagination: {
                el: '.swiper-pagination',
                clickable: true
            },
            navigation: {
                nextEl: '.swiper-button-next',
                prevEl: '.swiper-button-prev'
            },
            slidesPerView: 'auto',
            spaceBetween: 20,
            breakpoints: {
                768: {
                    slidesPerView: 'auto',
                    spaceBetween: 20
                },
                1024: {
                    slidesPerView: 'auto',
                    spaceBetween: 20
                }
            }
        });
    }

    // Инициализация Swiper для слайдера Мастер-классы
    if (document.querySelector('.events__slider--workshops')) {
        new Swiper('.events__slider--workshops', {
            loop: true,
            centeredSlides: false,
            slidesOffsetBefore: 0,
            slidesOffsetAfter: 0,
            pagination: {
                el: '.swiper-pagination',
                clickable: true
            },
            navigation: {
                nextEl: '.swiper-button-next',
                prevEl: '.swiper-button-prev'
            },
            slidesPerView: 'auto',
            spaceBetween: 20,
            breakpoints: {
                370: {
                    slidesPerView: 'auto',
                    spaceBetween: 20
                },
                768: {
                    slidesPerView: 'auto',
                    spaceBetween: 20
                },
                1024: {
                    slidesPerView: 'auto',
                    spaceBetween: 20
                }
            }
        });
    }

    // Инициализация Swiper для слайдера Живые полотна
    if (document.querySelector('.events__slider--living-paintings')) {
        new Swiper('.events__slider--living-paintings', {
            loop: true,
            pagination: {
                el: '.swiper-pagination',
                clickable: true
            },
            navigation: {
                nextEl: '.swiper-button-next',
                prevEl: '.swiper-button-prev'
            },
            slidesPerView: 1,
            spaceBetween: 20,
            breakpoints: {
                768: {
                    slidesPerView: 2,
                    spaceBetween: 20
                },
                1024: {
                    slidesPerView: 3,
                    spaceBetween: 20
                }
            }
        });
    }

    // Инициализация Swiper для слайдера Коллекции «Лазури»
    if (document.querySelector('.events__slider--lazur-collection')) {
        new Swiper('.events__slider--lazur-collection', {
            loop: true,
            centeredSlides: false,
            slidesOffsetBefore: 0,
            slidesOffsetAfter: 0,
            pagination: {
                el: '.swiper-pagination',
                clickable: true
            },
            navigation: {
                nextEl: '.swiper-button-next',
                prevEl: '.swiper-button-prev'
            },
            slidesPerView: 'auto',
            spaceBetween: 20,
            breakpoints: {
                370: {
                    slidesPerView: 'auto',
                    spaceBetween: 20
                },
                768: {
                    slidesPerView: 'auto',
                    spaceBetween: 20
                },
                1024: {
                    slidesPerView: 'auto',
                    spaceBetween: 20
                }
            }
        });
    }

    // Инициализация Swiper для слайдера Коллекция Людмилы Носковой
    if (document.querySelector('.events__slider--noskova')) {
        new Swiper('.events__slider--noskova', {
            loop: true,
            centeredSlides: false,
            slidesOffsetBefore: 0,
            slidesOffsetAfter: 0,
            pagination: {
                el: '.swiper-pagination',
                clickable: true
            },
            navigation: {
                nextEl: '.swiper-button-next',
                prevEl: '.swiper-button-prev'
            },
            slidesPerView: 'auto',
            spaceBetween: 20,
            breakpoints: {
                768: {
                    slidesPerView: 'auto',
                    spaceBetween: 20
                },
                1024: {
                    slidesPerView: 'auto',
                    spaceBetween: 20
                }
            }
        });
    }

    // Инициализация Swiper для слайдера Сумки Андрея Вяткина
    if (document.querySelector('.events__slider--vyatkin')) {
        new Swiper('.events__slider--vyatkin', {
            loop: true,
            centeredSlides: false,
            slidesOffsetBefore: 0,
            slidesOffsetAfter: 0,
            pagination: {
                el: '.swiper-pagination',
                clickable: true
            },
            navigation: {
                nextEl: '.swiper-button-next',
                prevEl: '.swiper-button-prev'
            },
            slidesPerView: 'auto',
            spaceBetween: 20,
            breakpoints: {
                768: {
                    slidesPerView: 'auto',
                    spaceBetween: 20
                },
                1024: {
                    slidesPerView: 'auto',
                    spaceBetween: 20
                }
            }
        });
    }

    // Инициализация Swiper для слайдера Модели — наши сотрудники
    if (document.querySelector('.events__slider--models')) {
        new Swiper('.events__slider--models', {
            loop: true,
            pagination: {
                el: '.swiper-pagination',
                clickable: true
            },
            navigation: {
                nextEl: '.swiper-button-next',
                prevEl: '.swiper-button-prev'
            },
            slidesPerView: 1,
            spaceBetween: 20,
            breakpoints: {
                768: {
                    slidesPerView: 2,
                    spaceBetween: 20
                },
                1024: {
                    slidesPerView: 3,
                    spaceBetween: 20
                }
            }
        });
    }

    // Инициализация Swiper для слайдера Модели горизонтальные
    if (document.querySelector('.events__slider--models-horizontal')) {
        new Swiper('.events__slider--models-horizontal', {
            loop: true,
            pagination: {
                el: '.swiper-pagination',
                clickable: true
            },
            navigation: {
                nextEl: '.swiper-button-next',
                prevEl: '.swiper-button-prev'
            },
            slidesPerView: 1,
            spaceBetween: 20,
            breakpoints: {
                768: {
                    slidesPerView: 2,
                    spaceBetween: 20
                },
                1024: {
                    slidesPerView: 2,
                    spaceBetween: 30
                }
            }
        });
    }

    // Инициализация Swiper для слайдера Фуршет
    if (document.querySelector('.events__slider--banquet')) {
        new Swiper('.events__slider--banquet', {
            loop: true,
            centeredSlides: false,
            slidesOffsetBefore: 0,
            slidesOffsetAfter: 0,
            pagination: {
                el: '.swiper-pagination',
                clickable: true
            },
            navigation: {
                nextEl: '.swiper-button-next',
                prevEl: '.swiper-button-prev'
            },
            slidesPerView: 'auto',
            spaceBetween: 20,
            breakpoints: {
                768: {
                    slidesPerView: 'auto',
                    spaceBetween: 20
                },
                1024: {
                    slidesPerView: 'auto',
                    spaceBetween: 20
                }
            }
        });
    }

    // Инициализация Swiper для слайдера Гости
    if (document.querySelector('.events__slider--guests')) {
        new Swiper('.events__slider--guests', {
            loop: true,
            centeredSlides: false,
            slidesOffsetBefore: 0,
            slidesOffsetAfter: 0,
            pagination: {
                el: '.swiper-pagination',
                clickable: true
            },
            navigation: {
                nextEl: '.swiper-button-next',
                prevEl: '.swiper-button-prev'
            },
            slidesPerView: 'auto',
            spaceBetween: 20,
            breakpoints: {
                768: {
                    slidesPerView: 'auto',
                    spaceBetween: 20
                },
                1024: {
                    slidesPerView: 'auto',
                    spaceBetween: 20
                }
            }
        });
    }

    // Инициализация Swiper для слайдера Джаз
    if (document.querySelector('.events__slider--jazz')) {
        new Swiper('.events__slider--jazz', {
            loop: true,
            pagination: {
                el: '.swiper-pagination',
                clickable: true
            },
            navigation: {
                nextEl: '.swiper-button-next',
                prevEl: '.swiper-button-prev'
            },
            slidesPerView: 1,
            spaceBetween: 20,
            breakpoints: {
                768: {
                    slidesPerView: 2,
                    spaceBetween: 20
                },
                1024: {
                    slidesPerView: 3,
                    spaceBetween: 20
                }
            }
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
    const modalClose = document.querySelector('.events__modal-close');
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

    // Функция открытия модального окна
    function openModal(sliderId, index) {
        if (modalSwiperInstance) {
            modalSwiperInstance.destroy(true, true);
            modalSwiperInstance = null;
        }

        modalSwiperWrapper.innerHTML = '';

        let images = [];
        if (sliderId && eventsSliderData[sliderId]) {
            images = eventsSliderData[sliderId];
        }

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
            on: {
                init: function() {
                    // Принудительно показать кнопки после инициализации
                    if (!isSingleImage) {
                        modalNextBtn.style.display = 'flex';
                        modalPrevBtn.style.display = 'flex';
                    }
                }
            }
        });

        modal.classList.add('events__modal--open');
        document.body.style.overflow = 'hidden';

        // Обновляем Swiper после открытия модалки
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

    // Observer для отслеживания открытия модалки
    const observer = new MutationObserver(function(mutations) {
        mutations.forEach(function(mutation) {
            if (mutation.target.classList.contains('events__modal--open')) {
                setTimeout(function() {
                    if (modalSwiperInstance) {
                        modalSwiperInstance.update();
                        modalSwiperInstance.navigation.update();
                    }
                }, 100);
            }
        });
    });
    observer.observe(modal, { attributes: true, attributeFilter: ['class'] });

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
            
            if (sliderId && !isNaN(index)) {
                // Изображение из слайдера
                openModal(sliderId, index);
            } else {
                // Одиночное изображение
                const src = this.getAttribute('src');
                if (src) {
                    // Создаем временный слайдер для одиночного изображения
                    const tempSliderId = 'single-' + Date.now();
                    eventsSliderData[tempSliderId] = [src];
                    openModal(tempSliderId, 0);
                }
            }
        });
    });

    // Переменные для видео-модалки
    const videoModal = document.getElementById('eventsVideoModal');
    const videoPlayer = document.getElementById('eventsVideoPlayer');

    // Открытие видео при клике на заглушку
    document.querySelectorAll('.events__video-thumb').forEach(function(thumb) {
        thumb.addEventListener('click', function(e) {
            // Не открываем фото-модалку при клике на видео-заглушку
            e.stopPropagation();
            
            const videoSrc = this.getAttribute('data-video');
            videoPlayer.src = videoSrc;
            videoModal.classList.add('events__modal--open');
            document.body.style.overflow = 'hidden';
            videoPlayer.play();
        });
    });

    // Закрытие видео-модалки
    function closeVideoModal() {
        videoModal.classList.remove('events__modal--open');
        document.body.style.overflow = '';
        videoPlayer.pause();
        videoPlayer.src = '';
    }

    // Закрытие по крестику
    videoModal.querySelector('.events__modal-close').addEventListener('click', closeVideoModal);

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

    // Обработчик клика по кнопке закрытия
    if (modalClose) {
        modalClose.addEventListener('click', closeModal);
    }

    // Обработчик клика по фону модального окна
    if (modal) {
        modal.addEventListener('click', function(e) {
            // Закрываем модалку, если клик не попал на:
            // - img (картинка внутри слайдера)
            // - кнопки навигации (.events__modal-prev, .events__modal-next)
            // - пагинацию (.events__modal-pagination)
            const isClickOnImage = e.target.tagName === 'IMG';
            const isClickOnNav = e.target.closest('.events__modal-prev, .events__modal-next, .events__modal-pagination');
            
            if (!isClickOnImage && !isClickOnNav) {
                closeModal();
            }
        });
    }

    // Обработчик нажатия клавиши Escape
    document.addEventListener('keydown', function(e) {
        if (e.key === 'Escape' && modal.classList.contains('events__modal--open')) {
            closeModal();
        }
    });

    // Проверка пароля для архива фотографий
    const photoArchiveBtn = document.getElementById('photoArchiveBtn');
    const photoArchivePassword = document.getElementById('photoArchivePassword');
    const photoArchiveError = document.getElementById('photoArchiveError');
    const photoArchiveLink = document.getElementById('photoArchiveLink');

    if (photoArchiveBtn) {
        photoArchiveBtn.addEventListener('click', function() {
            const password = photoArchivePassword.value;
            
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
