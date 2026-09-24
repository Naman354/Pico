const { app, BrowserWindow, ipcMain } = require('electron');
const path = require('path');
const fs = require('fs');

// Mock taskbar surface IPC for test runner
ipcMain.handle('get-taskbar-surface', () => ({
  minX: 30,
  maxX: 800,
  defaultX: 200
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

  console.log('--- STARTING MILESTONE 2A NATURAL WALKING DIRECTION VERIFICATION ---');

  const wait = (ms) => new Promise(r => setTimeout(r, ms));
  const evaluate = (fn, ...args) => win.webContents.executeJavaScript(`(${fn.toString()})(${args.map(a => JSON.stringify(a)).join(',')})`);

  async function capture(filename) {
    const img = await win.capturePage();
    fs.writeFileSync(path.join(__dirname, filename), img.toPNG());
    console.log(`Captured: ${filename}`);
  }

  // Set explicit starting position at X = 200
  await wait(400);
  await evaluate(() => {
    window.WanderController.setStageX(200);
  });
  await wait(200);

  // 1. Initial State: Standing Idle (Front-facing)
  const idleState = await evaluate(() => {
    const figure = document.getElementById('pico-figure');
    const front = document.getElementById('pico-character');
    const sideStand = document.getElementById('pico-side-stand');
    const facer = document.getElementById('pico-facer');
    const rect = document.getElementById('pico-container').getBoundingClientRect();

    return {
      isIdle: figure.classList.contains('idle'),
      isWalking: figure.classList.contains('walking'),
      frontVisible: window.getComputedStyle(front).display !== 'none',
      sideVisible: window.getComputedStyle(sideStand).display !== 'none',
      facingRight: facer.classList.contains('facing-right'),
      bottomY: rect.bottom,
      currentX: window.WanderController.currentX
    };
  });

  console.log('1. Initial Idle State:', idleState);
  await capture('pico-verify-1-idle.png');

  if (!idleState.isIdle || !idleState.frontVisible || idleState.sideVisible) {
    throw new Error('FAIL: Pico must start in front-facing idle stance with side frames hidden!');
  }

  // 2. Transition: idle -> turn -> walk right (Target X = 320, distance = +120px)
  console.log('2. Starting walk to the right (target X = 320)...');
  evaluate(() => {
    window.WanderController.walkTo(320, 30);
  });

  // Check turn transition
  await wait(80);
  const turnRightState = await evaluate(() => {
    const figure = document.getElementById('pico-figure');
    const facer = document.getElementById('pico-facer');
    const rect = document.getElementById('pico-container').getBoundingClientRect();
    return {
      isTurning: figure.classList.contains('turning-to-side') || window.WanderController.isTurning,
      facingRight: facer.classList.contains('facing-right'),
      bottomY: rect.bottom
    };
  });
  console.log('2a. Turning to Right Transition:', turnRightState);
  await capture('pico-verify-2-turn-right.png');

  // Actively walking right in side profile
  await wait(300);
  const walkRightState = await evaluate(() => {
    const figure = document.getElementById('pico-figure');
    const front = document.getElementById('pico-character');
    const sideStand = document.getElementById('pico-side-stand');
    const sideW1 = document.getElementById('pico-side-walk1');
    const sideW2 = document.getElementById('pico-side-walk2');
    const facer = document.getElementById('pico-facer');
    const rect = document.getElementById('pico-container').getBoundingClientRect();

    return {
      isWalking: figure.classList.contains('walking'),
      isControllerWalking: window.WanderController.isWalking,
      frontVisible: window.getComputedStyle(front).display !== 'none',
      sideStandVisible: window.getComputedStyle(sideStand).display !== 'none',
      sideW1Visible: window.getComputedStyle(sideW1).display !== 'none',
      sideW2Visible: window.getComputedStyle(sideW2).display !== 'none',
      facingRight: facer.classList.contains('facing-right'),
      facingLeft: facer.classList.contains('facing-left'),
      bottomY: rect.bottom,
      currentX: window.WanderController.currentX
    };
  });
  console.log('2b. Walking Right (Side Profile):', walkRightState);
  await capture('pico-verify-3-walk-right.png');

  if (walkRightState.frontVisible) {
    throw new Error('FAIL: Front-facing idle sprite must NOT be visible during walking!');
  }
  if (!walkRightState.isWalking || !walkRightState.facingRight || walkRightState.facingLeft) {
    throw new Error('FAIL: Pico must be walking and facing right!');
  }

  // 3. Direction Reversal: walk right -> turn -> walk left (Target X = 150)
  console.log('3. Reversing direction to walk left (target X = 150)...');
  evaluate(() => {
    window.WanderController.walkTo(150, 30);
  });

  // Check turn around transition
  await wait(80);
  const turnAroundState = await evaluate(() => {
    const figure = document.getElementById('pico-figure');
    const rect = document.getElementById('pico-container').getBoundingClientRect();
    return {
      isTurningAround: figure.classList.contains('turning-around') || window.WanderController.isTurning,
      bottomY: rect.bottom
    };
  });
  console.log('3a. Turn Around Transition:', turnAroundState);
  await capture('pico-verify-4-turn-around.png');

  // Actively walking left in side profile
  await wait(300);
  const walkLeftState = await evaluate(() => {
    const figure = document.getElementById('pico-figure');
    const front = document.getElementById('pico-character');
    const facer = document.getElementById('pico-facer');
    const rect = document.getElementById('pico-container').getBoundingClientRect();

    return {
      isWalking: figure.classList.contains('walking'),
      isControllerWalking: window.WanderController.isWalking,
      frontVisible: window.getComputedStyle(front).display !== 'none',
      facingLeft: facer.classList.contains('facing-left'),
      facingRight: facer.classList.contains('facing-right'),
      bottomY: rect.bottom,
      currentX: window.WanderController.currentX
    };
  });
  console.log('3b. Walking Left (Side Profile):', walkLeftState);
  await capture('pico-verify-5-walk-left.png');

  if (walkLeftState.frontVisible || !walkLeftState.facingLeft || walkLeftState.facingRight) {
    throw new Error('FAIL: Pico must face left in side profile while walking left!');
  }

  // 4. Stopping: walk -> stop -> idle (Wait for destination arrival)
  console.log('4. Walking short distance to destination X = 130 and stopping...');
  await evaluate(() => {
    return window.WanderController.walkTo(130, 80);
  });
  await wait(1200);

  const stoppedState = await evaluate(() => {
    const figure = document.getElementById('pico-figure');
    const front = document.getElementById('pico-character');
    const sideStand = document.getElementById('pico-side-stand');
    const rect = document.getElementById('pico-container').getBoundingClientRect();

    return {
      isIdle: figure.classList.contains('idle'),
      isWalking: figure.classList.contains('walking'),
      isTurning: window.WanderController.isTurning,
      frontVisible: window.getComputedStyle(front).display !== 'none',
      sideStandVisible: window.getComputedStyle(sideStand).display !== 'none',
      bottomY: rect.bottom,
      currentX: window.WanderController.currentX
    };
  });
  console.log('4a. Stopped & Returned to Front Idle:', stoppedState);
  await capture('pico-verify-6-stopped-idle.png');

  if (!stoppedState.isIdle || !stoppedState.frontVisible || stoppedState.sideStandVisible) {
    throw new Error('FAIL: Pico must return to front-facing idle stance after stopping!');
  }

  // 5. Verify Physical Grounding (Feet remain strictly locked to taskbar surface)
  const baselineY = idleState.bottomY;
  const driftList = [
    { state: 'Idle Initial', drift: Math.abs(idleState.bottomY - baselineY) },
    { state: 'Turn to Right', drift: Math.abs(turnRightState.bottomY - baselineY) },
    { state: 'Walk Right', drift: Math.abs(walkRightState.bottomY - baselineY) },
    { state: 'Turn Around', drift: Math.abs(turnAroundState.bottomY - baselineY) },
    { state: 'Walk Left', drift: Math.abs(walkLeftState.bottomY - baselineY) },
    { state: 'Stopped Idle', drift: Math.abs(stoppedState.bottomY - baselineY) }
  ];

  console.log('5. Feet Grounding Measurements (Baseline Y = ' + baselineY + 'px):');
  let maxDrift = 0;
  for (const item of driftList) {
    console.log(`   - ${item.state}: drift = ${item.drift.toFixed(4)}px`);
    if (item.drift > maxDrift) maxDrift = item.drift;
  }

  if (maxDrift > 0.01) {
    throw new Error(`FAIL: Foot baseline drifted by ${maxDrift}px! Grounding constraint violated.`);
  }
  console.log(`SUCCESS: Feet remained 100% grounded across all states with max drift = ${maxDrift.toFixed(4)}px!`);

  // 6. Verify existing interactions at new position
  console.log('6. Verifying preserved interactions...');
  // Hover glance
  await evaluate(() => window.CharacterActions.glance());
  await wait(200);
  await capture('pico-verify-7-hover-glance.png');

  // Acknowledgement nod
  await evaluate(() => window.CharacterActions.acknowledge());
  await wait(300);
  await capture('pico-verify-8-ack-nod.png');
  await wait(600);

  // Click bubble
  await evaluate(() => {
    document.getElementById('pico-container').click();
  });
  await wait(300);
  await capture('pico-verify-9-bubble-open.png');

  const bubbleOpen = await evaluate(() => {
    return document.getElementById('bubble-container').classList.contains('open');
  });

  if (!bubbleOpen) {
    throw new Error('FAIL: Speech bubble failed to open!');
  }

  // Close bubble
  await evaluate(() => {
    document.getElementById('pico-container').click();
  });
  await wait(300);

  console.log('=================================================================');
  console.log('   ALL MILESTONE 2A NATURAL WALKING TESTS PASSED PERFECTLY!     ');
  console.log('=================================================================');

  app.quit();
  process.exit(0);
});
