// Заливает содержимое build/ на хостинг NetAngels по SFTP.
// Перед запуском нужно выполнить `npm run build`, чтобы build/ был актуальным
// (см. npm-скрипт "predeploy", который делает это автоматически).
//
// Креды берутся из .env (см. .env.example) и НЕ должны попадать в git.

require('dotenv').config();
const path = require('path');
const fs = require('fs');
const Client = require('ssh2-sftp-client');

const localDir = path.join(__dirname, 'build');
const remoteDir = process.env.DEPLOY_REMOTE_DIR;

if (!fs.existsSync(localDir)) {
    console.error('Папка build/ не найдена. Сначала выполни `npm run build`.');
    process.exit(1);
}

if (!process.env.DEPLOY_HOST || !process.env.DEPLOY_USER || !process.env.DEPLOY_PASSWORD || !remoteDir) {
    console.error('В .env не заданы DEPLOY_HOST / DEPLOY_USER / DEPLOY_PASSWORD / DEPLOY_REMOTE_DIR.');
    console.error('Скопируй .env.example в .env и заполни реальными данными.');
    process.exit(1);
}

(async () => {
    const sftp = new Client();
    try {
        await sftp.connect({
            host: process.env.DEPLOY_HOST,
            port: Number(process.env.DEPLOY_PORT) || 22,
            username: process.env.DEPLOY_USER,
            password: process.env.DEPLOY_PASSWORD,
        });

        console.log(`Заливаю ${localDir} -> ${process.env.DEPLOY_HOST}:${remoteDir} ...`);
        await sftp.uploadDir(localDir, remoteDir);
        console.log('Готово: сайт обновлён на хостинге.');
    } catch (err) {
        console.error('Ошибка деплоя:', err.message);
        process.exitCode = 1;
    } finally {
        await sftp.end();
    }
})();
