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

        // Base image canvas
        const cBase = document.createElement('canvas');
        cBase.width = w;
        cBase.height = h;
        const ctxBase = cBase.getContext('2d');
        ctxBase.drawImage(img, 0, 0);
        const baseData = ctxBase.getImageData(0, 0, w, h).data;

        // 1. Armless Torso:
        // We only modify pixels INSIDE the character silhouette (baseData[p+3] > 0)
        // In the arm region (x: 48..68, y: 108..152)
        const cTorso = document.createElement('canvas');
        cTorso.width = w;
        cTorso.height = h;
        const ctxTorso = cTorso.getContext('2d');
        ctxTorso.drawImage(img, 0, 0);
        const tImgData = ctxTorso.getImageData(0, 0, w, h);
        const td = tImgData.data;

        for (let y = 108; y <= 135; y++) {
          // Find actual back of shirt on this line
          let minX = w, maxX = 0;
          for (let x = 30; x < 75; x++) {
            if (baseData[(y * w + x) * 4 + 3] > 50) {
              if (x < minX) minX = x;
              if (x > maxX) maxX = x;
            }
          }
          if (minX < maxX) {
            // Sample shirt color from near back and near front
            const backX = Math.min(minX + 8, 48);
            const frontX = Math.max(maxX - 4, 68);
            const lP = (y * w + backX) * 4;
            const rP = (y * w + frontX) * 4;
            const rL = baseData[lP], gL = baseData[lP+1], bL = baseData[lP+2];
            const rR = baseData[rP], gR = baseData[rP+1], bR = baseData[rP+2];

            // Infill arm region (x: 48..66)
            for (let x = 48; x <= 66; x++) {
              const p = (y * w + x) * 4;
              if (baseData[p + 3] > 0) {
                const t = (x - 48) / 18;
                td[p] = Math.round(rL * (1 - t) + rR * t);
                td[p+1] = Math.round(gL * (1 - t) + gR * t);
                td[p+2] = Math.round(bL * (1 - t) + bR * t);
                td[p+3] = 255;
              }
            }
          }
        }

        // Infill shorts in arm region (y: 136..155)
        for (let y = 136; y <= 155; y++) {
          let minX = w, maxX = 0;
          for (let x = 30; x < 75; x++) {
            if (baseData[(y * w + x) * 4 + 3] > 50) {
              if (x < minX) minX = x;
              if (x > maxX) maxX = x;
            }
          }
          if (minX < maxX) {
            const backX = Math.min(minX + 6, 44);
            const frontX = Math.max(maxX - 4, 68);
            const lP = (y * w + backX) * 4;
            const rP = (y * w + frontX) * 4;
            const rL = baseData[lP], gL = baseData[lP+1], bL = baseData[lP+2];
            const rR = baseData[rP], gR = baseData[rP+1], bR = baseData[rP+2];

            for (let x = 46; x <= 64; x++) {
              const p = (y * w + x) * 4;
              if (baseData[p + 3] > 0) {
                const t = (x - 46) / 18;
                td[p] = Math.round(rL * (1 - t) + rR * t);
                td[p+1] = Math.round(gL * (1 - t) + gR * t);
                td[p+2] = Math.round(bL * (1 - t) + bR * t);
                td[p+3] = 255;
              }
            }
          }
        }

        // Clear legs on torso canvas (y >= 156)
        for (let y = 156; y < h; y++) {
          for (let x = 0; x < w; x++) {
            td[(y * w + x) * 4 + 3] = 0;
          }
        }
        ctxTorso.putImageData(tImgData, 0, 0);

        // 2. Extract Arm
        const cArm = document.createElement('canvas');
        cArm.width = 28;
        cArm.height = 48;
        const ctxArm = cArm.getContext('2d');
        ctxArm.drawImage(img, 46, 106, 26, 46, 0, 0, 26, 46);

        // 3. Extract Leg & Shoe
        const cLeg = document.createElement('canvas');
        cLeg.width = 32;
        cLeg.height = 30;
        const ctxLeg = cLeg.getContext('2d');
        ctxLeg.drawImage(img, 43, 154, 30, 28, 0, 0, 30, 28);

        // 4. Stride Frame Renderer
        function renderStride({
          leadLegX,
          trailLegX,
          trailHeelLiftDeg,
          leadArmDeg,
          trailArmDeg,
          torsoLeanDeg = 0.6
        }) {
          const c = document.createElement('canvas');
          c.width = w;
          c.height = h;
          const ctx = c.getContext('2d');
          ctx.imageSmoothingEnabled = true;
          ctx.imageSmoothingQuality = 'high';

          // A. Trailing Leg (Behind body)
          ctx.save();
          ctx.filter = 'brightness(0.82) saturate(0.92)';
          ctx.translate(52 + trailLegX, 154);
          ctx.rotate((-8 * Math.PI) / 180);
          ctx.drawImage(cLeg, 0, 0, 20, 16, -6, 0, 20, 16);
          ctx.restore();

          // Trailing shoe (pivoting around toe at y=181)
          ctx.save();
          ctx.filter = 'brightness(0.84) saturate(0.92)';
          ctx.translate(54 + trailLegX, 181);
          ctx.rotate((trailHeelLiftDeg * Math.PI) / 180);
          ctx.drawImage(cLeg, 0, 14, 30, 14, -11, -14, 30, 14);
          ctx.restore();

          // B. Trailing Arm (Behind torso)
          if (trailArmDeg !== 0) {
            ctx.save();
            ctx.filter = 'brightness(0.80) saturate(0.88)';
            ctx.translate(56, 110);
            ctx.rotate((trailArmDeg * Math.PI) / 180);
            ctx.drawImage(cArm, -10, -2);
            ctx.restore();
          }

          // C. Armless Torso & Head (pivoting around waist x: 56, y: 140)
          ctx.save();
          ctx.translate(56, 140);
          ctx.rotate((torsoLeanDeg * Math.PI) / 180);
          ctx.drawImage(cTorso, -56, -140);
          ctx.restore();

          // D. Leading Leg (In front)
          ctx.save();
          ctx.translate(56 + leadLegX, 154);
          ctx.rotate((6 * Math.PI) / 180);
          ctx.drawImage(cLeg, 0, 0, 20, 16, -6, 0, 20, 16);
          ctx.restore();

          // Leading shoe: planted flat on ground baseline (sole at y=181)
          ctx.save();
          ctx.translate(leadLegX, 0);
          ctx.drawImage(cLeg, 0, 14, 30, 14, 43, 168, 30, 14);
          ctx.restore();

          // E. Shorts cuffs overlap (sealing leg tops inside shorts)
          ctx.save();
          ctx.translate(56, 140);
          ctx.rotate((torsoLeanDeg * Math.PI) / 180);
          ctx.drawImage(img, 38, 146, 38, 11, -18, 6, 38, 11);
          ctx.restore();

          // F. Leading Arm (In front of torso)
          ctx.save();
          ctx.translate(56, 140);
          ctx.rotate((torsoLeanDeg * Math.PI) / 180);
          ctx.translate(2, -32);
          ctx.rotate((leadArmDeg * Math.PI) / 180);
          ctx.drawImage(cArm, -10, -2);
          ctx.restore();

          // Mask strictly against original silhouette outline so NO pixels spill beyond character's natural width
          const fData = ctx.getImageData(0, 0, w, h);
          for (let y = 0; y < 154; y++) {
            for (let x = 0; x < w; x++) {
              const p = (y * w + x) * 4;
              // If outside character's head/hair silhouette, clear
              if (y < 105 && baseData[p + 3] === 0) {
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

        // Frame 1: Right foot lead (+7px, planted flat), Left foot trail (-6px, heel lifted -14 deg), Right arm forward (-11 deg), Left arm back (+8 deg)
        const walk1 = renderStride({
          leadLegX: 6.8,
          trailLegX: -5.8,
          trailHeelLiftDeg: -14,
          leadArmDeg: -11,
          trailArmDeg: 8,
          torsoLeanDeg: 0.6
        });

        // Frame 2: Left foot lead (+7px, planted flat), Right foot trail (-6px, heel lifted -14 deg), Left arm forward (+8 deg), Right arm back (-10 deg)
        const walk2 = renderStride({
          leadLegX: 6.2,
          trailLegX: -6.2,
          trailHeelLiftDeg: -14,
          leadArmDeg: 8,
          trailArmDeg: -10,
          torsoLeanDeg: 0.6
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
            ctxC.fillText('Step 1 (Right Plant, Left Lift)', 135, 202);
            ctxC.fillText('Step 2 (Left Plant, Right Lift)', 265, 202);

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

  fs.writeFileSync(path.join(__dirname, 'refined-authoritative-preview-v3.png'), result.preview.replace(/^data:image\/png;base64,/, ''), 'base64');
  fs.writeFileSync(path.join(__dirname, 'clean-walk1.png'), result.walk1.replace(/^data:image\/png;base64,/, ''), 'base64');
  fs.writeFileSync(path.join(__dirname, 'clean-walk2.png'), result.walk2.replace(/^data:image\/png;base64,/, ''), 'base64');
  console.log('Saved refined-authoritative-preview-v3.png');
  app.quit();
});
