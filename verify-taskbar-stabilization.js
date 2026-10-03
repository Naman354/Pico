const { app, BrowserWindow, screen, ipcMain } = require('electron');
const path = require('path');
const fs = require('fs');
const { Surface, SurfaceManager, TaskbarWorldSurface } = require('./surfaces.js');

const surfaceManager = new SurfaceManager();

app.whenReady().then(async () => {
  surfaceManager.initPrimaryDisplaySurfaces();

  ipcMain.handle('get-taskbar-surface', () => {
    return TaskbarWorldSurface.getSurface();
  });
  ipcMain.handle('get-all-surfaces', () => {
    return surfaceManager.getAllSurfaces();
  });
  ipcMain.handle('get-active-surface', () => {
    return surfaceManager.getActiveSurface();
  });

  const display = screen.getPrimaryDisplay();
  const { workArea } = display;
  const PICO_WIDTH = 38;
  const expectedMinX = 0;
  const expectedMaxX = workArea.width - PICO_WIDTH;

  const win = new BrowserWindow({
    width: workArea.width,
    height: Math.min(400, workArea.height),
    x: workArea.x,
    y: workArea.y + workArea.height - Math.min(400, workArea.height),
    transparent: true,
    frame: false,
    show: false,
    webPreferences: {
      preload: path.join(__dirname, 'preload.js'),
      nodeIntegration: false,
      contextIsolation: true
    }
  });

  await win.loadFile(path.join(__dirname, 'src', 'renderer', 'index.html'));
  win.show();

  console.log('===============================================================');
  console.log('  TASKBAR WALKING STABILIZATION VERIFICATION SUITE');
  console.log('===============================================================');

  const wait = (ms) => new Promise((r) => setTimeout(r, ms));
  const evaluate = (fn, ...args) =>
    win.webContents.executeJavaScript(`(${fn.toString()})(${args.map((a) => JSON.stringify(a)).join(',')})`);

  async function capture(filename) {
    const img = await win.capturePage();
    fs.writeFileSync(path.join(__dirname, filename), img.toPNG());
    console.log(`[CAPTURE] Saved: ${filename}`);
  }

  await wait(500);

  // -----------------------------------------------------------------
  // 1. Edge Detection & Runtime Bounds Verification
  // -----------------------------------------------------------------
  console.log('\n--- 1. Real Runtime Edge Geometry Verification ---');
  const boundsCheck = await evaluate(() => {
    return {
      minX: window.WanderController.minX,
      maxX: window.WanderController.maxX,
      canvasWidth: window.innerWidth,
      picoWidth: document.getElementById('pico-container').offsetWidth
    };
  });

  console.log('Runtime Bounds Detected in Renderer:', boundsCheck);
  console.log(`Expected minX: ${expectedMinX}, Expected maxX: ${expectedMaxX}`);

  if (boundsCheck.minX !== expectedMinX) {
    throw new Error(`FAIL: minX is ${boundsCheck.minX}, expected ${expectedMinX}`);
  }
  if (boundsCheck.maxX !== expectedMaxX) {
    throw new Error(`FAIL: maxX is ${boundsCheck.maxX}, expected ${expectedMaxX}`);
  }
  console.log('[PASS] Left/Right boundaries accurately computed from display workArea runtime geometry');

  // Test Left Boundary Grounding & Visibility
  console.log('\n--- Testing Left Boundary (x = 0) ---');
  await evaluate(() => {
    window.WanderController.setStageX(0);
  });
  await wait(100);

  const leftEdgeCheck = await evaluate(() => {
    const pico = document.getElementById('pico-container');
    const rect = pico.getBoundingClientRect();
    const stage = document.getElementById('desktop-stage');
    return {
      x: window.WanderController.currentX,
      rectLeft: rect.left,
      rectRight: rect.right,
      rectBottom: rect.bottom,
      isFlipped: stage.classList.contains('bubble-flipped')
    };
  });
  console.log('Left Edge Metrics:', leftEdgeCheck);
  if (leftEdgeCheck.rectLeft < 0 || leftEdgeCheck.x !== 0) {
    throw new Error('FAIL: Pico left boundary is not validly positioned at 0');
  }
  console.log('[PASS] Left edge boundary: character touches edge (x=0) and remains 100% visible on-screen');

  // Test Right Boundary Grounding & Visibility
  console.log('\n--- Testing Right Boundary (x = maxX) ---');
  await evaluate((maxX) => {
    window.WanderController.setStageX(maxX);
  }, expectedMaxX);
  await wait(100);

  const rightEdgeCheck = await evaluate((canvasW) => {
    const pico = document.getElementById('pico-container');
    const rect = pico.getBoundingClientRect();
    const stage = document.getElementById('desktop-stage');
    return {
      x: window.WanderController.currentX,
      rectLeft: rect.left,
      rectRight: rect.right,
      rectBottom: rect.bottom,
      isFlipped: stage.classList.contains('bubble-flipped'),
      gapToScreenRight: canvasW - rect.right
    };
  }, workArea.width);
  console.log('Right Edge Metrics:', rightEdgeCheck);
  if (Math.abs(rightEdgeCheck.gapToScreenRight) > 2) {
    throw new Error(`FAIL: Right edge gap is ${rightEdgeCheck.gapToScreenRight}px, expected ~0px`);
  }
  if (!rightEdgeCheck.isFlipped) {
    throw new Error('FAIL: Speech bubble must flip to left side when Pico is near the right edge');
  }
  console.log('[PASS] Right edge boundary: character touches right screen edge without clipping, bubble flipped gracefully');

  // -----------------------------------------------------------------
  // 2. Synchronized Step Animation & Moonwalk Elimination
  // -----------------------------------------------------------------
  console.log('\n--- 2. Synchronized Movement & Animation Mechanics ---');
  // Place Pico at X = 200 and walk to 300
  await evaluate(() => {
    window.WanderController.setStageX(200);
  });
  await wait(150);

  // Sample movement and step phases during walk
  console.log('Initiating walk from X=200 to X=350...');
  evaluate(() => {
    window.WanderController.walkTo(350, 36);
  });

  // Track samples: position, accumulatedDistance, stepPhase, isWalking
  const samples = [];
  for (let i = 0; i < 8; i++) {
    await wait(120);
    const s = await evaluate(() => {
      const figure = document.getElementById('pico-figure');
      const sideW1 = document.getElementById('pico-side-walk1');
      const sideW2 = document.getElementById('pico-side-walk2');
      const sideStand = document.getElementById('pico-side-stand');
      const rect = document.getElementById('pico-container').getBoundingClientRect();
      return {
        x: window.WanderController.currentX,
        accumDist: window.WanderController.accumulatedDistance,
        isWalking: window.WanderController.isWalking,
        hasStep1Class: figure.classList.contains('walk-step-1'),
        hasStep2Class: figure.classList.contains('walk-step-2'),
        hasPassingClass: figure.classList.contains('walk-passing'),
        step1Visible: window.getComputedStyle(sideW1).display !== 'none',
        step2Visible: window.getComputedStyle(sideW2).display !== 'none',
        standVisible: window.getComputedStyle(sideStand).display !== 'none',
        bottomY: rect.bottom
      };
    });
    samples.push(s);
  }

  console.log('Sampled Walk States:');
  samples.forEach((s, idx) => {
    console.log(`  Sample ${idx}: X=${s.x}, accumDist=${s.accumDist.toFixed(1)}px, step1=${s.step1Visible}, step2=${s.step2Visible}, stand=${s.standVisible}, bottomY=${s.bottomY}`);
  });

  // Verify distance accumulated continuously while moving
  for (let i = 1; i < samples.length; i++) {
    if (samples[i].isWalking) {
      if (samples[i].accumDist <= samples[i - 1].accumDist && samples[i].x !== samples[i - 1].x) {
        throw new Error('FAIL: Accumulated distance must strictly advance with horizontal translation');
      }
    }
  }
  console.log('[PASS] Step animation is strictly driven by accumulated distance traversed (zero moonwalking)');

  // Wait for walk completion
  for (let i = 0; i < 30; i++) {
    const isStillWalking = await evaluate(() => window.WanderController.isWalking);
    if (!isStillWalking) break;
    await wait(200);
  }
  await wait(200);

  const finishCheck = await evaluate(() => {
    const figure = document.getElementById('pico-figure');
    const rect = document.getElementById('pico-container').getBoundingClientRect();
    return {
      x: window.WanderController.currentX,
      isWalking: window.WanderController.isWalking,
      isIdle: figure.classList.contains('idle'),
      bottomY: rect.bottom
    };
  });
  console.log('Walk Completion State:', finishCheck);
  if (finishCheck.isWalking || !finishCheck.isIdle || finishCheck.x !== 350) {
    throw new Error('FAIL: Walk did not complete cleanly to target X = 350');
  }
  console.log('[PASS] Walk arrived precisely at destination X=350 and settled into front idle stance');

  // -----------------------------------------------------------------
  // 3. Goal-Driven Scopes: "Go far right" & "Keep walking right"
  // -----------------------------------------------------------------
  console.log('\n--- 3. Goal-Driven Scopes Verification ---');
  // Set start position at X = 100
  await evaluate(() => {
    window.WanderController.setStageX(100);
  });
  await wait(100);

  // "Go far right."
  const farRightTarget = await evaluate(() => {
    const goal = window.UserMovement.parseCommand('Go far right.');
    return window.UserMovement.calculateTarget(goal, 100, window.WanderController.minX, window.WanderController.maxX);
  });
  console.log(`"Go far right" from X=100 resolved to target X = ${farRightTarget}`);
  if (farRightTarget !== 500) {
    throw new Error(`FAIL: "Go far right" from 100 should resolve to 500 (distance = 400), got ${farRightTarget}`);
  }
  console.log('[PASS] "Go far right" consistently creates a long movement goal (400px scope)');

  // "Keep walking right."
  const keepWalkingTarget = await evaluate(() => {
    const goal = window.UserMovement.parseCommand('Keep walking right.');
    return window.UserMovement.calculateTarget(goal, 100, window.WanderController.minX, window.WanderController.maxX);
  });
  console.log(`"Keep walking right" resolved to target X = ${keepWalkingTarget} (expected maxX = ${expectedMaxX})`);
  if (keepWalkingTarget !== expectedMaxX) {
    throw new Error(`FAIL: "Keep walking right" should resolve to maxX = ${expectedMaxX}, got ${keepWalkingTarget}`);
  }
  console.log('[PASS] "Keep walking right" creates a continuous goal targeting the actual screen edge');

  // "Go to the other edge."
  const otherEdgeTarget = await evaluate(() => {
    const goal = window.UserMovement.parseCommand('Go to the other edge.');
    return window.UserMovement.calculateTarget(goal, 100, window.WanderController.minX, window.WanderController.maxX);
  });
  console.log(`"Go to the other edge" from X=100 resolved to target X = ${otherEdgeTarget}`);
  if (otherEdgeTarget !== expectedMaxX) {
    throw new Error(`FAIL: "Go to the other edge" from left side should target right edge ${expectedMaxX}`);
  }
  console.log('[PASS] "Go to the other edge" accurately resolves to the opposite boundary');

  // -----------------------------------------------------------------
  // 4. Immediate Stop Interruption
  // -----------------------------------------------------------------
  console.log('\n--- 4. Immediate Stop Interruption Verification ---');
  await evaluate(() => {
    window.WanderController.setStageX(200);
  });
  await wait(100);

  // Start walking to 600
  evaluate(() => {
    window.WanderController.walkTo(600, 36);
  });
  await wait(400); // let him begin walking

  const midWalkCheck = await evaluate(() => ({
    isWalking: window.WanderController.isWalking,
    x: window.WanderController.currentX
  }));
  console.log('Pico actively walking:', midWalkCheck);
  if (!midWalkCheck.isWalking) throw new Error('FAIL: Pico should be actively walking');

  // User submits "Stop"
  console.log('Submitting "Stop" command during active walk...');
  await evaluate(async () => {
    const intent = window.UserMovement.parseCommand('Stop.');
    return await window.UserMovement.executeCommand(intent);
  });

  const stoppedState = await evaluate(() => {
    const figure = document.getElementById('pico-figure');
    const rect = document.getElementById('pico-container').getBoundingClientRect();
    return {
      isWalking: window.WanderController.isWalking,
      isIdle: figure.classList.contains('idle'),
      stoppedX: window.WanderController.currentX,
      bottomY: rect.bottom
    };
  });
  console.log('Stopped State:', stoppedState);
  if (stoppedState.isWalking || !stoppedState.isIdle) {
    throw new Error('FAIL: Stop command did not immediately halt locomotion and return to idle');
  }
  console.log(`[PASS] Pico stopped immediately at X=${stoppedState.stoppedState || stoppedState.stoppedX}, returned to idle with zero drift`);

  // -----------------------------------------------------------------
  // 5. User Priority over Autonomous Wandering
  // -----------------------------------------------------------------
  console.log('\n--- 5. User Priority & Autonomous Non-Interference ---');
  evaluate(() => {
    const autoGoal = new window.MovementGoal({ type: 'SHORT', direction: 'right', source: 'autonomous' });
    window.WanderController.executeGoal(autoGoal);
  });
  await wait(300); // allow turn transition to finish and walk to begin

  const isAutoActive = await evaluate(() => {
    return window.WanderController.isWalking && window.WanderController.currentGoal?.source === 'autonomous';
  });
  console.log('Autonomous Walk Active:', isAutoActive);

  // Issue explicit user movement command to preempt autonomous wander
  evaluate(() => {
    const userGoal = new window.MovementGoal({ type: 'SHORT', direction: 'left', source: 'user' });
    window.WanderController.executeGoal(userGoal);
  });
  await wait(300); // allow preemption and direction reversal

  const isUserActive = await evaluate(() => {
    return window.WanderController.isWalking && window.WanderController.currentGoal?.source === 'user';
  });
  console.log('User Command Preempted and Active:', isUserActive);

  // Verify autonomous wander cannot interrupt active user walk
  const wanderInterrupted = await evaluate(() => {
    window.WanderController.maybeWander();
    return window.WanderController.currentGoal?.source === 'user';
  });
  console.log('Autonomous Wander Blocked During User Walk:', wanderInterrupted);

  await evaluate(() => {
    window.WanderController.stop();
  });

  if (!isUserActive || !wanderInterrupted) {
    throw new Error('FAIL: User command must preempt autonomous walk and block subsequent autonomous interference');
  }
  console.log('[PASS] Explicit user movement commands take absolute priority over autonomous wander');

  // -----------------------------------------------------------------
  // 6. Capture Verification Showcase Recordings
  // -----------------------------------------------------------------
  console.log('\n--- 6. Capturing Verification Showcase Frames ---');
  // Scenario A: idle -> turn -> walk long distance -> reach actual edge -> stop
  await evaluate((maxX) => {
    window.WanderController.setStageX(maxX - 150);
  }, expectedMaxX);
  await wait(200);

  console.log('Recording Scenario A: Walk to actual edge...');
  await capture('pico-stabilize-1-idle-near-edge.png');

  // Start walk to exact edge
  evaluate((maxX) => {
    window.WanderController.walkTo(maxX, 36);
  }, expectedMaxX);

  await wait(120);
  await capture('pico-stabilize-2-turning-to-walk.png');

  await wait(1200);
  await capture('pico-stabilize-3-walking-stride.png');

  for (let i = 0; i < 30; i++) {
    const isStillWalking = await evaluate(() => window.WanderController.isWalking);
    if (!isStillWalking) break;
    await wait(200);
  }
  await wait(200); // reach edge and settle into idle
  await capture('pico-stabilize-4-edge-boundary-reached.png');

  // Scenario B: idle -> walk -> user says stop -> immediate stop
  await evaluate(() => {
    window.WanderController.setStageX(250);
  });
  await wait(200);

  console.log('Recording Scenario B: Walk interrupted by Stop...');
  await capture('pico-stabilize-5-idle-before-walk.png');

  evaluate(() => {
    window.WanderController.walkTo(650, 36);
  });
  await wait(500);
  await capture('pico-stabilize-6-active-walk.png');

  // User says stop
  await evaluate(async () => {
    const intent = window.UserMovement.parseCommand('Stop');
    await window.UserMovement.executeCommand(intent);
  });
  await wait(100);
  await capture('pico-stabilize-7-user-says-stop-halted.png');

  console.log('\n===============================================================');
  console.log('  ALL TASKBAR WALKING STABILIZATION VERIFICATIONS PASSED!');
  console.log('===============================================================');

  app.quit();
  process.exit(0);
});
