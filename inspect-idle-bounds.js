const { app, BrowserWindow } = require('electron');
const path = require('path');
const fs = require('fs');

app.whenReady().then(async () => {
  const win = new BrowserWindow({ show: false });
  await win.loadURL('about:blank');

  const idleB64 = fs.readFileSync(path.join(__dirname, 'src', 'renderer', 'pico-idle.png')).toString('base64');
  const dataUri = 'data:image/png;base64,' + idleB64;

  const analysis = await win.webContents.executeJavaScript(`
    new Promise((resolve) => {
      const img = new Image();
      img.onload = () => {
        const c = document.createElement('canvas');
        c.width = img.width;
        c.height = img.height;
        const ctx = c.getContext('2d');
        ctx.drawImage(img, 0, 0);
        const d = ctx.getImageData(0, 0, img.width, img.height).data;

        let minX = img.width, maxX = 0, minY = img.height, maxY = 0;
        for (let y = 0; y < img.height; y++) {
          for (let x = 0; x < img.width; x++) {
            const a = d[(y * img.width + x) * 4 + 3];
            if (a > 30) {
              if (x < minX) minX = x;
              if (x > maxX) maxX = x;
              if (y < minY) minY = y;
              if (y > maxY) maxY = y;
            }
          }
        }
        resolve({
          w: img.width,
          h: img.height,
          bounds: { minX, maxX, minY, maxY, width: maxX - minX + 1, height: maxY - minY + 1 }
        });
      };
      img.src = '${dataUri}';
    })
  `);

  console.log('pico-idle.png analysis:', analysis);
  app.quit();
});
