// Страница «Планета молодых»: на телефонах номер журнала открывается картинкой во весь экран (.pm__mobi),
// на компьютерах — ссылкой-листалкой (.pm__next).
(function () {
    const pmNext = document.querySelectorAll('.pm__next');
    const pmMobi = document.querySelectorAll('.pm__mobi');
    const pmModule = document.querySelector('.pm__module');

    if (navigator.userAgent.match('iPhone') || navigator.userAgent.match('Android') || navigator.userAgent.match('iPad') || navigator.userAgent.match('RIM')) {
        pmNext.forEach(el => {
            el.style.display = 'none';
        });
    } else {
        pmMobi.forEach(el => {
            el.style.display = 'none';
        });
    }

    if (!pmModule) return;

    pmMobi.forEach(item => {
        item.addEventListener('click', (e) => {
            const self = e.currentTarget;
            const src = self.dataset.path;
            const numberPm = self.closest('.pm__item').querySelector('.pm__number').textContent;
            pmModule.innerHTML = '';
            pmModule.insertAdjacentHTML('afterbegin', generatePm(src, numberPm));
            pmModule.classList.add('pm__module--active');
        });
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
`;
    }
})();
