// Заливает содержимое build/ на хостинг NetAngels по FTP или SFTP
// (DEPLOY_PROTOCOL в .env). Перед запуском нужно выполнить `npm run build`,
// чтобы build/ был актуальным (см. npm-скрипт "predeploy", который делает
// это автоматически).
//
// Креды берутся из .env (см. .env.example) и НЕ должны попадать в git.
//
// Инкрементальность: после успешной заливки каждого файла его путь/размер/
// хеш содержимого (sha256) сразу сохраняются в .deploy-manifest.json (тоже
// не в git). В следующий раз заливаются только файлы, которых не было в
// манифесте или у которых изменился размер/хеш. Сравнение именно по хешу,
// а не по mtime: gulp при каждой сборке переписывает (и трогает mtime)
// вообще все файлы в build/, даже если их содержимое не менялось — при
// сравнении по mtime это означало бы перезаливку всего build/ (~2800
// файлов) при любой мелкой правке. Манифест пишется по ходу дела, а не
// только в конце — если соединение оборвётся на середине (FTP нестабилен
// на больших объёмах), повторный запуск продолжит с места обрыва, а не
// начнёт всё заново. Манифест можно удалить, если нужно гарантированно
// перезалить всё.
//
// При обрыве соединения посреди файла скрипт сам переподключается и
// повторяет именно этот файл (до 4 попыток). Если файл так и не залился —
// он просто пропускается (без остановки всей заливки) и попадёт в отчёт
// в конце; следующий запуск сам попробует его снова.
//
// Файлы больше DEPLOY_MAX_SIZE_MB (по умолчанию 50 МБ, см. .env) сразу
// пропускаются — большие видео не успевают залиться по FTP в таймаут
// хостинга, сколько раз ни переподключайся. Их проще закинуть руками
// через файловый менеджер (меняются редко).

require('dotenv').config({ quiet: true });
const path = require('path');
const fs = require('fs');
const crypto = require('crypto');

// На нестабильных FTP-соединениях (большие видео, таймауты) библиотека
// иногда роняет ошибку уже закрытого сокета асинхронно, уже после того как
// наш retry-цикл для этого файла отработал и пошёл дальше. Без этого
// перехвата такая "отложенная" ошибка валит весь процесс необработанным
// исключением, хотя по сути файл уже обработан (успешно или пропущен).
process.on('uncaughtException', (err) => {
    console.error(`Отложенная ошибка соединения (игнорирую, продолжаю): ${err.message}`);
});
process.on('unhandledRejection', (err) => {
    console.error(`Отложенная ошибка соединения (игнорирую, продолжаю): ${err && err.message}`);
});

const localDir = path.join(__dirname, 'build');
const protocol = (process.env.DEPLOY_PROTOCOL || 'sftp').toLowerCase();

// Креды под конкретный протокол: при sftp сначала берём DEPLOY_SFTP_* (если заданы),
// иначе — общие DEPLOY_*. Так FTP- и SFTP-настройки живут в .env рядом, и переключение
// между ними — это только смена DEPLOY_PROTOCOL, без переписывания логина/пароля/пути.
const pick = (base) => {
    if (protocol === 'sftp') {
        const v = process.env[`DEPLOY_SFTP_${base}`];
        if (v !== undefined && v !== '') return v;
    }
    return process.env[`DEPLOY_${base}`];
};
const deployHost = pick('HOST');
const deployUser = pick('USER');
const deployPassword = pick('PASSWORD');
const deployPort = Number(pick('PORT')) || (protocol === 'sftp' ? 22 : 21);
const remoteDir = pick('REMOTE_DIR');
const manifestPath = path.join(__dirname, '.deploy-manifest.json');
const maxSizeBytes = (Number(process.env.DEPLOY_MAX_SIZE_MB) || 50) * 1024 * 1024;

// Файлы, которые заливаются ТОЛЬКО вручную через файловый менеджер — деплой их всегда
// пропускает (как и файлы больше maxSizeBytes). Пути — относительно build/, через '/'.
// Раньше сюда попадали средние видео (~30–45 МБ), которые таймаутили по FTP; после
// перехода на SFTP+fastPut они заливаются штатно, поэтому список пуст. Оставлен как
// точка расширения: если какой-то файл будет упорно рвать заливку — вписать сюда.
const manualSkip = new Set([]);

if (!fs.existsSync(localDir)) {
    console.error('Папка build/ не найдена. Сначала выполни `npm run build`.');
    process.exit(1);
}

if (!deployHost || !deployUser || !deployPassword || !remoteDir) {
    const suffix = protocol === 'sftp' ? ' (для sftp — DEPLOY_SFTP_* или общие DEPLOY_*)' : '';
    console.error(`В .env не заданы HOST / USER / PASSWORD / REMOTE_DIR${suffix}.`);
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

function hashFile(filePath) {
    return crypto.createHash('sha256').update(fs.readFileSync(filePath)).digest('hex');
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
                host: deployHost,
                port: deployPort,
                user: deployUser,
                password: deployPassword,
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
                host: deployHost,
                port: deployPort,
                username: deployUser,
                password: deployPassword,
            });
            madeDirs = new Set();
        },
        async uploadOne(relPath) {
            const rDir = remoteDirOf(relPath);
            if (!madeDirs.has(rDir)) {
                await sftp.mkdir(rDir, true);
                madeDirs.add(rDir);
            }
            // fastPut (параллельные чанки) — на этом хостинге ~3.5x быстрее обычного put
            // (проверено: 43 МБ за 105 c против 374 c). put упирается в одно окно SFTP.
            await sftp.fastPut(path.join(localDir, relPath), `${remoteDir}/${relPath}`, {
                concurrency: 64,
                chunkSize: 32768,
            });
        },
        async close() {
            await sftp.end();
        },
    };
}

(async () => {
    const allFiles = walk(localDir);
    const manifest = loadManifest();

    const candidates = allFiles.filter((relPath) => {
        const filePath = path.join(localDir, relPath);
        const stat = fs.statSync(filePath);
        const prev = manifest[relPath];

        if (!prev) return true; // новый файл — заливаем
        if (prev.size !== stat.size) return true; // размер другой — точно менялся

        // Размер совпал — сверяем по хешу содержимого, а не по mtime
        // (mtime у gulp меняется при каждой пересборке независимо от
        // реальных изменений). Если это старая запись манифеста (ещё без
        // хеша, до перехода на эту схему) — считаем файл неизменным и
        // просто дописываем ему хеш, не перезаливая заново.
        const hash = hashFile(filePath);
        if (!prev.hash) {
            manifest[relPath] = { size: stat.size, hash };
            return false;
        }
        return prev.hash !== hash;
    });

    // Сохраняем манифест сразу после фильтрации — там могли досчитаться
    // хеши для старых записей (см. выше), это нужно сохранить, даже если
    // ниже окажется, что заливать нечего.
    saveManifest(manifest);

    const skippedLarge = candidates.filter(
        (relPath) => fs.statSync(path.join(localDir, relPath)).size > maxSizeBytes
    );
    const skippedManual = candidates.filter(
        (relPath) => manualSkip.has(relPath) && !skippedLarge.includes(relPath)
    );
    const changedFiles = candidates.filter(
        (relPath) => !skippedLarge.includes(relPath) && !skippedManual.includes(relPath)
    );

    if (skippedLarge.length) {
        console.log(`Пропущено больших файлов (> ${maxSizeBytes / 1024 / 1024} МБ) — залей их вручную через файловый менеджер:`);
        skippedLarge.forEach((f) => console.log('  -', f));
    }

    if (skippedManual.length) {
        console.log('Пропущено файлов из ручного списка (manualSkip, заливаются только через файловый менеджер):');
        skippedManual.forEach((f) => console.log('  -', f));
    }

    if (changedFiles.length === 0) {
        console.log('Нет изменённых файлов (кроме пропущенных больших) с последнего деплоя — заливать нечего.');
        return;
    }

    console.log(`Файлов всего: ${allFiles.length}, к заливке: ${changedFiles.length}.`);
    console.log(`Заливаю по ${protocol.toUpperCase()} -> ${deployHost}:${remoteDir} ...`);

    const uploader = protocol === 'ftp' ? await makeFtpUploader() : await makeSftpUploader();
    await uploader.connect();

    let uploaded = 0;
    const failed = [];
    try {
        for (const relPath of changedFiles) {
            console.log(`  [${uploaded + failed.length + 1}/${changedFiles.length}] ${relPath}`);
            let attempt = 0;
            let ok = false;
            while (!ok) {
                try {
                    await uploader.uploadOne(relPath);
                    ok = true;
                } catch (err) {
                    attempt++;
                    if (attempt > 4) {
                        console.error(`Не удалось залить ${relPath} после ${attempt} попыток: ${err.message} — пропускаю.`);
                        failed.push(relPath);
                        break;
                    }
                    console.error(`Сбой на ${relPath} (${err.message}) — переподключаюсь, попытка ${attempt + 1}...`);
                    try { await uploader.close(); } catch { /* соединение и так мертво */ }
                    await new Promise((resolve) => setTimeout(resolve, 2000));
                    await uploader.connect();
                }
            }

            if (ok) {
                const filePath = path.join(localDir, relPath);
                const stat = fs.statSync(filePath);
                manifest[relPath] = { size: stat.size, hash: hashFile(filePath) };
                saveManifest(manifest);
                uploaded++;
            }
        }
        console.log(`Готово: залито файлов — ${uploaded}/${changedFiles.length}.`);
        if (failed.length) {
            console.log('Не удалось залить (попробуются автоматически при следующем запуске):');
            failed.forEach((f) => console.log('  -', f));
        }
    } finally {
        try { await uploader.close(); } catch { /* уже закрыто/мертво */ }
    }
})();
