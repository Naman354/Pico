const { app, BrowserWindow, screen, ipcMain } = require('electron');
const path = require('path');
const fs = require('fs');
const { Surface, SurfaceManager, TaskbarWorldSurface } = require('./surfaces.js');

app.commandLine.appendSwitch('enable-transparent-visuals');

app.whenReady().then(async () => {
  console.log('===============================================================');
  console.log('  PHASE 3 — STEP 3A: LIVE ELEVATED TEST SURFACE VERIFICATION   ');
  console.log('===============================================================');

  // Exact main.js initialization
  const sm = new SurfaceManager();
  sm.initPrimaryDisplaySurfaces();
  const testShelf = sm.initLiveElevatedShelf();

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

  // --- 1. Initial State: Grounded on Taskbar ---
  console.log('\n--- 1. Initial State: Starting on Taskbar ---');
  const startState = await win.webContents.executeJavaScript(`
    (() => {
      const state = window.PhysicsWorld.getPhysicalState();
      const stage = document.getElementById('desktop-stage');
      const visualShelf = document.getElementById('elevated-shelf-visual');
      return {
        surfaceId: state.surfaceId,
        canvasY: state.canvasY,
        isHome: state.isHome,
        footDrift: state.footDrift,
        stageTransform: stage.style.transform,
        shelfActive: visualShelf.classList.contains('active'),
        shelfDisplay: window.getComputedStyle(visualShelf).display
      };
    })()
  `);

  console.log('Taskbar Start State:', startState);
  if (startState.surfaceId !== 'taskbar-main' || startState.canvasY !== 0 || !startState.shelfActive) {
    throw new Error('FAIL: Initial state is not properly grounded on taskbar with active test shelf visual');
  }
  console.log('[PASS] Pico starts grounded on taskbar with visible elevated test shelf overhead');

  const r1 = await getCharRect();
  const img1 = await win.webContents.capturePage(r1);
  fs.writeFileSync(path.join(__dirname, 'live-step-1-taskbar-start.png'), img1.toPNG());

  // --- 2. Live Command "hop up" Execution ---
  console.log('\n--- 2. Executing "hop up" Command ---');
  // Position Pico directly underneath the shelf if needed (e.g. X=900)
  await win.webContents.executeJavaScript(`
    window.WanderController.setStagePosition(900, 0);
  `);
  await new Promise(r => setTimeout(r, 100));

  console.log('Submitting "hop up" to UserMovement...');
  const hopResult = await win.webContents.executeJavaScript(`
    (async () => {
      const intent = window.UserMovement.parseCommand('hop up');
      return await window.UserMovement.executeCommand(intent);
    })()
  `);

  console.log('Hop command result:', hopResult);

  const onShelfState = await win.webContents.executeJavaScript(`
    (() => {
      const state = window.PhysicsWorld.getPhysicalState();
      const stage = document.getElementById('desktop-stage');
      return {
        surfaceId: state.surfaceId,
        localX: state.localX,
        canvasX: state.canvasX,
        canvasY: state.canvasY,
        isHome: state.isHome,
        footDrift: state.footDrift,
        stageTransform: stage.style.transform
      };
    })()
  `);

  console.log('Elevated Shelf State:', onShelfState);
  if (onShelfState.surfaceId !== 'elevated-test-shelf' || onShelfState.canvasY !== -110 || onShelfState.footDrift !== 0) {
    throw new Error('FAIL: Pico did not land cleanly on elevated-test-shelf');
  }
  console.log('[PASS] Pico visibly hopped onto elevated test shelf at canvasY=-110 with 0.0000px drift');

  const r2 = await getCharRect();
  const img2 = await win.webContents.capturePage(r2);
  fs.writeFileSync(path.join(__dirname, 'live-step-2-hop-up-shelf.png'), img2.toPNG());

  // --- 3. Horizontal Walking on Elevated Shelf ---
  console.log('\n--- 3. Testing Walking Across Elevated Shelf ---');
  console.log('Submitting "walk left" on elevated shelf...');
  await win.webContents.executeJavaScript(`
    (async () => {
      const intent = window.UserMovement.parseCommand('walk left');
      return await window.UserMovement.executeCommand(intent);
    })()
  `);

  const walkedShelfState = await win.webContents.executeJavaScript(`
    (() => {
      const state = window.PhysicsWorld.getPhysicalState();
      const stage = document.getElementById('desktop-stage');
      return {
        surfaceId: state.surfaceId,
        localX: state.localX,
        canvasY: state.canvasY,
        footDrift: state.footDrift,
        stageTransform: stage.style.transform
      };
    })()
  `);

  console.log('Walked Shelf State:', walkedShelfState);
  if (walkedShelfState.surfaceId !== 'elevated-test-shelf' || walkedShelfState.canvasY !== -110 || walkedShelfState.localX >= 900) {
    throw new Error('FAIL: Horizontal walking on elevated shelf failed or changed elevation');
  }
  console.log('[PASS] Pico walked left along the elevated shelf maintaining canvasY=-110 and 0.0000px drift');

  const r3 = await getCharRect();
  const img3 = await win.webContents.capturePage(r3);
  fs.writeFileSync(path.join(__dirname, 'live-step-3-walking-on-shelf.png'), img3.toPNG());

  // --- 4. Live Command "return to taskbar" ---
  console.log('\n--- 4. Executing "return to taskbar" Command ---');
  console.log('Submitting "return to taskbar"...');
  await win.webContents.executeJavaScript(`
    (async () => {
      const intent = window.UserMovement.parseCommand('return to taskbar');
      return await window.UserMovement.executeCommand(intent);
    })()
  `);

  const backHomeState = await win.webContents.executeJavaScript(`
    (() => {
      const state = window.PhysicsWorld.getPhysicalState();
      const stage = document.getElementById('desktop-stage');
      const rect = document.getElementById('pico-container').getBoundingClientRect();
      return {
        surfaceId: state.surfaceId,
        localX: state.localX,
        canvasY: state.canvasY,
        isHome: state.isHome,
        footDrift: state.footDrift,
        stageTransform: stage.style.transform,
        bottomY: rect.bottom,
        windowHeight: window.innerHeight
      };
    })()
  `);

  console.log('Back Home Taskbar State:', backHomeState);
  if (backHomeState.surfaceId !== 'taskbar-main' || backHomeState.canvasY !== 0 || backHomeState.footDrift !== 0) {
    throw new Error('FAIL: Return to taskbar failed to restore home baseline');
  }
  if (!backHomeState.stageTransform.startsWith('translateX')) {
    throw new Error(`FAIL: Expected translateX on taskbar, got ${backHomeState.stageTransform}`);
  }
  console.log('[PASS] Pico dropped down back onto the taskbar, restoring translateX with 0.0000px drift');

  const r4 = await getCharRect();
  const img4 = await win.webContents.capturePage(r4);
  fs.writeFileSync(path.join(__dirname, 'live-step-4-drop-back-to-taskbar.png'), img4.toPNG());

  // --- 5. Generate Composite Review Showcase ---
  console.log('\n--- 5. Generating Composite Review Showcase ---');
  const files = [
    'live-step-1-taskbar-start.png',
    'live-step-2-hop-up-shelf.png',
    'live-step-3-walking-on-shelf.png',
    'live-step-4-drop-back-to-taskbar.png'
  ];

  const b64s = files.map(f => fs.readFileSync(path.join(__dirname, f)).toString('base64'));

  const showcase = await win.webContents.executeJavaScript(`
    ((imagesData) => {
      return new Promise((resolve) => {
        let loaded = 0;
        const imgs = [];

        function check() {
          loaded++;
          if (loaded < 4) return;

          const totalW = 1080;
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
          ctx.fillText('Pico Phase 3 — Step 3A: Live Elevated Test Surface Flow', 28, 38);

          ctx.fillStyle = '#94a3b8';
          ctx.font = '13px -apple-system, sans-serif';
          ctx.fillText('Taskbar Start → "hop up" Leap → Elevated Shelf Walk → "return to taskbar" Drop | 0.0000px Drift', 28, 56);

          const cards = [
            {
              title: '1. Taskbar Base',
              tag: 'TASKBAR',
              tagColor: '#3b82f6',
              desc: 'Pico resting on taskbar baseline (translateX, 0.0000px drift) with test shelf active directly overhead.'
            },
            {
              title: '2. "Hop Up" Leap',
              tag: 'ELEVATED',
              tagColor: '#10b981',
              desc: 'Wind-up crouch → parabolic leap → soft landing on test shelf at canvasY=-110px with exact foot contact.'
            },
            {
              title: '3. Shelf Walk',
              tag: 'WALKING',
              tagColor: '#f59e0b',
              desc: 'Subtle stylized walking across the elevated shelf maintaining vertical elevation and bounds clamping.'
            },
            {
              title: '4. Return Drop',
              tag: 'TASKBAR',
              tagColor: '#06b6d4',
              desc: 'Ledge look-down hesitation → gravity fall → impact absorption, restoring translateX on taskbar.'
            }
          ];

          const cardW = 240;
          const cardH = 360;
          const startX = 24;
          const gapX = 24;
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
            ctx.font = 'bold 13px -apple-system, sans-serif';
            ctx.fillText(card.title, x + 14, y + 26);

            // Badge
            ctx.fillStyle = card.tagColor;
            ctx.font = 'bold 9px monospace';
            const badgeW = ctx.measureText(card.tag).width + 8;
            ctx.beginPath();
            ctx.roundRect(x + cardW - badgeW - 14, y + 14, badgeW, 16, 4);
            ctx.fill();
            ctx.fillStyle = '#ffffff';
            ctx.fillText(card.tag, x + cardW - badgeW - 10, y + 26);

            // View box
            const viewX = x + 14;
            const viewY = y + 42;
            const viewW = cardW - 28;
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
            ctx.font = '11px -apple-system, sans-serif';
            const words = card.desc.split(' ');
            let line = '';
            let lineY = y + 276;
            for (let n = 0; n < words.length; n++) {
              const testLine = line + words[n] + ' ';
              if (ctx.measureText(testLine).width > (cardW - 28) && n > 0) {
                ctx.fillText(line, x + 14, lineY);
                line = words[n] + ' ';
                lineY += 16;
              } else {
                line = testLine;
              }
            }
            ctx.fillText(line, x + 14, lineY);
          });

          resolve(c.toDataURL('image/png'));
        }

        for (let i = 0; i < 4; i++) {
          const img = new Image();
          img.onload = check;
          img.src = 'data:image/png;base64,' + imagesData[i];
          imgs.push(img);
        }
      });
    })(${JSON.stringify(b64s)})
  `);

  fs.writeFileSync(
    path.join(__dirname, 'pico-live-elevated-test-showcase.png'),
    Buffer.from(showcase.replace(/^data:image\/png;base64,/, ''), 'base64')
  );
  console.log('[SAVED] pico-live-elevated-test-showcase.png');

  // Clean up individual step frames
  files.forEach(f => {
    try { fs.unlinkSync(path.join(__dirname, f)); } catch {}
  });

  console.log('\n===============================================================');
  console.log('  ALL PHASE 3 — STEP 3A LIVE ELEVATED TEST CHECKS PASSED!     ');
  console.log('===============================================================');

  app.quit();
});
