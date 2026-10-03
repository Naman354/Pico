const { app, BrowserWindow } = require('electron');
const path = require('path');
const fs = require('fs');

app.whenReady().then(async () => {
  const win = new BrowserWindow({ show: false });
  await win.loadURL('about:blank');

  const b64 = fs.readFileSync(path.join(__dirname, 'src', 'renderer', 'pico-side-stand.png')).toString('base64');
  const uri = 'data:image/png;base64,' + b64;

  const result = await win.webContents.executeJavaScript(`
    new Promise((resolve) => {
      const img = new Image();
      img.onload = () => {
        const c = document.createElement('canvas');
        c.width = img.width;
        c.height = img.height;
        const ctx = c.getContext('2d');
        ctx.drawImage(img, 0, 0);

        const d = ctx.getImageData(0, 0, img.width, img.height).data;
        const w = img.width;
        const h = img.height;

        // Shoe bounds (y >= 168)
        let minX = w, maxX = 0, minY = h, maxY = 0;
        for (let y = 168; y < h; y++) {
          for (let x = 0; x < w; x++) {
            if (d[(y * w + x) * 4 + 3] > 30) {
              if (x < minX) minX = x;
              if (x > maxX) maxX = x;
              if (y < minY) minY = y;
              if (y > maxY) maxY = y;
            }
          }
        }

        // Arm bounds (y: 106 to 150)
        let armMinX = w, armMaxX = 0, armMinY = h, armMaxY = 0;
        for (let y = 106; y <= 152; y++) {
          for (let x = 46; x <= 72; x++) {
            // Find skin tone (hand) at bottom of arm y: 140..152
            if (d[(y * w + x) * 4 + 3] > 30) {
              if (x < armMinX) armMinX = x;
              if (x > armMaxX) armMaxX = x;
              if (y < armMinY) armMinY = y;
              if (y > armMaxY) armMaxY = y;
            }
          }
        }

        resolve({
          shoes: { minX, maxX, minY, maxY, width: maxX - minX + 1, height: maxY - minY + 1 },
          arm: { armMinX, armMaxX, armMinY, armMaxY }
        });
      };
      img.src = '${uri}';
    })
  `);

  console.log('Inspection:', JSON.stringify(result, null, 2));
  app.quit();
});
