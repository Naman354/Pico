const { app, BrowserWindow } = require('electron');
const path = require('path');
const fs = require('fs');

app.whenReady().then(async () => {
  const win = new BrowserWindow({ show: false });
  await win.loadURL('about:blank');

  const b64 = fs.readFileSync(path.join(__dirname, 'src', 'renderer', 'pico-side-stand.png')).toString('base64');
  const uri = 'data:image/png;base64,' + b64;

  const result = await win.webContents.executeJavaScript(`
    new Promise((resolve) => {
      const img = new Image();
      img.onload = () => {
        const w = img.width;
        const h = img.height;

        function renderFrame({
          leadOffset = 6.5,
          trailOffset = -5.5,
          trailHeelLiftDeg = -13,
          leadArmDeg = -10,
          trailArmDeg = 8,
          torsoTiltDeg = 0.5
        }) {
          const c = document.createElement('canvas');
          c.width = w;
          c.height = h;
          const ctx = c.getContext('2d');
          ctx.imageSmoothingEnabled = true;
          ctx.imageSmoothingQuality = 'high';

          // 1. Trailing Arm (Behind torso)
          if (trailArmDeg !== 0) {
            ctx.save();
            ctx.filter = 'brightness(0.82) saturate(0.9)';
            ctx.translate(56, 110);
            ctx.rotate((trailArmDeg * Math.PI) / 180);
            ctx.drawImage(img, 46, 106, 22, 44, -10, -2, 22, 44);
            ctx.restore();
          }

          // 2. Trailing Leg (Behind torso & shorts)
          ctx.save();
          // Darken trailing leg for depth
          ctx.filter = 'brightness(0.80) saturate(0.92)';
          // Trailing leg connects at hip (x: 52 + trailOffset, y: 154)
          // Draw upper leg segment
          ctx.save();
          ctx.translate(trailOffset * 0.8, 0);
          ctx.beginPath();
          ctx.rect(34, 154, 28, 16);
          ctx.clip();
          ctx.drawImage(img, 0, 0);
          ctx.restore();

          // Trailing shoe with heel lifted (pivoting around toe at y=181)
          ctx.save();
          ctx.translate(54 + trailOffset, 181);
          ctx.rotate((trailHeelLiftDeg * Math.PI) / 180);
          ctx.drawImage(img, 43, 168, 30, 14, -11, -13, 30, 14);
          ctx.restore();
          ctx.restore();

          // 3. Head & Torso with slight casual tilt (y: 0 to 135)
          ctx.save();
          ctx.translate(56, 140);
          ctx.rotate((torsoTiltDeg * Math.PI) / 180);
          ctx.drawImage(img, 0, 0, w, 136, -56, -140, w, 136);

          // 4. Shorts body (y: 135 to 156)
          ctx.drawImage(img, 0, 135, w, 22, -56, -5, w, 22);
          ctx.restore();

          // 5. Leading Leg (In front, grounded flat on taskbar)
          ctx.save();
          ctx.translate(leadOffset, 0);
          ctx.beginPath();
          ctx.rect(46, 154, 36, 28);
          ctx.clip();
          ctx.drawImage(img, 0, 0);
          ctx.restore();

          // 6. Clean Shorts Cuffs Overlap (y: 146 to 157)
          ctx.save();
          ctx.translate(56, 140);
          ctx.rotate((torsoTiltDeg * Math.PI) / 180);
          ctx.drawImage(img, 38, 146, 36, 11, -18, 6, 36, 11);
          ctx.restore();

          // 7. Leading Arm (In front of torso)
          // First fill small shirt circle behind shoulder so rotating doesn't leave gaps
          ctx.save();
          ctx.translate(56, 140);
          ctx.rotate((torsoTiltDeg * Math.PI) / 180);
          ctx.fillStyle = '#6E976A';
          ctx.beginPath();
          ctx.ellipse(2, -14, 6, 12, 0, 0, Math.PI * 2);
          ctx.fill();

          // Rotate front arm around shoulder
          ctx.translate(2, -32);
          ctx.rotate((leadArmDeg * Math.PI) / 180);
          ctx.drawImage(img, 46, 106, 22, 46, -10, -2, 22, 46);
          ctx.restore();

          // Mask strictly against original silhouette boundary
          const fData = ctx.getImageData(0, 0, w, h);
          const origCanvas = document.createElement('canvas');
          origCanvas.width = w;
          origCanvas.height = h;
          const oCtx = origCanvas.getContext('2d');
          oCtx.drawImage(img, 0, 0);
          const oData = oCtx.getImageData(0, 0, w, h).data;

          for (let y = 0; y < 154; y++) {
            for (let x = 0; x < w; x++) {
              const p = (y * w + x) * 4;
              if (oData[p + 3] === 0) {
                fData.data[p + 3] = 0;
              }
            }
          }
          // Clamp bottom ground line
          for (let y = 182; y < h; y++) {
            for (let x = 0; x < w; x++) {
              fData.data[(y * w + x) * 4 + 3] = 0;
            }
          }
          ctx.putImageData(fData, 0, 0);

          return c.toDataURL('image/png');
        }

        // Frame 1: Right leg forward (+6.5px), Left leg back (-5.5px, heel lift -13 deg), Right arm forward (-10 deg), Left arm back (+8 deg)
        const walk1 = renderFrame({
          leadOffset: 6.5,
          trailOffset: -5.5,
          trailHeelLiftDeg: -13,
          leadArmDeg: -10,
          trailArmDeg: 8,
          torsoTiltDeg: 0.5
        });

        // Frame 2: Left leg forward (+6.5px), Right leg back (-5.5px, heel lift -13 deg), Left arm forward (+8 deg relative front), Right arm back (-10 deg)
        const walk2 = renderFrame({
          leadOffset: 6.0,
          trailOffset: -6.0,
          trailHeelLiftDeg: -13,
          leadArmDeg: 8,
          trailArmDeg: -10,
          torsoTiltDeg: 0.5
        });

        // Comparison preview
        const cComp = document.createElement('canvas');
        cComp.width = 400;
        cComp.height = 220;
        const ctxC = cComp.getContext('2d');
        ctxC.fillStyle = '#1e293b';
        ctxC.fillRect(0, 0, 400, 182);
        ctxC.fillStyle = '#0f172a';
        ctxC.fillRect(0, 182, 400, 38);

        ctxC.strokeStyle = '#ef4444';
        ctxC.lineWidth = 1;
        ctxC.beginPath();
        ctxC.moveTo(0, 181.5);
        ctxC.lineTo(400, 181.5);
        ctxC.stroke();

        const imgW1 = new Image();
        const imgW2 = new Image();
        let loaded = 0;
        function done() {
          loaded++;
          if (loaded === 2) {
            ctxC.drawImage(img, 10, 0);
            ctxC.drawImage(imgW1, 140, 0);
            ctxC.drawImage(imgW2, 270, 0);

            ctxC.fillStyle = '#ffffff';
            ctxC.font = '12px sans-serif';
            ctxC.fillText('Stand / Passing', 20, 202);
            ctxC.fillText('Step 1 (Right Lead, Left Lift)', 135, 202);
            ctxC.fillText('Step 2 (Left Lead, Right Lift)', 265, 202);

            resolve({
              walk1,
              walk2,
              preview: cComp.toDataURL('image/png')
            });
          }
        }
        imgW1.onload = done;
        imgW2.onload = done;
        imgW1.src = walk1;
        imgW2.src = walk2;
      };
      img.src = '${uri}';
    })
  `);

  fs.writeFileSync(path.join(__dirname, 'perfect-walk-preview.png'), result.preview.replace(/^data:image\/png;base64,/, ''), 'base64');
  fs.writeFileSync(path.join(__dirname, 'src', 'renderer', 'pico-side-walk-1.png'), result.walk1.replace(/^data:image\/png;base64,/, ''), 'base64');
  fs.writeFileSync(path.join(__dirname, 'src', 'renderer', 'pico-side-walk-2.png'), result.walk2.replace(/^data:image\/png;base64,/, ''), 'base64');
  console.log('Saved perfect-walk-preview.png and updated walk frames in src/renderer');
  app.quit();
});
