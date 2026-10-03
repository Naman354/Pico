const { app, BrowserWindow } = require('electron');
const path = require('path');
const fs = require('fs');

app.whenReady().then(async () => {
  const win = new BrowserWindow({ show: false });
  await win.loadURL('about:blank');

  const b64 = fs.readFileSync(path.join(__dirname, 'desktop-walking-sketch.png')).toString('base64');
  const uri = 'data:image/png;base64,' + b64;

  const result = await win.webContents.executeJavaScript(`
    new Promise((resolve) => {
      const img = new Image();
      img.onload = () => {
        // Zoom in 3x on walking sketch
        const c = document.createElement('canvas');
        c.width = img.width * 3;
        c.height = img.height * 3;
        const ctx = c.getContext('2d');
        ctx.imageSmoothingEnabled = false;
        ctx.drawImage(img, 0, 0, c.width, c.height);
        resolve(c.toDataURL('image/png'));
      };
      img.src = '${uri}';
    })
  `);

  fs.writeFileSync(path.join(__dirname, 'zoom-sketch-walk.png'), result.replace(/^data:image\/png;base64,/, ''), 'base64');
  console.log('Saved zoom-sketch-walk.png');
  app.quit();
});
