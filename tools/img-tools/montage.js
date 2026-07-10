// Контактный лист: собирает все картинки из папки в одну png-сетку с подписями.
// Использование: node montage.js <dir> <outFile.png> [cols]
const sharp = require('sharp');
const fs = require('fs');
const path = require('path');

const CELL = 300, LAB = 22, PAD = 6;

function esc(s) { return s.replace(/&/g, '&amp;').replace(/</g, '&lt;').replace(/>/g, '&gt;'); }

(async () => {
  const dir = process.argv[2], outFile = process.argv[3];
  const cols = +(process.argv[4] || 5);
  const files = fs.readdirSync(dir).filter(f => /\.(jpe?g|png|webp)$/i.test(f)).sort();
  const rows = Math.ceil(files.length / cols);
  const W = cols * (CELL + PAD) + PAD, H = rows * (CELL + LAB + PAD) + PAD;

  const composites = [];
  for (let i = 0; i < files.length; i++) {
    const r = Math.floor(i / cols), c = i % cols;
    const x = PAD + c * (CELL + PAD), y = PAD + r * (CELL + LAB + PAD);
    const label = Buffer.from(
      `<svg width="${CELL}" height="${LAB}"><text x="0" y="15" font-family="Arial" font-size="12" fill="#c00">${esc(files[i])}</text></svg>`
    );
    const tile = await sharp(path.join(dir, files[i])).resize(CELL, CELL, { fit: 'fill' }).toBuffer();
    composites.push({ input: label, left: x, top: y });
    composites.push({ input: tile, left: x, top: y + LAB });
  }
  await sharp({ create: { width: W, height: H, channels: 3, background: '#fff' } })
    .composite(composites).png().toFile(outFile);
  console.log('montage ->', outFile, `(${files.length} шт.)`);
})().catch(e => { console.error(e); process.exit(1); });
