/**
 * Корзина в каталоге сувениров (catalog-suvenir.html): степпер «− 1 +» и кнопка «В корзину» на карточках,
 * панель корзины, выгрузка в .xlsx. Корзина хранится в localStorage посетителя, сервер не нужен.
 * ExcelJS (~900 КБ) грузится с CDN только при первом нажатии «Скачать Excel».
 */
(function() {
    'use strict';

    const STORAGE_KEY = 'lazurCart';
    const EXCELJS_SRC = 'https://cdnjs.cloudflare.com/ajax/libs/exceljs/4.4.0/exceljs.min.js';
    const MAX_QTY = 999999;

    let cart = [];
    let panel, fab, fabCount, listEl, totalEl, emptyEl, bodyEl, statusEl;

    function loadCart() {
        try {
            const data = JSON.parse(localStorage.getItem(STORAGE_KEY));
            if (Array.isArray(data)) {
                cart = data.filter(function(p) { return p && p.name && p.qty > 0; });
            }
        } catch (e) { cart = []; }
    }

    function saveCart() {
        try { localStorage.setItem(STORAGE_KEY, JSON.stringify(cart)); } catch (e) { /* приватный режим */ }
    }

    // «93 руб.», «12,5 руб.» → число; «Цена уточняется», «от 100 шт - 50 р/шт» → null
    function parsePrice(text) {
        const m = /^(\d+(?:[.,]\d+)?)\s*руб/i.exec(text.trim());
        return m ? parseFloat(m[1].replace(',', '.')) : null;
    }

    function fmtMoney(n) {
        return n.toLocaleString('ru-RU', { minimumFractionDigits: 0, maximumFractionDigits: 2 }) + ' руб.';
    }

    function clampQty(v) {
        const n = Math.floor(Number(v));
        if (!(n >= 1)) return 1;
        return Math.min(n, MAX_QTY);
    }

    function readItem(item) {
        const name = (item.querySelector('.catalog-item__name')?.textContent || '').replace(/\s+/g, ' ').trim();
        if (!name) return null;
        const priceText = (item.querySelector('.catalog-item__price')?.textContent || '').replace(/\s+/g, ' ').trim();
        const article = (item.querySelector('.catalog-item__number')?.textContent || '').replace(/^арт\.:\s*/i, '').replace(/\s+/g, ' ').trim();
        const img = item.querySelector('.catalog-item__img-cnt img');
        return { name: name, article: article, priceText: priceText, price: parsePrice(priceText), img: img ? img.currentSrc || img.src : '' };
    }

    function addToCart(product, qty) {
        const found = cart.find(function(p) { return p.name === product.name && p.article === product.article; });
        if (found) {
            found.qty = clampQty(found.qty + qty);
        } else {
            product.qty = clampQty(qty);
            cart.push(product);
        }
        saveCart();
        render();
    }

    // ---------- Карточки ----------

    function decorateItems() {
        document.querySelectorAll('.catalog-item').forEach(function(item) {
            if (item.querySelector('.cart-add')) return;
            const text = item.querySelector('.catalog-item__text');
            if (!text || !item.querySelector('.catalog-item__name')) return;
            const box = document.createElement('div');
            box.className = 'cart-add';
            box.innerHTML =
                '<div class="cart-step"><button type="button" class="cart-step__btn" data-step="-1" aria-label="Меньше">−</button>' +
                '<input type="number" class="cart-add__input" min="1" max="' + MAX_QTY + '" value="1" inputmode="numeric" aria-label="Количество, шт">' +
                '<button type="button" class="cart-step__btn" data-step="1" aria-label="Больше">+</button></div>' +
                '<button type="button" class="cart-add__btn">В корзину</button>';
            // «Цена уточняется», «от N шт…» — не цена, а пометка: в карточке они мельче и серые
            const priceEl = item.querySelector('.catalog-item__price');
            if (priceEl && parsePrice(priceEl.textContent) === null) priceEl.classList.add('catalog-item__price--note');
            text.appendChild(box);
        });
    }

    function onCatalogClick(e) {
        const step = e.target.closest('.cart-step__btn');
        if (step) {
            const field = step.parentNode.querySelector('.cart-add__input');
            field.value = clampQty(clampQty(field.value) + Number(step.dataset.step));
            return;
        }
        const btn = e.target.closest('.cart-add__btn');
        if (!btn) return;
        const item = btn.closest('.catalog-item');
        const product = item && readItem(item);
        if (!product) return;
        const input = item.querySelector('.cart-add__input');
        addToCart(product, clampQty(input.value));
        input.value = 1;
        btn.textContent = 'Добавлено ✓';
        btn.classList.add('cart-add__btn--done');
        clearTimeout(btn._t);
        btn._t = setTimeout(function() {
            btn.textContent = 'В корзину';
            btn.classList.remove('cart-add__btn--done');
        }, 1500);
    }

    // ---------- Панель ----------

    function buildPanel() {
        fab = document.createElement('button');
        fab.type = 'button';
        fab.className = 'cart-fab';
        fab.setAttribute('aria-label', 'Открыть корзину');
        fab.innerHTML =
            '<svg width="24" height="24" viewBox="0 0 24 24" fill="none" aria-hidden="true"><path d="M3 4h2l2.4 11.2a1 1 0 0 0 1 .8h8.9a1 1 0 0 0 1-.76L20 8H6.2" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"/><circle cx="9" cy="20" r="1.4" fill="currentColor"/><circle cx="17" cy="20" r="1.4" fill="currentColor"/></svg>' +
            '<span class="cart-fab__count" hidden>0</span>';
        fabCount = fab.querySelector('.cart-fab__count');

        panel = document.createElement('div');
        panel.className = 'cart-panel';
        panel.hidden = true;
        panel.setAttribute('role', 'dialog');
        panel.setAttribute('aria-modal', 'true');
        panel.setAttribute('aria-label', 'Корзина');
        panel.innerHTML =
            '<div class="cart-panel__overlay" data-cart-close></div>' +
            '<div class="cart-panel__box">' +
                '<div class="cart-panel__head"><h3 class="cart-panel__title">Корзина</h3>' +
                '<button type="button" class="cart-panel__close" data-cart-close aria-label="Закрыть">×</button></div>' +
                '<p class="cart-panel__empty">Корзина пуста. Укажите количество у нужных товаров и нажмите «В корзину».</p>' +
                '<div class="cart-panel__body">' +
                    '<ul class="cart-panel__list"></ul>' +
                    '<div class="cart-panel__total"></div>' +
                    '<p class="cart-panel__hint">Скачайте таблицу, свяжитесь с нами и отправьте этот файл — мы соберём заказ. Оплата на сайте не требуется.</p>' +
                    '<div class="cart-panel__actions">' +
                        '<button type="button" class="cart-panel__btn cart-panel__btn--main" data-cart-excel>Скачать Excel</button>' +
                        '<button type="button" class="cart-panel__btn cart-panel__btn--ghost" data-cart-clear>Очистить</button>' +
                    '</div>' +
                    '<p class="cart-panel__status" role="status"></p>' +
                '</div>' +
            '</div>';

        listEl = panel.querySelector('.cart-panel__list');
        totalEl = panel.querySelector('.cart-panel__total');
        emptyEl = panel.querySelector('.cart-panel__empty');
        bodyEl = panel.querySelector('.cart-panel__body');
        statusEl = panel.querySelector('.cart-panel__status');

        document.body.appendChild(fab);
        document.body.appendChild(panel);

        fab.addEventListener('click', openPanel);
        panel.addEventListener('click', onPanelClick);
        panel.addEventListener('change', onPanelChange);
        document.addEventListener('keydown', function(e) {
            if (e.key === 'Escape' && !panel.hidden) closePanel();
        });
    }

    function openPanel() {
        statusEl.textContent = '';
        panel.hidden = false;
        document.body.classList.add('cart-open');
        panel.querySelector('.cart-panel__close').focus();
    }

    function closePanel() {
        panel.hidden = true;
        document.body.classList.remove('cart-open');
        fab.focus();
    }

    function onPanelClick(e) {
        if (e.target.closest('[data-cart-close]')) { closePanel(); return; }
        const rm = e.target.closest('[data-cart-remove]');
        if (rm) {
            cart.splice(Number(rm.dataset.cartRemove), 1);
            saveCart();
            render();
            return;
        }
        if (e.target.closest('[data-cart-clear]')) {
            cart = [];
            saveCart();
            render();
            return;
        }
        if (e.target.closest('[data-cart-excel]')) downloadExcel(e.target.closest('[data-cart-excel]'));
    }

    function onPanelChange(e) {
        const input = e.target.closest('[data-cart-qty]');
        if (!input) return;
        const p = cart[Number(input.dataset.cartQty)];
        if (!p) return;
        p.qty = clampQty(input.value);
        saveCart();
        render();
    }

    function esc(s) {
        return s.replace(/[&<>"]/g, function(c) { return { '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;' }[c]; });
    }

    function render() {
        const count = cart.length;
        fabCount.textContent = count;
        fabCount.hidden = count === 0;
        emptyEl.hidden = count > 0;
        bodyEl.hidden = count === 0;

        listEl.innerHTML = cart.map(function(p, i) {
            const sum = p.price !== null ? fmtMoney(p.price * p.qty) : 'цену уточнит менеджер';
            return '<li class="cart-row">' +
                '<img class="cart-row__img" src="' + esc(p.img || '') + '" alt="" width="56" height="56"' + (p.img ? '' : ' hidden') + '>' +
                '<div class="cart-row__main"><div class="cart-row__name">' + esc(p.name) + '</div>' +
                '<div class="cart-row__meta">' + (p.article ? 'арт.: ' + esc(p.article) + ' · ' : '') + esc(p.priceText) + '</div></div>' +
                '<div class="cart-row__side"><label class="cart-add__qty"><input type="number" class="cart-add__input" min="1" max="' + MAX_QTY + '" value="' + p.qty + '" inputmode="numeric" data-cart-qty="' + i + '" aria-label="Количество, шт"><span>шт</span></label>' +
                '<div class="cart-row__sum">' + sum + '</div></div>' +
                '<button type="button" class="cart-row__remove" data-cart-remove="' + i + '" aria-label="Удалить из корзины">×</button>' +
                '</li>';
        }).join('');

        const total = cart.reduce(function(s, p) { return p.price !== null ? s + p.price * p.qty : s; }, 0);
        const unpriced = cart.filter(function(p) { return p.price === null; }).length;
        totalEl.innerHTML = 'Итого: <b>' + fmtMoney(total) + '</b>' +
            (unpriced ? '<span class="cart-panel__note">без учёта позиций с неуказанной ценой (' + unpriced + ' шт.) — цену уточнит менеджер</span>' : '');
    }

    // ---------- Excel ----------

    let excelPromise = null;

    function loadExcelJS() {
        if (window.ExcelJS) return Promise.resolve();
        if (excelPromise) return excelPromise;
        excelPromise = new Promise(function(resolve, reject) {
            const s = document.createElement('script');
            s.src = EXCELJS_SRC;
            s.onload = resolve;
            s.onerror = function() { s.remove(); excelPromise = null; reject(new Error('load')); };
            document.head.appendChild(s);
        });
        return excelPromise;
    }

    function fileName() {
        const d = new Date();
        const p = function(n) { return String(n).padStart(2, '0'); };
        return 'Заказ_Лазурь_' + d.getFullYear() + '-' + p(d.getMonth() + 1) + '-' + p(d.getDate()) + '.xlsx';
    }

    // Фото для Excel: перерисовываем в маленький JPEG на белом фоне; не загрузилось — строка без фото
    function imageToJpegBase64(src) {
        return new Promise(function(resolve) {
            if (!src) { resolve(null); return; }
            const img = new Image();
            const timer = setTimeout(function() { resolve(null); }, 5000);
            img.onload = function() {
                clearTimeout(timer);
                try {
                    const k = Math.min(1, 160 / Math.max(img.naturalWidth, img.naturalHeight));
                    const c = document.createElement('canvas');
                    c.width = Math.max(1, Math.round(img.naturalWidth * k));
                    c.height = Math.max(1, Math.round(img.naturalHeight * k));
                    const ctx = c.getContext('2d');
                    ctx.fillStyle = '#fff';
                    ctx.fillRect(0, 0, c.width, c.height);
                    ctx.drawImage(img, 0, 0, c.width, c.height);
                    resolve(c.toDataURL('image/jpeg', 0.85));
                } catch (e) { resolve(null); }
            };
            img.onerror = function() { clearTimeout(timer); resolve(null); };
            img.src = src;
        });
    }

    function downloadExcel(btn) {
        if (!cart.length) return;
        btn.disabled = true;
        statusEl.textContent = 'Готовим файл…';
        Promise.all([loadExcelJS(), Promise.all(cart.map(function(p) { return imageToJpegBase64(p.img); }))]).then(function(res) {
            const photos = res[1];
            const wb = new window.ExcelJS.Workbook();
            const ws = wb.addWorksheet('Заказ', { views: [{ state: 'frozen', ySplit: 4 }] });
            ws.columns = [
                { width: 5 }, { width: 14 }, { width: 13 }, { width: 58 }, { width: 14 }, { width: 10 }, { width: 16 }, { width: 30 }
            ];

            ws.mergeCells('A1:H1');
            ws.getCell('A1').value = 'Заказ с сайта lazurprint.ru — типография «Лазурь»';
            ws.getCell('A1').font = { bold: true, size: 14 };
            ws.mergeCells('A2:H2');
            ws.getCell('A2').value = 'Дата: ' + new Date().toLocaleDateString('ru-RU');
            ws.getCell('A2').font = { color: { argb: 'FF666666' } };

            const head = ws.getRow(4);
            head.values = ['№', 'Артикул', 'Фото', 'Название', 'Цена, руб.', 'Кол-во, шт', 'Сумма, руб.', 'Примечание'];
            head.font = { bold: true, color: { argb: 'FFFFFFFF' } };
            head.alignment = { vertical: 'middle', horizontal: 'center', wrapText: true };
            head.height = 24;
            head.eachCell(function(c) {
                c.fill = { type: 'pattern', pattern: 'solid', fgColor: { argb: 'FF3E77FB' } };
                c.border = { top: { style: 'thin' }, left: { style: 'thin' }, bottom: { style: 'thin' }, right: { style: 'thin' } };
            });

            const thin = { style: 'thin', color: { argb: 'FFBBBBBB' } };
            let total = 0;
            cart.forEach(function(p, i) {
                const r = 5 + i;
                const row = ws.getRow(r);
                const priced = p.price !== null;
                const sum = priced ? p.price * p.qty : null;
                if (priced) total += sum;
                row.getCell(1).value = i + 1;
                row.getCell(2).value = p.article;
                row.getCell(4).value = p.name;
                row.getCell(5).value = priced ? p.price : null;
                row.getCell(6).value = p.qty;
                row.getCell(7).value = priced ? { formula: 'E' + r + '*F' + r, result: sum } : null;
                row.getCell(8).value = priced ? '' : p.priceText + ' — цену уточнит менеджер';
                row.getCell(5).numFmt = '#,##0.00';
                row.getCell(7).numFmt = '#,##0.00';
                row.height = photos[i] ? 62 : 22;
                row.alignment = { vertical: 'middle', wrapText: true };
                row.getCell(1).alignment = { vertical: 'middle', horizontal: 'center' };
                row.getCell(6).alignment = { vertical: 'middle', horizontal: 'center' };
                if (photos[i]) {
                    const id = wb.addImage({ base64: photos[i], extension: 'jpeg' });
                    ws.addImage(id, { tl: { col: 2.08, row: r - 1 + 0.06 }, ext: { width: 76, height: 76 }, editAs: 'oneCell' });
                }
                for (let c = 1; c <= 8; c++) row.getCell(c).border = { top: thin, left: thin, bottom: thin, right: thin };
            });

            const last = 4 + cart.length;
            const tr = ws.getRow(last + 1);
            tr.getCell(6).value = 'Итого:';
            tr.getCell(6).alignment = { horizontal: 'right' };
            tr.getCell(7).value = { formula: 'SUM(G5:G' + last + ')', result: total };
            tr.getCell(7).numFmt = '#,##0.00';
            tr.font = { bold: true };

            const hint = ws.getRow(last + 3);
            hint.getCell(1).value = 'Итог не включает позиции с неуказанной ценой. Окончательную стоимость, наличие и сроки подтвердит менеджер.';
            hint.getCell(1).font = { italic: true, color: { argb: 'FF666666' } };

            return wb.xlsx.writeBuffer();
        }).then(function(buf) {
            const blob = new Blob([buf], { type: 'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet' });
            const url = URL.createObjectURL(blob);
            const a = document.createElement('a');
            a.href = url;
            a.download = fileName();
            document.body.appendChild(a);
            a.click();
            a.remove();
            setTimeout(function() { URL.revokeObjectURL(url); }, 2000);
            statusEl.textContent = 'Файл сохранён. Отправьте его нам — и мы соберём заказ.';
        }).catch(function() {
            statusEl.textContent = 'Не удалось сформировать файл. Проверьте интернет и попробуйте ещё раз.';
        }).then(function() {
            btn.disabled = false;
        });
    }

    function init() {
        const content = document.getElementById('catalog-content');
        if (!content) return;
        loadCart();
        decorateItems();
        buildPanel();
        render();
        content.addEventListener('click', onCatalogClick);
        // Enter в поле количества = «В корзину»
        content.addEventListener('keydown', function(e) {
            if (e.key !== 'Enter' || !e.target.classList.contains('cart-add__input')) return;
            e.preventDefault();
            e.target.closest('.catalog-item').querySelector('.cart-add__btn').click();
        });
        // корзина в другой вкладке
        window.addEventListener('storage', function(e) {
            if (e.key === STORAGE_KEY) { loadCart(); render(); }
        });
    }

    if (document.readyState === 'loading') document.addEventListener('DOMContentLoaded', init);
    else init();
})();
