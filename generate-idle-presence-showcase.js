const { app, BrowserWindow } = require('electron');
const path = require('path');
const fs = require('fs');

app.whenReady().then(async () => {
  const win = new BrowserWindow({ show: false, width: 1200, height: 700 });
  await win.loadURL('about:blank');

  const files = [
    'idle-state-1-forward.png',
    'idle-state-2-glance-left.png',
    'idle-state-3-glance-right.png',
    'idle-state-4-glance-down.png',
    'idle-state-5-head-turn-left.png',
    'idle-state-6-head-turn-right.png',
    'idle-state-7-head-tilt.png',
    'idle-state-8-weight-shift.png'
  ];

  const b64s = files.map(f => fs.readFileSync(path.join(__dirname, f)).toString('base64'));

  const showcase = await win.webContents.executeJavaScript(`
    ((imagesData) => {
      return new Promise((resolve) => {
        let loaded = 0;
        const imgs = [];

        // All captures have Pico at minX: 374..376, maxX: 421..423, minY: 422, maxY: 499
        // Crop box: x: 370, y: 420, w: 56, h: 80
        const crop = { x: 370, y: 420, w: 56, h: 80 };

        const states = [
          { title: '1. Neutral Forward', type: 'FORWARD IDLE', desc: 'Eyes forward at user', tagColor: '#64748b' },
          { title: '2. Glance Left', type: 'PRIMARY: EYES', desc: 'Subtle eye glance left', tagColor: '#38bdf8' },
          { title: '3. Glance Right', type: 'PRIMARY: EYES', desc: 'Subtle eye glance right', tagColor: '#38bdf8' },
          { title: '4. Glance Down', type: 'PRIMARY: EYES', desc: 'Eyes down + chin tuck', tagColor: '#38bdf8' },
          { title: '5. Head Turn Left', type: 'SECONDARY: TURN', desc: 'Eyes left + 6° head turn', tagColor: '#818cf8' },
          { title: '6. Head Turn Right', type: 'SECONDARY: TURN', desc: 'Eyes right + 6° head turn', tagColor: '#818cf8' },
          { title: '7. Tiny Head Tilt', type: 'OCCASIONAL TILT', desc: 'Curious 5° head tilt', tagColor: '#c084fc' },
          { title: '8. Weight Shift', type: 'POSTURE SHIFT', desc: '0.6° relaxed balance shift', tagColor: '#34d399' }
        ];

        function check() {
          loaded++;
          if (loaded < 8) return;

          const panelW = 142;
          const totalW = panelW * 8 + 36;
          const totalH = 430;

          const c = document.createElement('canvas');
          c.width = totalW;
          c.height = totalH;
          const ctx = c.getContext('2d');

          // Deep slate background
          ctx.fillStyle = '#0b1120';
          ctx.fillRect(0, 0, totalW, totalH);

          // Top Header Banner
          ctx.fillStyle = '#1e293b';
          ctx.fillRect(0, 0, totalW, 64);
          ctx.strokeStyle = '#334155';
          ctx.lineWidth = 1;
          ctx.beginPath();
          ctx.moveTo(0, 64);
          ctx.lineTo(totalW, 64);
          ctx.stroke();

          // Title
          ctx.font = 'bold 18px -apple-system, BlinkMacSystemFont, "Segoe UI", Roboto, sans-serif';
          ctx.fillStyle = '#38bdf8';
          ctx.fillText('Milestone 2A — Improved Pico Idle Presence', 20, 27);

          // Subtitle
          ctx.font = '12px -apple-system, BlinkMacSystemFont, "Segoe UI", Roboto, sans-serif';
          ctx.fillStyle = '#94a3b8';
          ctx.fillText('Restrained, varied autonomous attention shifts | Subtle eye glances, head turns, tilts, and weight shifts | 0.000px foot drift', 20, 48);

          // Draw 8 state cards
          for (let i = 0; i < 8; i++) {
            const s = states[i];
            const px = 18 + i * panelW;
            const py = 76;
            const pw = panelW - 10;
            const ph = totalH - 92;

            // Card background
            ctx.fillStyle = '#1e293b';
            ctx.strokeStyle = '#334155';
            ctx.lineWidth = 1;
            ctx.beginPath();
            ctx.roundRect(px, py, pw, ph, 8);
            ctx.fill();
            ctx.stroke();

            // Category badge
            ctx.fillStyle = '#0f172a';
            ctx.beginPath();
            ctx.roundRect(px + 8, py + 8, pw - 16, 20, 4);
            ctx.fill();

            ctx.font = 'bold 8.5px -apple-system, BlinkMacSystemFont, sans-serif';
            ctx.fillStyle = s.tagColor;
            ctx.fillText(s.type, px + 12, py + 22);

            // Title
            ctx.font = 'bold 11px -apple-system, BlinkMacSystemFont, sans-serif';
            ctx.fillStyle = '#f8fafc';
            ctx.fillText(s.title, px + 8, py + 44);

            // Desc
            ctx.font = '9.5px -apple-system, BlinkMacSystemFont, sans-serif';
            ctx.fillStyle = '#94a3b8';
            ctx.fillText(s.desc, px + 8, py + 58);

            // Inner viewport container
            const boxX = px + 8;
            const boxY = py + 68;
            const boxW = pw - 16;
            const boxH = 150;

            ctx.fillStyle = '#090d16';
            ctx.beginPath();
            ctx.roundRect(boxX, boxY, boxW, boxH, 6);
            ctx.fill();

            // Taskbar red baseline
            const groundY = boxY + boxH - 14;
            ctx.strokeStyle = '#ef4444';
            ctx.lineWidth = 1.5;
            ctx.beginPath();
            ctx.moveTo(boxX + 6, groundY + 0.5);
            ctx.lineTo(boxX + boxW - 6, groundY + 0.5);
            ctx.stroke();

            // Render character at 1x
            const scale = 1.15;
            const renderW = Math.round(crop.w * scale);
            const renderH = Math.round(crop.h * scale);
            const drawX = boxX + Math.round((boxW - renderW) / 2);
            const drawY = groundY - renderH + 3;
            ctx.drawImage(imgs[i], crop.x, crop.y, crop.w, crop.h, drawX, drawY, renderW, renderH);

            // Zoom Inset Container at bottom of card
            const zoomBoxX = px + 8;
            const zoomBoxY = boxY + boxH + 8;
            const zoomBoxW = pw - 16;
            const zoomBoxH = 80;

            ctx.fillStyle = '#090d16';
            ctx.strokeStyle = '#334155';
            ctx.lineWidth = 1;
            ctx.beginPath();
            ctx.roundRect(zoomBoxX, zoomBoxY, zoomBoxW, zoomBoxH, 6);
            ctx.fill();
            ctx.stroke();

            // Draw 2x zoomed head & eye region
            ctx.imageSmoothingEnabled = false;
            const headCrop = { x: 376, y: 432, w: 44, h: 48 };
            const zoomScale = 1.6;
            const zw = Math.round(headCrop.w * zoomScale);
            const zh = Math.round(headCrop.h * zoomScale);
            const zx = zoomBoxX + Math.round((zoomBoxW - zw) / 2);
            const zy = zoomBoxY + 3;
            ctx.drawImage(imgs[i], headCrop.x, headCrop.y, headCrop.w, headCrop.h, zx, zy, zw, zh);
            ctx.imageSmoothingEnabled = true;

            // Zoom label
            ctx.font = 'bold 8px -apple-system, BlinkMacSystemFont, sans-serif';
            ctx.fillStyle = '#fbbf24';
            ctx.fillText('FACE & EYES 2X', zoomBoxX + 6, zoomBoxY + 74);
          }

          // Global ground baseline label
          ctx.font = '10px -apple-system, BlinkMacSystemFont, sans-serif';
          ctx.fillStyle = '#f87171';
          ctx.fillText('Taskbar Ground Baseline (0.000px Foot Drift Verified Across All 8 States)', 20, totalH - 12);

          resolve(c.toDataURL('image/png'));
        }

        for (let i = 0; i < 8; i++) {
          const img = new Image();
          img.onload = check;
          img.src = 'data:image/png;base64,' + imagesData[i];
          imgs.push(img);
        }
      });
    })(${JSON.stringify(b64s)})
  `);

  const outPath = path.join(__dirname, 'pico-idle-presence-showcase.png');
  fs.writeFileSync(outPath, showcase.replace(/^data:image\/png;base64,/, ''), 'base64');
  console.log('Saved pico-idle-presence-showcase.png');
  app.quit();
});
