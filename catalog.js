// Селект в каталоге

const selectGallery = () => {
    const item = document.querySelector('#selectGallery');
    const selectOption = document.querySelector('.select__option');
    const swiperContainer = document.querySelectorAll('.gallery-swp');
    const choices = new Choices(item, {
        searchEnabled: false,
        itemSelectText: '',
        sorter: function (a, b) { },
    });

    choices.passedElement.element.addEventListener('change', () => {
        swiperContainer.forEach(el => {
            el.classList.remove('gallery--active')
        })

        if (item.textContent === 'Книги и журналы') {
            document.querySelector('.swp1').classList.add('gallery--active')
            slader()
        } else if (item.textContent === 'Учебники и игры') {
            document.querySelector('.swp2').classList.add('gallery--active')
            slader()
        } else if (item.textContent === 'Газеты и плакаты') {
            document.querySelector('.swp3').classList.add('gallery--active')
            slader()
        } else if (item.textContent === 'Упаковка и этикетки') {
            document.querySelector('.swp4').classList.add('gallery--active')
            slader()
        } else if (item.textContent === 'Сувенирная продукция') {
            document.querySelector('.swp5').classList.add('gallery--active')
            slader()
        } else if (item.textContent === 'Листовки брошюры и флаеры') {
            document.querySelector('.swp6').classList.add('gallery--active')
            slader()
        } else if (item.textContent === 'Визитки пакеты и календари') {
            document.querySelector('.swp7').classList.add('gallery--active')
            slader()
        }


    });
};

selectGallery();

// Слайдер каталога 

function slader() {
    const gallerySlider = document.querySelectorAll('.gallery-swiper-container');
    gallerySlider.forEach(el => {
        const mySwiperGallery = new Swiper(el, {
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

    })
}

slader();

// Модальное окно
const modal = document.querySelector('.modal');
const modalItem = document.querySelector('.modal__item');
const galleryItem = document.querySelectorAll('.gallery-swiper-slide');
const modalItemImg = document.querySelector('.modal__item-img');
const modalItemDescr = document.querySelector('.modal__item-descr');
const close = document.querySelector('.close');
const galleryImg = document.querySelectorAll('.gallery-swiper-slide__img');


galleryItem.forEach(item => {
    item.addEventListener('click', () => {
        modal.classList.add('modal--active')
        item.children[0].style.position = 'static'
        modalItemImg.innerHTML = item.innerHTML
        item.children[0].style.position = 'absolute'
        console.log(item.children[0]);
    })
})

close.addEventListener('click', () => {
    modal.classList.remove('modal--active')
})

modal.addEventListener('click', (e) => {
    if (e.target === modal) {
        modal.classList.remove('modal--active')
    }
})