const { app, BrowserWindow } = require('electron');
const path = require('path');
const fs = require('fs');

app.whenReady().then(async () => {
  const win = new BrowserWindow({ show: false });
  await win.loadURL('about:blank');

  const base64 = fs.readFileSync(path.join(__dirname, 'src', 'renderer', 'pico-side-stand.png')).toString('base64');
  const uri = 'data:image/png;base64,' + base64;

  const result = await win.webContents.executeJavaScript(`
    new Promise((resolve) => {
      const img = new Image();
      img.onload = () => {
        const w = img.width;
        const h = img.height;

        // Base image canvas
        const cBase = document.createElement('canvas');
        cBase.width = w;
        cBase.height = h;
        const ctxBase = cBase.getContext('2d');
        ctxBase.drawImage(img, 0, 0);

        // Helper to render walk frames:
        // isStep1: true = right leg forward, left leg back; false = left leg forward, right leg back
        function buildWalkFrame(isStep1) {
          const c = document.createElement('canvas');
          c.width = w;
          c.height = h;
          const ctx = c.getContext('2d');
          ctx.imageSmoothingEnabled = true;
          ctx.imageSmoothingQuality = 'high';

          // Parameters:
          // Lead leg offset forward: +7px
          // Trailing leg offset back: -6px
          // Trailing heel lift angle: -14 degrees (rotates heel up, toe stays grounded)
          const leadOffset = isStep1 ? 7.5 : 7.0;
          const trailOffset = isStep1 ? -6.5 : -6.0;
          const leadArmRot = isStep1 ? -11 : 8;
          const trailArmRot = isStep1 ? 7 : -9;

          // 1. Draw Trailing Leg (BEHIND upper body and shorts)
          ctx.save();
          // Darken trailing leg for depth
          ctx.filter = 'brightness(0.86) saturate(0.95)';
          
          // Trailing leg pivot at hip (x: 54, y: 154)
          ctx.translate(54 + trailOffset, 154);
          // Angle trailing leg backwards slightly
          ctx.rotate((-8 * Math.PI) / 180);
          // Draw leg from y: 154 to 170
          ctx.drawImage(img, 46, 154, 22, 16, -8, 0, 22, 16);
          ctx.restore();

          // Trailing shoe with heel lift (pivoting around toe at y=181)
          ctx.save();
          ctx.filter = 'brightness(0.88) saturate(0.95)';
          // Heel lifted: pivot near ball/toe of foot
          ctx.translate(56 + trailOffset, 181);
          ctx.rotate((-13 * Math.PI) / 180);
          ctx.drawImage(img, 43, 168, 30, 14, -13, -13, 30, 14);
          ctx.restore();

          // 2. Draw Rear Arm (swinging opposite to lead arm)
          ctx.save();
          ctx.filter = 'brightness(0.85) saturate(0.9)';
          ctx.translate(56, 110);
          ctx.rotate((trailArmRot * Math.PI) / 180);
          ctx.drawImage(img, 46, 106, 20, 44, -10, -2, 20, 44);
          ctx.restore();

          // 3. Draw Upper Body (Head & Shirt: y: 0 to 135)
          // Subtle natural lean of ~0.8 degrees forward
          ctx.save();
          ctx.translate(56, 140);
          ctx.rotate((0.8 * Math.PI) / 180);
          ctx.drawImage(img, 0, 0, w, 136, -56, -140, w, 136);
          ctx.restore();

          // 4. Draw Shorts (y: 135 to 156)
          ctx.drawImage(img, 36, 135, 42, 21, 36, 135, 42, 21);

          // 5. Draw Leading Leg (IN FRONT)
          ctx.save();
          // Leading leg extends forward from hip
          ctx.translate(56 + leadOffset, 154);
          ctx.rotate((6 * Math.PI) / 180);
          ctx.drawImage(img, 46, 154, 22, 16, -8, 0, 22, 16);
          ctx.restore();

          // Leading shoe: firmly planted flat on ground baseline (sole at y=181)
          ctx.save();
          ctx.translate(leadOffset, 0);
          ctx.drawImage(img, 43, 168, 30, 14, 43, 168, 30, 14);
          ctx.restore();

          // 6. Draw Clean Shorts Cuff (y: 148 to 157) so shorts naturally overlap both leg tops
          ctx.drawImage(img, 38, 146, 40, 11, 38, 146, 40, 11);

          // 7. Draw Leading Arm (in front of torso)
          // Clear base arm area under shirt if needed, or draw shirt patch then arm
          ctx.save();
          // Draw shirt sleeve & side
          ctx.drawImage(img, 44, 106, 16, 32, 44, 106, 16, 32);
          // Rotate front arm around shoulder (x: 58, y: 108)
          ctx.translate(58, 108);
          ctx.rotate((leadArmRot * Math.PI) / 180);
          ctx.drawImage(img, 46, 106, 22, 46, -12, -2, 22, 46);
          ctx.restore();

          // Ensure bottom-most pixels do not exceed y=181
          const frameData = ctx.getImageData(0, 0, w, h);
          for (let y = 182; y < h; y++) {
            for (let x = 0; x < w; x++) {
              frameData.data[(y * w + x) * 4 + 3] = 0;
            }
          }
          ctx.putImageData(frameData, 0, 0);

          return c.toDataURL('image/png');
        }

        const walk1 = buildWalkFrame(true);
        const walk2 = buildWalkFrame(false);

        // Preview comparison canvas
        const cPreview = document.createElement('canvas');
        cPreview.width = 400;
        cPreview.height = 220;
        const pCtx = cPreview.getContext('2d');
        pCtx.fillStyle = '#1e293b';
        pCtx.fillRect(0, 0, 400, 182);
        pCtx.fillStyle = '#0f172a';
        pCtx.fillRect(0, 182, 400, 38);

        // Taskbar ground baseline (y = 181.5)
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
            pCtx.fillText('Step 1 (Lead R, Lift L)', 145, 202);
            pCtx.fillText('Step 2 (Lead L, Lift R)', 275, 202);

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

  fs.writeFileSync(path.join(__dirname, 'test-walk-preview.png'), result.preview.replace(/^data:image\/png;base64,/, ''), 'base64');
  console.log('Saved test-walk-preview.png');
  app.quit();
});
