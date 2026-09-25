const fs = require('fs');
const path = require('path');

// Read the left eye pixel data from pico-idle.png directly:
const { app, BrowserWindow } = require('electron');

app.whenReady().then(async () => {
  const win = new BrowserWindow({ show: false });
  await win.loadURL('about:blank');

  const idleB64 = fs.readFileSync(path.join(__dirname, 'src/renderer/pico-idle.png')).toString('base64');

  const data = await win.webContents.executeJavaScript(`
    ((idleSrc) => {
      return new Promise((resolve) => {
        const img = new Image();
        img.onload = () => {
          const w = img.width, h = img.height;
          const c = document.createElement('canvas');
          c.width = w; c.height = h;
          const ctx = c.getContext('2d');
          ctx.drawImage(img, 0, 0);

          const d = ctx.getImageData(0, 0, w, h).data;
          
          // Let's inspect rows 72 to 82 (mid eye) for both eyes:
          // Left Eye (x: 24..54)
          // Right Eye (x: 60..90)
          const leftRows = [];
          for (let y = 70; y <= 84; y++) {
            const row = [];
            for (let x = 25; x <= 52; x++) {
              const idx = (y * w + x) * 4;
              row.push({ x, r: d[idx], g: d[idx+1], b: d[idx+2] });
            }
            leftRows.push({ y, row });
          }
          resolve(leftRows);
        };
        img.src = 'data:image/png;base64,' + idleSrc;
      });
    })('${idleB64}')
  `);

  // Let's examine row y=76:
  const row76 = data.find(r => r.y === 76);
  console.log('Row 76 (left eye):');
  row76.row.forEach(p => {
    // Sclera vs Iris vs Lash:
    let type = 'skin';
    if (p.r > 200 && p.g > 190 && p.b > 180 && Math.abs(p.r - p.b) < 25) type = 'sclera';
    else if (p.r < 80 && p.g < 55 && p.b < 50) type = 'lash';
    else if (p.r < 195) type = 'iris';
    console.log(`x=${p.x}: [${p.r}, ${p.g}, ${p.b}] -> ${type}`);
  });

  app.quit();
});
