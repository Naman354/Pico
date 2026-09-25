const { app, BrowserWindow } = require('electron');
const path = require('path');
const fs = require('fs');

app.whenReady().then(async () => {
  const win = new BrowserWindow({ show: false });
  await win.loadURL('about:blank');

  const idleB64 = fs.readFileSync(path.join(__dirname, 'src/renderer/pico-idle.png')).toString('base64');

  const maskUrl = await win.webContents.executeJavaScript(`
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

          const data = ctx.getImageData(0, 0, w, h);
          const d = data.data;

          const maskCanvas = document.createElement('canvas');
          maskCanvas.width = w;
          maskCanvas.height = h;
          const mCtx = maskCanvas.getContext('2d');
          const mData = mCtx.createImageData(w, h);

          // For every pixel in the eye regions:
          // Left eye: x: 24..54, y: 64..87
          // Right eye: x: 60..90, y: 64..87
          for (let y = 64; y <= 87; y++) {
            for (let x = 24; x <= 90; x++) {
              if (x > 54 && x < 60) continue; // nose area between eyes
              const idx = (y * w + x) * 4;
              const r = d[idx], g = d[idx+1], b = d[idx+2], a = d[idx+3];

              // Is this pixel part of the eye interior?
              // Dark eyelash: r < 75 && g < 55 && b < 50 -> NO
              // Hair bang: r > 160 && g > 65 && g < 135 && b < 85 -> NO
              // Face skin: r > 240 && g > 195 && g < 225 && b > 165 && b < 190 -> NO
              // Sclera: r > 210 && g > 200 && b > 190 && (r-b) < 30 -> YES
              // Iris: (r < 195 && (r < 135 || g < 135)) -> YES
              
              const isDarkLash = (r < 75 && g < 55 && b < 50);
              const isHair = (r > 160 && g > 65 && g < 135 && b < 85);
              const isSkin = (r > 240 && g > 195 && g < 225 && b > 165 && b < 190 && Math.abs(r - b) > 40);

              const isEyeInterior = !isDarkLash && !isHair && !isSkin;
              if (isEyeInterior && a > 100) {
                mData.data[idx] = 255;
                mData.data[idx+1] = 0;
                mData.data[idx+2] = 0;
                mData.data[idx+3] = 255; // Red mark
              }
            }
          }

          mCtx.putImageData(mData, 0, 0);

          // Overlay onto original
          ctx.drawImage(maskCanvas, 0, 0);
          resolve(c.toDataURL('image/png'));
        };
        img.src = 'data:image/png;base64,' + idleSrc;
      });
    })('${idleB64}')
  `);

  fs.writeFileSync(path.join(__dirname, 'eye-mask-test.png'), maskUrl.replace(/^data:image\/png;base64,/, ''), 'base64');
  console.log('Saved eye-mask-test.png');
  app.quit();
});
