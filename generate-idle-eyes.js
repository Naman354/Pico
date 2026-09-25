const { app, BrowserWindow } = require('electron');
const path = require('path');
const fs = require('fs');

app.whenReady().then(async () => {
  const win = new BrowserWindow({ show: false });
  await win.loadURL('about:blank');

  const idleB64 = fs.readFileSync(path.join(__dirname, 'src/renderer/pico-idle.png')).toString('base64');

  const eyeSprites = await win.webContents.executeJavaScript(`
    ((idleSrc) => {
      return new Promise((resolve) => {
        const img = new Image();
        img.onload = () => {
          const w = img.width;
          const h = img.height;

          // Eye coordinates from inspect-face:
          // Left eye: x: 23..54, y: 64..87
          // Right eye: x: 60..91, y: 64..87
          
          // Let's create high quality eye overlays by extracting the eye region and shifting pupils/irises:
          function createEyeOverlay(shiftX, shiftY, isDown = false) {
            const c = document.createElement('canvas');
            c.width = w;
            c.height = h;
            const ctx = c.getContext('2d');

            // Draw eyes onto scratch canvas
            const scratch = document.createElement('canvas');
            scratch.width = w;
            scratch.height = h;
            const sCtx = scratch.getContext('2d');
            sCtx.drawImage(img, 0, 0);

            // Left eye box: x: 24, y: 64, w: 30, h: 24
            // Right eye box: x: 61, y: 64, w: 30, h: 24
            // For left glance: shiftX = -2.5 (viewer left)
            // For right glance: shiftX = +2.5 (viewer right)
            // For down glance: shiftX = 0, shiftY = +2.0

            // To shift the iris cleanly:
            // 1. In sclera areas (white of the eyes): fill in background sclera
            // Left eye iris is approx x: 31..50, y: 66..86
            // Right eye iris is approx x: 66..85, y: 66..86
            
            // Draw left eye shifted
            const eyeBoxes = [
              { x: 24, y: 65, w: 29, h: 22, irisX: 32, irisW: 19 },
              { x: 61, y: 65, w: 29, h: 22, irisX: 68, irisW: 19 }
            ];

            eyeBoxes.forEach(box => {
              // Fill sclera base
              // Color of sclera: #fefefe to #f5ede6
              ctx.save();
              ctx.beginPath();
              // Ellipse matching eye opening
              ctx.ellipse(box.x + box.w / 2, box.y + box.h / 2, box.w / 2 - 1, box.h / 2 - 1, 0, 0, Math.PI * 2);
              ctx.clip();

              // Draw base sclera gradient
              const grad = ctx.createLinearGradient(box.x, box.y, box.x, box.y + box.h);
              grad.addColorStop(0, '#e8dcd2');
              grad.addColorStop(0.3, '#fbf8f5');
              grad.addColorStop(1, '#ffffff');
              ctx.fillStyle = grad;
              ctx.fillRect(box.x, box.y, box.w, box.h);

              // Draw shifted iris from original
              ctx.drawImage(img, 
                box.irisX, box.y, box.irisW, box.h,
                box.irisX + shiftX, box.y + shiftY, box.irisW, box.h
              );

              // Redraw upper eyelashes / eyelid over the iris so it tucks under the lash line
              ctx.drawImage(img,
                box.x, box.y, box.w, 8,
                box.x, box.y, box.w, 8
              );

              // Redraw corner outlines
              ctx.drawImage(img,
                box.x, box.y, 4, box.h,
                box.x, box.y, 4, box.h
              );
              ctx.drawImage(img,
                box.x + box.w - 4, box.y, 4, box.h,
                box.x + box.w - 4, box.y, 4, box.h
              );

              ctx.restore();
            });

            return c.toDataURL('image/png');
          }

          resolve({
            lookLeft: createEyeOverlay(-3.0, 0),
            lookRight: createEyeOverlay(3.0, 0),
            lookDown: createEyeOverlay(0, 2.0, true)
          });
        };
        img.src = 'data:image/png;base64,' + idleSrc;
      });
    })('${idleB64}')
  `);

  fs.writeFileSync(path.join(__dirname, 'test-look-left.png'), eyeSprites.lookLeft.replace(/^data:image\/png;base64,/, ''), 'base64');
  fs.writeFileSync(path.join(__dirname, 'test-look-right.png'), eyeSprites.lookRight.replace(/^data:image\/png;base64,/, ''), 'base64');
  fs.writeFileSync(path.join(__dirname, 'test-look-down.png'), eyeSprites.lookDown.replace(/^data:image\/png;base64,/, ''), 'base64');

  console.log('Saved test-look eye sprites');
  app.quit();
});
