// Выполняет один PHP CLI-файл админ-панели на хостинге NetAngels по SSH —
// нужен, чтобы синхронизировать флаги продовой базы админки (see
// admin/README.md, разделы «Публикация новой продукции» и «Обновление
// данных уже опубликованного товара»): admin/tools/link-site-image.php и
// admin/tools/mark-site-updated.php должны выполняться против прод-базы
// на хостинге, а не против локальной базы разработчика (Laragon) — та
// отдельная и не совпадает с тем, что видят Ксюша/Надя.
//
// ВАЖНО: запускать эти команды только ПОСЛЕ реального `npm run deploy` —
// иначе в админке карточка покажется «опубликована»/«обновлена» раньше,
// чем правка появится на живом сайте (см. CLAUDE.md, раздел «Админ-панель
// учёта продукции»).
//
// Креды — те же DEPLOY_SFTP_* из .env, что и для deploy.js (тот же
// SSH-аккаунт c112136 используется и для заливки сайта, и для админки).
//
// Использование:
//   node admin-remote-exec.js admin/tools/mark-site-updated.php 9
//   node admin-remote-exec.js admin/tools/link-site-image.php 12 "images/img/rs/Futbolki/xyz/xyz-01.jpg"

require('dotenv').config();
const { Client } = require('ssh2');

const REMOTE_BASE = '/home/c112136/lazurprint.ru/www';

const args = process.argv.slice(2);
if (!args.length || !args[0].startsWith('admin/tools/')) {
    console.error('Использование: node admin-remote-exec.js admin/tools/<script>.php [аргументы...]');
    process.exit(1);
}

const remoteScript = `${REMOTE_BASE}/${args[0]}`;
const scriptArgs = args.slice(1).map((a) => `'${a.replace(/'/g, "'\\''")}'`).join(' ');
const cmd = `php ${remoteScript} ${scriptArgs}`.trim();

const conn = new Client();
conn.on('ready', () => {
    conn.exec(cmd, (err, stream) => {
        if (err) {
            console.error('Ошибка выполнения:', err.message);
            conn.end();
            process.exitCode = 1;
            return;
        }
        let out = '';
        let errOut = '';
        stream
            .on('close', (code) => {
                if (out) process.stdout.write(out);
                if (errOut) process.stderr.write(errOut);
                conn.end();
                process.exitCode = code;
            })
            .on('data', (d) => { out += d.toString(); })
            .stderr.on('data', (d) => { errOut += d.toString(); });
    });
}).on('error', (err) => {
    console.error('Ошибка подключения по SSH:', err.message);
    process.exitCode = 1;
}).connect({
    host: process.env.DEPLOY_SFTP_HOST,
    port: Number(process.env.DEPLOY_SFTP_PORT || 22),
    username: process.env.DEPLOY_SFTP_USER,
    password: process.env.DEPLOY_SFTP_PASSWORD,
    readyTimeout: 15000,
});
