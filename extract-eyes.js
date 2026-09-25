const { app, BrowserWindow } = require('electron');
const path = require('path');
const fs = require('fs');

app.whenReady().then(async () => {
  const win = new BrowserWindow({ show: false });
  await win.loadURL('about:blank');

  const idleB64 = fs.readFileSync(path.join(__dirname, 'src/renderer/pico-idle.png')).toString('base64');
  const blinkB64 = fs.readFileSync(path.join(__dirname, 'src/renderer/pico-blink.png')).toString('base64');

  const result = await win.webContents.executeJavaScript(`
    ((idleSrc, blinkSrc) => {
      return new Promise((resolve) => {
        const img = new Image();
        img.onload = () => {
          const w = img.width;
          const h = img.height;
          
          // Let's analyze both eyes:
          // Left eye (viewer's left):
          // In inspect-face: minX=23, maxX=90, minY=65, maxY=87.
          // Left eye is roughly x: 23..52, y: 65..87.
          // Right eye is roughly x: 62..90, y: 65..87.

          const c = document.createElement('canvas');
          c.width = w;
          c.height = h;
          const ctx = c.getContext('2d');
          ctx.drawImage(img, 0, 0);

          // Let's create high-resolution crops of left eye and right eye
          const leftEyeCanvas = document.createElement('canvas');
          leftEyeCanvas.width = 30;
          leftEyeCanvas.height = 25;
          const leCtx = leftEyeCanvas.getContext('2d');
          leCtx.drawImage(img, 23, 64, 30, 25, 0, 0, 30, 25);

          const rightEyeCanvas = document.createElement('canvas');
          rightEyeCanvas.width = 30;
          rightEyeCanvas.height = 25;
          const reCtx = rightEyeCanvas.getContext('2d');
          reCtx.drawImage(img, 61, 64, 30, 25, 0, 0, 30, 25);

          resolve({
            w, h,
            leftEyeUrl: leftEyeCanvas.toDataURL('image/png'),
            rightEyeUrl: rightEyeCanvas.toDataURL('image/png')
          });
        };
        img.src = 'data:image/png;base64,' + idleSrc;
      });
    })('${idleB64}', '${blinkB64}')
  `);

  fs.writeFileSync(path.join(__dirname, 'left-eye.png'), result.leftEyeUrl.replace(/^data:image\/png;base64,/, ''), 'base64');
  fs.writeFileSync(path.join(__dirname, 'right-eye.png'), result.rightEyeUrl.replace(/^data:image\/png;base64,/, ''), 'base64');
  console.log('Saved left-eye.png and right-eye.png');
  app.quit();
});
