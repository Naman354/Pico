const { app, BrowserWindow } = require('electron');
const path = require('path');
const fs = require('fs');

app.whenReady().then(async () => {
  const win = new BrowserWindow({ show: false });
  await win.loadURL('about:blank');

  const charSheetPath = 'C:/Users/hp/.gemini/antigravity-ide/brain/31db9470-0d36-42b9-9098-2ceae6d52096/.tempmediaStorage/media_1790277058739.jpg';
  const imgBase64 = fs.readFileSync(charSheetPath).toString('base64');
  const dataUri = 'data:image/jpeg;base64,' + imgBase64;

  const info = await win.webContents.executeJavaScript(`
    new Promise((resolve) => {
      const img = new Image();
      img.onload = () => {
        resolve({ w: img.width, h: img.height });
      };
      img.src = '${dataUri}';
    })
  `);

  console.log('Sheet image dimensions:', info);
  app.quit();
});
