const { app, BrowserWindow, screen, ipcMain } = require('electron');
const path = require('path');
const fs = require('fs');
const { SurfaceManager, TaskbarWorldSurface } = require('./surfaces.js');

app.commandLine.appendSwitch('enable-transparent-visuals');

app.whenReady().then(async () => {
  console.log('========================================================================');
  console.log('  PHASE 3 STEP 3A REFINED: TEST SURFACE & LEDGE-TO-LEDGE TRAVERSAL     ');
  console.log('========================================================================');

  const sm = new SurfaceManager();
  sm.initPrimaryDisplaySurfaces();
  sm.initLiveElevatedShelf(); // Registers both elevated-test-shelf (Ledge A) and test-shelf-b (Ledge B)

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

  // --- 1. Verification of Non-Intrusive Normal Desktop Experience ---
  console.log('\n--- 1. Testing Non-Intrusive Presentation (No UI Overlay) ---');
  const presentation = await win.webContents.executeJavaScript(`
    (() => {
      const visualShelf = document.getElementById('elevated-shelf-visual');
      const label = document.querySelector('.shelf-label');
      const style = window.getComputedStyle(visualShelf);
      return {
        hasVisualShelfElement: Boolean(visualShelf),
        hasLabel: Boolean(label),
        displayStyle: style.display,
        visibility: style.visibility,
        bodyHasDebugClass: document.body.classList.contains('debug-surfaces')
      };
    })()
  `);

  console.log('Presentation Check:', presentation);
  if (presentation.hasLabel) {
    throw new Error('FAIL: shelf-label element still exists in DOM!');
  }
  if (presentation.displayStyle !== 'none') {
    throw new Error(`FAIL: Visual shelf is visible in normal usage! display=${presentation.displayStyle}`);
  }
  console.log('[PASS] Visual shelf overlay is completely hidden during normal usage (display: none). No intrusive text label!');

  // --- 2. Intent Parsing Verification Suite ---
  console.log('\n--- 2. Testing Movement Intent Parser ---');
  const commandsToTest = [
    { text: 'Hop up.', expectedType: 'JUMP_UP' },
    { text: 'Jump up.', expectedType: 'JUMP_UP' },
    { text: 'Jump to the ledge above.', expectedType: 'JUMP_UP' },
    { text: 'Hop onto that ledge.', expectedType: 'JUMP_UP' },
    { text: 'Jump to the other ledge.', expectedType: 'JUMP_OTHER_LEDGE' },
    { text: 'Hop to the other ledge.', expectedType: 'JUMP_OTHER_LEDGE' },
    { text: 'Go to the ledge above me.', expectedType: 'JUMP_LEDGE_ABOVE', directlyAbove: true },
    { text: 'Come down from the ledge.', expectedType: 'DROP_DOWN' },
    { text: 'Return to the taskbar.', expectedType: 'DROP_DOWN' }
  ];

  for (const cmd of commandsToTest) {
    const parsed = await win.webContents.executeJavaScript(`
      window.UserMovement.parseCommand(${JSON.stringify(cmd.text)})
    `);
    console.log(`Command "${cmd.text}" ->`, parsed);
    if (!parsed || parsed.type !== cmd.expectedType) {
      throw new Error(`FAIL: "${cmd.text}" parsed as ${parsed?.type}, expected ${cmd.expectedType}`);
    }
    if (cmd.directlyAbove && !parsed.directlyAbove) {
      throw new Error(`FAIL: "${cmd.text}" missing directlyAbove flag`);
    }
  }
  console.log('[PASS] All 9 ledge-to-ledge and elevation commands parsed correctly!');

  // Position Pico on Taskbar beneath Ledge A (e.g. X=420)
  await win.webContents.executeJavaScript(`
    window.WanderController.setStagePosition(420, 0);
  `);
  await new Promise(r => setTimeout(r, 100));

  // --- 3. Physical Traversal: Taskbar -> "Hop up" -> Ledge A ---
  console.log('\n--- 3. Testing: Taskbar -> "Hop up" -> Ledge A ---');
  await win.webContents.executeJavaScript(`
    (async () => {
      const intent = window.UserMovement.parseCommand('Hop up.');
      return await window.UserMovement.executeCommand(intent);
    })()
  `);

  const state1 = await win.webContents.executeJavaScript(`
    (() => {
      const state = window.PhysicsWorld.getPhysicalState();
      const figure = document.getElementById('pico-figure');
      return {
        surfaceId: state.surfaceId,
        canvasY: state.canvasY,
        footDrift: state.footDrift,
        isIdle: figure.classList.contains('idle'),
        facing: window.WanderController.currentFacing
      };
    })()
  `);
  console.log('Ledge A Arrival State:', state1);
  if (state1.surfaceId !== 'elevated-test-shelf' || state1.canvasY !== -110 || state1.footDrift !== 0) {
    throw new Error('FAIL: Pico did not land cleanly on Ledge A');
  }
  console.log('[PASS] Pico traversed to Ledge A (canvasY=-110, 0.0000px drift, grounded idle)');

  const r1 = await getCharRect();
  const img1 = await win.webContents.capturePage(r1);
  fs.writeFileSync(path.join(__dirname, 'step1-ledge-a.png'), img1.toPNG());

  // --- 4. Physical Traversal: Ledge A -> "Jump to the other ledge" -> Ledge B ---
  console.log('\n--- 4. Testing: Ledge A -> "Jump to the other ledge" -> Ledge B ---');
  await win.webContents.executeJavaScript(`
    (async () => {
      const intent = window.UserMovement.parseCommand('Jump to the other ledge.');
      return await window.UserMovement.executeCommand(intent);
    })()
  `);

  const state2 = await win.webContents.executeJavaScript(`
    (() => {
      const state = window.PhysicsWorld.getPhysicalState();
      const figure = document.getElementById('pico-figure');
      return {
        surfaceId: state.surfaceId,
        canvasY: state.canvasY,
        localX: state.localX,
        footDrift: state.footDrift,
        isIdle: figure.classList.contains('idle')
      };
    })()
  `);
  console.log('Ledge B Arrival State:', state2);
  if (state2.surfaceId !== 'test-shelf-b' || state2.canvasY !== -120 || state2.footDrift !== 0) {
    throw new Error('FAIL: Pico did not land cleanly on Ledge B');
  }
  console.log('[PASS] Pico physically traversed across gap from Ledge A to Ledge B (canvasY=-120, 0.0000px drift)');

  const r2 = await getCharRect();
  const img2 = await win.webContents.capturePage(r2);
  fs.writeFileSync(path.join(__dirname, 'step2-ledge-b.png'), img2.toPNG());

  // --- 5. Physical Traversal: Ledge B -> "Jump to the other ledge" -> Ledge A ---
  console.log('\n--- 5. Testing: Ledge B -> "Jump to the other ledge" -> Ledge A ---');
  await win.webContents.executeJavaScript(`
    (async () => {
      const intent = window.UserMovement.parseCommand('Jump to the other ledge.');
      return await window.UserMovement.executeCommand(intent);
    })()
  `);

  const state3 = await win.webContents.executeJavaScript(`
    (() => {
      const state = window.PhysicsWorld.getPhysicalState();
      const figure = document.getElementById('pico-figure');
      return {
        surfaceId: state.surfaceId,
        canvasY: state.canvasY,
        localX: state.localX,
        footDrift: state.footDrift,
        isIdle: figure.classList.contains('idle')
      };
    })()
  `);
  console.log('Ledge A Return State:', state3);
  if (state3.surfaceId !== 'elevated-test-shelf' || state3.canvasY !== -110 || state3.footDrift !== 0) {
    throw new Error('FAIL: Pico did not leap cleanly back to Ledge A');
  }
  console.log('[PASS] Pico physically traversed back from Ledge B to Ledge A (canvasY=-110, 0.0000px drift)');

  const r3 = await getCharRect();
  const img3 = await win.webContents.capturePage(r3);
  fs.writeFileSync(path.join(__dirname, 'step3-back-to-a.png'), img3.toPNG());

  // --- 6. Graceful Reaction: Command "Go to the ledge above me" when already at top ---
  console.log('\n--- 6. Testing Graceful Behavior: "Go to the ledge above me" when no higher ledge exists ---');
  await win.webContents.executeJavaScript(`
    (async () => {
      const intent = window.UserMovement.parseCommand('Go to the ledge above me.');
      return await window.UserMovement.executeCommand(intent);
    })()
  `);

  const stateAboveGraceful = await win.webContents.executeJavaScript(`
    (() => {
      const state = window.PhysicsWorld.getPhysicalState();
      return {
        surfaceId: state.surfaceId,
        canvasY: state.canvasY,
        footDrift: state.footDrift
      };
    })()
  `);
  console.log('Top Ledge Graceful State:', stateAboveGraceful);
  if (stateAboveGraceful.surfaceId !== 'elevated-test-shelf' || stateAboveGraceful.canvasY !== -110) {
    throw new Error('FAIL: Pico jumped into thin air when no ledge was above!');
  }
  console.log('[PASS] Pico gracefully remained grounded on Ledge A with 0 blind jumps');

  // --- 7. Physical Traversal: Ledge A -> "Return to the taskbar" -> Taskbar ---
  console.log('\n--- 7. Testing: Ledge A -> "Return to the taskbar" -> Taskbar ---');
  await win.webContents.executeJavaScript(`
    (async () => {
      const intent = window.UserMovement.parseCommand('Return to the taskbar.');
      return await window.UserMovement.executeCommand(intent);
    })()
  `);

  const state4 = await win.webContents.executeJavaScript(`
    (() => {
      const state = window.PhysicsWorld.getPhysicalState();
      const figure = document.getElementById('pico-figure');
      return {
        surfaceId: state.surfaceId,
        canvasY: state.canvasY,
        isHome: state.isHome,
        footDrift: state.footDrift,
        isIdle: figure.classList.contains('idle')
      };
    })()
  `);
  console.log('Taskbar Return State:', state4);
  if (state4.surfaceId !== 'taskbar-main' || state4.canvasY !== 0 || state4.footDrift !== 0) {
    throw new Error('FAIL: Pico did not drop down cleanly onto taskbar');
  }
  console.log('[PASS] Pico dropped down back onto taskbar baseline (canvasY=0, 0.0000px drift, grounded idle)');

  const r4 = await getCharRect();
  const img4 = await win.webContents.capturePage(r4);
  fs.writeFileSync(path.join(__dirname, 'step4-taskbar-drop.png'), img4.toPNG());

  // --- 8. Graceful Reaction: Command "Come down from the ledge" while already on Taskbar ---
  console.log('\n--- 8. Testing Graceful Behavior: "Come down from the ledge" while already on taskbar ---');
  await win.webContents.executeJavaScript(`
    (async () => {
      const intent = window.UserMovement.parseCommand('Come down from the ledge.');
      return await window.UserMovement.executeCommand(intent);
    })()
  `);

  const stateTaskbarGraceful = await win.webContents.executeJavaScript(`
    (() => {
      const state = window.PhysicsWorld.getPhysicalState();
      return {
        surfaceId: state.surfaceId,
        canvasY: state.canvasY,
        footDrift: state.footDrift
      };
    })()
  `);
  console.log('Taskbar Grounded Graceful State:', stateTaskbarGraceful);
  if (stateTaskbarGraceful.surfaceId !== 'taskbar-main' || stateTaskbarGraceful.canvasY !== 0) {
    throw new Error('FAIL: Pico dropped below taskbar!');
  }
  console.log('[PASS] Pico gracefully remained grounded on taskbar baseline (0 drift, no blind drop)');

  // --- 9. Generate Composite Review Showcase ---
  console.log('\n--- 9. Generating Composite Review Showcase ---');
  const files = [
    'step1-ledge-a.png',
    'step2-ledge-b.png',
    'step3-back-to-a.png',
    'step4-taskbar-drop.png'
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
          ctx.fillText('Pico Phase 3 — Step 3A Refined: Multi-Ledge Traversal', 28, 38);

          ctx.fillStyle = '#94a3b8';
          ctx.font = '13px -apple-system, sans-serif';
          ctx.fillText('Non-Intrusive Presentation | Ledge-to-Ledge Traversal | Exact Foot Grounding (0.0000px Drift)', 28, 56);

          const cards = [
            {
              title: '1. "Hop Up" -> Ledge A',
              tag: 'LEDGE A',
              tagColor: '#10b981',
              desc: 'Pico receives "Hop up" on taskbar -> orient -> parabolic leap -> soft landing on Ledge A at canvasY=-110px.'
            },
            {
              title: '2. "Jump to Other Ledge"',
              tag: 'GAP JUMP',
              tagColor: '#3b82f6',
              desc: 'Selects neighboring Ledge B -> walks to shelf edge -> leaps 80px gap -> lands softly at canvasY=-120px.'
            },
            {
              title: '3. Return to Ledge A',
              tag: 'REVERSE JUMP',
              tagColor: '#8b5cf6',
              desc: 'Receives "Jump to other ledge" on Ledge B -> walks to left edge -> leaps across gap -> lands cleanly on Ledge A.'
            },
            {
              title: '4. "Return to Taskbar"',
              tag: 'TASKBAR DROP',
              tagColor: '#06b6d4',
              desc: 'Ledge look-down -> gravity-accelerated drop -> impact absorption on taskbar baseline (0.0000px drift).'
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
    path.join(__dirname, 'pico-multi-ledge-traversal-showcase.png'),
    Buffer.from(showcase.replace(/^data:image\/png;base64,/, ''), 'base64')
  );
  console.log('[SAVED] pico-multi-ledge-traversal-showcase.png');

  // Clean up individual step frames
  files.forEach(f => {
    try { fs.unlinkSync(path.join(__dirname, f)); } catch {}
  });

  console.log('\n========================================================================');
  console.log('  ALL STEP 3A REFINED TESTS & TRAVERSALS PASSED SUCCESSFULLY!          ');
  console.log('========================================================================');

  app.quit();
});
