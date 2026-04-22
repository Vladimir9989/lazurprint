// карта
ymaps.ready(init);

function init() {

    var myMap = new ymaps.Map("map", {

        center: [57.348307, 61.405098],
        zoom: 11,
        controls: [],
    });
    var myPlacemark = new ymaps.Placemark([57.348307, 61.405098], {}, {
        iconLayout: 'default#image',
        iconImageHref: 'images/img/background/marker.svg',
        iconImageSize: [30, 30],
        iconImageOffset: [0, 0],
    });

    myMap.geoObjects.add(myPlacemark);

    // myMap.behaviors.disable(['drag', 'rightMouseButtonMagnifier', 'scrollZoom']);
};