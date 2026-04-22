/**
 * Каталог сувенирной продукции
 * Переключение категорий, поиск и сортировка товаров
 */

(function() {
    'use strict';

    // Конфигурация
    const CONFIG = {
        debounceDelay: 300
    };

    // Состояние приложения
    const state = {
        currentCategory: '1',
        searchQuery: '',
        sortBy: 'default'
    };

    // DOM элементы
    const elements = {
        categoryTabs: null,
        searchInput: null,
        sortSelect: null,
        paginationContainer: null
    };

    /**
     * Инициализация приложения
     */
    function init() {
        cacheElements();
        initCategoryNavigation();
        initSearch();
        initSort();
        restoreCategoryFromURL();
    }

    /**
     * Кэширование DOM элементов
     */
    function cacheElements() {
        elements.categoryTabs = document.querySelector('.catalog__category-tabs');
        elements.searchInput = document.querySelector('.catalog__search input');
        elements.sortSelect = document.querySelector('.catalog__sort select');
        elements.paginationContainer = document.querySelector('.catalog__pagination');
        
        // Скрываем пагинацию
        if (elements.paginationContainer) {
            elements.paginationContainer.style.display = 'none';
        }
    }

    /**
     * Инициализация навигации по категориям
     */
    function initCategoryNavigation() {
        // Обработчик клика по табу категории
        document.addEventListener('click', function(e) {
            if (e.target.matches('.catalog__category-btn')) {
                const categoryId = e.target.dataset.category;
                switchCategory(categoryId);
            }
        });
    }

    /**
     * Переключение категории
     */
    function switchCategory(categoryId) {
        if (state.currentCategory === categoryId) return;

        state.currentCategory = categoryId;
        state.searchQuery = '';

        if (elements.searchInput) {
            elements.searchInput.value = '';
        }

        // Обновляем активный класс на табах
        document.querySelectorAll('.catalog__category-btn').forEach(btn => {
            btn.classList.toggle('catalog__category-btn--active', btn.dataset.category === categoryId);
            btn.setAttribute('aria-selected', btn.dataset.category === categoryId);
        });

        // Обновляем заголовок категории
        const categoryTitle = document.getElementById('current-category');
        if (categoryTitle) {
            const activeBtn = document.querySelector(`.catalog__category-btn[data-category="${categoryId}"]`);
            if (activeBtn) {
                categoryTitle.textContent = activeBtn.textContent.trim();
            }
        }

        // Обновляем URL
        const url = new URL(window.location);
        url.searchParams.set('category', categoryId);
        window.history.pushState({ categoryId }, '', url);

        // Переключаем секцию
        document.querySelectorAll('.catalog__section').forEach(section => {
            section.classList.toggle('catalog__section--active', section.dataset.tab === categoryId);
        });
    }

    /**
     * Инициализация поиска
     */
    function initSearch() {
        if (!elements.searchInput) return;

        let debounceTimer;
        
        elements.searchInput.addEventListener('input', function(e) {
            clearTimeout(debounceTimer);
            debounceTimer = setTimeout(() => {
                state.searchQuery = e.target.value.trim().toLowerCase();
                filterProducts();
            }, CONFIG.debounceDelay);
        });
    }

    /**
     * Инициализация сортировки
     */
    function initSort() {
        if (!elements.sortSelect) return;

        elements.sortSelect.addEventListener('change', function(e) {
            state.sortBy = e.target.value;
            filterProducts();
        });
    }

    /**
     * Фильтрация и сортировка товаров
     */
    function filterProducts() {
        const activeSection = document.querySelector(`.catalog__section[data-tab="${state.currentCategory}"]`);
        if (!activeSection) return;

        const items = activeSection.querySelectorAll('.catalog__item');
        
        items.forEach(item => {
            const name = item.querySelector('.catalog-item__name');
            const number = item.querySelector('.catalog-item__number');
            const nameText = name ? name.textContent.trim().toLowerCase() : '';
            const articleText = number ? number.textContent.trim().toLowerCase() : '';
            
            // Поиск
            let matchesSearch = true;
            if (state.searchQuery) {
                matchesSearch = nameText.includes(state.searchQuery) || articleText.includes(state.searchQuery);
            }
            
            item.style.display = matchesSearch ? '' : 'none';
        });

        // Сортировка
        sortProducts(activeSection);
    }

    /**
     * Сортировка товаров
     */
    function sortProducts(section) {
        const lists = section.querySelectorAll('.catalog__list');
        const allVisibleItems = [];

        // Собираем все видимые товары из всех списков
        lists.forEach(list => {
            const items = Array.from(list.querySelectorAll('.catalog__item:not([style*="display: none"])'));
            allVisibleItems.push(...items);
        });

        if (allVisibleItems.length === 0) return;

        switch (state.sortBy) {
            case 'price-asc':
                allVisibleItems.sort((a, b) => {
                    const priceElA = a.querySelector('.catalog-item__price');
                    const priceElB = b.querySelector('.catalog-item__price');
                    // Берём первую цену из списка (для товаров с оптовыми ценами)
                    const priceTextA = priceElA ? priceElA.textContent.trim() : '0';
                    const priceTextB = priceElB ? priceElB.textContent.trim() : '0';
                    // Извлекаем первое число из строки (например, "от 6 шт - 391 р/шт" -> 391)
                    const priceMatchA = priceTextA.match(/(\d+)/);
                    const priceMatchB = priceTextB.match(/(\d+)/);
                    const priceA = priceMatchA ? parseInt(priceMatchA[1]) : 0;
                    const priceB = priceMatchB ? parseInt(priceMatchB[1]) : 0;
                    return priceA - priceB;
                });
                break;
            case 'price-desc':
                allVisibleItems.sort((a, b) => {
                    const priceElA = a.querySelector('.catalog-item__price');
                    const priceElB = b.querySelector('.catalog-item__price');
                    const priceTextA = priceElA ? priceElA.textContent.trim() : '0';
                    const priceTextB = priceElB ? priceElB.textContent.trim() : '0';
                    const priceMatchA = priceTextA.match(/(\d+)/);
                    const priceMatchB = priceTextB.match(/(\d+)/);
                    const priceA = priceMatchA ? parseInt(priceMatchA[1]) : 0;
                    const priceB = priceMatchB ? parseInt(priceMatchB[1]) : 0;
                    return priceB - priceA;
                });
                break;
            case 'name-asc':
                allVisibleItems.sort((a, b) => {
                    const nameA = a.querySelector('.catalog-item__name')?.textContent.trim() || '';
                    const nameB = b.querySelector('.catalog-item__name')?.textContent.trim() || '';
                    return nameA.localeCompare(nameB, 'ru');
                });
                break;
            case 'name-desc':
                allVisibleItems.sort((a, b) => {
                    const nameA = a.querySelector('.catalog-item__name')?.textContent.trim() || '';
                    const nameB = b.querySelector('.catalog-item__name')?.textContent.trim() || '';
                    return nameB.localeCompare(nameA, 'ru');
                });
                break;
            case 'article-asc':
                allVisibleItems.sort((a, b) => {
                    const articleA = a.querySelector('.catalog-item__number')?.textContent.trim() || '';
                    const articleB = b.querySelector('.catalog-item__number')?.textContent.trim() || '';
                    return articleA.localeCompare(articleB, 'ru', { numeric: true });
                });
                break;
            default:
                // Сортировка по умолчанию - восстанавливаем исходный порядок
                return;
        }

        // Перемещаем отсортированные товары в первый список
        const firstList = lists[0];
        if (firstList) {
            allVisibleItems.forEach(item => firstList.appendChild(item));
        }
    }

    /**
     * Восстановление категории из URL
     */
    function restoreCategoryFromURL() {
        const urlParams = new URLSearchParams(window.location.search);
        const categoryId = urlParams.get('category');
        
        if (categoryId) {
            // Переключаем таб
            const activeBtn = document.querySelector(`.catalog__category-btn[data-category="${categoryId}"]`);
            if (activeBtn) {
                switchCategory(categoryId);
            }
        }
    }

    // Запуск при загрузке DOM
    if (document.readyState === 'loading') {
        document.addEventListener('DOMContentLoaded', init);
    } else {
        init();
    }

})();

// ============================================================================
// Старый код для модальных окон (сохранён для совместимости)
// ============================================================================

const galleryBtn = document.querySelector('.hero__btn');
const footerContactsBtn = document.querySelector('.footer__contacts-btn');
const formModal = document.querySelector('.form__modal');
const form = document.querySelector('.form');
const formBtn = document.querySelector('.form__btn');
const formClose = document.querySelector('.form__close');
const formTitle = document.querySelector('.form__title');
const formDesc = document.querySelector('.form__desc');
const formTextarea = document.querySelector('#textarea');

if (formClose) {
    formClose.addEventListener('click', () => {
        formModal.classList.remove('modal--active');
        formTitle.textContent = 'Рассчитать стоимость';
        formDesc.textContent = 'Оставьте заявку на расчет стоимости и мы свяжемся с Вами в ближайшее время.';
        formTextarea.value = '';
    });
}

if (formModal) {
    formModal.addEventListener('click', (e) => {
        if (e.target === formModal) {
            formModal.classList.remove('modal--active');
            formTitle.textContent = 'Рассчитать стоимость';
            formDesc.textContent = 'Оставьте заявку на расчет стоимости и мы свяжемся с Вами в ближайшее время.';
            formTextarea.value = '';
        }
    });
}

if (footerContactsBtn) {
    footerContactsBtn.addEventListener('click', () => {
        formModal.classList.add('modal--active');
        form.classList.remove('hidden');
    });
}

if (galleryBtn) {
    galleryBtn.addEventListener('click', () => {
        formModal.classList.add('modal--active');
        form.classList.remove('hidden');
    });
}
