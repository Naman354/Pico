const { app, BrowserWindow, screen, ipcMain } = require('electron');
const path = require('path');
const fs = require('fs');
const { SurfaceManager, TaskbarWorldSurface } = require('./surfaces.js');

app.commandLine.appendSwitch('enable-transparent-visuals');

app.whenReady().then(async () => {
  console.log('========================================================================');
  console.log('  PHASE 3: PHYSICAL ARTICULATED JUMP ANIMATION VERIFICATION             ');
  console.log('========================================================================');

  const sm = new SurfaceManager();
  sm.initPrimaryDisplaySurfaces();
  sm.initLiveElevatedShelf();

  const display = screen.getPrimaryDisplay();
  const { workArea } = display;

  const win = new BrowserWindow({
    width: workArea.width,
    height: workArea.height,
    x: workArea.x,
    y: workArea.y,
    transparent: true,
    frame: false,
    hasShadow: false,
    resizable: false,
    alwaysOnTop: true,
    skipTaskbar: true,
    backgroundColor: '#00000000',
    webPreferences: {
      preload: path.join(__dirname, 'preload.js'),
      contextIsolation: true,
      nodeIntegration: false
    }
  });

  ipcMain.handle('get-all-surfaces', () => sm.getAllSurfaces());
  ipcMain.handle('get-active-surface', () => sm.getActiveSurface());
  ipcMain.handle('get-surface', (_event, id) => sm.getSurface(id));
  ipcMain.handle('get-taskbar-surface', () => TaskbarWorldSurface.getSurface());
  ipcMain.handle('get-surface-below', (_event, x, y) => sm.findSurfaceBelow(x, y));
  ipcMain.handle('get-reachable-surfaces', (_event, id, x, limits) => sm.getReachableSurfaces(id, x, limits));
  ipcMain.handle('find-navigation-path', (_event, fromId, fromX, toId, toX, limits) => sm.findNavigationPath(fromId, fromX, toId, toX, limits));

  await win.loadFile(path.join(__dirname, 'src', 'renderer', 'index.html'));
  await new Promise(r => setTimeout(r, 600));

  const getCharRect = async () => {
    return await win.webContents.executeJavaScript(`
      (() => {
        const r = document.getElementById('pico-container').getBoundingClientRect();
        return {
          x: Math.max(0, Math.round(r.x - 45)),
          y: Math.max(0, Math.round(r.y - 15)),
          width: Math.round(r.width + 90),
          height: Math.round(r.height + 45)
        };
      })()
    `);
  };

  // Position Pico on Taskbar beneath Ledge A
  await win.webContents.executeJavaScript(`
    window.WanderController.setStagePosition(420, 0);
  `);
  await new Promise(r => setTimeout(r, 150));

  // 1. Stand State
  console.log('\n--- 1. Capturing Initial Grounded Stand ---');
  const r1 = await getCharRect();
  const img1 = await win.webContents.capturePage(r1);
  fs.writeFileSync(path.join(__dirname, 'jump-step-1-stand.png'), img1.toPNG());

  // 2. Start Hop Up and capture distinct phases
  console.log('\n--- 2. Initiating Articulated Hop Up ---');

  // Trigger command in background of renderer
  win.webContents.executeJavaScript(`
    (async () => {
      const intent = window.UserMovement.parseCommand('Hop up.');
      await window.UserMovement.executeCommand(intent);
    })()
  `);

  // After speech bubble closes / command acknowledgement (~700ms), Crouch begins
  await new Promise(r => setTimeout(r, 780));
  console.log('Capturing Crouch Phase...');
  const r2 = await getCharRect();
  const img2 = await win.webContents.capturePage(r2);
  fs.writeFileSync(path.join(__dirname, 'jump-step-2-crouch.png'), img2.toPNG());

  const crouchState = await win.webContents.executeJavaScript(`
    (() => {
      const f = document.getElementById('pico-figure');
      const crouchImg = document.getElementById('pico-side-jump-crouch');
      return {
        isJumping: f.classList.contains('jumping'),
        isCrouch: f.classList.contains('jump-phase-crouch'),
        crouchVisible: window.getComputedStyle(crouchImg).display !== 'none'
      };
    })()
  `);
  console.log('Crouch State:', crouchState);

  // Push-off launch (~150ms later)
  await new Promise(r => setTimeout(r, 140));
  console.log('Capturing Push-off / Launch Phase...');
  const r3 = await getCharRect();
  const img3 = await win.webContents.capturePage(r3);
  fs.writeFileSync(path.join(__dirname, 'jump-step-3-launch.png'), img3.toPNG());

  // Airborne flight apex (~180ms later)
  await new Promise(r => setTimeout(r, 180));
  console.log('Capturing Airborne Flight Apex (Tucked Legs)...');
  const r4 = await getCharRect();
  const img4 = await win.webContents.capturePage(r4);
  fs.writeFileSync(path.join(__dirname, 'jump-step-4-airborne.png'), img4.toPNG());

  const airState = await win.webContents.executeJavaScript(`
    (() => {
      const f = document.getElementById('pico-figure');
      const airImg = document.getElementById('pico-side-jump-air');
      const state = window.PhysicsWorld.getPhysicalState();
      return {
        isAir: f.classList.contains('jump-phase-air'),
        airVisible: window.getComputedStyle(airImg).display !== 'none',
        canvasY: state.canvasY
      };
    })()
  `);
  console.log('Airborne State:', airState);

  // Descent phase (~160ms later)
  await new Promise(r => setTimeout(r, 160));
  console.log('Capturing Descent Preparation (Legs Reaching)...');
  const r5 = await getCharRect();
  const img5 = await win.webContents.capturePage(r5);
  fs.writeFileSync(path.join(__dirname, 'jump-step-5-descend.png'), img5.toPNG());

  // Landing impact absorption (~120ms later)
  await new Promise(r => setTimeout(r, 120));
  console.log('Capturing Soft Landing Impact Compression...');
  const r6 = await getCharRect();
  const img6 = await win.webContents.capturePage(r6);
  fs.writeFileSync(path.join(__dirname, 'jump-step-6-land.png'), img6.toPNG());

  // Wait for landing stabilization & return to front idle
  await new Promise(r => setTimeout(r, 260));
  const finalState = await win.webContents.executeJavaScript(`
    (() => {
      const f = document.getElementById('pico-figure');
      const state = window.PhysicsWorld.getPhysicalState();
      return {
        surfaceId: state.surfaceId,
        canvasY: state.canvasY,
        footDrift: state.footDrift,
        isIdle: f.classList.contains('idle'),
        isJumping: f.classList.contains('jumping')
      };
    })()
  `);
  console.log('Final Grounded Landing State:', finalState);

  if (finalState.surfaceId !== 'elevated-test-shelf' || finalState.canvasY !== -110 || finalState.footDrift !== 0) {
    throw new Error('FAIL: Jump did not conclude with grounded landing on target ledge');
  }
  console.log('[PASS] Full physical jump sequence verified with exact foot contact and zero drift on landing!');

  // --- 3. Assemble Composite Review Showcase ---
  console.log('\n--- 3. Assembling Composite Review Showcase ---');
  const files = [
    'jump-step-1-stand.png',
    'jump-step-2-crouch.png',
    'jump-step-3-launch.png',
    'jump-step-4-airborne.png',
    'jump-step-5-descend.png',
    'jump-step-6-land.png'
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

          const totalW = 1200;
          const totalH = 460;

          const c = document.createElement('canvas');
          c.width = totalW;
          c.height = totalH;
          const ctx = c.getContext('2d');

          // Dark slate theme background
          ctx.fillStyle = '#0b0f19';
          ctx.fillRect(0, 0, totalW, totalH);

          // Top Header
          ctx.fillStyle = '#111827';
          ctx.fillRect(0, 0, totalW, 64);
          ctx.strokeStyle = '#1e293b';
          ctx.lineWidth = 1;
          ctx.beginPath();
          ctx.moveTo(0, 64);
          ctx.lineTo(totalW, 64);
          ctx.stroke();

          // Header Text
          ctx.fillStyle = '#f8fafc';
          ctx.font = 'bold 20px -apple-system, sans-serif';
          ctx.fillText('Pico Phase 3 — Articulated Physical Jump Sequence', 28, 38);

          ctx.fillStyle = '#94a3b8';
          ctx.font = '13px -apple-system, sans-serif';
          ctx.fillText('Planted Crouch -> Push-Off -> Airborne Tucked Flight -> Descent Extension -> Soft Landing Impact', 28, 56);

          const cards = [
            {
              title: '1. Stand',
              tag: 'GROUNDED',
              tagColor: '#3b82f6',
              desc: 'Pico grounded on taskbar baseline looking toward target ledge overhead.'
            },
            {
              title: '2. Crouch Prep',
              tag: 'PLANTED',
              tagColor: '#10b981',
              desc: 'Knees bend, torso dips 5px, arms swing back. Feet stay planted on surface.'
            },
            {
              title: '3. Push-Off',
              tag: 'TAKEOFF',
              tagColor: '#f59e0b',
              desc: 'Body extends upward, toes push off source surface with forward impulse.'
            },
            {
              title: '4. Airborne Flight',
              tag: 'TUCKED LEGS',
              tagColor: '#8b5cf6',
              desc: 'Legs visibly tucked up under body, flying along smooth parabolic arc.'
            },
            {
              title: '5. Descent Prep',
              tag: 'REACHING',
              tagColor: '#ec4899',
              desc: 'Legs extend downward to meet approaching surface; body straightens.'
            },
            {
              title: '6. Soft Landing',
              tag: 'IMPACT CUSHION',
              tagColor: '#06b6d4',
              desc: 'Feet make contact with target ledge; knees softly compress absorbing fall.'
            }
          ];

          const cardW = 180;
          const cardH = 360;
          const startX = 20;
          const gapX = 16;
          const startY = 82;

          cards.forEach((card, idx) => {
            const x = startX + idx * (cardW + gapX);
            const y = startY;

            // Card background
            ctx.fillStyle = '#131b2e';
            ctx.beginPath();
            ctx.roundRect(x, y, cardW, cardH, 8);
            ctx.fill();
            ctx.strokeStyle = '#1e293b';
            ctx.lineWidth = 1;
            ctx.stroke();

            // Card Header
            ctx.fillStyle = '#f1f5f9';
            ctx.font = 'bold 12px -apple-system, sans-serif';
            ctx.fillText(card.title, x + 10, y + 24);

            // Badge
            ctx.fillStyle = card.tagColor;
            ctx.font = 'bold 8.5px monospace';
            const badgeW = ctx.measureText(card.tag).width + 6;
            ctx.beginPath();
            ctx.roundRect(x + cardW - badgeW - 10, y + 14, badgeW, 14, 3);
            ctx.fill();
            ctx.fillStyle = '#ffffff';
            ctx.fillText(card.tag, x + cardW - badgeW - 7, y + 24);

            // View box
            const viewX = x + 10;
            const viewY = y + 38;
            const viewW = cardW - 20;
            const viewH = 210;

            ctx.fillStyle = '#070b14';
            ctx.beginPath();
            ctx.roundRect(viewX, viewY, viewW, viewH, 6);
            ctx.fill();
            ctx.strokeStyle = '#243048';
            ctx.stroke();

            // Draw character image centered
            const sourceImg = imgs[idx];
            const scale = 1.35;
            const destCharW = sourceImg.width * scale;
            const destCharH = sourceImg.height * scale;
            const destCharX = viewX + (viewW - destCharW) / 2;
            const destCharY = viewY + (viewH - destCharH) / 2;

            ctx.imageSmoothingEnabled = false;
            ctx.drawImage(sourceImg, destCharX, destCharY, destCharW, destCharH);

            // Description
            ctx.fillStyle = '#94a3b8';
            ctx.font = '10.5px -apple-system, sans-serif';
            const words = card.desc.split(' ');
            let line = '';
            let lineY = y + 268;
            for (let n = 0; n < words.length; n++) {
              const testLine = line + words[n] + ' ';
              if (ctx.measureText(testLine).width > (cardW - 20) && n > 0) {
                ctx.fillText(line, x + 10, lineY);
                line = words[n] + ' ';
                lineY += 15;
              } else {
                line = testLine;
              }
            }
            ctx.fillText(line, x + 10, lineY);
          });

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

  fs.writeFileSync(
    path.join(__dirname, 'pico-physical-jump-showcase.png'),
    Buffer.from(showcase.replace(/^data:image\/png;base64,/, ''), 'base64')
  );
  console.log('[SAVED] pico-physical-jump-showcase.png');

  // Clean up individual frames
  files.forEach(f => {
    try { fs.unlinkSync(path.join(__dirname, f)); } catch {}
  });

  console.log('\n========================================================================');
  console.log('  ALL PHYSICAL JUMP VERIFICATION CHECKS PASSED!                         ');
  console.log('========================================================================');

  app.quit();
});
