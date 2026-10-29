/**
 * Каталог сувенирной продукции
 * Переключение категорий, поиск и сортировка товаров
 */

(function() {
    'use strict';

    // Конфигурация
    const CONFIG = {
        debounceDelay: 300,
        // «Показать ещё»: сколько товаров во вкладке без фильтров и сколько добавляет нажатие
        pageSize: 24,
        pageSizeMobile: 12,
        mobileQuery: '(max-width: 676px)'
    };

    // Состояние приложения
    const state = {
        currentCategory: '1',
        searchQuery: '',
        sortBy: 'default',
        currentCity: '',
        hitOnly: false,
        shownCount: 0
    };

    // DOM элементы
    const elements = {
        categoryTabs: null,
        searchInput: null,
        sortSelect: null,
        citySelect: null,
        hitToggle: null,
        moreWrap: null,
        moreButton: null
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
        initMoreButton();
        initCategoryCounts();
        rememberOriginalOrder();
        restoreCategoryFromURL();
        // Первая порция открытой вкладки (если вкладку из адреса уже показали — просто пересчёт)
        filterProducts();
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
    }

    /**
     * «Показать ещё (осталось N)» — под списком вкладки, после .catalog__menu.
     * Работает только без фильтров (поиск/город/«Хит продаж» показывают все совпадения).
     */
    function pageSize() {
        return window.matchMedia(CONFIG.mobileQuery).matches ? CONFIG.pageSizeMobile : CONFIG.pageSize;
    }

    function initMoreButton() {
        const menu = document.querySelector('.catalog__menu');
        if (!menu) return;
        elements.moreWrap = document.createElement('div');
        elements.moreWrap.className = 'catalog__more';
        elements.moreWrap.hidden = true;
        elements.moreButton = document.createElement('button');
        elements.moreButton.type = 'button';
        elements.moreButton.className = 'catalog__more-btn';
        elements.moreWrap.appendChild(elements.moreButton);
        menu.parentNode.insertBefore(elements.moreWrap, menu.nextSibling);

        elements.moreButton.addEventListener('click', function () {
            const section = document.querySelector(`.catalog__section[data-tab="${state.currentCategory}"]`);
            if (!section) return;
            state.shownCount += pageSize();
            updateMoreButton(applyPortion(section));
            updateGroups(section);
        });
    }

    function updateMoreButton(rest) {
        if (!elements.moreWrap) return;
        elements.moreWrap.hidden = rest <= 0;
        elements.moreButton.textContent = `Показать ещё (осталось ${rest})`;
    }

    function isFiltered() {
        return Boolean(state.searchQuery || state.currentCity || state.hitOnly);
    }

    /**
     * Порция по всей секции в порядке DOM (через все подгруппы, после сортировки):
     * первые state.shownCount товаров, прошедших фильтры, видны, остальные — класс
     * catalog-item--more. Класс, а не style.display: инлайн-стиль — это фильтры.
     * Возвращает, сколько товаров ещё скрыто.
     */
    function applyPortion(section) {
        const portion = !isFiltered();
        let shown = 0;
        let rest = 0;
        section.querySelectorAll('.catalog__item').forEach(item => {
            let more = false;
            if (portion && item.style.display !== 'none') {
                if (shown < state.shownCount) shown++;
                else { more = true; rest++; }
            }
            item.classList.toggle('catalog-item--more', more);
        });
        return rest;
    }

    function isShown(item) {
        return item.style.display !== 'none' && !item.classList.contains('catalog-item--more');
    }

    /**
     * Прячем подгруппы без видимых товаров: список + подзаголовок + кнопку «Скачать PDF».
     * Перед списком может стоять подзаголовок (обычный .catalog__subtitle или
     * стилизованный .catalog__subtitle--style, как у «Детские/Сувенирные/Без принта»
     * в футболках), а между подзаголовком и списком catalog-pdf.js вставляет свою
     * кнопку .catalog__pdf-btn. Кнопки PDF появляются позже первого вызова — их
     * прячет и CSS-правило по соседнему скрытому списку (см. _catalog-suvenir.scss).
     */
    function updateGroups(section) {
        section.querySelectorAll('.catalog__list').forEach(list => {
            const hidden = !Array.from(list.children).some(isShown);
            list.classList.toggle('catalog__group--hidden', hidden);

            let sibling = list.previousElementSibling;
            while (sibling && (
                sibling.classList.contains('catalog__pdf-btn') ||
                sibling.classList.contains('catalog__subtitle') ||
                sibling.classList.contains('catalog__subtitle--style')
            )) {
                sibling.classList.toggle('catalog__group--hidden', hidden);
                const isTitle = sibling.classList.contains('catalog__subtitle') ||
                    sibling.classList.contains('catalog__subtitle--style');
                sibling = sibling.previousElementSibling;
                if (isTitle) break;
            }
        });
    }

    /**
     * Число товаров на плитках категорий — считаем по разметке, не хардкодим.
     */
    function initCategoryCounts() {
        document.querySelectorAll('.catalog__category-btn').forEach(btn => {
            const count = btn.querySelector('.catalog__category-count');
            if (!count) return;
            const section = document.querySelector(`.catalog__section[data-tab="${btn.dataset.category}"]`);
            count.textContent = section ? section.querySelectorAll('.catalog__item').length : '';
        });
    }

    function plural(n) {
        const m10 = n % 10;
        const m100 = n % 100;
        if (m10 === 1 && m100 !== 11) return 'товар';
        if (m10 >= 2 && m10 <= 4 && (m100 < 12 || m100 > 14)) return 'товара';
        return 'товаров';
    }

    /**
     * Строка над сеткой: «Магниты · 200 товаров» (с фильтрами — число найденных).
     * Узел #current-category остаётся заголовком h2 — меняется только текст.
     */
    function updateTitle(matching) {
        const title = document.getElementById('current-category');
        if (!title) return;
        let name = 'Хит продаж';
        if (!state.hitOnly) {
            const nameEl = document.querySelector(`.catalog__category-btn[data-category="${state.currentCategory}"] .catalog__category-name`);
            name = nameEl ? nameEl.textContent.trim() : '';
        }
        title.textContent = `${name} · ${matching} ${plural(matching)}`;
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

        // Клик по плитке: докручиваем её в видимую область (на телефоне вкладки — прокручиваемая строка)
        if (historyMode === 'push') {
            const activeTab = document.querySelector(`.catalog__category-btn[data-category="${categoryId}"]`);
            if (activeTab && activeTab.scrollIntoView) activeTab.scrollIntoView({ inline: 'center', block: 'nearest' });
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
        // Любая смена фильтра, вкладки или сортировки — снова первая порция
        state.shownCount = pageSize();
        let rest = 0;

        const sections = state.hitOnly
            ? Array.from(document.querySelectorAll('.catalog__section'))
            : [document.querySelector(`.catalog__section[data-tab="${state.currentCategory}"]`)].filter(Boolean);

        let anyVisible = false;
        let matching = 0;

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
                if (visible) { anyVisible = true; matching++; }
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

            // Порция и пустые подгруппы — после сортировки: она переставляет товары
            rest += applyPortion(section);
            updateGroups(section);
        });

        updateMoreButton(rest);
        updateTitle(matching);
        updateEmptyMessage(!anyVisible && sections.length > 0);
    }

    /**
     * «Ничего не найдено» — когда поиск/город/«Хит продаж» не оставили ни одного товара.
     * Если причина — поиск, рядом кнопка «Сбросить поиск».
     */
    let emptyMessage = null;
    function updateEmptyMessage(isEmpty) {
        if (!emptyMessage) {
            if (!isEmpty) return;
            const menu = document.querySelector('.catalog__menu');
            if (!menu) return;
            emptyMessage = document.createElement('div');
            emptyMessage.className = 'catalog__empty';
            emptyMessage.setAttribute('role', 'status');
            emptyMessage.innerHTML = '<p class="catalog__empty-title">Ничего не найдено</p>' +
                '<p class="catalog__empty-text">Попробуйте изменить запрос, выбрать другой город или раздел каталога.</p>' +
                '<button type="button" class="catalog__empty-reset">Сбросить поиск</button>';
            emptyMessage.querySelector('.catalog__empty-reset').addEventListener('click', function () {
                state.searchQuery = '';
                if (elements.searchInput) {
                    elements.searchInput.value = '';
                    elements.searchInput.focus();
                }
                filterProducts();
            });
            menu.parentNode.insertBefore(emptyMessage, menu);
        }
        emptyMessage.hidden = !isEmpty;
        emptyMessage.querySelector('.catalog__empty-reset').hidden = !state.searchQuery;
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

            if (!state.hitOnly) {
                resetHitModeStyles();
            }

            filterProducts();
        });
    }

    /**
     * Сброс инлайновых стилей, выставленных в режиме «Хит продаж»
     * (показанные секции других категорий), при выходе из него.
     * Пустые подгруппы скрыты классом — его пересчитает filterProducts.
     */
    function resetHitModeStyles() {
        const menu = document.querySelector('.catalog__menu');
        if (!menu) return;

        menu.querySelectorAll('.catalog__section').forEach(section => {
            section.style.display = '';
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
