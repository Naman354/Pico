const { app, nativeImage } = require('electron');
const path = require('path');
const fs = require('fs');

const p = 'C:/Users/hp/.gemini/antigravity-ide/brain/31db9470-0d36-42b9-9098-2ceae6d52096/.tempmediaStorage/media_1790277058739.jpg';
const img = nativeImage.createFromPath(p);
const size = img.getSize();
const bmp = img.toBitmap();

// Search columns x from 110 to 145, y from 70 to 280
// Count non-bg pixels per column x
for (let x = 110; x <= 145; x++) {
  let nonBgCount = 0;
  let topY = 999;
  for (let y = 70; y < 280; y++) {
    const idx = (y * size.width + x) * 4;
    const b = bmp[idx];
    const g = bmp[idx + 1];
    const r = bmp[idx + 2];
    const isBg = (r > 220 && g > 210 && b > 195);
    if (!isBg) {
      nonBgCount++;
      if (y < topY) topY = y;
    }
  }
  console.log(`x=${x}: nonBg=${nonBgCount}, topY=${topY}`);
}

app.quit();
process.exit(0);
