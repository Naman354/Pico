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

        const cBase = document.createElement('canvas');
        cBase.width = w;
        cBase.height = h;
        const ctxBase = cBase.getContext('2d');
        ctxBase.drawImage(img, 0, 0);
        const baseData = ctxBase.getImageData(0, 0, w, h).data;

        // 1. Solid Torso Canvas (Head, Shirt, Shorts - NO legs, NO front arm)
        const cTorso = document.createElement('canvas');
        cTorso.width = w;
        cTorso.height = h;
        const ctxTorso = cTorso.getContext('2d');
        ctxTorso.drawImage(img, 0, 0);
        const tImgData = ctxTorso.getImageData(0, 0, w, h);
        const td = tImgData.data;

        // Infill arm region with clean shirt (y: 108..135)
        for (let y = 108; y <= 135; y++) {
          let minX = w, maxX = 0;
          for (let x = 30; x < 75; x++) {
            if (baseData[(y * w + x) * 4 + 3] > 50) {
              if (x < minX) minX = x;
              if (x > maxX) maxX = x;
            }
          }
          if (minX < maxX) {
            const backX = Math.min(minX + 8, 48);
            const frontX = Math.max(maxX - 4, 68);
            const lP = (y * w + backX) * 4;
            const rP = (y * w + frontX) * 4;
            const rL = baseData[lP], gL = baseData[lP+1], bL = baseData[lP+2];
            const rR = baseData[rP], gR = baseData[rP+1], bR = baseData[rP+2];

            for (let x = 46; x <= 66; x++) {
              const p = (y * w + x) * 4;
              if (baseData[p + 3] > 0) {
                const t = (x - 46) / 20;
                td[p] = Math.round(rL * (1 - t) + rR * t);
                td[p+1] = Math.round(gL * (1 - t) + gR * t);
                td[p+2] = Math.round(bL * (1 - t) + bR * t);
                td[p+3] = 255;
              }
            }
          }
        }

        // Infill arm region with clean shorts (y: 136..156)
        for (let y = 136; y <= 156; y++) {
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

            for (let x = 44; x <= 68; x++) {
              const p = (y * w + x) * 4;
              if (baseData[p + 3] > 0) {
                const t = (x - 44) / 24;
                td[p] = Math.round(rL * (1 - t) + rR * t);
                td[p+1] = Math.round(gL * (1 - t) + gR * t);
                td[p+2] = Math.round(bL * (1 - t) + bR * t);
                td[p+3] = 255;
              }
            }
          }
        }

        // Fill solid shorts bottom at y: 154..157 across x: 42..70
        for (let y = 154; y <= 157; y++) {
          for (let x = 42; x <= 70; x++) {
            const p = (y * w + x) * 4;
            if (baseData[p + 3] > 0 || (x >= 45 && x <= 68)) {
              td[p] = 235;
              td[p+1] = 140;
              td[p+2] = 110;
              td[p+3] = 255;
            }
          }
        }

        // Clear legs only below y >= 158
        for (let y = 158; y < h; y++) {
          for (let x = 0; x < w; x++) {
            td[(y * w + x) * 4 + 3] = 0;
          }
        }
        ctxTorso.putImageData(tImgData, 0, 0);

        // 2. Extract Arm (x: 46..72, y: 106..152)
        const cArm = document.createElement('canvas');
        cArm.width = 28;
        cArm.height = 48;
        const ctxArm = cArm.getContext('2d');
        ctxArm.drawImage(img, 46, 106, 26, 46, 0, 0, 26, 46);

        // 3. Extract Authentic Leg & Shoe (y: 154..181, x: 42..74)
        const cLeg = document.createElement('canvas');
        cLeg.width = 34;
        cLeg.height = 30;
        const ctxLeg = cLeg.getContext('2d');
        ctxLeg.drawImage(img, 42, 154, 32, 28, 0, 0, 32, 28);

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

          // A. Trailing Arm (Behind torso)
          if (trailArmDeg !== 0) {
            ctx.save();
            ctx.filter = 'brightness(0.80) saturate(0.88)';
            ctx.translate(56, 110);
            ctx.rotate((trailArmDeg * Math.PI) / 180);
            ctx.drawImage(cArm, -10, -2);
            ctx.restore();
          }

          // B. Trailing Leg & Shoe (Behind torso/shorts)
          ctx.save();
          ctx.filter = 'brightness(0.80) saturate(0.90)';
          // Pivot around toe at ground baseline (52 + trailLegX, 181)
          ctx.translate(52 + trailLegX, 181);
          ctx.rotate((trailHeelLiftDeg * Math.PI) / 180);
          // Draw authentic leg and shoe from cLeg
          ctx.drawImage(cLeg, -10, -27);
          ctx.restore();

          // C. Armless Torso & Head & Shorts (pivoting around waist x: 56, y: 140)
          ctx.save();
          ctx.translate(56, 140);
          ctx.rotate((torsoLeanDeg * Math.PI) / 180);
          ctx.drawImage(cTorso, -56, -140);

          // Draw rear shorts cuff accent
          ctx.fillStyle = '#C46042';
          ctx.beginPath();
          ctx.ellipse(-7 + (trailLegX * 0.35), 16, 7, 3.5, (-6 * Math.PI) / 180, 0, Math.PI * 2);
          ctx.fill();

          // Draw front shorts cuff accent
          ctx.fillStyle = '#EB8C6E';
          ctx.beginPath();
          ctx.ellipse(3 + (leadLegX * 0.35), 16, 8, 4, (6 * Math.PI) / 180, 0, Math.PI * 2);
          ctx.fill();
          ctx.restore();

          // D. Leading Leg & Shoe (In front, grounded flat on taskbar)
          ctx.save();
          ctx.translate(leadLegX, 0);
          ctx.drawImage(cLeg, 42, 154);
          ctx.restore();

          // E. Front shorts cuff overlap over leading leg top (so leading leg top nests inside shorts)
          ctx.save();
          ctx.translate(56, 140);
          ctx.rotate((torsoLeanDeg * Math.PI) / 180);
          ctx.drawImage(img, 42, 146, 32, 11, -14, 6, 32, 11);
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
              if (y < 105 && baseData[p + 3] === 0) {
                fData.data[p + 3] = 0;
              }
            }
          }
          // Clamp bottom ground line to y <= 181
          for (let y = 182; y < h; y++) {
            for (let x = 0; x < w; x++) {
              fData.data[(y * w + x) * 4 + 3] = 0;
            }
          }
          ctx.putImageData(fData, 0, 0);

          return c.toDataURL('image/png');
        }

        // Frame 1: Right foot lead (+6.8px, planted flat), Left foot trail (-5.8px, heel lifted -14 deg), Right arm forward (-11 deg), Left arm back (+8 deg)
        const walk1 = renderStride({
          leadLegX: 6.8,
          trailLegX: -5.8,
          trailHeelLiftDeg: -14,
          leadArmDeg: -11,
          trailArmDeg: 8,
          torsoLeanDeg: 0.6
        });

        // Frame 2: Left foot lead (+6.8px, planted flat), Right foot trail (-5.8px, heel lifted -14 deg), Left arm forward (+8 deg), Right arm back (-10 deg)
        const walk2 = renderStride({
          leadLegX: 6.2,
          trailLegX: -6.0,
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

  fs.writeFileSync(path.join(__dirname, 'refined-authoritative-preview-v6.png'), result.preview.replace(/^data:image\/png;base64,/, ''), 'base64');
  fs.writeFileSync(path.join(__dirname, 'src', 'renderer', 'pico-side-walk-1.png'), result.walk1.replace(/^data:image\/png;base64,/, ''), 'base64');
  fs.writeFileSync(path.join(__dirname, 'src', 'renderer', 'pico-side-walk-2.png'), result.walk2.replace(/^data:image\/png;base64,/, ''), 'base64');
  console.log('Saved refined-authoritative-preview-v6.png and updated walk frames in src/renderer');
  app.quit();
});
