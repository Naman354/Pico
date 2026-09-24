const { app, BrowserWindow } = require('electron');
const path = require('path');
const fs = require('fs');

app.whenReady().then(async () => {
  const win = new BrowserWindow({ show: false });
  await win.loadURL('about:blank');

  const charSheetPath = 'C:/Users/hp/.gemini/antigravity-ide/brain/31db9470-0d36-42b9-9098-2ceae6d52096/.tempmediaStorage/media_1790277058739.jpg';
  const imgBase64 = fs.readFileSync(charSheetPath).toString('base64');
  const dataUri = `data:image/jpeg;base64,${imgBase64}`;

  const crops = await win.webContents.executeJavaScript(`
    new Promise((resolve) => {
      const img = new Image();
      img.onload = () => {
        const c = document.createElement('canvas');
        c.width = 460;
        c.height = 325;
        const ctx = c.getContext('2d');
        ctx.drawImage(img, 0, 100, 460, 325, 0, 0, 460, 325);
        resolve(c.toDataURL('image/png'));
      };
      img.src = '${dataUri}';
    })
  `);

  const base64Data = crops.replace(/^data:image\/png;base64,/, '');
  fs.writeFileSync(path.join(__dirname, 'turnaround-crop.png'), base64Data, 'base64');
  console.log('Saved turnaround-crop.png');
  app.quit();
});
