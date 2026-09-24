const { app, nativeImage } = require('electron');
const path = require('path');
const fs = require('fs');

for (let i = 1; i <= 6; i++) {
  const filename = i === 1 ? 'pico-verify-1-idle.png' :
                   i === 2 ? 'pico-verify-2-turn-right.png' :
                   i === 3 ? 'pico-verify-3-walk-right.png' :
                   i === 4 ? 'pico-verify-4-turn-around.png' :
                   i === 5 ? 'pico-verify-5-walk-left.png' : 'pico-verify-6-stopped-idle.png';
  const img = nativeImage.createFromPath(path.join(__dirname, filename));
  const size = img.getSize();
  const bmp = img.toBitmap();

  let minX = size.width, maxX = 0, minY = size.height, maxY = 0;
  for (let y = 0; y < size.height; y++) {
    for (let x = 0; x < size.width; x++) {
      const a = bmp[(y * size.width + x) * 4 + 3];
      if (a > 30) {
        if (x < minX) minX = x;
        if (x > maxX) maxX = x;
        if (y < minY) minY = y;
        if (y > maxY) maxY = y;
      }
    }
  }
  console.log(`${filename}: x=${minX}..${maxX}, y=${minY}..${maxY}, w=${maxX - minX + 1}, h=${maxY - minY + 1}`);
}

app.quit();
process.exit(0);
