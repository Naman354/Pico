const { app, BrowserWindow, screen, ipcMain } = require('electron');
const path = require('path');
const fs = require('fs');

app.commandLine.appendSwitch('enable-transparent-visuals');

const { Surface, SurfaceManager, TaskbarWorldSurface } = require('./surfaces.js');

app.whenReady().then(async () => {
  console.log('===============================================================');
  console.log('  GOAL 3: UNIFIED MOVEMENT GOAL ENGINE VERIFICATION');
  console.log('===============================================================');

  const testSurfaceManager = new SurfaceManager();
  testSurfaceManager.initPrimaryDisplaySurfaces();

  const display = screen.getPrimaryDisplay();
  const { workArea } = display;

  const win = new BrowserWindow({
    width: 1000,
    height: 400,
    transparent: true,
    frame: false,
    hasShadow: false,
    resizable: false,
    alwaysOnTop: true,
    webPreferences: {
      preload: path.join(__dirname, 'preload.js'),
      contextIsolation: true,
      nodeIntegration: false
    }
  });

  ipcMain.handle('get-all-surfaces', () => testSurfaceManager.getAllSurfaces());
  ipcMain.handle('get-active-surface', () => testSurfaceManager.getActiveSurface());
  ipcMain.handle('get-surface', (_event, id) => testSurfaceManager.getSurface(id));
  ipcMain.handle('get-taskbar-surface', () => TaskbarWorldSurface.getSurface());

  await win.loadFile(path.join(__dirname, 'src', 'renderer', 'index.html'));
  await new Promise(r => setTimeout(r, 600));

  function assert(cond, msg) {
    if (cond) {
      console.log(`[PASS] ${msg}`);
    } else {
      console.error(`[FAIL] ${msg}`);
      throw new Error(`Assertion failed: ${msg}`);
    }
  }

  // -------------------------------------------------------------------------
  // 1. NLP Movement Goal Parser Verification
  // -------------------------------------------------------------------------
  console.log('\n--- 1. NLP Command Parser Scopes ---');
  const parserTests = [
    { input: 'Move.', expectedType: 'SHORT', expectedDir: null },
    { input: 'Move right.', expectedType: 'SHORT', expectedDir: 'right' },
    { input: 'Walk a bit right.', expectedType: 'MEDIUM', expectedDir: 'right' },
    { input: 'Go far right.', expectedType: 'LONG', expectedDir: 'right' },
    { input: 'Keep walking right.', expectedType: 'CONTINUOUS', expectedDir: 'right' },
    { input: 'Go to the right edge.', expectedType: 'DESTINATION_EDGE', expectedDir: 'right' },
    { input: 'Go to the other edge.', expectedType: 'OPPOSITE_EDGE', expectedDir: null },
    { input: 'Walk all the way left.', expectedType: 'MAX_EXTENT', expectedDir: 'left' },
    { input: 'Stop.', expectedType: 'CANCEL', expectedDir: null },
    { input: "You're blocking it.", expectedType: 'CLEAR_VIEW', expectedDir: null },
    { input: 'Get out of the way.', expectedType: 'CLEAR_VIEW', expectedDir: null },
    { input: 'Hello Pico!', expectedType: null, expectedDir: null }
  ];

  for (const t of parserTests) {
    const res = await win.webContents.executeJavaScript(`window.UserMovement.parseCommand(${JSON.stringify(t.input)})`);
    if (t.expectedType === null) {
      assert(res === null, `"${t.input}" correctly parsed as non-movement (null)`);
    } else {
      assert(
        res && res.type === t.expectedType && res.direction === t.expectedDir,
        `"${t.input}" parsed as type: ${res?.type}, dir: ${res?.direction}`
      );
    }
  }

  // -------------------------------------------------------------------------
  // 2. Unified Goal Execution Verification (Short, Medium, Destination Edge)
  // -------------------------------------------------------------------------
  console.log('\n--- 2. Unified Movement Goal Execution ---');

  // Reset starting position to X = 400
  await win.webContents.executeJavaScript(`
    window.WanderController.setStagePosition(400, 0);
  `);
  await new Promise(r => setTimeout(r, 200));

  // 2a. Short Goal (~80px right)
  console.log('Testing SHORT goal (Move right)...');
  await win.webContents.executeJavaScript(`
    window.submitUserText("Move right.");
  `);
  // Wait for walk completion (80px at 28px/s = ~2.8s + 700ms nod)
  await new Promise(r => setTimeout(r, 4200));

  const posAfterShort = await win.webContents.executeJavaScript(`
    (() => ({
      x: window.WanderController.currentX,
      isIdle: document.getElementById('pico-figure').classList.contains('idle'),
      isWalking: window.WanderController.isWalking
    }))()
  `);
  console.log('Post-Short Position:', posAfterShort);
  assert(posAfterShort.x >= 475 && posAfterShort.x <= 485, `Pico moved ~80px right (expected ~480, actual: ${posAfterShort.x})`);
  assert(posAfterShort.isIdle && !posAfterShort.isWalking, 'Pico settled into idle stance');

  // 2b. Medium Goal ("Walk a bit left" -> ~160px left from 480 -> ~320)
  console.log('\nTesting MEDIUM goal (Walk a bit left)...');
  await win.webContents.executeJavaScript(`
    window.submitUserText("Walk a bit left.");
  `);
  // Wait for walk completion (160px at 28px/s = ~5.7s + 700ms nod)
  await new Promise(r => setTimeout(r, 7200));

  const posAfterMedium = await win.webContents.executeJavaScript(`
    (() => ({
      x: window.WanderController.currentX,
      isIdle: document.getElementById('pico-figure').classList.contains('idle'),
      isWalking: window.WanderController.isWalking
    }))()
  `);
  console.log('Post-Medium Position:', posAfterMedium);
  assert(posAfterMedium.x >= 315 && posAfterMedium.x <= 325, `Pico moved ~160px left (expected ~320, actual: ${posAfterMedium.x})`);

  // -------------------------------------------------------------------------
  // 3. Movement Preemption & Cancellation ("Stop.")
  // -------------------------------------------------------------------------
  console.log('\n--- 3. Interruptibility & Cancellation ("Stop.") ---');
  // Trigger walk asynchronously without blocking the test runner
  win.webContents.executeJavaScript(`
    window.submitUserText("Keep walking right.");
  `);
  // Wait 1200ms for nod acknowledgement to finish and walk to begin
  await new Promise(r => setTimeout(r, 1200));

  const movingCheck = await win.webContents.executeJavaScript(`
    window.WanderController.isWalking
  `);
  assert(movingCheck, 'Pico is actively walking right');

  // Command Stop
  console.log('Issuing "Stop." command...');
  await win.webContents.executeJavaScript(`
    window.submitUserText("Stop.");
  `);
  await new Promise(r => setTimeout(r, 300));

  const stoppedCheck = await win.webContents.executeJavaScript(`
    (() => ({
      isWalking: window.WanderController.isWalking,
      isIdle: document.getElementById('pico-figure').classList.contains('idle'),
      stoppedX: window.WanderController.currentX,
      drift: window.getPicoWorldCoords().footDrift
    }))()
  `);
  console.log('Stopped Check:', stoppedCheck);
  assert(!stoppedCheck.isWalking, 'Locomotion successfully interrupted by Stop command');
  assert(stoppedCheck.isIdle, 'Pico immediately transitioned back to front idle');
  assert(stoppedCheck.drift === 0, '0.000px foot drift maintained after mid-motion cancellation');

  console.log('\n===============================================================');
  console.log('  ALL GOAL 3 MOVEMENT GOAL ENGINE CHECKS PASSED!');
  console.log('===============================================================');

  app.quit();
});
