const { app, BrowserWindow } = require('electron');
const path = require('path');
const fs = require('fs');

app.whenReady().then(async () => {
  const win = new BrowserWindow({ show: false });
  await win.loadURL('about:blank');

  const base64 = fs.readFileSync(path.join(__dirname, 'src', 'renderer', 'pico-side-right.png')).toString('base64');
  const uri = `data:image/png;base64,${base64}`;

  const cleanPng = await win.webContents.executeJavaScript(`
    new Promise((resolve) => {
      const img = new Image();
      img.onload = () => {
        const c = document.createElement('canvas');
        c.width = img.width;
        c.height = img.height;
        const ctx = c.getContext('2d');
        ctx.drawImage(img, 0, 0);

        const imgData = ctx.getImageData(0, 0, c.width, c.height);
        const d = imgData.data;

        // Any stray pixel on the far right (> 85px) above y=120 is an artifact
        for (let y = 0; y < c.height; y++) {
          for (let x = 0; x < c.width; x++) {
            const idx = (y * c.width + x) * 4;
            // Clear right edge stray pixels
            if (x >= 86 && y < 140) {
              d[idx + 3] = 0;
            }
            // Clear left edge stray pixels
            if (x <= 10) {
              d[idx + 3] = 0;
            }
            // Clear anything below shoe sole y > 180
            if (y > 180) {
              d[idx + 3] = 0;
            }
          }
        }

        ctx.putImageData(imgData, 0, 0);
        resolve(c.toDataURL('image/png'));
      };
      img.src = '${uri}';
    })
  `);

  fs.writeFileSync(path.join(__dirname, 'src', 'renderer', 'pico-side-right.png'), cleanPng.replace(/^data:image\/png;base64,/, ''), 'base64');
  console.log('Saved clean pico-side-right.png');
  app.quit();
});
