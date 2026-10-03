const { app, BrowserWindow, screen, ipcMain } = require('electron');
const path = require('path');
const fs = require('fs');
const { Surface, SurfaceManager, TaskbarWorldSurface } = require('./surfaces.js');

app.commandLine.appendSwitch('enable-transparent-visuals');

app.whenReady().then(async () => {
  console.log('===============================================================');
  console.log('  PHASE 3 — STEP 1: LEDGE AWARENESS & MICRO-REACTIONS TEST     ');
  console.log('===============================================================');

  const sm = new SurfaceManager();
  const taskbar = sm.initPrimaryDisplaySurfaces();

  // 1. Register test surfaces
  const testShelf = new Surface({
    id: 'shelf-editor',
    type: 'app_shelf',
    label: 'Code Editor Top Ledge',
    bounds: { x: 200, y: 500, width: 500, height: 35 },
    walkableRange: { minX: 200, maxX: 700 },
    elevation: 500,
    isHome: false,
    defaultX: 450,
    leftBoundaryType: 'drop_off',
    rightBoundaryType: 'drop_off'
  });
  sm.registerSurface(testShelf);

  const upperShelf = new Surface({
    id: 'shelf-upper',
    type: 'app_shelf',
    label: 'Browser Top Ledge',
    bounds: { x: 200, y: 380, width: 300, height: 30 },
    walkableRange: { minX: 200, maxX: 500 },
    elevation: 380, // deltaY = +120px from shelf-editor (within 180px jump limit!)
    isHome: false,
    defaultX: 350,
    leftBoundaryType: 'drop_off',
    rightBoundaryType: 'drop_off'
  });
  sm.registerSurface(upperShelf);

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

  // --- Test Case 1: Surface Endpoint / Drop-Off ---
  console.log('\n--- 1. Testing Surface Endpoint / Drop-Off Awareness ---');
  const dropOffEval = await win.webContents.executeJavaScript(`
    (() => {
      // Right edge of shelf-editor (minX: 200, maxX: 700) at X=695 has no surface nearby and drops off
      const assessment = window.LedgeAwareness.assessEdge('shelf-editor', 695);
      return assessment;
    })()
  `);

  console.log('Drop-Off Edge Assessment:', dropOffEval);
  if (!dropOffEval.atEdge || dropOffEval.edgeType !== 'drop_off' || dropOffEval.side !== 'right') {
    throw new Error('FAIL: LedgeAwareness failed to identify drop-off edge');
  }
  console.log('[PASS] Drop-off edge correctly identified');

  // Apply drop-off micro-reaction posture
  console.log('Applying Drop-Off Micro-Reaction Posture...');
  await win.webContents.executeJavaScript(`
    window.LedgeAwareness.applyReaction({
      atEdge: true,
      edgeType: 'drop_off',
      side: 'right',
      distance: 5
    });
  `);
  await new Promise(r => setTimeout(r, 50));

  const dropOffReactionState = await win.webContents.executeJavaScript(`
    (() => {
      const fig = document.getElementById('pico-figure');
      const eyesDown = document.getElementById('pico-eyes-down');
      const eyesDownOpacity = window.getComputedStyle(eyesDown).opacity;
      const rect = document.getElementById('pico-container').getBoundingClientRect();
      return {
        hasGazeDown: fig.classList.contains('gaze-down'),
        hasHeadDown: fig.classList.contains('head-down'),
        hasLedgePeering: fig.classList.contains('ledge-peering'),
        hasLedgeLeanRight: fig.classList.contains('ledge-lean-right'),
        eyesDownOpacity,
        bottomY: rect.bottom,
        windowHeight: window.innerHeight
      };
    })()
  `);

  console.log('Drop-Off Reaction State:', dropOffReactionState);
  if (!dropOffReactionState.hasGazeDown || !dropOffReactionState.hasLedgePeering || !dropOffReactionState.hasLedgeLeanRight) {
    throw new Error('FAIL: Drop-off micro-reaction did not apply downward glance and ledge lean');
  }
  console.log('[PASS] Subtle downward glance (eyes-down) and ledge lean active');

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

  // Capture showcase image of drop-off reaction
  const rectDropOff = await getCharRect();
  const imageDropOff = await win.webContents.capturePage(rectDropOff);
  fs.writeFileSync(path.join(__dirname, 'pico-ledge-reaction-drop-off.png'), imageDropOff.toPNG());
  console.log('[SAVED] pico-ledge-reaction-drop-off.png');

  await win.webContents.executeJavaScript(`window.LedgeAwareness.clearReactionClasses();`);
  await new Promise(r => setTimeout(r, 100));

  // --- Test Case 2: Screen Edge Awareness ---
  console.log('\n--- 2. Testing Screen Edge Awareness ---');
  const screenEdgeEval = await win.webContents.executeJavaScript(`
    (() => {
      const maxX = window.WanderController.maxX;
      const assessment = window.LedgeAwareness.assessEdge('taskbar-main', maxX);
      return assessment;
    })()
  `);

  console.log('Screen Edge Assessment:', screenEdgeEval);
  if (!screenEdgeEval.atEdge || screenEdgeEval.edgeType !== 'screen_edge') {
    throw new Error('FAIL: LedgeAwareness failed to classify screen border edge');
  }
  console.log('[PASS] Screen border edge correctly classified as screen_edge (distinct from drop_off)');

  // Apply screen edge micro-reaction
  await win.webContents.executeJavaScript(`
    window.LedgeAwareness.applyReaction({
      atEdge: true,
      edgeType: 'screen_edge',
      side: 'right',
      distance: 0
    });
  `);
  await new Promise(r => setTimeout(r, 50));

  const screenEdgeReactionState = await win.webContents.executeJavaScript(`
    (() => {
      const fig = document.getElementById('pico-figure');
      const eyesRight = document.getElementById('pico-eyes-right');
      const eyesRightOpacity = window.getComputedStyle(eyesRight).opacity;
      return {
        hasGazeRight: fig.classList.contains('gaze-right'),
        hasScreenEdgePeekingRight: fig.classList.contains('screen-edge-peeking-right'),
        isNotPeeringDown: !fig.classList.contains('gaze-down'),
        eyesRightOpacity
      };
    })()
  `);

  console.log('Screen Edge Reaction State:', screenEdgeReactionState);
  if (!screenEdgeReactionState.hasGazeRight || !screenEdgeReactionState.isNotPeeringDown) {
    throw new Error('FAIL: Screen edge reaction incorrectly applied downward gaze instead of outward gaze');
  }
  console.log('[PASS] Screen edge reaction looks outward beyond the border without peering down');

  const rectScreenEdge = await getCharRect();
  const imageScreenEdge = await win.webContents.capturePage(rectScreenEdge);
  fs.writeFileSync(path.join(__dirname, 'pico-ledge-reaction-screen-edge.png'), imageScreenEdge.toPNG());
  console.log('[SAVED] pico-ledge-reaction-screen-edge.png');

  await win.webContents.executeJavaScript(`window.LedgeAwareness.clearReactionClasses();`);
  await new Promise(r => setTimeout(r, 100));

  // --- Test Case 3: Potential Connected Surface Below / Above ---
  console.log('\n--- 3. Testing Potential Connected Surface (Traversal Point) ---');
  const traversalEval = await win.webContents.executeJavaScript(`
    (() => {
      // From shelf-editor at X=210, upperShelf is at X in [200, 500] directly overhead (deltaY = +120px)
      const assessment = window.LedgeAwareness.assessEdge('shelf-editor', 210);
      return assessment;
    })()
  `);

  console.log('Potential Traversal Assessment:', traversalEval);
  if (!traversalEval.atEdge || traversalEval.edgeType !== 'potential_traversal' || !traversalEval.isPossibleTraversalPoint) {
    throw new Error('FAIL: LedgeAwareness failed to recognize potential connected surface');
  }
  console.log('[PASS] Connected surface correctly recognized as viable traversal point');

  // Apply traversal scoping reaction
  await win.webContents.executeJavaScript(`
    window.LedgeAwareness.applyReaction(${JSON.stringify(traversalEval)});
  `);
  await new Promise(r => setTimeout(r, 50));

  const traversalReactionState = await win.webContents.executeJavaScript(`
    (() => {
      const fig = document.getElementById('pico-figure');
      return {
        hasTraversalScopingUp: fig.classList.contains('traversal-scoping-up'),
        hasTraversalScopingDown: fig.classList.contains('traversal-scoping-down'),
        isReacting: window.LedgeAwareness.isReacting
      };
    })()
  `);

  console.log('Traversal Reaction State:', traversalReactionState);
  if (!traversalReactionState.hasTraversalScopingUp && !traversalReactionState.hasTraversalScopingDown) {
    throw new Error('FAIL: Traversal scoping posture not active');
  }
  console.log('[PASS] Inquisitive traversal scoping posture successfully verified');

  const rectTraversal = await getCharRect();
  const imageTraversal = await win.webContents.capturePage(rectTraversal);
  fs.writeFileSync(path.join(__dirname, 'pico-ledge-reaction-traversal.png'), imageTraversal.toPNG());
  console.log('[SAVED] pico-ledge-reaction-traversal.png');

  await win.webContents.executeJavaScript(`window.LedgeAwareness.clearReactionClasses();`);
  await new Promise(r => setTimeout(r, 100));

  // --- Test Case 4: Zero Foot Drift & Grounding Invariance ---
  console.log('\n--- 4. Testing Grounding & Foot Drift Invariance ---');
  const groundingCheck = await win.webContents.executeJavaScript(`
    (() => {
      const state = window.PhysicsWorld.getPhysicalState();
      const rect = document.getElementById('pico-container').getBoundingClientRect();
      return {
        isGrounded: state.isGrounded,
        footDrift: state.footDrift,
        activeSurfaceId: state.surfaceId,
        bottomY: rect.bottom,
        windowHeight: window.innerHeight
      };
    })()
  `);

  console.log('Grounding State:', groundingCheck);
  if (!groundingCheck.isGrounded || groundingCheck.footDrift !== 0) {
    throw new Error('FAIL: Foot drift detected or character ungrounded');
  }
  console.log('[PASS] Pico remains 100% grounded with strictly 0.0000px foot drift');

  console.log('\n===============================================================');
  console.log('  PHASE 3 — STEP 1 VERIFICATION COMPLETED SUCCESSFULLY!        ');
  console.log('===============================================================');

  app.quit();
});
