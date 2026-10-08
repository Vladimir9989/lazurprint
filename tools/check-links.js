#!/usr/bin/env node
// Проверка битых ссылок, картинок и скриптов в src/*.html — без сборки и без dev-сервера.
//
//   node tools/check-links.js                       — все страницы + партиалы + url() в стилях
//   node tools/check-links.js articles123.html ...  — только указанные страницы (и их партиалы)
//   npm run check                                   — то же, что без аргументов
//
// Пути на страницах — от корня сайта (images/..., main.css, swiper-bundle.min.js), поэтому
// каждая ссылка сопоставляется с исходником в src/: images/** → src/images/**, страницы → src/*.html,
// fonts/*.woff(2) → src/fonts/*.ttf, остальное — src/resources/**. Регистр букв сверяется точно:
// Windows его не различает, а хостинг (Linux) — да, «Photo.JPG» вместо «photo.jpg» там битая картинка.
// Партиалы (@@include) проверяются один раз, а не на каждой странице. Код выхода 1, если есть ошибки.

const fs = require('fs')
const path = require('path')

const ROOT = path.join(__dirname, '..')
const SRC = path.join(ROOT, 'src')
const SITE = /^https?:\/\/(www\.)?lazurprint\.ru(\/|$)/i
// файлы, которые появляются только при сборке
const GENERATED = new Set(['main.css', 'app.js', 'sitemap.xml'])

// --- проверка существования с точным регистром (кэш листингов папок) ---
const dirCache = new Map()
const listDir = (dir) => {
    if (!dirCache.has(dir)) {
        let names = null
        try { names = fs.readdirSync(dir) } catch (e) { /* нет папки */ }
        dirCache.set(dir, names)
    }
    return dirCache.get(dir)
}
// 'ok' | 'missing' | 'case:<правильное имя>'
const existsExact = (abs) => {
    const rel = path.relative(ROOT, abs).split(path.sep)
    let cur = ROOT
    for (const part of rel) {
        const names = listDir(cur)
        if (!names) return 'missing'
        if (!names.includes(part)) {
            const fix = names.find(n => n.toLowerCase() === part.toLowerCase())
            return fix ? `case:${path.relative(SRC, path.join(cur, fix)).split(path.sep).join('/')}` : 'missing'
        }
        cur = path.join(cur, part)
    }
    return 'ok'
}

// --- путь сайта → исходник в src/ ---
const resolveSitePath = (p) => {
    if (GENERATED.has(p)) return { ok: true }
    if (p === 'images/svg/sprite.svg') return { abs: path.join(SRC, 'images/svg') }
    const font = p.match(/^fonts\/(.+)\.woff2?$/)
    if (font) return { abs: path.join(SRC, 'fonts', font[1] + '.ttf') }
    if (p.startsWith('images/')) return { abs: path.join(SRC, p) }
    if (!p.includes('/') && p.endsWith('.html')) return { abs: path.join(SRC, p) }
    return { abs: path.join(SRC, 'resources', p), alt: path.join(SRC, p) }
}

const SKIP = /^(mailto:|tel:|javascript:|data:|sms:|viber:|whatsapp:|skype:|#$)/i
const TEMPLATE = /\$\{|\{\{|@@/

// возвращает null (всё хорошо) или текст проблемы
const checkUrl = (raw) => {
    let url = raw.trim()
    if (!url || SKIP.test(url) || TEMPLATE.test(url)) return null
    if (SITE.test(url)) url = url.replace(SITE, '') || 'index.html'
    else if (/^[a-z][a-z0-9+.-]*:|^\/\//i.test(url)) return null // внешний сайт
    if (url.startsWith('#')) return null // якоря проверяются отдельно
    url = url.split('#')[0].split('?')[0]
    if (!url) return null
    try { url = decodeURI(url) } catch (e) { /* оставляем как есть */ }
    // страницы и main.css лежат в корне сайта: браузер отбрасывает лишние ../ выше корня
    url = path.posix.normalize(url.replace(/^\.?\//, '')).replace(/^(\.\.\/)+/, '')
    if (/^(www\.|[a-z0-9-]+\.(com|ru|рф|net|org|be)\/)/i.test(url)) return 'внешний адрес без https:// — браузер примет его за файл на нашем сайте'
    if (url.endsWith('/') || url === '.') return null // папка (например admin/) — не проверяем
    const r = resolveSitePath(url)
    if (r.ok) return null
    let st = existsExact(r.abs)
    if (st === 'missing' && r.alt) st = existsExact(r.alt)
    if (st === 'ok') return null
    if (st.startsWith('case:')) return `регистр букв не совпадает, на диске: ${st.slice(5)} (на хостинге будет битым)`
    // тяжёлые видео не хранятся в git (src/.gitignore) и часто заливаются на хостинг вручную
    if (/\.(mp4|mov|avi|mkv)$/i.test(url)) return { warn: 'видео нет локально — проверить, залито ли на хостинг вручную' }
    return 'файл не найден'
}

const lineOf = (text, idx) => text.slice(0, idx).split('\n').length

// ссылки из HTML: src/href/poster/data-*, srcset, style="...url(...)"
const ATTR = /\s(src|href|poster|data-src|data-bg|data-background|data-href|data-image|data-video|data-poster|content)\s*=\s*(["'])(.*?)\2/gis
const SRCSET = /\s(srcset|data-srcset)\s*=\s*(["'])(.*?)\2/gis
const CSSURL = /url\(\s*(["']?)([^"')]+)\1\s*\)/gi

const collectHtml = (text) => {
    const out = []
    let m
    while ((m = ATTR.exec(text))) {
        // content="..." — только og:image и подобные адреса нашего сайта
        if (m[1].toLowerCase() === 'content' && !SITE.test(m[3])) continue
        out.push({ url: m[3], idx: m.index })
    }
    while ((m = SRCSET.exec(text))) {
        for (const part of m[3].split(',')) {
            const u = part.trim().split(/\s+/)[0]
            if (u) out.push({ url: u, idx: m.index })
        }
    }
    while ((m = CSSURL.exec(text))) out.push({ url: m[2], idx: m.index })
    return out
}

const INCLUDE = /@@include\(\s*(["'])(.+?)\1[^)]*\)/g

// --- основной проход ---
const problems = new Map() // файл → [{line, url, msg, warn}]
// msg — строка (ошибка) или { warn: '...' } (предупреждение, на код выхода не влияет)
const add = (file, line, url, msg) => {
    if (!problems.has(file)) problems.set(file, [])
    const warn = typeof msg === 'object'
    problems.get(file).push({ line, url, msg: warn ? msg.warn : msg, warn })
}

const partialsSeen = new Set()
const canonicalInBody = []
const expandCache = new Map()

// полный текст страницы со вставленными партиалами (нужен для проверки якорей)
const expand = (rel, depth = 0) => {
    if (expandCache.has(rel)) return expandCache.get(rel)
    const abs = path.join(SRC, rel)
    if (depth > 10 || !fs.existsSync(abs)) return ''
    const text = stripComments(fs.readFileSync(abs, 'utf8')).replace(INCLUDE, (_, q, inc) => expand(inc, depth + 1))
    expandCache.set(rel, text)
    return text
}

// закомментированная разметка на сайте не видна — заменяем пробелами, сохраняя переносы (номера строк)
const stripComments = (s) => s.replace(/<!--[\s\S]*?-->/g, (c) => c.replace(/[^\n]/g, ' '))

const checkFile = (rel) => {
    const abs = path.join(SRC, rel)
    const text = stripComments(fs.readFileSync(abs, 'utf8'))

    // партиалы: существуют ли, и проверить каждый один раз
    let m
    while ((m = INCLUDE.exec(text))) {
        const inc = m[2]
        if (existsExact(path.join(SRC, inc)) !== 'ok') {
            add(rel, lineOf(text, m.index), inc, 'партиал @@include не найден')
        } else if (!partialsSeen.has(inc)) {
            partialsSeen.add(inc)
            checkFile(inc)
        }
    }

    for (const { url, idx } of collectHtml(text.replace(INCLUDE, (s) => ' '.repeat(s.length)))) {
        const msg = checkUrl(url)
        if (msg) add(rel, lineOf(text, idx), url, msg)
    }

    // canonical должен указывать на саму страницу и стоять в <head> (в <body> поисковики его игнорируют)
    if (!rel.includes('/')) {
        const CANON = /<link\s+rel=["']canonical["']\s+href=["']([^"']*)["']/gi
        const headEnd = text.search(/<\/head>/i)
        const own = rel === 'index.html' ? ['', 'index.html'] : [rel]
        while ((m = CANON.exec(text))) {
            // абсолютный адрес нашего сайта или путь от корня → имя страницы
            const target = m[1].replace(SITE, '').replace(/^\.?\//, '').split(/[?#]/)[0]
            if (!own.includes(target)) add(rel, lineOf(text, m.index), m[1], `canonical указывает не на эту страницу (ожидается https://lazurprint.ru/${own[0]})`)
            if (headEnd !== -1 && m.index > headEnd) canonicalInBody.push(rel)
        }
    }

    // якоря #id внутри страницы (только для самих страниц, не партиалов)
    if (!rel.includes('/')) {
        const full = expand(rel)
        const ids = new Set()
        const ID = /\s(?:id|name)\s*=\s*(["'])(.*?)\1/gi
        while ((m = ID.exec(full))) ids.add(m[2])
        // ссылки с role="button" — кнопки, которые обрабатывает JS (например, открытие формы), якорь им не нужен
        const HASH = /<a\b([^>]*?)\shref\s*=\s*(["'])#([^"']+)\2([^>]*)>/gi
        while ((m = HASH.exec(text))) {
            if (/role\s*=\s*["']button["']/i.test(m[1] + m[4])) continue
            m[2] = m[3]
            if (!ids.has(m[2])) add(rel, lineOf(text, m.index), '#' + m[2], { warn: 'якорь никуда не ведёт: нет элемента с таким id (если кнопку не обрабатывает JS — клик ничего не делает)' })
        }
    }
}

const args = process.argv.slice(2)
const pages = args.length
    ? args.map(a => path.basename(a))
    : fs.readdirSync(SRC).filter(f => f.endsWith('.html')).sort()

for (const page of pages) {
    if (!fs.existsSync(path.join(SRC, page))) { add(page, 0, page, 'страница не найдена в src/'); continue }
    checkFile(page)
}

// url() в стилях: main.css лежит в корне сайта, так что пути — тоже от корня
if (!args.length) {
    const walk = (dir) => fs.readdirSync(dir, { withFileTypes: true }).flatMap(d =>
        d.isDirectory() ? walk(path.join(dir, d.name)) : d.name.endsWith('.scss') ? [path.join(dir, d.name)] : [])
    for (const abs of walk(path.join(SRC, 'styles'))) {
        const rel = path.relative(SRC, abs).split(path.sep).join('/')
        const text = fs.readFileSync(abs, 'utf8')
        let m
        while ((m = CSSURL.exec(text))) {
            if (m[2].includes('#{')) continue // интерполяция Sass
            const msg = checkUrl(m[2])
            if (msg) add(rel, lineOf(text, m.index), m[2], msg)
        }
    }
}

// --- отчёт ---
let errors = 0
let warnings = 0
for (const [file, list] of [...problems].sort((a, b) => a[0].localeCompare(b[0]))) {
    console.log(`\n${file}`)
    for (const p of list) {
        console.log(`  ${p.warn ? '[предупр.] ' : ''}${p.line ? 'стр. ' + p.line + ': ' : ''}${p.url} — ${p.msg}`)
        p.warn ? warnings++ : errors++
    }
}
if (canonicalInBody.length) {
    const list = canonicalInBody.length > 5 ? canonicalInBody.slice(0, 5).join(', ') + ', …' : canonicalInBody.join(', ')
    console.log(`\n[предупр.] canonical стоит в <body>, а не в <head> (поисковики его там не учитывают): ${canonicalInBody.length} стр. — ${list}`)
}
const scope = args.length ? `${pages.length} стр.` : `${pages.length} стр., ${partialsSeen.size} партиалов и стили`
console.log(`\n${errors ? `Ошибок: ${errors}` : 'Битых ссылок не найдено'}, предупреждений: ${warnings} (${scope})`)
process.exitCode = errors ? 1 : 0
