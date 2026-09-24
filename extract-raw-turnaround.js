const { app, BrowserWindow } = require('electron');
const path = require('path');
const fs = require('fs');

app.whenReady().then(async () => {
  const win = new BrowserWindow({ show: false });
  await win.loadURL('about:blank');

  const charSheetPath = 'C:/Users/hp/.gemini/antigravity-ide/brain/31db9470-0d36-42b9-9098-2ceae6d52096/.tempmediaStorage/media_1790277058739.jpg';
  const imgBase64 = fs.readFileSync(charSheetPath).toString('base64');
  const dataUri = 'data:image/jpeg;base64,' + imgBase64;

  const rawCrops = await win.webContents.executeJavaScript(`
    new Promise((resolve) => {
      const img = new Image();
      img.onload = () => {
        function crop(x, y, w, h) {
          const c = document.createElement('canvas');
          c.width = w;
          c.height = h;
          const ctx = c.getContext('2d');
          ctx.drawImage(img, x, y, w, h, 0, 0, w, h);
          return c.toDataURL('image/png');
        }

        // 1. Side (Left) [faces right in sheet]
        // x: 130 to 235, y: 92 to 285
        const sideLeftRaw = crop(130, 92, 105, 195);

        // 2. Back
        // x: 242 to 348, y: 92 to 285
        const backRaw = crop(242, 92, 106, 195);

        // 3. Side (Right) [faces left in sheet]
        // x: 350 to 455, y: 92 to 285
        const sideRightRaw = crop(350, 92, 105, 195);

        resolve({ sideLeftRaw, backRaw, sideRightRaw });
      };
      img.src = '${dataUri}';
    })
  `);

  fs.writeFileSync(path.join(__dirname, 'raw-side-left.png'), rawCrops.sideLeftRaw.replace(/^data:image\/png;base64,/, ''), 'base64');
  fs.writeFileSync(path.join(__dirname, 'raw-back.png'), rawCrops.backRaw.replace(/^data:image\/png;base64,/, ''), 'base64');
  fs.writeFileSync(path.join(__dirname, 'raw-side-right.png'), rawCrops.sideRightRaw.replace(/^data:image\/png;base64,/, ''), 'base64');
  console.log('Saved raw crops');
  app.quit();
});
