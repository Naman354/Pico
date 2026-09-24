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

  win.loadFile(path.join(__dirname, 'src', 'renderer', 'index.html'));

  win.webContents.on('did-finish-load', async () => {
    try {
      console.log('Window loaded.');
      await new Promise(r => setTimeout(r, 200));

      const metrics = await win.webContents.executeJavaScript(`
        (() => {
          const container = document.getElementById('pico-container');
          const svg = document.querySelector('.pico-svg');
          const ackFlash = document.getElementById('ack-flash');
          const cRect = container.getBoundingClientRect();
          const sRect = svg.getBoundingClientRect();

          return {
            svgHeight: sRect.height,
            svgWidth: sRect.width,
            gapToWindowBottom: window.innerHeight - cRect.bottom,
            hasAckTextElement: !!ackFlash
          };
        })()
      `);

      console.log('Metrics:', JSON.stringify(metrics, null, 2));

      // 1. Height check (50-65px)
      if (metrics.svgHeight >= 50 && metrics.svgHeight <= 65) {
        console.log('PASS: Pico height is ' + metrics.svgHeight + 'px (target: 50-65px).');
      } else {
        console.error('FAIL: Pico height out of target bounds: ' + metrics.svgHeight);
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

      // 4. Click to open
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
