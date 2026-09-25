const { app, BrowserWindow } = require('electron');
const path = require('path');
const fs = require('fs');

app.whenReady().then(async () => {
  const win = new BrowserWindow({ show: false });
  await win.loadURL('about:blank');

  const idleB64 = fs.readFileSync(path.join(__dirname, 'src/renderer/pico-idle.png')).toString('base64');

  const result = await win.webContents.executeJavaScript(`
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
            // Left eye: x: 33..46, y: 70..84, center: (39.5, 78)
            // Right eye: x: 67..80, y: 70..84, center: (73.5, 78)
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

          // Composite test
          const previewC = document.createElement('canvas');
          previewC.width = w * 4 + 40;
          previewC.height = h + 40;
          const pCtx = previewC.getContext('2d');
          pCtx.fillStyle = '#0f172a';
          pCtx.fillRect(0, 0, previewC.width, previewC.height);

          const overlays = [
            { name: 'Forward', img: null },
            { name: 'Left', img: createEyeOverlay(-2.2, 0) },
            { name: 'Right', img: createEyeOverlay(2.2, 0) },
            { name: 'Down', img: createEyeOverlay(0, 1.8) }
          ];

          let loaded = 0;
          overlays.forEach((o, idx) => {
            const x = 10 + idx * (w + 10);
            pCtx.drawImage(img, x, 20);
            if (o.img) {
              const ovImg = new Image();
              ovImg.onload = () => {
                pCtx.drawImage(ovImg, x, 20);
                pCtx.font = 'bold 12px sans-serif';
                pCtx.fillStyle = '#38bdf8';
                pCtx.fillText(o.name, x + 15, 15);
                loaded++;
                if (loaded === 3) resolve(previewC.toDataURL('image/png'));
              };
              ovImg.src = o.img;
            }
          });
        };
        img.src = 'data:image/png;base64,' + idleSrc;
      });
    })('${idleB64}')
  `);

  fs.writeFileSync(path.join(__dirname, 'test-circle-shift-preview-2.png'), result.replace(/^data:image\/png;base64,/, ''), 'base64');
  console.log('Saved test-circle-shift-preview-2.png');
  app.quit();
});
