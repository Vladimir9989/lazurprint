// suppliers.html: окно со списком «Бумага и картон»
document.addEventListener('DOMContentLoaded', function () {
    var modal = document.getElementById('paper-modal');
    if (!modal) return;

    var lastFocus = null;

    function open() {
        lastFocus = document.activeElement;
        modal.hidden = false;
        document.body.style.overflow = 'hidden';
        var dialog = modal.querySelector('.paper-modal__dialog');
        if (dialog) dialog.scrollTop = 0;
        var closeBtn = modal.querySelector('.paper-modal__close');
        if (closeBtn) closeBtn.focus();
    }

    function close() {
        if (modal.hidden) return;
        modal.hidden = true;
        document.body.style.overflow = '';
        if (lastFocus && lastFocus.focus) lastFocus.focus();
    }

    document.querySelectorAll('[data-paper-open]').forEach(function (btn) {
        btn.addEventListener('click', open);
    });

    modal.addEventListener('click', function (e) {
        if (e.target.closest('[data-paper-close]')) {
            close();
        } else if (e.target.closest('[data-open-form]')) {
            // форма заявки откроется своим обработчиком; список убираем, чтобы не наслаивались окна
            lastFocus = null;
            close();
        }
    });

    document.addEventListener('keydown', function (e) {
        if (e.key === 'Escape') close();
    });
});
