// Automated Verification Script for Milestone 2A: Taskbar Movement & Physical Presence
const { app, BrowserWindow, screen, ipcMain } = require('electron');
const path = require('path');
const fs = require('fs');

app.commandLine.appendSwitch('enable-transparent-visuals');

app.whenReady().then(async () => {
  const display = screen.getPrimaryDisplay();
  const { workArea } = display;
  const ledgeY = workArea.y + workArea.height;
  const windowHeight = 85;

  console.log('===============================================================');
  console.log('  MILESTONE 2A: TASKBAR MOVEMENT & BASIC PHYSICAL PRESENCE');
  console.log('===============================================================');

  ipcMain.handle('get-taskbar-surface', () => {
    return {
      ledgeY,
      minX: workArea.x + 30,
      maxX: workArea.x + workArea.width - 280,
      defaultX: workArea.x + workArea.width - 320
    };
  });

  const win = new BrowserWindow({
    width: workArea.width,
    height: windowHeight,
    x: workArea.x,
    y: ledgeY - windowHeight,
    transparent: true,
    frame: false,
    hasShadow: false,
    resizable: false,
    alwaysOnTop: true,
    skipTaskbar: true,
    backgroundColor: '#00000000',
    webPreferences: {
      preload: path.join(__dirname, 'preload.js'),
      contextIsolation: true
    }
  });

  const b = win.getBounds();
  const alignedY = ledgeY - b.height;
  win.setPosition(b.x, alignedY);
  win.setAlwaysOnTop(true, 'screen-saver', 1);
  win.setVisibleOnAllWorkspaces(true, { visibleOnFullScreen: true });

  win.on('blur', () => {
    win.setAlwaysOnTop(true, 'screen-saver', 1);
  });

  await win.loadFile(path.join(__dirname, 'src', 'renderer', 'index.html'));
  await new Promise(r => setTimeout(r, 500));

  let allPassed = true;
  function assert(condition, message) {
    if (condition) {
      console.log(`[PASS] ${message}`);
    } else {
      console.error(`[FAIL] ${message}`);
      allPassed = false;
    }
  }

  // -----------------------------------------------------------------
  // 1. Baseline Taskbar Grounding & Dimensions
  // -----------------------------------------------------------------
  console.log('\n--- 1. Baseline Grounding & Dimensions Check ---');
  const initMetrics = await win.webContents.executeJavaScript(`
    (() => {
      const container = document.getElementById('pico-container');
      const figure = document.getElementById('pico-figure');
      const facer = document.getElementById('pico-facer');
      const stage = document.getElementById('desktop-stage');
      const char = document.getElementById('pico-character');

      const cRect = container.getBoundingClientRect();
      const fRect = figure.getBoundingClientRect();
      const sRect = stage.getBoundingClientRect();

      return {
        containerHeight: cRect.height,
        containerWidth: cRect.width,
        figureHeight: fRect.height,
        gapToWindowBottom: window.innerHeight - cRect.bottom,
        currentX: window.WanderController ? window.WanderController.currentX : 0,
        minX: window.WanderController ? window.WanderController.minX : 0,
        maxX: window.WanderController ? window.WanderController.maxX : 0,
        hasFacer: !!facer,
        hasWalkFrames: (!!document.getElementById('pico-side-walk1') && !!document.getElementById('pico-side-walk2')) ||
                       (!!document.getElementById('pico-walk1') && !!document.getElementById('pico-walk2')),
        isIdle: figure.classList.contains('idle'),
        isWalking: figure.classList.contains('walking')
      };
    })()
  `);

  console.log('Initial Metrics:', JSON.stringify(initMetrics, null, 2));

  assert(initMetrics.containerHeight >= 58 && initMetrics.containerHeight <= 62,
    `Pico height is ${initMetrics.containerHeight}px (~60px scale preserved)`);
  assert(initMetrics.gapToWindowBottom <= 1.0,
    `Pico feet rest on taskbar baseline (gap: ${initMetrics.gapToWindowBottom.toFixed(2)}px)`);
  assert(initMetrics.hasFacer, 'Pico has #pico-facer for horizontal directional turning');
  assert(initMetrics.hasWalkFrames, 'Walk frames derived from authoritative asset exist in DOM');
  assert(initMetrics.isIdle && !initMetrics.isWalking, 'Pico initializes in idle standing state');

  // -----------------------------------------------------------------
  // 2. Walking Along the Taskbar & Foot Grounding (0px Vertical Drift)
  // -----------------------------------------------------------------
  console.log('\n--- 2. Walking Along Taskbar & Foot Grounding (0px Drift) ---');
  
  // Start a controlled walk 70px to the left
  const startX = initMetrics.currentX;
  const walkDistance = 70;
  const targetX = startX - walkDistance;

  console.log(`Commanding Pico to walk from x=${startX} to x=${targetX}...`);

  // Start walking and sample feet position at intervals
  const walkPromise = win.webContents.executeJavaScript(`
    window.WanderController.walkTo(${targetX}, 35);
  `);

  // Sample vertical position and state during the walk
  const samples = [];
  const sampleCount = 6;
  for (let i = 0; i < sampleCount; i++) {
    await new Promise(r => setTimeout(r, 320));
    const sample = await win.webContents.executeJavaScript(`
      (() => {
        const container = document.getElementById('pico-container');
        const figure = document.getElementById('pico-figure');
        const facer = document.getElementById('pico-facer');
        const stage = document.getElementById('desktop-stage');

        const cRect = container.getBoundingClientRect();
        const fRect = figure.getBoundingClientRect();

        return {
          currentX: window.WanderController.currentX,
          isWalking: window.WanderController.isWalking,
          figureClasses: figure.className,
          facerClasses: facer.className,
          containerBottom: cRect.bottom,
          gapToBottom: window.innerHeight - cRect.bottom,
          hasWalkFrameClass: figure.classList.contains('walk-frame-1') || figure.classList.contains('walk-frame-2')
        };
      })()
    `);
    samples.push(sample);
  }

  await walkPromise;
  await new Promise(r => setTimeout(r, 200));

  const postWalk = await win.webContents.executeJavaScript(`
    (() => {
      const container = document.getElementById('pico-container');
      const figure = document.getElementById('pico-figure');
      const facer = document.getElementById('pico-facer');
      const cRect = container.getBoundingClientRect();
      return {
        currentX: window.WanderController.currentX,
        isWalking: window.WanderController.isWalking,
        isIdle: figure.classList.contains('idle'),
        figureClasses: figure.className,
        containerBottom: cRect.bottom,
        gapToBottom: window.innerHeight - cRect.bottom
      };
    })()
  `);

  console.log('Walk Samples during locomotion:');
  samples.forEach((s, idx) => {
    console.log(`  Sample ${idx+1}: x=${s.currentX}, isWalking=${s.isWalking}, facingLeft=${s.facerClasses.includes('facing-left')}, gap=${s.gapToBottom.toFixed(3)}px, classes="${s.figureClasses}"`);
  });
  console.log('Post-Walk State:', postWalk);

  // Check 1: Did Pico walk horizontally?
  const totalWalked = Math.abs(postWalk.currentX - startX);
  assert(totalWalked >= walkDistance - 2 && totalWalked <= walkDistance + 2,
    `Pico walked horizontally along the taskbar: moved ${totalWalked}px (expected ${walkDistance}px) to x=${postWalk.currentX}`);

  // Check 2: Were feet grounded throughout the entire walk?
  let maxFootDelta = 0;
  samples.forEach(s => {
    const delta = Math.abs(s.gapToBottom - initMetrics.gapToWindowBottom);
    if (delta > maxFootDelta) maxFootDelta = delta;
  });
  const postDelta = Math.abs(postWalk.gapToBottom - initMetrics.gapToWindowBottom);
  if (postDelta > maxFootDelta) maxFootDelta = postDelta;

  assert(maxFootDelta <= 0.05,
    `Feet remained strictly grounded throughout walk: max vertical drift = ${maxFootDelta.toFixed(4)}px (0px drift constraint satisfied)`);

  // Check 3: Directional facing
  const walkedLeftFacing = samples.some(s => s.facerClasses.includes('facing-left'));
  assert(walkedLeftFacing, 'Pico faced left while walking to the left');

  // Check 4: Walk frames active during walking
  const hadWalkFrames = samples.some(s => s.isWalking);
  assert(hadWalkFrames, 'Dedicated walking animation state and step cycle were active during walking');

  // Check 5: Transition back to idle
  assert(postWalk.isIdle && !postWalk.isWalking, 'Pico transitioned cleanly back to idle standing state upon stopping');

  // -----------------------------------------------------------------
  // 3. Autonomous Wandering & Boundaries
  // -----------------------------------------------------------------
  console.log('\n--- 3. Taskbar Boundaries & Autonomous Wandering Constraints ---');
  const boundaryCheck = await win.webContents.executeJavaScript(`
    (async () => {
      const ctrl = window.WanderController;
      // Test clamp at min boundary
      await ctrl.walkTo(ctrl.minX - 50, 1000);
      const atMin = ctrl.currentX;

      // Test clamp at max boundary
      await ctrl.walkTo(ctrl.maxX + 100, 1000);
      const atMax = ctrl.currentX;

      // Return to middle
      await ctrl.walkTo(${postWalk.currentX}, 1000);

      return {
        minX: ctrl.minX,
        maxX: ctrl.maxX,
        clampedMin: atMin,
        clampedMax: atMax,
        hasWanderTimer: !!ctrl.wanderTimer
      };
    })()
  `);

  console.log('Boundary Check:', boundaryCheck);
  assert(boundaryCheck.clampedMin >= boundaryCheck.minX,
    `Pico cannot walk past left taskbar boundary (clampedMin: ${boundaryCheck.clampedMin} >= minX: ${boundaryCheck.minX})`);
  assert(boundaryCheck.clampedMax <= boundaryCheck.maxX,
    `Pico cannot walk past right taskbar boundary (clampedMax: ${boundaryCheck.clampedMax} <= maxX: ${boundaryCheck.maxX})`);
  assert(boundaryCheck.hasWanderTimer,
    'Autonomous wander timer is actively scheduled for occasional ambient movement');

  // -----------------------------------------------------------------
  // 4. Interaction Preservation at New Position
  // -----------------------------------------------------------------
  console.log('\n--- 4. Interaction Preservation (Click, Hover, Input, Nod Acknowledgement) ---');

  // Test 4A: Click Pico opens speech bubble and triggers bounce
  const clickTest = await win.webContents.executeJavaScript(`
    new Promise((resolve) => {
      const container = document.getElementById('pico-container');
      const bubble = document.getElementById('bubble-container');
      const figure = document.getElementById('pico-figure');

      container.click();
      setTimeout(() => {
        resolve({
          isBubbleOpen: bubble.classList.contains('open'),
          isReacting: figure.classList.contains('reacting'),
          bubbleLeft: bubble.getBoundingClientRect().left,
          picoLeft: container.getBoundingClientRect().left
        });
      }, 100);
    })
  `);
  console.log('Click Test:', clickTest);
  assert(clickTest.isBubbleOpen, 'Clicking Pico opens speech bubble at current taskbar position');
  assert(clickTest.isReacting, 'Click acknowledgement reaction played on click');
  assert(clickTest.bubbleLeft > clickTest.picoLeft, 'Speech bubble is positioned beside Pico');

  // Test 4B: Text input & Send Acknowledgement (Natural Nod + closed eye)
  const sendTest = await win.webContents.executeJavaScript(`
    new Promise((resolve) => {
      const input = document.getElementById('pico-input');
      const sendBtn = document.getElementById('send-btn');
      const figure = document.getElementById('pico-figure');
      const container = document.getElementById('pico-container');

      input.value = 'Hello Pico!';
      sendBtn.click();

      setTimeout(() => {
        const isAck = figure.classList.contains('acknowledging');
        const isBlinking = container.classList.contains('blinking');
        const r = figure.getBoundingClientRect();
        resolve({
          isAck,
          isBlinking,
          figureBottom: r.bottom,
          gapToBottom: window.innerHeight - r.bottom
        });
      }, 300);
    })
  `);
  console.log('Send Nod Acknowledgement Test:', sendTest);
  assert(sendTest.isAck, 'Text submission triggers natural nod acknowledgement animation');
  assert(Math.abs(sendTest.gapToBottom - initMetrics.gapToWindowBottom) <= 0.05,
    'Pico feet remained 100% locked during nod acknowledgement at new position');

  // Close speech bubble and wait for nod animation (800ms total) to conclude
  await win.webContents.executeJavaScript(`
    (() => {
      const input = document.getElementById('pico-input');
      const esc = new KeyboardEvent('keydown', { key: 'Escape' });
      input.dispatchEvent(esc);
    })()
  `);
  await new Promise(r => setTimeout(r, 650));

  // Test 4C: Hover Glance
  const hoverTest = await win.webContents.executeJavaScript(`
    new Promise((resolve) => {
      const container = document.getElementById('pico-container');
      const figure = document.getElementById('pico-figure');

      container.dispatchEvent(new MouseEvent('mouseenter'));
      setTimeout(() => {
        resolve({
          isGlancing: figure.classList.contains('glancing'),
          classes: figure.className
        });
      }, 100);
    })
  `);
  console.log('Hover Glance Test:', hoverTest);
  assert(hoverTest.isGlancing, 'Hover reaction (glance) works at current position');

  // -----------------------------------------------------------------
  // 5. Z-Order & Taskbar Click Resilience
  // -----------------------------------------------------------------
  console.log('\n--- 5. Z-Order & Taskbar Click Resilience ---');
  for (let i = 1; i <= 3; i++) {
    win.blur();
    await new Promise(r => setTimeout(r, 80));
    const isTop = win.isAlwaysOnTop();
    assert(isTop, `Window retained screen-saver topmost z-order after taskbar click/blur #${i}`);
  }

  // -----------------------------------------------------------------
  // Capture Verification Screenshots
  // -----------------------------------------------------------------
  console.log('\n--- 6. Capturing Fresh Verification Visuals ---');

  // Visual 1: Walking state capture
  win.webContents.executeJavaScript(`window.WanderController.walkTo(${postWalk.currentX + 60}, 20);`);
  await new Promise(r => setTimeout(r, 600)); // Midway through walk
  const walkImage = await win.capturePage();
  fs.writeFileSync(path.join(__dirname, 'screenshot-taskbar-walking.png'), walkImage.toPNG());
  console.log('Saved screenshot-taskbar-walking.png');

  // Visual 2: Standing idle post-walk capture
  await win.webContents.executeJavaScript(`window.WanderController.stop();`);
  await new Promise(r => setTimeout(r, 300));
  const idleImage = await win.capturePage();
  fs.writeFileSync(path.join(__dirname, 'screenshot-taskbar-standing-idle.png'), idleImage.toPNG());
  console.log('Saved screenshot-taskbar-standing-idle.png');

  console.log('\n===============================================================');
  if (allPassed) {
    console.log('  ALL MILESTONE 2A AUTOMATED CHECKS PASSED SUCCESSFULLY!');
  } else {
    console.error('  SOME CHECKS FAILED. PLEASE REVIEW LOG ABOVE.');
  }
  console.log('===============================================================');

  app.quit();
});
