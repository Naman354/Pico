const { app, BrowserWindow, screen, ipcMain } = require('electron');
const path = require('path');
const fs = require('fs');
const { Surface, SurfaceManager, TaskbarWorldSurface } = require('./surfaces.js');

app.commandLine.appendSwitch('enable-transparent-visuals');

app.whenReady().then(async () => {
  console.log('===============================================================');
  console.log('  PHASE 3: PHYSICAL-WORLD FOUNDATION VERIFICATION SUITE       ');
  console.log('===============================================================');

  const sm = new SurfaceManager();
  const taskbar = sm.initPrimaryDisplaySurfaces();

  // 1. Unit Tests on Surface & Spatial Queries (Main Process)
  console.log('\n--- 1. Testing Surface Boundary Metrics & Classification ---');
  const testWindow = new Surface({
    id: 'window-code-editor',
    type: 'window_edge',
    label: 'VS Code Titlebar Ledge',
    bounds: { x: 200, y: 500, width: 600, height: 35 },
    walkableRange: { minX: 210, maxX: 780 },
    elevation: 500,
    isHome: false,
    defaultX: 400,
    leftBoundaryType: 'drop_off',
    rightBoundaryType: 'drop_off'
  });
  sm.registerSurface(testWindow);

  const edgeAtLeft = testWindow.getEdgeMetrics(215);
  const edgeAtCenter = testWindow.getEdgeMetrics(400);
  const edgeAtRight = testWindow.getEdgeMetrics(775);

  console.log('Ledge Near Left (X=215):', edgeAtLeft);
  console.log('Ledge At Center (X=400):', edgeAtCenter);
  console.log('Ledge Near Right (X=775):', edgeAtRight);

  if (!edgeAtLeft.atLeftLedge || edgeAtCenter.atLeftLedge || !edgeAtRight.atRightLedge) {
    throw new Error('FAIL: Ledge detection failed to correctly identify drop-off boundaries');
  }
  console.log('[PASS] Drop-off ledge proximity metrics correctly identified');

  // 2. Downward & Upward Raycasting Tests
  console.log('\n--- 2. Testing Spatial Raycasting (Downward & Upward) ---');
  // Taskbar is at elevation ~1040 (or workArea.y + height)
  // Window is at elevation 500 (higher up, smaller Y)
  // Raycast down from above window at X=300, Y=400
  const surfaceBelowUpper = sm.findSurfaceBelow(300, 400);
  console.log('Surface below (300, 400):', surfaceBelowUpper?.id, '(Elevation:', surfaceBelowUpper?.elevation, ')');
  if (surfaceBelowUpper?.id !== 'window-code-editor') {
    throw new Error(`FAIL: Expected window-code-editor below (300, 400), got ${surfaceBelowUpper?.id}`);
  }

  // Raycast down from point outside window at X=100, Y=400 (should hit taskbar below)
  const surfaceBelowOutside = sm.findSurfaceBelow(100, 400);
  console.log('Surface below (100, 400):', surfaceBelowOutside?.id, '(Elevation:', surfaceBelowOutside?.elevation, ')');
  if (surfaceBelowOutside?.id !== 'taskbar-main') {
    throw new Error(`FAIL: Expected taskbar-main below (100, 400), got ${surfaceBelowOutside?.id}`);
  }

  // Raycast up from taskbar at X=300, Y=1040
  const surfaceAboveTaskbar = sm.findSurfaceAbove(300, taskbar.elevation, 600);
  console.log('Surface above taskbar (300, taskbar.elevation):', surfaceAboveTaskbar?.id);
  if (surfaceAboveTaskbar?.id !== 'window-code-editor') {
    throw new Error(`FAIL: Expected window-code-editor above taskbar, got ${surfaceAboveTaskbar?.id}`);
  }
  console.log('[PASS] Downward and upward spatial raycasts accurately locate intersecting physical ledges');

  // 3. Reachable Surfaces & Jump Limits
  console.log('\n--- 3. Testing Reachable Surfaces & Jump Limits ---');
  // Register a third high shelf: elevation 200 (too high to reach from taskbar in a single jump, but reachable from window)
  const highShelf = new Surface({
    id: 'shelf-browser-top',
    type: 'app_shelf',
    label: 'Browser Shelf Ledge',
    bounds: { x: 300, y: 350, width: 400, height: 30 },
    walkableRange: { minX: 310, maxX: 690 },
    elevation: 350,
    isHome: false,
    defaultX: 450,
    leftBoundaryType: 'drop_off',
    rightBoundaryType: 'drop_off'
  });
  sm.registerSurface(highShelf);

  // From taskbar at X=400: window is ~540px above (too high for a single 180px jump)
  const reachableFromTaskbar = sm.getReachableSurfaces('taskbar-main', 400, { maxJumpHeight: 180, maxJumpReach: 150, maxDropHeight: 600 });
  console.log('Reachable directly from Taskbar (maxJumpHeight: 180):', reachableFromTaskbar.map(r => r.surfaceId));

  // From window at elevation 500: highShelf at 350 is deltaY = +150px (within 180px jump limit!)
  const reachableFromWindow = sm.getReachableSurfaces('window-code-editor', 400, { maxJumpHeight: 180, maxJumpReach: 150, maxDropHeight: 600 });
  console.log('Reachable from Window at elevation 500:', reachableFromWindow.map(r => ({ id: r.surfaceId, type: r.transitionType, deltaY: r.deltaY })));

  const canReachHighShelf = reachableFromWindow.some(r => r.surfaceId === 'shelf-browser-top' && r.transitionType === 'jump_up');
  const canDropToTaskbar = reachableFromWindow.some(r => r.surfaceId === 'taskbar-main' && (r.transitionType === 'drop_down' || r.transitionType === 'hop_down'));

  if (!canReachHighShelf || !canDropToTaskbar) {
    throw new Error('FAIL: Reachable surfaces failed to identify valid vertical jump and drop transitions');
  }
  console.log('[PASS] Physical reachability correctly filters by vertical and horizontal leap constraints');

  // 4. Multi-Surface Topological Pathfinding
  console.log('\n--- 4. Testing Multi-Surface Topological Pathfinding (Graph Navigation) ---');
  // Path from taskbar -> highShelf: taskbar -> window-code-editor -> shelf-browser-top
  const route = sm.findNavigationPath('window-code-editor', 400, 'shelf-browser-top', 450, { maxJumpHeight: 180, maxJumpReach: 150, maxDropHeight: 600 });
  console.log('Navigation route from Window to Shelf:', JSON.stringify(route, null, 2));

  if (!route || route.length === 0 || route[0].toSurfaceId !== 'shelf-browser-top') {
    throw new Error('FAIL: Topological pathfinding failed to resolve route');
  }
  console.log('[PASS] Topological pathfinding resolved shortest physical route across ledges');

  // 5. Renderer Integration Test (Verifying Grounding Invariance & Non-Interference)
  console.log('\n--- 5. Renderer Physical World Integration & Grounding Invariance ---');
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

  const rendererPhysicsCheck = await win.webContents.executeJavaScript(`
    (() => {
      const pw = window.PhysicsWorld;
      const sm = window.SurfaceManager;
      if (!pw || !sm) return { error: 'PhysicsWorld or SurfaceManager missing' };

      const state = pw.getPhysicalState();
      const ledge = pw.getLedgeMetrics('taskbar-main', window.WanderController.currentX);
      const surfaces = pw.getSurfaces();

      // Test raycast in renderer
      const below = pw.findSurfaceBelow(window.WanderController.currentX, 0);

      // Verify that Pico is 100% visibly grounded on the taskbar with zero elevation offset
      const stageTransform = document.getElementById('desktop-stage').style.transform;
      const rect = document.getElementById('pico-container').getBoundingClientRect();

      return {
        hasPhysicsWorld: true,
        surfaceCount: surfaces.length,
        isGrounded: state.isGrounded,
        activeSurfaceId: state.surfaceId,
        elevation: state.elevation,
        isHome: state.isHome,
        footDrift: state.footDrift,
        stageTransform,
        bottomY: rect.bottom,
        windowHeight: window.innerHeight,
        belowId: below?.id
      };
    })()
  `);

  console.log('Renderer Physics State:', JSON.stringify(rendererPhysicsCheck, null, 2));

  if (!rendererPhysicsCheck.hasPhysicsWorld || !rendererPhysicsCheck.isGrounded || rendererPhysicsCheck.activeSurfaceId !== 'taskbar-main') {
    throw new Error('FAIL: Renderer PhysicsWorld failed to report valid grounded physical state');
  }

  // Verify that visible multi-surface behavior is NOT active (Pico remains grounded on taskbar)
  const isVisiblyGrounded = rendererPhysicsCheck.isHome && rendererPhysicsCheck.footDrift === 0;
  if (!isVisiblyGrounded) {
    throw new Error('FAIL: Pico must remain visibly grounded on home taskbar');
  }
  console.log('[PASS] Pico remains strictly grounded on Home taskbar with 0.0000px drift');
  console.log('[PASS] Full physical-world foundation is active and verified without visible multi-surface interference');

  console.log('\n===============================================================');
  console.log('  ALL PHASE 3 PHYSICAL-WORLD FOUNDATION TESTS PASSED!          ');
  console.log('===============================================================');

  app.quit();
});
