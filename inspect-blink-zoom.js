const { app, BrowserWindow } = require('electron');
const path = require('path');
const fs = require('fs');

app.whenReady().then(async () => {
  const win = new BrowserWindow({ show: false });
  await win.loadURL('about:blank');

  const blinkB64 = fs.readFileSync(path.join(__dirname, 'src/renderer/pico-blink.png')).toString('base64');

  const blinkCrop = await win.webContents.executeJavaScript(`
    ((blinkSrc) => {
      return new Promise((resolve) => {
        const img = new Image();
        img.onload = () => {
          const w = img.width;
          const h = img.height;
          const c = document.createElement('canvas');
          c.width = 75 * 4;
          c.height = 30 * 4;
          const ctx = c.getContext('2d');
          ctx.imageSmoothingEnabled = false;
          ctx.drawImage(img, 20, 60, 75, 30, 0, 0, 75 * 4, 30 * 4);
          resolve(c.toDataURL('image/png'));
        };
        img.src = 'data:image/png;base64,' + blinkSrc;
      });
    })('${blinkB64}')
  `);

  fs.writeFileSync(path.join(__dirname, 'blink-region-zoom.png'), blinkCrop.replace(/^data:image\/png;base64,/, ''), 'base64');
  console.log('Saved blink-region-zoom.png');
  app.quit();
});
