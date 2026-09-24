const { app, nativeImage } = require('electron');
const path = require('path');
const fs = require('fs');

const p = 'C:/Users/hp/.gemini/antigravity-ide/brain/31db9470-0d36-42b9-9098-2ceae6d52096/.tempmediaStorage/media_1790277058739.jpg';
const img = nativeImage.createFromPath(p);
const cropped = img.crop({ x: 235, y: 320, width: 110, height: 160 });
fs.writeFileSync(path.join(__dirname, 'curious-crop.png'), cropped.toPNG());
console.log('Saved curious-crop.png');
app.quit();
process.exit(0);
