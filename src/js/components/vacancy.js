// accordion

const vacancyItem = document.querySelectorAll('.vacancy__item');
const vacancyPrice = document.querySelector('.vacancy__price');

vacancyItem.forEach((item) => {
    item.addEventListener('click', ()=> {
        let self = item.querySelector('.vacancy__text');
        let arrow = item.querySelector('.vacancy__price')
        self.classList.toggle('vacancy__text--active');
        arrow.classList.toggle('vacancy__price--active')
    })
    
});


