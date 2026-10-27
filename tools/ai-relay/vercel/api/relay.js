// Vercel-функция: посредник между хостингом сайта (Россия, блокируется) и OpenRouter.
// Проверяет общий секрет (переменная окружения RELAY_SECRET в настройках проекта Vercel)
// и пересылает тело запроса на OpenRouter. Ключ OpenRouter приходит в Authorization от нашего сервера, здесь не хранится.
module.exports = async (req, res) => {
  if (req.method !== 'POST') return res.status(404).send('Not found');
  if (!process.env.RELAY_SECRET || req.headers['x-relay-secret'] !== process.env.RELAY_SECRET) {
    return res.status(403).send('Forbidden');
  }
  try {
    const upstream = await fetch('https://openrouter.ai/api/v1/chat/completions', {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'Authorization': req.headers['authorization'] || '',
        'HTTP-Referer': 'https://lazurprint.ru',
        'X-Title': 'Lazur site',
      },
      body: typeof req.body === 'string' ? req.body : JSON.stringify(req.body),
    });
    const text = await upstream.text();
    res.status(upstream.status).setHeader('Content-Type', upstream.headers.get('content-type') || 'application/json').send(text);
  } catch (e) {
    res.status(502).json({ error: { message: 'relay error: ' + e.message } });
  }
};
