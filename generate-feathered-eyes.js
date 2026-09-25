const { app, BrowserWindow } = require('electron');
const path = require('path');
const fs = require('fs');

app.whenReady().then(async () => {
  const win = new BrowserWindow({ show: false });
  await win.loadURL('about:blank');

  const idleB64 = fs.readFileSync(path.join(__dirname, 'src/renderer/pico-idle.png')).toString('base64');

  const result = await win.webContents.executeJavaScript(`
    ((idleSrc) => {
      return new Promise((resolve) => {
        const img = new Image();
        img.onload = () => {
          const w = img.width;
          const h = img.height;
          const c = document.createElement('canvas');
          c.width = w;
          c.height = h;
          const ctx = c.getContext('2d');
          ctx.drawImage(img, 0, 0);

          // Let's create an eye layer system:
          // Left eye:
          // Sclera interior mask (x: 27..51, y: 67..85)
          // Iris circle center: (39.5, 77.0), radius ~8px
          // Right eye:
          // Sclera interior mask (x: 64..88, y: 67..85)
          // Iris circle center: (75.5, 77.0), radius ~8px

          // To shift eyes cleanly:
          // If we take the base image, and for any eye gaze (dx, dy):
          // We clear the sclera interior to pure sclera (#fcf8f4 with top shadow #e2d7ce),
          // Then we draw the iris/pupil/highlight at (cx + dx, cy + dy),
          // THEN we draw the original upper lashes and hair strands back on top!
          
          // Let's test this with precision:
          function renderGaze(dx, dy, eyelidY = 0) {
            const outC = document.createElement('canvas');
            outC.width = w;
            outC.height = h;
            const oCtx = outC.getContext('2d');

            const eyes = [
              { cx: 39.5, cy: 76.5, x0: 25, y0: 65, w0: 30, h0: 22, rx: 11.5, ry: 9.5 },
              { cx: 75.5, cy: 76.5, x0: 62, y0: 65, w0: 30, h0: 22, rx: 11.5, ry: 9.5 }
            ];

            eyes.forEach(eye => {
              const ec = document.createElement('canvas');
              ec.width = eye.w0;
              ec.height = eye.h0;
              const eCtx = ec.getContext('2d');

              const localCx = eye.cx - eye.x0;
              const localCy = eye.cy - eye.y0;

              // Clip to smooth eye opening
              eCtx.save();
              eCtx.beginPath();
              eCtx.ellipse(localCx, localCy, eye.rx, eye.ry, 0, 0, Math.PI * 2);
              eCtx.clip();

              // Draw smooth sclera
              const sGrad = eCtx.createLinearGradient(0, localCy - eye.ry, 0, localCy + eye.ry);
              sGrad.addColorStop(0, '#e5dacf');
              sGrad.addColorStop(0.3, '#faf6f2');
              sGrad.addColorStop(1, '#ffffff');
              eCtx.fillStyle = sGrad;
              eCtx.fillRect(0, 0, eye.w0, eye.h0);

              // Draw iris at shifted position
              const ix = localCx + dx;
              const iy = localCy + dy;
              const irx = 8.5;
              const iry = 9.5;

              // Iris base gradient
              const iGrad = eCtx.createLinearGradient(0, iy - iry, 0, iy + iry);
              iGrad.addColorStop(0, '#22120c');
              iGrad.addColorStop(0.4, '#3d1c0e');
              iGrad.addColorStop(0.7, '#a8541c');
              iGrad.addColorStop(1, '#df7c34');
              eCtx.beginPath();
              eCtx.ellipse(ix, iy, irx, iry, 0, 0, Math.PI * 2);
              eCtx.fillStyle = iGrad;
              eCtx.fill();

              // Pupil
              eCtx.beginPath();
              eCtx.ellipse(ix, iy - 0.5, irx * 0.52, iry * 0.55, 0, 0, Math.PI * 2);
              eCtx.fillStyle = '#100604';
              eCtx.fill();

              // Amber light crescent
              eCtx.beginPath();
              eCtx.ellipse(ix, iy + iry * 0.42, irx * 0.62, iry * 0.35, 0, 0, Math.PI);
              eCtx.fillStyle = '#f59e42';
              eCtx.fill();

              // Specular highlight (top right of pupil)
              eCtx.beginPath();
              eCtx.arc(ix + 2.2, iy - 3.2, 2.2, 0, Math.PI * 2);
              eCtx.fillStyle = '#ffffff';
              eCtx.fill();

              // Secondary small highlight
              eCtx.beginPath();
              eCtx.arc(ix - 3.2, iy + 2.5, 0.9, 0, Math.PI * 2);
              eCtx.fillStyle = 'rgba(255, 255, 255, 0.5)';
              eCtx.fill();

              // Down gaze relaxed eyelid
              if (eyelidY > 0) {
                eCtx.beginPath();
                eCtx.ellipse(localCx, localCy - eye.ry + eyelidY, eye.rx + 2, eyelidY + 2, 0, 0, Math.PI * 2);
                eCtx.fillStyle = '#ffdfcb';
                eCtx.fill();
                eCtx.strokeStyle = '#5a2e1d';
                eCtx.lineWidth = 1.0;
                eCtx.stroke();
              }

              eCtx.restore();

              // Now restore the original eyelashes and bangs over this eye:
              // Extract original patch
              const origPatch = document.createElement('canvas');
              origPatch.width = eye.w0;
              origPatch.height = eye.h0;
              const opCtx = origPatch.getContext('2d');
              opCtx.drawImage(img, eye.x0, eye.y0, eye.w0, eye.h0, 0, 0, eye.w0, eye.h0);
              const opData = opCtx.getImageData(0, 0, eye.w0, eye.h0).data;
              const ecData = eCtx.getImageData(0, 0, eye.w0, eye.h0);

              for (let py = 0; py < eye.h0; py++) {
                for (let px = 0; px < eye.w0; px++) {
                  const idx = (py * eye.w0 + px) * 4;
                  const r = opData[idx], g = opData[idx+1], b = opData[idx+2], a = opData[idx+3];
                  
                  // Distance from eye center
                  const dNorm = Math.pow((px - localCx) / eye.rx, 2) + Math.pow((py - localCy) / eye.ry, 2);

                  // If outside eye ellipse -> keep transparent in overlay
                  if (dNorm > 1.0) {
                    ecData.data[idx+3] = 0;
                    continue;
                  }

                  // If original pixel is upper lash or hair bang -> restore it on top!
                  const isLash = (r < 85 && g < 60 && b < 55);
                  const isHair = (r > 165 && g > 65 && g < 135 && b < 85);
                  if (isLash || isHair) {
                    ecData.data[idx] = r;
                    ecData.data[idx+1] = g;
                    ecData.data[idx+2] = b;
                    ecData.data[idx+3] = a;
                  }

                  // Soft edge feathering at the boundary of eye opening
                  if (dNorm > 0.85 && dNorm <= 1.0) {
                    const feather = (1.0 - dNorm) / 0.15;
                    ecData.data[idx+3] = Math.round(ecData.data[idx+3] * feather);
                  }
                }
              }

              eCtx.putImageData(ecData, 0, 0);
              oCtx.drawImage(ec, eye.x0, eye.y0);
            });

            return outC.toDataURL('image/png');
          }

          resolve({
            lookLeft: renderGaze(-2.5, -0.2),
            lookRight: renderGaze(2.5, -0.2),
            lookDown: renderGaze(0, 2.2, 2.0)
          });
        };
        img.src = 'data:image/png;base64,' + idleSrc;
      });
    })('${idleB64}')
  `);

  fs.writeFileSync(path.join(__dirname, 'src/renderer/pico-eyes-left.png'), result.lookLeft.replace(/^data:image\/png;base64,/, ''), 'base64');
  fs.writeFileSync(path.join(__dirname, 'src/renderer/pico-eyes-right.png'), result.lookRight.replace(/^data:image\/png;base64,/, ''), 'base64');
  fs.writeFileSync(path.join(__dirname, 'src/renderer/pico-eyes-down.png'), result.lookDown.replace(/^data:image\/png;base64,/, ''), 'base64');

  fs.writeFileSync(path.join(__dirname, 'pico-eyes-left.png'), result.lookLeft.replace(/^data:image\/png;base64,/, ''), 'base64');
  fs.writeFileSync(path.join(__dirname, 'pico-eyes-right.png'), result.lookRight.replace(/^data:image\/png;base64,/, ''), 'base64');
  fs.writeFileSync(path.join(__dirname, 'pico-eyes-down.png'), result.lookDown.replace(/^data:image\/png;base64,/, ''), 'base64');

  console.log('Saved feathered gaze overlays');
  app.quit();
});
