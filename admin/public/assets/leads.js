(function () {
    'use strict';

    // Подтверждение для форм с data-confirm.
    document.addEventListener('submit', function (e) {
        var form = e.target;
        if (form && form.getAttribute && form.getAttribute('data-confirm')) {
            if (!window.confirm(form.getAttribute('data-confirm'))) {
                e.preventDefault();
            }
        }
    });

    // Кнопки «Скопировать»: берут текст из элемента по id (data-copy).
    function fallbackCopy(text, done) {
        var ta = document.createElement('textarea');
        ta.value = text;
        ta.setAttribute('readonly', '');
        ta.style.position = 'fixed';
        ta.style.opacity = '0';
        document.body.appendChild(ta);
        ta.select();
        try {
            document.execCommand('copy');
            done();
        } catch (err) {
            window.prompt('Скопируйте текст:', text);
        }
        document.body.removeChild(ta);
    }

    function copyText(text, done) {
        if (navigator.clipboard && window.isSecureContext) {
            navigator.clipboard.writeText(text).then(done, function () { fallbackCopy(text, done); });
        } else {
            fallbackCopy(text, done);
        }
    }

    document.addEventListener('click', function (e) {
        var btn = e.target.closest ? e.target.closest('[data-copy]') : null;
        if (!btn) { return; }
        var src = document.getElementById(btn.getAttribute('data-copy'));
        if (!src) { return; }
        var original = btn.textContent;
        copyText(src.textContent.replace(/^\s+|\s+$/g, ''), function () {
            btn.textContent = 'Скопировано ✓';
            btn.classList.add('is-copied');
            setTimeout(function () {
                btn.textContent = original;
                btn.classList.remove('is-copied');
            }, 1600);
        });
    });

    // Выбор фото-образцов: «выбрать все» в категории и счётчик на кнопке ZIP.
    var picker = document.getElementById('sample-picker');
    if (picker) {
        var zipButtons = picker.querySelectorAll('[data-zip-button]');
        var update = function () {
            var n = picker.querySelectorAll('input[name="ids[]"]:checked').length;
            Array.prototype.forEach.call(zipButtons, function (b) {
                b.textContent = 'Скачать выбранные (ZIP)' + (n ? ': ' + n : '');
                b.disabled = n === 0;
                b.style.opacity = n === 0 ? '0.5' : '';
            });
        };
        picker.addEventListener('change', update);
        picker.addEventListener('click', function (e) {
            var t = e.target.closest ? e.target.closest('[data-toggle-all]') : null;
            if (!t) { return; }
            var box = document.getElementById(t.getAttribute('data-toggle-all'));
            if (!box) { return; }
            var boxes = box.querySelectorAll('input[type=checkbox]');
            var all = Array.prototype.every.call(boxes, function (c) { return c.checked; });
            Array.prototype.forEach.call(boxes, function (c) { c.checked = !all; });
            update();
        });
        update();
    }
})();
