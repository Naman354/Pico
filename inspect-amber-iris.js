const { app, BrowserWindow } = require('electron');
const path = require('path');
const fs = require('fs');

app.whenReady().then(async () => {
  const win = new BrowserWindow({ show: false });
  await win.loadURL('about:blank');

  const idleB64 = fs.readFileSync(path.join(__dirname, 'src/renderer/pico-idle.png')).toString('base64');

  const row = await win.webContents.executeJavaScript(`
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
          const y = 78; // Iris bottom row (amber color)
          const result = [];
          for (let x = 20; x <= 95; x++) {
            const idx = (y * w + x) * 4;
            result.push({ x, r: d[idx], g: d[idx+1], b: d[idx+2] });
          }
          resolve(result);
        };
        img.src = 'data:image/png;base64,' + idleSrc;
      });
    })('${idleB64}')
  `);

  console.log('Row 78 pixels:');
  const amberPixels = row.filter(p => p.r > 180 && p.g > 80 && p.g < 150 && p.b < 80);
  console.log('Amber iris pixels at Y=78:', amberPixels.map(p => p.x));
  app.quit();
});
