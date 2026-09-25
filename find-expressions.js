const { app, BrowserWindow } = require('electron');
const path = require('path');
const fs = require('fs');

app.whenReady().then(async () => {
  const win = new BrowserWindow({ show: false });
  await win.loadURL('about:blank');

  const sheetPath = 'C:/Users/hp/.gemini/antigravity-ide/brain/31db9470-0d36-42b9-9098-2ceae6d52096/.tempmediaStorage/media_1790277058739.jpg';
  const imgBase64 = fs.readFileSync(sheetPath).toString('base64');
  const dataUri = 'data:image/jpeg;base64,' + imgBase64;

  const expressionsCrop = await win.webContents.executeJavaScript(`
    new Promise((resolve) => {
      const img = new Image();
      img.onload = () => {
        // Character sheet size:
        // Let's crop the Expressions row:
        // In sheet-overview, Expressions (Examples) is below Turnaround View.
        // Turnaround View is roughly y: 80..300.
        // Expressions is roughly y: 480..720, x: 0..700 (or full width).
        const c = document.createElement('canvas');
        c.width = img.width;
        c.height = 300;
        const ctx = c.getContext('2d');
        // Let's find where Expressions is:
        ctx.drawImage(img, 0, Math.round(img.height * 0.45), img.width, 300, 0, 0, img.width, 300);
        resolve({
          w: img.width,
          h: img.height,
          url: c.toDataURL('image/png')
        });
      };
      img.src = '${dataUri}';
    })
  `);

  fs.writeFileSync(path.join(__dirname, 'expressions-row.png'), expressionsCrop.url.replace(/^data:image\/png;base64,/, ''), 'base64');
  console.log('Saved expressions-row.png with dimensions:', expressionsCrop.w, 'x', expressionsCrop.h);
  app.quit();
});
