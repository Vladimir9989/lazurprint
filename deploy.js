// Заливает содержимое build/ на хостинг NetAngels по FTP или SFTP
// (DEPLOY_PROTOCOL в .env). Перед запуском нужно выполнить `npm run build`,
// чтобы build/ был актуальным (см. npm-скрипт "predeploy", который делает
// это автоматически).
//
// Креды берутся из .env (см. .env.example) и НЕ должны попадать в git.
//
// Инкрементальность: после успешной заливки каждого файла его путь/размер/
// mtime сразу сохраняются в .deploy-manifest.json (тоже не в git). В
// следующий раз заливаются только файлы, которых не было в манифесте или
// у которых изменился размер/время изменения. Манифест пишется по ходу
// дела, а не только в конце — если соединение оборвётся на середине (FTP
// нестабилен на больших объёмах), повторный запуск продолжит с места
// обрыва, а не начнёт всё заново. Манифест можно удалить, если нужно
// гарантированно перезалить всё.
//
// При обрыве соединения посреди файла скрипт сам переподключается и
// повторяет именно этот файл (до 3 попыток).

require('dotenv').config();
const path = require('path');
const fs = require('fs');

const localDir = path.join(__dirname, 'build');
const remoteDir = process.env.DEPLOY_REMOTE_DIR;
const protocol = (process.env.DEPLOY_PROTOCOL || 'sftp').toLowerCase();
const manifestPath = path.join(__dirname, '.deploy-manifest.json');

if (!fs.existsSync(localDir)) {
    console.error('Папка build/ не найдена. Сначала выполни `npm run build`.');
    process.exit(1);
}

if (!process.env.DEPLOY_HOST || !process.env.DEPLOY_USER || !process.env.DEPLOY_PASSWORD || !remoteDir) {
    console.error('В .env не заданы DEPLOY_HOST / DEPLOY_USER / DEPLOY_PASSWORD / DEPLOY_REMOTE_DIR.');
    console.error('Скопируй .env.example в .env и заполни реальными данными.');
    process.exit(1);
}

function walk(dir, base = dir, files = []) {
    for (const entry of fs.readdirSync(dir, { withFileTypes: true })) {
        const full = path.join(dir, entry.name);
        if (entry.isDirectory()) {
            walk(full, base, files);
        } else {
            files.push(path.relative(base, full).split(path.sep).join('/'));
        }
    }
    return files;
}

function loadManifest() {
    if (!fs.existsSync(manifestPath)) return {};
    try {
        return JSON.parse(fs.readFileSync(manifestPath, 'utf8'));
    } catch {
        return {};
    }
}

function saveManifest(manifest) {
    fs.writeFileSync(manifestPath, JSON.stringify(manifest));
}

function remoteDirOf(relPath) {
    const dir = path.dirname(relPath);
    return dir === '.' ? remoteDir : `${remoteDir}/${dir}`;
}

async function makeFtpUploader() {
    const ftp = require('basic-ftp');
    let client;
    let madeDirs;
    return {
        async connect() {
            client = new ftp.Client(60000);
            client.ftp.verbose = false;
            await client.access({
                host: process.env.DEPLOY_HOST,
                port: Number(process.env.DEPLOY_PORT) || 21,
                user: process.env.DEPLOY_USER,
                password: process.env.DEPLOY_PASSWORD,
            });
            madeDirs = new Set();
        },
        async uploadOne(relPath) {
            const rDir = remoteDirOf(relPath);
            if (!madeDirs.has(rDir)) {
                await client.ensureDir(rDir);
                madeDirs.add(rDir);
                await client.cd('/');
            }
            await client.uploadFrom(path.join(localDir, relPath), `${rDir}/${path.basename(relPath)}`);
        },
        async close() {
            client.close();
        },
    };
}

async function makeSftpUploader() {
    const Client = require('ssh2-sftp-client');
    let sftp;
    let madeDirs;
    return {
        async connect() {
            sftp = new Client();
            await sftp.connect({
                host: process.env.DEPLOY_HOST,
                port: Number(process.env.DEPLOY_PORT) || 22,
                username: process.env.DEPLOY_USER,
                password: process.env.DEPLOY_PASSWORD,
            });
            madeDirs = new Set();
        },
        async uploadOne(relPath) {
            const rDir = remoteDirOf(relPath);
            if (!madeDirs.has(rDir)) {
                await sftp.mkdir(rDir, true);
                madeDirs.add(rDir);
            }
            await sftp.put(path.join(localDir, relPath), `${remoteDir}/${relPath}`);
        },
        async close() {
            await sftp.end();
        },
    };
}

(async () => {
    const allFiles = walk(localDir);
    const manifest = loadManifest();

    const changedFiles = allFiles.filter((relPath) => {
        const stat = fs.statSync(path.join(localDir, relPath));
        const prev = manifest[relPath];
        return !prev || prev.size !== stat.size || prev.mtimeMs !== stat.mtimeMs;
    });

    if (changedFiles.length === 0) {
        console.log('Нет изменённых файлов с последнего деплоя — заливать нечего.');
        return;
    }

    console.log(`Файлов всего: ${allFiles.length}, изменённых/новых: ${changedFiles.length}.`);
    console.log(`Заливаю по ${protocol.toUpperCase()} -> ${process.env.DEPLOY_HOST}:${remoteDir} ...`);

    const uploader = protocol === 'ftp' ? await makeFtpUploader() : await makeSftpUploader();
    await uploader.connect();

    let uploaded = 0;
    try {
        for (const relPath of changedFiles) {
            let attempt = 0;
            for (;;) {
                try {
                    await uploader.uploadOne(relPath);
                    break;
                } catch (err) {
                    attempt++;
                    if (attempt > 3) {
                        throw new Error(`Не удалось залить ${relPath} после ${attempt} попыток: ${err.message}`);
                    }
                    console.error(`Сбой на ${relPath} (${err.message}) — переподключаюсь, попытка ${attempt + 1}...`);
                    try { await uploader.close(); } catch { /* соединение и так мертво */ }
                    await new Promise((resolve) => setTimeout(resolve, 2000));
                    await uploader.connect();
                }
            }

            const stat = fs.statSync(path.join(localDir, relPath));
            manifest[relPath] = { size: stat.size, mtimeMs: stat.mtimeMs };
            saveManifest(manifest);
            uploaded++;
        }
        console.log(`Готово: залито файлов — ${uploaded}/${changedFiles.length}.`);
    } catch (err) {
        console.error(`Остановлено на ${uploaded}/${changedFiles.length}. Ошибка: ${err.message}`);
        console.error('Прогресс сохранён — просто запусти деплой ещё раз, он продолжит с этого места.');
        process.exitCode = 1;
    } finally {
        try { await uploader.close(); } catch { /* уже закрыто/мертво */ }
    }
})();
