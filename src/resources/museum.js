document.addEventListener('DOMContentLoaded', function() {
    const modal = document.querySelector('.museum-modal');
    const videoPlayer = document.querySelector('.museum-modal__video');
    const closeBtn = document.querySelector('.museum-modal__close');
    const playButtons = document.querySelectorAll('.museum-card__play');

    if (!modal || !videoPlayer || !closeBtn) return;

    // Открытие модалки
    playButtons.forEach(button => {
        button.addEventListener('click', function(e) {
            e.preventDefault();
            const videoSrc = this.getAttribute('data-video');
            if (videoSrc) {
                videoPlayer.src = videoSrc;
                modal.classList.add('museum-modal--active');
                videoPlayer.play().catch(() => {
                    // Автовоспроизведение может быть заблокировано браузером
                });
            }
        });
    });

    // Закрытие
    function closeModal() {
        modal.classList.remove('museum-modal--active');
        videoPlayer.pause();
        videoPlayer.src = '';
    }

    closeBtn.addEventListener('click', closeModal);

    modal.addEventListener('click', function(e) {
        if (e.target === modal) {
            closeModal();
        }
    });

    document.addEventListener('keydown', function(e) {
        if (e.key === 'Escape' && modal.classList.contains('museum-modal--active')) {
            closeModal();
        }
    });

    // Предотвращаем закрытие при клике на контейнер с видео
    document.querySelector('.museum-modal__container').addEventListener('click', function(e) {
        e.stopPropagation();
    });
});

// Автоматическое получение длительности видео
document.querySelectorAll('.museum-card__play').forEach(button => {
    const videoSrc = button.getAttribute('data-video');
    const durationSpan = button.closest('.museum-card').querySelector('.museum-card__duration');
    
    if (videoSrc && durationSpan) {
        // Создаем скрытый элемент video для чтения метаданных
        const tempVideo = document.createElement('video');
        tempVideo.preload = 'metadata';
        tempVideo.src = videoSrc;
        
        // Когда метаданные загрузятся - читаем длительность
        tempVideo.addEventListener('loadedmetadata', function() {
            const seconds = Math.floor(this.duration);
            const minutes = Math.floor(seconds / 60);
            const remainingSeconds = seconds % 60;
            const formatted = `${minutes}:${remainingSeconds.toString().padStart(2, '0')}`;
            durationSpan.textContent = formatted;
        });
    }
});