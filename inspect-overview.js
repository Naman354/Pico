const { app, BrowserWindow } = require('electron');
const path = require('path');
const fs = require('fs');

app.whenReady().then(async () => {
  const win = new BrowserWindow({ show: false });
  await win.loadURL('about:blank');

  const charSheetPath = 'C:/Users/hp/.gemini/antigravity-ide/brain/31db9470-0d36-42b9-9098-2ceae6d52096/.tempmediaStorage/media_1790277058739.jpg';
  const imgBase64 = fs.readFileSync(charSheetPath).toString('base64');
  const dataUri = 'data:image/jpeg;base64,' + imgBase64;

  // Let's create an overview image with 50% scale
  const overview = await win.webContents.executeJavaScript(`
    new Promise((resolve) => {
      const img = new Image();
      img.onload = () => {
        const c = document.createElement('canvas');
        c.width = 512;
        c.height = 341;
        const ctx = c.getContext('2d');
        ctx.drawImage(img, 0, 0, 512, 341);
        resolve(c.toDataURL('image/jpeg', 0.8));
      };
      img.src = '${dataUri}';
    })
  `);

  fs.writeFileSync(path.join(__dirname, 'sheet-overview.jpg'), overview.replace(/^data:image\/jpeg;base64,/, ''), 'base64');
  console.log('Saved sheet-overview.jpg');
  app.quit();
});
