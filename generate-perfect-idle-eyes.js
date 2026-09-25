const { app, BrowserWindow } = require('electron');
const path = require('path');
const fs = require('fs');

app.whenReady().then(async () => {
  const win = new BrowserWindow({ show: false });
  await win.loadURL('about:blank');

  const idleB64 = fs.readFileSync(path.join(__dirname, 'src/renderer/pico-idle.png')).toString('base64');

  const overlays = await win.webContents.executeJavaScript(`
    ((idleSrc) => {
      return new Promise((resolve) => {
        const img = new Image();
        img.onload = () => {
          const w = img.width;
          const h = img.height;

          // Eye definitions from pico-idle.png:
          // Left Eye (viewer's left):
          // Eye socket outer bounds: x: 23..54, y: 64..87
          // Center: (39.5, 76.5), rx: 13, ry: 10.5
          // Iris radius: rx: 8.5, ry: 10.0
          //
          // Right Eye (viewer's right):
          // Eye socket outer bounds: x: 60..91, y: 64..87
          // Center: (75.5, 76.5), rx: 13, ry: 10.5
          // Iris radius: rx: 8.5, ry: 10.0

          function createGazeOverlay(shiftX, shiftY, eyelidDrop = 0) {
            const outC = document.createElement('canvas');
            outC.width = w;
            outC.height = h;
            const ctx = outC.getContext('2d');

            const eyeBoxes = [
              { cx: 39.5, cy: 76.5, x0: 22, y0: 63, w0: 33, h0: 25 },
              { cx: 75.5, cy: 76.5, x0: 59, y0: 63, w0: 33, h0: 25 }
            ];

            eyeBoxes.forEach(eye => {
              // Scratch canvas for single eye
              const ec = document.createElement('canvas');
              ec.width = eye.w0;
              ec.height = eye.h0;
              const eCtx = ec.getContext('2d');

              const localCx = eye.cx - eye.x0;
              const localCy = eye.cy - eye.y0;
              const rx = 13.0;
              const ry = 10.0;

              // 1. Clip to eye socket interior
              eCtx.save();
              eCtx.beginPath();
              eCtx.ellipse(localCx, localCy, rx - 0.5, ry - 0.5, 0, 0, Math.PI * 2);
              eCtx.clip();

              // 2. Base sclera (warm white)
              const scleraGrad = eCtx.createLinearGradient(0, localCy - ry, 0, localCy + ry);
              scleraGrad.addColorStop(0, '#e2d5cb');
              scleraGrad.addColorStop(0.35, '#faf6f2');
              scleraGrad.addColorStop(1, '#ffffff');
              eCtx.fillStyle = scleraGrad;
              eCtx.fillRect(0, 0, eye.w0, eye.h0);

              // 3. Iris position shifted by shiftX, shiftY
              const irisX = localCx + shiftX;
              const irisY = localCy + shiftY;
              const irx = 8.5;
              const iry = 9.8;

              // Iris shape
              eCtx.beginPath();
              eCtx.ellipse(irisX, irisY, irx, iry, 0, 0, Math.PI * 2);
              
              // Iris gradient: deep espresso at top -> warm amber glow at bottom
              const irisGrad = eCtx.createLinearGradient(0, irisY - iry, 0, irisY + iry);
              irisGrad.addColorStop(0, '#1c100c');
              irisGrad.addColorStop(0.45, '#3b1c0e');
              irisGrad.addColorStop(0.75, '#b0581e');
              irisGrad.addColorStop(1, '#e28036');
              eCtx.fillStyle = irisGrad;
              eCtx.fill();

              // Pupil (dark core)
              eCtx.beginPath();
              eCtx.ellipse(irisX, irisY - 1, irx * 0.52, iry * 0.55, 0, 0, Math.PI * 2);
              eCtx.fillStyle = '#110805';
              eCtx.fill();

              // Amber crescent light at bottom of iris
              eCtx.beginPath();
              eCtx.ellipse(irisX, irisY + iry * 0.45, irx * 0.65, iry * 0.35, 0, 0, Math.PI);
              eCtx.fillStyle = '#f59e42';
              eCtx.fill();

              // Crisp specular highlight dot (white, top-right of pupil)
              const hlX = irisX + 2.2;
              const hlY = irisY - 3.2;
              eCtx.beginPath();
              eCtx.arc(hlX, hlY, 2.2, 0, Math.PI * 2);
              eCtx.fillStyle = '#ffffff';
              eCtx.fill();

              // Secondary tiny reflection dot
              eCtx.beginPath();
              eCtx.arc(irisX - 3.0, irisY + 3.0, 1.0, 0, Math.PI * 2);
              eCtx.fillStyle = 'rgba(255, 255, 255, 0.45)';
              eCtx.fill();

              // 4. Eyelid drop (if down glance)
              if (eyelidDrop > 0) {
                eCtx.beginPath();
                eCtx.ellipse(localCx, localCy - ry + eyelidDrop, rx + 1, eyelidDrop + 2, 0, 0, Math.PI * 2);
                eCtx.fillStyle = '#fedecb';
                eCtx.fill();
                // Eyelid crease line
                eCtx.strokeStyle = '#4a2618';
                eCtx.lineWidth = 1.2;
                eCtx.stroke();
              }

              eCtx.restore();

              // 5. Restore original eyelashes, corner outlines, and overlapping hair bangs
              const origPatch = document.createElement('canvas');
              origPatch.width = eye.w0;
              origPatch.height = eye.h0;
              const opCtx = origPatch.getContext('2d');
              opCtx.drawImage(img, eye.x0, eye.y0, eye.w0, eye.h0, 0, 0, eye.w0, eye.h0);
              const opData = opCtx.getImageData(0, 0, eye.w0, eye.h0).data;
              const ecData = eCtx.getImageData(0, 0, eye.w0, eye.h0);

              for (let y = 0; y < eye.h0; y++) {
                for (let x = 0; x < eye.w0; x++) {
                  const idx = (y * eye.w0 + x) * 4;
                  const r = opData[idx];
                  const g = opData[idx+1];
                  const b = opData[idx+2];
                  const a = opData[idx+3];

                  // Distance from eye center
                  const dNorm = Math.pow((x - localCx) / rx, 2) + Math.pow((y - localCy) / ry, 2);

                  // Outside eye socket -> fully transparent
                  if (dNorm > 1.08) {
                    ecData.data[idx+3] = 0;
                    continue;
                  }

                  // Hair bang (orange) or eyelash (dark line)
                  const isHair = (r > 165 && g > 60 && g < 135 && b < 85);
                  const isLash = (r < 85 && g < 55 && b < 50);
                  const isEdge = (dNorm > 0.88 && dNorm <= 1.08);

                  if (isHair || isLash) {
                    ecData.data[idx] = r;
                    ecData.data[idx+1] = g;
                    ecData.data[idx+2] = b;
                    ecData.data[idx+3] = a;
                  } else if (isEdge) {
                    // Soft antialias transition into eye socket
                    const blend = (1.08 - dNorm) / 0.2;
                    ecData.data[idx+3] = Math.round(ecData.data[idx+3] * blend);
                  }
                }
              }

              eCtx.putImageData(ecData, 0, 0);

              // Draw this eye onto full overlay
              ctx.drawImage(ec, eye.x0, eye.y0);
            });

            return outC.toDataURL('image/png');
          }

          resolve({
            lookLeft: createGazeOverlay(-3.2, -0.2),
            lookRight: createGazeOverlay(3.2, -0.2),
            lookDown: createGazeOverlay(0, 2.5, 2.0)
          });
        };
        img.src = 'data:image/png;base64,' + idleSrc;
      });
    })('${idleB64}')
  `);

  fs.writeFileSync(path.join(__dirname, 'pico-eyes-left.png'), overlays.lookLeft.replace(/^data:image\/png;base64,/, ''), 'base64');
  fs.writeFileSync(path.join(__dirname, 'pico-eyes-right.png'), overlays.lookRight.replace(/^data:image\/png;base64,/, ''), 'base64');
  fs.writeFileSync(path.join(__dirname, 'pico-eyes-down.png'), overlays.lookDown.replace(/^data:image\/png;base64,/, ''), 'base64');

  console.log('Saved custom perfect eye overlays');
  app.quit();
});
