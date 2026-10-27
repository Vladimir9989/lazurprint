// Cloudflare Worker: посредник между хостингом сайта (Россия, блокируется) и OpenRouter.
// Принимает POST от нашего сервера, проверяет общий секрет и пересылает на OpenRouter как есть
// (ключ OpenRouter приходит в заголовке Authorization от нашего сервера, в воркере не хранится).
// Секрет RELAY_SECRET задаётся в настройках воркера (Settings → Variables and Secrets), в коде его нет.
export default {
  async fetch(request, env) {
    if (request.method !== 'POST') return new Response('Not found', { status: 404 });
    if (!env.RELAY_SECRET || request.headers.get('X-Relay-Secret') !== env.RELAY_SECRET) {
      return new Response('Forbidden', { status: 403 });
    }
    const headers = new Headers();
    headers.set('Content-Type', 'application/json');
    headers.set('Authorization', request.headers.get('Authorization') || '');
    headers.set('HTTP-Referer', 'https://lazurprint.ru');
    headers.set('X-Title', 'Lazur site');
    const upstream = await fetch('https://openrouter.ai/api/v1/chat/completions', {
      method: 'POST',
      headers,
      body: request.body,
    });
    return new Response(upstream.body, {
      status: upstream.status,
      headers: { 'Content-Type': upstream.headers.get('Content-Type') || 'application/json' },
    });
  },
};
