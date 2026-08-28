// Переключение карты офисов между несколькими точками.
// Виджет Яндекс.Карт (yandex.ru/map-widget/v1) встраивается без API-ключа,
// поэтому переключение — это просто подмена src у iframe по клику на офис в списке.
document.addEventListener('DOMContentLoaded', function () {
    var items = document.querySelectorAll('.offices__item');
    var frame = document.getElementById('officesMapFrame');
    var link = document.getElementById('officesMapLink');

    if (!items.length || !frame) return;

    items.forEach(function (item) {
        item.addEventListener('click', function () {
            items.forEach(function (i) {
                i.classList.remove('offices__item--active');
            });
            item.classList.add('offices__item--active');

            frame.src = item.dataset.map;
            if (link) {
                link.href = item.dataset.link;
            }
        });
    });
});
