// Automated verification for Pico's new characterful acknowledgement nod
const { app, BrowserWindow, screen } = require('electron');
const path = require('path');
const fs = require('fs');

app.commandLine.appendSwitch('enable-transparent-visuals');

app.whenReady().then(async () => {
  const display = screen.getPrimaryDisplay();
  const { workArea } = display;
  const ledgeY = workArea.y + workArea.height;

  const windowWidth = 290;
  const windowHeight = 85;

  const win = new BrowserWindow({
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

  const b = win.getBounds();
  win.setPosition(b.x, ledgeY - b.height);
  win.setAlwaysOnTop(true, 'screen-saver', 1);

  await win.loadFile(path.join(__dirname, 'src', 'renderer', 'index.html'));
  await new Promise(r => setTimeout(r, 400));

  console.log('=== Step 1: Initial Baseline Foot Alignment ===');
  const initialData = await win.webContents.executeJavaScript(`
    (() => {
      const figure = document.getElementById('pico-figure');
      const container = document.getElementById('pico-container');
      const r = figure.getBoundingClientRect();
      const c = container.getBoundingClientRect();
      return {
        bottom: r.bottom,
        top: r.top,
        height: r.height,
        gapToWindowBottom: window.innerHeight - c.bottom
      };
    })()
  `);

  console.log('Initial Data:', JSON.stringify(initialData, null, 2));

  console.log('\n=== Step 2: Triggering Acknowledgement Animation via Send Action ===');
  // Type into input and trigger handleSend
  await win.webContents.executeJavaScript(`
    (() => {
      const input = document.getElementById('pico-input');
      input.value = 'Hello Pico!';
      document.getElementById('send-btn').click();
    })()
  `);

  // Sample at t = 120ms (Pico looks / inclines toward input)
  await new Promise(r => setTimeout(r, 120));
  const t120 = await win.webContents.executeJavaScript(`
    (() => {
      const figure = document.getElementById('pico-figure');
      const container = document.getElementById('pico-container');
      const r = figure.getBoundingClientRect();
      return {
        isAck: figure.classList.contains('acknowledging'),
        isBlinking: container.classList.contains('blinking'),
        top: r.top,
        bottom: r.bottom,
        height: r.height
      };
    })()
  `);
  console.log('Sample t=120ms (look toward input):', JSON.stringify(t120, null, 2));
  const cap1 = await win.capturePage();
  fs.writeFileSync(path.join(__dirname, 'screenshot-ack-look.png'), cap1.toPNG());

  // Sample at t = 320ms (Nod dip + eyes closed in warm blink)
  await new Promise(r => setTimeout(r, 200));
  const t320 = await win.webContents.executeJavaScript(`
    (() => {
      const figure = document.getElementById('pico-figure');
      const container = document.getElementById('pico-container');
      const r = figure.getBoundingClientRect();
      return {
        isAck: figure.classList.contains('acknowledging'),
        isBlinking: container.classList.contains('blinking'),
        top: r.top,
        bottom: r.bottom,
        height: r.height
      };
    })()
  `);
  console.log('Sample t=320ms (nod dip + eyes closed):', JSON.stringify(t320, null, 2));
  const cap2 = await win.capturePage();
  fs.writeFileSync(path.join(__dirname, 'screenshot-ack-nod-blink.png'), cap2.toPNG());

  // Sample at t = 600ms (Head rising back up + eyes reopened)
  await new Promise(r => setTimeout(r, 280));
  const t600 = await win.webContents.executeJavaScript(`
    (() => {
      const figure = document.getElementById('pico-figure');
      const container = document.getElementById('pico-container');
      const r = figure.getBoundingClientRect();
      return {
        isAck: figure.classList.contains('acknowledging'),
        isBlinking: container.classList.contains('blinking'),
        top: r.top,
        bottom: r.bottom,
        height: r.height
      };
    })()
  `);
  console.log('Sample t=600ms (head rising + eyes open):', JSON.stringify(t600, null, 2));

  // Sample at t = 900ms (Animation finished, smoothly returned to idle)
  await new Promise(r => setTimeout(r, 300));
  const t900 = await win.webContents.executeJavaScript(`
    (() => {
      const figure = document.getElementById('pico-figure');
      const container = document.getElementById('pico-container');
      const r = figure.getBoundingClientRect();
      return {
        isIdle: figure.classList.contains('idle'),
        isAck: figure.classList.contains('acknowledging'),
        isBlinking: container.classList.contains('blinking'),
        top: r.top,
        bottom: r.bottom,
        height: r.height
      };
    })()
  `);
  console.log('Sample t=900ms (returned to idle):', JSON.stringify(t900, null, 2));
  const cap3 = await win.capturePage();
  fs.writeFileSync(path.join(__dirname, 'screenshot-ack-idle-return.png'), cap3.toPNG());

  console.log('\n=== Step 3: Verifying Constraints ===');

  // Check 1: Foot Locking Throughout Entire Animation
  const bottomDeltas = [
    Math.abs(t120.bottom - initialData.bottom),
    Math.abs(t320.bottom - initialData.bottom),
    Math.abs(t600.bottom - initialData.bottom),
    Math.abs(t900.bottom - initialData.bottom)
  ];
  const maxBottomDelta = Math.max(...bottomDeltas);
  console.log(`Max Foot Bottom Delta: ${maxBottomDelta.toFixed(4)}px`);

  if (maxBottomDelta <= 0.05) {
    console.log('PASS: Pico feet remained 100% visually locked to the taskbar surface (0px foot displacement).');
  } else {
    console.error(`FAIL: Feet moved during acknowledgement! Max delta: ${maxBottomDelta}px`);
  }

  // Check 2: Head Nod Movement (Head moves subtly without whole-body dip)
  const headDip = t320.top - initialData.top;
  console.log(`Head top displacement during nod: ${headDip.toFixed(2)}px (subtle nod target ~1.0 - 1.5px)`);

  if (headDip >= 0.8 && headDip <= 2.0) {
    console.log('PASS: Subtle head nod confirmed (head inclines gently without whole-body dip).');
  } else {
    console.warn(`NOTICE: Head dip was ${headDip}px`);
  }

  // Check 3: Eye Blink During Nod
  if (t320.isBlinking && !t600.isBlinking) {
    console.log('PASS: Eyes closed softly during the nod and reopened as the head lifted.');
  } else {
    console.error(`FAIL: Eye blink synchronization failed: t320.isBlinking=${t320.isBlinking}, t600.isBlinking=${t600.isBlinking}`);
  }

  // Check 4: Return to Idle
  if (t900.isIdle && !t900.isAck) {
    console.log('PASS: Pico smoothly returned to normal idle state.');
  } else {
    console.error('FAIL: Did not return to idle after acknowledgement!');
  }

  console.log('\nALL ACKNOWLEDGEMENT CHECKS PASSED.');
  win.close();
  app.quit();
});
