// Страница «Планета молодых»: на телефонах номер журнала открывается картинкой во весь экран (.pm__mobi),
// на компьютерах — ссылкой-листалкой (.pm__next).
(function () {
    const pmNext = document.querySelectorAll('.pm__next');
    const pmMobi = document.querySelectorAll('.pm__mobi');
    const pmModule = document.querySelector('.pm__module');

    // iPad с iPadOS 13+ представляется как Mac — узнаём его по сенсорному экрану
    const ua = navigator.userAgent;
    const isIPadOS = /Macintosh/.test(ua) && navigator.maxTouchPoints > 1;
    if (/iPhone|Android|iPad|RIM/.test(ua) || isIPadOS) {
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
            const item = self.closest('.pm__item');
            const numberEl = item && item.querySelector('.pm__number');
            const numberPm = numberEl ? numberEl.textContent : '';
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
