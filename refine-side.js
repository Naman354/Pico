const { app, BrowserWindow } = require('electron');
const path = require('path');
const fs = require('fs');

app.whenReady().then(async () => {
  const win = new BrowserWindow({ show: false });
  await win.loadURL('about:blank');

  const base64 = fs.readFileSync(path.join(__dirname, 'src', 'renderer', 'pico-side-left.png')).toString('base64');
  const uri = `data:image/png;base64,${base64}`;

  const clean = await win.webContents.executeJavaScript(`
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

        // Clean any stray artifact on the far right (> 96px)
        for (let y = 0; y < c.height; y++) {
          for (let x = 97; x < c.width; x++) {
            d[(y * c.width + x) * 4 + 3] = 0;
          }
        }

        ctx.putImageData(imgData, 0, 0);

        // Mirror for right-facing
        const cRight = document.createElement('canvas');
        cRight.width = 114;
        cRight.height = 182;
        const ctxR = cRight.getContext('2d');
        ctxR.save();
        ctxR.translate(114, 0);
        ctxR.scale(-1, 1);
        ctxR.drawImage(c, 0, 0);
        ctxR.restore();

        resolve({
          left: c.toDataURL('image/png'),
          right: cRight.toDataURL('image/png')
        });
      };
      img.src = '${uri}';
    })
  `);

  fs.writeFileSync(path.join(__dirname, 'src', 'renderer', 'pico-side-left.png'), clean.left.replace(/^data:image\/png;base64,/, ''), 'base64');
  fs.writeFileSync(path.join(__dirname, 'src', 'renderer', 'pico-side-right.png'), clean.right.replace(/^data:image\/png;base64,/, ''), 'base64');
  console.log('Cleaned edge artifact and saved both side profiles.');
  app.quit();
});
