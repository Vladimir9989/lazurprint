#!/usr/bin/env node
// Заготовка новой статьи или новости со всей «обвязкой», которую раньше дописывали руками.
//
//   node tools/new-page.js article "Заголовок статьи" --prefix zont [опции]
//   node tools/new-page.js news    "Заголовок новости" --prefix bmg [опции]
//   npm run new-page -- article "Заголовок" --prefix xyz
//
// Опции:
//   --prefix xyz     уникальный CSS-префикс материала (обязательно; проверяется, что не занят)
//   --desc "..."     meta description / og:description / описание карточки (иначе TODO)
//   --short "..."    короткое название для хлебных крошек (иначе — заголовок)
//   --slug name      имя SCSS-файла без _ и .scss (иначе <prefix>-article / <prefix>-feature)
//   --date YYYY-MM-DD  дата публикации (иначе сегодня)
//   --dry-run        только показать, что будет создано, ничего не писать
//
// Что делает:
//   1. src/articlesN.html или src/newsN.html (следующий свободный номер): Метрика, title/description,
//      og/twitter, canonical В <head>, хлебные крошки, h1 + дата, hero-заготовка, плейсхолдер фото,
//      футер, JSON-LD (BlogPosting / NewsArticle).
//   2. src/styles/articles/_<slug>.scss — шапка-комментарий (материал, префикс, палитра) + база:
//      переменные палитры, hero с «блобами», плейсхолдер фото. Палитру и оформление дальше — вручную.
//   3. @import в src/styles/styles.scss (после последнего articles/...).
//   4. Карточка первой в списке articles.html / news.html; для новости — ещё и запись NewsArticle
//      в JSON-LD news.html.
// Пока нет своих фото, карточка и og:image ссылаются на общий images/img/articles/file.jpg —
// битых картинок не будет. Все места, которые нужно дописать, помечены TODO.

const fs = require('fs')
const path = require('path')

const SRC = path.join(__dirname, '..', 'src')
const SITE = 'https://lazurprint.ru'
const STUB_IMG = 'images/img/articles/file.jpg'
const MONTHS = ['января', 'февраля', 'марта', 'апреля', 'мая', 'июня', 'июля', 'августа', 'сентября', 'октября', 'ноября', 'декабря']

// --- аргументы ---
const argv = process.argv.slice(2)
const opts = {}
const pos = []
for (let i = 0; i < argv.length; i++) {
    if (argv[i] === '--dry-run') opts.dryRun = true
    else if (argv[i].startsWith('--')) opts[argv[i].slice(2)] = argv[++i]
    else pos.push(argv[i])
}
const [type, title] = pos
const fail = (msg) => { console.error(`Ошибка: ${msg}`); process.exit(1) }
if (!['article', 'news'].includes(type) || !title) {
    fail('использование: node tools/new-page.js article|news "Заголовок" --prefix xyz [--desc ...] [--short ...] [--slug ...] [--date YYYY-MM-DD] [--dry-run]')
}
const prefix = (opts.prefix || '').replace(/^\./, '').replace(/-$/, '')
if (!/^[a-z][a-z0-9]*(-[a-z0-9]+)*$/.test(prefix)) fail('--prefix обязателен: латиница в нижнем регистре, например zont или expo')

const isArticle = type === 'article'
const date = opts.date || new Date().toISOString().slice(0, 10)
if (!/^\d{4}-\d{2}-\d{2}$/.test(date)) fail('--date в формате YYYY-MM-DD')
const [yy, mm, dd] = date.split('-').map(Number)
const dateRu = `${dd} ${MONTHS[mm - 1]} ${yy}`
const desc = opts.desc || 'TODO: описание материала (150–160 символов) — для поисковиков, соцсетей и карточки в списке.'
const short = opts.short || title
const slug = opts.slug || `${prefix}-${isArticle ? 'article' : 'feature'}`

// --- проверки ---
const stylesDir = path.join(SRC, 'styles', 'articles')
const scssFile = path.join(stylesDir, `_${slug}.scss`)
if (fs.existsSync(scssFile)) fail(`стиль ${path.relative(SRC, scssFile)} уже существует — выбери другой --slug`)
const taken = fs.readdirSync(stylesDir).filter(f => f.endsWith('.scss')).filter(f => {
    const s = fs.readFileSync(path.join(stylesDir, f), 'utf8')
    return new RegExp(`(^|[\\s,{])\\.${prefix}(-|[\\s{,:.])`, 'm').test(s)
})
if (taken.length) fail(`префикс .${prefix} уже используется в ${taken.join(', ')} — придумай другой`)

const base = isArticle ? 'articles' : 'news'
const nums = fs.readdirSync(SRC).map(f => f.match(new RegExp(`^${base}(\\d+)\\.html$`))).filter(Boolean).map(m => +m[1])
const num = Math.max(0, ...nums) + 1
const page = `${base}${num}.html`
const pageUrl = `${SITE}/${page}`
const listPage = isArticle ? 'articles.html' : 'news.html'
const listLabel = isArticle ? 'Статьи' : 'Новости'
const fullTitle = `${title} | Типография Лазурь`

const esc = (s) => s.replace(/&(?![a-z#0-9]+;)/gi, '&amp;').replace(/</g, '&lt;').replace(/>/g, '&gt;').replace(/"/g, '&quot;')
const eolOf = (s) => (s.includes('\r\n') ? '\r\n' : '\n')
const withEol = (s, eol) => s.replace(/\r?\n/g, eol)

// --- 1. страница ---
const jsonLd = JSON.stringify({
    '@context': 'https://schema.org',
    '@type': isArticle ? 'BlogPosting' : 'NewsArticle',
    mainEntityOfPage: { '@type': 'WebPage', '@id': pageUrl },
    headline: title,
    description: desc,
    image: [`${SITE}/${STUB_IMG}`],
    datePublished: date,
    dateModified: date,
    author: { '@type': 'Organization', name: 'Типография «Лазурь»' },
    publisher: {
        '@type': 'Organization',
        name: 'Типография «Лазурь» (ООО ИПК «Лазурь»)',
        logo: { '@type': 'ImageObject', url: `${SITE}/images/img/logo/logo_Lazur.svg` },
    },
    ...(isArticle ? { articleSection: 'Блог о полиграфии' } : {}),
    inLanguage: 'ru',
    isAccessibleForFree: true,
}, null, 4).replace(/\n/g, '\n    ')

const pageHtml = `<!DOCTYPE html>
<html lang="ru">

<head>
    <!-- Yandex.Metrika counter -->
    <script type="text/javascript">
        (function (m, e, t, r, i, k, a) {
            m[i] = m[i] || function () { (m[i].a = m[i].a || []).push(arguments) };
            m[i].l = 1 * new Date();
            for (var j = 0; j < document.scripts.length; j++) { if (document.scripts[j].src === r) { return; } }
            k = e.createElement(t), a = e.getElementsByTagName(t)[0], k.async = 1, k.src = r, a.parentNode.insertBefore(k, a)
        })
            (window, document, "script", "https://mc.yandex.ru/metrika/tag.js", "ym");

        ym(95134814, "init", {
            clickmap: true,
            trackLinks: true,
            accurateTrackBounce: true,
            webvisor: true
        });
    </script>
    <noscript>
        <div><img src="https://mc.yandex.ru/watch/95134814" style="position:absolute; left:-9999px;" alt="" /></div>
    </noscript>
    <!-- /Yandex.Metrika counter -->
    <meta charset="UTF-8">
    <meta name="viewport" content="width=device-width, initial-scale=1.0">
    <title>${esc(fullTitle)}</title>
    <meta name="description" content="${esc(desc)}">
    <meta property="og:type" content="article">
    <meta property="og:site_name" content="Типография Лазурь">
    <meta property="og:locale" content="ru_RU">
    <meta property="og:url" content="${pageUrl}">
    <meta property="og:title" content="${esc(fullTitle)}">
    <meta property="og:description" content="${esc(desc)}">
    <!-- TODO: og:image — заменить на главное фото материала, когда оно будет (лучше 1200×630) -->
    <meta property="og:image" content="${SITE}/${STUB_IMG}">
    <meta name="twitter:card" content="summary_large_image">
    <link rel="stylesheet" href="main.css">
    <link rel="icon" href="images/img/favicon.ico">
    <link rel="canonical" href="${pageUrl}">
    <!-- Порядок: inputmask → just-validate → [swiper-bundle.min.js, если есть слайдер; + swiper-bundle.min.css] → [свой скрипт из src/resources/] → app.js, всё defer -->
    <script defer src="inputmask.min.js"></script>
    <script defer src="just-validate.min.js"></script>
    <script defer src="app.js"></script>
</head>

<body>
    @@include('html/header.html', {})
    @@include('html/main-button.html', {})
    <section class="news ${prefix}-article">
        <div class="news__container container">
            <ol class="vacancy__nav-cnt">
                <li>
                    <a href="index.html" class="vacancy__nav-link">Главная </a>/
                </li>
                <li>
                    <a href="${listPage}" class="vacancy__nav-link">${listLabel} </a>/
                </li>
                <li>
                    <a href="${page}" class="vacancy__nav-link">${esc(short)}</a>
                </li>
            </ol>

            <h1 class="news__title">${esc(title)}</h1>
            <time class="card__date" datetime="${date}">${dateRu}</time>

            <!-- HERO -->
            <div class="${prefix}-hero">
                <span class="${prefix}-hero__blob ${prefix}-hero__blob--1" aria-hidden="true"></span>
                <span class="${prefix}-hero__blob ${prefix}-hero__blob--2" aria-hidden="true"></span>
                <div class="${prefix}-hero__text">
                    <span class="${prefix}-hero__eyebrow">TODO: рубрика</span>
                    <p class="${prefix}-hero__lead">TODO: лид — 2–3 предложения, о чём материал и чем полезен клиенту.</p>
                </div>
                <!-- TODO: заменить плейсхолдер на <figure><img src="images/img/${base === 'articles' ? 'articles' : 'news'}/${base}${num}-img-1.jpg" alt="..."></figure> -->
                <div class="${prefix}-placeholder ${prefix}-hero__media">
                    <span>Фото: TODO — что должно быть на главной иллюстрации</span>
                </div>
            </div>

            <!-- TODO: разделы материала (чип-навигация, карточки, таймлайн, цитаты — под контент) -->
            <div class="${prefix}-section">
                <h2 class="${prefix}-section__title">TODO: раздел</h2>
                <p class="${prefix}-section__text">TODO: текст раздела.</p>
            </div>
        </div>
    </section>
    @@include('html/footer.html', {})

    <script type="application/ld+json">
    ${jsonLd}
    </script>
</body>

</html>
`

// --- 2. стили ---
const scss = `/* ============================================================
   ${isArticle ? 'Статья' : 'Новость'} «${title}» (${page})
   Индивидуальный стиль материала. Префикс .${prefix}- чтобы не пересекаться
   с остальными оформлениями статей/новостей.
   Палитра — TODO: описать акцент и чем он отличается от соседних
   материалов (сводка занятых: grep -h -A1 "Префикс\\|Палитра" src/styles/articles/*.scss).
   ============================================================ */

.${prefix}-article {
    // TODO: палитра материала
    --${prefix}-ink: #1d2433;
    --${prefix}-accent: #6b4fd8;
    --${prefix}-accent2: #2fb8a6;
    --${prefix}-bg: #f6f4fb;
    --${prefix}-line: rgba(29, 36, 51, 0.14);
    --${prefix}-radius: 22px;
    --${prefix}-shadow-soft: 0 8px 22px rgba(29, 36, 51, 0.12);
    color: var(--color-night-rider);

    .news__title {
        font-size: clamp(28px, 3.6vw, 44px);
        line-height: 1.16;
        color: var(--${prefix}-ink);
    }
}

/* ---------- HERO ---------- */
.${prefix}-hero {
    position: relative;
    overflow: hidden;
    display: grid;
    grid-template-columns: 1.15fr 0.85fr;
    gap: 40px;
    align-items: center;
    margin: 26px 0 34px;
    padding: 40px;
    border-radius: 30px;
    border: 1px solid var(--${prefix}-line);
    background: var(--${prefix}-bg);

    @include lg {
        grid-template-columns: 1fr;
    }

    @include md {
        padding: 26px 20px;
        border-radius: 20px;
    }

    &__blob {
        position: absolute;
        border-radius: 50%;
        filter: blur(55px);
        pointer-events: none;
        opacity: 0.3;

        &--1 {
            width: 300px;
            height: 300px;
            top: -100px;
            right: -50px;
            background: var(--${prefix}-accent);
        }

        &--2 {
            width: 240px;
            height: 240px;
            bottom: -110px;
            left: -60px;
            background: var(--${prefix}-accent2);
        }
    }

    &__text,
    &__media {
        position: relative;
        z-index: 1;
    }

    &__eyebrow {
        display: inline-block;
        padding: 7px 16px;
        margin-bottom: 18px;
        border-radius: 50px;
        background: var(--color-white);
        box-shadow: var(--${prefix}-shadow-soft);
        color: var(--${prefix}-accent);
        font-weight: 700;
        font-size: 13px;
        text-transform: uppercase;
        letter-spacing: 0.04em;
    }

    &__lead {
        font-size: 18px;
        line-height: 1.6;
    }
}

/* ---------- Плейсхолдер фото (пока нет иллюстраций) ---------- */
.${prefix}-placeholder {
    display: flex;
    align-items: center;
    justify-content: center;
    min-height: 260px;
    padding: 24px;
    border: 2px dashed var(--${prefix}-line);
    border-radius: var(--${prefix}-radius);
    color: var(--${prefix}-ink);
    font-size: 15px;
    text-align: center;
    opacity: 0.75;
}

/* ---------- Разделы ---------- */
.${prefix}-section {
    margin-bottom: 40px;

    &__title {
        margin-bottom: 16px;
        font-size: clamp(22px, 2.6vw, 30px);
        color: var(--${prefix}-ink);
    }

    &__text {
        font-size: 17px;
        line-height: 1.7;
    }
}
`

// --- 3–4. правки существующих файлов ---
const edits = []

const stylesPath = path.join(SRC, 'styles', 'styles.scss')
{
    const s = fs.readFileSync(stylesPath, 'utf8')
    const eol = eolOf(s)
    const lines = s.split(/\r?\n/)
    let last = -1
    lines.forEach((l, i) => { if (/^@import ['"]articles\//.test(l.trim())) last = i })
    if (last === -1) fail('в styles.scss не найдено ни одного @import \'articles/...\'')
    lines.splice(last + 1, 0, `@import 'articles/${slug}';`)
    edits.push([stylesPath, lines.join(eol)])
}

const listPath = path.join(SRC, listPage)
{
    let s = fs.readFileSync(listPath, 'utf8')
    const eol = eolOf(s)
    const anchor = s.match(/<ul class="news__list">\r?\n/)
    if (!anchor) fail(`в ${listPage} не найден <ul class="news__list">`)
    const card = withEol(`                <li class="news__item card">
                    <a href="${page}" class="card__content">
                        <div class="card__img-cnt">
                            <!-- TODO: заменить заглушку на фото материала -->
                            <img src="${STUB_IMG}" alt="${esc(title)}" class="card__img"
                                style="object-position: center; object-fit: cover;">
                        </div>
                        <time class="card__date" datetime="${date}">${dateRu}</time>
                        <h2 class="card__title">${esc(title)}</h2>
                        <p class="card__desc">
                            ${esc(desc)}
                        </p>
                    </a>
                </li>
`, eol)
    const at = anchor.index + anchor[0].length
    s = s.slice(0, at) + card + s.slice(at)

    if (!isArticle) {
        const ld = s.match(/<script type="application\/ld\+json">\s*\[\r?\n/)
        if (!ld) fail('в news.html не найден JSON-LD список новостей')
        const entry = withEol(`            {
                "@context": "https://schema.org",
                "@type": "NewsArticle",
                "headline": ${JSON.stringify(fullTitle)},
                "url": "${pageUrl}",
                "image": {
                    "@type": "ImageObject",
                    "url": "${SITE}/${STUB_IMG}"
                },
                "datePublished": "${date}",
                "description": ${JSON.stringify(desc)},
                "author": {
                    "@type": "Organization",
                    "name": "ИПК Лазурь",
                    "url": "${SITE}"
                },
                "publisher": {
                    "@type": "Organization",
                    "name": "ИПК Лазурь",
                    "logo": {
                        "@type": "ImageObject",
                        "url": "${SITE}/images/img/logo/logo_Lazur.svg"
                    }
                },
                "mainEntityOfPage": {
                    "@type": "WebPage",
                    "@id": "${pageUrl}"
                }
            },
`, eol)
        const at2 = ld.index + ld[0].length
        s = s.slice(0, at2) + entry + s.slice(at2)
    }
    edits.push([listPath, s])
}

// --- запись ---
const rel = (p) => path.relative(path.join(SRC, '..'), p).split(path.sep).join('/')
const pagePath = path.join(SRC, page)
console.log(`${opts.dryRun ? '[dry-run] ' : ''}${isArticle ? 'Статья' : 'Новость'} ${page}, префикс .${prefix}-, дата ${dateRu}`)
console.log(`  создать:   ${rel(pagePath)}`)
console.log(`  создать:   ${rel(scssFile)}`)
for (const [p] of edits) console.log(`  дополнить: ${rel(p)}${p === listPath ? (isArticle ? ' (карточка)' : ' (карточка + JSON-LD)') : ' (@import)'}`)
if (opts.dryRun) process.exit(0)

const listEol = eolOf(fs.readFileSync(listPath, 'utf8'))
fs.writeFileSync(pagePath, withEol(pageHtml, listEol))
fs.writeFileSync(scssFile, withEol(scss, listEol))
for (const [p, content] of edits) fs.writeFileSync(p, content)

console.log(`\nГотово. Осталось (grep TODO по ${page} и _${slug}.scss):`)
console.log('  - текст, разделы и уникальное оформление (палитра — не повторять соседей)')
console.log('  - фото: картинки в images/img/' + (isArticle ? 'articles' : 'news') + `/${base}${num}-img-N.jpg, затем заменить заглушки в странице, og:image, JSON-LD и карточке ${listPage}`)
if (!opts.desc) console.log('  - описание (--desc не передан): meta description, og:description, карточка' + (isArticle ? '' : ', JSON-LD в news.html'))
console.log(`  - проверить: node tools/check-links.js ${page} ${listPage}`)
