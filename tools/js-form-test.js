#!/usr/bin/env node
// Сценарный тест формы заявки в jsdom (src/js/components/form-modal.js + submitHandler в src/js/main.js):
// открытие кнопками, пропуск формы (GET mail.php?token) вместо капчи, правила полей, сообщения об ошибках,
// ответы mail.php (лимит, сбой, устаревшая страница), повтор при обрыве связи, двойное нажатие, закрытие, Esc,
// фокус и Tab, WhatsApp-ссылка в articles3. Сеть подменяется заглушкой — настоящую отправку проверяет только человек.
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
  w.JustValidate = function (sel, o) { handler = o.submitHandler; w.__rules = o.rules; };
  w.matchMedia = () => ({ matches: false });
  w.eval(app);
  return { w, errors, submit: () => handler(w.document.getElementById('form')) };
}
const ok = (c, m) => console.log((c ? 'OK  ' : 'FAIL') + ' ' + m);
// how-to-order
let { w, errors, submit } = load('how-to-order.html');
const d = w.document, modal = d.querySelector('.form__modal'), msg = d.getElementById('form-status');
const defTitle = d.querySelector('.form__title').textContent;
// сеть: GET mail.php?token отдаёт пропуск (или обрыв, пока tokenFail > 0), POST — answer; obryv — сколько POST оборвать
let log = [], answer = '', tokenFail = 0, obryv = 0, hold = false, pending = null;
w.XMLHttpRequest = function () {
  const x = this;
  x.open = (m, u) => { x.m = m; x.u = u; };
  x.send = (body) => {
    log.push(x.m + ' ' + x.u.split('?')[0]); x.body = body;
    const fin = (st, txt) => { x.readyState = 4; x.status = st; x.responseText = txt; x.onreadystatechange(); };
    if (x.m === 'GET') { if (tokenFail > 0) { tokenFail--; fin(0, ''); } else fin(200, Math.floor(Date.now() / 1000) + '.' + 'a'.repeat(32)); return; }
    if (hold) { pending = x; return; }
    if (obryv > 0) { obryv--; fin(0, ''); return; }
    fin(200, answer);
  };
};
// таймеры — мгновенно (паузы 2,5 с и повторы не ждём)
w.setTimeout = (fn) => { fn(); return 0; };
const posts = () => log.filter(l => l.startsWith('POST')).length;
const tokens = () => log.filter(l => l.startsWith('GET')).length;
ok(!d.querySelector('.g-recaptcha') && !d.querySelector('script[src*="recaptcha"]'), 'капчи Google нет');
d.querySelector('.ord-cta').click();
ok(modal.classList.contains('modal--active'), 'ord-cta открывает');
ok(tokens() === 1 && /^\d+\.a{32}$/.test(d.querySelector('input[name=form_token]').value), 'пропуск получен при открытии');
d.querySelector('.footer__contacts-btn').click();
ok(tokens() === 1, 'повторно пропуск не запрашивается');
ok(d.querySelector('input[name=page]').value === '/how-to-order.html', 'адрес страницы уходит в заявке');
ok(d.querySelector('input[name=form_hi]').value === '', 'без нажатий признака человека нет');
d.getElementById('name').dispatchEvent(new w.KeyboardEvent('keydown', { key: 'a', bubbles: true }));
ok(d.querySelector('input[name=form_hi]').value === '1', 'нажатие в форме ставит признак человека');
ok(d.querySelector('input[name=website]'), 'ловушка для ботов на месте');
answer = 'Обновите страницу';
submit(); ok(posts() === 1 && /Обновите её/.test(msg.textContent) && !d.querySelector('.form__btn').disabled, 'нет пропуска на сервере: ' + msg.textContent);
answer = 'Слишком быстро';
submit(); ok(/ещё раз/.test(msg.textContent), 'слишком быстро: ' + msg.textContent);
ok(w.__rules && w.__rules.email && w.__rules.email.email === true && !w.__rules.email.required, 'email необязателен, но проверяется по формату');
ok(w.__rules.name.maxLength === 50, 'имя — до 50 символов');
answer = 'Слишком много заявок';
submit(); ok(/несколько заявок за последний час/.test(msg.textContent) && !d.querySelector('.form__btn').disabled, 'лимит заявок: ' + msg.textContent);
answer = '<br /><b>Fatal error</b>: PHPMailer';
submit(); ok(/Не удалось/.test(msg.textContent) && !d.querySelector('.form__btn').disabled, 'непонятный ответ сервера — ошибка, не «спасибо»: ' + msg.textContent);
// обрыв связи: 2 обрыва — третья попытка проходит; 3 обрыва — ошибка
answer = 'Слишком много заявок'; let before = posts(); obryv = 2;
submit(); ok(posts() - before === 3 && /несколько заявок/.test(msg.textContent), 'обрыв связи 2 раза — заявка всё же ушла с 3-й попытки');
before = posts(); obryv = 3;
submit(); ok(posts() - before === 3 && /Не удалось/.test(msg.textContent) && !d.querySelector('.form__btn').disabled, 'обрыв 3 раза — ошибка, кнопка активна');
// пропуск не получен (обрывы) — повторно берётся при отправке
d.querySelector('input[name=form_token]').value = ''; tokenFail = 3; before = posts();
submit(); ok(posts() === before && /связаться с сайтом/.test(msg.textContent) && !d.querySelector('.form__btn').disabled, 'нет связи для пропуска: ' + msg.textContent);
tokenFail = 1; let t0 = tokens();
submit(); ok(tokens() - t0 === 2 && posts() === before + 1, 'пропуск взят со 2-й попытки, заявка ушла');
// двойное нажатие
hold = true; before = posts();
submit(); submit();
ok(posts() - before === 1 && pending.timeout === 30000, 'двойное нажатие — один запрос, таймаут 30 с');
ok(msg.style.color !== 'red', '«Отправляем…» не красным');
pending.ontimeout(); pending.readyState = 4; pending.status = 0; pending.responseText = ''; pending.onreadystatechange();
ok(posts() - before === 1 && /Не удалось/.test(msg.textContent) && !d.querySelector('.form__btn').disabled, 'таймаут — без повтора, ошибка, кнопка активна');
hold = false; answer = ''; before = posts();
submit(); ok(posts() - before === 1 && !d.querySelector('.form__btn').disabled, 'успешная отправка ушла, кнопка не заблокирована');
ok(!modal.classList.contains('modal--active'), 'модалка закрыта после успеха');
console.log('   errors:', errors.filter(e => !/navigation/i.test(e)));
// banner / close / escape
d.querySelector('.footer__contacts-btn').click();
w.lazurForm.open({ title: 'X', text: 'T' }); w.lazurForm.close();
ok(d.querySelector('.form__title').textContent === defTitle && d.querySelector('#textarea').value === '', 'close восстанавливает текст');
d.querySelector('.footer__contacts-btn').click();
d.dispatchEvent(new w.KeyboardEvent('keydown', { key: 'Escape' }));
ok(!modal.classList.contains('modal--active'), 'Esc закрывает');
// доступность и комментарий
const opener = d.querySelector('.footer__contacts-btn');
opener.focus(); opener.click();
ok(modal.getAttribute('role') === 'dialog' && modal.getAttribute('aria-modal') === 'true', 'role=dialog, aria-modal');
ok(d.activeElement === d.getElementById('form'), 'фокус переходит в форму');
d.getElementById('textarea').value = 'мой комментарий';
d.dispatchEvent(new w.KeyboardEvent('keydown', { key: 'Escape' }));
ok(d.activeElement === opener, 'фокус вернулся на кнопку');
ok(d.getElementById('textarea').value === 'мой комментарий', 'свой комментарий не стирается при закрытии');
opener.click();
const btn = d.querySelector('.form__btn'); btn.focus();
const tab = new w.KeyboardEvent('keydown', { key: 'Tab', cancelable: true }); d.dispatchEvent(tab);
ok(tab.defaultPrevented && d.activeElement === d.getElementById('name'), 'Tab с последней кнопки — на первое поле');
d.querySelector('.form__close').dispatchEvent(new w.MouseEvent('click', { bubbles: true }));
ok(!modal.classList.contains('modal--active'), 'крестик закрывает');
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
