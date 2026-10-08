#!/usr/bin/env node
// Дымовой тест JS страниц в jsdom — только чтение, ничего не меняет (кроме сборки бандла, см. ниже).
//
//   node tools/js-smoke.js index.html books.html ...   — отдельные страницы
//   node tools/js-smoke.js --all                        — все src/*.html
//   node tools/js-smoke.js -v page.html                 — подробно: какие скрипты выполнены/пропущены
//   node tools/js-smoke.js --all --list > after.txt     — строка по каждой странице (сравнивать с прогоном «до»)
//
// «слайдеров запущено: 3/4» — из 4 блоков .swiper-wrapper Swiper инициализировал 3. Сравнивать с прогоном
// до правок: если число запущенных упало — убран нужный скрипт или сломана инициализация.
//
// Страница берётся из src/ с подставленными партиалами @@include. Локальные скрипты из src/resources
// и бандл dist/app.js встраиваются как настоящие <script> в исходном порядке (sync — на своём месте,
// defer — в конце документа), поэтому у них одна глобальная область, как в браузере: повторный
// const/let с тем же именем даёт SyntaxError, падение одного скрипта видно как ошибка.
// Внешние скрипты не грузятся: Swiper с CDN заменяется локальным swiper-bundle.min.js, остальное пропускается.
// После загрузки кликается каждая кнопка [data-open-form] — форма заявки должна открыться,
// а скрипт капчи — добавиться в страницу ровно один раз.
//
// Перед тестом бандл должен быть свежим: npx gulp scripts.
// jsdom в зависимости проекта не входит: поставить в любую папку (npm i jsdom@24) и указать её
// в JSDOM_DIR, например JSDOM_DIR=C:/tmp/jsd node tools/js-smoke.js --all. Нужен для чистки JS
// (docs/claude/js-cleanup.md).

const fs = require('fs')
const path = require('path')

let JSDOM, VirtualConsole
try {
    ({ JSDOM, VirtualConsole } = require(process.env.JSDOM_DIR ? path.join(process.env.JSDOM_DIR, 'node_modules', 'jsdom') : 'jsdom'))
} catch (e) {
    console.error('Не найден jsdom. Поставьте его в отдельную папку (npm i jsdom@24) и передайте её в JSDOM_DIR.')
    process.exit(2)
}

const ROOT = path.join(__dirname, '..')
const SRC = path.join(ROOT, 'src')
const APP = path.join(ROOT, 'dist', 'app.js')

const include = (html, depth = 0) => depth > 4 ? html : html.replace(/@@include\(\s*['"]([^'"]+)['"][^)]*\)/g,
    (_, p) => include(fs.readFileSync(path.join(SRC, p), 'utf8'), depth + 1))

// Что jsdom не умеет, а скрипты сайта используют
const POLYFILLS = `
window.matchMedia = window.matchMedia || function (q) { return { matches: false, media: q, addListener: function () {}, removeListener: function () {}, addEventListener: function () {}, removeEventListener: function () {} }; };
window.IntersectionObserver = window.IntersectionObserver || function () { this.observe = this.unobserve = this.disconnect = function () {}; };
window.ResizeObserver = window.ResizeObserver || function () { this.observe = this.unobserve = this.disconnect = function () {}; };
window.scrollTo = function () {};
window.HTMLMediaElement.prototype.play = function () { return Promise.resolve(); };
window.HTMLMediaElement.prototype.pause = function () {};
window.ym = window.ym || function () {};
`

// перед каждым скриптом — метка, чтобы в ошибке было видно, чей это код
const mark = (name) => '<script>window.__smokeScript = ' + JSON.stringify(name) + '</script>'

const escapeScript = (code) => code.replace(/<\/script/gi, '<\\/script')

function build(page, verbose) {
    let html = include(fs.readFileSync(path.join(SRC, page), 'utf8'))
    const log = []
    const deferred = []
    html = html.replace(/<script\b([^>]*)>([\s\S]*?)<\/script>/gi, (tag, attrs, body) => {
        const srcM = attrs.match(/\bsrc\s*=\s*["']([^"']+)["']/i)
        if (!srcM) {
            if (/application\/ld\+json/i.test(attrs)) return ''
            if (/mc\.yandex|metrika|gtag\(|googletagmanager/i.test(body)) { log.push('пропущен инлайн-счётчик'); return '' }
            return mark('инлайн') + '<script>' + body + '</script>'
        }
        const src = srcM[1].replace(/\?.*$/, '')
        let file = null
        if (/swiper/i.test(src) && /^https?:/i.test(src)) file = path.join(SRC, 'resources', 'swiper-bundle.min.js')
        else if (/^https?:|^\/\//i.test(src)) { log.push('пропущен внешний ' + src); return '' }
        else {
            const local = src.replace(/^\.?\//, '')
            file = local === 'app.js' ? APP : path.join(SRC, 'resources', local)
        }
        if (!fs.existsSync(file)) { log.push('НЕТ ФАЙЛА ' + src); return '' }
        log.push((/\bdefer\b/i.test(attrs) ? 'defer ' : /\basync\b/i.test(attrs) ? 'async ' : 'sync  ') + src)
        const inline = mark(src) + '<script data-src="' + src + '">' + escapeScript(fs.readFileSync(file, 'utf8')) + '</script>'
        if (/\b(defer|async)\b/i.test(attrs)) { deferred.push(inline); return '' }
        return inline
    })
    // замены функцией: в минифицированном коде бывают $& и $', которые строковая замена подставит как шаблон
    html = html.replace(/<head([^>]*)>/i, (m) => m + '<script>' + POLYFILLS + '</script>')
    html = /<\/body>/i.test(html) ? html.replace(/<\/body>/i, () => deferred.join('\n') + '</body>') : html + deferred.join('\n')
    if (verbose) log.forEach(l => console.log('    ' + l))
    return html
}

async function run(page, verbose) {
    const errors = []
    const vc = new VirtualConsole()
    vc.on('jsdomError', e => {
        const msg = (e.detail && e.detail.message) || e.message
        if (/Not implemented: (navigation|HTMLCanvasElement|window\.scrollTo)|Could not parse CSS/i.test(msg)) return
        const who = win ? win.__smokeScript : ''
        errors.push((who ? '[' + who + '] ' : '') + msg.split('\n')[0])
        if (verbose && e.detail && e.detail.stack) console.log(e.detail.stack.split('\n').slice(0, 5).join('\n'))
    })
    vc.on('error', e => errors.push(String(e)))
    let win = null
    const dom = new JSDOM(build(page, verbose), {
        runScripts: 'dangerously', virtualConsole: vc, pretendToBeVisual: true,
        beforeParse(w) { win = w },
        url: 'https://lazurprint.ru/' + page,
    })
    const w = dom.window
    const d = w.document
    // ждём load: часть скриптов инициализируется в обработчике DOMContentLoaded
    await new Promise((resolve) => {
        if (d.readyState === 'complete') return resolve()
        w.addEventListener('load', () => resolve())
        setTimeout(resolve, 3000)
    })
    const res = { page, errors, openers: 0, notOpened: 0, captcha: 0, hasForm: !!d.querySelector('.form__modal') }
    const modal = d.querySelector('.form__modal')
    const openers = [...d.querySelectorAll('[data-open-form]')]
    res.openers = openers.length
    for (const b of openers) {
        if (w.lazurForm) w.lazurForm.close()
        try { b.click() } catch (e) { errors.push('клик: ' + e.message) }
        if (!modal || !modal.classList.contains('modal--active')) res.notOpened++
    }
    res.captcha = d.querySelectorAll('script[src*="recaptcha/api.js"]').length
    // видео «Коротко о нас» (about.js)
    const play = d.querySelector('.play-1')
    const video = d.querySelector('.video-1')
    if (play && video) {
        play.click()
        if (!video.classList.contains('modal--active')) errors.push('видео .play-1 не открывает .video-1')
        const close = d.querySelector('.about__close')
        if (close) { close.dispatchEvent(new w.MouseEvent('click', { bubbles: true })); if (video.classList.contains('modal--active')) errors.push('.about__close не закрывает видео') }
    }
    // «Читать дальше» в отзывах (work.js)
    const review = d.querySelector('.reviews__item')
    const reviewBottom = review && review.querySelector('.reviews__item-bottom')
    if (reviewBottom) {
        const before = reviewBottom.classList.contains('reviews__item-bottom--active')
        review.click()
        if (reviewBottom.classList.contains('reviews__item-bottom--active') === before) errors.push('клик по отзыву не раскрывает текст')
    }
    // слайдеры: .swiper-wrapper, чей контейнер Swiper инициализировал (класс swiper-initialized)
    const wrappers = [...d.querySelectorAll('.swiper-wrapper')]
    res.sliders = wrappers.length
    res.slidersInit = wrappers.filter(wr => wr.parentElement && wr.parentElement.classList.contains('swiper-initialized')).length
    if (res.hasForm && !w.lazurForm) errors.push('нет window.lazurForm — app.js не выполнился?')
    w.close()
    return res
}

const args = process.argv.slice(2)
const verbose = args.includes('-v')
const list = args.includes('--list') // печатать и успешные страницы (для сравнения прогонов до/после)
let pages = args.filter(a => !a.startsWith('-')).map(a => path.basename(a))
if (args.includes('--all')) pages = fs.readdirSync(SRC).filter(f => f.endsWith('.html')).sort()
if (!pages.length) { console.log('Укажите страницы или --all'); process.exit(1) }
if (!fs.existsSync(APP)) { console.error('Нет dist/app.js — сначала npx gulp scripts'); process.exit(2) }

;(async () => {
let bad = 0
for (const page of pages) {
    if (verbose) console.log(page)
    let r
    try { r = await run(page, verbose) } catch (e) { r = { page, errors: ['тест упал: ' + e.message], openers: 0, notOpened: 0, captcha: 0, hasForm: false } }
    const problems = [...r.errors]
    if (r.notOpened) problems.push(`кнопок не открыли форму: ${r.notOpened} из ${r.openers}`)
    if (r.openers && r.captcha !== 1) problems.push(`скриптов капчи после открытия: ${r.captcha}`)
    if (problems.length) {
        bad++
        console.log(`FAIL ${page}`)
        problems.forEach(p => console.log('     ' + p))
    } else if (verbose || list || pages.length <= 30) {
        console.log(`ok   ${page}  (кнопок формы: ${r.openers}; слайдеров запущено: ${r.slidersInit}/${r.sliders})`)
    }
}
console.log(`\nСтраниц: ${pages.length}, с проблемами: ${bad}`)
process.exit(bad ? 1 : 0)
})()
