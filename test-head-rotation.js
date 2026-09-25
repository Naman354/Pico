const { app, BrowserWindow } = require('electron');
const path = require('path');
const fs = require('fs');

app.whenReady().then(async () => {
  const win = new BrowserWindow({ show: false, width: 800, height: 600 });
  await win.loadURL('about:blank');

  const idleB64 = fs.readFileSync(path.join(__dirname, 'src/renderer/pico-idle.png')).toString('base64');

  const testImgs = await win.webContents.executeJavaScript(`
    ((idleSrc) => {
      return new Promise((resolve) => {
        const img = new Image();
        img.onload = () => {
          const w = img.width;
          const h = img.height;

          // 1. Separate head and body:
          // Neck pivot point: cx = 57, cy = 108
          // Chin line is roughly y: 104..108.
          // Let's create:
          // a) Body canvas: contains everything from y=104 down, PLUS a small filled neck behind the chin
          const bodyCanvas = document.createElement('canvas');
          bodyCanvas.width = w;
          bodyCanvas.height = h;
          const bCtx = bodyCanvas.getContext('2d');
          
          // Draw full body from y=104 down
          bCtx.drawImage(img, 0, 104, w, h - 104, 0, 104, w, h - 104);
          
          // Fill small neck patch behind chin (x: 42..72, y: 98..106) with skin color (#fddcc2) so rotation never exposes transparent void
          bCtx.fillStyle = '#fddcc2';
          bCtx.beginPath();
          bCtx.arc(57, 106, 12, 0, Math.PI * 2);
          bCtx.fill();
          // Draw collar on top of neck patch
          bCtx.drawImage(img, 0, 106, w, h - 106, 0, 106, w, h - 106);

          // b) Head canvas: contains head (y: 0..108)
          const headCanvas = document.createElement('canvas');
          headCanvas.width = w;
          headCanvas.height = h;
          const hCtx = headCanvas.getContext('2d');
          // Clip to y: 0..108
          hCtx.drawImage(img, 0, 0, w, 109, 0, 0, w, 109);

          // Now let's test compositing with head rotation at 0deg, +6deg, -6deg
          const testAngles = [0, 6, -6, 8, -8];
          const results = [];

          testAngles.forEach(deg => {
            const c = document.createElement('canvas');
            c.width = w;
            c.height = h;
            const ctx = c.getContext('2d');

            // Draw body
            ctx.drawImage(bodyCanvas, 0, 0);

            // Draw rotated head around neck pivot (57, 108)
            ctx.save();
            ctx.translate(57, 108);
            ctx.rotate(deg * Math.PI / 180);
            ctx.drawImage(headCanvas, -57, -108);
            ctx.restore();

            results.push({ deg, dataUrl: c.toDataURL('image/png') });
          });

          // Compose a comparison image
          const compW = w * 5 + 60;
          const compH = h + 60;
          const compC = document.createElement('canvas');
          compC.width = compW;
          compC.height = compH;
          const compCtx = compC.getContext('2d');
          compCtx.fillStyle = '#1e293b';
          compCtx.fillRect(0, 0, compW, compH);

          let loaded = 0;
          results.forEach((r, i) => {
            const im = new Image();
            im.onload = () => {
              compCtx.drawImage(im, 10 + i * (w + 10), 30);
              compCtx.font = 'bold 12px sans-serif';
              compCtx.fillStyle = '#38bdf8';
              compCtx.fillText(r.deg + ' deg', 10 + i * (w + 10) + 15, 20);
              loaded++;
              if (loaded === 5) resolve(compC.toDataURL('image/png'));
            };
            im.src = r.dataUrl;
          });
        };
        img.src = 'data:image/png;base64,' + idleSrc;
      });
    })('${idleB64}')
  `);

  fs.writeFileSync(path.join(__dirname, 'test-head-rotations.png'), testImgs.replace(/^data:image\/png;base64,/, ''), 'base64');
  console.log('Saved test-head-rotations.png');
  app.quit();
});
