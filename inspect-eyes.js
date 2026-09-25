const { app, BrowserWindow } = require('electron');
const path = require('path');
const fs = require('fs');

app.whenReady().then(async () => {
  const win = new BrowserWindow({ show: false });
  await win.loadURL('about:blank');

  const idleB64 = fs.readFileSync(path.join(__dirname, 'src/renderer/pico-idle.png')).toString('base64');

  const eyeData = await win.webContents.executeJavaScript(`
    ((idleSrc) => {
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

          // Eye region: x: 20..95, y: 60..90
          const leftEye = { minX: w, maxX: 0, minY: h, maxY: 0 };
          const rightEye = { minX: w, maxX: 0, minY: h, maxY: 0 };

          // Let's sample colors across the eye region:
          const imgData = ctx.getImageData(0, 0, w, h);
          const data = imgData.data;

          // Let's create an enlarged visualization of the eye region
          const eyeCanvas = document.createElement('canvas');
          eyeCanvas.width = 75 * 4;
          eyeCanvas.height = 30 * 4;
          const eCtx = eyeCanvas.getContext('2d');
          eCtx.imageSmoothingEnabled = false;
          eCtx.drawImage(img, 20, 60, 75, 30, 0, 0, 75 * 4, 30 * 4);

          resolve({
            w, h,
            eyeCropDataUrl: eyeCanvas.toDataURL('image/png')
          });
        };
        img.src = 'data:image/png;base64,' + idleSrc;
      });
    })('${idleB64}')
  `);

  fs.writeFileSync(path.join(__dirname, 'eye-region-zoom.png'), eyeData.eyeCropDataUrl.replace(/^data:image\/png;base64,/, ''), 'base64');
  console.log('Saved eye-region-zoom.png');
  app.quit();
});
