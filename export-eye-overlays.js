const { app, BrowserWindow } = require('electron');
const path = require('path');
const fs = require('fs');

app.whenReady().then(async () => {
  const win = new BrowserWindow({ show: false });
  await win.loadURL('about:blank');

  const idleB64 = fs.readFileSync(path.join(__dirname, 'src/renderer/pico-idle.png')).toString('base64');

  const files = await win.webContents.executeJavaScript(`
    ((idleSrc) => {
      return new Promise((resolve) => {
        const img = new Image();
        img.onload = () => {
          const w = img.width, h = img.height;

          function createEyeOverlay(dx, dy) {
            const c = document.createElement('canvas');
            c.width = w;
            c.height = h;
            const ctx = c.getContext('2d');

            // Exact eye socket clipping boxes:
            // Left eye: x: 33..46, y: 70..84, center: (39.5, 77.5)
            // Right eye: x: 67..80, y: 70..84, center: (73.5, 77.5)
            const eyes = [
              { cx: 39.5, cy: 77.5, rx: 6.0, ry: 7.0, clipX: 32.5, clipW: 13.5, clipY: 69, clipH: 15 },
              { cx: 73.5, cy: 77.5, rx: 6.0, ry: 7.0, clipX: 67.0, clipW: 13.5, clipY: 69, clipH: 15 }
            ];

            eyes.forEach(eye => {
              // 1. Draw sclera inside clipped socket
              ctx.save();
              ctx.beginPath();
              ctx.rect(eye.clipX, eye.clipY, eye.clipW, eye.clipH);
              ctx.clip();

              // Smooth sclera
              ctx.beginPath();
              ctx.ellipse(eye.cx, eye.cy, eye.rx + 1.5, eye.ry + 1, 0, 0, Math.PI * 2);
              ctx.fillStyle = '#faf5ef';
              ctx.fill();

              // 2. Draw shifted iris
              ctx.save();
              ctx.beginPath();
              ctx.ellipse(eye.cx + dx, eye.cy + dy, eye.rx, eye.ry, 0, 0, Math.PI * 2);
              ctx.clip();
              ctx.drawImage(img, dx, dy);
              ctx.restore();

              // 3. Restore upper lash
              ctx.save();
              ctx.beginPath();
              ctx.rect(eye.clipX - 1, eye.clipY, eye.clipW + 2, 4);
              ctx.clip();
              ctx.drawImage(img, 0, 0);
              ctx.restore();

              ctx.restore();
            });

            return c.toDataURL('image/png');
          }

          resolve({
            lookLeft: createEyeOverlay(-2.2, 0),
            lookRight: createEyeOverlay(2.2, 0),
            lookDown: createEyeOverlay(0, 1.8)
          });
        };
        img.src = 'data:image/png;base64,' + idleSrc;
      });
    })('${idleB64}')
  `);

  fs.writeFileSync(path.join(__dirname, 'src/renderer/pico-eyes-left.png'), files.lookLeft.replace(/^data:image\/png;base64,/, ''), 'base64');
  fs.writeFileSync(path.join(__dirname, 'src/renderer/pico-eyes-right.png'), files.lookRight.replace(/^data:image\/png;base64,/, ''), 'base64');
  fs.writeFileSync(path.join(__dirname, 'src/renderer/pico-eyes-down.png'), files.lookDown.replace(/^data:image\/png;base64,/, ''), 'base64');

  console.log('Successfully saved pico-eyes-left.png, pico-eyes-right.png, and pico-eyes-down.png');
  app.quit();
});
