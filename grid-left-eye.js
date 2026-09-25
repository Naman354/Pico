const { app, BrowserWindow } = require('electron');
const path = require('path');
const fs = require('fs');

app.whenReady().then(async () => {
  const win = new BrowserWindow({ show: false });
  await win.loadURL('about:blank');

  const eyeB64 = fs.readFileSync(path.join(__dirname, 'left-eye.png')).toString('base64');

  const grid = await win.webContents.executeJavaScript(`
    ((eyeSrc) => {
      return new Promise((resolve) => {
        const img = new Image();
        img.onload = () => {
          const w = img.width;
          const h = img.height;
          const c = document.createElement('canvas');
          c.width = w;
          c.height = h;
          const ctx = c.getContext('2d');
          ctx.drawImage(img, 0, 0);

          const d = ctx.getImageData(0, 0, w, h).data;
          const rows = [];
          for (let y = 0; y < h; y++) {
            let rowStr = '';
            for (let x = 0; x < w; x++) {
              const idx = (y * w + x) * 4;
              const r = d[idx], g = d[idx+1], b = d[idx+2];
              // S = sclera, I = iris, H = highlight, L = lash, . = skin/hair
              if (r > 240 && g > 240 && b > 240) {
                rowStr += 'H'; // highlight
              } else if (r > 200 && g > 190 && b > 180 && Math.abs(r - b) < 25) {
                rowStr += 'S'; // sclera
              } else if (r < 75 && g < 55 && b < 50) {
                rowStr += 'L'; // lash
              } else if (r < 195 && (r < 135 || g < 135)) {
                rowStr += 'I'; // iris
              } else {
                rowStr += '.'; // skin/hair
              }
            }
            rows.push(rowStr);
          }
          resolve({ w, h, rows });
        };
        img.src = 'data:image/png;base64,' + eyeSrc;
      });
    })('${eyeB64}')
  `);

  console.log('Left Eye ASCII Grid (30x25):');
  grid.rows.forEach((r, i) => console.log(String(i).padStart(2, '0') + ': ' + r));
  app.quit();
});
