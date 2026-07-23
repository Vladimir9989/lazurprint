// Выравнивание неровного фона (виньетка/тени студийного света) на уже готовых
// квадратных фото каталога: локальная (не единая на весь кадр) коррекция яркости фона.
// Использование: node flatten-bg.js <dir> [--preview grid.png]
// Обрабатывает все jpg в <dir> НА МЕСТЕ (перезаписывает).
const sharp = require('sharp');
const fs = require('fs');
const path = require('path');
const { execFileSync } = require('child_process');

const SAT = 28;       // порог насыщенности: товар цветной, фон — нет
const DILATE = 6;      // на сколько px "раздуть" маску товара (убрать цветной ореол по краям)
const RADIUS = 70;     // радиус локального усреднения фона (доля от размера кадра)
const TARGET = 245;    // целевая яркость фона
const MAXG = 2.2;      // кэп усиления вверх
const MING = 0.6;      // кэп усиления вниз
const QUALITY = 88;

function buildProductMask(data, w, h, ch) {
  const mask = new Uint8Array(w * h); // 1 = товар
  for (let i = 0, p = 0; i < w * h; i++, p += ch) {
    const r = data[p], g = data[p + 1], b = data[p + 2];
    const mx = Math.max(r, g, b), mn = Math.min(r, g, b);
    if (mx - mn > SAT) mask[i] = 1;
  }
  // дилатация простым проходом (box) на DILATE px
  let cur = mask;
  for (let it = 0; it < DILATE; it++) {
    const next = new Uint8Array(cur);
    for (let y = 0; y < h; y++) {
      for (let x = 0; x < w; x++) {
        const i = y * w + x;
        if (cur[i]) continue;
        if ((x > 0 && cur[i - 1]) || (x < w - 1 && cur[i + 1]) ||
          (y > 0 && cur[i - w]) || (y < h - 1 && cur[i + w])) {
          next[i] = 1;
        }
      }
    }
    cur = next;
  }
  return cur;
}

// интегральные таблицы (summed-area) для быстрого усреднения по прямоугольнику
function integralOf(arr, w, h) {
  const sum = new Float64Array((w + 1) * (h + 1));
  for (let y = 0; y < h; y++) {
    let rowSum = 0;
    for (let x = 0; x < w; x++) {
      rowSum += arr[y * w + x];
      sum[(y + 1) * (w + 1) + (x + 1)] = sum[y * (w + 1) + (x + 1)] + rowSum;
    }
  }
  return sum;
}
function boxSum(integral, w, h, x0, y0, x1, y1) {
  x0 = Math.max(0, x0); y0 = Math.max(0, y0);
  x1 = Math.min(w - 1, x1); y1 = Math.min(h - 1, y1);
  const W = w + 1;
  return integral[(y1 + 1) * W + (x1 + 1)] - integral[(y0) * W + (x1 + 1)]
       - integral[(y1 + 1) * W + (x0)] + integral[(y0) * W + (x0)];
}

async function processFile(inPath, outPath) {
  const { data, info } = await sharp(inPath).removeAlpha().raw().toBuffer({ resolveWithObject: true });
  const w = info.width, h = info.height, ch = info.channels;
  const mask = buildProductMask(data, w, h, ch); // 1 = товар (исключить из фона)
  const bgWeight = new Float64Array(w * h);
  const chData = [new Float64Array(w * h), new Float64Array(w * h), new Float64Array(w * h)];
  for (let i = 0, p = 0; i < w * h; i++, p += ch) {
    const isBg = mask[i] ? 0 : 1;
    bgWeight[i] = isBg;
    chData[0][i] = data[p] * isBg;
    chData[1][i] = data[p + 1] * isBg;
    chData[2][i] = data[p + 2] * isBg;
  }
  const weightInt = integralOf(bgWeight, w, h);
  const chInt = chData.map(c => integralOf(c, w, h));

  const globalW = boxSum(weightInt, w, h, 0, 0, w - 1, h - 1) || 1;
  const globalAvg = [0, 1, 2].map(c => boxSum(chInt[c], w, h, 0, 0, w - 1, h - 1) / globalW);

  const out = Buffer.alloc(w * h * ch);
  for (let y = 0; y < h; y++) {
    for (let x = 0; x < w; x++) {
      const i = y * w + x, p = i * ch;
      const x0 = x - RADIUS, x1 = x + RADIUS, y0 = y - RADIUS, y1 = y + RADIUS;
      const wsum = boxSum(weightInt, w, h, x0, y0, x1, y1);
      for (let c = 0; c < 3; c++) {
        let bg;
        if (wsum > 4) {
          bg = boxSum(chInt[c], w, h, x0, y0, x1, y1) / wsum;
        } else {
          bg = globalAvg[c];
        }
        let gain = TARGET / Math.max(bg, 1);
        gain = Math.min(MAXG, Math.max(MING, gain));
        out[p + c] = Math.max(0, Math.min(255, Math.round(data[p + c] * gain)));
      }
      if (ch === 4) out[p + 3] = data[p + 3];
    }
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
    console.log(f, 'flattened');
  }
  console.log('DONE:', files.length, 'файлов ->', dir);

  if (preview) {
    execFileSync('node', [path.join(__dirname, 'montage.js'), dir, preview, '4']);
  }
})().catch(e => { console.error(e); process.exit(1); });
