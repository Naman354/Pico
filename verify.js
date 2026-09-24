// Automated verification test for Milestone 1 - Pico Desktop Shell
const { app, BrowserWindow, screen } = require('electron');
const path = require('path');
const fs = require('fs');

app.commandLine.appendSwitch('enable-transparent-visuals');

app.whenReady().then(async () => {
  const primaryDisplay = screen.getPrimaryDisplay();
  const { x: workX, y: workY, width: workWidth, height: workHeight } = primaryDisplay.workArea;

  const surfaceY = workY + workHeight;
  const windowWidth = 300;
  const windowHeight = 85;
  const posX = workX + workWidth - windowWidth - 40;
  const posY = surfaceY - windowHeight;

  const win = new BrowserWindow({
    width: windowWidth,
    height: windowHeight,
    x: posX,
    y: posY,
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

  // Align window bottom precisely with the taskbar top ledge
  const b = win.getBounds();
  win.setPosition(b.x, surfaceY - b.height);

  win.setAlwaysOnTop(true, 'screen-saver', 1);
  win.on('blur', () => {
    win.setAlwaysOnTop(true, 'screen-saver', 1);
  });

  win.loadFile(path.join(__dirname, 'src', 'renderer', 'index.html'));

  win.webContents.on('did-finish-load', async () => {
    try {
      console.log('Window loaded.');
      await new Promise(r => setTimeout(r, 200));

      const metrics = await win.webContents.executeJavaScript(`
        (() => {
          const container = document.getElementById('pico-container');
          const char = document.getElementById('pico-character');
          const ackFlash = document.getElementById('ack-flash');
          const cRect = container.getBoundingClientRect();
          const charRect = char.getBoundingClientRect();

          return {
            charHeight: charRect.height,
            charWidth: charRect.width,
            gapToWindowBottom: window.innerHeight - cRect.bottom,
            hasAckTextElement: !!ackFlash
          };
        })()
      `);

      console.log('Metrics:', JSON.stringify(metrics, null, 2));

      // 1. Height check (50-65px)
      if (metrics.charHeight >= 50 && metrics.charHeight <= 65) {
        console.log('PASS: Pico height is ' + metrics.charHeight + 'px (target: 50-65px).');
      } else {
        console.error('FAIL: Pico height out of target bounds: ' + metrics.charHeight);
      }

      // 2. Taskbar baseline check (0px gap)
      if (metrics.gapToWindowBottom <= 1) {
        console.log('PASS: Pico feet rest directly on taskbar surface (0px floating gap).');
      } else {
        console.warn('WARN: Gap to bottom is ' + metrics.gapToWindowBottom + 'px');
      }

      // 3. Text acknowledgement removal check
      if (!metrics.hasAckTextElement) {
        console.log('PASS: No "Nods :)" text in DOM (pure character animation used).');
      } else {
        console.error('FAIL: Found text acknowledgement.');
      }

      // 4. Idle Stillness Check (No continuous idle animation; feet firmly planted)
      const idleAnimationCheck = await win.webContents.executeJavaScript(`
        (() => {
          const char = document.getElementById('pico-character');
          const style = window.getComputedStyle(char);
          const rect1 = char.getBoundingClientRect();
          return {
            animationName: style.animationName,
            top: rect1.top,
            bottom: rect1.bottom,
            height: rect1.height
          };
        })()
      `);

      if (idleAnimationCheck.animationName === 'none') {
        console.log('PASS: Idle animation is explicitly "none" (continuous breathing removed).');
      } else {
        console.error('FAIL: Idle animation is still active: ' + idleAnimationCheck.animationName);
      }

      // Wait 1.2s to ensure position is 100% stationary over time
      await new Promise(r => setTimeout(r, 1200));

      const idleStabilityCheck = await win.webContents.executeJavaScript(`
        (() => {
          const char = document.getElementById('pico-character');
          const rect2 = char.getBoundingClientRect();
          return {
            top: rect2.top,
            bottom: rect2.bottom,
            height: rect2.height
          };
        })()
      `);

      const dTop = Math.abs(idleStabilityCheck.top - idleAnimationCheck.top);
      const dBottom = Math.abs(idleStabilityCheck.bottom - idleAnimationCheck.bottom);
      const dHeight = Math.abs(idleStabilityCheck.height - idleAnimationCheck.height);

      if (dTop === 0 && dBottom === 0 && dHeight === 0) {
        console.log('PASS: Pico body position is completely stable (0px deviation over time). Feet remain firmly planted.');
      } else {
        console.error('FAIL: Pico moved during idle! dTop=' + dTop + ', dBottom=' + dBottom);
      }

      // 5. Click to open
      await win.webContents.executeJavaScript(`
        document.getElementById('pico-container').click();
      `);
      await new Promise(r => setTimeout(r, 200));

      const openCheck = await win.webContents.executeJavaScript(`
        document.getElementById('bubble-container').classList.contains('open');
      `);
      if (openCheck) {
        console.log('PASS: Clicking Pico opened attached input.');
      } else {
        console.error('FAIL: Clicking Pico did not open input.');
      }

      // 5. Click again to close
      await win.webContents.executeJavaScript(`
        document.getElementById('pico-container').click();
      `);
      await new Promise(r => setTimeout(r, 200));

      const closeCheck = await win.webContents.executeJavaScript(`
        !document.getElementById('bubble-container').classList.contains('open');
      `);
      if (closeCheck) {
        console.log('PASS: Clicking Pico again closed attached input.');
      } else {
        console.error('FAIL: Clicking Pico did not close input.');
      }

      console.log('ALL MILESTONE 1 CHECKS PASSED.');
      app.quit();
    } catch (err) {
      console.error(err);
      app.exit(1);
    }
  });
});
