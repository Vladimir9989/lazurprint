document.addEventListener('DOMContentLoaded', () => {
    const tabs = document.querySelectorAll('.equipment__header-btn');
    const content = document.querySelectorAll('.equipment__container');

    tabs.forEach(tab => {
        tab.addEventListener('click', () => {
            tabs.forEach(t => t.classList.remove('equipment--active'));
            content.forEach(c => c.classList.remove('equipment--active'));

            const target = tab.dataset.tabs;
            tab.classList.add('equipment--active');
            document.querySelector(`.equipment__container[data-target="${target}"]`).classList.add('equipment--active');
        });
    });
});
