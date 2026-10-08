#!/usr/bin/env node
// Шифрует ссылку на закрытый архив (events.html, «Архив фотографий») паролем — чтобы ни пароля,
// ни ссылки не было в коде страницы. Расшифровка — в src/resources/events.js (ARCHIVE), тем же
// алгоритмом браузера: PBKDF2-SHA-256 (200 000 итераций) → ключ AES-GCM-256.
//
//   node tools/archive-link.js "Пароль" "https://disk.yandex.ru/d/…"
//
// Вывод — готовый объект ARCHIVE: заменить им такой же в events.js. Новый пароль/ссылка = запустить ещё раз.
// Это не защита уровня сервера: пароль можно подбирать перебором, — но он больше не читается из кода.

const { webcrypto } = require('crypto');
const subtle = webcrypto.subtle;

const [password, link] = process.argv.slice(2);
if (!password || !link) {
    console.error('Использование: node tools/archive-link.js "Пароль" "https://ссылка"');
    process.exit(1);
}

const ITERATIONS = 200000;
const b64 = (buf) => Buffer.from(buf).toString('base64');

(async () => {
    const salt = webcrypto.getRandomValues(new Uint8Array(16));
    const iv = webcrypto.getRandomValues(new Uint8Array(12));
    const base = await subtle.importKey('raw', new TextEncoder().encode(password.trim()), 'PBKDF2', false, ['deriveKey']);
    const key = await subtle.deriveKey(
        { name: 'PBKDF2', salt, iterations: ITERATIONS, hash: 'SHA-256' },
        base, { name: 'AES-GCM', length: 256 }, false, ['encrypt']
    );
    const data = await subtle.encrypt({ name: 'AES-GCM', iv }, key, new TextEncoder().encode(link));
    console.log(`    const ARCHIVE = {
        iterations: ${ITERATIONS},
        salt: '${b64(salt)}',
        iv: '${b64(iv)}',
        data: '${b64(data)}',
    };`);
})();
