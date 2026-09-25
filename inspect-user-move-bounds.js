const { app, BrowserWindow } = require('electron');
const path = require('path');
const fs = require('fs');

app.whenReady().then(async () => {
  const win = new BrowserWindow({ show: false });
  await win.loadURL('about:blank');

  const files = [
    'user-move-1-bubble-input.png',
    'user-move-2-acknowledgement.png',
    'user-move-3-walking-left.png',
    'user-move-4-settled-idle-left.png',
    'user-move-5-walk-right-done.png',
    'user-move-6-clear-view-done.png'
  ];

  const b64s = files.map(f => fs.readFileSync(path.join(__dirname, f)).toString('base64'));

  const info = await win.webContents.executeJavaScript(`
    ((imagesData) => {
      return new Promise((resolve) => {
        const results = [];
        let loaded = 0;
        imagesData.forEach((b64, idx) => {
          const img = new Image();
          img.onload = () => {
            const c = document.createElement('canvas');
            c.width = img.width;
            c.height = img.height;
            const ctx = c.getContext('2d');
            ctx.drawImage(img, 0, 0);
            const data = ctx.getImageData(0, 0, img.width, img.height).data;

            let minX = img.width, maxX = 0, minY = img.height, maxY = 0;
            for (let y = 0; y < img.height; y++) {
              for (let x = 0; x < img.width; x++) {
                const alpha = data[(y * img.width + x) * 4 + 3];
                if (alpha > 20) {
                  if (x < minX) minX = x;
                  if (x > maxX) maxX = x;
                  if (y < minY) minY = y;
                  if (y > maxY) maxY = y;
                }
              }
            }
            results[idx] = { file: ${JSON.stringify(files)}[idx], width: img.width, height: img.height, minX, maxX, minY, maxY };
            loaded++;
            if (loaded === imagesData.length) resolve(results);
          };
          img.src = 'data:image/png;base64,' + b64;
        });
      });
    })(${JSON.stringify(b64s)})
  `);

  console.log('Image content bounds:', JSON.stringify(info, null, 2));
  app.quit();
});
