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
            slidesPerView: 4,
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
            slidesPerView: 4,
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
            slidesPerView: 4,
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

    // Инициализация Swiper для слайдера музея Endograund
    if (document.querySelector('.events__slider--endograund')) {
        new Swiper('.events__slider--endograund', {
            loop: true,
            pagination: {
                el: '.swiper-pagination',
                clickable: true
            },
            navigation: {
                nextEl: '.swiper-button-next',
                prevEl: '.swiper-button-prev'
            },
            slidesPerView: 4,
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
            slidesPerView: 4,
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
            pagination: {
                el: '.swiper-pagination',
                clickable: true
            },
            navigation: {
                nextEl: '.swiper-button-next',
                prevEl: '.swiper-button-prev'
            },
            slidesPerView: 4,
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

    // Инициализация Swiper для слайдера Мастер-классы
    if (document.querySelector('.events__slider--workshops')) {
        new Swiper('.events__slider--workshops', {
            loop: true,
            pagination: {
                el: '.swiper-pagination',
                clickable: true
            },
            navigation: {
                nextEl: '.swiper-button-next',
                prevEl: '.swiper-button-prev'
            },
            slidesPerView: 4,
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
            slidesPerView: 4,
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
            pagination: {
                el: '.swiper-pagination',
                clickable: true
            },
            navigation: {
                nextEl: '.swiper-button-next',
                prevEl: '.swiper-button-prev'
            },
            slidesPerView: 4,
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

    // Инициализация Swiper для слайдера Коллекция Людмилы Носковой
    if (document.querySelector('.events__slider--noskova')) {
        new Swiper('.events__slider--noskova', {
            loop: true,
            pagination: {
                el: '.swiper-pagination',
                clickable: true
            },
            navigation: {
                nextEl: '.swiper-button-next',
                prevEl: '.swiper-button-prev'
            },
            slidesPerView: 4,
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

    // Инициализация Swiper для слайдера Сумки Андрея Вяткина
    if (document.querySelector('.events__slider--vyatkin')) {
        new Swiper('.events__slider--vyatkin', {
            loop: true,
            pagination: {
                el: '.swiper-pagination',
                clickable: true
            },
            navigation: {
                nextEl: '.swiper-button-next',
                prevEl: '.swiper-button-prev'
            },
            slidesPerView: 4,
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
            slidesPerView: 4,
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

    // Инициализация Swiper для слайдера Фуршет
    if (document.querySelector('.events__slider--banquet')) {
        new Swiper('.events__slider--banquet', {
            loop: true,
            pagination: {
                el: '.swiper-pagination',
                clickable: true
            },
            navigation: {
                nextEl: '.swiper-button-next',
                prevEl: '.swiper-button-prev'
            },
            slidesPerView: 4,
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
            slidesPerView: 4,
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
});
