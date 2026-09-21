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
        sortBy: 'default',
        currentCity: '',
        hitOnly: false
    };

    // DOM элементы
    const elements = {
        categoryTabs: null,
        searchInput: null,
        sortSelect: null,
        citySelect: null,
        hitToggle: null,
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
        initCityFilter();
        initHitFilter();
        initTshirtSliders();
        restoreCategoryFromURL();
    }

    /**
     * Мини-слайдер «перед/зад» внутри карточки товара (Swiper уже подключён
     * на странице). observer/observeParents нужны, потому что карточка
     * может лежать в неактивной вкладке каталога (display: none) в момент
     * инициализации — без них Swiper посчитает ширину слайдов нулевой.
     */
    function initTshirtSliders() {
        if (typeof Swiper === 'undefined') return;

        document.querySelectorAll('.catalog-slider').forEach(function (el) {
            new Swiper(el, {
                rewind: true,
                observer: true,
                observeParents: true,
                pagination: {
                    el: el.querySelector('.catalog-slider__pagination'),
                    clickable: true
                },
                navigation: {
                    nextEl: el.querySelector('.catalog-slider__arrow--next'),
                    prevEl: el.querySelector('.catalog-slider__arrow--prev')
                }
            });
        });
    }

    /**
     * Кэширование DOM элементов
     */
    function cacheElements() {
        elements.categoryTabs = document.querySelector('.catalog__category-tabs');
        elements.searchInput = document.querySelector('.catalog__search input');
        elements.sortSelect = document.querySelector('.catalog__sort select');
        elements.citySelect = document.querySelector('.catalog__city-filter select');
        elements.hitToggle = document.querySelector('.catalog__hit-toggle');
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
        const wasHitOnly = state.hitOnly;
        if (!wasHitOnly && state.currentCategory === categoryId) return;

        // Клик по табу категории выключает режим «Хит продаж»
        if (wasHitOnly) {
            state.hitOnly = false;
            resetHitModeStyles();
            if (elements.hitToggle) {
                elements.hitToggle.classList.remove('catalog__hit-toggle--active');
                elements.hitToggle.setAttribute('aria-pressed', 'false');
            }
        }

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

        // Фильтр по городу не сбрасывается при смене категории — применяем его к новой секции
        filterProducts();
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
     * Фильтрация и сортировка товаров.
     * В обычном режиме работает только с секцией текущей категории.
     * В режиме «Хит продаж» (state.hitOnly) проходит по ВСЕМ секциям —
     * товары-хиты есть в разных категориях, и на выбор фильтра их нужно
     * показать все сразу, а не только внутри одной открытой вкладки.
     */
    function filterProducts() {
        const sections = state.hitOnly
            ? Array.from(document.querySelectorAll('.catalog__section'))
            : [document.querySelector(`.catalog__section[data-tab="${state.currentCategory}"]`)].filter(Boolean);

        sections.forEach(section => {
            const items = section.querySelectorAll('.catalog__item');
            let sectionHasVisible = false;

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

                // Фильтр по городу. "universal" — отдельный пункт для товаров без data-city
                // (не привязаны ни к одному городу); при выборе конкретного города такие
                // товары не показываются — только точное совпадение по data-city.
                let matchesCity = true;
                if (state.currentCity === 'universal') {
                    matchesCity = !item.dataset.city;
                } else if (state.currentCity) {
                    const itemCities = item.dataset.city ? item.dataset.city.split(' ') : [];
                    matchesCity = itemCities.includes(state.currentCity);
                }

                // Фильтр «Хит продаж» — только товары с бейджем (data-hit="true")
                let matchesHit = true;
                if (state.hitOnly) {
                    matchesHit = item.dataset.hit === 'true';
                }

                const visible = matchesSearch && matchesCity && matchesHit;
                item.style.display = visible ? '' : 'none';
                if (visible) sectionHasVisible = true;
            });

            if (state.hitOnly) {
                // Секции без единого хита в режиме фильтра скрываем целиком.
                // Важно: неактивные вкладки скрыты классом .catalog__section
                // (display: none по умолчанию, без --active), поэтому просто
                // снять инлайн-стиль (style.display = '') недостаточно —
                // нужно явно выставить 'block', иначе CSS-класс снова спрячет
                // секцию, даже если в ней есть видимые хиты.
                section.style.display = sectionHasVisible ? 'block' : 'none';
            }

            // Сортировка (если активна) может переместить товары между
            // подгруппами секции — поэтому видимость подзаголовков/списков
            // считаем после неё, а не до.
            sortProducts(section);

            if (state.hitOnly) {
                // Прячем пустые подгруппы (подзаголовок + список), чтобы
                // не было пустых заголовков без единого товара под ними.
                section.querySelectorAll('.catalog__list').forEach(list => {
                    const hasVisibleItem = Array.from(list.children).some(li => li.style.display !== 'none');
                    list.style.display = hasVisibleItem ? '' : 'none';

                    // Перед списком может стоять подзаголовок (обычный
                    // .catalog__subtitle или стилизованный .catalog__subtitle--style,
                    // как у «Детские/Сувенирные/Без принта» в футболках), а между
                    // подзаголовком и списком скрипт catalog-pdf.js вставляет свою
                    // кнопку «Скачать PDF» (.catalog__pdf-btn). Прячем всю эту
                    // цепочку целиком, если под ней не осталось ни одного товара.
                    let sibling = list.previousElementSibling;
                    while (sibling && (
                        sibling.classList.contains('catalog__pdf-btn') ||
                        sibling.classList.contains('catalog__subtitle') ||
                        sibling.classList.contains('catalog__subtitle--style')
                    )) {
                        sibling.style.display = hasVisibleItem ? '' : 'none';
                        const isTitle = sibling.classList.contains('catalog__subtitle') ||
                            sibling.classList.contains('catalog__subtitle--style');
                        sibling = sibling.previousElementSibling;
                        if (isTitle) break;
                    }
                });
            }
        });
    }

    /**
     * Инициализация фильтра по городу
     */
    function initCityFilter() {
        if (!elements.citySelect) return;

        elements.citySelect.addEventListener('change', function(e) {
            state.currentCity = e.target.value;
            filterProducts();
        });
    }

    /**
     * Инициализация переключателя «Хит продаж».
     * Это кросс-категорийный фильтр (в отличие от табов категорий) —
     * показывает товары-хиты сразу из всех разделов каталога.
     */
    function initHitFilter() {
        if (!elements.hitToggle) return;

        elements.hitToggle.addEventListener('click', function() {
            state.hitOnly = !state.hitOnly;
            elements.hitToggle.classList.toggle('catalog__hit-toggle--active', state.hitOnly);
            elements.hitToggle.setAttribute('aria-pressed', String(state.hitOnly));

            const categoryTitle = document.getElementById('current-category');
            if (categoryTitle) {
                if (state.hitOnly) {
                    categoryTitle.textContent = 'Хит продаж';
                } else {
                    const activeBtn = document.querySelector(`.catalog__category-btn[data-category="${state.currentCategory}"]`);
                    categoryTitle.textContent = activeBtn ? activeBtn.textContent.trim() : '';
                }
            }

            if (!state.hitOnly) {
                resetHitModeStyles();
            }

            filterProducts();
        });
    }

    /**
     * Сброс инлайновых стилей, выставленных в режиме «Хит продаж»
     * (скрытые секции/подгруппы других категорий), при выходе из него.
     */
    function resetHitModeStyles() {
        const menu = document.querySelector('.catalog__menu');
        if (!menu) return;

        menu.querySelectorAll('.catalog__section').forEach(section => {
            section.style.display = '';
        });
        menu.querySelectorAll('.catalog__list').forEach(list => {
            list.style.display = '';
        });
        menu.querySelectorAll('.catalog__subtitle, .catalog__subtitle--style').forEach(subtitle => {
            subtitle.style.display = '';
        });
        menu.querySelectorAll('.catalog__pdf-btn').forEach(btn => {
            btn.style.display = '';
        });
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
