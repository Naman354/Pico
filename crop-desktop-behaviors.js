const { app, BrowserWindow } = require('electron');
const path = require('path');
const fs = require('fs');

app.whenReady().then(async () => {
  const win = new BrowserWindow({ show: false });
  await win.loadURL('about:blank');

  const charSheetPath = 'C:/Users/hp/.gemini/antigravity-ide/brain/31db9470-0d36-42b9-9098-2ceae6d52096/.tempmediaStorage/media_1790277069471.jpg';
  const imgBase64 = fs.readFileSync(charSheetPath).toString('base64');
  const dataUri = 'data:image/jpeg;base64,' + imgBase64;

  const crop = await win.webContents.executeJavaScript(`
    new Promise((resolve) => {
      const img = new Image();
      img.onload = () => {
        // "On Desktop" section is around:
        // x: 330 to 670, y: 0 to 480
        const c = document.createElement('canvas');
        c.width = 340;
        c.height = 480;
        const ctx = c.getContext('2d');
        ctx.drawImage(img, 330, 0, 340, 480, 0, 0, 340, 480);
        resolve(c.toDataURL('image/png'));
      };
      img.src = '${dataUri}';
    })
  `);

  fs.writeFileSync(path.join(__dirname, 'desktop-behaviors-crop.png'), crop.replace(/^data:image\/png;base64,/, ''), 'base64');
  console.log('Saved desktop-behaviors-crop.png');
  app.quit();
});
