const { app, nativeImage } = require('electron');
const path = require('path');
const fs = require('fs');

const p = 'C:/Users/hp/.gemini/antigravity-ide/brain/31db9470-0d36-42b9-9098-2ceae6d52096/.tempmediaStorage/media_1790277058739.jpg';
const img = nativeImage.createFromPath(p);
const size = img.getSize();
const bmp = img.toBitmap();

let sideLeftMinX = 999, sideLeftMaxX = -1, sideLeftMinY = 999, sideLeftMaxY = -1;

for (let y = 70; y < 290; y++) {
  for (let x = 135; x < 250; x++) {
    const idx = (y * size.width + x) * 4;
    const b = bmp[idx];
    const g = bmp[idx + 1];
    const r = bmp[idx + 2];
    const isBg = (r > 220 && g > 210 && b > 195) || (y > 275 && r > 180 && g > 170 && b > 155);

    if (!isBg) {
      if (x < sideLeftMinX) sideLeftMinX = x;
      if (x > sideLeftMaxX) sideLeftMaxX = x;
      if (y < sideLeftMinY) sideLeftMinY = y;
      if (y > sideLeftMaxY) sideLeftMaxY = y;
    }
  }
}

console.log('Side (Left) pure bounds (starting from x=135):', {
  sideLeftMinX,
  sideLeftMaxX,
  sideLeftMinY,
  sideLeftMaxY,
  width: sideLeftMaxX - sideLeftMinX + 1,
  height: sideLeftMaxY - sideLeftMinY + 1
});

// Let's also check gutter between Side (Left) and Back
for (let x = 230; x <= 255; x++) {
  let nonBgCount = 0;
  for (let y = 70; y < 280; y++) {
    const idx = (y * size.width + x) * 4;
    const b = bmp[idx];
    const g = bmp[idx + 1];
    const r = bmp[idx + 2];
    if (!(r > 220 && g > 210 && b > 195)) {
      nonBgCount++;
    }
  }
  console.log(`x=${x}: nonBg=${nonBgCount}`);
}

app.quit();
process.exit(0);
