// Страница «О компании»: три видео — кнопки .play-1/2/3 открывают модалки .video-1/2/3;
// крестик .about__close и клик по фону закрывают все и ставят видео на паузу.
(function () {
    const pairs = [1, 2, 3].map(function (n) {
        return { play: document.querySelector('.play-' + n), modal: document.querySelector('.video-' + n) };
    }).filter(function (p) { return p.modal; });
    if (!pairs.length) return;

    function closeAboutModals() {
        pairs.forEach(function (p) {
            p.modal.classList.remove('modal--active');
            const video = p.modal.querySelector('video');
            if (video) video.pause();
        });
    }

    pairs.forEach(function (p) {
        if (p.play) {
            p.play.addEventListener('click', function () {
                p.modal.classList.add('modal--active');
            });
        }
        p.modal.addEventListener('click', function (e) {
            if (e.target === p.modal) closeAboutModals();
        });
    });

    document.querySelectorAll('.about__close').forEach(function (btn) {
        btn.addEventListener('click', closeAboutModals);
    });
})();
