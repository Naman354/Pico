const { app, BrowserWindow } = require('electron');
const path = require('path');
const fs = require('fs');

app.whenReady().then(async () => {
  const win = new BrowserWindow({ show: false });
  await win.loadURL('about:blank');

  const idleB64 = fs.readFileSync(path.join(__dirname, 'src/renderer/pico-idle.png')).toString('base64');
  const blinkB64 = fs.readFileSync(path.join(__dirname, 'src/renderer/pico-blink.png')).toString('base64');

  const diff = await win.webContents.executeJavaScript(`
    ((idleSrc, blinkSrc) => {
      return new Promise((resolve) => {
        const img1 = new Image();
        const img2 = new Image();
        let loaded = 0;
        function check() {
          loaded++;
          if (loaded < 2) return;
          const w = img1.width;
          const h = img1.height;
          const c = document.createElement('canvas');
          c.width = w;
          c.height = h;
          const ctx = c.getContext('2d');
          
          ctx.drawImage(img1, 0, 0);
          const d1 = ctx.getImageData(0, 0, w, h).data;
          
          ctx.clearRect(0, 0, w, h);
          ctx.drawImage(img2, 0, 0);
          const d2 = ctx.getImageData(0, 0, w, h).data;
          
          let minX = w, maxX = 0, minY = h, maxY = 0;
          let changedPixels = 0;
          for (let y = 0; y < h; y++) {
            for (let x = 0; x < w; x++) {
              const idx = (y * w + x) * 4;
              const alphaBlink = d2[idx + 3];
              if (alphaBlink > 20) {
                changedPixels++;
                if (x < minX) minX = x;
                if (x > maxX) maxX = x;
                if (y < minY) minY = y;
                if (y > maxY) maxY = y;
              }
            }
          }
          resolve({ w, h, changedPixels, minX, maxX, minY, maxY });
        }
        img1.onload = check;
        img2.onload = check;
        img1.src = 'data:image/png;base64,' + idleSrc;
        img2.src = 'data:image/png;base64,' + blinkSrc;
      });
    })('${idleB64}', '${blinkB64}')
  `);

  console.log('Blink overlay bounds:', diff);
  app.quit();
});
