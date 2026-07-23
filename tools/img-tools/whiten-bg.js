// Заменяет фон на ИДЕАЛЬНО белый (#ffffff), сам товар не трогает: маска по насыщенности
// (+ дилатация и мягкое перо по краю), всё, что не товар, — чистый белый, без теней/градиентов.
// Использование: node whiten-bg.js <dir> [--preview grid.png]
// Обрабатывает все jpg в <dir> НА МЕСТЕ (перезаписывает).
const sharp = require('sharp');
const fs = require('fs');
const path = require('path');
const { execFileSync } = require('child_process');

const SAT = 28;        // порог насыщенности: товар цветной, фон — нет
const DILATE = 5;       // раздуть маску товара на N px (убрать цветной ореол по краям)
const FEATHER = 3;      // радиус размытия края маски (сглаживание кромки среза)
// если > 0: заливка от края не уходит дальше BAND px вглубь кадра (спасает от
// протекания через просветы в рисунке — буквы, ветки — когда бледные/малонасыщенные
// детали товара соприкасаются с краем кадра). Задаётся флагом --band N.
const BAND = (() => {
  const i = process.argv.indexOf('--band');
  return i >= 0 ? +process.argv[i + 1] : 0;
})();
const QUALITY = 88;

function buildMask(data, w, h, ch) {
  // low-sat[i] = true, если пиксель недостаточно насыщен, чтобы быть товаром
  const lowSat = new Uint8Array(w * h);
  for (let i = 0, p = 0; i < w * h; i++, p += ch) {
    const r = data[p], g = data[p + 1], b = data[p + 2];
    const mx = Math.max(r, g, b), mn = Math.min(r, g, b);
    if (mx - mn <= SAT) lowSat[i] = 1;
  }

  // фон = только те малонасыщенные пиксели, что связаны (4-connectivity) с рамкой
  // кадра. Так не теряются малонасыщенные участки ВНУТРИ товара (белые стены,
  // светлое небо в рисунке) — они не касаются края и остаются товаром.
  // BAND дополнительно ограничивает распространение по расстоянию от края.
  // BFS (не DFS!) — важно для корректной геодезической дистанции до края при BAND>0
  const isBg = new Uint8Array(w * h);
  const dist = BAND > 0 ? new Uint16Array(w * h) : null;
  const queue = [];
  let qHead = 0;
  const pushIfBg = (x, y, d) => {
    const i = y * w + x;
    if (lowSat[i] && !isBg[i] && (!BAND || d <= BAND)) { isBg[i] = 1; if (dist) dist[i] = d; queue.push(i); }
  };
  for (let x = 0; x < w; x++) { pushIfBg(x, 0, 0); pushIfBg(x, h - 1, 0); }
  for (let y = 0; y < h; y++) { pushIfBg(0, y, 0); pushIfBg(w - 1, y, 0); }
  while (qHead < queue.length) {
    const i = queue[qHead++];
    const x = i % w, y = (i / w) | 0;
    const d = dist ? dist[i] + 1 : 0;
    if (x > 0) pushIfBg(x - 1, y, d);
    if (x < w - 1) pushIfBg(x + 1, y, d);
    if (y > 0) pushIfBg(x, y - 1, d);
    if (y < h - 1) pushIfBg(x, y + 1, d);
  }

  const mask = new Uint8Array(w * h);
  for (let i = 0; i < w * h; i++) if (!isBg[i]) mask[i] = 255;
  let cur = mask;
  for (let it = 0; it < DILATE; it++) {
    const next = new Uint8Array(cur);
    for (let y = 0; y < h; y++) {
      for (let x = 0; x < w; x++) {
        const i = y * w + x;
        if (cur[i]) continue;
        if ((x > 0 && cur[i - 1]) || (x < w - 1 && cur[i + 1]) ||
          (y > 0 && cur[i - w]) || (y < h - 1 && cur[i + w])) {
          next[i] = 255;
        }
      }
    }
    cur = next;
  }
  return cur;
}

async function processFile(inPath, outPath) {
  const { data, info } = await sharp(inPath).removeAlpha().raw().toBuffer({ resolveWithObject: true });
  const w = info.width, h = info.height, ch = info.channels;
  const mask = buildMask(data, w, h, ch);

  // мягкое перо по краю маски через блюр (toColourspace нужен, иначе sharp
  // после blur() расширяет одноканальный raw обратно в 3 канала — так внутри
  // единственного uint8-массива поплывёт stride и получатся полосы вместо картинки)
  const feathered = await sharp(Buffer.from(mask), { raw: { width: w, height: h, channels: 1 } })
    .blur(FEATHER)
    .toColourspace('b-w')
    .raw()
    .toBuffer();

  const out = Buffer.alloc(w * h * ch);
  for (let i = 0, p = 0; i < w * h; i++, p += ch) {
    const a = feathered[i] / 255; // 1 = товар, 0 = фон
    for (let c = 0; c < 3; c++) {
      out[p + c] = Math.round(data[p + c] * a + 255 * (1 - a));
    }
    if (ch === 4) out[p + 3] = data[p + 3];
  }

  await sharp(out, { raw: { width: w, height: h, channels: ch } })
    .jpeg({ quality: QUALITY, mozjpeg: true })
    .toFile(outPath);
}

(async () => {
  const dir = process.argv[2];
  if (!dir) { console.error('Укажи <dir>'); process.exit(1); }
  const previewIdx = process.argv.indexOf('--preview');
  const preview = previewIdx >= 0 ? process.argv[previewIdx + 1] : null;

  const files = fs.readdirSync(dir).filter(f => /\.jpe?g$/i.test(f)).sort();
  for (const f of files) {
    const p = path.join(dir, f);
    await processFile(p, p);
    console.log(f, 'whitened');
  }
  console.log('DONE:', files.length, 'файлов ->', dir);

  if (preview) {
    execFileSync('node', [path.join(__dirname, 'montage.js'), dir, preview, '4']);
  }
})().catch(e => { console.error(e); process.exit(1); });
