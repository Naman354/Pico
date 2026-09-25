const { app, BrowserWindow } = require('electron');
const path = require('path');
const fs = require('fs');

app.whenReady().then(async () => {
  const win = new BrowserWindow({ show: false, width: 800, height: 600 });
  await win.loadURL('about:blank');

  const idleB64 = fs.readFileSync(path.join(__dirname, 'src/renderer/pico-idle.png')).toString('base64');
  const leftB64 = fs.readFileSync(path.join(__dirname, 'pico-eyes-left.png')).toString('base64');
  const rightB64 = fs.readFileSync(path.join(__dirname, 'pico-eyes-right.png')).toString('base64');
  const downB64 = fs.readFileSync(path.join(__dirname, 'pico-eyes-down.png')).toString('base64');

  const previewUrl = await win.webContents.executeJavaScript(`
    (([idle, left, right, down]) => {
      return new Promise((resolve) => {
        const imgs = [];
        let loaded = 0;
        function check() {
          loaded++;
          if (loaded < 4) return;
          const [imIdle, imLeft, imRight, imDown] = imgs;
          const w = imIdle.width;
          const h = imIdle.height;

          const totalW = w * 4 + 50;
          const totalH = h + 130;
          const c = document.createElement('canvas');
          c.width = totalW;
          c.height = totalH;
          const ctx = c.getContext('2d');

          ctx.fillStyle = '#0f172a';
          ctx.fillRect(0, 0, totalW, totalH);

          const states = [
            { title: 'Neutral Forward', img: null },
            { title: 'Glance Left', img: imLeft },
            { title: 'Glance Right', img: imRight },
            { title: 'Glance Down', img: imDown }
          ];

          states.forEach((s, idx) => {
            const x = 10 + idx * (w + 10);
            const y = 35;

            // Draw base idle character
            ctx.drawImage(imIdle, x, y);

            // Draw eye overlay if present
            if (s.img) {
              ctx.drawImage(s.img, x, y);
            }

            // Label
            ctx.font = 'bold 12px sans-serif';
            ctx.fillStyle = '#38bdf8';
            ctx.fillText(s.title, x + 6, y - 10);

            // Draw 2x zoomed eye box below
            const zoomBoxW = 42;
            const zoomBoxH = 22;
            const zx = x + Math.round((w - zoomBoxW * 2) / 2);
            const zy = y + h + 15;

            ctx.fillStyle = '#1e293b';
            ctx.strokeStyle = '#334155';
            ctx.lineWidth = 1;
            ctx.strokeRect(zx, zy, zoomBoxW * 2, zoomBoxH * 2);
            ctx.fillRect(zx, zy, zoomBoxW * 2, zoomBoxH * 2);

            ctx.imageSmoothingEnabled = false;
            // Draw zoom crop from this composite
            ctx.drawImage(c, x + 23, y + 65, 68, 22, zx, zy, zoomBoxW * 2, zoomBoxH * 2);
            ctx.imageSmoothingEnabled = true;

            ctx.font = '9px sans-serif';
            ctx.fillStyle = '#94a3b8';
            ctx.fillText('EYES 2X', zx + 4, zy + zoomBoxH * 2 + 14);
          });

          resolve(c.toDataURL('image/png'));
        }

        [idle, left, right, down].forEach(src => {
          const img = new Image();
          img.onload = check;
          img.src = 'data:image/png;base64,' + src;
          imgs.push(img);
        });
      });
    })([ '${idleB64}', '${leftB64}', '${rightB64}', '${downB64}' ])
  `);

  fs.writeFileSync(path.join(__dirname, 'preview-eye-states.png'), previewUrl.replace(/^data:image\/png;base64,/, ''), 'base64');
  console.log('Saved preview-eye-states.png');
  app.quit();
});
