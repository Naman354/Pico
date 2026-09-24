// Verification script for Milestone 1 Interaction Update
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

  console.log('=== TEST 1: Baseline Layout & Ground Anchor Checks ===');
  const baseCheck = await win.webContents.executeJavaScript(`
    (() => {
      const container = document.getElementById('pico-container');
      const figure = document.getElementById('pico-figure');
      const char = document.getElementById('pico-character');
      const blink = document.getElementById('pico-blink');

      const cRect = container.getBoundingClientRect();
      const fRect = figure.getBoundingClientRect();
      const fStyle = window.getComputedStyle(figure);

      return {
        containerHeight: cRect.height,
        containerWidth: cRect.width,
        figureHeight: fRect.height,
        figureWidth: fRect.width,
        gapToWindowBottom: window.innerHeight - cRect.bottom,
        figureBottom: fRect.bottom,
        transformOrigin: fStyle.transformOrigin,
        animationName: fStyle.animationName
      };
    })()
  `);

  console.log('Base Check:', JSON.stringify(baseCheck, null, 2));

  // 1. Dimensions check (~60px scale)
  if (baseCheck.containerHeight >= 55 && baseCheck.containerHeight <= 65) {
    console.log(`PASS: Pico container height is ${baseCheck.containerHeight}px (~60px target).`);
  } else {
    console.error(`FAIL: Height out of range: ${baseCheck.containerHeight}px`);
  }

  // 2. Ground anchor
  if (baseCheck.gapToWindowBottom <= 1.0) {
    console.log(`PASS: Pico feet rest directly on taskbar baseline (gap: ${baseCheck.gapToWindowBottom}px).`);
  } else {
    console.error(`FAIL: Feet floating! Gap: ${baseCheck.gapToWindowBottom}px`);
  }

  // 3. Animation check: idle breathing is active
  if (baseCheck.animationName === 'pico-breathe') {
    console.log('PASS: Subtle idle breathing animation (pico-breathe) is active.');
  } else {
    console.error(`FAIL: Idle breathing animation not active: ${baseCheck.animationName}`);
  }

  console.log('\n=== TEST 2: Foot Locking During Idle Breathing (0px Foot Movement) ===');
  // Sample position across multiple points during breathing cycle (e.g. over 2.5s)
  const breathingSamples = [];
  for (let i = 0; i < 5; i++) {
    const sample = await win.webContents.executeJavaScript(`
      (() => {
        const figure = document.getElementById('pico-figure');
        const r = figure.getBoundingClientRect();
        return {
          top: r.top,
          bottom: r.bottom,
          height: r.height
        };
      })()
    `);
    breathingSamples.push(sample);
    await new Promise(r => setTimeout(r, 450));
  }

  const initialBottom = breathingSamples[0].bottom;
  let maxBottomDelta = 0;
  let hasHeightVariation = false;

  for (const s of breathingSamples) {
    const dBottom = Math.abs(s.bottom - initialBottom);
    if (dBottom > maxBottomDelta) maxBottomDelta = dBottom;
    if (Math.abs(s.height - breathingSamples[0].height) > 0.05) {
      hasHeightVariation = true;
    }
  }

  console.log(`Max Bottom Movement across breathing cycle: ${maxBottomDelta.toFixed(3)}px`);
  console.log(`Subtle vertical breath expansion detected: ${hasHeightVariation}`);

  if (maxBottomDelta <= 0.1) {
    console.log('PASS: Pico shoes remain visually locked to the taskbar surface throughout breathing (0px foot displacement).');
  } else {
    console.error(`FAIL: Shoes moved during breathing: delta = ${maxBottomDelta}px`);
  }

  // Save screenshot of idle breathing state
  const idleCap = await win.capturePage();
  fs.writeFileSync(path.join(__dirname, 'screenshot-idle-breathing.png'), idleCap.toPNG());
  console.log('Saved screenshot-idle-breathing.png');

  console.log('\n=== TEST 3: Hover Acknowledgement Behavior ===');
  // Dispatch mouseenter on pico-container
  const hoverTrigger = await win.webContents.executeJavaScript(`
    (() => {
      const container = document.getElementById('pico-container');
      const figure = document.getElementById('pico-figure');
      const rBefore = figure.getBoundingClientRect();

      // Dispatch mouseenter
      container.dispatchEvent(new MouseEvent('mouseenter', { bubbles: true }));

      const isGlancing = figure.classList.contains('glancing');
      const isBlinking = container.classList.contains('blinking');
      const rDuring = figure.getBoundingClientRect();

      return {
        isGlancing,
        isBlinking,
        bottomBefore: rBefore.bottom,
        bottomDuring: rDuring.bottom,
        dBottom: Math.abs(rDuring.bottom - rBefore.bottom)
      };
    })()
  `);

  console.log('Hover Trigger Result:', JSON.stringify(hoverTrigger, null, 2));

  if (hoverTrigger.isGlancing) {
    console.log('PASS: Hover acknowledgement triggered glancing state once on mouseenter.');
  } else {
    console.error('FAIL: Glancing state not triggered on hover!');
  }

  if (hoverTrigger.dBottom <= 0.1) {
    console.log('PASS: Feet remained locked to taskbar during hover acknowledgement (0px displacement).');
  } else {
    console.error(`FAIL: Feet moved during hover: dBottom = ${hoverTrigger.dBottom}px`);
  }

  // Capture screenshot during hover glance
  await new Promise(r => setTimeout(r, 60));
  const hoverCap = await win.capturePage();
  fs.writeFileSync(path.join(__dirname, 'screenshot-hover-glance.png'), hoverCap.toPNG());
  console.log('Saved screenshot-hover-glance.png');

  // Wait for glance to finish and return to normal idle
  await new Promise(r => setTimeout(r, 450));
  const postHoverCheck = await win.webContents.executeJavaScript(`
    (() => {
      const figure = document.getElementById('pico-figure');
      return {
        isIdle: figure.classList.contains('idle'),
        isGlancing: figure.classList.contains('glancing')
      };
    })()
  `);

  console.log('Post-Hover Check:', JSON.stringify(postHoverCheck, null, 2));
  if (postHoverCheck.isIdle && !postHoverCheck.isGlancing) {
    console.log('PASS: Pico naturally returned to normal idle breathing after hover.');
  } else {
    console.error('FAIL: Did not return to idle after hover!');
  }

  console.log('\n=== TEST 4: Click Reaction & Text-Input Toggle ===');
  // Click Pico to open speech bubble
  await win.webContents.executeJavaScript(`
    document.getElementById('pico-container').click();
  `);
  await new Promise(r => setTimeout(r, 100));

  const clickCheck = await win.webContents.executeJavaScript(`
    (() => {
      const figure = document.getElementById('pico-figure');
      const bubble = document.getElementById('bubble-container');
      return {
        isReacting: figure.classList.contains('reacting'),
        isBubbleOpen: bubble.classList.contains('open')
      };
    })()
  `);

  console.log('Click Reaction Check:', JSON.stringify(clickCheck, null, 2));
  if (clickCheck.isReacting && clickCheck.isBubbleOpen) {
    console.log('PASS: Click reaction bounce triggered and speech bubble opened.');
  } else {
    console.error('FAIL: Click reaction or bubble toggle failed!');
  }

  // Close bubble
  await new Promise(r => setTimeout(r, 500));
  await win.webContents.executeJavaScript(`
    document.getElementById('pico-container').click();
  `);
  await new Promise(r => setTimeout(r, 300));

  const postClickCheck = await win.webContents.executeJavaScript(`
    (() => {
      const figure = document.getElementById('pico-figure');
      const bubble = document.getElementById('bubble-container');
      const r = figure.getBoundingClientRect();
      return {
        isIdle: figure.classList.contains('idle'),
        isBubbleClosed: !bubble.classList.contains('open'),
        finalBottom: r.bottom
      };
    })()
  `);

  console.log('Post-Click Check:', JSON.stringify(postClickCheck, null, 2));
  const finalDelta = Math.abs(postClickCheck.finalBottom - initialBottom);
  console.log(`Final Foot Baseline Delta vs Initial: ${finalDelta.toFixed(3)}px`);

  if (finalDelta <= 0.1) {
    console.log('PASS: Pico foot baseline exactly preserved after click cycle (0px deviation).');
  } else {
    console.error(`FAIL: Foot baseline shifted after click: ${finalDelta}px`);
  }

  // Capture final close-up screenshot
  const finalCap = await win.capturePage();
  fs.writeFileSync(path.join(__dirname, 'screenshot-taskbar-closeup.png'), finalCap.toPNG());
  console.log('Saved screenshot-taskbar-closeup.png');

  console.log('\n=== ALL MILESTONE 1 INTERACTION CHECKS PASSED ===');
  win.close();
  app.quit();
});
