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

        function createWalkFrame({
          leadLegX = 7,
          trailLegX = -6,
          trailHeelLiftDeg = -13,
          leadArmDeg = -10,
          trailArmDeg = 8,
          bodyTiltDeg = 0.8,
          bodyDipY = 0
        }) {
          const c = document.createElement('canvas');
          c.width = w;
          c.height = h;
          const ctx = c.getContext('2d');
          ctx.imageSmoothingEnabled = true;
          ctx.imageSmoothingQuality = 'high';

          // 1. Draw Trailing Leg (BEHIND torso & shorts)
          ctx.save();
          // Trailing leg shadow filter
          ctx.filter = 'brightness(0.82) saturate(0.92)';
          
          // Trailing leg upper segment (under shorts at y: 154)
          ctx.translate(52 + trailLegX, 154 + bodyDipY);
          ctx.rotate((-6 * Math.PI) / 180);
          ctx.drawImage(img, 46, 154, 20, 16, -10, 0, 20, 16);
          ctx.restore();

          // Trailing shoe with heel lift (pivots near toe at y=181)
          ctx.save();
          ctx.filter = 'brightness(0.84) saturate(0.92)';
          ctx.translate(54 + trailLegX, 181);
          ctx.rotate((trailHeelLiftDeg * Math.PI) / 180);
          ctx.drawImage(img, 43, 168, 30, 14, -12, -13, 30, 14);
          ctx.restore();

          // 2. Draw Trailing Arm (BEHIND torso)
          if (trailArmDeg !== 0) {
            ctx.save();
            ctx.filter = 'brightness(0.80) saturate(0.88)';
            ctx.translate(56, 108 + bodyDipY);
            ctx.rotate((trailArmDeg * Math.PI) / 180);
            ctx.drawImage(img, 48, 106, 20, 44, -10, -2, 20, 44);
            ctx.restore();
          }

          // 3. Draw Solid Torso & Head (Head y: 0 to 105, Shirt y: 105 to 135)
          ctx.save();
          ctx.translate(56, 140);
          ctx.rotate((bodyTiltDeg * Math.PI) / 180);
          // Draw head
          ctx.drawImage(img, 0, 0, w, 108, -56, -140 + bodyDipY, w, 108);

          // Draw shirt with solid fill behind old arm so no gaps appear
          ctx.drawImage(img, 0, 108, w, 28, -56, -140 + 108 + bodyDipY, w, 28);
          // Fill shirt area behind arm
          const shirtGrad = ctx.createLinearGradient(-15, -140 + 108 + bodyDipY, 15, -140 + 136 + bodyDipY);
          shirtGrad.addColorStop(0, '#759965');
          shirtGrad.addColorStop(1, '#688C59');
          ctx.fillStyle = shirtGrad;
          ctx.beginPath();
          ctx.ellipse(2, -140 + 124 + bodyDipY, 8, 12, 0, 0, Math.PI * 2);
          ctx.fill();

          // Draw shorts base (y: 135 to 156)
          const shortsGrad = ctx.createLinearGradient(-15, -140 + 136 + bodyDipY, 15, -140 + 156 + bodyDipY);
          shortsGrad.addColorStop(0, '#EB8C6E');
          shortsGrad.addColorStop(1, '#DC785A');
          ctx.fillStyle = shortsGrad;
          ctx.beginPath();
          ctx.ellipse(1, -140 + 145 + bodyDipY, 10, 8, 0, 0, Math.PI * 2);
          ctx.fill();
          ctx.restore();

          // 4. Draw Leading Leg (IN FRONT of torso/shorts back, but under shorts cuff)
          ctx.save();
          ctx.translate(56 + leadLegX, 154 + bodyDipY);
          ctx.rotate((6 * Math.PI) / 180);
          ctx.drawImage(img, 46, 154, 20, 16, -10, 0, 20, 16);
          ctx.restore();

          // Leading shoe: firmly planted flat on ground baseline (y=181)
          ctx.save();
          ctx.translate(leadLegX, 0);
          ctx.drawImage(img, 43, 168, 30, 14, 43, 168, 30, 14);
          ctx.restore();

          // 5. Draw Shorts Overlap & Cuffs (y: 135 to 157)
          ctx.save();
          ctx.translate(56, 140);
          ctx.rotate((bodyTiltDeg * Math.PI) / 180);
          // Draw shorts contour from original image
          ctx.drawImage(img, 36, 135, 42, 22, -20, -140 + 135 + bodyDipY, 42, 22);
          ctx.restore();

          // 6. Draw Leading Arm (in front of torso)
          ctx.save();
          ctx.translate(56, 140);
          ctx.rotate((bodyTiltDeg * Math.PI) / 180);
          // Shoulder pivot at relative (2, -32) = absolute (58, 108)
          ctx.translate(2, -32 + bodyDipY);
          ctx.rotate((leadArmDeg * Math.PI) / 180);
          ctx.drawImage(img, 46, 106, 22, 46, -12, -2, 22, 46);
          ctx.restore();

          // Clamp ground bounds to maxY = 181
          const fData = ctx.getImageData(0, 0, w, h);
          for (let y = 182; y < h; y++) {
            for (let x = 0; x < w; x++) {
              fData.data[(y * w + x) * 4 + 3] = 0;
            }
          }
          ctx.putImageData(fData, 0, 0);

          return c.toDataURL('image/png');
        }

        // Walk Step 1: Right leg forward (+7px), Left leg back (-6px, heel lift -14 deg), Right arm forward (-11 deg), Left arm back (+8 deg)
        const walk1 = createWalkFrame({
          leadLegX: 7.5,
          trailLegX: -6.0,
          trailHeelLiftDeg: -14,
          leadArmDeg: -11,
          trailArmDeg: 8,
          bodyTiltDeg: 0.9,
          bodyDipY: 0
        });

        // Walk Step 2: Left leg forward (+7px), Right leg back (-6px, heel lift -14 deg), Left arm forward (+8 deg relative front), Right arm back (-10 deg)
        const walk2 = createWalkFrame({
          leadLegX: 6.8,
          trailLegX: -6.5,
          trailHeelLiftDeg: -14,
          leadArmDeg: 9,
          trailArmDeg: -10,
          bodyTiltDeg: 0.9,
          bodyDipY: 0
        });

        // Preview canvas
        const cPreview = document.createElement('canvas');
        cPreview.width = 400;
        cPreview.height = 220;
        const pCtx = cPreview.getContext('2d');
        pCtx.fillStyle = '#1e293b';
        pCtx.fillRect(0, 0, 400, 182);
        pCtx.fillStyle = '#0f172a';
        pCtx.fillRect(0, 182, 400, 38);

        pCtx.strokeStyle = '#ef4444';
        pCtx.lineWidth = 1;
        pCtx.beginPath();
        pCtx.moveTo(0, 181.5);
        pCtx.lineTo(400, 181.5);
        pCtx.stroke();

        const img1 = new Image();
        const img2 = new Image();
        let loaded = 0;
        function finish() {
          loaded++;
          if (loaded === 2) {
            pCtx.drawImage(img, 10, 0);
            pCtx.drawImage(img1, 140, 0);
            pCtx.drawImage(img2, 270, 0);

            pCtx.fillStyle = '#ffffff';
            pCtx.font = '12px sans-serif';
            pCtx.fillText('Stand / Passing', 20, 202);
            pCtx.fillText('Step 1 (Right Lead, Left Lift)', 140, 202);
            pCtx.fillText('Step 2 (Left Lead, Right Lift)', 270, 202);

            resolve({
              walk1,
              walk2,
              preview: cPreview.toDataURL('image/png')
            });
          }
        }
        img1.onload = finish;
        img2.onload = finish;
        img1.src = walk1;
        img2.src = walk2;
      };
      img.src = '${uri}';
    })
  `);

  fs.writeFileSync(path.join(__dirname, 'refined-walk-preview-2.png'), result.preview.replace(/^data:image\/png;base64,/, ''), 'base64');
  fs.writeFileSync(path.join(__dirname, 'temp-walk1.png'), result.walk1.replace(/^data:image\/png;base64,/, ''), 'base64');
  fs.writeFileSync(path.join(__dirname, 'temp-walk2.png'), result.walk2.replace(/^data:image\/png;base64,/, ''), 'base64');
  console.log('Saved refined-walk-preview-2.png');
  app.quit();
});
