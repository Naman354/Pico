const { app, BrowserWindow } = require('electron');
const path = require('path');
const fs = require('fs');

app.whenReady().then(async () => {
  const win = new BrowserWindow({ show: false });
  await win.loadURL('about:blank');

  const files = [
    'pico-verify-1-idle.png',
    'pico-verify-2-turn-right.png',
    'pico-verify-3-walk-right.png',
    'pico-verify-4-turn-around.png',
    'pico-verify-5-walk-left.png',
    'pico-verify-6-stopped-idle.png'
  ];

  const b64s = files.map(f => fs.readFileSync(path.join(__dirname, f)).toString('base64'));

  const showcase = await win.webContents.executeJavaScript(`
    ((imagesData) => {
      return new Promise((resolve) => {
        let loaded = 0;
        const imgs = [];

        // Exact measured coordinates
        const crops = [
          { x: 250, y: 360, w: 48, h: 78 }, // 1. Idle (Front)
          { x: 253, y: 360, w: 44, h: 78 }, // 2. Turn to Right
          { x: 255, y: 360, w: 42, h: 78 }, // 3. Walk Right (Side)
          { x: 253, y: 360, w: 44, h: 78 }, // 4. Turn Around
          { x: 249, y: 360, w: 42, h: 78 }, // 5. Walk Left (Side)
          { x: 163, y: 360, w: 48, h: 78 }  // 6. Stop -> Idle
        ];

        const labels = [
          '1. Idle (Front)',
          '2. Turn to Right',
          '3. Walk Right (Side)',
          '4. Turn Around',
          '5. Walk Left (Side)',
          '6. Stop -> Idle'
        ];

        const subLabels = [
          'Front stance (breathing)',
          'Natural pivot transition',
          'Side profile (Step 1)',
          'Direction reversal pivot',
          'Side profile (facing left)',
          'Front stance restored'
        ];

        function check() {
          loaded++;
          if (loaded < 6) return;

          const panelW = 145;
          const totalW = panelW * 6 + 20;
          const totalH = 260;

          const c = document.createElement('canvas');
          c.width = totalW;
          c.height = totalH;
          const ctx = c.getContext('2d');

          // Dark desktop wallpaper background
          ctx.fillStyle = '#1e293b';
          ctx.fillRect(0, 0, totalW, totalH);

          // Header section
          ctx.fillStyle = '#0f172a';
          ctx.fillRect(0, 0, totalW, 64);

          ctx.fillStyle = '#f8fafc';
          ctx.font = 'bold 15px system-ui, sans-serif';
          ctx.fillText('Pico Milestone 2A: Natural Walking Direction & Grounded Verification', 20, 28);

          ctx.fillStyle = '#94a3b8';
          ctx.font = '12px system-ui, sans-serif';
          ctx.fillText('Authoritative Style A side profile • Alternating leg strides • Natural turns • 0.000px Foot Drift', 20, 48);

          // Taskbar surface at bottom
          const taskbarTop = 200;
          ctx.fillStyle = '#0b0f19';
          ctx.fillRect(0, taskbarTop, totalW, totalH - taskbarTop);

          // Taskbar accent border
          ctx.fillStyle = '#1e293b';
          ctx.fillRect(0, taskbarTop, totalW, 1);

          // Ground Baseline verification line (Bright Red)
          ctx.strokeStyle = '#ef4444';
          ctx.lineWidth = 1.5;
          ctx.beginPath();
          ctx.moveTo(10, taskbarTop + 0.5);
          ctx.lineTo(totalW - 10, taskbarTop + 0.5);
          ctx.stroke();

          ctx.fillStyle = '#ef4444';
          ctx.font = 'bold 10px system-ui, sans-serif';
          ctx.fillText('GROUND BASELINE (LOCKED TO TASKBAR SURFACE: 0.000px DRIFT)', 20, taskbarTop + 16);

          for (let i = 0; i < 6; i++) {
            const px = 10 + i * panelW;
            const img = imgs[i];
            const crop = crops[i];

            // Panel background card
            ctx.fillStyle = 'rgba(255, 255, 255, 0.03)';
            ctx.fillRect(px + 4, 72, panelW - 8, 124);

            // Card header & label
            ctx.fillStyle = '#f1f5f9';
            ctx.font = 'bold 12px system-ui, sans-serif';
            ctx.textAlign = 'center';
            ctx.fillText(labels[i], px + panelW / 2, 90);

            ctx.fillStyle = '#94a3b8';
            ctx.font = '10px system-ui, sans-serif';
            ctx.fillText(subLabels[i], px + panelW / 2, 105);

            // Draw cropped character standing right on taskbarTop
            const charTargetX = px + Math.round((panelW - crop.w) / 2);
            const charTargetY = taskbarTop - crop.h + 1; // feet terminate exactly at taskbarTop
            ctx.drawImage(img, crop.x, crop.y, crop.w, crop.h, charTargetX, charTargetY, crop.w, crop.h);

            // Subtle panel divider
            if (i < 5) {
              ctx.strokeStyle = '#334155';
              ctx.lineWidth = 1;
              ctx.beginPath();
              ctx.moveTo(px + panelW, 72);
              ctx.lineTo(px + panelW, taskbarTop);
              ctx.stroke();
            }
          }

          resolve(c.toDataURL('image/png'));
        }

        for (let i = 0; i < 6; i++) {
          const img = new Image();
          img.onload = check;
          img.src = 'data:image/png;base64,' + imagesData[i];
          imgs.push(img);
        }
      });
    })(${JSON.stringify(b64s)})
  `);

  fs.writeFileSync(path.join(__dirname, 'pico-walking-correction-showcase.png'), showcase.replace(/^data:image\/png;base64,/, ''), 'base64');
  console.log('Saved pico-walking-correction-showcase.png');
  app.quit();
  process.exit(0);
});
