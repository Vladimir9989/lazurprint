// Загрузчик закрытого тестового окна ИИ-помощника (для сотрудников). Посторонние посетители ничего не получают:
// без кода доступа скрипт и стили окна не запрашиваются вообще.
// Код приходит ссылкой https://lazurprint.ru/?ai=КОД — запоминается в localStorage и убирается из адреса.
// Выключить у себя: ссылка с ?ai=off. Само окно — ai-chat.js / ai-chat.css (src/resources), сервер — ai-chat.php.
(function () {
    let code = '';
    try {
        const params = new URLSearchParams(window.location.search);
        const fromLink = params.get('ai');
        if (fromLink) {
            if (fromLink === 'off') localStorage.removeItem('lzAiCode');
            else localStorage.setItem('lzAiCode', fromLink);
            params.delete('ai');
            const query = params.toString();
            window.history.replaceState(null, '', window.location.pathname + (query ? '?' + query : '') + window.location.hash);
        }
        code = localStorage.getItem('lzAiCode') || '';
    } catch (e) {
        return;
    }
    if (!code) return;

    window.lzAiCode = code;
    const css = document.createElement('link');
    css.rel = 'stylesheet';
    css.href = '/ai-chat.css?v=1';
    document.head.appendChild(css);
    const js = document.createElement('script');
    js.src = '/ai-chat.js?v=1';
    js.defer = true;
    document.head.appendChild(js);
})();
