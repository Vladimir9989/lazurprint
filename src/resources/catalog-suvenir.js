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
        rememberOriginalOrder();
        restoreCategoryFromURL();
        // «Назад»/«Вперёд» браузера между вкладками: адрес меняется — показываем его вкладку
        window.addEventListener('popstate', function () {
            const categoryId = new URLSearchParams(window.location.search).get('category') || '1';
            if (document.querySelector(`.catalog__category-btn[data-category="${categoryId}"]`)) {
                switchCategory(categoryId, { history: false });
            }
        });
    }

    /**
     * Исходное место каждого товара (список + порядок) — чтобы «По умолчанию»
     * после сортировки вернуло товары по своим подгруппам, как в разметке.
     */
    const originalPlace = new Map();
    function rememberOriginalOrder() {
        document.querySelectorAll('.catalog__list').forEach(list => {
            Array.from(list.children).forEach((child, index) => {
                originalPlace.set(child, { list, index });
            });
        });
    }

    function restoreOriginalOrder(section) {
        section.querySelectorAll('.catalog__list').forEach(list => {
            const own = [];
            originalPlace.forEach((place, child) => {
                if (place.list === list) own.push(child);
            });
            own.sort((a, b) => originalPlace.get(a).index - originalPlace.get(b).index)
                .forEach(child => list.appendChild(child));
        });
    }

    /**
     * Цена товара для сортировки: число перед «руб»/«р» (а не первое число в строке —
     * в «от 6 шт - 391 р/шт» это 6). «Цена уточняется» — null, такие товары идут в конец.
     */
    function itemPrice(item) {
        const el = item.querySelector('.catalog-item__price');
        const text = el ? el.textContent.replace(/\u00a0/g, ' ') : '';
        const m = text.match(/(\d[\d ]*)\s*р/);
        return m ? parseInt(m[1].replace(/ /g, ''), 10) : null;
    }

    function comparePrice(a, b, dir) {
        const pa = itemPrice(a);
        const pb = itemPrice(b);
        if (pa === null && pb === null) return 0;
        if (pa === null) return 1;
        if (pb === null) return -1;
        return dir * (pa - pb);
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
            const btn = e.target.closest('.catalog__category-btn');
            if (btn) switchCategory(btn.dataset.category);
        });
    }

    /**
     * Переключение категории
     */
    // options.history: 'push' (клик, по умолчанию) | 'replace' (из адреса при загрузке) | false (popstate)
    function switchCategory(categoryId, options) {
        const historyMode = options && options.history !== undefined ? options.history : 'push';
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
        if (historyMode) {
            const url = new URL(window.location);
            url.searchParams.set('category', categoryId);
            if (historyMode === 'replace') window.history.replaceState({ categoryId }, '', url);
            else window.history.pushState({ categoryId }, '', url);
        }

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
        // каждая сортировка — от исходного порядка; прошлая могла собрать товары подгрупп в первый список
        restoreOriginalOrder(section);
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
                allVisibleItems.sort((a, b) => comparePrice(a, b, 1));
                break;
            case 'price-desc':
                allVisibleItems.sort((a, b) => comparePrice(a, b, -1));
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
                // «По умолчанию» — товары уже на своих местах (вернули в начале функции)
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
                switchCategory(categoryId, { history: 'replace' });
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
