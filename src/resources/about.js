// кнопка коротко о нас
const aboutModal = document.querySelector('.video-1');
const aboutClose = document.querySelectorAll('.about__close');
const aboutPlay = document.querySelector('.play-1');

aboutPlay.addEventListener('click', () => {
    aboutModal.classList.add('modal--active')
})

aboutClose.forEach(close => {
    close.addEventListener('click', () => {
        aboutModal.classList.remove('modal--active')
        aboutModal2.classList.remove('modal--active')
        aboutModal3.classList.remove('modal--active')
    })
})

aboutModal.addEventListener('click', (e) => {
    if (e.target === aboutModal) {
        aboutModal.classList.remove('modal--active')
    }
})
