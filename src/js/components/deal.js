// Блок «Последовательность сделки» на главной (.deal): шаги переключаются сами,
// пока блок на экране; наведение/клик/фокус на шаге выбирает его и ставит автопоказ на паузу.
(function () {
    const section = document.querySelector('.deal');
    if (!section) return;

    const items = section.querySelectorAll('.deal__item');
    const scenes = section.querySelectorAll('.deal__scene');
    const dots = section.querySelectorAll('.deal__dot');
    const caption = section.querySelector('.deal__caption');
    const titleEl = section.querySelector('[data-deal-title]');
    const textEl = section.querySelector('[data-deal-text]');
    const currentEl = section.querySelector('[data-deal-current]');
    if (!items.length) return;

    // Расширенные пояснения к шагам для панели справа
    const details = [
        'Менеджер выясняет задачу: что печатаем, какой тираж, формат и сроки, и вместе с вами фиксирует всё в техническом задании.',
        'Считаем стоимость, оформляем экономический паспорт заказа и выставляем счёт.',
        'Заключаем договор — с этого момента начинается совместная работа над заказом.',
        'Изготавливаем сигнальный образец и отправляем его вам: тираж идёт в работу после подтверждения.',
        'Пока тираж в производстве, менеджер предоставляет отчётность о ходе работы.',
        'Отгружаем готовый тираж и подписываем акт выполненных работ.',
    ];

    const INTERVAL = 4500;
    const reduceMotion = window.matchMedia && window.matchMedia('(prefers-reduced-motion: reduce)').matches;
    let current = 0;
    let timer = null;
    let paused = false;
    let visible = false;

    function show(index) {
        current = index;
        items.forEach(function (el, i) { el.classList.toggle('deal__item--active', i === index); });
        scenes.forEach(function (el, i) { el.classList.toggle('deal__scene--active', i === index); });
        dots.forEach(function (el, i) { el.classList.toggle('deal__dot--active', i === index); });
        if (currentEl) currentEl.textContent = String(index + 1);
        if (caption && titleEl && textEl) {
            caption.classList.add('deal__caption--swap');
            setTimeout(function () {
                const subtitle = items[index].querySelector('.deal__subtitle');
                const descr = items[index].querySelector('.deal__descr');
                if (subtitle) titleEl.textContent = subtitle.textContent;
                textEl.textContent = details[index] || (descr ? descr.textContent : '');
                caption.classList.remove('deal__caption--swap');
            }, 180);
        }
    }

    function schedule() {
        clearTimeout(timer);
        section.classList.remove('deal--playing');
        if (paused || !visible || reduceMotion) return;
        // перезапуск CSS-анимации полоски-таймера
        void section.offsetWidth;
        section.classList.add('deal--playing');
        timer = setTimeout(function () {
            show((current + 1) % items.length);
            schedule();
        }, INTERVAL);
    }

    items.forEach(function (item, i) {
        const select = function () {
            paused = true;
            show(i);
            schedule();
        };
        item.addEventListener('mouseenter', select);
        item.addEventListener('click', select);
        item.addEventListener('focus', select);
    });

    // курсор ушёл со списка — возобновляем автопоказ
    const list = section.querySelector('.deal__list');
    if (list) {
        const resume = function () {
            paused = false;
            schedule();
        };
        list.addEventListener('mouseleave', resume);
        list.addEventListener('focusout', function (e) {
            // фокус перешёл на соседний шаг — это не уход со списка
            if (!list.contains(e.relatedTarget)) resume();
        });
    }

    if ('IntersectionObserver' in window) {
        new IntersectionObserver(function (entries) {
            visible = entries[0].isIntersecting;
            schedule();
        }, { threshold: 0.35 }).observe(section);
    }
})();
