// Обработка магнитов «Я люблю Реж» (арт. 9824): .jfif -> плотная автообрезка по магниту,
// баланс белого, вписывание в квадрат 300x300 на фоне карточки (#f8f8f8), JPG.
// Магниты горизонтальные (50*70, лежат в широком белом кадре 1920x864) — в отличие от
// resize-catalog.js здесь не вырезаем квадрат вокруг товара (тогда магнит был бы мелким
// с большими полями), а обрезаем плотно по магниту и вписываем contain'ом в квадрат.
// Использование: node magnity-rezh.js <srcDir> <outDir> [--preview grid.png]
const sharp = require('sharp');
const fs = require('fs');
const path = require('path');

const SAT = 26;      // порог насыщенности (max-min RGB): магнит цветной, серо-белый фон — нет
const REL = 0.10;    // относительный порог столбца/строки от пика
const MARGIN = 0.03; // небольшое поле вокруг магнита (доля от его размера)
const TARGET = 246;  // целевая яркость фона (баланс белого)
const MAXG = 1.6;    // кэп усиления канала
const SIZE = 300;
const PAD = { r: 248, g: 248, b: 248 }; // #f8f8f8 — фон карточки каталога
const QUALITY = 88;

function detectBbox(data, w, h, ch) {
  const col = new Int32Array(w), row = new Int32Array(h);
  for (let y = 0; y < h; y++) {
    for (let x = 0; x < w; x++) {
      const o = (y * w + x) * ch;
      const r = data[o], g = data[o + 1], b = data[o + 2];
      const mx = Math.max(r, g, b), mn = Math.min(r, g, b);
      if (mx - mn > SAT) { col[x]++; row[y]++; }
    }
  }
  const pk = Math.max(...col), pr = Math.max(...row);
  if (pk <= 0 || pr <= 0) return [0, 0, 1, 1];
  const ct = pk * REL, rt = pr * REL;
  let x0 = -1, x1 = -1, y0 = -1, y1 = -1;
  for (let x = 0; x < w; x++) if (col[x] > ct) { if (x0 < 0) x0 = x; x1 = x; }
  for (let y = 0; y < h; y++) if (row[y] > rt) { if (y0 < 0) y0 = y; y1 = y; }
  if (x0 < 0 || y0 < 0) return [0, 0, 1, 1];
  return [x0 / w, y0 / h, (x1 + 1) / w, (y1 + 1) / h];
}

function bgCorners(data, w, h, ch) {
  const s = 12, pts = [[0, 0], [w - s, 0], [0, h - s], [w - s, h - s]];
  let sr = 0, sg = 0, sb = 0, n = 0;
  for (const [cx, cy] of pts)
    for (let y = 0; y < s; y++)
      for (let x = 0; x < s; x++) {
        const o = ((cy + y) * w + (cx + x)) * ch;
        sr += data[o]; sg += data[o + 1]; sb += data[o + 2]; n++;
      }
  return [sr / n, sg / n, sb / n];
}

async function processOne(inPath) {
  const buf = await sharp(inPath, { failOn: 'none' }).toBuffer();
  const meta = await sharp(buf).metadata();
  const det = await sharp(buf).resize({ width: 500 }).removeAlpha().raw()
    .toBuffer({ resolveWithObject: true });
  const dw = det.info.width, dh = det.info.height, ch = det.info.channels;

  const [fx0, fy0, fx1, fy1] = detectBbox(det.data, dw, dh, ch);
  const [bgR, bgG, bgB] = bgCorners(det.data, dw, dh, ch);
  const gains = [TARGET / bgR, TARGET / bgG, TARGET / bgB].map(g => Math.min(g, MAXG));

  // bbox -> полный размер + небольшое поле, зажатое в границы кадра
  let bx = fx0 * meta.width, by = fy0 * meta.height;
  let bw = (fx1 - fx0) * meta.width, bh = (fy1 - fy0) * meta.height;
  const mx = bw * MARGIN, my = bh * MARGIN;
  const left = Math.max(0, Math.round(bx - mx));
  const top = Math.max(0, Math.round(by - my));
  const right = Math.min(meta.width, Math.round(bx + bw + mx));
  const bottom = Math.min(meta.height, Math.round(by + bh + my));

  // обрезка -> баланс белого -> вписать contain в квадрат на #f8f8f8
  const out = await sharp(buf)
    .extract({ left, top, width: right - left, height: bottom - top })
    .linear(gains, [0, 0, 0])
    .resize(SIZE, SIZE, { fit: 'contain', background: PAD })
    .flatten({ background: PAD })
    .jpeg({ quality: QUALITY, mozjpeg: true })
    .toBuffer();
  return { out, gains, crop: `${right - left}x${bottom - top}` };
}

(async () => {
  const src = process.argv[2], outDir = process.argv[3];
  const previewIdx = process.argv.indexOf('--preview');
  const previewPath = previewIdx > 0 ? process.argv[previewIdx + 1] : null;
  if (!src) { console.error('Укажи <srcDir> <outDir>'); process.exit(1); }
  const files = fs.readdirSync(src).filter(f => /\.(jfif|jpe?g|png|webp)$/i.test(f)).sort();

  const thumbs = [];
  for (const f of files) {
    const { out, gains, crop } = await processOne(path.join(src, f));
    if (outDir) {
      fs.mkdirSync(outDir, { recursive: true });
      const outPath = path.join(outDir, path.parse(f).name + '.jpg');
      fs.writeFileSync(outPath, out);
    }
    if (previewPath) thumbs.push(out);
    console.log(`${f.padEnd(42)} gains ${gains.map(g => g.toFixed(2)).join('/')}  crop ${crop}`);
  }

  if (previewPath && thumbs.length) {
    const cols = 5, rows = Math.ceil(thumbs.length / cols), cell = SIZE + 8;
    const comp = thumbs.map((b, i) => ({ input: b, left: (i % cols) * cell + 4, top: Math.floor(i / cols) * cell + 4 }));
    await sharp({ create: { width: cols * cell, height: rows * cell, channels: 3, background: '#cccccc' } })
      .composite(comp).png().toFile(previewPath);
    console.log('preview ->', previewPath);
  }
  console.log('DONE:', files.length);
})().catch(e => { console.error(e); process.exit(1); });
