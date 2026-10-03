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
        const h = img.height;

        // Find color breakdown in various regions:
        // Arm region (y: 100 to 150)
        // Shorts region (y: 135 to 160)
        // Legs region (y: 155 to 170)
        // Shoes region (y: 168 to 182)

        const rows = [];
        for (let y = 90; y < h; y += 5) {
          let minX = w, maxX = 0;
          for (let x = 0; x < w; x++) {
            if (d[(y * w + x) * 4 + 3] > 30) {
              if (x < minX) minX = x;
              if (x > maxX) maxX = x;
            }
          }
          rows.push({ y, minX, maxX, width: maxX >= minX ? maxX - minX + 1 : 0 });
        }

        resolve({ w, h, rows });
      };
      img.src = '${uri}';
    })
  `);

  console.log('pico-side-stand dimensions:', result.w, result.h);
  console.log('Rows analysis:', JSON.stringify(result.rows, null, 2));
  app.quit();
});
