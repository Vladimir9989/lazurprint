#!/usr/bin/env node
// Приводит подключение скриптов страниц src/*.html к единому шаблону (чистка JS, docs/claude/js-cleanup.md).
//
//   node tools/js-normalize.js --dry page.html ...   — только показать, что изменится
//   node tools/js-normalize.js page.html ...         — записать
//   --wrap-inline   инлайн-скрипты с new Swiper(...) обернуть в DOMContentLoaded (иначе страница пропускается:
//                   Swiper переезжает в defer и до DOMContentLoaded ещё не загружен)
//
// Шаблон в <head>, всё defer, пути относительные, без ?_v= (его добавляет сборка):
//   inputmask → just-validate → swiper-bundle → swiper-JS → about → work → map → постраничные (в прежнем порядке) → app.js
// Общий скрипт остаётся, только если на собранной странице (с партиалами) есть его блоки:
//   inputmask/just-validate — форма #form; swiper-JS — .steps__swiper/.benefit__right-cnt/.team-right__swiper;
//   about — .play-1; work — .reviews__list/.reviews__item; map — #officesMapFrame;
//   swiper-bundle — если остался хоть один его потребитель (скрипт или инлайн с new Swiper) и на странице есть .swiper-wrapper.
// Блоки есть, а скрипта не было — НЕ добавляется (кроме inputmask/just-validate), только пишется в отчёт.
// CSS Swiper: нужен — ссылка на локальный swiper-bundle.min.css; не нужен и нет классов swiper* — ссылка убирается.
// Внешние скрипты (CDN кроме Swiper, счётчики, виджеты) и инлайны не трогаются (кроме --wrap-inline).
// jsdom — как у tools/js-smoke.js (JSDOM_DIR).

const fs = require('fs')
const path = require('path')

let JSDOM
try {
    ({ JSDOM } = require(process.env.JSDOM_DIR ? path.join(process.env.JSDOM_DIR, 'node_modules', 'jsdom') : 'jsdom'))
} catch (e) {
    console.error('Не найден jsdom — см. tools/js-smoke.js (JSDOM_DIR).')
    process.exit(2)
}

const SRC = path.join(__dirname, '..', 'src')
const include = (html, depth = 0) => depth > 4 ? html : html.replace(/@@include\(\s*['"]([^'"]+)['"][^)]*\)/g,
    (_, p) => include(fs.readFileSync(path.join(SRC, p), 'utf8'), depth + 1))

const ORDER = ['inputmask.min.js', 'just-validate.min.js', 'swiper-bundle.min.js', 'swiper-JS.js', 'about.js', 'work.js', 'map.js']
const BLOCKS = {
    'inputmask.min.js': '#form',
    'just-validate.min.js': '#form',
    'swiper-JS.js': '.steps__swiper, .benefit__right-cnt, .team-right__swiper',
    'about.js': '.play-1',
    'work.js': '.reviews__list, .reviews__item',
    'map.js': '#officesMapFrame',
}
const ALWAYS_ADD = ['inputmask.min.js', 'just-validate.min.js']
const usesSwiper = (code) => /new\s+Swiper\s*\(/.test(code)
// new Swiper вызывается сразу, а не внутри обработчика DOMContentLoaded, объявленного выше по тексту
const needsWrap = (code) => {
    if (!usesSwiper(code)) return false
    const dcl = code.search(/DOMContentLoaded/)
    return dcl < 0 || dcl > code.search(/new\s+Swiper\s*\(/)
}

function normalize(page, opts) {
    const file = path.join(SRC, page)
    const raw = fs.readFileSync(file, 'utf8')
    const eol = raw.includes('\r\n') ? '\r\n' : '\n'
    const doc = new JSDOM(include(raw)).window.document
    const report = []

    // HTML-комментарии не трогаем: закомментированные <script> — не подключения
    const comments = []
    raw.replace(/<!--[\s\S]*?-->/g, (m, off) => { comments.push([off, off + m.length]); return m })
    const inComment = (i) => comments.some(([a, b]) => i >= a && i < b)
    const headEnd = raw.search(/<\/head>/i)

    const tags = []
    const re = /^([ \t]*)<script\b([^>]*)>([\s\S]*?)<\/script>[ \t]*(\r?\n)?/gim
    let m
    while ((m = re.exec(raw))) {
        if (inComment(m.index)) continue
        const attrs = m[2]
        const srcM = attrs.match(/\bsrc\s*=\s*["']([^"']+)["']/i)
        tags.push({
            start: m.index, end: m.index + m[0].length, text: m[0], attrs, body: m[3],
            src: srcM ? srcM[1] : null, inHead: m.index < headEnd,
        })
    }

    const managed = []   // наши скрипты: убираем со старых мест, ставим блоком
    const pageLocal = [] // постраничные локальные
    for (const t of tags) {
        if (!t.src) continue
        const clean = t.src.replace(/\?.*$/, '').replace(/^\.?\//, '')
        let name = null
        if (/swiper-bundle(\.min)?\.js$/.test(clean)) name = 'swiper-bundle.min.js'
        else if (/^https?:|^\/\//.test(clean)) continue
        else name = clean
        t.name = name
        if (ORDER.includes(name) || name === 'app.js') managed.push(t)
        else pageLocal.push(t)
    }
    for (const t of pageLocal) {
        if (!fs.existsSync(path.join(SRC, 'resources', t.name))) report.push('нет файла ' + t.name + ' — оставлен как есть')
    }
    const movable = pageLocal.filter(t => fs.existsSync(path.join(SRC, 'resources', t.name)))

    const present = new Set(managed.map(t => t.name))
    // Служебные страницы без шапки и формы (thanks.html, файлы подтверждения google*/yandex_*) — app.js им не нужен
    if (!present.has('app.js') && !doc.querySelector('.burger, #form')) {
        return { page, changed: false, report: ['нет app.js, шапки и формы — страница не трогается'], scripts: [] }
    }
    const keep = new Set()
    for (const name of ORDER) {
        if (name === 'swiper-bundle.min.js') continue
        const has = !!doc.querySelector(BLOCKS[name])
        if (has && (present.has(name) || ALWAYS_ADD.includes(name))) {
            keep.add(name)
            if (!present.has(name)) report.push('добавлен ' + name)
        } else if (has && !present.has(name)) {
            report.push(`блоки для ${name} есть, а скрипта не было — не добавлен, решить вручную`)
        } else if (!has && present.has(name)) {
            report.push(`убран ${name} — его блоков нет`)
        }
    }

    // Swiper нужен, если остался потребитель
    const inlineSwiper = tags.filter(t => !t.src && usesSwiper(t.body))
    const consumers = []
    if (keep.has('swiper-JS.js')) consumers.push('swiper-JS.js')
    if (keep.has('work.js') && doc.querySelector('.reviews__list')) consumers.push('work.js')
    for (const t of movable) if (usesSwiper(fs.readFileSync(path.join(SRC, 'resources', t.name), 'utf8'))) consumers.push(t.name)
    if (inlineSwiper.length) consumers.push('инлайн')
    const hasSlider = !!doc.querySelector('.swiper-wrapper')
    if (consumers.length && hasSlider) keep.add('swiper-bundle.min.js')
    if (present.has('swiper-bundle.min.js') && !keep.has('swiper-bundle.min.js')) {
        report.push('убран Swiper — ' + (hasSlider ? 'нет кода, который его использует' : 'на странице нет слайдеров'))
    }
    if (!present.has('swiper-bundle.min.js') && keep.has('swiper-bundle.min.js')) report.push('добавлен swiper-bundle.min.js (его использует ' + consumers.join(', ') + ')')

    if (inlineSwiper.some(t => needsWrap(t.body)) && keep.has('swiper-bundle.min.js') && !opts.wrapInline) {
        return { page, skipped: 'инлайн-скрипт с new Swiper — запустить с --wrap-inline', report }
    }

    // Новый блок
    const indent = '    '
    const list = []
    for (const name of ORDER) if (keep.has(name)) list.push(name)
    for (const t of movable) if (!list.includes(t.name)) list.push(t.name)
    list.push('app.js')
    const block = list.map(n => `${indent}<script defer src="${n}"></script>`).join(eol) + eol

    // Сборка: убираем старые теги, вставляем блок на место первого убранного в <head>
    const removed = [...managed, ...movable].sort((a, b) => a.start - b.start)
    let insertAt = removed.find(t => t.inHead)
    insertAt = insertAt ? insertAt.start : null
    let out = ''
    let pos = 0
    let inserted = false
    if (insertAt === null) {
        const css = raw.search(/^[ \t]*<link[^>]*href=["']main\.css/im)
        insertAt = css >= 0 && css < headEnd ? css : raw.lastIndexOf('\n', headEnd) + 1
    }
    for (const t of removed) {
        if (!inserted && insertAt <= t.start) { out += raw.slice(pos, insertAt) + block; pos = insertAt; inserted = true }
        out += raw.slice(pos, t.start)
        pos = t.end
    }
    if (!inserted) { out += raw.slice(pos, insertAt) + block; pos = insertAt }
    out += raw.slice(pos)

    // Инлайны с Swiper — в DOMContentLoaded (defer-скрипты выполняются раньше этого события)
    if (opts.wrapInline && keep.has('swiper-bundle.min.js')) {
        out = out.replace(/(<script\b(?![^>]*\bsrc=)[^>]*>)([\s\S]*?)(<\/script>)/gi, (all, open, body, close) => {
            if (!needsWrap(body)) return all
            report.push('инлайн с new Swiper обёрнут в DOMContentLoaded')
            const openClean = open.replace(/\s+defer\b/i, '')
            return openClean + eol + indent + indent + "document.addEventListener('DOMContentLoaded', function () {" + body.replace(/\s+$/, '') + eol + indent + indent + '});' + eol + indent + close
        })
    }

    // CSS Swiper
    const cssRe = /^[ \t]*<link\b[^>]*href=["'][^"']*swiper-bundle\.min\.css[^"']*["'][^>]*>[ \t]*\r?\n/gim
    const cssLinks = out.match(cssRe) || []
    if (keep.has('swiper-bundle.min.js')) {
        if (cssLinks.length) {
            let first = true
            out = out.replace(cssRe, () => { if (!first) return ''; first = false; return `${indent}<link rel="stylesheet" href="swiper-bundle.min.css">${eol}` })
        } else {
            out = out.replace(/^([ \t]*<link[^>]*href=["']main\.css)/im, (s) => `${indent}<link rel="stylesheet" href="swiper-bundle.min.css">${eol}${s}`)
            report.push('добавлен swiper-bundle.min.css')
        }
    } else if (cssLinks.length && !doc.querySelector('[class*="swiper"]')) {
        out = out.replace(cssRe, '')
        report.push('убран CSS Swiper')
    }

    const changed = out !== raw
    if (changed && !opts.dry) fs.writeFileSync(file, out)
    return { page, changed, report, scripts: list }
}

const args = process.argv.slice(2)
const opts = { dry: args.includes('--dry'), wrapInline: args.includes('--wrap-inline') }
const pages = args.filter(a => !a.startsWith('--')).map(a => path.basename(a))
if (!pages.length) { console.log('Укажите страницы'); process.exit(1) }
let skipped = 0
for (const p of pages) {
    const r = normalize(p, opts)
    if (r.skipped) { skipped++; console.log(`ПРОПУЩЕНА ${p}: ${r.skipped}`); r.report.forEach(l => console.log('    ' + l)); continue }
    console.log(`${r.changed ? (opts.dry ? 'изменится' : 'изменена ') : 'без изменений'} ${p}: ${r.scripts.join(' → ')}`)
    r.report.forEach(l => console.log('    ' + l))
}
if (skipped) process.exitCode = 1
