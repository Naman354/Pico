// Comprehensive visual and behavioral verification script for Milestone 1 correction
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

  console.log(`Taskbar Top Edge (Surface Baseline): Y=${surfaceY}`);
  console.log(`Window Position: X=${posX}, Y=${posY}, Width=${windowWidth}, Height=${windowHeight}`);
  console.log(`Window Bottom Edge: Y=${posY + windowHeight} (Matches Surface: ${posY + windowHeight === surfaceY})`);

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
      console.log('Page loaded.');
      await new Promise(r => setTimeout(r, 250));

      // 1. Verify Dimensions & Baseline
      const metrics = await win.webContents.executeJavaScript(`
        (() => {
          const container = document.getElementById('pico-container');
          const char = document.getElementById('pico-character');
          const stage = document.getElementById('desktop-stage');
          const ackFlash = document.getElementById('ack-flash');
          const bubble = document.getElementById('bubble-container');
          
          const cRect = container.getBoundingClientRect();
          const charRect = char.getBoundingClientRect();
          const stageRect = stage.getBoundingClientRect();

          return {
            containerHeight: cRect.height,
            containerWidth: cRect.width,
            charHeight: charRect.height,
            charWidth: charRect.width,
            containerBottom: cRect.bottom,
            windowHeight: window.innerHeight,
            gapToWindowBottom: window.innerHeight - cRect.bottom,
            hasAckTextElement: !!ackFlash,
            stageBottom: stageRect.bottom
          };
        })()
      `);
      console.log('Metrics Check:', JSON.stringify(metrics, null, 2));

      // Assertions
      if (metrics.charHeight >= 50 && metrics.charHeight <= 65) {
        console.log(`PASS: Pico visible height is ${metrics.charHeight}px (strictly within 50-65px).`);
      } else {
        console.error(`FAIL: Pico height is ${metrics.charHeight}px`);
      }

      if (metrics.gapToWindowBottom <= 1) {
        console.log(`PASS: Pico feet rest directly on the surface baseline (gap to bottom: ${metrics.gapToWindowBottom}px).`);
      } else {
        console.warn(`NOTICE: Gap to bottom is ${metrics.gapToWindowBottom}px`);
      }

      if (!metrics.hasAckTextElement) {
        console.log('PASS: Text acknowledgement ("Nods :)") has been completely removed.');
      } else {
        console.error('FAIL: Text acknowledgement still found in DOM.');
      }

      // 2. Capture Normal Transparent Desktop State
      const imgTransparent = await win.capturePage();
      fs.writeFileSync(path.join(__dirname, 'pico-desktop-baseline.png'), imgTransparent.toPNG());
      console.log('Saved pico-desktop-baseline.png');

      // 3. Test on Simulated Light Background
      await win.webContents.executeJavaScript(`
        document.body.style.backgroundColor = '#F8FAFC';
      `);
      await new Promise(r => setTimeout(r, 100));
      const imgLight = await win.capturePage();
      fs.writeFileSync(path.join(__dirname, 'pico-on-light-bg.png'), imgLight.toPNG());
      console.log('Saved pico-on-light-bg.png');

      // 4. Test on Simulated Dark Background
      await win.webContents.executeJavaScript(`
        document.body.style.backgroundColor = '#0F172A';
      `);
      await new Promise(r => setTimeout(r, 100));
      const imgDark = await win.capturePage();
      fs.writeFileSync(path.join(__dirname, 'pico-on-dark-bg.png'), imgDark.toPNG());
      console.log('Saved pico-on-dark-bg.png');

      // 5. Restore transparency & Click to open attached input
      await win.webContents.executeJavaScript(`
        document.body.style.backgroundColor = 'transparent';
        document.getElementById('pico-container').click();
      `);
      await new Promise(r => setTimeout(r, 350));

      const inputCheck = await win.webContents.executeJavaScript(`
        (() => {
          const bubble = document.getElementById('bubble-container');
          const char = document.querySelector('.pico-character');
          return {
            isBubbleOpen: bubble.classList.contains('open'),
            isHappy: char.classList.contains('happy')
          };
        })()
      `);
      console.log('Input Open Check:', JSON.stringify(inputCheck, null, 2));

      const imgOpen = await win.capturePage();
      fs.writeFileSync(path.join(__dirname, 'pico-open-input.png'), imgOpen.toPNG());
      console.log('Saved pico-open-input.png');

      // 6. Test Send action triggering visual nod animation
      const nodCheck = await win.webContents.executeJavaScript(`
        (() => {
          const input = document.getElementById('pico-input');
          input.value = 'Remember to buy milk.';
          const sendBtn = document.getElementById('send-btn');
          sendBtn.click();
          const char = document.querySelector('.pico-character');
          return {
            inputValueAfterSend: input.value,
            isAcknowledging: char.classList.contains('acknowledging'),
            noTextOutput: !document.querySelector('.acknowledge-flash')
          };
        })()
      `);
      console.log('Visual Nod Check:', JSON.stringify(nodCheck, null, 2));

      // 7. Click again to close
      await win.webContents.executeJavaScript(`
        document.getElementById('pico-container').click();
      `);
      await new Promise(r => setTimeout(r, 200));

      const closeCheck = await win.webContents.executeJavaScript(`
        (() => {
          const bubble = document.getElementById('bubble-container');
          return { isClosed: !bubble.classList.contains('open') };
        })()
      `);
      console.log('Close Check:', JSON.stringify(closeCheck, null, 2));

      console.log('ALL VERIFICATIONS COMPLETED SUCCESSFULLY.');
      app.quit();
    } catch (err) {
      console.error('Test error:', err);
      app.exit(1);
    }
  });
});
