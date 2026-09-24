const { app, BrowserWindow } = require('electron');
const path = require('path');
const fs = require('fs');

app.whenReady().then(async () => {
  const win = new BrowserWindow({ show: false });
  await win.loadURL('about:blank');

  const charSheetPath = 'C:/Users/hp/.gemini/antigravity-ide/brain/31db9470-0d36-42b9-9098-2ceae6d52096/.tempmediaStorage/media_1790277058739.jpg';
  const imgBase64 = fs.readFileSync(charSheetPath).toString('base64');
  const dataUri = `data:image/jpeg;base64,${imgBase64}`;

  const top = await win.webContents.executeJavaScript(`
    new Promise((resolve) => {
      const img = new Image();
      img.onload = () => {
        const c = document.createElement('canvas');
        c.width = img.width;
        c.height = img.height;
        const ctx = c.getContext('2d');
        ctx.drawImage(img, 0, 0);
        const d = ctx.getImageData(0, 0, img.width, img.height).data;

        // Search columns x: 170 to 220, y from 60 to 120
        let firstY = -1;
        for (let y = 60; y < 120; y++) {
          for (let x = 170; x < 220; x++) {
            const p = (y * img.width + x) * 4;
            const r = d[p], g = d[p+1], b = d[p+2];
            // Orange hair or outline
            if (r > 150 && g > 50 && g < 150 && b < 100) {
              firstY = y;
              break;
            }
          }
          if (firstY !== -1) break;
        }
        resolve(firstY);
      };
      img.src = '${dataUri}';
    })
  `);

  console.log('Sheet hair tuft top Y:', top);
  app.quit();
});
