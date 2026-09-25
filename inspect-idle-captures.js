const { app, BrowserWindow } = require('electron');
const path = require('path');
const fs = require('fs');

app.whenReady().then(async () => {
  const win = new BrowserWindow({ show: false });
  await win.loadURL('about:blank');

  const files = [
    'idle-state-1-forward.png',
    'idle-state-2-glance-left.png',
    'idle-state-3-glance-right.png',
    'idle-state-4-glance-down.png',
    'idle-state-5-head-turn-left.png',
    'idle-state-6-head-turn-right.png',
    'idle-state-7-head-tilt.png',
    'idle-state-8-weight-shift.png'
  ];

  const b64s = files.map(f => fs.readFileSync(path.join(__dirname, f)).toString('base64'));

  const bounds = await win.webContents.executeJavaScript(`
    ((imagesData) => {
      return new Promise((resolve) => {
        let loaded = 0;
        const results = [];
        imagesData.forEach((b64, idx) => {
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
                if (d[(y * img.width + x) * 4 + 3] > 20) {
                  if (x < minX) minX = x;
                  if (x > maxX) maxX = x;
                  if (y < minY) minY = y;
                  if (y > maxY) maxY = y;
                }
              }
            }
            results[idx] = { file: ${JSON.stringify(files)}[idx], w: img.width, h: img.height, minX, maxX, minY, maxY };
            loaded++;
            if (loaded === imagesData.length) resolve(results);
          };
          img.src = 'data:image/png;base64,' + b64;
        });
      });
    })(${JSON.stringify(b64s)})
  `);

  console.log('Capture bounds:', bounds);
  app.quit();
});
