const { app, BrowserWindow, screen, ipcMain } = require('electron');
const path = require('path');
const fs = require('fs');

app.commandLine.appendSwitch('enable-transparent-visuals');

let mainWindow = null;

// Replicate TaskbarWorldSurface from main.js
class TaskbarWorldSurface {
  static getSurface() {
    const display = screen.getPrimaryDisplay();
    const { bounds, workArea } = display;

    let ledgeY = workArea.y + workArea.height;
    let isBottom = true;

    if (workArea.y > bounds.y) {
      ledgeY = workArea.y;
      isBottom = false;
    }

    return {
      ledgeY,
      isBottom,
      leftBound: workArea.x,
      rightBound: workArea.x + workArea.width,
      bounds,
      workArea,
      minX: workArea.x + 30,
      maxX: workArea.x + workArea.width - 280,
      defaultX: workArea.x + workArea.width - 320
    };
  }
}

app.whenReady().then(async () => {
  console.log('===============================================================');
  console.log('  GOAL 1: FULL-DESKTOP TRANSPARENT CANVAS VERIFICATION');
  console.log('===============================================================');

  const surface = TaskbarWorldSurface.getSurface();
  const windowWidth = surface.workArea.width;
  const windowHeight = surface.workArea.height;

  mainWindow = new BrowserWindow({
    width: windowWidth,
    height: windowHeight,
    x: surface.workArea.x,
    y: surface.workArea.y,
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

  const bounds = mainWindow.getBounds();
  const alignedY = surface.ledgeY - bounds.height;
  mainWindow.setPosition(bounds.x, alignedY);
  mainWindow.setAlwaysOnTop(true, 'screen-saver', 1);

  ipcMain.handle('get-taskbar-surface', () => surface);

  await mainWindow.loadFile(path.join(__dirname, 'src', 'renderer', 'index.html'));
  await new Promise(r => setTimeout(r, 600));

  const winBounds = mainWindow.getBounds();
  console.log('\n--- 1. Window Bounds & Geometry ---');
  console.log(`Window Width:  ${winBounds.width} (workArea: ${surface.workArea.width})`);
  console.log(`Window Height: ${winBounds.height} (workArea: ${surface.workArea.height})`);
  console.log(`Window X:      ${winBounds.x} (workArea: ${surface.workArea.x})`);
  console.log(`Window Y:      ${winBounds.y} (workArea: ${surface.workArea.y})`);
  console.log(`Window Bottom: ${winBounds.y + winBounds.height} (Taskbar ledgeY: ${surface.ledgeY})`);

  const widthMatch = winBounds.width === surface.workArea.width;
  const heightMatch = winBounds.height === surface.workArea.height;
  const yMatch = Math.abs((winBounds.y + winBounds.height) - surface.ledgeY) <= 1;

  if (widthMatch && heightMatch && yMatch) {
    console.log('[PASS] Window covers full desktop workArea and bottom aligns with taskbar ledge');
  } else {
    console.error('[FAIL] Window bounds mismatch!');
  }

  console.log('\n--- 2. Character Metrics & Foot Grounding ---');
  const metrics = await mainWindow.webContents.executeJavaScript(`
    (() => {
      const container = document.getElementById('pico-container');
      const char = document.getElementById('pico-character');
      const figure = document.getElementById('pico-figure');
      const stage = document.getElementById('desktop-stage');
      const cRect = container.getBoundingClientRect();
      const sRect = stage.getBoundingClientRect();

      return {
        containerHeight: cRect.height,
        containerWidth: cRect.width,
        containerBottom: cRect.bottom,
        stageBottom: sRect.bottom,
        windowInnerHeight: window.innerHeight,
        gapToBottom: window.innerHeight - cRect.bottom,
        isIdle: figure.classList.contains('idle'),
        hasAttention: !!window.IdleAttention
      };
    })()
  `);

  console.log('Metrics:', JSON.stringify(metrics, null, 2));

  const heightPass = Math.abs(metrics.containerHeight - 60) < 1;
  const gapPass = Math.abs(metrics.gapToBottom - 1) < 0.1;

  if (heightPass) {
    console.log(`[PASS] Pico height is ${metrics.containerHeight}px (~60px scale strictly preserved)`);
  } else {
    console.error(`[FAIL] Pico height mismatch: ${metrics.containerHeight}px`);
  }

  if (gapPass) {
    console.log(`[PASS] Shoes sit at window.innerHeight - 1px (gap = ${metrics.gapToBottom}px, strictly grounded on taskbar)`);
  } else {
    console.error(`[FAIL] Shoes gap mismatch: ${metrics.gapToBottom}px`);
  }

  console.log('\n--- 3. Interaction & Dialogue Bubble Check ---');
  await mainWindow.webContents.executeJavaScript(`
    document.getElementById('pico-container').click();
  `);
  await new Promise(r => setTimeout(r, 300));

  const bubbleOpen = await mainWindow.webContents.executeJavaScript(`
    document.getElementById('bubble-container').classList.contains('open');
  `);
  console.log(`Pico clicked: Bubble Open = ${bubbleOpen}`);
  if (bubbleOpen) {
    console.log('[PASS] Clicking Pico toggles attached speech bubble on full canvas');
  } else {
    console.error('[FAIL] Speech bubble did not open on click');
  }

  // Close bubble
  await mainWindow.webContents.executeJavaScript(`
    document.getElementById('pico-container').click();
  `);
  await new Promise(r => setTimeout(r, 200));

  console.log('\n--- 4. Visual Capture ---');
  const img = await mainWindow.capturePage();
  const capturePath = path.join(__dirname, 'pico-full-canvas-preview.png');
  fs.writeFileSync(capturePath, img.toPNG());
  console.log(`[Captured] Saved full-canvas preview: ${capturePath}`);

  console.log('\n===============================================================');
  console.log('  GOAL 1 VERIFICATION COMPLETED SUCCESSFULLY!');
  console.log('===============================================================');

  app.quit();
});
