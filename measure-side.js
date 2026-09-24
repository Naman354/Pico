const { app, nativeImage } = require('electron');
const path = require('path');
const fs = require('fs');

const p = path.join(__dirname, 'raw-side-left.png');
const img = nativeImage.createFromPath(p);
const size = img.getSize();
console.log('raw-side-left size:', size);
const bmp = img.toBitmap();

// Find color regions
// Shorts: Coral (~ r: 240-255, g: 100-140, b: 90-130)
// Shoes: Gray (~ r: 130-160, g: 140-170, b: 160-190)
// Shirt: Green (~ r: 70-130, g: 120-160, b: 70-120)
// Skin: (~ r: 240-255, g: 200-230, b: 180-210)

let shortsY = { min: 999, max: -1 };
let shoeY = { min: 999, max: -1 };
let legY = { min: 999, max: -1 };

for (let y = 0; y < size.height; y++) {
  for (let x = 0; x < size.width; x++) {
    const idx = (y * size.width + x) * 4;
    const b = bmp[idx];
    const g = bmp[idx + 1];
    const r = bmp[idx + 2];
    const a = bmp[idx + 3];

    if (a > 100) {
      if (r > 200 && g > 90 && g < 150 && b < 140) {
        if (y < shortsY.min) shortsY.min = y;
        if (y > shortsY.max) shortsY.max = y;
      }
      if (r > 120 && r < 180 && g > 130 && g < 190 && b > 140) {
        if (y < shoeY.min) shoeY.min = y;
        if (y > shoeY.max) shoeY.max = y;
      }
      if (r > 220 && g > 180 && g < 225 && b > 160 && b < 205 && y > 140) {
        if (y < legY.min) legY.min = y;
        if (y > legY.max) legY.max = y;
      }
    }
  }
}

console.log('Shorts Y range:', shortsY);
console.log('Leg Y range:', legY);
console.log('Shoe Y range:', shoeY);
app.quit();
process.exit(0);
