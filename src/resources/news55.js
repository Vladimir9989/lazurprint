// Постраничный скрипт новости news55.html «"Лазурь" в "Коммерсантъ Review"».
// Читалка номера: одна страница журнала в кадре, переключение стрелками,
// миниатюрами и клавиатурой, увеличение по двойному клику и кнопкам +/-.
// Сделана без Swiper намеренно: в скрытом контейнере Swiper считал ширину
// слайда как бесконечность (браузер обрезал её до 33 554 300px), из-за чего
// страница уезжала далеко за экран и был виден только фон модалки.

document.addEventListener('DOMContentLoaded', function () {
    var modal = document.querySelector('.press-modal');
    if (!modal) return;

    var stage = modal.querySelector('.press-modal__stage');
    var pageImg = modal.querySelector('.press-modal__page');
    var pageCurrent = modal.querySelector('.press-modal__page-current');
    var thumbs = [].slice.call(modal.querySelectorAll('.press-modal__thumb'));
    var pages = thumbs.map(function (t) { return t.getAttribute('data-full'); });

    var ZOOM_STEPS = [1, 1.5, 2, 3];
    var current = 0;
    var zoomIndex = 0;

    function applyZoom() {
        var zoom = ZOOM_STEPS[zoomIndex];
        if (zoom === 1) {
            stage.classList.remove('press-modal__stage--zoomed');
            pageImg.style.height = '';
            pageImg.style.width = '';
            return;
        }
        // Базовая высота — та, что картинка занимает вписанной в кадр;
        // от неё и считаем увеличение, чтобы шаг зума был предсказуемым.
        if (!stage.classList.contains('press-modal__stage--zoomed')) {
            stage.dataset.baseHeight = pageImg.clientHeight;
            stage.classList.add('press-modal__stage--zoomed');
        }
        var base = parseFloat(stage.dataset.baseHeight) || pageImg.clientHeight;
        pageImg.style.height = base * zoom + 'px';
        pageImg.style.width = 'auto';
    }

    function resetZoom() {
        zoomIndex = 0;
        applyZoom();
    }

    function showPage(index) {
        if (index < 0) index = 0;
        if (index > pages.length - 1) index = pages.length - 1;
        current = index;

        resetZoom();
        pageImg.src = pages[index];
        pageImg.alt = 'Коммерсантъ Review, страница ' + (index + 1);
        if (pageCurrent) pageCurrent.textContent = index + 1;

        thumbs.forEach(function (t, i) {
            t.classList.toggle('press-modal__thumb--active', i === index);
        });
        if (thumbs[index] && thumbs[index].scrollIntoView) {
            thumbs[index].scrollIntoView({ block: 'nearest', inline: 'center' });
        }
        stage.scrollTop = 0;
        stage.scrollLeft = 0;

        // Соседние страницы подгружаем заранее, чтобы листалось без задержки.
        [index - 1, index + 1].forEach(function (i) {
            if (pages[i]) { var img = new Image(); img.src = pages[i]; }
        });
    }

    function openModal(index) {
        modal.classList.add('press-modal--active');
        document.body.classList.add('press-modal-open');
        showPage(index);
    }

    function closeModal() {
        modal.classList.remove('press-modal--active');
        document.body.classList.remove('press-modal-open');
        resetZoom();
    }

    document.querySelectorAll('.press-open').forEach(function (btn) {
        btn.addEventListener('click', function () {
            openModal(parseInt(btn.getAttribute('data-slide') || '0', 10));
        });
    });

    thumbs.forEach(function (t) {
        t.addEventListener('click', function () {
            showPage(parseInt(t.getAttribute('data-index'), 10));
        });
    });

    modal.querySelector('.press-modal__nav--prev').addEventListener('click', function () {
        showPage(current - 1);
    });
    modal.querySelector('.press-modal__nav--next').addEventListener('click', function () {
        showPage(current + 1);
    });

    modal.querySelector('.press-modal__zoom-in').addEventListener('click', function () {
        if (zoomIndex < ZOOM_STEPS.length - 1) { zoomIndex += 1; applyZoom(); }
    });
    modal.querySelector('.press-modal__zoom-out').addEventListener('click', function () {
        if (zoomIndex > 0) { zoomIndex -= 1; applyZoom(); }
    });

    pageImg.addEventListener('dblclick', function () {
        zoomIndex = zoomIndex === 0 ? 2 : 0;
        applyZoom();
    });

    modal.querySelector('.press-modal__close').addEventListener('click', closeModal);

    modal.addEventListener('click', function (e) {
        if (e.target === modal || e.target === stage) closeModal();
    });

    document.addEventListener('keydown', function (e) {
        if (!modal.classList.contains('press-modal--active')) return;
        if (e.key === 'Escape') closeModal();
        if (e.key === 'ArrowLeft') showPage(current - 1);
        if (e.key === 'ArrowRight') showPage(current + 1);
    });
});
