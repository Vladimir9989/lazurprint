// Замена фона вокруг открытки на чистый белый — БЕЗ обрезки и цветокоррекции самой открытки.
// Открытка занимает центр кадра, вокруг — сероватая поверхность стола (с градиентом/тенью).
//
// Метод (надёжный против «протечки» в рисунок):
//  1) Фон-кандидат = НЕЙТРАЛЬНЫЙ (низкая насыщенность, как серый/белый стол) И не слишком тёмный.
//     Абсолютный критерий, НЕ градиент от соседа: цветное небо/рамка/бежевая бумага открытки
//     насыщены -> не фон, поэтому заливка не «прокатывается» по гладким цветным областям открытки.
//  2) Настоящий фон = фон-кандидаты, СВЯЗНЫЕ с краем кадра (flood-fill 4-связность от периметра).
//     Нейтральные детали ВНУТРИ открытки (белые поля, серый рисунок) окружены рисунком и до края
//     не связаны -> остаются частью открытки (внутренние «дыры» не выбеливаются).
//  3) Геометрический предохранитель: грубо оценивается прямоугольник открытки; во внутреннее
//     «ядро» (сжатый прямоугольник) заливка не допускается вообще — даже если светлый край
//     открытки прошёл по критерию нейтральности, центр рисунка защищён гарантированно.
//  4) Фон -> #ffffff, по краю мягкое перо (blur маски). Размер кадра НЕ меняется.
//
// Использование:
//   node otkrytki-whiten.js <srcDir> <outDir> [--sat N] [--lum N] [--core F] [--feather F]
const sharp = require('sharp');
const fs = require('fs');
const path = require('path');

function parseArgs(argv) {
  const a = { src: argv[2], out: argv[3], sat: 30, lum: 120, core: 0.55, feather: 1.0 };
  for (let i = 4; i < argv.length; i++) {
    if (argv[i] === '--sat') a.sat = +argv[++i];
    else if (argv[i] === '--lum') a.lum = +argv[++i];
    else if (argv[i] === '--core') a.core = +argv[++i];   // доля полуразмера bbox -> ядро-барьер
    else if (argv[i] === '--feather') a.feather = +argv[++i];
  }
  return a;
}

async function processFile(file, srcDir, outDir, SAT, LUM, CORE, FEATHER) {
  const inPath = path.join(srcDir, file);
  const buf = await sharp(inPath, { failOn: 'none' }).toBuffer();
  const { data, info } = await sharp(buf).removeAlpha().raw().toBuffer({ resolveWithObject: true });
  const W = info.width, H = info.height, N = W * H;

  // 1) карта фон-кандидатов (нейтральный и не тёмный)
  const cand = new Uint8Array(N);
  for (let i = 0; i < N; i++) {
    const o = i * 3, r = data[o], g = data[o + 1], b = data[o + 2];
    const mx = Math.max(r, g, b), mn = Math.min(r, g, b);
    const lum = (r + g + b) / 3;
    if (mx - mn <= SAT && lum >= LUM) cand[i] = 1;
  }

  // 3a) грубый bbox открытки по «не-кандидатам» (плотность fg по строкам/столбцам)
  const colF = new Float32Array(W), rowF = new Float32Array(H);
  for (let y = 0; y < H; y++)
    for (let x = 0; x < W; x++)
      if (!cand[y * W + x]) { colF[x]++; rowF[y]++; }
  const span = (arr, len, cross) => {
    const thr = 0.22 * cross;         // доля «не-фона» в линии, чтобы считать её частью открытки
    let a = -1, b = -1;
    for (let i = 0; i < len; i++) if (arr[i] > thr) { if (a < 0) a = i; b = i; }
    if (a < 0) { a = 0; b = len - 1; }
    return [a, b];
  };
  const [x0, x1] = span(colF, W, H);
  const [y0, y1] = span(rowF, H, W);
  // ядро — прямоугольник, сжатый к центру: сюда flood не пускаем
  const cx = (x0 + x1) / 2, cy = (y0 + y1) / 2;
  const kx0 = cx - (cx - x0) * CORE, kx1 = cx + (x1 - cx) * CORE;
  const ky0 = cy - (cy - y0) * CORE, ky1 = cy + (y1 - cy) * CORE;

  // 2) flood-fill фона от периметра по кандидатам, но не заходя в ядро
  const isBg = new Uint8Array(N);
  const q = new Int32Array(N);
  let head = 0, tail = 0;
  const inCore = (x, y) => (x >= kx0 && x <= kx1 && y >= ky0 && y <= ky1);
  const seed = (x, y) => {
    const i = y * W + x;
    if (!isBg[i] && cand[i] && !inCore(x, y)) { isBg[i] = 1; q[tail++] = i; }
  };
  for (let x = 0; x < W; x++) { seed(x, 0); seed(x, H - 1); }
  for (let y = 0; y < H; y++) { seed(0, y); seed(W - 1, y); }
  const tryN = (i, x, y) => {
    if (isBg[i] || !cand[i] || inCore(x, y)) return;
    isBg[i] = 1; q[tail++] = i;
  };
  while (head < tail) {
    const i = q[head++], x = i % W, y = (i / W) | 0;
    if (x + 1 < W) tryN(i + 1, x + 1, y);
    if (x - 1 >= 0) tryN(i - 1, x - 1, y);
    if (y + 1 < H) tryN(i + W, x, y + 1);
    if (y - 1 >= 0) tryN(i - W, x, y - 1);
  }

  // маска открытки = не фон
  const mask = Buffer.alloc(N);
  let bg = 0;
  for (let i = 0; i < N; i++) { if (isBg[i]) bg++; else mask[i] = 255; }

  // 4) перо + композит на белый
  const maskB = await sharp(mask, { raw: { width: W, height: H, channels: 1 } })
    .blur(FEATHER).toColourspace('b-w').raw().toBuffer();
  const out = Buffer.alloc(N * 3);
  for (let i = 0; i < N; i++) {
    const a = maskB[i] / 255, o = i * 3;
    out[o]     = Math.round(data[o]     * a + 255 * (1 - a));
    out[o + 1] = Math.round(data[o + 1] * a + 255 * (1 - a));
    out[o + 2] = Math.round(data[o + 2] * a + 255 * (1 - a));
  }
  const outPath = path.join(outDir, file);
  await sharp(out, { raw: { width: W, height: H, channels: 3 } })
    .jpeg({ quality: 92, mozjpeg: true }).toFile(outPath);

  console.log(`${file.padEnd(34)} ${W}x${H}  фон ${(100 * bg / N).toFixed(0)}%  bbox ${x1 - x0}x${y1 - y0}`);
}

(async () => {
  const { src, out, sat, lum, core, feather } = parseArgs(process.argv);
  if (!src || !out) { console.error('Укажи <srcDir> <outDir>'); process.exit(1); }
  fs.mkdirSync(out, { recursive: true });
  const files = fs.readdirSync(src).filter(f => /\.(jpe?g|png|webp)$/i.test(f)).sort();
  for (const f of files) await processFile(f, src, out, sat, lum, core, feather);
  console.log('DONE:', files.length, '->', out, `(sat=${sat}, lum=${lum}, core=${core}, feather=${feather})`);
})().catch(e => { console.error(e); process.exit(1); });
