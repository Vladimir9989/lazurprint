#!/usr/bin/env node
// Отчёт о подключении скриптов по страницам src/*.html — только чтение, ничего не меняет.
//
//   node tools/js-inventory.js                 — сводка по всему сайту
//   node tools/js-inventory.js books.html ...  — подробно по отдельным страницам
//
// Показывает: какие <script src> на скольких страницах и каким способом (sync/defer/async, head/body),
// дубли на одной странице, страницы с формой заявки без app.js (форму и ленивую капчу открывает он),
// оставшиеся статические recaptcha/api.js, файлы src/resources/*.js,
// которые нигде не подключены. Нужен для чистки подключения JS (docs/claude/js-cleanup.md):
// прогонять до и после каждой партии страниц и сравнивать.

const fs = require('fs')
const path = require('path')

const SRC = path.join(__dirname, '..', 'src')
const strip = (s) => s.replace(/<!--[\s\S]*?-->/g, '')
const SCRIPT = /<script\b([^>]*)>([\s\S]*?)<\/script>/gi
const partials = fs.readdirSync(path.join(SRC, 'html')).map(f => strip(fs.readFileSync(path.join(SRC, 'html', f), 'utf8'))).join('\n')

const scan = (page) => {
    const t = strip(fs.readFileSync(path.join(SRC, page), 'utf8'))
    const headEnd = t.search(/<\/head>/i)
    const scripts = []
    let inline = 0
    let m
    while ((m = SCRIPT.exec(t))) {
        const a = m[1]
        const srcM = a.match(/src\s*=\s*["']([^"']+)["']/i)
        if (!srcM) {
            if (!/application\/ld\+json/i.test(a) && m[2].trim()) inline++
            continue
        }
        const mode = /\basync\b/i.test(a) ? 'async' : /\bdefer\b/i.test(a) ? 'defer' : /type\s*=\s*["']module/i.test(a) ? 'module' : 'sync'
        scripts.push({ src: srcM[1].replace(/\?.*$/, '').replace(/^\.?\//, ''), mode, where: m.index < headEnd ? 'head' : 'body' })
    }
    const hasFooter = /@@include\(\s*['"]html\/footer\.html/.test(t)
    const hasApp = scripts.some(s => s.src === 'app.js')
    const staticCaptcha = scripts.some(s => /recaptcha\/api\.js/.test(s.src))
    return { page, scripts, inline, hasFooter, hasApp, staticCaptcha }
}

const args = process.argv.slice(2)
if (args.length) {
    for (const a of args) {
        const r = scan(path.basename(a))
        console.log(`\n${r.page}  (инлайн-скриптов без JSON-LD: ${r.inline}; подвал с формой: ${r.hasFooter ? 'да' : 'нет'}; app.js (форма + капча): ${r.hasApp ? 'да' : 'НЕТ'}${r.staticCaptcha ? '; статический recaptcha/api.js — убрать' : ''})`)
        r.scripts.forEach((s, i) => console.log(`  ${i + 1}. ${s.src}  [${s.mode}, ${s.where}]`))
    }
    process.exit(0)
}

const pages = fs.readdirSync(SRC).filter(f => f.endsWith('.html')).sort()
const rows = pages.map(scan)
const usage = {}
for (const r of rows) for (const s of r.scripts) {
    const u = (usage[s.src] = usage[s.src] || { count: 0, modes: {} })
    u.count++
    u.modes[`${s.mode}/${s.where}`] = (u.modes[`${s.mode}/${s.where}`] || 0) + 1
}
const total = rows.reduce((n, r) => n + r.scripts.length, 0)
console.log(`Страниц: ${rows.length} | <script src>: ${total} | инлайн-скриптов (без JSON-LD): ${rows.reduce((n, r) => n + r.inline, 0)}`)

console.log('\n== Скрипты по частоте ==')
for (const [src, u] of Object.entries(usage).sort((a, b) => b[1].count - a[1].count)) {
    console.log(`${String(u.count).padStart(4)}  ${src}  ${Object.entries(u.modes).map(([k, v]) => `${k}:${v}`).join(' ')}`)
}

console.log('\n== Дубли на одной странице ==')
let dups = 0
for (const r of rows) {
    const list = r.scripts.map(s => s.src)
    const d = [...new Set(list.filter((s, i) => list.indexOf(s) !== i))]
    if (d.length) { dups++; console.log(`  ${r.page}: ${d.join(', ')}`) }
}
if (!dups) console.log('  нет')

const noApp = rows.filter(r => r.hasFooter && !r.hasApp)
console.log(`\n== Форма заявки (подвал) есть, а app.js нет — форма не откроется: ${noApp.length} стр. ==`)
if (noApp.length) console.log('  ' + noApp.map(r => r.page).join(' '))

const staticCaptcha = rows.filter(r => r.staticCaptcha)
console.log(`\n== Статический recaptcha/api.js (капчу лениво грузит app.js — убрать): ${staticCaptcha.length} стр. ==`)
if (staticCaptcha.length) console.log('  ' + staticCaptcha.map(r => r.page).join(' '))

const all = rows.map(r => r.scripts.map(s => s.src).join(' ')).join(' ') + ' ' + partials
const unused = fs.readdirSync(path.join(SRC, 'resources')).filter(f => f.endsWith('.js'))
    .filter(f => !new RegExp(`(^|[\\s"'/])${f.replace(/\./g, '\\.')}($|[\\s"'?])`).test(all))
console.log(`\n== Файлы src/resources/*.js, не подключённые ни на одной странице: ${unused.length} ==`)
if (unused.length) console.log('  ' + unused.join(' '))

const dist = {}
rows.forEach(r => { dist[r.scripts.length] = (dist[r.scripts.length] || 0) + 1 })
console.log('\n== Скриптов на странице → сколько таких страниц ==')
console.log('  ' + Object.entries(dist).map(([k, v]) => `${k}: ${v}`).join(', '))
