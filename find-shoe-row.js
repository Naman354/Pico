const { app, BrowserWindow } = require('electron');
const path = require('path');
const fs = require('fs');

app.whenReady().then(async () => {
  const win = new BrowserWindow({ show: false });
  await win.loadURL('about:blank');

  const base64 = fs.readFileSync(path.join(__dirname, 'crop-side-left.png')).toString('base64');
  const uri = `data:image/png;base64,${base64}`;

  const rows = await win.webContents.executeJavaScript(`
    new Promise((resolve) => {
      const img = new Image();
      img.onload = () => {
        const c = document.createElement('canvas');
        c.width = img.width;
        c.height = img.height;
        const ctx = c.getContext('2d');
        ctx.drawImage(img, 0, 0);
        const d = ctx.getImageData(0, 0, c.width, c.height).data;

        const results = [];
        for (let y = 160; y < 220; y++) {
          let nonBgCount = 0;
          let minX = 999, maxX = 0;
          for (let x = 0; x < c.width; x++) {
            const p = (y * c.width + x) * 4;
            const r = d[p], g = d[p+1], b = d[p+2];
            // Dark outline or sneaker color
            if (r < 180 && g < 180 && b < 180) {
              nonBgCount++;
              if (x < minX) minX = x;
              if (x > maxX) maxX = x;
            }
          }
          results.push({ y, nonBgCount, minX, maxX });
        }
        resolve(results);
      };
      img.src = '${uri}';
    })
  `);

  console.log('Row analysis:', rows.filter(r => r.nonBgCount > 0));
  app.quit();
});
