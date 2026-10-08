#!/usr/bin/env node
// Сценарный тест формы заявки в jsdom (src/js/components/form-modal.js + submitHandler в src/js/main.js):
// открытие кнопками, ленивая капча, сообщения об ошибках, ответы mail.php, закрытие, Esc, WhatsApp-ссылка в articles3.
// Капча Google и отправка подменяются заглушками — настоящую отправку проверяет только человек.
//
//   npx gulp scripts && JSDOM_DIR=<папка с jsdom> node tools/js-form-test.js
//
// Библиотеки формы (inputmask, just-validate) — тоже заглушки: тест проверяет только нашу логику.
const path = require('path');
const { JSDOM, VirtualConsole } = require(process.env.JSDOM_DIR ? path.join(process.env.JSDOM_DIR, 'node_modules', 'jsdom') : 'jsdom');
const fs = require('fs');
const root = path.join(__dirname, '..');
const app = fs.readFileSync(root + '/dist/app.js', 'utf8');
function load(page) {
  const inc = (x, n = 0) => n > 4 ? x : x.replace(/@@include\(\s*['"]([^'"]+)['"][^)]*\)/g, (_, p) => inc(fs.readFileSync(root + '/src/' + p, 'utf8'), n + 1));
  let html = inc(fs.readFileSync(root + '/src/' + page, 'utf8')).replace(/<script[\s\S]*?<\/script>/gi, '');
  const vc = new VirtualConsole(); const errors = [];
  vc.on('jsdomError', e => errors.push(e.message));
  const dom = new JSDOM(html, { runScripts: 'outside-only', virtualConsole: vc, url: 'https://lazurprint.ru/' + page });
  const w = dom.window; let handler;
  w.Inputmask = function () { return { mask(el) { if (el) el.inputmask = { unmaskedvalue: () => '9220000000' }; } }; };
  w.JustValidate = function (sel, o) { handler = o.submitHandler; };
  w.matchMedia = () => ({ matches: false });
  w.eval(app);
  return { w, errors, submit: () => handler(w.document.getElementById('form')) };
}
const ok = (c, m) => console.log((c ? 'OK  ' : 'FAIL') + ' ' + m);
// how-to-order
let { w, errors, submit } = load('how-to-order.html');
const d = w.document, modal = d.querySelector('.form__modal'), msg = d.getElementById('captcha');
const defTitle = d.querySelector('.form__title').textContent;
ok(!d.querySelector('script[src*="recaptcha"]'), 'нет капчи до открытия');
d.querySelector('.ord-cta').click();
ok(modal.classList.contains('modal--active'), 'ord-cta открывает');
ok(d.querySelectorAll('script[src*="recaptcha/api.js"]').length === 1, 'капча подгружена 1 раз');
d.querySelector('.footer__contacts-btn').click();
ok(d.querySelectorAll('script[src*="recaptcha/api.js"]').length === 1, 'повторно не грузится');
submit(); ok(/ещё не загрузилась/.test(msg.textContent), 'без капчи: ' + msg.textContent);
let resp = '';
w.grecaptcha = { render: (el) => { el.appendChild(d.createElement('iframe')); return 0; }, getResponse: () => resp, reset: () => { w.__reset = 1; } };
w.lazurCaptchaOnload();
ok(d.querySelector('.g-recaptcha iframe'), 'виджет отрисован');
submit(); ok(/галочку/.test(msg.textContent), 'пустая галочка: ' + msg.textContent);
resp = 'tok'; let sent = [], answer = 'ВЫ РОБОТ';
w.XMLHttpRequest = function () { const x = this; x.open = (m, u) => x.u = u; x.send = () => { sent.push(x.u); x.readyState = 4; x.status = 200; x.responseText = answer; x.onreadystatechange(); }; };
submit(); ok(sent.length === 1 && /не пройдена/.test(msg.textContent) && w.__reset, 'ответ ВЫ РОБОТ: ' + msg.textContent);
ok(!d.querySelector('.form__btn').disabled, 'кнопка снова активна');
answer = '';
submit(); ok(sent.length === 2, 'успешная отправка ушла'); ok(!modal.classList.contains('modal--active'), 'модалка закрыта после успеха');
console.log('   errors:', errors.filter(e => !/navigation/i.test(e)));
// banner / close / escape
d.querySelector('.footer__contacts-btn').click();
w.lazurForm.open({ title: 'X', text: 'T' }); w.lazurForm.close();
ok(d.querySelector('.form__title').textContent === defTitle && d.querySelector('#textarea').value === '', 'close восстанавливает текст');
d.querySelector('.footer__contacts-btn').click();
d.dispatchEvent(new w.KeyboardEvent('keydown', { key: 'Escape' }));
ok(!modal.classList.contains('modal--active'), 'Esc закрывает');
// articles3: WhatsApp-ссылка
({ w } = load('articles3.html'));
const wa = w.document.querySelector('a.hero__btn[href^="https"]');
if (wa) { wa.click(); ok(!w.document.querySelector('.form__modal').classList.contains('modal--active'), 'WhatsApp-ссылка не открывает форму'); } else console.log('нет WA-ссылки');
// index: hero #order
({ w, errors } = load('index.html'));
w.document.querySelector('.hero__btn').click();
ok(w.document.querySelector('.form__modal').classList.contains('modal--active'), 'index hero открывает');
const b = w.document.querySelector('.banner-reklama'); if (b) { b.click(); ok(/рекламу/.test(w.document.querySelector('.form__title').textContent), 'баннер ставит заголовок'); }
console.log('   index errors:', errors);
