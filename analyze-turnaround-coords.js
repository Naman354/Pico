const { app, BrowserWindow } = require('electron');
const path = require('path');
const fs = require('fs');

app.whenReady().then(async () => {
  const win = new BrowserWindow({ show: false });
  await win.loadURL('about:blank');

  const imgBase64 = fs.readFileSync(path.join(__dirname, 'turnaround-crop.png')).toString('base64');
  const dataUri = `data:image/png;base64,${imgBase64}`;

  const crops = await win.webContents.executeJavaScript(`
    new Promise((resolve) => {
      const img = new Image();
      img.onload = () => {
        // Let's crop Side (Left) and Side (Right)
        // Side (Left) is x: 130 to 226, y: 0 to 235
        // Side (Right) is x: 355 to 455, y: 0 to 235
        function crop(x, y, w, h) {
          const c = document.createElement('canvas');
          c.width = w;
          c.height = h;
          const ctx = c.getContext('2d');
          ctx.drawImage(img, x, y, w, h, 0, 0, w, h);
          return c.toDataURL('image/png');
        }

        const sideLeft = crop(130, 0, 100, 240);
        const sideRight = crop(355, 0, 100, 240);
        resolve({ sideLeft, sideRight });
      };
      img.src = '${dataUri}';
    })
  `);

  function save(dataUrl, file) {
    fs.writeFileSync(path.join(__dirname, file), dataUrl.replace(/^data:image\/png;base64,/, ''), 'base64');
  }

  save(crops.sideLeft, 'crop-side-left.png');
  save(crops.sideRight, 'crop-side-right.png');
  console.log('Saved crop-side-left.png and crop-side-right.png');
  app.quit();
});
