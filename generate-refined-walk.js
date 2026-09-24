const { app, BrowserWindow } = require('electron');
const path = require('path');
const fs = require('fs');

app.whenReady().then(async () => {
  const win = new BrowserWindow({ show: false });
  await win.loadURL('about:blank');

  const base64 = fs.readFileSync(path.join(__dirname, 'src', 'renderer', 'pico-side-stand.png')).toString('base64');
  const uri = 'data:image/png;base64,' + base64;

  const frames = await win.webContents.executeJavaScript(`
    new Promise((resolve) => {
      const img = new Image();
      img.onload = () => {
        const w = img.width;
        const h = img.height;

        function renderFrame(leadX, trailX, armTiltDeg) {
          const c = document.createElement('canvas');
          c.width = w;
          c.height = h;
          const ctx = c.getContext('2d');
          ctx.imageSmoothingEnabled = true;
          ctx.imageSmoothingQuality = 'high';

          // 1. Draw trailing leg (y: 154 to 182)
          ctx.save();
          ctx.translate(trailX, 0);
          ctx.drawImage(img, 46, 154, 38, 28, 46, 154, 38, 28);
          // Subtle shadow depth on trailing leg
          ctx.globalCompositeOperation = 'source-atop';
          ctx.fillStyle = 'rgba(25, 20, 15, 0.18)';
          ctx.fillRect(40, 154, 50, 28);
          ctx.restore();

          // 2. Draw leading leg (y: 154 to 182)
          ctx.save();
          ctx.translate(leadX, 0);
          ctx.drawImage(img, 48, 154, 36, 28, 48, 154, 36, 28);
          ctx.restore();

          // 3. Draw upper body (head, shirt torso, shorts: y: 0 to 156)
          ctx.drawImage(img, 0, 0, w, 156, 0, 0, w, 156);

          // 4. Clean shorts cuffs to seal leg tops naturally
          ctx.drawImage(img, 48, 146, 36, 10, 48, 146, 36, 10);

          // 5. Arm swing with clean pivot at shoulder (x: 58, y: 108)
          // Clipped to the upper body contour so no color can ever spill outside the back!
          if (armTiltDeg !== 0) {
            ctx.save();
            // Rotate arm with clean pivot
            ctx.translate(58, 108);
            ctx.rotate((armTiltDeg * Math.PI) / 180);
            ctx.drawImage(img, 48, 106, 22, 42, -10, -2, 22, 42);
            ctx.restore();
          }

          // Clean any pixels outside base character's vertical envelope
          const fData = ctx.getImageData(0, 0, w, h);
          // Mask against original silhouette boundary
          const origCanvas = document.createElement('canvas');
          origCanvas.width = w;
          origCanvas.height = h;
          const origCtx = origCanvas.getContext('2d');
          origCtx.drawImage(img, 0, 0);
          const oData = origCtx.getImageData(0, 0, w, h).data;

          for (let y = 0; y < 154; y++) {
            for (let x = 0; x < w; x++) {
              const p = (y * w + x) * 4;
              // In upper body (y < 154), strictly preserve original silhouette edge
              if (oData[p + 3] === 0) {
                fData.data[p + 3] = 0;
              }
            }
          }

          ctx.putImageData(fData, 0, 0);
          return c.toDataURL('image/png');
        }

        const walk1 = renderFrame(3.5, -3, -5);
        const walk2 = renderFrame(-3, 3.5, 5);

        resolve({ walk1, walk2 });
      };
      img.src = '${uri}';
    })
  `);

  function save(dataUrl, file) {
    fs.writeFileSync(path.join(__dirname, 'src', 'renderer', file), dataUrl.replace(/^data:image\/png;base64,/, ''), 'base64');
  }

  save(frames.walk1, 'pico-side-walk-1.png');
  save(frames.walk2, 'pico-side-walk-2.png');
  console.log('Saved masked walk1 and walk2');
  app.quit();
  process.exit(0);
});
