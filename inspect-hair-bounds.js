const { app, nativeImage } = require('electron');
const path = require('path');
const fs = require('fs');

const p = 'C:/Users/hp/.gemini/antigravity-ide/brain/31db9470-0d36-42b9-9098-2ceae6d52096/.tempmediaStorage/media_1790277058739.jpg';
const img = nativeImage.createFromPath(p);
const size = img.getSize();
console.log('Sheet size:', size);
const bmp = img.toBitmap();

// Look at Side (Left) region:
// x from 115 to 245, y from 70 to 290
let minX = 999, maxX = -1, minY = 999, maxY = -1;

for (let y = 70; y < 290; y++) {
  for (let x = 115; x < 245; x++) {
    const idx = (y * size.width + x) * 4;
    const b = bmp[idx];
    const g = bmp[idx + 1];
    const r = bmp[idx + 2];

    // Background color in sheet is cream: r ~ 240..255, g ~ 230..250, b ~ 215..240
    // Floor shadow near y > 275: r > 180, g > 170, b > 155
    const isBg = (r > 220 && g > 210 && b > 195) || (y > 275 && r > 180 && g > 170 && b > 155);

    if (!isBg) {
      if (x < minX) minX = x;
      if (x > maxX) maxX = x;
      if (y < minY) minY = y;
      if (y > maxY) maxY = y;
    }
  }
}

console.log('Side (Left) full bounds on sheet:', { minX, maxX, minY, maxY, width: maxX - minX + 1, height: maxY - minY + 1 });

// Check top 15 rows of hair
for (let y = minY; y < minY + 15; y++) {
  let rowMinX = 999, rowMaxX = -1;
  for (let x = minX; x <= maxX; x++) {
    const idx = (y * size.width + x) * 4;
    const b = bmp[idx];
    const g = bmp[idx + 1];
    const r = bmp[idx + 2];
    const isBg = (r > 220 && g > 210 && b > 195);
    if (!isBg) {
      if (x < rowMinX) rowMinX = x;
      if (x > rowMaxX) rowMaxX = x;
    }
  }
  console.log(`y=${y}: x=${rowMinX}..${rowMaxX}`);
}

app.quit();
process.exit(0);
