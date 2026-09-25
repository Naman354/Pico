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

          // Helper to create shifted eye overlay with pure difference alpha
          function shiftEyes(dx, dy, eyelidDrop = 0) {
            const c = document.createElement('canvas');
            c.width = w;
            c.height = h;
            const ctx = c.getContext('2d');
            ctx.drawImage(img, 0, 0);

            const origCanvas = document.createElement('canvas');
            origCanvas.width = w;
            origCanvas.height = h;
            const oCtx = origCanvas.getContext('2d');
            oCtx.drawImage(img, 0, 0);
            const oData = oCtx.getImageData(0, 0, w, h).data;

            const imgData = ctx.getImageData(0, 0, w, h);
            const d = imgData.data;

            // Eye boxes (interior where iris can move)
            const eyeBoxes = [
              { x1: 25, x2: 52, y1: 67, y2: 85 },
              { x1: 62, x2: 89, y1: 67, y2: 85 }
            ];

            eyeBoxes.forEach(box => {
              for (let y = box.y1; y <= box.y2; y++) {
                // Find iris span
                let rowIrisStart = -1;
                let rowIrisEnd = -1;
                for (let x = box.x1; x <= box.x2; x++) {
                  const idx = (y * w + x) * 4;
                  const r = oData[idx], g = oData[idx+1], b = oData[idx+2], a = oData[idx+3];
                  const isSclera = (r > 200 && g > 190 && b > 180);
                  const isIris = (a > 100) && !isSclera && (r < 195);
                  if (isIris) {
                    if (rowIrisStart === -1) rowIrisStart = x;
                    rowIrisEnd = x;
                  }
                }

                if (rowIrisStart !== -1 && rowIrisEnd > rowIrisStart + 3) {
                  // Sclera gradient color
                  const rowRatio = (y - box.y1) / (box.y2 - box.y1);
                  const scleraR = Math.round(230 + rowRatio * 25);
                  const scleraG = Math.round(222 + rowRatio * 33);
                  const scleraB = Math.round(214 + rowRatio * 41);

                  if (dx < 0) {
                    const shift = Math.abs(dx);
                    for (let x = rowIrisStart; x <= rowIrisEnd; x++) {
                      const targetX = x - shift;
                      if (targetX >= box.x1) {
                        const srcIdx = (y * w + x) * 4;
                        const dstIdx = (y * w + targetX) * 4;
                        if (oData[dstIdx] > 70) { // don't overwrite dark lash
                          d[dstIdx] = oData[srcIdx];
                          d[dstIdx+1] = oData[srcIdx+1];
                          d[dstIdx+2] = oData[srcIdx+2];
                          d[dstIdx+3] = oData[srcIdx+3];
                        }
                      }
                    }
                    for (let x = rowIrisEnd - shift + 1; x <= rowIrisEnd; x++) {
                      if (x <= box.x2) {
                        const dstIdx = (y * w + x) * 4;
                        if (oData[dstIdx] > 70) {
                          d[dstIdx] = scleraR;
                          d[dstIdx+1] = scleraG;
                          d[dstIdx+2] = scleraB;
                          d[dstIdx+3] = 255;
                        }
                      }
                    }
                  } else if (dx > 0) {
                    const shift = dx;
                    for (let x = rowIrisEnd; x >= rowIrisStart; x--) {
                      const targetX = x + shift;
                      if (targetX <= box.x2) {
                        const srcIdx = (y * w + x) * 4;
                        const dstIdx = (y * w + targetX) * 4;
                        if (oData[dstIdx] > 70) {
                          d[dstIdx] = oData[srcIdx];
                          d[dstIdx+1] = oData[srcIdx+1];
                          d[dstIdx+2] = oData[srcIdx+2];
                          d[dstIdx+3] = oData[srcIdx+3];
                        }
                      }
                    }
                    for (let x = rowIrisStart; x < rowIrisStart + shift; x++) {
                      if (x >= box.x1) {
                        const dstIdx = (y * w + x) * 4;
                        if (oData[dstIdx] > 70) {
                          d[dstIdx] = scleraR;
                          d[dstIdx+1] = scleraG;
                          d[dstIdx+2] = scleraB;
                          d[dstIdx+3] = 255;
                        }
                      }
                    }
                  }
                }
              }

              if (eyelidDrop > 0) {
                // Down glance: shift iris down & relax eyelid
                const shiftY = 2;
                for (let y = box.y2; y >= box.y1 + shiftY; y--) {
                  for (let x = box.x1; x <= box.x2; x++) {
                    const srcIdx = ((y - shiftY) * w + x) * 4;
                    const dstIdx = (y * w + x) * 4;
                    const r = oData[srcIdx], g = oData[srcIdx+1], b = oData[srcIdx+2];
                    if (r < 195 && oData[dstIdx] > 70) {
                      d[dstIdx] = r;
                      d[dstIdx+1] = g;
                      d[dstIdx+2] = b;
                      d[dstIdx+3] = 255;
                    }
                  }
                }
                for (let y = box.y1; y < box.y1 + eyelidDrop; y++) {
                  for (let x = box.x1 + 3; x <= box.x2 - 3; x++) {
                    const dstIdx = (y * w + x) * 4;
                    if (oData[dstIdx] > 70) {
                      d[dstIdx] = 255;
                      d[dstIdx+1] = 222;
                      d[dstIdx+2] = 203;
                      d[dstIdx+3] = 255;
                    }
                  }
                }
              }
            });

            // CRUCIAL: Difference Alpha Masking!
            // Any pixel identical to the original base sprite becomes 100% transparent!
            for (let y = 0; y < h; y++) {
              for (let x = 0; x < w; x++) {
                const idx = (y * w + x) * 4;
                const diff = Math.abs(d[idx] - oData[idx]) + 
                             Math.abs(d[idx+1] - oData[idx+1]) + 
                             Math.abs(d[idx+2] - oData[idx+2]);
                if (diff < 15) {
                  d[idx+3] = 0; // Completely transparent!
                }
              }
            }

            ctx.putImageData(imgData, 0, 0);
            return c.toDataURL('image/png');
          }

          resolve({
            lookLeft: shiftEyes(-3, 0),
            lookRight: shiftEyes(3, 0),
            lookDown: shiftEyes(0, 2, 2)
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

  console.log('Saved seamless diff-alpha eye overlays');
  app.quit();
});
