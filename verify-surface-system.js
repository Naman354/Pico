const { app, BrowserWindow, screen, ipcMain } = require('electron');
const path = require('path');
const fs = require('fs');

app.commandLine.appendSwitch('enable-transparent-visuals');

const { Surface, SurfaceManager, TaskbarWorldSurface } = require('./surfaces.js');

app.whenReady().then(async () => {
  console.log('===============================================================');
  console.log('  GOAL 2: SURFACE ABSTRACTION & WORLD COORDINATES VERIFICATION');
  console.log('===============================================================');

  const testSurfaceManager = new SurfaceManager();
  const taskbarSurface = testSurfaceManager.initPrimaryDisplaySurfaces();

  console.log('\n--- 1. Main Process SurfaceManager Tests ---');
  console.log('Registered Surfaces:', testSurfaceManager.getAllSurfaces().map(s => s.id));
  const homeSurface = testSurfaceManager.getHomeSurface();
  console.log('Home Surface:', homeSurface.id, `(type: ${homeSurface.type}, elevation: ${homeSurface.elevation})`);

  if (homeSurface && homeSurface.type === 'taskbar' && homeSurface.isHome) {
    console.log('[PASS] Primary Taskbar surface properly registered as Home Surface');
  } else {
    console.error('[FAIL] Home surface registration failed');
    process.exit(1);
  }

  // Setup BrowserWindow and IPCs
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

  ipcMain.handle('get-all-surfaces', () => testSurfaceManager.getAllSurfaces());
  ipcMain.handle('get-active-surface', () => testSurfaceManager.getActiveSurface());
  ipcMain.handle('get-surface', (_event, id) => testSurfaceManager.getSurface(id));
  ipcMain.handle('get-taskbar-surface', () => TaskbarWorldSurface.getSurface());

  await win.loadFile(path.join(__dirname, 'src', 'renderer', 'index.html'));
  await new Promise(r => setTimeout(r, 600));

  console.log('\n--- 2. Renderer SurfaceManager Integration ---');
  const rendererSurfaceCheck = await win.webContents.executeJavaScript(`
    (() => {
      const sm = window.SurfaceManager;
      if (!sm) return { error: 'SurfaceManager not found on window' };

      const active = sm.getActiveSurface();
      const all = sm.getAllSurfaces();
      const home = sm.getHomeSurface();

      return {
        hasManager: true,
        surfaceCount: all.length,
        activeId: active?.id,
        activeType: active?.type,
        homeId: home?.id,
        canvasWidth: sm.canvasWidth,
        canvasHeight: sm.canvasHeight
      };
    })()
  `);

  console.log('Renderer Surface Status:', JSON.stringify(rendererSurfaceCheck, null, 2));

  if (rendererSurfaceCheck.hasManager && rendererSurfaceCheck.activeId === 'taskbar-main') {
    console.log('[PASS] Renderer SurfaceManager successfully initialized from IPC surfaces');
  } else {
    console.error('[FAIL] Renderer SurfaceManager initialization failed:', rendererSurfaceCheck);
    process.exit(1);
  }

  console.log('\n--- 3. World Coordinates Query (window.getPicoWorldCoords) ---');
  const worldCoords = await win.webContents.executeJavaScript(`
    window.getPicoWorldCoords()
  `);
  console.log('Pico World Coords:', JSON.stringify(worldCoords, null, 2));

  if (worldCoords.surfaceId === 'taskbar-main' && worldCoords.canvasY === 0 && worldCoords.footDrift === 0) {
    console.log('[PASS] World coordinate query returns valid surface attachment and 0px foot drift');
  } else {
    console.error('[FAIL] World coordinates mismatch:', worldCoords);
    process.exit(1);
  }

  console.log('\n--- 4. Multi-Surface Registration & Elevation Coordinate Translation ---');
  const multiSurfaceTest = await win.webContents.executeJavaScript(`
    (() => {
      const sm = window.SurfaceManager;
      const wc = window.WanderController;

      // Register a second elevated surface (e.g. an application window top ledge at elevation 450)
      sm.register({
        id: 'window-shelf-1',
        type: 'window_edge',
        label: 'Code Editor Window Ledge',
        bounds: { x: 100, y: 450, width: 700, height: 30 },
        walkableRange: { minX: 120, maxX: 680 },
        elevation: 450,
        isHome: false,
        defaultX: 200
      });

      const registered = sm.get('window-shelf-1');
      const canvasCoords = sm.toCanvasCoords('window-shelf-1', 250);

      // Verify coordinate translation
      const homeElevation = sm.getHomeSurface().elevation;
      const expectedDeltaY = -(homeElevation - 450);

      // Temporarily place stage at elevated surface
      wc.currentSurfaceId = 'window-shelf-1';
      wc.setStagePosition(250, canvasCoords.y);

      const elevatedWorldCoords = window.getPicoWorldCoords();
      const stageTransform = document.getElementById('desktop-stage').style.transform;

      // Restore to taskbar
      wc.currentSurfaceId = 'taskbar-main';
      wc.setStagePosition(300, 0);
      const restoredTransform = document.getElementById('desktop-stage').style.transform;

      return {
        hasShelf: !!registered,
        shelfElevation: registered?.elevation,
        canvasCoords,
        expectedDeltaY,
        stageTransform,
        restoredTransform,
        elevatedWorldCoords
      };
    })()
  `);

  console.log('Multi-Surface Translation Test:', JSON.stringify(multiSurfaceTest, null, 2));

  const deltaMatch = multiSurfaceTest.canvasCoords.y === multiSurfaceTest.expectedDeltaY;
  const transformMatch = multiSurfaceTest.stageTransform.includes('translate(');
  const restoreMatch = multiSurfaceTest.restoredTransform === 'translateX(300px)';

  if (deltaMatch && transformMatch && restoreMatch) {
    console.log('[PASS] Multi-surface coordinate translation accurately computes vertical elevation offset');
    console.log('[PASS] Stage transform handles multi-elevation translate while preserving baseline translateX for taskbar');
  } else {
    console.error('[FAIL] Multi-surface translation test failed!');
    process.exit(1);
  }

  console.log('\n--- 5. Foot Grounding & Scale Verification on Taskbar Baseline ---');
  const baselineMetrics = await win.webContents.executeJavaScript(`
    (() => {
      const container = document.getElementById('pico-container');
      const char = document.getElementById('pico-character');
      const cRect = container.getBoundingClientRect();
      const charRect = char.getBoundingClientRect();

      return {
        charHeight: charRect.height,
        gapToBottom: window.innerHeight - cRect.bottom,
        isIdle: document.getElementById('pico-figure').classList.contains('idle')
      };
    })()
  `);

  console.log('Baseline Metrics:', JSON.stringify(baselineMetrics, null, 2));

  const heightOk = Math.abs(baselineMetrics.charHeight - 60) < 1;
  const gapOk = Math.abs(baselineMetrics.gapToBottom - 1) < 0.1;

  if (heightOk && gapOk) {
    console.log('[PASS] ~60px visible scale and exact 1.0px baseline foot contact preserved');
  } else {
    console.error('[FAIL] Baseline metrics mismatch!');
    process.exit(1);
  }

  console.log('\n===============================================================');
  console.log('  ALL GOAL 2 SURFACE & WORLD COORDINATES CHECKS PASSED!');
  console.log('===============================================================');

  app.quit();
});
