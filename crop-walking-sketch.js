const { app, nativeImage } = require('electron');
const path = require('path');
const fs = require('fs');

const p = 'C:/Users/hp/.gemini/antigravity-ide/brain/31db9470-0d36-42b9-9098-2ceae6d52096/.tempmediaStorage/media_1790277069471.jpg';
const img = nativeImage.createFromPath(p);
// Walking figure is roughly at x: 345..425, y: 195..285 (relative to sheet)
// In desktop-behaviors.png (which started at x=330, y=15), walking is at x: 15..95, y: 180..270
const cropped = img.crop({ x: 335, y: 195, width: 85, height: 105 });
fs.writeFileSync(path.join(__dirname, 'desktop-walking-sketch.png'), cropped.toPNG());
console.log('Saved desktop-walking-sketch.png');
app.quit();
process.exit(0);
