const { app, BrowserWindow } = require('electron');
const path = require('path');
const fs = require('fs');

app.whenReady().then(async () => {
  const win = new BrowserWindow({ show: false });
  await win.loadURL('about:blank');

  const idleB64 = fs.readFileSync(path.join(__dirname, 'src/renderer/pico-idle.png')).toString('base64');

  const anatomy = await win.webContents.executeJavaScript(`
    ((idleSrc) => {
      return new Promise((resolve) => {
        const img = new Image();
        img.onload = () => {
          const w = img.width;
          const h = img.height;
          const c = document.createElement('canvas');
          c.width = w;
          c.height = h;
          const ctx = c.getContext('2d');
          ctx.drawImage(img, 0, 0);

          // Find vertical bounds
          const d = ctx.getImageData(0, 0, w, h).data;
          let topY = h, bottomY = 0;
          for (let y = 0; y < h; y++) {
            for (let x = 0; x < w; x++) {
              if (d[(y * w + x) * 4 + 3] > 20) {
                if (y < topY) topY = y;
                if (y > bottomY) bottomY = y;
              }
            }
          }

          // Let's inspect where the chin / neck / collar is:
          // In chibi Style A, head is very large (~60-65% of total height!)
          // Total character height is bottomY - topY.
          resolve({ w, h, topY, bottomY, totalH: bottomY - topY });
        };
        img.src = 'data:image/png;base64,' + idleSrc;
      });
    })('${idleB64}')
  `);

  console.log('Anatomy bounds:', anatomy);
  app.quit();
});
