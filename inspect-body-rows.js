const { app, nativeImage } = require('electron');
const path = require('path');
const fs = require('fs');

const p = path.join(__dirname, 'src', 'renderer', 'pico-side-stand.png');
const img = nativeImage.createFromPath(p);
const size = img.getSize();
const bmp = img.toBitmap();

// Inspect rows from y=120 to 182
for (let y = 130; y < 182; y += 4) {
  let minX = 999, maxX = -1;
  for (let x = 0; x < size.width; x++) {
    const idx = (y * size.width + x) * 4;
    if (bmp[idx + 3] > 50) {
      if (x < minX) minX = x;
      if (x > maxX) maxX = x;
    }
  }
  console.log(`y=${y}: x=${minX}..${maxX}`);
}

app.quit();
process.exit(0);
