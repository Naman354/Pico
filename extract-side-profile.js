const { app, BrowserWindow } = require('electron');
const path = require('path');
const fs = require('fs');

app.whenReady().then(async () => {
  const win = new BrowserWindow({ show: false });
  await win.loadURL('about:blank');

  const charSheetPath = 'C:/Users/hp/.gemini/antigravity-ide/brain/31db9470-0d36-42b9-9098-2ceae6d52096/.tempmediaStorage/media_1790277058739.jpg';
  const imgBase64 = fs.readFileSync(charSheetPath).toString('base64');
  const dataUri = `data:image/jpeg;base64,${imgBase64}`;

  const result = await win.webContents.executeJavaScript(`
    new Promise((resolve) => {
      const sheet = new Image();
      sheet.onload = () => {
        const cropW = 100;
        const cropH = 200; // cut off at 200 to exclude text completely
        const cCrop = document.createElement('canvas');
        cCrop.width = cropW;
        cCrop.height = cropH;
        const ctxCrop = cCrop.getContext('2d');
        // Side (Left) character: starts at x: 140, y: 100
        ctxCrop.drawImage(sheet, 140, 100, cropW, cropH, 0, 0, cropW, cropH);

        const imgData = ctxCrop.getImageData(0, 0, cropW, cropH);
        const d = imgData.data;

        // Flood fill from outer borders
        const visited = new Uint8Array(cropW * cropH);
        const queue = [];

        function isBgPixel(r, g, b, y) {
          // Floor shadow is around y > 185 with grayish/cream tint
          if (y > 186 && r > 165 && g > 155 && b > 145) return true;
          // Background cream
          return (r > 218 && g > 208 && b > 192);
        }

        function checkAdd(x, y) {
          if (x < 0 || x >= cropW || y < 0 || y >= cropH) return;
          const idx = y * cropW + x;
          if (visited[idx]) return;
          visited[idx] = 1;
          const p = idx * 4;
          if (isBgPixel(d[p], d[p+1], d[p+2], y)) {
            d[p+3] = 0;
            queue.push(x, y);
          }
        }

        for (let x = 0; x < cropW; x++) {
          checkAdd(x, 0);
          checkAdd(x, cropH - 1);
        }
        for (let y = 0; y < cropH; y++) {
          checkAdd(0, y);
          checkAdd(cropW - 1, y);
        }

        let qHead = 0;
        while (qHead < queue.length) {
          const cx = queue[qHead++];
          const cy = queue[qHead++];
          const neighbors = [[cx+1, cy], [cx-1, cy], [cx, cy+1], [cx, cy-1]];
          for (const [nx, ny] of neighbors) {
            if (nx >= 0 && nx < cropW && ny >= 0 && ny < cropH) {
              const nIdx = ny * cropW + nx;
              if (!visited[nIdx]) {
                visited[nIdx] = 1;
                const p = nIdx * 4;
                if (isBgPixel(d[p], d[p+1], d[p+2], ny)) {
                  d[p+3] = 0;
                  queue.push(nx, ny);
                }
              }
            }
          }
        }

        ctxCrop.putImageData(imgData, 0, 0);

        // Find character bounding box
        let minX = cropW, maxX = 0, minY = cropH, maxY = 0;
        for (let y = 0; y < cropH; y++) {
          for (let x = 0; x < cropW; x++) {
            if (d[(y * cropW + x) * 4 + 3] > 30) {
              if (x < minX) minX = x;
              if (x > maxX) maxX = x;
              if (y < minY) minY = y;
              if (y > maxY) maxY = y;
            }
          }
        }

        // Target canvas: 114 x 182 matching pico-idle.png
        const cTarget = document.createElement('canvas');
        cTarget.width = 114;
        cTarget.height = 182;
        const ctxTarget = cTarget.getContext('2d');

        const charW = maxX - minX + 1;
        const charH = maxY - minY + 1;

        // Scale to 181px height
        const scale = 181 / charH;
        const renderW = Math.round(charW * scale);
        const renderH = 181;
        const renderX = Math.round((114 - renderW) / 2);
        const renderY = 0; // rests at y=181

        ctxTarget.drawImage(cCrop, minX, minY, charW, charH, renderX, renderY, renderW, renderH);

        resolve({
          charBox: { minX, maxX, minY, maxY, charW, charH },
          renderBox: { renderX, renderY, renderW, renderH },
          targetPng: cTarget.toDataURL('image/png')
        });
      };
      sheet.src = '${dataUri}';
    })
  `);

  console.log('Clean Extraction:', result.charBox, result.renderBox);
  const base64Data = result.targetPng.replace(/^data:image\/png;base64,/, '');
  fs.writeFileSync(path.join(__dirname, 'src', 'renderer', 'pico-side-profile.png'), base64Data, 'base64');
  console.log('Saved src/renderer/pico-side-profile.png');
  app.quit();
});
