document.addEventListener('DOMContentLoaded', function () {
    // Элементы
    let filterButtons = document.querySelectorAll('.filter-btn');
    const topicCards = document.querySelectorAll('.topic-card');
    const galleryItems = document.querySelectorAll('.gallery-item');
    const resetFilterBtn = document.getElementById('resetFilter');
    const activeFilterText = document.querySelector('.active-filter-text strong');

    // Карта названий фильтров
    const filterNames = {
        'all': 'Все публикации',
        'printing': 'Технологии печати',
        'postpress': 'Послепечатная обработка',
        'design': 'Дизайн и макеты',
        'materials': 'Материалы',
        'equipment': 'Оборудование',
        'portfolio': 'Наши работы',
        'tips': 'Советы клиентам'
    };

    // Ключ для localStorage
    const STORAGE_KEY = 'instagram_filter';

    // Собираем все существующие категории из публикаций
    const allCategories = new Set(['all']);

    // Функция для сбора категорий из всех публикаций
    function collectCategoriesFromPosts() {
        galleryItems.forEach(item => {
            const categories = item.dataset.category.split(' ');
            categories.forEach(cat => {
                if (cat && cat.trim() !== '') {
                    allCategories.add(cat.trim());
                }
            });
        });
        console.log('Найденные категории:', Array.from(allCategories));
    }

    // Функция для ПРАВИЛЬНОГО подсчета публикаций по категориям
    function countPostsByCategory() {
        const counts = {};

        // Инициализируем счетчики для ВСЕХ категорий (включая 'all')
        Array.from(allCategories).forEach(cat => {
            counts[cat] = 0;
        });

        // Считаем публикации по категориям
        galleryItems.forEach(item => {
            const itemCategories = item.dataset.category.split(' ');

            // Увеличиваем счетчик для 'all' для каждой публикации
            counts['all']++;

            // Увеличиваем счетчики для каждой категории публикации
            itemCategories.forEach(cat => {
                const trimmedCat = cat.trim();
                if (trimmedCat && trimmedCat !== 'all' && counts[trimmedCat] !== undefined) {
                    counts[trimmedCat]++;
                }
            });
        });

        console.log('Подсчет публикаций:', counts);
        return counts;
    }

    // Функция для обновления счетчиков в интерфейсе
    function updateCountersInUI(counts) {
        console.log('Обновляем счетчики в UI:', counts);

        // Обновляем счетчики в кнопках фильтров
        filterButtons.forEach(button => {
            const filter = button.dataset.filter;
            const countElement = button.querySelector('.filter-count');
            if (countElement && counts[filter] !== undefined) {
                countElement.textContent = counts[filter];
                console.log(`Фильтр "${filter}": ${counts[filter]} публикаций`);
            } else if (countElement) {
                countElement.textContent = '0';
                console.log(`Фильтр "${filter}": не найден в counts`);
            }
        });

        // Обновляем счетчики в карточках тем
        topicCards.forEach(card => {
            const category = card.dataset.category;
            const countElement = card.querySelector('.topic-card__count');
            if (countElement && counts[category] !== undefined) {
                const count = counts[category];
                countElement.textContent = `${count} ${getPostWord(count)}`;
            } else if (countElement) {
                countElement.textContent = '0 публикаций';
            }
        });
    }

    // Функция для правильного склонения слова "публикация"
    function getPostWord(count) {
        if (count % 10 === 1 && count % 100 !== 11) {
            return 'публикация';
        } else if ([2, 3, 4].includes(count % 10) && ![12, 13, 14].includes(count % 100)) {
            return 'публикации';
        } else {
            return 'публикаций';
        }
    }

    // Функция для подсчета видимых элементов после фильтрации
    function countVisibleItems(category) {
        let count = 0;
        galleryItems.forEach(item => {
            const itemCategories = item.dataset.category.split(' ').map(c => c.trim());
            if (category === 'all' || itemCategories.includes(category)) {
                count++;
            }
        });
        console.log(`Видимых элементов для "${category}": ${count}`);
        return count;
    }

    // Функция для отладки - показывает все публикации и их категории
    function debugPostsAndCategories() {
        console.log('=== ОТЛАДКА: Все публикации и категории ===');
        galleryItems.forEach((item, index) => {
            const categories = item.dataset.category.split(' ').map(c => c.trim());
            console.log(`Публикация ${index + 1}:`, {
                title: item.querySelector('.gallery-item__title')?.textContent,
                categories: categories,
                dataCategory: item.dataset.category
            });
        });

        console.log('=== ОТЛАДКА: Все кнопки фильтров ===');
        filterButtons.forEach(button => {
            console.log(`Фильтр: "${button.dataset.filter}", Текст: "${button.textContent}"`);
        });
    }

    // Функция фильтрации
    function filterContent(category, event) {
        if (event) {
            event.preventDefault();
        }

        console.log(`Фильтруем по категории: "${category}"`);

        const visibleCount = countVisibleItems(category);

        // Обновляем текст активного фильтра
        if (activeFilterText) {
            activeFilterText.textContent = `${filterNames[category] || 'Все публикации'} (${visibleCount})`;
        }

        // Сохраняем фильтр
        saveFilterToStorage(category);

        // Обновляем URL без прокрутки страницы
        updateURLHash(category);

        // Показываем/скрываем элементы галереи
        galleryItems.forEach(item => {
            const itemCategories = item.dataset.category.split(' ').map(c => c.trim());

            if (category === 'all' || itemCategories.includes(category)) {
                item.style.display = 'block';
                setTimeout(() => {
                    item.style.opacity = '1';
                    item.style.transform = 'translateY(0)';
                }, 10);
            } else {
                item.style.opacity = '0';
                item.style.transform = 'translateY(20px)';
                setTimeout(() => {
                    item.style.display = 'none';
                }, 300);
            }
        });

        // Обновляем активные кнопки фильтров
        updateActiveFilterButton(category);

        // Обновляем активные карточки тем
        topicCards.forEach(card => {
            if (category === 'all' || card.dataset.category === category) {
                card.classList.add('active');
            } else {
                card.classList.remove('active');
            }
        });

        // Показываем сообщение, если нет результатов
        showNoResultsMessage(category, visibleCount);
    }

    // Сохранение в localStorage
    function saveFilterToStorage(category) {
        try {
            localStorage.setItem(STORAGE_KEY, category);
        } catch (e) {
            console.warn('Не удалось сохранить фильтр:', e);
        }
    }

    // Загрузка из localStorage
    function loadFilterFromStorage() {
        try {
            return localStorage.getItem(STORAGE_KEY) || 'all';
        } catch (e) {
            console.warn('Не удалось загрузить фильтр:', e);
            return 'all';
        }
    }

    // Обновление активной кнопки фильтра
    function updateActiveFilterButton(category) {
        filterButtons.forEach(btn => {
            btn.classList.remove('active');
            if (btn.dataset.filter === category) {
                btn.classList.add('active');
            }
        });
    }

    // Обновление URL
    function updateURLHash(category) {
        if (category !== 'all') {
            if (history.replaceState) {
                const newUrl = window.location.pathname + window.location.search + '#filter=' + category;
                history.replaceState(null, null, newUrl);
            }
        } else {
            if (history.replaceState) {
                const newUrl = window.location.pathname + window.location.search;
                history.replaceState(null, null, newUrl);
            }
        }
    }

    // Восстановление из URL
    function restoreFilterFromURL() {
        const hash = window.location.hash.substring(1);
        const params = new URLSearchParams(hash);
        const filterFromURL = params.get('filter');

        if (filterFromURL && allCategories.has(filterFromURL)) {
            return filterFromURL;
        }
        return null;
    }

    // Сообщение "нет результатов"
    function showNoResultsMessage(category, visibleCount) {
        const oldMessage = document.querySelector('.no-results-message');
        if (oldMessage) oldMessage.remove();

        if (visibleCount === 0 && category !== 'all') {
            const galleryContainer = document.querySelector('.gallery-grid');
            const message = document.createElement('div');
            message.className = 'no-results-message';
            message.innerHTML = `
                <div class="no-results-content">
                    <span class="no-results-icon">🔍</span>
                    <h3>Публикаций по теме "${filterNames[category]}" пока нет</h3>
                    <p>Но у нас есть много других интересных материалов!</p>
                    <button class="show-all-btn">Показать все публикации</button>
                </div>
            `;

            message.querySelector('.show-all-btn').addEventListener('click', function () {
                resetFilter();
            });

            if (galleryContainer) {
                galleryContainer.parentNode.insertBefore(message, galleryContainer.nextSibling);
            }
        }
    }

    // Сброс фильтра
    function resetFilter(event) {
        if (event) {
            event.preventDefault();
        }

        filterContent('all', event);
        saveFilterToStorage('all');
    }

    // Проверка соответствия фильтров и категорий
    function validateFiltersAndPosts() {
        console.log('=== ПРОВЕРКА СООТВЕТСТВИЯ ===');

        // Проверяем, что у всех кнопок есть соответствующие категории в публикациях
        filterButtons.forEach(button => {
            const filter = button.dataset.filter;
            if (filter !== 'all' && !allCategories.has(filter)) {
                console.warn(`Фильтр "${filter}" не имеет публикаций!`);
                // Можно скрыть или деактивировать такие фильтры
                button.style.opacity = '0.5';
                button.disabled = true;
                button.title = 'Публикаций по этой теме пока нет';
            }
        });
    }

    // Инициализация
    function initialize() {
        // Сначала собираем все категории
        collectCategoriesFromPosts();

        // Затем считаем публикации
        const counts = countPostsByCategory();

        // Обновляем интерфейс
        updateCountersInUI(counts);

        // Проверяем соответствие
        validateFiltersAndPosts();

        // Настраиваем обработчики
        setupEventListeners();

        // Восстанавливаем фильтр
        const hasRestoredFilter = restoreFilterOnLoad();

        if (!hasRestoredFilter) {
            filterContent('all');
        }

        // Отладка
        debugPostsAndCategories();
    }

    // Настройка обработчиков событий
    function setupEventListeners() {
        filterButtons.forEach(button => {
            button.addEventListener('click', function (event) {
                const category = this.dataset.filter;
                filterContent(category, event);
            });
        });

        topicCards.forEach(card => {
            card.addEventListener('click', function (event) {
                event.preventDefault();
                const category = this.dataset.category;
                const counts = countPostsByCategory();

                if (category !== 'all' && counts[category] === 0) {
                    return;
                }

                filterContent(category, event);
            });
        });

        if (resetFilterBtn) {
            resetFilterBtn.addEventListener('click', resetFilter);
        }
    }

    // Восстановление фильтра при загрузке
    function restoreFilterOnLoad() {
        const filterFromURL = restoreFilterFromURL();
        const filterFromStorage = loadFilterFromStorage();

        let savedFilter = filterFromURL || filterFromStorage || 'all';

        if (!allCategories.has(savedFilter)) {
            savedFilter = 'all';
        }

        filterContent(savedFilter);

        return savedFilter !== 'all';
    }

    // Запускаем инициализацию
    initialize();

    // Глобальные функции для отладки
    window.debugFilters = {
        recount: () => {
            const counts = countPostsByCategory();
            updateCountersInUI(counts);
            return counts;
        },
        showAllCategories: () => Array.from(allCategories),
        showPostCategories: (index) => {
            if (galleryItems[index]) {
                return galleryItems[index].dataset.category.split(' ').map(c => c.trim());
            }
            return null;
        }
    };
});