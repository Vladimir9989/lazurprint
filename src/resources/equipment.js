// Страница «Оборудование»: вкладки .equipment__header-btn[data-tabs] → блок .equipment__container[data-target].
document.addEventListener('DOMContentLoaded', () => {
    const tabs = document.querySelectorAll('.equipment__header-btn');
    const content = document.querySelectorAll('.equipment__container');

    tabs.forEach(tab => {
        tab.addEventListener('click', () => {
            tabs.forEach(t => t.classList.remove('equipment--active'));
            content.forEach(c => c.classList.remove('equipment--active'));

            const target = tab.dataset.tabs;
            tab.classList.add('equipment--active');
            const panel = document.querySelector(`.equipment__container[data-target="${target}"]`);
            if (panel) panel.classList.add('equipment--active');
        });
    });
});
