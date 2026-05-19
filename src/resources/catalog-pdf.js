/**
 * Модуль генерации PDF для каталога сувенирной продукции
 * Финальная версия на pdfmake с поддержкой кириллицы
 */
(function() {
    'use strict';

    function transliterate(str) {
        const ruToEn = {'а':'a','б':'b','в':'v','г':'g','д':'d','е':'e','ё':'yo','ж':'zh','з':'z','и':'i','й':'y','к':'k','л':'l','м':'m','н':'n','о':'o','п':'p','р':'r','с':'s','т':'t','у':'u','ф':'f','х':'kh','ц':'ts','ч':'ch','ш':'sh','щ':'sch','ъ':'','ы':'y','ь':'','э':'e','ю':'yu','я':'ya','А':'A','Б':'B','В':'V','Г':'G','Д':'D','Е':'E','Ё':'Yo','Ж':'Zh','З':'Z','И':'I','Й':'Y','К':'K','Л':'L','М':'M','Н':'N','О':'O','П':'P','Р':'R','С':'S','Т':'T','У':'U','Ф':'F','Х':'Kh','Ц':'Ts','Ч':'Ch','Ш':'Sh','Щ':'Sch','Ъ':'','Ы':'Y','Ь':'','Э':'E','Ю':'Yu','Я':'Ya'};
        return str.split('').map(c => ruToEn[c] || c).join('');
    }

    function sanitizeFileName(str) {
        return str.replace(/[\\/:*?"<>|]/g, '').replace(/\s+/g, '_').trim();
    }

    function getCurrentDate() {
        const now = new Date();
        const months = ['января','февраля','марта','апреля','мая','июня','июля','августа','сентября','октября','ноября','декабря'];
        return `${now.getDate()} ${months[now.getMonth()]} ${now.getFullYear()} года`;
    }

    function generateFileName(categoryName) {
        return `Каталог_${sanitizeFileName(transliterate(categoryName))}_Лазурь.pdf`;
    }

    function loadImage(imgElement) {
        return new Promise((resolve) => {
            if (!imgElement) { resolve(null); return; }
            let src = imgElement.src || imgElement.getAttribute('src');
            if (!src) { resolve(null); return; }
            const img = new Image();
            img.crossOrigin = 'anonymous';
            const timeout = setTimeout(() => resolve(null), 5000);
            img.onload = () => { clearTimeout(timeout); resolve(img); };
            img.onerror = () => { clearTimeout(timeout); resolve(null); };
            img.src = src;
        });
    }

    function imageToDataUrl(img) {
        return new Promise((resolve) => {
            if (!img) { resolve(null); return; }
            try {
                const canvas = document.createElement('canvas');
                canvas.width = img.naturalWidth;
                canvas.height = img.naturalHeight;
                const ctx = canvas.getContext('2d');
                ctx.drawImage(img, 0, 0);
                resolve(canvas.toDataURL('image/jpeg', 0.85));
            } catch (e) {
                resolve(null);
            }
        });
    }

    async function generatePdf(button) {
        console.log('=== НАЧАЛО ГЕНЕРАЦИИ PDF ===');
        
        if (typeof pdfMake === 'undefined') {
            console.error('pdfMake не найден');
            alert('Библиотека не загружена. Обновите страницу.');
            return;
        }
        
        const titleEl = button.previousElementSibling;
        if (!titleEl || !titleEl.classList.contains('catalog__subtitle')) {
            alert('Ошибка: не найден заголовок категории');
            return;
        }
        const categoryName = titleEl.textContent.trim();
        
        const list = button.nextElementSibling;
        if (!list || !list.classList.contains('catalog__list')) {
            alert('Ошибка: не найден список товаров');
            return;
        }
        
        const origText = button.innerHTML;
        button.innerHTML = 'Генерация...';
        button.disabled = true;
        
        try {
            const items = list.querySelectorAll('.catalog-item');
            const products = [];
            
            for (const item of items) {
                const imgEl = item.querySelector('.catalog-item__img-cnt img');
                const img = imgEl ? await loadImage(imgEl) : null;
                const dataUrl = img ? await imageToDataUrl(img) : null;
                
                const name = (item.querySelector('.catalog-item__name')?.textContent || 'Без названия').trim();
                const price = (item.querySelector('.catalog-item__price')?.textContent || '0 руб.').trim();
                const article = (item.querySelector('.catalog-item__number')?.textContent || '').trim();
                
                const cardContent = [];
                
                // Изображение с отступами
                if (dataUrl) {
                    cardContent.push({
                        image: dataUrl,
                        width: 150,
                        height: 110,
                        alignment: 'center',
                        margin: [5, 5, 5, 3]
                    });
                } else {
                    cardContent.push({
                        text: 'Нет фото',
                        fontSize: 10,
                        color: '#999',
                        alignment: 'center',
                        margin: [0, 30, 0, 30]
                    });
                }
                
                // Название с отступами
                cardContent.push({
                    text: name.length > 50 ? name.substring(0, 47) + '...' : name,
                    fontSize: 8,
                    color: '#333',
                    margin: [5, 0, 5, 3],
                    lineHeight: 1.2
                });
                
                // Цена и артикул разнесены по краям
                cardContent.push({
                    columns: [
                        {
                            text: price,
                            fontSize: 9,
                            bold: true,
                            color: '#5da5db',
                            width: 'auto',
                            margin: [5, 0, 0, 0]
                        },
                        {
                            text: '',
                            width: '*'
                        },
                        {
                            text: article,
                            fontSize: 7,
                            color: '#999',
                            alignment: 'right',
                            width: 'auto',
                            margin: [0, 0, 5, 0]
                        }
                    ],
                    margin: [0, 2, 0, 0]
                });
                
                products.push({
                    stack: cardContent,
                    width: '33%',
                    margin: [4, 4, 4, 4],
                    border: [true, true, true, true],
                    borderColor: ['#e0e0e0', '#e0e0e0', '#e0e0e0', '#e0e0e0'],
                    fillColor: '#ffffff',
                    unbreakable: true
                });
            }
            
            console.log('Загружено товаров:', products.length);
            
            const tableBody = [];
            let row = [];
            
            for (let i = 0; i < products.length; i++) {
                row.push(products[i]);
                if (row.length === 3 || i === products.length - 1) {
                    while (row.length < 3) {
                        row.push({ text: '', width: '33%', border: [false, false, false, false] });
                    }
                    tableBody.push(row);
                    row = [];
                }
            }
            
            const content = [];
            
            content.push({ text: categoryName, fontSize: 14, bold: true, color: '#5da5db', margin: [0, 0, 0, 5] });
            content.push({ canvas: [{ type: 'line', x1: 0, y1: 0, x2: 515, y2: 0, lineWidth: 1, lineColor: '#5da5db' }], margin: [0, 0, 0, 10] });
            content.push({ table: { widths: ['*', '*', '*'], body: tableBody }, layout: 'noBorders', margin: [0, 0, 0, 10] });
            content.push({ text: 'Цены актуальны на ' + getCurrentDate() + '. Сгенерировано в типографии Лазурь', fontSize: 7, color: '#666', alignment: 'center', margin: [0, 10, 0, 0] });
            
            const docDefinition = { pageSize: 'A4', pageMargins: [30, 30, 30, 30], content: content, defaultStyle: { font: 'Roboto' } };
            
            pdfMake.createPdf(docDefinition).download(generateFileName(categoryName));
            console.log('=== PDF СОХРАНЁН ===');
            
        } catch (e) {
            console.error('ОШИБКА:', e.message, e.stack);
            alert('Ошибка при генерации PDF: ' + e.message);
        } finally {
            button.innerHTML = origText;
            button.disabled = false;
        }
    }

    function init() {
        console.log('=== ИНИЦИАЛИЗАЦИЯ PDF-КНОПОК ===');
        document.querySelectorAll('.catalog__pdf-btn[data-initialized]').forEach(b => b.remove());
        const sections = document.querySelectorAll('.catalog__section');
        sections.forEach(section => {
            const subtitles = section.querySelectorAll('.catalog__subtitle');
            subtitles.forEach(subtitle => {
                const nextElement = subtitle.nextElementSibling;
                if (nextElement && nextElement.classList.contains('catalog__list')) {
                    const itemCount = nextElement.querySelectorAll('.catalog-item').length;
                    if (itemCount === 0) return;
                    const btn = document.createElement('button');
                    btn.className = 'catalog__pdf-btn';
                    btn.setAttribute('data-initialized','true');
                    btn.style.cssText = 'display:inline-flex;align-items:center;gap:8px;padding:6px 12px;background:#5da5db;color:white;border:none;border-radius:6px;font-size:13px;cursor:pointer;margin:5px 0 10px 0;';
                    btn.innerHTML = '<svg width="14" height="14" viewBox="0 0 24 24" fill="none"><path d="M14 2H6C4.9 2 4 2.9 4 4v16c0 1.1.9 2 2 2h12c1.1 0 2-.9 2-2V8l-6-6z" stroke="currentColor" stroke-width="2"/><path d="M14 2v6h6" stroke="currentColor" stroke-width="2"/><path d="M8 13h8" stroke="currentColor" stroke-width="2"/></svg> Скачать PDF';
                    btn.addEventListener('click', () => generatePdf(btn));
                    subtitle.parentNode.insertBefore(btn, nextElement);
                }
            });
        });
        console.log('=== ИНИЦИАЛИЗАЦИЯ ЗАВЕРШЕНА ===');
    }

    if (document.readyState === 'loading') document.addEventListener('DOMContentLoaded', init);
    else init();
    document.addEventListener('catalog:tabChanged', init);
})();
