// suppliers.html: окна со списками закупаемых позиций (кнопка data-paper-open="id окна")
document.addEventListener('DOMContentLoaded', function () {
    var lastFocus = null;
    var current = null;

    function open(modal) {
        if (!modal) return;
        lastFocus = document.activeElement;
        current = modal;
        modal.hidden = false;
        document.body.style.overflow = 'hidden';
        var dialog = modal.querySelector('.paper-modal__dialog');
        if (dialog) dialog.scrollTop = 0;
        var closeBtn = modal.querySelector('.paper-modal__close');
        if (closeBtn) closeBtn.focus();
    }

    function close() {
        if (!current || current.hidden) return;
        current.hidden = true;
        current = null;
        document.body.style.overflow = '';
        if (lastFocus && lastFocus.focus) lastFocus.focus();
    }

    document.querySelectorAll('[data-paper-open]').forEach(function (btn) {
        btn.addEventListener('click', function () {
            open(document.getElementById(btn.getAttribute('data-paper-open') || 'paper-modal'));
        });
    });

    document.querySelectorAll('.paper-modal').forEach(function (modal) {
        modal.addEventListener('click', function (e) {
            if (e.target.closest('[data-paper-close]')) {
                close();
            } else if (e.target.closest('[data-open-form]')) {
                // форма заявки откроется своим обработчиком; список убираем, чтобы не наслаивались окна
                lastFocus = null;
                close();
            }
        });
    });

    document.addEventListener('keydown', function (e) {
        if (e.key === 'Escape') close();
    });
});
