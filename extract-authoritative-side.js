const { app, BrowserWindow } = require('electron');
const path = require('path');
const fs = require('fs');

app.whenReady().then(async () => {
  const win = new BrowserWindow({ show: false });
  await win.loadURL('about:blank');

  const charSheetPath = 'C:/Users/hp/.gemini/antigravity-ide/brain/31db9470-0d36-42b9-9098-2ceae6d52096/.tempmediaStorage/media_1790277058739.jpg';
  const imgBase64 = fs.readFileSync(charSheetPath).toString('base64');
  const dataUri = `data:image/jpeg;base64,${imgBase64}`;

  const sprites = await win.webContents.executeJavaScript(`
    new Promise((resolve) => {
      const sheet = new Image();
      sheet.onload = () => {
        // Full Side (Left) in sheet:
        // x from 120 to 235, y from 90 to 280
        const minX = 122;
        const maxX = 236;
        const minY = 90;
        const maxY = 280;
        const w = maxX - minX;
        const h = maxY - minY;

        const c = document.createElement('canvas');
        c.width = w;
        c.height = h;
        const ctx = c.getContext('2d');
        ctx.drawImage(sheet, minX, minY, w, h, 0, 0, w, h);

        const imgData = ctx.getImageData(0, 0, w, h);
        const d = imgData.data;

        // Flood fill transparent background
        const visited = new Uint8Array(w * h);
        const queue = [];

        function isBg(r, g, b, y) {
          // Floor shadow near bottom
          if (y > h - 18 && r > 180 && g > 170 && b > 155) return true;
          // Cream sheet background
          return (r > 220 && g > 210 && b > 195);
        }

        function add(x, y) {
          if (x < 0 || x >= w || y < 0 || y >= h) return;
          const idx = y * w + x;
          if (visited[idx]) return;
          visited[idx] = 1;
          const p = idx * 4;
          if (isBg(d[p], d[p+1], d[p+2], y)) {
            d[p+3] = 0;
            queue.push(x, y);
          }
        }

        for (let x = 0; x < w; x++) { add(x, 0); add(x, h - 1); }
        for (let y = 0; y < h; y++) { add(0, y); add(w - 1, y); }

        let qHead = 0;
        while (qHead < queue.length) {
          const cx = queue[qHead++];
          const cy = queue[qHead++];
          const neighbors = [[cx+1, cy], [cx-1, cy], [cx, cy+1], [cx, cy-1]];
          for (const [nx, ny] of neighbors) {
            if (nx >= 0 && nx < w && ny >= 0 && ny < h) {
              const nIdx = ny * w + nx;
              if (!visited[nIdx]) {
                visited[nIdx] = 1;
                const p = nIdx * 4;
                if (isBg(d[p], d[p+1], d[p+2], ny)) {
                  d[p+3] = 0;
                  queue.push(nx, ny);
                }
              }
            }
          }
        }

        // Clean any stray edge pixels from adjacent Front character (left border x < 10)
        for (let y = 0; y < h; y++) {
          for (let x = 0; x < 8; x++) {
            d[(y * w + x) * 4 + 3] = 0;
          }
        }

        // Clean cream fringes
        for (let y = 0; y < h; y++) {
          for (let x = 0; x < w; x++) {
            const idx = y * w + x;
            const p = idx * 4;
            if (d[p+3] > 0) {
              const r = d[p], g = d[p+1], b = d[p+2];
              if (r > 235 && g > 225 && b > 210) {
                const hasTransp = (
                  (x > 0 && d[p - 4 + 3] === 0) ||
                  (x < w - 1 && d[p + 4 + 3] === 0) ||
                  (y > 0 && d[p - w * 4 + 3] === 0) ||
                  (y < h - 1 && d[p + w * 4 + 3] === 0)
                );
                if (hasTransp) d[p+3] = 0;
              }
            }
          }
        }

        ctx.putImageData(imgData, 0, 0);

        // Find exact bounds
        let bMinX = w, bMaxX = 0, bMinY = h, bMaxY = 0;
        for (let y = 0; y < h; y++) {
          for (let x = 0; x < w; x++) {
            if (d[(y * w + x) * 4 + 3] > 30) {
              if (x < bMinX) bMinX = x;
              if (x > bMaxX) bMaxX = x;
              if (y < bMinY) bMinY = y;
              if (y > bMaxY) bMaxY = y;
            }
          }
        }

        const charW = bMaxX - bMinX + 1;
        const charH = bMaxY - bMinY + 1;
        const targetH = 181;
        const scale = targetH / charH;
        const renderW = Math.round(charW * scale);
        const renderX = Math.round((114 - renderW) / 2);

        // Right-facing final canvas (114 x 182)
        const cRight = document.createElement('canvas');
        cRight.width = 114;
        cRight.height = 182;
        const ctxR = cRight.getContext('2d');
        ctxR.drawImage(c, bMinX, bMinY, charW, charH, renderX, 0, renderW, targetH);

        // Left-facing final canvas (mirrored around center)
        const cLeft = document.createElement('canvas');
        cLeft.width = 114;
        cLeft.height = 182;
        const ctxL = cLeft.getContext('2d');
        ctxL.save();
        ctxL.translate(114, 0);
        ctxL.scale(-1, 1);
        ctxL.drawImage(cRight, 0, 0);
        ctxL.restore();

        resolve({
          bounds: { bMinX, bMaxX, bMinY, bMaxY, charW, charH },
          renderW,
          rightData: cRight.toDataURL('image/png'),
          leftData: cLeft.toDataURL('image/png')
        });
      };
      sheet.src = '${dataUri}';
    })
  `);

  console.log('Authoritative Extraction:', sprites.bounds, 'Render Width:', sprites.renderW);
  fs.writeFileSync(path.join(__dirname, 'src', 'renderer', 'pico-side-right.png'), sprites.rightData.replace(/^data:image\/png;base64,/, ''), 'base64');
  fs.writeFileSync(path.join(__dirname, 'src', 'renderer', 'pico-side-left.png'), sprites.leftData.replace(/^data:image\/png;base64,/, ''), 'base64');
  console.log('Saved authoritative pico-side-right.png and pico-side-left.png');

  app.quit();
});
