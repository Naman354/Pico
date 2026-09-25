const { app, BrowserWindow } = require('electron');
const path = require('path');
const fs = require('fs');

app.whenReady().then(async () => {
  const win = new BrowserWindow({ show: false });
  await win.loadURL('about:blank');

  const idleB64 = fs.readFileSync(path.join(__dirname, 'src/renderer/pico-idle.png')).toString('base64');

  const overlays = await win.webContents.executeJavaScript(`
    ((idleSrc) => {
      return new Promise((resolve) => {
        const img = new Image();
        img.onload = () => {
          const w = img.width;
          const h = img.height;

          // Scratch canvas with original idle
          const cOrig = document.createElement('canvas');
          cOrig.width = w;
          cOrig.height = h;
          const ctxOrig = cOrig.getContext('2d');
          ctxOrig.drawImage(img, 0, 0);
          const origData = ctxOrig.getImageData(0, 0, w, h);

          // We will generate:
          // 1. eyes-left overlay
          // 2. eyes-right overlay
          // 3. eyes-down overlay

          // For each eye, let's identify the interior of the eye socket:
          // Left Eye: center approx (39, 76), radius X: 14, radius Y: 11
          // Right Eye: center approx (76, 76), radius X: 14, radius Y: 11

          function generateOverlay(dx, dy, eyelidDrop = 0) {
            const outC = document.createElement('canvas');
            outC.width = w;
            outC.height = h;
            const ctx = outC.getContext('2d');

            const eyes = [
              { cx: 39.5, cy: 76.5, rx: 13.5, ry: 10.5, x0: 24, y0: 65, w0: 31, h0: 23 },
              { cx: 75.5, cy: 76.5, rx: 13.5, ry: 10.5, x0: 61, y0: 65, w0: 31, h0: 23 }
            ];

            eyes.forEach(eye => {
              // 1. Extract eye patch from original
              const patchC = document.createElement('canvas');
              patchC.width = eye.w0;
              patchC.height = eye.h0;
              const pCtx = patchC.getContext('2d');
              pCtx.drawImage(img, eye.x0, eye.y0, eye.w0, eye.h0, 0, 0, eye.w0, eye.h0);
              const pData = pCtx.getImageData(0, 0, eye.w0, eye.h0);

              // 2. Build shifted eye patch
              const shiftedC = document.createElement('canvas');
              shiftedC.width = eye.w0;
              shiftedC.height = eye.h0;
              const sCtx = shiftedC.getContext('2d');

              // Create smooth ellipse clip for the eye socket interior
              sCtx.save();
              sCtx.beginPath();
              // Subtle organic shape
              const ecx = eye.cx - eye.x0;
              const ecy = eye.cy - eye.y0;
              sCtx.ellipse(ecx, ecy, eye.rx - 1.2, eye.ry - 1.2, 0, 0, Math.PI * 2);
              sCtx.clip();

              // Background sclera (white of eye with warm soft gradient)
              const grad = sCtx.createRadialGradient(ecx, ecy, 2, ecx, ecy, eye.rx);
              grad.addColorStop(0, '#ffffff');
              grad.addColorStop(0.7, '#fefaf6');
              grad.addColorStop(1, '#ebe0d5');
              sCtx.fillStyle = grad;
              sCtx.fillRect(0, 0, eye.w0, eye.h0);

              // Draw iris/pupil shifted by (dx, dy)
              sCtx.drawImage(patchC, dx, dy);
              sCtx.restore();

              // If eyelid drops (for down glance or sleepy look)
              if (eyelidDrop > 0) {
                sCtx.save();
                sCtx.beginPath();
                sCtx.ellipse(ecx, ecy - eye.ry + eyelidDrop, eye.rx, eyelidDrop + 2, 0, 0, Math.PI * 2);
                sCtx.fillStyle = '#ffdfcb';
                sCtx.fill();
                sCtx.restore();
              }

              // 3. Composite original upper eyelash, bangs, and outer contour OVER the shifted iris!
              // Any pixel that is dark (eyelash) or orange (hair bang) in the original patch gets preserved on top
              const shiftedData = sCtx.getImageData(0, 0, eye.w0, eye.h0);
              for (let y = 0; y < eye.h0; y++) {
                for (let x = 0; x < eye.w0; x++) {
                  const idx = (y * eye.w0 + x) * 4;
                  const r = pData.data[idx];
                  const g = pData.data[idx+1];
                  const b = pData.data[idx+2];
                  const a = pData.data[idx+3];

                  // Distance from eye center
                  const dist = Math.pow((x - ecx) / (eye.rx - 0.5), 2) + Math.pow((y - ecy) / (eye.ry - 0.5), 2);
                  
                  // If pixel is outside eye ellipse, keep original transparent
                  if (dist > 1.05) {
                    shiftedData.data[idx+3] = 0;
                    continue;
                  }

                  // If original pixel is hair (orange: r>190, g<120, b<70) or dark lash (r<100, g<70, b<60)
                  const isHair = (r > 170 && g > 60 && g < 130 && b < 80);
                  const isLash = (r < 95 && g < 65 && b < 60);
                  const isSkinOutside = (y < 4 || y > eye.h0 - 3 || x < 2 || x > eye.w0 - 2);

                  if (isHair || isLash || isSkinOutside) {
                    // Blend original on top
                    const blend = isSkinOutside ? 1.0 : 0.85;
                    shiftedData.data[idx] = Math.round(shiftedData.data[idx] * (1 - blend) + r * blend);
                    shiftedData.data[idx+1] = Math.round(shiftedData.data[idx+1] * (1 - blend) + g * blend);
                    shiftedData.data[idx+2] = Math.round(shiftedData.data[idx+2] * (1 - blend) + b * blend);
                  }

                  // Soft antialiased boundary of the eye socket
                  if (dist > 0.85 && dist <= 1.05) {
                    const edgeAlpha = (1.05 - dist) / 0.2;
                    shiftedData.data[idx+3] = Math.round(shiftedData.data[idx+3] * edgeAlpha);
                  }
                }
              }

              sCtx.putImageData(shiftedData, 0, 0);

              // Draw this eye onto full overlay
              ctx.drawImage(shiftedC, eye.x0, eye.y0);
            });

            return outC.toDataURL('image/png');
          }

          resolve({
            lookLeft: generateOverlay(-2.8, 0),
            lookRight: generateOverlay(2.8, 0),
            lookDown: generateOverlay(0, 2.2, 1.8)
          });
        };
        img.src = 'data:image/png;base64,' + idleSrc;
      });
    })('${idleB64}')
  `);

  fs.writeFileSync(path.join(__dirname, 'pico-eyes-left.png'), overlays.lookLeft.replace(/^data:image\/png;base64,/, ''), 'base64');
  fs.writeFileSync(path.join(__dirname, 'pico-eyes-right.png'), overlays.lookRight.replace(/^data:image\/png;base64,/, ''), 'base64');
  fs.writeFileSync(path.join(__dirname, 'pico-eyes-down.png'), overlays.lookDown.replace(/^data:image\/png;base64,/, ''), 'base64');

  console.log('Saved pico-eyes-left.png, pico-eyes-right.png, and pico-eyes-down.png');
  app.quit();
});
