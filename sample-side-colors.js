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

        function get(x, y) {
          const idx = (y * w + x) * 4;
          return [d[idx], d[idx+1], d[idx+2], d[idx+3]];
        }

        resolve({
          shirtBack: get(48, 120),
          shirtMid: get(54, 120),
          shortsBack: get(46, 142),
          shortsMid: get(54, 142),
          shortsCuff: get(54, 154),
          skinLeg: get(54, 162),
          shoeSole: get(54, 178)
        });
      };
      img.src = '${uri}';
    })
  `);

  console.log('Sampled colors:', result);
  app.quit();
});
