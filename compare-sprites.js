const { app, BrowserWindow } = require('electron');
const path = require('path');
const fs = require('fs');

app.whenReady().then(async () => {
  const win = new BrowserWindow({ show: false });
  await win.loadURL('about:blank');

  const idleB64 = fs.readFileSync(path.join(__dirname, 'src', 'renderer', 'pico-idle.png')).toString('base64');
  const rightB64 = fs.readFileSync(path.join(__dirname, 'src', 'renderer', 'pico-side-right.png')).toString('base64');
  const leftB64 = fs.readFileSync(path.join(__dirname, 'src', 'renderer', 'pico-side-left.png')).toString('base64');

  const comp = await win.webContents.executeJavaScript(`
    new Promise((resolve) => {
      let count = 0;
      const idleImg = new Image();
      const rightImg = new Image();
      const leftImg = new Image();

      function check() {
        count++;
        if (count < 3) return;

        const c = document.createElement('canvas');
        c.width = 450;
        c.height = 240;
        const ctx = c.getContext('2d');

        // Draw a simulated dark desktop taskbar background
        ctx.fillStyle = '#1e293b';
        ctx.fillRect(0, 0, 450, 182);
        ctx.fillStyle = '#0f172a';
        ctx.fillRect(0, 182, 450, 58); // Taskbar ledge at y=182

        // Baseline red line for verification
        ctx.strokeStyle = '#ef4444';
        ctx.lineWidth = 1;
        ctx.beginPath();
        ctx.moveTo(0, 181.5);
        ctx.lineTo(450, 181.5);
        ctx.stroke();

        // 1. Idle (front-facing)
        ctx.drawImage(idleImg, 20, 0);

        // 2. Side (facing right)
        ctx.drawImage(rightImg, 160, 0);

        // 3. Side (facing left)
        ctx.drawImage(leftImg, 300, 0);

        // Add labels
        ctx.fillStyle = '#ffffff';
        ctx.font = 'bold 12px sans-serif';
        ctx.fillText('Front (Idle)', 40, 205);
        ctx.fillText('Side Right (Walk Right)', 160, 205);
        ctx.fillText('Side Left (Walk Left)', 310, 205);

        resolve(c.toDataURL('image/png'));
      }

      idleImg.onload = check;
      rightImg.onload = check;
      leftImg.onload = check;

      idleImg.src = 'data:image/png;base64,${idleB64}';
      rightImg.src = 'data:image/png;base64,${rightB64}';
      leftImg.src = 'data:image/png;base64,${leftB64}';
    })
  `);

  fs.writeFileSync(path.join(__dirname, 'side-profile-comparison.png'), comp.replace(/^data:image\/png;base64,/, ''), 'base64');
  console.log('Saved side-profile-comparison.png');
  app.quit();
});
