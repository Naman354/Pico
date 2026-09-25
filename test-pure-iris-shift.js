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

          // Helper to create shifted eye overlay from pico-idle
          function shiftEyes(dx, dy, eyelidRelax = 0) {
            const c = document.createElement('canvas');
            c.width = w;
            c.height = h;
            const ctx = c.getContext('2d');
            ctx.drawImage(img, 0, 0);

            const imgData = ctx.getImageData(0, 0, w, h);
            const d = imgData.data;

            // Two eye boxes:
            // Left eye: x: 24..53, y: 66..86
            // Right eye: x: 61..89, y: 66..86
            const eyeBoxes = [
              { x1: 24, x2: 52, y1: 66, y2: 86, localCx: 38, localCy: 76 },
              { x1: 61, x2: 89, y1: 66, y2: 86, localCx: 75, localCy: 76 }
            ];

            const origCanvas = document.createElement('canvas');
            origCanvas.width = w;
            origCanvas.height = h;
            const oCtx = origCanvas.getContext('2d');
            oCtx.drawImage(img, 0, 0);
            const oData = oCtx.getImageData(0, 0, w, h).data;

            eyeBoxes.forEach(box => {
              for (let y = box.y1; y <= box.y2; y++) {
                // Find iris span on this row
                let rowIrisStart = -1;
                let rowIrisEnd = -1;
                for (let x = box.x1; x <= box.x2; x++) {
                  const idx = (y * w + x) * 4;
                  const r = oData[idx], g = oData[idx+1], b = oData[idx+2], a = oData[idx+3];
                  
                  // Sclera white has high luminance and balanced rgb (r>210, g>200, b>190)
                  const isSclera = (r > 200 && g > 190 && b > 180 && Math.abs(r - g) < 25);
                  // Hair or skin
                  const isHairOrSkin = (r > 220 && g < 185) || (r > 160 && g < 110 && b < 70);
                  const isLash = (r < 80 && g < 55 && b < 50);

                  const isIris = (a > 100) && !isSclera && !isHairOrSkin && (r < 195);
                  if (isIris) {
                    if (rowIrisStart === -1) rowIrisStart = x;
                    rowIrisEnd = x;
                  }
                }

                if (rowIrisStart !== -1 && rowIrisEnd > rowIrisStart + 3) {
                  // Sclera fill color based on row Y (subtle soft gradient)
                  const rowRatio = (y - box.y1) / (box.y2 - box.y1);
                  const scleraR = Math.round(225 + rowRatio * 28);
                  const scleraG = Math.round(218 + rowRatio * 32);
                  const scleraB = Math.round(210 + rowRatio * 38);

                  if (dx < 0) {
                    // Shift left by |dx|
                    const shift = Math.abs(dx);
                    for (let x = rowIrisStart; x <= rowIrisEnd; x++) {
                      const targetX = x - shift;
                      if (targetX >= box.x1) {
                        const srcIdx = (y * w + x) * 4;
                        const dstIdx = (y * w + targetX) * 4;
                        // Don't overwrite outer lash
                        const origR = oData[dstIdx];
                        if (origR > 75) {
                          d[dstIdx] = oData[srcIdx];
                          d[dstIdx+1] = oData[srcIdx+1];
                          d[dstIdx+2] = oData[srcIdx+2];
                          d[dstIdx+3] = oData[srcIdx+3];
                        }
                      }
                    }
                    // Fill newly exposed right side with sclera
                    for (let x = rowIrisEnd - shift + 1; x <= rowIrisEnd; x++) {
                      if (x <= box.x2) {
                        const dstIdx = (y * w + x) * 4;
                        if (oData[dstIdx] > 80) {
                          d[dstIdx] = scleraR;
                          d[dstIdx+1] = scleraG;
                          d[dstIdx+2] = scleraB;
                          d[dstIdx+3] = 255;
                        }
                      }
                    }
                  } else if (dx > 0) {
                    // Shift right by dx
                    const shift = dx;
                    for (let x = rowIrisEnd; x >= rowIrisStart; x--) {
                      const targetX = x + shift;
                      if (targetX <= box.x2) {
                        const srcIdx = (y * w + x) * 4;
                        const dstIdx = (y * w + targetX) * 4;
                        const origR = oData[dstIdx];
                        if (origR > 75) {
                          d[dstIdx] = oData[srcIdx];
                          d[dstIdx+1] = oData[srcIdx+1];
                          d[dstIdx+2] = oData[srcIdx+2];
                          d[dstIdx+3] = oData[srcIdx+3];
                        }
                      }
                    }
                    // Fill newly exposed left side with sclera
                    for (let x = rowIrisStart; x < rowIrisStart + shift; x++) {
                      if (x >= box.x1) {
                        const dstIdx = (y * w + x) * 4;
                        if (oData[dstIdx] > 80) {
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

              // Down glance: relax eyelids down slightly & shift pupils down
              if (dy > 0) {
                const shiftY = dy;
                for (let y = box.y2; y >= box.y1 + shiftY; y--) {
                  for (let x = box.x1; x <= box.x2; x++) {
                    const srcIdx = ((y - shiftY) * w + x) * 4;
                    const dstIdx = (y * w + x) * 4;
                    const r = oData[srcIdx], g = oData[srcIdx+1], b = oData[srcIdx+2];
                    const isIris = (r < 195 && (r < 140 || g < 130));
                    if (isIris && oData[dstIdx] > 75) {
                      d[dstIdx] = r;
                      d[dstIdx+1] = g;
                      d[dstIdx+2] = b;
                      d[dstIdx+3] = 255;
                    }
                  }
                }
                // Upper eyelid relaxing down
                for (let y = box.y1; y < box.y1 + eyelidRelax; y++) {
                  for (let x = box.x1 + 3; x <= box.x2 - 3; x++) {
                    const dstIdx = (y * w + x) * 4;
                    if (d[dstIdx+3] > 0) {
                      d[dstIdx] = 255;
                      d[dstIdx+1] = 222;
                      d[dstIdx+2] = 203;
                    }
                  }
                }
              }
            });

            // Make everything outside the eye areas transparent
            for (let y = 0; y < h; y++) {
              for (let x = 0; x < w; x++) {
                const inLeft = (x >= 23 && x <= 53 && y >= 65 && y <= 86);
                const inRight = (x >= 60 && x <= 90 && y >= 65 && y <= 86);
                if (!inLeft && !inRight) {
                  d[(y * w + x) * 4 + 3] = 0;
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

  // Also write to root for previews
  fs.writeFileSync(path.join(__dirname, 'pico-eyes-left.png'), result.lookLeft.replace(/^data:image\/png;base64,/, ''), 'base64');
  fs.writeFileSync(path.join(__dirname, 'pico-eyes-right.png'), result.lookRight.replace(/^data:image\/png;base64,/, ''), 'base64');
  fs.writeFileSync(path.join(__dirname, 'pico-eyes-down.png'), result.lookDown.replace(/^data:image\/png;base64,/, ''), 'base64');

  console.log('Saved refined eye overlays');
  app.quit();
});
