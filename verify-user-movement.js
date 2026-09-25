const { app, BrowserWindow, ipcMain } = require('electron');
const path = require('path');
const fs = require('fs');

// Mock taskbar surface IPC for test runner
ipcMain.handle('get-taskbar-surface', () => ({
  minX: 30,
  maxX: 800,
  defaultX: 300
}));

app.whenReady().then(async () => {
  const win = new BrowserWindow({
    width: 900,
    height: 350,
    frame: false,
    transparent: true,
    show: false,
    webPreferences: {
      preload: path.join(__dirname, 'preload.js'),
      nodeIntegration: false,
      contextIsolation: true
    }
  });

  await win.loadFile(path.join(__dirname, 'src', 'renderer', 'index.html'));
  win.show();

  console.log('===============================================================');
  console.log('  MILESTONE 2: USER-DIRECTED MOVEMENT VERIFICATION TEST');
  console.log('===============================================================');

  const wait = (ms) => new Promise(r => setTimeout(r, ms));
  const evaluate = (fn, ...args) => win.webContents.executeJavaScript(`(${fn.toString()})(${args.map(a => JSON.stringify(a)).join(',')})`);

  async function capture(filename) {
    const img = await win.capturePage();
    fs.writeFileSync(path.join(__dirname, filename), img.toPNG());
    console.log(`[Captured Visual] ${filename}`);
  }

  function assert(cond, msg) {
    if (cond) {
      console.log(`[PASS] ${msg}`);
    } else {
      console.error(`[FAIL] ${msg}`);
      throw new Error(`Assertion failed: ${msg}`);
    }
  }

  await wait(500);

  // Set explicit starting position at X = 300
  await evaluate(() => {
    window.WanderController.setStageX(300);
  });
  await wait(200);

  // -------------------------------------------------------------------------
  // TEST 1: Directional Movement ("You're blocking my view. Move left.")
  // -------------------------------------------------------------------------
  console.log('\n--- TEST 1: Directional Movement ("You\'re blocking my view. Move left.") ---');
  
  // 1a. Open speech bubble and type command
  await evaluate(() => {
    document.getElementById('pico-container').click();
  });
  await wait(250);

  const bubbleState = await evaluate(() => {
    const bubble = document.getElementById('bubble-container');
    const input = document.getElementById('pico-input');
    input.value = "You're blocking my view. Move left.";
    return {
      isOpen: bubble.classList.contains('open'),
      text: input.value,
      startX: window.WanderController.currentX
    };
  });

  assert(bubbleState.isOpen, 'Speech bubble opened on clicking Pico');
  assert(bubbleState.text === "You're blocking my view. Move left.", 'Command typed into input');
  await capture('user-move-1-bubble-input.png');

  // 1b. Submit command
  console.log('Submitting command: "You\'re blocking my view. Move left."...');
  const submitPromise = evaluate(async () => {
    return await window.submitUserText("You're blocking my view. Move left.");
  });

  // Check acknowledgement nod phase (t ~ 250ms)
  await wait(250);
  const ackState = await evaluate(() => {
    const figure = document.getElementById('pico-figure');
    const container = document.getElementById('pico-container');
    const rect = container.getBoundingClientRect();
    return {
      isAcknowledging: figure.classList.contains('acknowledging'),
      isBlinking: container.classList.contains('blinking'),
      bottomY: rect.bottom,
      currentX: window.WanderController.currentX
    };
  });
  assert(ackState.isAcknowledging, 'Pico acknowledged command with natural nod animation');
  console.log('Acknowledgement State at t=250ms:', ackState);
  await capture('user-move-2-acknowledgement.png');

  // Check walking phase (t ~ 1200ms after submission)
  await wait(950);
  const walkLeftState = await evaluate(() => {
    const figure = document.getElementById('pico-figure');
    const facer = document.getElementById('pico-facer');
    const sideStand = document.getElementById('pico-side-stand');
    const sideW1 = document.getElementById('pico-side-walk1');
    const sideW2 = document.getElementById('pico-side-walk2');
    const rect = document.getElementById('pico-container').getBoundingClientRect();
    return {
      isWalking: figure.classList.contains('walking'),
      facingLeft: facer.classList.contains('facing-left'),
      facingRight: facer.classList.contains('facing-right'),
      sideActive: window.getComputedStyle(sideStand).display !== 'none' ||
                  window.getComputedStyle(sideW1).display !== 'none' ||
                  window.getComputedStyle(sideW2).display !== 'none',
      bottomY: rect.bottom,
      currentX: window.WanderController.currentX
    };
  });
  assert(walkLeftState.isWalking, 'Pico entered active walking state');
  assert(walkLeftState.facingLeft, 'Pico turned and faced left to walk left');
  assert(walkLeftState.sideActive, 'Authoritative side profile frame active during walking');
  console.log('Active Walking Left State:', walkLeftState);
  await capture('user-move-3-walking-left.png');

  // Wait for walk completion and idle return
  await submitPromise;
  await wait(250);

  const postLeftState = await evaluate(() => {
    const figure = document.getElementById('pico-figure');
    const front = document.getElementById('pico-character');
    const rect = document.getElementById('pico-container').getBoundingClientRect();
    return {
      isIdle: figure.classList.contains('idle'),
      isWalking: figure.classList.contains('walking'),
      frontVisible: window.getComputedStyle(front).display !== 'none',
      currentX: window.WanderController.currentX,
      bottomY: rect.bottom
    };
  });

  assert(postLeftState.isIdle && !postLeftState.isWalking, 'Pico stopped and returned to idle');
  assert(postLeftState.frontVisible, 'Front idle stance restored upon stopping');
  assert(postLeftState.currentX <= 230 && postLeftState.currentX >= 210, `Pico walked ~80px left: new X=${postLeftState.currentX} (started at 300)`);
  assert(Math.abs(postLeftState.bottomY - ackState.bottomY) < 0.01, `Feet remained 100% grounded (0px drift): delta=${Math.abs(postLeftState.bottomY - ackState.bottomY)}px`);
  console.log('Settled Idle State:', postLeftState);
  await capture('user-move-4-settled-idle-left.png');

  // -------------------------------------------------------------------------
  // TEST 2: Directional Movement ("Move right.")
  // -------------------------------------------------------------------------
  console.log('\n--- TEST 2: Directional Movement ("Move right.") ---');
  const startX2 = postLeftState.currentX; // ~220
  console.log(`Starting from X=${startX2}, commanding "Move right."...`);

  const rightPromise = evaluate(async () => {
    return await window.submitUserText("Move right.");
  });

  // Check acknowledgement
  await wait(250);
  const ackRight = await evaluate(() => document.getElementById('pico-figure').classList.contains('acknowledging'));
  assert(ackRight, 'Pico acknowledged "Move right."');

  // Check walking right
  await wait(1000);
  const walkRightState = await evaluate(() => {
    const figure = document.getElementById('pico-figure');
    const facer = document.getElementById('pico-facer');
    return {
      isWalking: figure.classList.contains('walking'),
      facingRight: facer.classList.contains('facing-right'),
      currentX: window.WanderController.currentX
    };
  });
  assert(walkRightState.isWalking, 'Pico walking right');
  assert(walkRightState.facingRight, 'Pico turned right for rightward walk');

  await rightPromise;
  await wait(250);

  const postRightState = await evaluate(() => ({
    isIdle: document.getElementById('pico-figure').classList.contains('idle'),
    currentX: window.WanderController.currentX
  }));
  assert(postRightState.isIdle, 'Pico settled into idle after walking right');
  assert(postRightState.currentX > startX2 + 60, `Pico moved right to X=${postRightState.currentX}`);
  await capture('user-move-5-walk-right-done.png');

  // -------------------------------------------------------------------------
  // TEST 3: Clear-View Movement ("Get out of the way.")
  // -------------------------------------------------------------------------
  console.log('\n--- TEST 3: Clear-View Obstruction ("Get out of the way.") ---');
  const startX3 = postRightState.currentX;
  console.log(`Starting from X=${startX3}, commanding "Get out of the way."...`);

  const clearPromise = evaluate(async () => {
    return await window.submitUserText("Get out of the way.");
  });

  await wait(250);
  const ackClear = await evaluate(() => document.getElementById('pico-figure').classList.contains('acknowledging'));
  assert(ackClear, 'Pico acknowledged obstruction command');

  await clearPromise;
  await wait(250);

  const postClearState = await evaluate(() => ({
    isIdle: document.getElementById('pico-figure').classList.contains('idle'),
    currentX: window.WanderController.currentX
  }));
  assert(postClearState.isIdle, 'Pico returned to idle after moving out of the way');
  assert(Math.abs(postClearState.currentX - startX3) >= 60, `Pico moved ${Math.abs(postClearState.currentX - startX3)}px away to clear view (new X=${postClearState.currentX})`);
  await capture('user-move-6-clear-view-done.png');

  // -------------------------------------------------------------------------
  // TEST 4: Non-Movement Message Preservation ("Hello Pico!")
  // -------------------------------------------------------------------------
  console.log('\n--- TEST 4: Non-Movement Message ("Hello Pico!") ---');
  const startX4 = postClearState.currentX;

  const chatPromise = evaluate(async () => {
    return await window.submitUserText("Hello Pico!");
  });

  await wait(250);
  const ackChat = await evaluate(() => document.getElementById('pico-figure').classList.contains('acknowledging'));
  assert(ackChat, 'Pico acknowledged greeting with friendly nod');

  await wait(800);
  const postChatState = await evaluate(() => ({
    isWalking: document.getElementById('pico-figure').classList.contains('walking'),
    isIdle: document.getElementById('pico-figure').classList.contains('idle'),
    currentX: window.WanderController.currentX
  }));
  assert(!postChatState.isWalking, 'Pico did NOT walk for conversational message');
  assert(postChatState.currentX === startX4, `Pico stayed in place (X=${postChatState.currentX})`);

  console.log('\n===============================================================');
  console.log('  ALL USER-DIRECTED MOVEMENT TESTS PASSED PERFECTLY!');
  console.log('===============================================================');

  app.quit();
});
