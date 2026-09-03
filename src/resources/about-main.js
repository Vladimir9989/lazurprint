// кнопка коротко о нас
const aboutModal = document.querySelector('.video-1');
const aboutModal2 = document.querySelector('.video-2');
const aboutModal3 = document.querySelector('.video-3');
const aboutClose = document.querySelectorAll('.about__close');
const aboutPlay = document.querySelector('.play-1');
const aboutPlay2 = document.querySelector('.play-2');
const aboutPlay3 = document.querySelector('.play-3');

const aboutVideo = aboutModal.querySelector('video');
const aboutVideo2 = aboutModal2.querySelector('video');
const aboutVideo3 = aboutModal3.querySelector('video');

function closeAboutModals() {
    aboutModal.classList.remove('modal--active')
    aboutModal2.classList.remove('modal--active')
    aboutModal3.classList.remove('modal--active')
    aboutVideo.pause();
    aboutVideo2.pause();
    aboutVideo3.pause();
}

aboutPlay.addEventListener('click', () => {
    aboutModal.classList.add('modal--active')
})
aboutPlay2.addEventListener('click', () => {
    aboutModal2.classList.add('modal--active')
})
aboutPlay3.addEventListener('click', () => {
    aboutModal3.classList.add('modal--active')
})


aboutClose.forEach(close => {
    close.addEventListener('click', closeAboutModals)
})


aboutModal.addEventListener('click', (e) => {
    if (e.target === aboutModal) closeAboutModals()
})
aboutModal2.addEventListener('click', (e) => {
    if (e.target === aboutModal2) closeAboutModals()
})
aboutModal3.addEventListener('click', (e) => {
    if (e.target === aboutModal3) closeAboutModals()
})
