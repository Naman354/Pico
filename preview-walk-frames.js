const { app, BrowserWindow } = require('electron');
const path = require('path');
const fs = require('fs');

app.whenReady().then(async () => {
  const win = new BrowserWindow({ show: false });
  await win.loadURL('about:blank');

  const f0 = fs.readFileSync(path.join(__dirname, 'src', 'renderer', 'pico-side-stand.png')).toString('base64');
  const f1 = fs.readFileSync(path.join(__dirname, 'src', 'renderer', 'pico-side-walk-1.png')).toString('base64');
  const f2 = fs.readFileSync(path.join(__dirname, 'src', 'renderer', 'pico-side-walk-2.png')).toString('base64');

  const comp = await win.webContents.executeJavaScript(`
    new Promise((resolve) => {
      let count = 0;
      const img0 = new Image();
      const img1 = new Image();
      const img2 = new Image();

      function check() {
        count++;
        if (count < 3) return;

        const c = document.createElement('canvas');
        c.width = 400;
        c.height = 220;
        const ctx = c.getContext('2d');

        // Background
        ctx.fillStyle = '#1e293b';
        ctx.fillRect(0, 0, 400, 182);
        ctx.fillStyle = '#0f172a';
        ctx.fillRect(0, 182, 400, 38);

        // Baseline
        ctx.strokeStyle = '#ef4444';
        ctx.lineWidth = 1;
        ctx.beginPath();
        ctx.moveTo(0, 181.5);
        ctx.lineTo(400, 181.5);
        ctx.stroke();

        ctx.drawImage(img0, 10, 0);
        ctx.drawImage(img1, 140, 0);
        ctx.drawImage(img2, 270, 0);

        ctx.fillStyle = '#ffffff';
        ctx.font = '12px sans-serif';
        ctx.fillText('Passing / Stand', 20, 202);
        ctx.fillText('Walk Step 1', 160, 202);
        ctx.fillText('Walk Step 2', 290, 202);

        resolve(c.toDataURL('image/png'));
      }

      img0.onload = check;
      img1.onload = check;
      img2.onload = check;

      img0.src = 'data:image/png;base64,${f0}';
      img1.src = 'data:image/png;base64,${f1}';
      img2.src = 'data:image/png;base64,${f2}';
    })
  `);

  fs.writeFileSync(path.join(__dirname, 'walk-frames-preview.png'), comp.replace(/^data:image\/png;base64,/, ''), 'base64');
  console.log('Saved walk-frames-preview.png');
  app.quit();
});
