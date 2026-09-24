const { app, BrowserWindow } = require('electron');
const path = require('path');
const fs = require('fs');

app.whenReady().then(async () => {
  const win = new BrowserWindow({ show: false });
  await win.loadURL('about:blank');

  const base64 = fs.readFileSync(path.join(__dirname, 'src', 'renderer', 'pico-side-right.png')).toString('base64');
  const uri = `data:image/png;base64,${base64}`;

  const frames = await win.webContents.executeJavaScript(`
    new Promise((resolve) => {
      const img = new Image();
      img.onload = () => {
        const w = img.width;
        const h = img.height;

        // Clean any stray specks at x < 12
        const cBase = document.createElement('canvas');
        cBase.width = w;
        cBase.height = h;
        const ctxBase = cBase.getContext('2d');
        ctxBase.drawImage(img, 0, 0);
        const bData = ctxBase.getImageData(0, 0, w, h);
        for (let y = 0; y < h; y++) {
          for (let x = 0; x < 12; x++) {
            bData.data[(y * w + x) * 4 + 3] = 0;
          }
        }
        ctxBase.putImageData(bData, 0, 0);

        function createWalkCycleFrame(legFrontDx, legFrontDy, legBackDx, legBackDy, armDx, armAngleRad) {
          const c = document.createElement('canvas');
          c.width = w;
          c.height = h;
          const ctx = c.getContext('2d');

          // 1. Draw head, torso, shorts (y: 0 to 158)
          ctx.drawImage(cBase, 0, 0, w, 158, 0, 0, w, 158);

          // 2. Draw legs and sneakers (y: 158 to 182)
          // Front leg (x: 48 to 72)
          ctx.save();
          ctx.beginPath();
          ctx.rect(48 + legFrontDx, 158, 28, h - 158);
          ctx.clip();
          ctx.drawImage(cBase, legFrontDx, legFrontDy);
          ctx.restore();

          // Back leg (x: 36 to 52)
          ctx.save();
          ctx.beginPath();
          ctx.rect(34 + legBackDx, 158, 22, h - 158);
          ctx.clip();
          ctx.drawImage(cBase, legBackDx, legBackDy);
          ctx.restore();

          // 3. Subtle arm swing overlay:
          // In profile, arm is between x: 44 to 64, y: 104 to 154
          if (armDx !== 0 || armAngleRad !== 0) {
            ctx.save();
            // Erase neutral arm area on shirt
            // Redraw arm with slight pivot at shoulder (x: 52, y: 110)
            ctx.translate(52, 110);
            ctx.rotate(armAngleRad);
            ctx.drawImage(cBase, 44, 104, 20, 50, -8 + armDx, -6, 20, 50);
            ctx.restore();
          }

          return c.toDataURL('image/png');
        }

        // Frame 0: Clean side stand / passing stance
        const stand = cBase.toDataURL('image/png');

        // Frame 1: Stride 1 - front leg steps forward (+4px), back leg pushes back (-3px)
        // Planted front shoe resting at y=181
        const walk1 = createWalkCycleFrame(4, 0, -3, -1, -2, -0.06);

        // Frame 2: Stride 2 - rear leg steps forward (+3px), front leg steps back (-3px)
        // Planted foot resting at y=181
        const walk2 = createWalkCycleFrame(-3, -1, 4, 0, 2, 0.06);

        resolve({ stand, walk1, walk2 });
      };
      img.src = '${uri}';
    })
  `);

  function save(dataUrl, file) {
    fs.writeFileSync(path.join(__dirname, 'src', 'renderer', file), dataUrl.replace(/^data:image\/png;base64,/, ''), 'base64');
  }

  save(frames.stand, 'pico-side-stand.png');
  save(frames.walk1, 'pico-side-walk-1.png');
  save(frames.walk2, 'pico-side-walk-2.png');
  console.log('Saved pico-side-stand.png, pico-side-walk-1.png, pico-side-walk-2.png');
  app.quit();
});
