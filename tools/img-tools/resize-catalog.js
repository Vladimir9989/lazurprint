// Обработка фото товаров каталога: автообрезка по товару, квадрат, баланс белого, 300x300 JPG.
// Использование:
//   node resize-catalog.js <srcDir> <outDir> [--rot270 a.jpg,b.jpg] [--rot90 c.jpg] [--rot180 d.jpg]
//   --rot270 = повернуть на 90° против часовой (для кадров, лежащих на боку)
// Пример: node resize-catalog.js "..\..\src\images\Новая продукция" ".\out" --rot270 IMG_4593.jpg
const sharp = require('sharp');
const fs = require('fs');
const path = require('path');

const SAT = 28;      // порог насыщенности (max-min RGB): товар цветной, серый фон/белые поля — нет
const REL = 0.12;    // относительный порог столбца/строки от пика
const MARGIN = 0.5;  // поле вокруг товара (больше => мельче план)
const TARGET = 240;  // целевая яркость фона (баланс белого)
const MAXG = 1.9;    // кэп усиления канала
const SIZE = 300;
const QUALITY = 88;

function parseArgs(argv) {
  const a = { src: argv[2], out: argv[3], rot: {} };
  for (let i = 4; i < argv.length; i++) {
    const m = argv[i].match(/^--rot(90|180|270)$/);
    if (m && argv[i + 1]) {
      const deg = +m[1];
      argv[++i].split(',').forEach(f => { a.rot[f.trim()] = deg; });
    }
  }
  return a;
}

// bbox товара по насыщенности на уменьшенной копии; возвращает доли [x0,y0,x1,y1] в [0..1]
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

// средний цвет фона по 4 углам уменьшенной копии
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

async function processFile(file, srcDir, outDir, rotDeg) {
  const inPath = path.join(srcDir, file);
  // 1) поворот (если кадр лежит на боку) -> буфер с уже правильной ориентацией пикселей
  let base = sharp(inPath, { failOn: 'none' });
  if (rotDeg) base = base.rotate(rotDeg);          // явный угол => EXIF не применяется
  const buf = await base.toBuffer();
  const meta = await sharp(buf).metadata();

  // 2) уменьшенная копия для анализа
  const det = await sharp(buf).resize({ width: 500 }).removeAlpha().raw()
    .toBuffer({ resolveWithObject: true });
  const dw = det.info.width, dh = det.info.height, ch = det.info.channels;

  // 3) bbox товара + баланс белого
  const [fx0, fy0, fx1, fy1] = detectBbox(det.data, dw, dh, ch);
  const [bgR, bgG, bgB] = bgCorners(det.data, dw, dh, ch);
  const gains = [TARGET / bgR, TARGET / bgG, TARGET / bgB].map(g => Math.min(g, MAXG));

  // 4) bbox в полный размер -> квадрат + поле, с зажимом в границы кадра
  const bx = fx0 * meta.width, by = fy0 * meta.height;
  const bw = (fx1 - fx0) * meta.width, bh = (fy1 - fy0) * meta.height;
  const cx = bx + bw / 2, cy = by + bh / 2;
  let half = (Math.max(bw, bh) / 2) * (1 + MARGIN);
  half = Math.min(half, cx, meta.width - cx, cy, meta.height - cy);
  const left = Math.round(cx - half), top = Math.round(cy - half);
  const side = Math.round(half * 2);

  // 5) обрезка -> осветление -> 300x300 -> JPG
  const outPath = path.join(outDir, path.parse(file).name + '.jpg');
  await sharp(buf)
    .extract({ left, top, width: side, height: side })
    .linear(gains, [0, 0, 0])
    .resize(SIZE, SIZE, { fit: 'fill' })
    .jpeg({ quality: QUALITY, mozjpeg: true })
    .toFile(outPath);

  const kb = (fs.statSync(outPath).size / 1024).toFixed(1);
  console.log(
    `${file.padEnd(16)} ${rotDeg ? `rot${rotDeg} ` : '     '}` +
    `gains ${gains.map(g => g.toFixed(2)).join('/')}  crop ${side}px  ${kb} KB`
  );
}

(async () => {
  const { src, out, rot } = parseArgs(process.argv);
  if (!src || !out) { console.error('Укажи <srcDir> <outDir>'); process.exit(1); }
  fs.mkdirSync(out, { recursive: true });
  const files = fs.readdirSync(src).filter(f => /\.(jpe?g|png|webp)$/i.test(f)).sort();
  for (const f of files) await processFile(f, src, out, rot[f]);
  console.log('DONE:', files.length, 'файлов ->', out);
})().catch(e => { console.error(e); process.exit(1); });
