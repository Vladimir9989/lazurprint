document.addEventListener('DOMContentLoaded', () => {
    const cardLink = document.querySelectorAll('.catalog__card-link');
    const indexProductsList = document.querySelector('.index-shoop');
    const cart = document.querySelector('.cart');
    let fullprce = document.querySelector('.fullprce');
    let price = 0;

    const minusFullPrice = (currentPrice) => {
        return price -= currentPrice;
    };

    const priceWithoutSpaces = (str) => {
        return str.replace(/\s/g, '');
    };

    const printFullPrice = (sum) => {
        sum.textContent = `${normalPrice(price)} ₽`
    };

    const normalPrice = (str) => {
        return String(str).replace(/(\d)(?=(\d\d\d)+([^\d]|$))/g, '$1 ');
    };
    
    cardLink.forEach(el => {
        el.addEventListener('click', (e) => {
            let path = e.currentTarget.dataset.tabs;
            localStorage.setItem('tabs', path)
            window.document.location = './catalog.html';
        })
    });

    const deleteProducts = (productParent) => {
        let currentPrice = parseInt(priceWithoutSpaces(productParent.querySelector('.catalog__fullprice').textContent));
        minusFullPrice(currentPrice);
        printFullPrice(fullprce);
        productParent.remove();
        printQuantity();
        updateStorage();
    }

    indexProductsList.addEventListener('click', (e) => {
        if (e.target.classList.contains('cart-product__svg')) {
            deleteProducts(e.target.closest('.cart-content__item'))
        }
    });

    const printQuantity = () => {
        let length = document.querySelector('.simplebar-content').children;
        let item = document.querySelectorAll('.cart-content__item');
        let cartQuantity = document.querySelector('.cart__quantity span');
        let modalQuantity = document.querySelector('.catalog-modal__quantity span');
        let numb = 0;
        let summpc = 0;
        item.forEach(el => {
            let count = parseInt(el.querySelector('.catalog__sum').textContent);
            let fullPrc = parseInt(el.querySelector('.catalog__fullprice').textContent);
            numb += fullPrc;
            summpc += count;
        })
        cartQuantity.textContent = summpc;
        modalQuantity.textContent = summpc;
        fullprce.textContent = numb;
        length.length > 0 ? cart.classList.add('active') : cart.classList.remove('active');
    };
    
    const initialState = () => {
        if (localStorage.getItem('products') !== null) {
            indexProductsList.querySelector('.simplebar-content').innerHTML = localStorage.getItem('products');
            printQuantity();
        }
    };
    initialState();
    
    const updateStorage = () => {
        let parent = indexProductsList.querySelector('.simplebar-content');
        let html = parent.innerHTML;
        html = html.trim();
        if (html.length) {
            localStorage.setItem('products', html);
        }   else {
            localStorage.removeItem('products');
        }
    };
    updateStorage();

    const btnUp2 = {
        el: document.querySelector('.btn-up2'),
        show() {
          this.el.classList.remove('btn-up_hide2');
        },
        hide() {
          this.el.classList.add('btn-up_hide2');
        },
        addEventListener() {
          window.addEventListener('scroll', () => {
            const scrollY = window.scrollY || document.documentElement.scrollTop;
            scrollY > 400 ? this.show() : this.hide();
          });
          document.querySelector('.btn-up2').onclick = () => {
            window.scrollTo({
              top: 0,
              left: 0,
              behavior: 'smooth'
            });
          }
        }
      }
      
      btnUp2.addEventListener();
});
new Rellax('.rellax');


