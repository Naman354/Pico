const { app, BrowserWindow } = require('electron');
const path = require('path');
const fs = require('fs');

app.whenReady().then(async () => {
  console.log('App ready, creating hidden window...');
  const win = new BrowserWindow({
    show: false,
    webPreferences: {
      nodeIntegration: true,
      contextIsolation: false
    }
  });

  win.webContents.on('console-message', (_e, _level, msg) => {
    console.log('[Renderer]', msg);
  });

  await win.loadURL('about:blank');

  const b64 = fs.readFileSync(path.join(__dirname, 'src', 'renderer', 'pico-side-stand.png')).toString('base64');
  const uri = 'data:image/png;base64,' + b64;

  console.log('Executing frame generation in webContents...');
  const result = await win.webContents.executeJavaScript(`
    (async () => {
      try {
        console.log('Starting frame synthesis...');
        const loadImg = (src) => new Promise((resolve, reject) => {
          const img = new Image();
          img.onload = () => resolve(img);
          img.onerror = reject;
          img.src = src;
        });

        const img = await loadImg('${uri}');
        const w = img.width;  // 114
        const h = img.height; // 182
        console.log('Base sprite loaded:', w, 'x', h);

        // =============================================================
        // 1. CROUCH PREPARATION FRAME (Anticipation Squat)
        // =============================================================
        function buildCrouchFrame() {
          const c = document.createElement('canvas');
          c.width = w;
          c.height = h;
          const ctx = c.getContext('2d');
          ctx.imageSmoothingEnabled = true;
          ctx.imageSmoothingQuality = 'high';

          const dropY = 5; // torso & head lowered by 5px

          // Trailing Arm (swung back -14 deg)
          ctx.save();
          ctx.filter = 'brightness(0.82) saturate(0.9)';
          ctx.translate(56, 110 + dropY);
          ctx.rotate((-14 * Math.PI) / 180);
          ctx.drawImage(img, 46, 106, 22, 44, -10, -2, 22, 44);
          ctx.restore();

          // Trailing Leg / Shoe (compressed knee, heel flat on ground at y=181)
          ctx.save();
          ctx.filter = 'brightness(0.82) saturate(0.92)';
          ctx.drawImage(img, 38, 154, 24, 14, 38, 154 + dropY * 0.5, 24, 14 - dropY * 0.5);
          ctx.drawImage(img, 43, 168, 30, 14, 43, 168, 30, 14);
          ctx.restore();

          // Head & Torso lowered by dropY, with slight forward tilt (+3 deg)
          ctx.save();
          ctx.translate(56, 140 + dropY);
          ctx.rotate((3 * Math.PI) / 180);
          ctx.drawImage(img, 0, 0, w, 136, -56, -140, w, 136);
          ctx.drawImage(img, 0, 135, w, 22, -56, -5, w, 22);
          ctx.restore();

          // Leading Leg (compressed knees, shoe flat on ground)
          ctx.drawImage(img, 46, 154, 24, 14, 46, 154 + dropY * 0.5, 24, 14 - dropY * 0.5);
          ctx.drawImage(img, 43, 168, 30, 14, 43, 168, 30, 14);

          // Shorts Cuffs
          ctx.save();
          ctx.translate(56, 140 + dropY);
          ctx.rotate((3 * Math.PI) / 180);
          ctx.drawImage(img, 38, 146, 36, 11, -18, 6, 36, 11);

          // Leading Arm (swung slightly back -12 deg)
          ctx.fillStyle = '#6E976A';
          ctx.beginPath();
          ctx.ellipse(2, -14, 6, 12, 0, 0, Math.PI * 2);
          ctx.fill();

          ctx.translate(2, -32);
          ctx.rotate((-12 * Math.PI) / 180);
          ctx.drawImage(img, 46, 106, 22, 46, -10, -2, 22, 46);
          ctx.restore();

          return c.toDataURL('image/png');
        }

        // =============================================================
        // 2. PUSH-OFF / LAUNCH EXTENSION FRAME
        // =============================================================
        function buildLaunchFrame() {
          const c = document.createElement('canvas');
          c.width = w;
          c.height = h;
          const ctx = c.getContext('2d');
          ctx.imageSmoothingEnabled = true;
          ctx.imageSmoothingQuality = 'high';

          // Trailing Arm (swung forward +14 deg)
          ctx.save();
          ctx.filter = 'brightness(0.82) saturate(0.9)';
          ctx.translate(56 + 2, 110 - 3);
          ctx.rotate((14 * Math.PI) / 180);
          ctx.drawImage(img, 46, 106, 22, 44, -10, -2, 22, 44);
          ctx.restore();

          // Trailing Leg (extended backward & down with toes pointing)
          ctx.save();
          ctx.filter = 'brightness(0.82) saturate(0.92)';
          ctx.translate(48, 154);
          ctx.rotate((-12 * Math.PI) / 180);
          ctx.drawImage(img, 38, 154, 24, 14, -10, 0, 24, 14);
          ctx.translate(-5, 14);
          ctx.rotate((-15 * Math.PI) / 180);
          ctx.drawImage(img, 43, 168, 30, 14, -8, 0, 30, 14);
          ctx.restore();

          // Head & Torso surged upward (-3px) and forward (+2px), tilt +4 deg
          ctx.save();
          ctx.translate(56 + 2, 140 - 3);
          ctx.rotate((4 * Math.PI) / 180);
          ctx.drawImage(img, 0, 0, w, 136, -56, -140, w, 136);
          ctx.drawImage(img, 0, 135, w, 22, -56, -5, w, 22);
          ctx.restore();

          // Leading Leg (extended downward & slightly back pushing off)
          ctx.save();
          ctx.translate(54, 154 - 2);
          ctx.rotate((-8 * Math.PI) / 180);
          ctx.drawImage(img, 46, 154, 24, 14, -8, 0, 24, 14);
          ctx.translate(-3, 14);
          ctx.rotate((-12 * Math.PI) / 180);
          ctx.drawImage(img, 43, 168, 30, 14, -8, 0, 30, 14);
          ctx.restore();

          // Shorts Cuffs
          ctx.save();
          ctx.translate(56 + 2, 140 - 3);
          ctx.rotate((4 * Math.PI) / 180);
          ctx.drawImage(img, 38, 146, 36, 11, -18, 6, 36, 11);

          // Leading Arm (swung forward +16 deg)
          ctx.fillStyle = '#6E976A';
          ctx.beginPath();
          ctx.ellipse(2, -14, 6, 12, 0, 0, Math.PI * 2);
          ctx.fill();

          ctx.translate(2, -32);
          ctx.rotate((16 * Math.PI) / 180);
          ctx.drawImage(img, 46, 106, 22, 46, -10, -2, 22, 46);
          ctx.restore();

          return c.toDataURL('image/png');
        }

        // =============================================================
        // 3. AIRBORNE / FLIGHT POSE (Tucked Legs, Parabolic Apex)
        // =============================================================
        function buildAirborneFrame() {
          const c = document.createElement('canvas');
          c.width = w;
          c.height = h;
          const ctx = c.getContext('2d');
          ctx.imageSmoothingEnabled = true;
          ctx.imageSmoothingQuality = 'high';

          // Trailing Arm (out behind for balance -8 deg)
          ctx.save();
          ctx.filter = 'brightness(0.82) saturate(0.9)';
          ctx.translate(56 + 2, 110 - 2);
          ctx.rotate((-8 * Math.PI) / 180);
          ctx.drawImage(img, 46, 106, 22, 44, -10, -2, 22, 44);
          ctx.restore();

          // Trailing Leg (tucked up under shorts)
          ctx.save();
          ctx.filter = 'brightness(0.82) saturate(0.92)';
          ctx.translate(48, 150);
          ctx.rotate((14 * Math.PI) / 180);
          ctx.drawImage(img, 38, 154, 24, 12, -6, -4, 24, 12);
          ctx.translate(6, 6);
          ctx.rotate((16 * Math.PI) / 180);
          ctx.drawImage(img, 43, 168, 30, 14, -8, -10, 30, 14);
          ctx.restore();

          // Head & Torso (tilted forward +5 deg along flight trajectory)
          ctx.save();
          ctx.translate(56 + 2, 140 - 2);
          ctx.rotate((5 * Math.PI) / 180);
          ctx.drawImage(img, 0, 0, w, 136, -56, -140, w, 136);
          ctx.drawImage(img, 0, 135, w, 22, -56, -5, w, 22);
          ctx.restore();

          // Leading Leg (tucked up forward, knees bent)
          ctx.save();
          ctx.translate(56, 150);
          ctx.rotate((18 * Math.PI) / 180);
          ctx.drawImage(img, 46, 154, 24, 12, -8, -4, 24, 12);
          ctx.translate(8, 6);
          ctx.rotate((12 * Math.PI) / 180);
          ctx.drawImage(img, 43, 168, 30, 14, -8, -9, 30, 14);
          ctx.restore();

          // Shorts Cuffs
          ctx.save();
          ctx.translate(56 + 2, 140 - 2);
          ctx.rotate((5 * Math.PI) / 180);
          ctx.drawImage(img, 38, 146, 36, 11, -18, 6, 36, 11);

          // Leading Arm (swung slightly forward +8 deg for balance)
          ctx.fillStyle = '#6E976A';
          ctx.beginPath();
          ctx.ellipse(2, -14, 6, 12, 0, 0, Math.PI * 2);
          ctx.fill();

          ctx.translate(2, -32);
          ctx.rotate((8 * Math.PI) / 180);
          ctx.drawImage(img, 46, 106, 22, 46, -10, -2, 22, 46);
          ctx.restore();

          return c.toDataURL('image/png');
        }

        // =============================================================
        // 4. DESCENT / PRE-LANDING PREP FRAME
        // =============================================================
        function buildDescendFrame() {
          const c = document.createElement('canvas');
          c.width = w;
          c.height = h;
          const ctx = c.getContext('2d');
          ctx.imageSmoothingEnabled = true;
          ctx.imageSmoothingQuality = 'high';

          // Trailing Arm
          ctx.save();
          ctx.filter = 'brightness(0.82) saturate(0.9)';
          ctx.translate(56, 110);
          ctx.rotate((-2 * Math.PI) / 180);
          ctx.drawImage(img, 46, 106, 22, 44, -10, -2, 22, 44);
          ctx.restore();

          // Trailing Leg (reaching downward)
          ctx.save();
          ctx.filter = 'brightness(0.82) saturate(0.92)';
          ctx.translate(48, 154);
          ctx.rotate((-4 * Math.PI) / 180);
          ctx.drawImage(img, 38, 154, 24, 14, -8, 0, 24, 14);
          ctx.translate(-2, 14);
          ctx.rotate((-4 * Math.PI) / 180);
          ctx.drawImage(img, 43, 168, 30, 14, -8, 0, 30, 14);
          ctx.restore();

          // Head & Torso (upright +1 deg)
          ctx.save();
          ctx.translate(56, 140);
          ctx.rotate((1 * Math.PI) / 180);
          ctx.drawImage(img, 0, 0, w, 136, -56, -140, w, 136);
          ctx.drawImage(img, 0, 135, w, 22, -56, -5, w, 22);
          ctx.restore();

          // Leading Leg (reaching down toward landing surface)
          ctx.save();
          ctx.translate(54, 154);
          ctx.rotate((2 * Math.PI) / 180);
          ctx.drawImage(img, 46, 154, 24, 14, -8, 0, 24, 14);
          ctx.translate(2, 14);
          ctx.rotate((2 * Math.PI) / 180);
          ctx.drawImage(img, 43, 168, 30, 14, -8, 0, 30, 14);
          ctx.restore();

          // Shorts Cuffs
          ctx.save();
          ctx.translate(56, 140);
          ctx.rotate((1 * Math.PI) / 180);
          ctx.drawImage(img, 38, 146, 36, 11, -18, 6, 36, 11);

          // Leading Arm (+2 deg)
          ctx.fillStyle = '#6E976A';
          ctx.beginPath();
          ctx.ellipse(2, -14, 6, 12, 0, 0, Math.PI * 2);
          ctx.fill();

          ctx.translate(2, -32);
          ctx.rotate((2 * Math.PI) / 180);
          ctx.drawImage(img, 46, 106, 22, 46, -10, -2, 22, 46);
          ctx.restore();

          return c.toDataURL('image/png');
        }

        // =============================================================
        // 5. LANDING IMPACT COMPRESSION FRAME
        // =============================================================
        function buildLandFrame() {
          const c = document.createElement('canvas');
          c.width = w;
          c.height = h;
          const ctx = c.getContext('2d');
          ctx.imageSmoothingEnabled = true;
          ctx.imageSmoothingQuality = 'high';

          const compressY = 3.5;

          // Trailing Arm
          ctx.save();
          ctx.filter = 'brightness(0.82) saturate(0.9)';
          ctx.translate(56, 110 + compressY);
          ctx.rotate((-4 * Math.PI) / 180);
          ctx.drawImage(img, 46, 106, 22, 44, -10, -2, 22, 44);
          ctx.restore();

          // Trailing Leg (knee flexed, shoe firmly flat on target surface)
          ctx.save();
          ctx.filter = 'brightness(0.82) saturate(0.92)';
          ctx.drawImage(img, 38, 154, 24, 14, 38, 154 + compressY * 0.4, 24, 14 - compressY * 0.4);
          ctx.drawImage(img, 43, 168, 30, 14, 43, 168, 30, 14);
          ctx.restore();

          // Head & Torso (compressed down by 3.5px, slight forward absorption +1 deg)
          ctx.save();
          ctx.translate(56, 140 + compressY);
          ctx.rotate((1 * Math.PI) / 180);
          ctx.drawImage(img, 0, 0, w, 136, -56, -140, w, 136);
          ctx.drawImage(img, 0, 135, w, 22, -56, -5, w, 22);
          ctx.restore();

          // Leading Leg (knee flexed, shoe firmly flat on target surface)
          ctx.drawImage(img, 46, 154, 24, 14, 46, 154 + compressY * 0.4, 24, 14 - compressY * 0.4);
          ctx.drawImage(img, 43, 168, 30, 14, 43, 168, 30, 14);

          // Shorts Cuffs
          ctx.save();
          ctx.translate(56, 140 + compressY);
          ctx.rotate((1 * Math.PI) / 180);
          ctx.drawImage(img, 38, 146, 36, 11, -18, 6, 36, 11);

          // Leading Arm (+5 deg)
          ctx.fillStyle = '#6E976A';
          ctx.beginPath();
          ctx.ellipse(2, -14, 6, 12, 0, 0, Math.PI * 2);
          ctx.fill();

          ctx.translate(2, -32);
          ctx.rotate((5 * Math.PI) / 180);
          ctx.drawImage(img, 46, 106, 22, 46, -10, -2, 22, 46);
          ctx.restore();

          return c.toDataURL('image/png');
        }

        console.log('Rendering 5 jump frames...');
        const crouch = buildCrouchFrame();
        const launch = buildLaunchFrame();
        const air = buildAirborneFrame();
        const descend = buildDescendFrame();
        const land = buildLandFrame();

        console.log('Assembling preview sheet...');
        const frames = [
          { label: 'Stand', src: '${uri}' },
          { label: '1. Crouch', src: crouch },
          { label: '2. Push-Off', src: launch },
          { label: '3. Airborne', src: air },
          { label: '4. Descend', src: descend },
          { label: '5. Land', src: land }
        ];

        const cComp = document.createElement('canvas');
        cComp.width = 750;
        cComp.height = 230;
        const ctxC = cComp.getContext('2d');
        ctxC.fillStyle = '#0f172a';
        ctxC.fillRect(0, 0, 750, 230);

        ctxC.strokeStyle = '#ef4444';
        ctxC.lineWidth = 1;
        ctxC.beginPath();
        ctxC.moveTo(0, 182.5);
        ctxC.lineTo(750, 182.5);
        ctxC.stroke();

        for (let i = 0; i < frames.length; i++) {
          const item = frames[i];
          const frameImg = await loadImg(item.src);
          const posX = 15 + i * 122;
          ctxC.drawImage(frameImg, posX, 0);
          ctxC.fillStyle = '#94a3b8';
          ctxC.font = 'bold 11px sans-serif';
          ctxC.fillText(item.label, posX + 10, 204);
        }

        console.log('Done assembling preview sheet!');
        return {
          crouch,
          launch,
          air,
          descend,
          land,
          preview: cComp.toDataURL('image/png')
        };
      } catch (err) {
        console.error('Error during synthesis:', err);
        throw err;
      }
    })()
  `);

  fs.writeFileSync(path.join(__dirname, 'jump-frames-preview.png'), result.preview.replace(/^data:image\/png;base64,/, ''), 'base64');
  fs.writeFileSync(path.join(__dirname, 'src', 'renderer', 'pico-side-jump-crouch.png'), result.crouch.replace(/^data:image\/png;base64,/, ''), 'base64');
  fs.writeFileSync(path.join(__dirname, 'src', 'renderer', 'pico-side-jump-launch.png'), result.launch.replace(/^data:image\/png;base64,/, ''), 'base64');
  fs.writeFileSync(path.join(__dirname, 'src', 'renderer', 'pico-side-jump-air.png'), result.air.replace(/^data:image\/png;base64,/, ''), 'base64');
  fs.writeFileSync(path.join(__dirname, 'src', 'renderer', 'pico-side-jump-descend.png'), result.descend.replace(/^data:image\/png;base64,/, ''), 'base64');
  fs.writeFileSync(path.join(__dirname, 'src', 'renderer', 'pico-side-jump-land.png'), result.land.replace(/^data:image\/png;base64,/, ''), 'base64');

  console.log('SUCCESS: All 5 jump animation frames generated and saved to src/renderer!');
  app.quit();
});
