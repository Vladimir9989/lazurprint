// Видео «Коротко о нас»: кнопка .play-1 открывает модалку .video-1, крестик .about__close и клик по фону
// закрывают (и Esc) и ставят видео на паузу. Подключать только на страницах с .video-1.
(function () {
    const modal = document.querySelector('.video-1');
    if (!modal) return;
    const play = document.querySelector('.play-1');
    const video = modal.querySelector('video');

    function close() {
        modal.classList.remove('modal--active');
        if (video) video.pause();
    }

    if (play) {
        play.addEventListener('click', function () {
            modal.classList.add('modal--active');
        });
    }

    document.querySelectorAll('.about__close').forEach(function (btn) {
        btn.addEventListener('click', close);
    });

    modal.addEventListener('click', function (e) {
        if (e.target === modal) close();
    });

    document.addEventListener('keydown', function (e) {
        if (e.key === 'Escape' && modal.classList.contains('modal--active')) close();
    });
})();
