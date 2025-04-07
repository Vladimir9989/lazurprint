const pmNext = document.querySelectorAll('.pm__next');
const pmMobi = document.querySelectorAll('.pm__mobi');
const pmModule = document.querySelector('.pm__module');

if (navigator.userAgent.match('iPhone') || navigator.userAgent.match('Android') || navigator.userAgent.match('iPad') || navigator.userAgent.match('RIM')) {
    pmNext.forEach(el => {
        el.style.display = 'none';
    })
    console.log('Mobile');
} else {
    pmMobi.forEach(el => {
        el.style.display = 'none';
    })
    console.log('Desktop');
}

pmMobi.forEach(item => {
    item.addEventListener('click', (e) => {
        let self = e.currentTarget;
        let src = self.dataset.path;
        console.log(self);
        let numberPm = self.closest('.pm__item').querySelector('.pm__number').textContent;
        pmModule.innerHTML = '';
        pmModule.insertAdjacentHTML('afterbegin', generatePm(src, numberPm))
        pmModule.classList.add('pm__module--active');
        
    })
});

function generatePm(src, num) {
    return `
        <div class="books__nav-cnt pm__nav-cnt">
            <a href="index.html" class="books__nav-link">Главная /</a>
            <a href="planeta-molodyh.html" class="books__nav-link">Планета молодых /</a>
            <a href="#" class="books__nav-link">${num}</a>
        </div>
        <a href="planeta-molodyh.html" class="pm__module-close">Назад</a>
        <img src="images/img/planeta-molod/preview/${src}" alt="${num}">
`
}

