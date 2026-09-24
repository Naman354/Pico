const { app, nativeImage } = require('electron');
const path = require('path');
const fs = require('fs');

const p = path.join(__dirname, 'desktop-walking-sketch.png');
const img = nativeImage.createFromPath(p);
console.log('Sketch size:', img.getSize());

app.quit();
process.exit(0);
