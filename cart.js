document.addEventListener('DOMContentLoaded', () => {
    const catalogCart = document.querySelectorAll('.catalog-card');
    const cartModal = document.querySelector('.cart-modal');
    const cartProductsList = document.querySelector('.cart-content__list');
    const cartQuantity = document.querySelector('.cart__quantity span');
    const cart = document.querySelector('.cart');
    let modalQuantity = document.querySelector('.catalog-modal__quantity span');
    const fullprce = document.querySelector('.fullprce');
    let catalogModalInfo = document.querySelector('.catalog-modal__info');
    let price = 0;
    let productsArray = [];

    catalogCart.forEach(el => {
        el.addEventListener('click', (e) => {
            let self = e.currentTarget;
            let img = self.querySelector('.catalog__img').getAttribute('src');
            let title = self.querySelector('.catalog__cards-title').textContent;
            let article = self.querySelector('.catalog__article span').textContent;
            let price = self.querySelector('.catalog__price span').textContent;
            cartModal.innerHTML = '';
            cartModal.insertAdjacentHTML('afterbegin', generateCartModal(img, title, article, price));
            cartModal.classList.add('modal--active');
            modalCartProduct();
        })
    })

    const modalCartProduct = () => {
        let cartModalBtn = document.querySelector('.cart-modal__button');
        let count = document.querySelector('.cart-modal__price span').textContent.replace(/[^0-9]/g, "");
        let cartPrice = document.querySelector('.cart-modal__fullprice span');
        let summ = document.querySelector('.cart-modal__sum');
        let plus = document.querySelector('.cart-modal__plus');
        let minus = document.querySelector('.cart-modal__minus');
        cartPrice.textContent = parseInt(count) * parseInt(summ.textContent) + ' ₽';
        plus.addEventListener('click', () => {
            summ.textContent = parseInt(summ.textContent) + 1;
            cartPrice.textContent = parseInt(count) * parseInt(summ.textContent) + ' ₽';
        })
        minus.addEventListener('click', () => {
            if (summ.textContent > 1) {
                summ.textContent = parseInt(summ.textContent) - 1;
                cartPrice.textContent = parseInt(cartPrice.textContent) - count + ' ₽';
            }
        });

        cartModalBtn.addEventListener('click', (e) => {
            let self = e.currentTarget;
            let parent = self.closest('.cart-modal__content');
            let img = parent.querySelector('.cart-modal__img').getAttribute('src');
            let title = parent.querySelector('.cart-modal__title').textContent;
            let fullPrice = parseInt(priceWithoutSpaces(parent.querySelector('.cart-modal__fullprice').textContent.replace(/[^0-9]/g, "")));
            let count = parent.querySelector('.cart-modal__sum').textContent;
            let priceNumber = parseInt(priceWithoutSpaces(parent.querySelector('.cart-modal__price').textContent.replace(/[^0-9]/g, "")));
            plusFullPrice(fullPrice);
            printFullPrice(fullprce);
            cartProductsList.querySelector('.simplebar-content')
                .insertAdjacentHTML('afterbegin', generateCartProduct(img, title, priceNumber, fullPrice, count));
            printQuantity();
            cartModal.classList.remove('modal--active');
            updateStorage();
        });
    }

    const randomId = () => {
        return Math.random().toString(36).substring(2, 15) + Math.random().toString(36).substring(2, 15);
    };

    const priceWithoutSpaces = (str) => {
        return str.replace(/\s/g, '');
    };

    const normalPrice = (str) => {
        return String(str).replace(/(\d)(?=(\d\d\d)+([^\d]|$))/g, '$1 ');
    };

    const printFullPrice = (sum) => {
        sum.textContent = `${normalPrice(price)} ₽`
    };

    const printQuantity = () => {
        let length = document.querySelector('.simplebar-content').children;
        let item = document.querySelectorAll('.cart-content__item');
        let summpc = 0;
        let numb = 0;
        item.forEach(el => {
            console.log(el);
            let count = parseInt(el.querySelector('.catalog__sum').textContent);
            let fullPrc = parseInt(priceWithoutSpaces(el.querySelector('.catalog__fullprice').textContent));
            numb += fullPrc;
            summpc += count;
        })
        cartQuantity.textContent = summpc;
        modalQuantity.textContent = summpc;
        fullprce.textContent = normalPrice(numb);
        length.length > 0 ? cart.classList.add('active') : cart.classList.remove('active');
    };

    const generateCartProduct = (img, title, price, fullPrice, count) => {
        return `
    <li class="cart-content__item">
    <article class="cart-content__product cart-product">
        <img src="${img}" alt="Блокноты" class="cart-content__img">
        <div class="cart-product__text cart-product__text_style">
            <h3 class="cart-product__title">${title}</h3>
            <div class="catalog__count">
                <span class="catalog__fullprice">${normalPrice(fullPrice)} &#8381</span>
                <span class="catalog__sum summ-catalog">${count} шт</span>
            </div>
            <span class="cart-product__price">Цена за шт ${normalPrice(price)} &#8381</span>
        </div>
        <button class="cart-product__delete" aria-label="Удалить товар">
        <svg class="cart-product__svg" width="32" height="32" viewBox="0 0 32 32" fill="none" xmlns="http://www.w3.org/2000/svg">
        <path class="cart-product__svg" d="M25 7L7 25" stroke="white" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"/>
        <path class="cart-product__svg" d="M25 25L7 7" stroke="white" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"/>
        </svg>
        </button>
    </article>
</li>
    `;
    };
    const generateCartModal = (img, title, article, price) => {
        return `
        <div class="cart-modal__content">
            <div class="cart-modal__img-container">
                <img class="cart-modal__img" src="${img}" alt="Фото">
            </div>
            
            <div class="cart-modal__text">
                <svg class="cart-modal__svg" width="32" height="32" viewBox="0 0 32 32" fill="none"
                    xmlns="http://www.w3.org/2000/svg">
                    <path class="cart-modal__svg" d="M25 7L7 25" stroke="#8C30F5" stroke-width="2" stroke-linecap="round" stroke-linejoin="round" />
                    <path class="cart-modal__svg" d="M25 25L7 7" stroke="#8C30F5" stroke-width="2" stroke-linecap="round" stroke-linejoin="round" />
                </svg>
                <h3 class="cart-modal__title">${title}</h3>
                <span class="cart-modal__article">АРТ: ${article}</span>
                <p class="cart-modal__descr">Описание</p>
                <span class="cart-modal__price">Цена за шт: <span>${price} </span>&#8381</span>
                <div class="cart-modal__count">
                    Количество:
                    <button class="cart-modal__minus cart-modal__simbol">-</button>
                    <span class="cart-modal__sum cart-modal__simbol">1</span>
                    <button class="cart-modal__plus cart-modal__simbol">+</button>
                </div>
                <span class="cart-modal__fullprice">Общая цена:<span>100 &#8381</span></span>
                <button class="cart-modal__button">Добавить в корзину</button>
            </div>
        </div>
    `;
    };

    const deleteProducts = (productParent) => {
        let currentPrice = parseInt(priceWithoutSpaces(productParent.querySelector('.catalog__fullprice').textContent));
        minusFullPrice(currentPrice);
        printFullPrice(fullprce);
        productParent.remove();
        printQuantity();
        updateStorage();
    }

    cartProductsList.addEventListener('click', (e) => {
        if (e.target.classList.contains('cart-product__svg')) {
            deleteProducts(e.target.closest('.cart-content__item'))
        }
    });

    const modal = document.querySelector('.catalog-modal');
    const modalThanks = document.querySelector('.modal-thanks');
    const modalThanksBtn = document.querySelector('.modal-thanks__btn');
    const modalAnimation = document.querySelector('.modal-animation');
    const close = document.querySelector('.catalog-modal__close');
    const cartContentBtn = document.querySelector('.cart-content__btn');
    const catalogModalBtn = document.querySelector('.catalog-modal__btn');
    const catalogModalForm = document.querySelector('.catalog-modal__form');
    const writeUsBtn = document.querySelector('.btn-write-us');

    cartContentBtn.addEventListener('click', () => {
        modal.classList.add('modal--active');
        catalogModalInfo.style.display = "block";
        let productsList = document.querySelectorAll('.cart-content__item');

        let modalSumm = document.querySelector('.catalog-modal__summ span');
        let fullprice = fullprce.textContent;
        modalSumm.textContent = `${normalPrice(fullprice)}`;
        productsList.forEach((item) => {
            let title = item.querySelector('.cart-product__title').textContent;
            let fullPrc = item.querySelector('.catalog__fullprice').textContent;
            let price = item.querySelector('.cart-product__price').textContent;
            let summ = item.querySelector('.catalog__sum').textContent;
            let obj = {};
            obj.title = title;
            obj.fullPrc = fullPrc;
            obj.price = price;
            obj.summ = summ;
            productsArray.push(obj)
        })

    });

    const plusFullPrice = (currentPrice) => {
        return price += currentPrice;
    }
    const minusFullPrice = (currentPrice) => {
        return price -= currentPrice;
    };

    modalThanksBtn.addEventListener('click', () => {
        modalThanks.classList.remove('modal--active');
    })

    close.addEventListener('click', () => {
        modal.classList.remove('modal--active');
    });

    modal.addEventListener('click', (e) => {
        let modalItem = e.target;
        if (modal === modalItem) {
            modal.classList.remove('modal--active');
        }
    });

    cartModal.addEventListener('click', (e) => {
        let modalItem = e.target;
        if (cartModal === modalItem || modalItem.classList.contains('cart-modal__svg')) {
            cartModal.classList.remove('modal--active');
        }
    });

    modalThanks.addEventListener('click', (e) => {
        let modalItem = e.target;
        if (modalThanks === modalItem) {
            modalThanks.classList.remove('modal--active');
        }
    });

    writeUsBtn.addEventListener('click', () => {
        catalogModalInfo.style.display = "none";
        catalogModalForm.style.paddingTop = "15px";
        modal.classList.add('modal--active');
        catalogModalBtn.textContent = "отправить письмо"
        console.log(catalogModalInfo);
    })

    new window.JustValidate('.catalog-form', {
        rules: {
            name: {
                required: true,
                minLength: 2,
                maxLength: 20,
            },

        },
        messages: {
            name: {
                required: 'Введите имя',
                minLength: 'Введите 2 или более символов',
                maxLength: 'Не более 20 символов',
            },
            email: {
                required: 'Введите Email',
                email: 'Введите корректный Email',
            }
        },
        submitHandler: function (thisForm) {
            let formData = new FormData(thisForm);
            let xhr = new XMLHttpRequest();
            let formFullprce = document.querySelector('.catalog-modal__summ').textContent;
            formData.append('Товары', JSON.stringify(productsArray));
            formData.append('Цена', formFullprce);

            xhr.onreadystatechange = function () {
                // modalAnimation.classList.add('modal--active');
                modal.classList.remove('modal--active');
                if (xhr.readyState === 4) {
                    if (xhr.status === 200) {
                        console.log('Отправлено');
                        document.querySelector('.simplebar-content').innerHTML = "";
                        // modalAnimation.classList.remove('modal--active');
                        // modalThanks.classList.add('modal--active');
                        window.location.href = 'https://suvenirs-rs.ru/thanks.html'
                        printQuantity();
                    }
                }
            }
            xhr.open('POST', 'mail.php', true);
            xhr.send(formData);
            thisForm.reset();
        }
    });

    const tabsBtn = document.querySelectorAll('.catalog__nav-btn');
    const tabsItem = document.querySelectorAll('.catalog__item');

    tabsBtn.forEach(element => {
        element.addEventListener('click', (e) => {
            const path = e.currentTarget.dataset.path;
            tabsBtn.forEach(btn => { btn.classList.remove('catalog__nav-btn--active') });
            e.currentTarget.classList.add('catalog__nav-btn--active');
            tabsItem.forEach(function (element) { element.classList.remove('catalog__item--active') });
            document.querySelector(`[data-target="${path}"]`).classList.add('catalog__item--active');
            document.window.scrollTo({
                top: 0,
                left: 0,
                behavior: 'smooth'
              });
        });
    });

        tabsBtn.forEach(btn => { btn.classList.remove('catalog__nav-btn--active') });
        tabsItem.forEach(function (element) { element.classList.remove('catalog__item--active') });
        if (document.querySelector(`[data-target="${localStorage.getItem('tabs')}"]`) !== null) {
            document.querySelector(`[data-target="${localStorage.getItem('tabs')}"]`).classList.add('catalog__item--active');
        }
        // document.querySelector(`[data-target="${localStorage.getItem('tabs')}"]`).classList.add('catalog__item--active');
        if (document.querySelector(`[data-path="${localStorage.getItem('tabs')}"]`) !== null ) {
            document.querySelector(`[data-path="${localStorage.getItem('tabs')}"]`).classList.add('catalog__nav-btn--active');
        }
        
        if (localStorage.getItem('tabs') === null) tabsItem[0].classList.add('catalog__item--active');

    const initialState = () => {
        if (localStorage.getItem('products') !== null) {
            cartProductsList.querySelector('.simplebar-content').innerHTML = localStorage.getItem('products');
            printQuantity();
        }
    };
    initialState();

    const updateStorage = () => {
        let parent = cartProductsList.querySelector('.simplebar-content');
        let html = parent.innerHTML;
        html = html.trim();
        if (html.length) {
            localStorage.setItem('products', html);
        }   else {
            localStorage.removeItem('products');
        }
    };
    updateStorage();
});

new Swiper('.swiper-container', {

    navigation: {
                nextEl: '.swiper-button-next',
                prevEl: '.swiper-button-prev',
            },

    pagination: {
                el: '.swiper-pagination',
            },
})






