// Страница вакансий: раскрытие описания вакансии по клику
(function () {
    document.querySelectorAll('.vacancy__item').forEach((item) => {
        item.addEventListener('click', () => {
            const text = item.querySelector('.vacancy__text');
            const arrow = item.querySelector('.vacancy__price');
            if (text) text.classList.toggle('vacancy__text--active');
            if (arrow) arrow.classList.toggle('vacancy__price--active');
        });
    });
})();
