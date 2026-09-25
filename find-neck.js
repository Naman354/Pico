const { app, BrowserWindow } = require('electron');
const path = require('path');
const fs = require('fs');

app.whenReady().then(async () => {
  const win = new BrowserWindow({ show: false });
  await win.loadURL('about:blank');

  const idleB64 = fs.readFileSync(path.join(__dirname, 'src/renderer/pico-idle.png')).toString('base64');

  const rows = await win.webContents.executeJavaScript(`
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

          const d = ctx.getImageData(0, 0, w, h).data;
          const rowInfo = [];
          for (let y = 80; y <= 150; y += 5) {
            let leftX = w, rightX = 0;
            for (let x = 0; x < w; x++) {
              if (d[(y * w + x) * 4 + 3] > 20) {
                if (x < leftX) leftX = x;
                if (x > rightX) rightX = x;
              }
            }
            // Sample center color (shirt is green, skin is peachy, hair is orange)
            const cx = Math.round((leftX + rightX) / 2);
            const idx = (y * w + cx) * 4;
            const r = d[idx], g = d[idx+1], b = d[idx+2];
            rowInfo.push({ y, leftX, rightX, width: rightX - leftX, rgb: [r, g, b] });
          }
          resolve(rowInfo);
        };
        img.src = 'data:image/png;base64,' + idleSrc;
      });
    })('${idleB64}')
  `);

  console.log('Row anatomy:', rows);
  app.quit();
});
