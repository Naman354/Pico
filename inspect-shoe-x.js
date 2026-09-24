const { app, nativeImage } = require('electron');
const path = require('path');
const fs = require('fs');

const p = path.join(__dirname, 'src', 'renderer', 'pico-side-stand.png');
const img = nativeImage.createFromPath(p);
const size = img.getSize();
const bmp = img.toBitmap();

// Let's find the bounding box of:
// - The arm: arm outline is dark brown, skin is light, forearm has hand
// - The shoes: soles at y=180..181, x from min to max

let shoeMinX = 999, shoeMaxX = -1;
for (let y = 168; y < 182; y++) {
  for (let x = 0; x < size.width; x++) {
    const idx = (y * size.width + x) * 4;
    if (bmp[idx + 3] > 50) {
      if (x < shoeMinX) shoeMinX = x;
      if (x > shoeMaxX) shoeMaxX = x;
    }
  }
}

console.log('Shoe X range in pico-side-stand:', shoeMinX, 'to', shoeMaxX);
app.quit();
process.exit(0);
