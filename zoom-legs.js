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
        // Zoom in 4x on the legs & shoes (x: 35..80, y: 130..182)
        const c = document.createElement('canvas');
        c.width = 45 * 4;
        c.height = 52 * 4;
        const ctx = c.getContext('2d');
        ctx.imageSmoothingEnabled = false;
        ctx.drawImage(img, 35, 130, 45, 52, 0, 0, 45 * 4, 52 * 4);
        resolve(c.toDataURL('image/png'));
      };
      img.src = '${uri}';
    })
  `);

  fs.writeFileSync(path.join(__dirname, 'zoom-legs-shoes.png'), result.replace(/^data:image\/png;base64,/, ''), 'base64');
  console.log('Saved zoom-legs-shoes.png');
  app.quit();
});
