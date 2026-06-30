# CLAUDE.md

This file provides guidance to Claude Code (claude.ai/code) when working with code in this repository.

## Что это

Статический многостраничный сайт типографии «Лазурь» (lazurprint.ru). Сборка на **Gulp 4**: SCSS → CSS, ES-модули → бандл, HTML-партиалы → страницы. Серверной логики, кроме PHP-обработчика формы (`mail.php` + PHPMailer), нет.

## Команды

```bash
npm run dev      # gulp dev  — чистит dist/build, собирает, поднимает browser-sync (baseDir: dist) и watch
npm run build    # gulp build — продакшен-сборка (минификация HTML/CSS/JS, sitemap.xml)
```

Отдельные таски можно запускать точечно: `npx gulp styles`, `npx gulp scripts`, `npx gulp htmlMinify`, `npx gulp sitemap`.

Тестов и линтеров в проекте нет.

Разница `dev` vs `build`: флаг `prod` (см. таск `isProd`) включает sourcemaps только в dev, а минификацию (`cleanCSS`, `uglify`, `htmlMin`) и генерацию `sitemap.xml` — только в build. Оба режима пишут результат **одновременно в `dist/` и `build/`**.

## Архитектура сборки (gulpfile.js)

Ключевая особенность — **два независимых конвейера JavaScript**, их легко перепутать:

1. **Бандл `app.js`** (таск `scripts`): собирается из `src/js/components/**/*.js` + `src/js/main.js`, прогоняется через Babel и concat в `app.js`. `main.js` — общая логика всех страниц (бургер-меню, выпадающие списки хедера, анимации появления по скроллу через классы `.fade-in`/`.slide-in-*`/`.scale-in` + `.visible`).

2. **Файлы из `src/resources/`** (таск `resources`): копируются **как есть, без обработки** в корень `dist`/`build`. Здесь лежат:
   - постраничные скрипты (`index.js`, `catalog.js`, `events.js`, `about.js`, `cart.js`, `map.js`, …) — подключаются вручную через `<script>` на нужных страницах;
   - сторонние библиотеки (`swiper-bundle.min.js`, `choices.min.js`, `just-validate.min.js`, `inputmask.min.js`, `lazyload.min.js`, `rellax.min.js`, `simplebar.min.js`);
   - PHP бэкенд формы (`mail.php`, `recaptchalib.php`, `phpmailer/`);
   - `robots.txt`, `sitemap.xml`.

   Новый JS, который должен попасть в бандл и пройти Babel, кладётся в `src/js/`. Скрипт конкретной страницы (или внешняя либа) — в `src/resources/` и подключается тегом `<script>` в HTML.

CSS: все партиалы `src/styles/_*.scss` импортируются в `src/styles/styles.scss`, который через таск `styles` собирается в единый `main.css`. При добавлении нового `_*.scss` обязательно добавить `@import` в `styles.scss` — иначе он не попадёт в сборку.

HTML: страницы лежат в `src/*.html`, переиспользуемые блоки — в `src/html/*.html` (header, footer, consultation, reviews, steps и т.д.) и вставляются через **gulp-file-include** синтаксисом `@@include('html/header.html', {})`. Менять шапку/подвал нужно в `src/html/`, а не в каждой странице.

Версионирование: `gulp-version-number` дописывает `?_v=...` к ссылкам на css/js в HTML для сброса кэша (пишет `src/version.json`).

Шрифты: `.ttf` из `src/fonts/` конвертируются в `.woff` и `.woff2`.
Изображения: png/jpg/jpeg/svg копируются таском `images`; webp/mp4/mov/ico/pdf — таском `imagesCopy`; svg из `src/images/svg/` собираются в `sprite.svg` (svg-sprite).

## Контент-страницы

`src/articles*.html` (~100 файлов) и `src/news*.html` — статьи блога и новости, по сути контент-шаблоны с одинаковой структурой. Каталог сувениров оперирует данными из `src/js/data/products.json` (поля: `category`, `name`, `price`, `article`, `image`).

## Дизайн и стилистика

Сайт оформлен в **светлом корпоративном стиле** на синем бренде. Палитра и брейкпоинты — в `src/styles/_variables.scss`.

- Основные цвета: `--color-primary` `#3E77FB` (фирменный синий), акцент `#6de2eb` (циан), заголовки — `--color-galaxy` `#081f5c` (тёмно-синий), текст — `#333`/`--color-dim-gray`. Градиент-акцент `linear-gradient(135deg, #3E77FB, #6de2eb)` используется в заголовках секций и подчёркиваниях.
- Хедер (`_header.scss`) — белый, футер (`_footer.scss`) — светло-голубой; оба импортируются на все страницы. Главная (`_hero`, `_work`, `_counter`, `_steps`, `_benefit`, `_contacts`) — светлые секции.
- **Логотип — две версии, не перепутать:** `logo_Lazur.svg` со слоганом в белом цвете — только под **тёмный** фон; `logo_Lazur_01.png` (синий) — под **светлый** фон. На светлых хедере/футере используется PNG.

## Важное

- `dist/` и `build/` — артефакты сборки, в `.gitignore`. Никогда не редактировать их напрямую — правки делаются в `src/` и пересобираются.
- `.env` содержит `GOOGLE_CLOUD_PROJECT` (не используется самой gulp-сборкой).

## Самообновление этого файла

Если в ходе работы появляется изменение, важное для понимания сборки или архитектуры проекта (новый таск в gulpfile, новый JS-конвейер, новая SCSS-подсистема, изменение конвенций именования, новая корневая зависимость и т.п.) — дописывай его сюда самостоятельно, без отдельного запроса.

Не нужно фиксировать здесь: обычные статьи/страницы контента (`articles*.html`, `news*.html` уже описаны обобщённо в разделе «Контент-страницы»), точечные правки вёрстки и стилей конкретной страницы, разовые правки текста — то есть всё, что не меняет общие правила сборки или архитектуры, которым должен следовать любой, кто работает с этим репозиторием.
