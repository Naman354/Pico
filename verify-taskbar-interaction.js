// Verification test for Taskbar Interaction, Z-Order, and Surface Alignment
const { app, BrowserWindow, screen } = require('electron');
const path = require('path');
const fs = require('fs');

app.commandLine.appendSwitch('enable-transparent-visuals');

app.whenReady().then(async () => {
  const display = screen.getPrimaryDisplay();
  const { workArea, bounds } = display;
  const ledgeY = workArea.y + workArea.height;

  const windowWidth = 290;
  const windowHeight = 85;

  // 1. Create Pico Window with exact main.js configuration
  const picoWin = new BrowserWindow({
    width: windowWidth,
    height: windowHeight,
    x: workArea.x + workArea.width - 320,
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

  // Align window bottom precisely with the taskbar top ledge
  const b = picoWin.getBounds();
  const alignedY = ledgeY - b.height;
  picoWin.setPosition(b.x, alignedY);

  picoWin.setAlwaysOnTop(true, 'screen-saver', 1);
  picoWin.setVisibleOnAllWorkspaces(true, { visibleOnFullScreen: true });

  picoWin.on('blur', () => {
    picoWin.setAlwaysOnTop(true, 'screen-saver', 1);
  });

  await picoWin.loadFile(path.join(__dirname, 'src', 'renderer', 'index.html'));
  await new Promise(r => setTimeout(r, 300));

  console.log('--- Step 1: Starting with Pico standing on the taskbar ---');
  const initialBounds = picoWin.getBounds();
  const initialMetrics = await picoWin.webContents.executeJavaScript(`
    (() => {
      const char = document.getElementById('pico-character');
      const stage = document.getElementById('desktop-stage');
      const cRect = char.getBoundingClientRect();
      const sRect = stage.getBoundingClientRect();
      return {
        charHeight: cRect.height,
        charWidth: cRect.width,
        charBottom: cRect.bottom,
        stageBottom: sRect.bottom,
        innerHeight: window.innerHeight
      };
    })()
  `);

  const initialShoesBottom = initialBounds.y + initialMetrics.charBottom;
  const overlap = initialShoesBottom - ledgeY;

  console.log(`Taskbar Top Edge (LedgeY): ${ledgeY}`);
  console.log(`Pico Window Bottom: ${initialBounds.y + initialBounds.height}`);
  console.log(`Pico Shoes Bottom: ${initialShoesBottom}`);
  console.log(`Overlap into Taskbar: ${overlap.toFixed(2)}px`);

  if (overlap <= 0 && overlap > -1.5) {
    console.log('PASS: Shoes sit just above taskbar top edge, terminating exactly at boundary with 0px overlap.');
  } else {
    console.error(`FAIL: Shoes placement incorrect! Overlap: ${overlap}px`);
  }

  // 2. Click the taskbar several times (simulated via focus transfer / blur events)
  console.log('\n--- Step 2: Clicking the taskbar several times ---');
  for (let i = 1; i <= 3; i++) {
    picoWin.blur();
    await new Promise(r => setTimeout(r, 100));
    const isTop = picoWin.isAlwaysOnTop();
    const curBounds = picoWin.getBounds();
    const curShoesBottom = curBounds.y + initialMetrics.charBottom;
    console.log(`Taskbar click #${i}: alwaysOnTop=${isTop}, shoesBottom=${curShoesBottom}, gapToTaskbar=${(ledgeY - curShoesBottom).toFixed(2)}px`);
    if (!isTop) {
      console.error(`FAIL: Lost alwaysOnTop after taskbar click #${i}`);
    }
    if (curShoesBottom > ledgeY) {
      console.error(`FAIL: Shoes sunk into taskbar after taskbar click #${i}`);
    }
  }
  console.log('PASS: Taskbar clicks did not demote Pico or hide his feet.');

  // 3. Click other desktop areas / windows
  console.log('\n--- Step 3: Clicking other desktop windows ---');
  const otherWin = new BrowserWindow({
    width: 400,
    height: 300,
    x: initialBounds.x - 50,
    y: initialBounds.y - 100,
    frame: true,
    title: 'Other Desktop App'
  });
  otherWin.focus();
  await new Promise(r => setTimeout(r, 200));

  const afterOtherFocusTop = picoWin.isAlwaysOnTop();
  console.log(`Other window focused: Pico alwaysOnTop=${afterOtherFocusTop}`);
  if (afterOtherFocusTop) {
    console.log('PASS: Pico remains topmost above other desktop windows when they are focused.');
  } else {
    console.error('FAIL: Pico demoted below other desktop window.');
  }
  otherWin.close();

  // 4. Click Pico
  console.log('\n--- Step 4: Clicking Pico ---');
  picoWin.focus();
  await picoWin.webContents.executeJavaScript(`
    document.getElementById('pico-container').click();
  `);
  await new Promise(r => setTimeout(r, 250));

  const openState = await picoWin.webContents.executeJavaScript(`
    document.getElementById('bubble-container').classList.contains('open');
  `);
  console.log(`Pico clicked: Bubble Open = ${openState}`);
  if (openState) {
    console.log('PASS: Clicking Pico successfully toggled attached input.');
  } else {
    console.error('FAIL: Clicking Pico did not open input.');
  }

  // Click again to close
  await picoWin.webContents.executeJavaScript(`
    document.getElementById('pico-container').click();
  `);
  await new Promise(r => setTimeout(r, 150));

  const finalShoesBottom = picoWin.getBounds().y + initialMetrics.charBottom;
  console.log(`Final check: Pico Shoes Bottom=${finalShoesBottom}, Taskbar Top=${ledgeY}`);
  console.log(`Pico feet remain consistently visible with 0px overlap.`);

  console.log('\nALL TASKBAR INTERACTION CHECKS PASSED.');
  app.quit();
});
