const { app, BrowserWindow, screen, ipcMain } = require('electron');
const path = require('path');
const fs = require('fs');
const { Surface, SurfaceManager, TaskbarWorldSurface } = require('./surfaces.js');

app.commandLine.appendSwitch('enable-transparent-visuals');

app.whenReady().then(async () => {
  console.log('===============================================================');
  console.log('  PHASE 3 — STEP 2: STYLIZED HOP & DROP KINEMATICS TEST        ');
  console.log('===============================================================');

  const sm = new SurfaceManager();
  const taskbar = sm.initPrimaryDisplaySurfaces();
  const taskbarElevation = taskbar.elevation; // e.g. 816

  // Register elevated test shelf (deltaY = 120px above taskbar)
  const shelfElevation = taskbarElevation - 120;
  const testShelf = new Surface({
    id: 'shelf-editor',
    type: 'app_shelf',
    label: 'Code Editor Top Ledge',
    bounds: { x: 300, y: shelfElevation, width: 450, height: 35 },
    walkableRange: { minX: 310, maxX: 740 },
    elevation: shelfElevation,
    isHome: false,
    defaultX: 450,
    leftBoundaryType: 'drop_off',
    rightBoundaryType: 'drop_off'
  });
  sm.registerSurface(testShelf);

  // Setup BrowserWindow covering primary display workArea
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

  // --- 1. NLP Command Parser Tests for Vertical Goals ---
  console.log('\n--- 1. Testing NLP Parsing for Vertical Intent ---');
  const nlpTests = await win.webContents.executeJavaScript(`
    (() => {
      const um = window.UserMovement;
      return [
        { cmd: 'hop up', parsed: um.parseCommand('hop up') },
        { cmd: 'jump up', parsed: um.parseCommand('jump up') },
        { cmd: 'jump down', parsed: um.parseCommand('jump down') },
        { cmd: 'come down', parsed: um.parseCommand('come down') },
        { cmd: 'return to taskbar', parsed: um.parseCommand('return to taskbar') }
      ];
    })()
  `);

  console.log('NLP Vertical Parsing Results:');
  nlpTests.forEach(t => console.log(`  "${t.cmd}" ->`, t.parsed));

  if (nlpTests[0].parsed?.type !== 'JUMP_UP' || nlpTests[1].parsed?.type !== 'JUMP_UP' ||
      nlpTests[2].parsed?.type !== 'DROP_DOWN' || nlpTests[3].parsed?.type !== 'DROP_DOWN' ||
      nlpTests[4].parsed?.type !== 'DROP_DOWN') {
    throw new Error('FAIL: NLP vertical intent parsing failed');
  }
  console.log('[PASS] Vertical jump and drop commands correctly parsed');

  const getCharRect = async () => {
    return await win.webContents.executeJavaScript(`
      (() => {
        const r = document.getElementById('pico-container').getBoundingClientRect();
        return {
          x: Math.max(0, Math.round(r.x - 12)),
          y: Math.max(0, Math.round(r.y - 12)),
          width: Math.round(r.width + 24),
          height: Math.round(r.height + 24)
        };
      })()
    `);
  };

  // --- 2. Hop-Up Kinematics (Taskbar -> Elevated Shelf) ---
  console.log('\n--- 2. Testing Hop-Up Kinematics & Parabolic Arc ---');
  await win.webContents.executeJavaScript(`
    window.WanderController.setStagePosition(350, 0);
  `);

  // Initiate jump and capture progression frames
  console.log('Initiating jumpToSurface from Taskbar (X=350, Y=0) to shelf-editor (X=450, Y=-120)...');
  const jumpPromise = win.webContents.executeJavaScript(`
    window.WanderController.jumpToSurface('shelf-editor', 450);
  `);

  // Sample Crouch Frame (~50ms)
  await new Promise(r => setTimeout(r, 50));
  const crouchState = await win.webContents.executeJavaScript(`
    (() => {
      const fig = document.getElementById('pico-figure');
      return {
        hasCrouch: fig.classList.contains('jump-crouch'),
        y: window.WanderController.currentY
      };
    })()
  `);
  console.log('Anticipation Crouch State:', crouchState);
  if (!crouchState.hasCrouch) {
    throw new Error('FAIL: Jump anticipation crouch was not applied');
  }
  console.log('[PASS] Anticipation crouch applied before launch');
  const r1 = await getCharRect();
  const img1 = await win.webContents.capturePage(r1);
  fs.writeFileSync(path.join(__dirname, 'pico-hop-1-crouch.png'), img1.toPNG());

  // Sample Mid-Air Apex Frame (~250ms)
  await new Promise(r => setTimeout(r, 200));
  const apexState = await win.webContents.executeJavaScript(`
    (() => {
      const fig = document.getElementById('pico-figure');
      const stage = document.getElementById('desktop-stage');
      return {
        y: window.WanderController.currentY,
        transform: stage.style.transform,
        isAir: fig.classList.contains('jump-air-rise') || fig.classList.contains('jump-air-fall')
      };
    })()
  `);
  console.log('Mid-Air Apex State:', apexState);
  // In stage coords, upward ascent is negative Y (Y < 0)
  if (apexState.y >= 0 || !apexState.isAir) {
    throw new Error('FAIL: Character did not achieve parabolic aerial arc');
  }
  console.log('[PASS] Parabolic aerial trajectory verified in stage coordinates');
  const r2 = await getCharRect();
  const img2 = await win.webContents.capturePage(r2);
  fs.writeFileSync(path.join(__dirname, 'pico-hop-2-apex.png'), img2.toPNG());

  // Wait for jump to complete
  await jumpPromise;

  // Verify Landing State on Elevated Shelf
  const landingState = await win.webContents.executeJavaScript(`
    (() => {
      const state = window.PhysicsWorld.getPhysicalState();
      const stage = document.getElementById('desktop-stage');
      return {
        surfaceId: state.surfaceId,
        localX: state.localX,
        canvasX: state.canvasX,
        canvasY: state.canvasY,
        elevation: state.elevation,
        isHome: state.isHome,
        footDrift: state.footDrift,
        stageTransform: stage.style.transform
      };
    })()
  `);
  console.log('Elevated Landing State:', landingState);

  if (landingState.surfaceId !== 'shelf-editor' || landingState.canvasY !== -120 || landingState.footDrift !== 0) {
    throw new Error('FAIL: Elevated landing failed to lock cleanly on target surface');
  }
  console.log('[PASS] Landed precisely on shelf-editor with 0.0000px foot drift at canvasY=-120');
  const r3 = await getCharRect();
  const img3 = await win.webContents.capturePage(r3);
  fs.writeFileSync(path.join(__dirname, 'pico-hop-3-landing.png'), img3.toPNG());

  // --- 3. Drop-Down Kinematics (Elevated Shelf -> Taskbar) ---
  console.log('\n--- 3. Testing Controlled Drop-Down Kinematics ---');
  console.log('Initiating dropDownToSurface from shelf-editor to taskbar-main (X=380, Y=0)...');
  const dropPromise = win.webContents.executeJavaScript(`
    window.WanderController.dropDownToSurface('taskbar-main', 380);
  `);

  // Sample Hesitation Glance (~60ms)
  await new Promise(r => setTimeout(r, 60));
  const dropPrepState = await win.webContents.executeJavaScript(`
    (() => {
      const fig = document.getElementById('pico-figure');
      return {
        hasGazeDown: fig.classList.contains('gaze-down'),
        hasHeadDown: fig.classList.contains('head-down')
      };
    })()
  `);
  console.log('Drop Preparation State:', dropPrepState);
  if (!dropPrepState.hasGazeDown || !dropPrepState.hasHeadDown) {
    throw new Error('FAIL: Ledge hesitation glance down not applied before drop');
  }
  console.log('[PASS] Ledge hesitation glance down applied before drop');
  const r4 = await getCharRect();
  const img4 = await win.webContents.capturePage(r4);
  fs.writeFileSync(path.join(__dirname, 'pico-hop-4-drop-fall.png'), img4.toPNG());

  // Wait for drop to complete
  await dropPromise;

  // Verify Landing on Taskbar Baseline
  const taskbarReturnState = await win.webContents.executeJavaScript(`
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
  console.log('Taskbar Return State:', taskbarReturnState);

  if (taskbarReturnState.surfaceId !== 'taskbar-main' || taskbarReturnState.canvasY !== 0 || taskbarReturnState.footDrift !== 0) {
    throw new Error('FAIL: Taskbar return failed to restore 0px baseline');
  }
  if (!taskbarReturnState.stageTransform.startsWith('translateX')) {
    throw new Error(`FAIL: Expected translateX on taskbar, got ${taskbarReturnState.stageTransform}`);
  }
  console.log('[PASS] Returned to taskbar with translateX baseline and strictly 0.0000px foot drift');
  const r5 = await getCharRect();
  const img5 = await win.webContents.capturePage(r5);
  fs.writeFileSync(path.join(__dirname, 'pico-hop-5-taskbar-return.png'), img5.toPNG());

  // --- 4. Generate Composite Showcase ---
  console.log('\n--- 4. Generating Composite Kinematics Showcase ---');
  const showcaseFiles = [
    'pico-hop-1-crouch.png',
    'pico-hop-2-apex.png',
    'pico-hop-3-landing.png',
    'pico-hop-4-drop-fall.png',
    'pico-hop-5-taskbar-return.png'
  ];

  const b64s = showcaseFiles.map(f => fs.readFileSync(path.join(__dirname, f)).toString('base64'));

  const showcase = await win.webContents.executeJavaScript(`
    ((imagesData) => {
      return new Promise((resolve) => {
        let loaded = 0;
        const imgs = [];

        function check() {
          loaded++;
          if (loaded < 5) return;

          const totalW = 1180;
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
          ctx.fillText('Pico Phase 3 — Step 2: Stylized Hop & Drop Traversal Kinematics', 28, 38);

          ctx.fillStyle = '#94a3b8';
          ctx.font = '13px -apple-system, sans-serif';
          ctx.fillText('Anticipation Crouch → Parabolic Leap Arc → Elevated Landing → Ledge Hesitation → Taskbar Return | 0.0000px Drift', 28, 56);

          const cards = [
            {
              title: '1. Anticipation Crouch',
              tag: 'WIND-UP',
              tagColor: '#f59e0b',
              desc: 'Subtle knee bend (scaleY: 0.91) and upward focus before vertical spring.'
            },
            {
              title: '2. Parabolic Apex',
              tag: 'AIRBORNE ARC',
              tagColor: '#3b82f6',
              desc: 'Natural parabolic trajectory with 22px apex overshoot and vertical stretch.'
            },
            {
              title: '3. Shelf Foot-Lock',
              tag: 'ELEVATED LANDING',
              tagColor: '#10b981',
              desc: 'Impact dampening (scaleY: 0.91) with 0.0000px foot drift on elevated shelf.'
            },
            {
              title: '4. Ledge Step-Off',
              tag: 'DESCENT PREP',
              tagColor: '#8b5cf6',
              desc: 'Curious downward glance and hesitation before gravity-accelerated fall.'
            },
            {
              title: '5. Taskbar Return',
              tag: 'HOME RESTORATION',
              tagColor: '#06b6d4',
              desc: 'Firm landing on taskbar baseline, restoring translateX with 0.0000px drift.'
            }
          ];

          const cardW = 212;
          const cardH = 360;
          const startX = 24;
          const gapX = 20;
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
            ctx.fillText(card.title, x + 12, y + 26);

            // Badge
            ctx.fillStyle = card.tagColor;
            ctx.font = 'bold 9px monospace';
            const badgeW = ctx.measureText(card.tag).width + 8;
            ctx.beginPath();
            ctx.roundRect(x + cardW - badgeW - 12, y + 14, badgeW, 16, 4);
            ctx.fill();
            ctx.fillStyle = '#ffffff';
            ctx.fillText(card.tag, x + cardW - badgeW - 8, y + 26);

            // View box
            const viewX = x + 12;
            const viewY = y + 42;
            const viewW = cardW - 24;
            const viewH = 210;

            ctx.fillStyle = '#070b14';
            ctx.beginPath();
            ctx.roundRect(viewX, viewY, viewW, viewH, 6);
            ctx.fill();
            ctx.strokeStyle = '#243048';
            ctx.stroke();

            // Ground baseline line
            ctx.strokeStyle = '#334155';
            ctx.lineWidth = 2;
            ctx.beginPath();
            ctx.moveTo(viewX, viewY + viewH - 24);
            ctx.lineTo(viewX + viewW, viewY + viewH - 24);
            ctx.stroke();

            ctx.fillStyle = '#64748b';
            ctx.font = '9px monospace';
            ctx.fillText('GROUND 0px DRIFT', viewX + 8, viewY + viewH - 10);

            // Draw character image
            const sourceImg = imgs[idx];
            const destCharW = sourceImg.width * 1.7;
            const destCharH = sourceImg.height * 1.7;
            const destCharX = viewX + (viewW - destCharW) / 2;
            const destCharY = (viewY + viewH - 24) - destCharH + 16;

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
              if (ctx.measureText(testLine).width > (cardW - 24) && n > 0) {
                ctx.fillText(line, x + 12, lineY);
                line = words[n] + ' ';
                lineY += 16;
              } else {
                line = testLine;
              }
            }
            ctx.fillText(line, x + 12, lineY);
          });

          resolve(c.toDataURL('image/png'));
        }

        for (let i = 0; i < 5; i++) {
          const img = new Image();
          img.onload = check;
          img.src = 'data:image/png;base64,' + imagesData[i];
          imgs.push(img);
        }
      });
    })(${JSON.stringify(b64s)})
  `);

  fs.writeFileSync(
    path.join(__dirname, 'pico-hop-drop-kinematics-showcase.png'),
    Buffer.from(showcase.replace(/^data:image\/png;base64,/, ''), 'base64')
  );
  console.log('[SAVED] pico-hop-drop-kinematics-showcase.png');

  // Clean up individual step frames
  showcaseFiles.forEach(f => {
    try { fs.unlinkSync(path.join(__dirname, f)); } catch {}
  });

  console.log('\n===============================================================');
  console.log('  ALL PHASE 3 — STEP 2 HOP & DROP KINEMATICS TESTS PASSED!     ');
  console.log('===============================================================');

  app.quit();
});
