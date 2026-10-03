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

        // 1. Build an Armless Torso canvas
        const cTorso = document.createElement('canvas');
        cTorso.width = w;
        cTorso.height = h;
        const ctxTorso = cTorso.getContext('2d');
        ctxTorso.drawImage(img, 0, 0);

        // Fill in the area where the arm sits (x: 48..68, y: 108..152) with clean shirt & shorts
        // Sample shirt color gradient from x: 42 and x: 72
        const imgData = ctxTorso.getImageData(0, 0, w, h);
        const d = imgData.data;

        // Smoothly interpolate shirt between back (x=44) and front (x=68) for y: 108..136
        for (let y = 108; y <= 135; y++) {
          const leftP = (y * w + 44) * 4;
          const rightP = (y * w + 68) * 4;
          const rL = d[leftP], gL = d[leftP+1], bL = d[leftP+2];
          const rR = d[rightP], gR = d[rightP+1], bR = d[rightP+2];
          for (let x = 45; x < 68; x++) {
            const t = (x - 44) / (68 - 44);
            const p = (y * w + x) * 4;
            // Only overwrite arm pixels (which have darker borders or skin tones)
            d[p] = Math.round(rL * (1 - t) + rR * t);
            d[p+1] = Math.round(gL * (1 - t) + gR * t);
            d[p+2] = Math.round(bL * (1 - t) + bR * t);
            d[p+3] = 255;
          }
        }

        // Smoothly interpolate shorts between back (x=42) and front (x=68) for y: 136..155
        for (let y = 136; y <= 155; y++) {
          const leftP = (y * w + 42) * 4;
          const rightP = (y * w + 68) * 4;
          const rL = d[leftP], gL = d[leftP+1], bL = d[leftP+2];
          const rR = d[rightP], gR = d[rightP+1], bR = d[rightP+2];
          for (let x = 43; x < 68; x++) {
            const t = (x - 42) / (68 - 42);
            const p = (y * w + x) * 4;
            d[p] = Math.round(rL * (1 - t) + rR * t);
            d[p+1] = Math.round(gL * (1 - t) + gR * t);
            d[p+2] = Math.round(bL * (1 - t) + bR * t);
            d[p+3] = 255;
          }
        }

        // Clear original legs and shoes on cTorso (y >= 156) so we can draw articulate legs cleanly
        for (let y = 156; y < h; y++) {
          for (let x = 0; x < w; x++) {
            d[(y * w + x) * 4 + 3] = 0;
          }
        }

        ctxTorso.putImageData(imgData, 0, 0);

        // 2. Extract Clean Front Arm
        const cArm = document.createElement('canvas');
        cArm.width = 30;
        cArm.height = 48;
        const ctxArm = cArm.getContext('2d');
        // Arm is at x: 46..72, y: 106..152 in img
        ctxArm.drawImage(img, 46, 106, 26, 46, 0, 0, 26, 46);

        // Clean any pixels outside arm boundary
        const armData = ctxArm.getImageData(0, 0, 30, 48);
        const ad = armData.data;
        // Erase any background from behind arm
        for (let y = 0; y < 48; y++) {
          for (let x = 0; x < 30; x++) {
            const p = (y * 30 + x) * 4;
            // If green shirt from main body is on the very left border, soften
            if (x < 3 && y > 15) {
              ad[p+3] = 0;
            }
          }
        }
        ctxArm.putImageData(armData, 0, 0);

        // 3. Extract Clean Single Leg & Shoe (x: 43..72, y: 154..181)
        const cLeg = document.createElement('canvas');
        cLeg.width = 32;
        cLeg.height = 30;
        const ctxLeg = cLeg.getContext('2d');
        ctxLeg.drawImage(img, 43, 154, 30, 28, 0, 0, 30, 28);

        // 4. Function to compose a stylized, believable walk frame
        function renderWalkFrame({
          leadLegX,
          trailLegX,
          trailHeelLiftDeg,
          leadArmDeg,
          trailArmDeg,
          torsoLeanDeg = 0.8
        }) {
          const c = document.createElement('canvas');
          c.width = w;
          c.height = h;
          const ctx = c.getContext('2d');
          ctx.imageSmoothingEnabled = true;
          ctx.imageSmoothingQuality = 'high';

          // A. Draw Trailing Leg (Behind everything)
          ctx.save();
          // Natural shadow / depth on trailing leg
          ctx.filter = 'brightness(0.82) saturate(0.92)';
          // Trailing leg connects at hip (x: 52, y: 154)
          ctx.translate(52 + trailLegX, 154);
          ctx.rotate((-8 * Math.PI) / 180);
          ctx.drawImage(cLeg, 0, 0, 20, 16, -6, 0, 20, 16);
          ctx.restore();

          // Trailing shoe: lifted heel, toe resting near ground
          ctx.save();
          ctx.filter = 'brightness(0.84) saturate(0.92)';
          // Pivot near toe at ground baseline (x: 52 + trailLegX, y: 181)
          ctx.translate(52 + trailLegX, 181);
          ctx.rotate((trailHeelLiftDeg * Math.PI) / 180);
          ctx.drawImage(cLeg, 0, 14, 30, 14, -10, -14, 30, 14);
          ctx.restore();

          // B. Draw Trailing Arm (Behind torso)
          if (trailArmDeg !== 0) {
            ctx.save();
            ctx.filter = 'brightness(0.80) saturate(0.88)';
            ctx.translate(56, 110);
            ctx.rotate((trailArmDeg * Math.PI) / 180);
            ctx.drawImage(cArm, -10, -2);
            ctx.restore();
          }

          // C. Draw Solid Torso & Head (with slight casual forward lean)
          ctx.save();
          ctx.translate(56, 140);
          ctx.rotate((torsoLeanDeg * Math.PI) / 180);
          ctx.drawImage(cTorso, 0, 0, w, 156, -56, -140, w, 156);

          // Draw rear shorts cuff contour
          ctx.fillStyle = '#C46042';
          ctx.beginPath();
          ctx.ellipse(-8, 14, 8, 4, 0, 0, Math.PI * 2);
          ctx.fill();

          // Draw front shorts cuff contour
          ctx.fillStyle = '#EB8C6E';
          ctx.beginPath();
          ctx.ellipse(3, 14, 9, 4, 0, 0, Math.PI * 2);
          ctx.fill();
          ctx.restore();

          // D. Draw Leading Leg (In front of torso back, connected at hip)
          ctx.save();
          // Leading leg extends forward from front shorts cuff
          ctx.translate(56 + leadLegX, 154);
          ctx.rotate((6 * Math.PI) / 180);
          ctx.drawImage(cLeg, 0, 0, 20, 16, -6, 0, 20, 16);
          ctx.restore();

          // Leading shoe: planted flat on ground baseline (sole at y=181)
          ctx.save();
          ctx.translate(leadLegX, 0);
          ctx.drawImage(cLeg, 0, 14, 30, 14, 43, 168, 30, 14);
          ctx.restore();

          // E. Re-stamp clean shorts cuffs over leg tops so legs cleanly nest inside shorts
          ctx.save();
          ctx.translate(56, 140);
          ctx.rotate((torsoLeanDeg * Math.PI) / 180);
          ctx.drawImage(img, 38, 146, 38, 11, -18, 6, 38, 11);
          ctx.restore();

          // F. Draw Leading Arm (In front of torso)
          ctx.save();
          ctx.translate(56, 140);
          ctx.rotate((torsoLeanDeg * Math.PI) / 180);
          // Shoulder pivot at (x: 58, y: 108) -> relative to (56, 140) is (2, -32)
          ctx.translate(2, -32);
          ctx.rotate((leadArmDeg * Math.PI) / 180);
          ctx.drawImage(cArm, -10, -2);
          ctx.restore();

          // Clamp ground line to y <= 181
          const frameData = ctx.getImageData(0, 0, w, h);
          for (let y = 182; y < h; y++) {
            for (let x = 0; x < w; x++) {
              frameData.data[(y * w + x) * 4 + 3] = 0;
            }
          }
          ctx.putImageData(frameData, 0, 0);

          return c.toDataURL('image/png');
        }

        // Frame 1: Right foot lead (+7px, planted flat), Left foot trail (-6px, heel lifted -15 deg), Right arm forward (-12 deg), Left arm back (+9 deg)
        const walk1 = renderWalkFrame({
          leadLegX: 7.0,
          trailLegX: -6.0,
          trailHeelLiftDeg: -15,
          leadArmDeg: -12,
          trailArmDeg: 9,
          torsoLeanDeg: 0.9
        });

        // Frame 2: Left foot lead (+7px, planted flat), Right foot trail (-6px, heel lifted -15 deg), Left arm forward (+9 deg relative front), Right arm back (-11 deg)
        const walk2 = renderWalkFrame({
          leadLegX: 6.5,
          trailLegX: -6.5,
          trailHeelLiftDeg: -15,
          leadArmDeg: 10,
          trailArmDeg: -11,
          torsoLeanDeg: 0.9
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

  fs.writeFileSync(path.join(__dirname, 'refined-authoritative-preview.png'), result.preview.replace(/^data:image\/png;base64,/, ''), 'base64');
  fs.writeFileSync(path.join(__dirname, 'authoritative-walk1.png'), result.walk1.replace(/^data:image\/png;base64,/, ''), 'base64');
  fs.writeFileSync(path.join(__dirname, 'authoritative-walk2.png'), result.walk2.replace(/^data:image\/png;base64,/, ''), 'base64');
  console.log('Saved refined-authoritative-preview.png');
  app.quit();
});
