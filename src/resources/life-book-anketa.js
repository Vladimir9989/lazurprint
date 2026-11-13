// Анкета «Книга о вашей жизни» (kniga-zhizni-anketa.html).
// Вопросы — life-book-data.json. Ответы хранятся в localStorage (ключ lazurLifeBook), на сервер не уходят
// до отправки. Фото — IndexedDB (уменьшенные копии). Экраны: начало, оглавление, вопросы, свои вопросы,
// фото, оформление, отправка (life-book.php: start → photo × N → finish), готово.
(function () {
    var app = document.getElementById('lb-app');
    if (!app) return;

    var STORAGE_KEY = 'lazurLifeBook';
    var DATA = null;
    var QUESTIONS = []; // плоский список вопросов с данными главы
    var state = null;
    var storageOk = true;
    var saveTimer = null;

    // ---------- хранилище ----------
    function defaultState() {
        return {
            v: 1, who: 'self', heroName: '', answers: {}, skipped: {}, custom: [], pos: 0, updatedAt: 0,
            design: { binding: '', size: '', font: 'pt-serif', coverText: '' },
            contacts: { name: '', phone: '', email: '', consent: false }
        };
    }

    function loadState() {
        var s = defaultState();
        try {
            var raw = localStorage.getItem(STORAGE_KEY);
            if (raw) {
                var parsed = JSON.parse(raw);
                if (parsed && typeof parsed === 'object') {
                    for (var k in s) {
                        if (parsed[k] !== undefined) s[k] = parsed[k];
                    }
                }
            }
        } catch (e) { /* пустое состояние */ }
        return s;
    }

    function checkStorage() {
        try {
            var t = '__lb_test__';
            localStorage.setItem(t, '1');
            localStorage.removeItem(t);
            return true;
        } catch (e) {
            return false;
        }
    }

    function saveNow() {
        clearTimeout(saveTimer);
        state.updatedAt = Date.now();
        if (!storageOk) return;
        try {
            localStorage.setItem(STORAGE_KEY, JSON.stringify(state));
        } catch (e) {
            storageOk = false;
            showStorageWarning();
        }
    }

    function saveSoon() {
        clearTimeout(saveTimer);
        saveTimer = setTimeout(function () {
            saveNow();
            setSavedLabel();
        }, 500);
    }

    // ---------- помощники ----------
    function el(tag, attrs, children) {
        var n = document.createElement(tag);
        if (attrs) {
            for (var k in attrs) {
                if (k === 'class') n.className = attrs[k];
                else if (k === 'text') n.textContent = attrs[k];
                else if (k.indexOf('on') === 0) n.addEventListener(k.slice(2), attrs[k]);
                else n.setAttribute(k, attrs[k]);
            }
        }
        (children || []).forEach(function (c) {
            if (c) n.appendChild(typeof c === 'string' ? document.createTextNode(c) : c);
        });
        return n;
    }

    function btn(text, cls, onclick) {
        return el('button', { type: 'button', class: 'lb-btn ' + cls, text: text, onclick: onclick });
    }

    function isAnswered(id) {
        return typeof state.answers[id] === 'string' && state.answers[id].trim() !== '';
    }

    function answeredCount() {
        return QUESTIONS.filter(function (q) { return isAnswered(q.id); }).length;
    }

    function esc(s) {
        return String(s).replace(/[&<>"]/g, function (c) {
            return { '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;' }[c];
        });
    }

    function render(nodes) {
        while (app.firstChild) app.removeChild(app.firstChild);
        nodes.forEach(function (n) { if (n) app.appendChild(n); });
        window.scrollTo(0, Math.max(0, app.getBoundingClientRect().top + window.pageYOffset - 20));
    }

    function warnBox() {
        if (storageOk) return null;
        return el('p', {
            class: 'lb-warn',
            text: 'В этом режиме браузера ответы не сохранятся после закрытия страницы. Периодически нажимайте «Скачать копию ответов».'
        });
    }

    function showStorageWarning() {
        var w = warnBox();
        if (w && !app.querySelector('.lb-warn')) app.insertBefore(w, app.firstChild);
    }

    function setSavedLabel() {
        var s = document.getElementById('lb-saved');
        if (s) s.textContent = storageOk ? 'Сохранено на этом устройстве' : 'Ответ не сохраняется — скачайте копию';
    }

    function progressBar(done, total) {
        var bar = el('div', { class: 'lb-progress', role: 'progressbar', 'aria-valuemin': '0', 'aria-valuemax': String(total), 'aria-valuenow': String(done) }, [
            el('span', { class: 'lb-progress__fill' })
        ]);
        bar.firstChild.style.width = Math.round(done / total * 100) + '%';
        return bar;
    }

    // ---------- экраны ----------
    function screenStart() {
        var name = el('input', { type: 'text', id: 'lb-name', class: 'lb-input', maxlength: '80', placeholder: 'Например: Анна Петровна Иванова', autocomplete: 'off' });
        name.value = state.heroName;
        var err = el('p', { class: 'lb-error', text: '' });
        var whoSelf = el('input', { type: 'radio', name: 'lb-who', value: 'self', id: 'lb-who-self' });
        var whoRel = el('input', { type: 'radio', name: 'lb-who', value: 'relative', id: 'lb-who-rel' });
        (state.who === 'relative' ? whoRel : whoSelf).checked = true;

        function go() {
            var v = name.value.trim();
            if (!v) {
                err.textContent = 'Напишите, чья это будет книга.';
                name.focus();
                return;
            }
            state.heroName = v;
            state.who = whoRel.checked ? 'relative' : 'self';
            saveNow();
            screenToc();
        }

        render([
            warnBox(),
            el('h1', { class: 'lb-title', text: 'Книга о вашей жизни' }),
            el('p', { class: 'lb-lead', text: 'Начнём с двух простых вопросов. Потом — 50 вопросов о жизни, по одному на экране. Любой можно пропустить.' }),
            el('label', { class: 'lb-label', for: 'lb-name', text: 'Чья это книга? (имя, которое будет на обложке)' }),
            name,
            err,
            el('p', { class: 'lb-label', text: 'Кто заполняет анкету?' }),
            el('div', { class: 'lb-radios' }, [
                el('label', { class: 'lb-radio' }, [whoSelf, el('span', { text: 'Я сам(а), это моя книга' })]),
                el('label', { class: 'lb-radio' }, [whoRel, el('span', { text: 'Я заполняю за родного человека' })])
            ]),
            el('p', { class: 'lb-note', text: 'Не нужно писать много: на любой вопрос хватит двух-трёх предложений. Если захочется рассказать подробнее — пишите сколько угодно.' }),
            el('p', { class: 'lb-note', text: 'Все ответы сохраняются только на этом устройстве и в этом браузере. К нам они попадут, когда вы сами нажмёте «Отправить».' }),
            btn('Продолжить', 'lb-btn--primary', go)
        ]);
        name.addEventListener('keydown', function (e) { if (e.key === 'Enter') go(); });
    }

    function screenToc() {
        var total = QUESTIONS.length;
        var done = answeredCount();
        var chapters = DATA.chapters.map(function (ch) {
            var d = ch.questions.filter(function (q) { return isAnswered(q.id); }).length;
            var firstIdx = QUESTIONS.findIndex(function (q) { return q.chapterId === ch.id; });
            var firstOpen = QUESTIONS.findIndex(function (q) { return q.chapterId === ch.id && !isAnswered(q.id); });
            return el('li', { class: 'lb-chapter' + (d === ch.questions.length ? ' lb-chapter--done' : '') }, [
                el('button', {
                    type: 'button', class: 'lb-chapter__btn', onclick: function () {
                        screenQuestion(firstOpen >= 0 ? firstOpen : firstIdx);
                    }
                }, [
                    el('span', { class: 'lb-chapter__name', text: ch.title }),
                    el('span', { class: 'lb-chapter__count', text: d + ' из ' + ch.questions.length })
                ])
            ]);
        });

        var customDone = state.custom.filter(function (c) { return c.text.trim() && c.answer.trim(); }).length;
        var resumeIdx = Math.min(Math.max(state.pos || 0, 0), total - 1);

        render([
            warnBox(),
            el('h1', { class: 'lb-title', text: 'Книга: ' + state.heroName }),
            el('p', { class: 'lb-lead', text: 'Отвечено ' + done + ' из ' + total + '. Можно отвечать в любом порядке и возвращаться сюда в любой момент.' }),
            progressBar(done, total),
            el('div', { class: 'lb-actions' }, [
                btn(done ? 'Продолжить с места остановки' : 'Начать с первого вопроса', 'lb-btn--primary', function () { screenQuestion(resumeIdx); })
            ]),
            el('ul', { class: 'lb-chapters' }, chapters),
            el('h2', { class: 'lb-subtitle', text: 'Когда ответов достаточно' }),
            el('div', { class: 'lb-actions' }, [
                btn('Фото', 'lb-btn--ghost', screenPhotos),
                btn('Оформление книги', 'lb-btn--ghost', screenDesign),
                btn('Отправить нам', 'lb-btn--primary', screenSend)
            ]),
            el('div', { class: 'lb-actions' }, [
                btn('Свои вопросы' + (customDone ? ' (' + customDone + ')' : ''), 'lb-btn--ghost', screenCustom),
                btn('Скачать копию ответов (Word)', 'lb-btn--ghost', downloadDoc)
            ]),
            el('div', { class: 'lb-actions lb-actions--small' }, [
                el('button', { type: 'button', class: 'lb-linkbtn', text: 'Изменить имя', onclick: screenStart }),
                el('button', { type: 'button', class: 'lb-linkbtn lb-linkbtn--danger', text: 'Очистить все ответы с этого устройства', onclick: clearAll })
            ])
        ]);
    }

    function screenQuestion(idx) {
        if (idx >= QUESTIONS.length) { screenCustom(); return; }
        if (idx < 0) { screenToc(); return; }
        var q = QUESTIONS[idx];
        state.pos = idx;
        saveNow();

        var ta = el('textarea', { id: 'lb-answer', class: 'lb-textarea', rows: '6', maxlength: String(DATA.limits.answerMaxChars), placeholder: 'Пишите так, как рассказали бы за столом' });
        ta.value = state.answers[q.id] || '';
        function autoGrow() {
            ta.style.height = 'auto';
            ta.style.height = Math.max(160, ta.scrollHeight + 4) + 'px';
        }
        ta.addEventListener('input', function () {
            state.answers[q.id] = ta.value;
            if (ta.value.trim()) delete state.skipped[q.id];
            autoGrow();
            var s = document.getElementById('lb-saved');
            if (s) s.textContent = 'Сохраняем…';
            saveSoon();
        });

        var counter = el('p', { class: 'lb-counter', id: 'lb-counter' });
        ta.addEventListener('input', function () {
            var left = DATA.limits.answerMaxChars - ta.value.length;
            counter.textContent = left < 1000 ? 'Осталось символов: ' + left : '';
        });

        function go(delta) {
            state.answers[q.id] = ta.value;
            saveNow();
            screenQuestion(idx + delta);
        }

        render([
            warnBox(),
            el('div', { class: 'lb-qhead' }, [
                el('button', { type: 'button', class: 'lb-linkbtn', text: '← К оглавлению', onclick: function () { state.answers[q.id] = ta.value; saveNow(); screenToc(); } }),
                el('span', { class: 'lb-qhead__num', text: 'Вопрос ' + (idx + 1) + ' из ' + QUESTIONS.length })
            ]),
            progressBar(answeredCount(), QUESTIONS.length),
            el('p', { class: 'lb-chaptername', text: q.chapterTitle }),
            el('h2', { class: 'lb-question', text: q.text }),
            q.hint ? el('p', { class: 'lb-hint', text: 'Подсказка: ' + q.hint }) : null,
            ta,
            counter,
            el('p', { class: 'lb-saved', id: 'lb-saved', text: state.answers[q.id] ? (storageOk ? 'Сохранено на этом устройстве' : '') : '' }),
            el('div', { class: 'lb-actions lb-actions--nav' }, [
                btn('Назад', 'lb-btn--ghost', function () { go(-1); }),
                btn('Пропустить', 'lb-btn--ghost', function () {
                    if (!ta.value.trim()) state.skipped[q.id] = true;
                    go(1);
                }),
                btn('Дальше', 'lb-btn--primary', function () { go(1); })
            ])
        ]);
        autoGrow();
        ta.focus();
    }

    function screenCustom() {
        state.pos = QUESTIONS.length - 1;
        saveNow();
        var list = el('div', { class: 'lb-customs' });

        function drawList() {
            while (list.firstChild) list.removeChild(list.firstChild);
            state.custom.forEach(function (c, i) {
                var qin = el('input', { type: 'text', class: 'lb-input', maxlength: '300', placeholder: 'Ваш вопрос, например: «Как вы выбрали имя для сына?»' });
                qin.value = c.text;
                qin.addEventListener('input', function () { c.text = qin.value; saveSoon(); });
                var ain = el('textarea', { class: 'lb-textarea', rows: '4', maxlength: String(DATA.limits.answerMaxChars), placeholder: 'Ответ' });
                ain.value = c.answer;
                ain.addEventListener('input', function () { c.answer = ain.value; saveSoon(); });
                list.appendChild(el('div', { class: 'lb-custom' }, [
                    el('p', { class: 'lb-label', text: 'Свой вопрос ' + (i + 1) }),
                    qin,
                    ain,
                    el('button', {
                        type: 'button', class: 'lb-linkbtn lb-linkbtn--danger', text: 'Удалить', onclick: function () {
                            state.custom.splice(i, 1);
                            saveNow();
                            drawList();
                            updateAdd();
                        }
                    })
                ]));
            });
        }

        var add = btn('Добавить свой вопрос', 'lb-btn--ghost', function () {
            if (state.custom.length >= DATA.limits.customQuestionsMax) return;
            state.custom.push({ text: '', answer: '' });
            saveNow();
            drawList();
            updateAdd();
        });
        function updateAdd() {
            add.disabled = state.custom.length >= DATA.limits.customQuestionsMax;
        }

        render([
            warnBox(),
            el('div', { class: 'lb-qhead' }, [
                el('button', { type: 'button', class: 'lb-linkbtn', text: '← К оглавлению', onclick: screenToc })
            ]),
            el('h2', { class: 'lb-question', text: 'Свои вопросы' }),
            el('p', { class: 'lb-lead', text: 'Если хочется рассказать о том, о чём мы не спросили, — добавьте свой вопрос и ответ на него. До ' + DATA.limits.customQuestionsMax + ' штук. Этот шаг можно пропустить.' }),
            list,
            el('div', { class: 'lb-actions' }, [
                add,
                btn('К оглавлению', 'lb-btn--ghost', screenToc),
                btn('Дальше: фото', 'lb-btn--primary', screenPhotos)
            ])
        ]);
        drawList();
        updateAdd();
    }

    // ---------- фото (IndexedDB, запасной вариант — память страницы) ----------
    var photoDb = null;
    var memPhotos = [];
    var thumbUrls = [];
    var pageLoadedAt = Date.now();

    function idbReady() {
        if (photoDb) return Promise.resolve(photoDb);
        return new Promise(function (resolve) {
            if (!window.indexedDB) { resolve(null); return; }
            var req;
            try { req = indexedDB.open('lazurLifeBook', 1); } catch (e) { resolve(null); return; }
            req.onupgradeneeded = function () { req.result.createObjectStore('photos', { keyPath: 'id' }); };
            req.onsuccess = function () { photoDb = req.result; resolve(photoDb); };
            req.onerror = function () { resolve(null); };
            req.onblocked = function () { resolve(null); };
        });
    }

    function idbDo(mode, fn) {
        return idbReady().then(function (db) {
            if (!db) return null;
            return new Promise(function (resolve, reject) {
                var tx = db.transaction('photos', mode);
                var result = fn(tx.objectStore('photos'));
                tx.oncomplete = function () { resolve(result && result.result !== undefined ? result.result : null); };
                tx.onerror = function () { reject(tx.error); };
            });
        }).catch(function () { return null; });
    }

    function photosAll() {
        return idbReady().then(function (db) {
            if (!db) return memPhotos.slice();
            return idbDo('readonly', function (s) { return s.getAll(); }).then(function (r) { return r || []; });
        }).then(function (list) {
            return list.sort(function (a, b) { return a.order - b.order; });
        });
    }

    function photoPut(rec) {
        return idbReady().then(function (db) {
            if (!db) {
                var i = memPhotos.findIndex(function (p) { return p.id === rec.id; });
                if (i >= 0) memPhotos[i] = rec; else memPhotos.push(rec);
                return null;
            }
            return idbDo('readwrite', function (s) { return s.put(rec); });
        });
    }

    function photoDel(id) {
        return idbReady().then(function (db) {
            if (!db) { memPhotos = memPhotos.filter(function (p) { return p.id !== id; }); return null; }
            return idbDo('readwrite', function (s) { return s.delete(id); });
        });
    }

    function photosClear() {
        memPhotos = [];
        return idbReady().then(function (db) {
            if (!db) return null;
            return idbDo('readwrite', function (s) { return s.clear(); });
        });
    }

    function loadBitmap(file) {
        function viaImg() {
            return new Promise(function (resolve, reject) {
                var u = URL.createObjectURL(file);
                var im = new Image();
                im.onload = function () { URL.revokeObjectURL(u); resolve(im); };
                im.onerror = function () { URL.revokeObjectURL(u); reject(new Error('bad')); };
                im.src = u;
            });
        }
        if (window.createImageBitmap) {
            return createImageBitmap(file, { imageOrientation: 'from-image' }).catch(viaImg);
        }
        return viaImg();
    }

    // Уменьшает фото до photoMaxSidePx по длинной стороне, перекодирует в JPEG
    function processPhoto(file) {
        var name = (file.name || '').toLowerCase();
        if (/heic|heif/.test(file.type) || /\.(heic|heif)$/.test(name)) {
            return Promise.reject(new Error('Формат HEIC не поддерживается. Сохраните фото как JPEG и добавьте снова.'));
        }
        if (!/^image\/(jpeg|png)$/.test(file.type) && !/\.(jpe?g|png)$/.test(name)) {
            return Promise.reject(new Error('«' + file.name + '»: подходят только JPEG и PNG.'));
        }
        return loadBitmap(file).then(function (bmp) {
            var w = bmp.width || bmp.naturalWidth;
            var h = bmp.height || bmp.naturalHeight;
            var k = Math.min(1, DATA.limits.photoMaxSidePx / Math.max(w, h));
            var cw = Math.max(1, Math.round(w * k));
            var ch = Math.max(1, Math.round(h * k));
            var canvas = document.createElement('canvas');
            canvas.width = cw;
            canvas.height = ch;
            var ctx = canvas.getContext('2d');
            ctx.fillStyle = '#fff';
            ctx.fillRect(0, 0, cw, ch);
            ctx.drawImage(bmp, 0, 0, cw, ch);
            if (bmp.close) bmp.close();
            return new Promise(function (resolve, reject) {
                canvas.toBlob(function (blob) {
                    if (!blob) { reject(new Error('Не удалось обработать «' + file.name + '».')); return; }
                    resolve({ blob: blob, w: cw, h: ch, small: Math.max(w, h) < DATA.limits.photoMinSidePx });
                }, 'image/jpeg', 0.9);
            });
        }, function () {
            throw new Error('Не удалось открыть «' + file.name + '». Возможно, файл повреждён.');
        });
    }

    function revokeThumbs() {
        thumbUrls.forEach(function (u) { URL.revokeObjectURL(u); });
        thumbUrls = [];
    }

    function screenPhotos() {
        revokeThumbs();
        var grid = el('div', { class: 'lb-photos' });
        var status = el('p', { class: 'lb-saved', id: 'lb-photo-status' });
        var input = el('input', { type: 'file', accept: 'image/jpeg,image/png', multiple: 'multiple', class: 'lb-file', id: 'lb-file' });
        var addBtn = btn('Добавить фотографии', 'lb-btn--primary', function () { input.click(); });
        var counter = el('p', { class: 'lb-lead' });

        function draw(list) {
            revokeThumbs();
            while (grid.firstChild) grid.removeChild(grid.firstChild);
            counter.textContent = list.length ? 'Загружено фото: ' + list.length + ' из ' + DATA.limits.photosMax + '.' : 'Пока ни одной фотографии. Этот шаг можно пропустить.';
            addBtn.disabled = list.length >= DATA.limits.photosMax;
            list.forEach(function (p) {
                var url = URL.createObjectURL(p.blob);
                thumbUrls.push(url);
                var cap = el('input', { type: 'text', class: 'lb-input lb-photo__caption', maxlength: '200', placeholder: 'Кто, где, когда' });
                cap.value = p.caption || '';
                cap.addEventListener('input', function () { p.caption = cap.value; photoPut(p); });
                var img = el('img', { class: 'lb-photo__img', src: url, alt: p.caption || 'Фотография' });
                var coverBtn = el('button', {
                    type: 'button', class: 'lb-linkbtn', text: p.cover ? '★ На обложку' : 'Сделать обложкой', onclick: function () {
                        Promise.all(list.map(function (x) { x.cover = (x.id === p.id) && !p.cover; return photoPut(x); })).then(function () { draw(list); });
                    }
                });
                grid.appendChild(el('div', { class: 'lb-photo' + (p.cover ? ' lb-photo--cover' : '') }, [
                    img,
                    p.small ? el('p', { class: 'lb-photo__warn', text: 'Маленькое фото — в печати может быть нечётким' }) : null,
                    cap,
                    el('div', { class: 'lb-photo__actions' }, [
                        coverBtn,
                        el('button', {
                            type: 'button', class: 'lb-linkbtn lb-linkbtn--danger', text: 'Удалить', onclick: function () {
                                photoDel(p.id).then(photosAll).then(draw);
                            }
                        })
                    ])
                ]));
            });
        }

        input.addEventListener('change', function () {
            var files = Array.prototype.slice.call(input.files || []);
            input.value = '';
            if (!files.length) return;
            photosAll().then(function (list) {
                var room = DATA.limits.photosMax - list.length;
                var queue = files.slice(0, Math.max(0, room));
                var errors = [];
                if (files.length > room) errors.push('Можно не больше ' + DATA.limits.photosMax + ' фото, лишние пропущены.');
                var order = list.reduce(function (m, p) { return Math.max(m, p.order); }, 0);
                addBtn.disabled = true;
                var chain = Promise.resolve();
                queue.forEach(function (file, i) {
                    chain = chain.then(function () {
                        status.textContent = 'Обрабатываем фото ' + (i + 1) + ' из ' + queue.length + '…';
                        return processPhoto(file).then(function (r) {
                            order += 1;
                            return photoPut({ id: 'p' + Date.now() + Math.floor(Math.random() * 1000), blob: r.blob, w: r.w, h: r.h, small: r.small, caption: '', cover: false, order: order });
                        }).catch(function (e) { errors.push(e.message); });
                    });
                });
                return chain.then(photosAll).then(function (l) {
                    status.textContent = errors.join(' ');
                    draw(l);
                });
            });
        });

        render([
            warnBox(),
            el('div', { class: 'lb-qhead' }, [
                el('button', { type: 'button', class: 'lb-linkbtn', text: '← К оглавлению', onclick: screenToc })
            ]),
            el('h2', { class: 'lb-question', text: 'Фотографии для книги' }),
            el('p', { class: 'lb-lead', text: 'До ' + DATA.limits.photosMax + ' снимков из семейного архива. Подпишите каждый: кто на нём, где и когда. Одну фотографию можно сделать обложкой.' }),
            counter,
            !window.indexedDB ? el('p', { class: 'lb-warn', text: 'Ваш браузер не сохраняет фото между визитами: они останутся только до закрытия страницы. Отправьте заявку за один раз.' }) : null,
            el('div', { class: 'lb-actions' }, [addBtn]),
            input,
            status,
            grid,
            el('div', { class: 'lb-actions lb-actions--nav' }, [
                btn('Назад', 'lb-btn--ghost', screenToc),
                btn('Дальше: оформление', 'lb-btn--primary', screenDesign)
            ])
        ]);
        photosAll().then(draw);
    }

    // ---------- оформление ----------
    var fontsLoaded = false;
    function loadFonts() {
        if (fontsLoaded) return;
        fontsLoaded = true;
        var l = document.createElement('link');
        l.rel = 'stylesheet';
        l.href = 'https://fonts.googleapis.com/css2?family=Literata:wght@400;700&family=Lora:wght@400;700&family=PT+Sans:wght@400;700&family=PT+Serif:wght@400;700&display=swap&subset=cyrillic';
        document.head.appendChild(l);
    }

    function sampleText() {
        for (var i = 0; i < QUESTIONS.length; i++) {
            if (isAnswered(QUESTIONS[i].id)) return state.answers[QUESTIONS[i].id].trim().replace(/\s+/g, ' ').slice(0, 140);
        }
        return 'Так начиналась наша семейная история. Всё самое важное мы запомнили навсегда.';
    }

    function screenDesign() {
        loadFonts();
        var d = state.design;
        var err = el('p', { class: 'lb-error' });
        var coverIn = el('input', { type: 'text', class: 'lb-input', maxlength: '100', placeholder: 'Например: Анна Петровна. Моя жизнь' });
        coverIn.value = d.coverText || state.heroName;
        coverIn.addEventListener('input', function () { d.coverText = coverIn.value; saveSoon(); });

        var bindings = DATA.bindings.map(function (b) {
            var sizes = b.sizes.map(function (s) {
                var r = el('input', { type: 'radio', name: 'lb-size', value: s.id });
                r.checked = d.size === s.id;
                r.addEventListener('change', function () { d.binding = b.id; d.size = s.id; saveNow(); err.textContent = ''; });
                return el('label', { class: 'lb-radio' }, [r, el('span', { text: s.name })]);
            });
            return el('div', { class: 'lb-bind' }, [
                el('h3', { class: 'lb-bind__title', text: b.name }),
                el('div', { class: 'lb-radios' }, sizes)
            ]);
        });

        var sample = sampleText();
        var fonts = DATA.fonts.map(function (f) {
            var r = el('input', { type: 'radio', name: 'lb-font', value: f.id });
            r.checked = d.font === f.id;
            r.addEventListener('change', function () { d.font = f.id; saveNow(); });
            var prev = el('span', { class: 'lb-font__sample', text: sample });
            prev.style.fontFamily = f.css;
            return el('label', { class: 'lb-font' }, [
                r,
                el('span', { class: 'lb-font__body' }, [
                    el('span', { class: 'lb-font__name', text: f.name }),
                    el('span', { class: 'lb-font__note', text: f.note }),
                    prev
                ])
            ]);
        });

        render([
            warnBox(),
            el('div', { class: 'lb-qhead' }, [
                el('button', { type: 'button', class: 'lb-linkbtn', text: '← К оглавлению', onclick: screenToc })
            ]),
            el('h2', { class: 'lb-question', text: 'Оформление книги' }),
            el('p', { class: 'lb-lead', text: 'Выберите переплёт и объём. Цены — на странице о книге; позже мы уточним итоговую стоимость вместе с вами.' }),
            el('a', { class: 'lb-linkbtn', href: 'kniga-zhizni.html#lb-price', target: '_blank', rel: 'noopener', text: 'Посмотреть цены (откроется в новой вкладке)' }),
            el('div', { class: 'lb-binds' }, bindings),
            el('h3', { class: 'lb-subtitle', text: 'Шрифт' }),
            el('div', { class: 'lb-fonts' }, fonts),
            el('h3', { class: 'lb-subtitle', text: 'Надпись на обложке' }),
            coverIn,
            err,
            el('div', { class: 'lb-actions lb-actions--nav' }, [
                btn('Назад', 'lb-btn--ghost', screenPhotos),
                btn('Дальше: отправка', 'lb-btn--primary', function () {
                    if (!d.size) { err.textContent = 'Выберите переплёт и объём книги.'; return; }
                    screenSend();
                })
            ])
        ]);
    }

    // ---------- отправка ----------
    var sendCtx = null; // { id, token, photos, next, finished } — чтобы «Повторить» продолжал с места сбоя

    // Пропуск формы (с 2026-11-13 вместо капчи Google): GET mail.php?token, проверяет life-book.php.
    // Берётся при открытии экрана отправки; живёт сутки, через 20 часов — новый. Обрыв связи — до 3 попыток.
    var formToken = '';
    var formTokenAt = 0;

    function getFormToken() {
        if (formToken && Date.now() - formTokenAt < 20 * 3600 * 1000) return Promise.resolve(true);
        function attempt(n) {
            return fetch('mail.php?token=' + Date.now(), { cache: 'no-store' })
                .then(function (r) { return r.ok ? r.text() : ''; })
                .catch(function () { return ''; })
                .then(function (t) {
                    t = (t || '').trim();
                    if (/^\d+\.[0-9a-f]{32}$/.test(t)) {
                        formToken = t;
                        formTokenAt = Date.now();
                        return true;
                    }
                    if (n < 3) return new Promise(function (res) { setTimeout(res, 1000 * n); }).then(function () { return attempt(n + 1); });
                    return false;
                });
        }
        return attempt(1);
    }

    function post(fd) {
        return fetch('life-book.php', { method: 'POST', body: fd })
            .then(function (r) { return r.json(); })
            .catch(function () { return { ok: false, net: true, error: 'Нет связи с сервером. Проверьте интернет и повторите.' }; });
    }

    // обрыв связи (запрос не дошёл) — ещё 2 попытки с паузой
    function postRetry(fd, n) {
        n = n || 1;
        return post(fd).then(function (r) {
            if (r.net && n < 3) return new Promise(function (res) { setTimeout(res, 1500 * n); }).then(function () { return postRetry(fd, n + 1); });
            return r;
        });
    }

    function screenSend() {
        var c = state.contacts;
        if (!c.name && state.who === 'self') c.name = state.heroName;
        photosAll().then(function (photos) { drawSend(photos); });
    }

    function drawSend(photos) {
        var c = state.contacts;
        var d = state.design;
        var bind = DATA.bindings.filter(function (b) { return b.id === d.binding; })[0];
        var size = bind && bind.sizes.filter(function (s) { return s.id === d.size; })[0];
        var font = DATA.fonts.filter(function (f) { return f.id === d.font; })[0];
        var answered = answeredCount();
        var customDone = state.custom.filter(function (x) { return x.text.trim() && x.answer.trim(); }).length;

        var nameIn = el('input', { type: 'text', class: 'lb-input', maxlength: '50', autocomplete: 'name' });
        nameIn.value = c.name;
        var phoneIn = el('input', { type: 'tel', class: 'lb-input', maxlength: '30', autocomplete: 'tel', placeholder: '+7 ___ ___-__-__' });
        phoneIn.value = c.phone;
        var mailIn = el('input', { type: 'email', class: 'lb-input', maxlength: '100', autocomplete: 'email', placeholder: 'По желанию' });
        mailIn.value = c.email;
        var consent = el('input', { type: 'checkbox', id: 'lb-consent' });
        consent.checked = !!c.consent;
        var honey = el('input', { type: 'text', name: 'website', tabindex: '-1', autocomplete: 'off', 'aria-hidden': 'true', class: 'lb-honey' });
        var err = el('p', { class: 'lb-error' });
        var progress = el('p', { class: 'lb-lead lb-sendprogress' });
        var sendBtn = btn('Отправить нам', 'lb-btn--primary', send);

        [[nameIn, 'name'], [phoneIn, 'phone'], [mailIn, 'email']].forEach(function (p) {
            p[0].addEventListener('input', function () { c[p[1]] = p[0].value; saveSoon(); });
        });
        consent.addEventListener('change', function () { c.consent = consent.checked; saveNow(); });

        function fail(msg, retry) {
            err.textContent = msg;
            sendBtn.disabled = false;
            sendBtn.textContent = retry ? 'Повторить' : 'Отправить нам';
            progress.textContent = '';
        }

        function validate() {
            if (!c.name.trim()) return 'Укажите ваше имя.';
            if (c.phone.replace(/\D/g, '').length < 10) return 'Укажите телефон, чтобы мы могли с вами связаться.';
            if (c.email.trim() && !/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(c.email.trim())) return 'Проверьте адрес почты.';
            if (!d.size) return 'Вернитесь и выберите переплёт и объём книги.';
            if (!c.consent) return 'Нужно согласие на обработку данных.';
            return '';
        }

        function uploadPhoto(i, attempt) {
            var p = photos[i];
            var fd = new FormData();
            fd.append('action', 'photo');
            fd.append('id', sendCtx.id);
            fd.append('token', sendCtx.token);
            fd.append('caption', p.caption || '');
            fd.append('cover', p.cover ? '1' : '0');
            fd.append('photo', p.blob, 'photo.jpg');
            return post(fd).then(function (r) {
                if (r.ok) return r;
                if (attempt < 3) return new Promise(function (res) { setTimeout(res, attempt * 1000); }).then(function () { return uploadPhoto(i, attempt + 1); });
                return r;
            });
        }

        function runPhotos() {
            var chain = Promise.resolve({ ok: true });
            function step(i) {
                return function (prev) {
                    if (!prev.ok) return prev;
                    if (i >= photos.length) return prev;
                    progress.textContent = 'Загружаем фото ' + (i + 1) + ' из ' + photos.length + '…';
                    return uploadPhoto(i, 1).then(function (r) {
                        if (r.ok) sendCtx.next = i + 1;
                        return r;
                    });
                };
            }
            for (var i = sendCtx.next; i < photos.length; i++) chain = chain.then(step(i));
            return chain;
        }

        function finish() {
            progress.textContent = 'Завершаем…';
            var fd = new FormData();
            fd.append('action', 'finish');
            fd.append('id', sendCtx.id);
            fd.append('token', sendCtx.token);
            return post(fd);
        }

        function send() {
            err.textContent = '';
            var v = validate();
            if (v) { err.textContent = v; return; }
            sendBtn.disabled = true;
            saveNow();

            var begin = Promise.resolve({ ok: true });
            if (!sendCtx) {
                progress.textContent = 'Отправляем ответы…';
                begin = getFormToken().then(function (ok) {
                    if (!ok) return { ok: false, error: 'Не удалось связаться с сайтом. Проверьте интернет и нажмите «Отправить нам» ещё раз.' };
                    // сервер не принимает пропуск моложе 2 секунд
                    var wait = 2500 - (Date.now() - formTokenAt);
                    return new Promise(function (res) { setTimeout(res, wait > 0 ? wait : 0); }).then(function () {
                        var fd = new FormData();
                        fd.append('action', 'start');
                        fd.append('payload', JSON.stringify({
                            heroName: state.heroName, who: state.who, answers: state.answers, custom: state.custom,
                            design: state.design, contacts: { name: c.name.trim(), phone: c.phone.trim(), email: c.email.trim(), consent: !!c.consent },
                            photosCount: photos.length
                        }));
                        fd.append('website', honey.value);
                        fd.append('form_ts', String(Date.now() - pageLoadedAt));
                        fd.append('form_token', formToken);
                        return postRetry(fd);
                    });
                }).then(function (r) {
                    if (r.ok) sendCtx = { id: r.id, token: r.token, next: 0 };
                    return r;
                });
            }

            begin.then(function (r) { return r.ok ? runPhotos() : r; })
                .then(function (r) { return r.ok ? finish() : r; })
                .then(function (r) {
                    if (r.ok) { state.sentAt = Date.now(); sendCtx = null; saveNow(); screenDone(); }
                    else fail(r.error || 'Не удалось отправить. Повторите попытку.', !!sendCtx);
                });
        }

        render([
            warnBox(),
            el('div', { class: 'lb-qhead' }, [
                el('button', { type: 'button', class: 'lb-linkbtn', text: '← К оформлению', onclick: screenDesign })
            ]),
            el('h2', { class: 'lb-question', text: 'Отправить нам' }),
            el('ul', { class: 'lb-summary' }, [
                el('li', { text: 'Книга: ' + state.heroName }),
                el('li', { text: 'Отвечено вопросов: ' + answered + ' из ' + QUESTIONS.length + (customDone ? ', своих: ' + customDone : '') }),
                el('li', { text: 'Фотографий: ' + photos.length }),
                el('li', { text: 'Переплёт: ' + (bind ? bind.name + ', ' + size.name : 'не выбран') }),
                el('li', { text: 'Шрифт: ' + (font ? font.name : '—') })
            ]),
            answered < 15 ? el('p', { class: 'lb-note', text: 'Ответов пока немного — книга получится тонкой. Можно отправить и так, а можно вернуться и ответить на ещё несколько вопросов.' }) : null,
            el('p', { class: 'lb-label', text: 'Ваше имя *' }),
            nameIn,
            el('p', { class: 'lb-label', text: 'Телефон *' }),
            phoneIn,
            el('p', { class: 'lb-label', text: 'Почта' }),
            mailIn,
            honey,
            el('label', { class: 'lb-check' }, [
                consent,
                el('span', null, [
                    'Я согласен(на) на обработку моих персональных данных, а также текстов и фотографий, которые я присылаю, включая сведения о моих родных, для подготовки и печати книги. Материалы видят только сотрудники типографии, участвующие в подготовке книги. После выдачи заказа типография хранит их 90 дней, затем удаляет. Я подтверждаю, что имею право передавать эти фото и сведения о других людях. ',
                    el('a', { href: 'user-agreement.html', target: '_blank', rel: 'noopener', text: 'Пользовательское соглашение' })
                ])
            ]),
            err,
            progress,
            el('div', { class: 'lb-actions' }, [sendBtn])
        ]);
        getFormToken(); // заранее, пока посетитель заполняет контакты
    }

    function screenDone() {
        render([
            el('h1', { class: 'lb-title', text: 'Спасибо! Заявка отправлена' }),
            el('p', { class: 'lb-lead', text: 'Мы получили ваши ответы и свяжемся с вами в течение 1–2 рабочих дней, чтобы уточнить детали и стоимость. Ничего не печатается без вашего утверждения макета.' }),
            el('p', { class: 'lb-note', text: 'Ответы пока остались на этом устройстве. Скачайте копию на память — после этого можно удалить их отсюда.' }),
            el('div', { class: 'lb-actions' }, [
                btn('Скачать копию ответов (Word)', 'lb-btn--primary', downloadDoc),
                btn('Удалить ответы с этого устройства', 'lb-btn--ghost', function () { clearAll(true); })
            ])
        ]);
    }

    // ---------- Word ----------
    function buildDocHtml() {
        var h = '<html xmlns:o="urn:schemas-microsoft-com:office:office" xmlns:w="urn:schemas-microsoft-com:office:word" xmlns="http://www.w3.org/TR/REC-html40">' +
            '<head><meta charset="utf-8"><title>Книга: ' + esc(state.heroName) + '</title>' +
            '<style>body{font-family:Georgia,serif;font-size:13pt;line-height:1.5}h1{font-size:24pt}h2{font-size:17pt;margin-top:28pt}h3{font-size:13pt;font-style:italic;margin-bottom:2pt}p{margin:0 0 8pt}</style></head><body>';
        h += '<h1>Книга: ' + esc(state.heroName) + '</h1>';
        var any = false;
        DATA.chapters.forEach(function (ch) {
            var block = '';
            ch.questions.forEach(function (q) {
                if (!isAnswered(q.id)) return;
                block += '<h3>' + esc(q.text) + '</h3>';
                state.answers[q.id].trim().split(/\n+/).forEach(function (p) { block += '<p>' + esc(p) + '</p>'; });
            });
            if (block) { h += '<h2>' + esc(ch.title) + '</h2>' + block; any = true; }
        });
        var cust = state.custom.filter(function (c) { return c.text.trim() && c.answer.trim(); });
        if (cust.length) {
            h += '<h2>Свои вопросы</h2>';
            cust.forEach(function (c) {
                h += '<h3>' + esc(c.text) + '</h3>';
                c.answer.trim().split(/\n+/).forEach(function (p) { h += '<p>' + esc(p) + '</p>'; });
            });
            any = true;
        }
        if (!any) h += '<p>Ответов пока нет.</p>';
        return h + '</body></html>';
    }

    function downloadDoc() {
        var blob = new Blob(['﻿', buildDocHtml()], { type: 'application/msword' });
        var name = 'kniga-o-zhizni-' + (state.heroName || 'otvety').replace(/[^\wа-яё-]+/gi, '-').slice(0, 40) + '.doc';
        var url = URL.createObjectURL(blob);
        var a = document.createElement('a');
        a.href = url;
        a.download = name;
        document.body.appendChild(a);
        a.click();
        setTimeout(function () { document.body.removeChild(a); URL.revokeObjectURL(url); }, 500);
    }

    function clearAll() {
        if (!window.confirm('Удалить все ваши ответы с этого устройства? Это нельзя отменить. Сначала лучше скачать копию.')) return;
        state = defaultState();
        try { localStorage.removeItem(STORAGE_KEY); } catch (e) { /* ничего */ }
        photosClear().then(screenStart);
    }

    // ---------- запуск ----------
    window.addEventListener('pagehide', function () { if (state) saveNow(); });
    document.addEventListener('visibilitychange', function () { if (document.hidden && state) saveNow(); });

    function init(data) {
        DATA = data;
        DATA.chapters.forEach(function (ch) {
            ch.questions.forEach(function (q) {
                QUESTIONS.push({ id: q.id, text: q.text, hint: q.hint, chapterId: ch.id, chapterTitle: ch.title });
            });
        });
        storageOk = checkStorage();
        state = loadState();
        if (!Array.isArray(state.custom)) state.custom = [];
        state.design = Object.assign({}, defaultState().design, state.design);
        state.contacts = Object.assign({}, defaultState().contacts, state.contacts);
        if (state.heroName) screenToc();
        else screenStart();
    }

    fetch('life-book-data.json')
        .then(function (r) { if (!r.ok) throw new Error(r.status); return r.json(); })
        .then(init)
        .catch(function () {
            while (app.firstChild) app.removeChild(app.firstChild);
            app.appendChild(el('p', { class: 'lb-error', text: 'Не удалось загрузить вопросы. Обновите страницу или позвоните нам.' }));
        });
})();
