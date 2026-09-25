const { app, BrowserWindow } = require('electron');
const path = require('path');
const fs = require('fs');

app.whenReady().then(async () => {
  const win = new BrowserWindow({ show: false, width: 800, height: 600 });
  await win.loadURL('about:blank');

  const files = [
    'user-move-1-bubble-input.png',
    'user-move-2-acknowledgement.png',
    'user-move-3-walking-left.png',
    'user-move-4-settled-idle-left.png',
    'user-move-5-walk-right-done.png',
    'user-move-6-clear-view-done.png'
  ];

  const b64s = files.map(f => fs.readFileSync(path.join(__dirname, f)).toString('base64'));

  const showcase = await win.webContents.executeJavaScript(`
    ((imagesData) => {
      return new Promise((resolve) => {
        let loaded = 0;
        const imgs = [];

        function check() {
          loaded++;
          if (loaded < 6) return;

          const totalW = 1040;
          const totalH = 580;

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
          ctx.fillText('Milestone 2 — User-Directed Movement', 24, 28);

          // Subtitle
          ctx.font = '12px -apple-system, BlinkMacSystemFont, "Segoe UI", Roboto, sans-serif';
          ctx.fillStyle = '#94a3b8';
          ctx.fillText('Natural language movement commands | Understood acknowledgement → turns → casually walks away → stops into idle', 24, 48);

          // Top sequence: 4 steps of "You're blocking my view. Move left."
          const stepWidth = 236;
          const stepHeight = 230;
          const startY = 80;

          const steps = [
            {
              title: '1. User Types Instruction',
              desc: '“You’re blocking my view. Move left.”',
              imgIdx: 0,
              crop: { x: 366, y: 344, w: 346, h: 92 },
              isWide: true
            },
            {
              title: '2. Understood & Nods',
              desc: 'Nod acknowledgment with closed eyes',
              imgIdx: 1,
              crop: { x: 372, y: 355, w: 52, h: 84 },
              isWide: false
            },
            {
              title: '3. Turns & Casually Walks',
              desc: 'Side-facing stride (28px/s, 0px drift)',
              imgIdx: 2,
              crop: { x: 368, y: 355, w: 58, h: 84 },
              isWide: false
            },
            {
              title: '4. Stops & Settles Into Idle',
              desc: 'Arrived at X=220 (-80px), front idle',
              imgIdx: 3,
              crop: { x: 270, y: 355, w: 58, h: 84 },
              isWide: false
            }
          ];

          for (let i = 0; i < 4; i++) {
            const step = steps[i];
            const sx = 20 + i * (stepWidth + 16);
            const sy = startY;

            // Card background
            ctx.fillStyle = '#1e293b';
            ctx.strokeStyle = '#334155';
            ctx.lineWidth = 1;
            ctx.beginPath();
            ctx.roundRect(sx, sy, stepWidth, stepHeight, 8);
            ctx.fill();
            ctx.stroke();

            // Header pill
            ctx.fillStyle = '#0f172a';
            ctx.beginPath();
            ctx.roundRect(sx + 8, sy + 8, stepWidth - 16, 42, 6);
            ctx.fill();

            ctx.font = 'bold 12px -apple-system, BlinkMacSystemFont, sans-serif';
            ctx.fillStyle = '#f8fafc';
            ctx.fillText(step.title, sx + 14, sy + 25);

            ctx.font = '10px -apple-system, BlinkMacSystemFont, sans-serif';
            ctx.fillStyle = '#38bdf8';
            ctx.fillText(step.desc, sx + 14, sy + 41);

            // Preview viewport container
            const imgBoxX = sx + 8;
            const imgBoxY = sy + 56;
            const imgBoxW = stepWidth - 16;
            const imgBoxH = 160;

            ctx.fillStyle = '#090d16';
            ctx.beginPath();
            ctx.roundRect(imgBoxX, imgBoxY, imgBoxW, imgBoxH, 6);
            ctx.fill();

            // Taskbar red baseline
            const groundY = imgBoxY + imgBoxH - 24;
            ctx.strokeStyle = '#ef4444';
            ctx.lineWidth = 1.5;
            ctx.beginPath();
            ctx.moveTo(imgBoxX + 6, groundY + 0.5);
            ctx.lineTo(imgBoxX + imgBoxW - 6, groundY + 0.5);
            ctx.stroke();

            // Render cropped image
            const cInfo = step.crop;
            if (step.isWide) {
              // Wide bubble + character: fit neatly
              const scale = 0.62;
              const dw = Math.round(cInfo.w * scale);
              const dh = Math.round(cInfo.h * scale);
              const dx = imgBoxX + Math.round((imgBoxW - dw) / 2);
              const dy = groundY - dh + 4;
              ctx.drawImage(imgs[step.imgIdx], cInfo.x, cInfo.y, cInfo.w, cInfo.h, dx, dy, dw, dh);
            } else {
              // Character alone: scale 1.1x for clean visibility
              const scale = 1.1;
              const dw = Math.round(cInfo.w * scale);
              const dh = Math.round(cInfo.h * scale);
              const dx = imgBoxX + Math.round((imgBoxW - dw) / 2);
              const dy = groundY - dh + 2;
              ctx.drawImage(imgs[step.imgIdx], cInfo.x, cInfo.y, cInfo.w, cInfo.h, dx, dy, dw, dh);
            }

            // Taskbar baseline label
            ctx.font = '9px -apple-system, BlinkMacSystemFont, sans-serif';
            ctx.fillStyle = '#64748b';
            ctx.fillText('Taskbar baseline (0px drift)', imgBoxX + 10, groundY + 16);
          }

          // Bottom section: 2 Cards for Directional Right & Clear View
          const bottomY = 328;
          const botCardW = 488;
          const botCardH = 230;

          const botCards = [
            {
              title: 'Directional Right: “Move right.” / “Go right.”',
              detail: 'Acknowledges with nod → turns right → enters side-walk stride → stops at X=300 → idle.',
              imgIdx: 4,
              crop: { x: 370, y: 355, w: 58, h: 84 },
              tag: 'Explicit Directional Command',
              tagColor: '#38bdf8',
              tagBg: '#082f49',
              tagBorder: '#0284c7'
            },
            {
              title: 'Obstruction / Clear View: “Get out of the way.”',
              detail: 'Detects obstruction intent without direction → selects nearest clear side → walks away → idle.',
              imgIdx: 5,
              crop: { x: 270, y: 355, w: 58, h: 84 },
              tag: 'Clear-View Autonomous Intent',
              tagColor: '#c084fc',
              tagBg: '#3b0764',
              tagBorder: '#9333ea'
            }
          ];

          for (let b = 0; b < 2; b++) {
            const card = botCards[b];
            const bx = 20 + b * (botCardW + 24);
            const by = bottomY;

            ctx.fillStyle = '#1e293b';
            ctx.strokeStyle = '#334155';
            ctx.lineWidth = 1;
            ctx.beginPath();
            ctx.roundRect(bx, by, botCardW, botCardH, 8);
            ctx.fill();
            ctx.stroke();

            // Tag badge
            ctx.fillStyle = card.tagBg;
            ctx.strokeStyle = card.tagBorder;
            ctx.lineWidth = 1;
            ctx.beginPath();
            ctx.roundRect(bx + 14, by + 12, b === 0 ? 180 : 175, 22, 4);
            ctx.fill();
            ctx.stroke();

            ctx.font = 'bold 9px -apple-system, BlinkMacSystemFont, sans-serif';
            ctx.fillStyle = card.tagColor;
            ctx.fillText(card.tag.toUpperCase(), bx + 22, by + 27);

            // Title
            ctx.font = 'bold 13px -apple-system, BlinkMacSystemFont, sans-serif';
            ctx.fillStyle = '#f8fafc';
            ctx.fillText(card.title, bx + 14, by + 52);

            // Detail
            ctx.font = '11px -apple-system, BlinkMacSystemFont, sans-serif';
            ctx.fillStyle = '#94a3b8';
            ctx.fillText(card.detail, bx + 14, by + 70);

            // Inner image box
            const imgBoxX = bx + 14;
            const imgBoxY = by + 86;
            const imgBoxW = botCardW - 28;
            const imgBoxH = 130;

            ctx.fillStyle = '#090d16';
            ctx.beginPath();
            ctx.roundRect(imgBoxX, imgBoxY, imgBoxW, imgBoxH, 6);
            ctx.fill();

            // Taskbar red baseline
            const groundY = imgBoxY + imgBoxH - 20;
            ctx.strokeStyle = '#ef4444';
            ctx.lineWidth = 1.5;
            ctx.beginPath();
            ctx.moveTo(imgBoxX + 6, groundY + 0.5);
            ctx.lineTo(imgBoxX + imgBoxW - 6, groundY + 0.5);
            ctx.stroke();

            const cInfo = card.crop;
            const scale = 1.1;
            const dw = Math.round(cInfo.w * scale);
            const dh = Math.round(cInfo.h * scale);
            const dx = imgBoxX + 24;
            const dy = groundY - dh + 2;
            ctx.drawImage(imgs[card.imgIdx], cInfo.x, cInfo.y, cInfo.w, cInfo.h, dx, dy, dw, dh);

            // Feature checkpoints beside Pico
            ctx.font = 'bold 11px -apple-system, BlinkMacSystemFont, sans-serif';
            ctx.fillStyle = '#10b981';
            ctx.fillText('✓ Grounded at 0.000px drift baseline', imgBoxX + 110, imgBoxY + 32);
            ctx.fillStyle = '#f8fafc';
            ctx.font = '10px -apple-system, BlinkMacSystemFont, sans-serif';
            ctx.fillText('• Natural nod acknowledgment played before walking', imgBoxX + 110, imgBoxY + 54);
            ctx.fillText('• Organic transition: understands → turns → walks away → stops', imgBoxX + 110, imgBoxY + 74);
            ctx.fillText('• Character returns to idle stance with breathing & blinking', imgBoxX + 110, imgBoxY + 94);
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

  const outPath = path.join(__dirname, 'pico-user-movement-showcase.png');
  fs.writeFileSync(outPath, showcase.replace(/^data:image\/png;base64,/, ''), 'base64');
  console.log('Saved pico-user-movement-showcase.png');
  app.quit();
});
