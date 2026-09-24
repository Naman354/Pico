const { app, nativeImage } = require('electron');
const path = require('path');
const fs = require('fs');

const p = 'C:/Users/hp/.gemini/antigravity-ide/brain/31db9470-0d36-42b9-9098-2ceae6d52096/.tempmediaStorage/media_1790277069471.jpg';
const img = nativeImage.createFromPath(p);
console.log('Size:', img.getSize());
const cropped = img.crop({ x: 330, y: 15, width: 340, height: 460 });
fs.writeFileSync(path.join(__dirname, 'desktop-behaviors.png'), cropped.toPNG());
console.log('Done!');
app.quit();
process.exit(0);
