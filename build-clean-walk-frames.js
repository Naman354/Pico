const { app, BrowserWindow } = require('electron');
const path = require('path');
const fs = require('fs');

app.whenReady().then(async () => {
  const win = new BrowserWindow({ show: false });
  await win.loadURL('about:blank');

  const charSheetPath = 'C:/Users/hp/.gemini/antigravity-ide/brain/31db9470-0d36-42b9-9098-2ceae6d52096/.tempmediaStorage/media_1790277058739.jpg';
  const imgBase64 = fs.readFileSync(charSheetPath).toString('base64');
  const dataUri = 'data:image/jpeg;base64,' + imgBase64;

  const result = await win.webContents.executeJavaScript(`
    new Promise((resolve) => {
      const sheet = new Image();
      sheet.onload = () => {
        // Crop Side (Left) [faces right]
        // Exact region: x: 124 to 234, y: 92 to 282
        const minX = 124;
        const maxX = 234;
        const minY = 92;
        const maxY = 282;
        const w = maxX - minX;
        const h = maxY - minY;

        const cRaw = document.createElement('canvas');
        cRaw.width = w;
        cRaw.height = h;
        const ctxRaw = cRaw.getContext('2d');
        ctxRaw.drawImage(sheet, minX, minY, w, h, 0, 0, w, h);

        const imgData = ctxRaw.getImageData(0, 0, w, h);
        const d = imgData.data;

        // Flood fill transparent background
        const visited = new Uint8Array(w * h);
        const queue = [];

        function isBg(r, g, b, y) {
          // Bottom floor shadow
          if (y > h - 16 && r > 185 && g > 175 && b > 160) return true;
          // Sheet background
          return (r > 218 && g > 208 && b > 192);
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

        // Clean any stray edge artifacts (at x < 8 or x > w - 4)
        for (let y = 0; y < h; y++) {
          for (let x = 0; x < 8; x++) {
            d[(y * w + x) * 4 + 3] = 0;
          }
          for (let x = w - 4; x < w; x++) {
            d[(y * w + x) * 4 + 3] = 0;
          }
        }

        // Clean fringe pixels around edges
        for (let y = 0; y < h; y++) {
          for (let x = 0; x < w; x++) {
            const idx = y * w + x;
            const p = idx * 4;
            if (d[p+3] > 0) {
              const r = d[p], g = d[p+1], b = d[p+2];
              if (r > 230 && g > 220 && b > 205) {
                // If adjacent to transparent, make transparent
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

        ctxRaw.putImageData(imgData, 0, 0);

        // Find character bounding box
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

        // Pristine Base Profile on 114x182 Canvas (Feet at y=181)
        const cBase = document.createElement('canvas');
        cBase.width = 114;
        cBase.height = 182;
        const ctxBase = cBase.getContext('2d');
        ctxBase.imageSmoothingEnabled = true;
        ctxBase.imageSmoothingQuality = 'high';
        ctxBase.drawImage(cRaw, bMinX, bMinY, charW, charH, renderX, 0, renderW, targetH);

        // Clean any stray pixels outside the character silhouette
        const baseData = ctxBase.getImageData(0, 0, 114, 182);
        for (let y = 0; y < 182; y++) {
          for (let x = 0; x < 12; x++) {
            baseData.data[(y * 114 + x) * 4 + 3] = 0;
          }
          for (let x = 104; x < 114; x++) {
            baseData.data[(y * 114 + x) * 4 + 3] = 0;
          }
        }
        ctxBase.putImageData(baseData, 0, 0);

        // Now, let's create Walk Frame 1 and Walk Frame 2 with seamless, organic leg strides:
        // In cBase (114x182):
        // Upper body: y: 0 to 140
        // Shorts: y: 135 to 157
        // Legs: y: 157 to 170
        // Shoes: y: 168 to 181
        // Center of feet/legs is around x: 50 to 68

        // Function to create a clean stride frame
        function createStepFrame(leadLegOffset, trailLegOffset, armAngleDeg) {
          const c = document.createElement('canvas');
          c.width = 114;
          c.height = 182;
          const ctx = c.getContext('2d');
          ctx.imageSmoothingEnabled = true;
          ctx.imageSmoothingQuality = 'high';

          // 1. Draw head and upper shirt (y: 0 to 135)
          ctx.drawImage(cBase, 0, 0, 114, 135, 0, 0, 114, 135);

          // 2. Draw shorts body (y: 135 to 156)
          ctx.drawImage(cBase, 0, 135, 114, 21, 0, 135, 114, 21);

          // 3. Draw trailing leg (behind)
          // Trailing leg is slightly darker/shadowed and shifted
          ctx.save();
          ctx.translate(trailLegOffset * 0.8, 0);
          // Clip legs and shoes area
          ctx.beginPath();
          ctx.rect(34, 154, 30, 28);
          ctx.clip();
          // Draw with slight shadow for depth
          ctx.globalAlpha = 0.92;
          ctx.drawImage(cBase, 0, 0);
          // Darken trailing leg slightly for 3D depth
          ctx.fillStyle = 'rgba(20, 20, 30, 0.12)';
          ctx.fillRect(30, 154, 40, 28);
          ctx.restore();

          // 4. Draw leading leg (in front)
          ctx.save();
          ctx.translate(leadLegOffset, 0);
          ctx.beginPath();
          ctx.rect(48, 154, 32, 28);
          ctx.clip();
          ctx.drawImage(cBase, 0, 0);
          ctx.restore();

          // 5. Draw clean shorts cuff overlap so leg joins shorts seamlessly with zero gap
          ctx.drawImage(cBase, 40, 148, 35, 10, 40, 148, 35, 10);

          // 6. Arm swing:
          // Shoulder pivot at (x: 56, y: 110)
          // Fill shirt area behind arm
          ctx.save();
          ctx.fillStyle = '#6E976A'; // Shirt green
          ctx.beginPath();
          ctx.ellipse(56, 126, 6, 14, 0, 0, Math.PI * 2);
          ctx.fill();

          // Rotate arm
          ctx.translate(56, 108);
          ctx.rotate((armAngleDeg * Math.PI) / 180);
          ctx.drawImage(cBase, 46, 104, 20, 48, -10, -4, 20, 48);
          ctx.restore();

          // Ensure bottom-most pixels do not exceed y=181
          const frameData = ctx.getImageData(0, 0, 114, 182);
          // Any non-zero pixel at y > 181 is cleared
          for (let y = 182; y < 182; y++) {
            for (let x = 0; x < 114; x++) {
              frameData.data[(y * 114 + x) * 4 + 3] = 0;
            }
          }
          ctx.putImageData(frameData, 0, 0);

          return c.toDataURL('image/png');
        }

        // Frame 0: Pristine Side Stand (Passing Pose)
        const standData = cBase.toDataURL('image/png');

        // Frame 1: Stride 1 (Right leg forward +4px, left leg back -3px, arm swing -8 deg)
        const walk1Data = createStepFrame(4, -3, -8);

        // Frame 2: Stride 2 (Left leg forward +4px, right leg back -3px, arm swing +8 deg)
        const walk2Data = createStepFrame(-3, 4, 8);

        resolve({ standData, walk1Data, walk2Data });
      };
      sheet.src = '${dataUri}';
    })
  `);

  function save(dataUrl, file) {
    fs.writeFileSync(path.join(__dirname, 'src', 'renderer', file), dataUrl.replace(/^data:image\/png;base64,/, ''), 'base64');
  }

  save(result.standData, 'pico-side-stand.png');
  save(result.standData, 'pico-side-right.png');
  save(result.walk1Data, 'pico-side-walk-1.png');
  save(result.walk2Data, 'pico-side-walk-2.png');

  console.log('Saved clean side profile and walk frames 1 & 2');
  app.quit();
  process.exit(0);
});
