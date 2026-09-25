const { app, BrowserWindow } = require('electron');
const path = require('path');
const fs = require('fs');

app.whenReady().then(async () => {
  const win = new BrowserWindow({ show: false });
  await win.loadURL('about:blank');

  const eyeB64 = fs.readFileSync(path.join(__dirname, 'left-eye.png')).toString('base64');

  const info = await win.webContents.executeJavaScript(`
    ((eyeSrc) => {
      return new Promise((resolve) => {
        const img = new Image();
        img.onload = () => {
          const w = img.width, h = img.height;
          const c = document.createElement('canvas');
          c.width = w; c.height = h;
          const ctx = c.getContext('2d');
          ctx.drawImage(img, 0, 0);

          const d = ctx.getImageData(0, 0, w, h).data;
          const pixels = [];
          for (let y = 0; y < h; y++) {
            for (let x = 0; x < w; x++) {
              const idx = (y * w + x) * 4;
              const r = d[idx], g = d[idx+1], b = d[idx+2];
              pixels.push({ x, y, r, g, b, lum: r + g + b });
            }
          }
          pixels.sort((a, b) => b.lum - a.lum);
          resolve(pixels.slice(0, 15));
        };
        img.src = 'data:image/png;base64,' + eyeSrc;
      });
    })('${eyeB64}')
  `);

  console.log('Top brightest pixels in left eye:', info);
  app.quit();
});
