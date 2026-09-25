const { app, BrowserWindow } = require('electron');
const path = require('path');
const fs = require('fs');

app.whenReady().then(async () => {
  const win = new BrowserWindow({ show: false });
  await win.loadURL('about:blank');

  const charSheetPath = 'C:/Users/hp/.gemini/antigravity-ide/brain/31db9470-0d36-42b9-9098-2ceae6d52096/.tempmediaStorage/media_1790277058739.jpg';
  const imgBase64 = fs.readFileSync(charSheetPath).toString('base64');

  const result = await win.webContents.executeJavaScript(`
    new Promise((resolve) => {
      const sheet = new Image();
      sheet.onload = () => {
        // Full Side Left bounds on sheet:
        // x: 134 to 244, y: 92 to 280
        const minX = 134, maxX = 244, minY = 92, maxY = 280;
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
          if (y > h - 14 && r > 185 && g > 175 && b > 160) return true;
          // Sheet cream background
          return (r > 216 && g > 206 && b > 190);
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
        // Target canvas: 114 x 182
        // We want shoe soles to terminate precisely at y=181 (matching pico-idle.png)
        // and top hair tuft to start cleanly at y=1 (leaving y=0 clear of edge clipping).
        // renderH = 181 - 1 = 180 (height from y=1 to y=181 is 181px)
        const renderH = 181;
        const scale = renderH / charH;
        const renderW = Math.round(charW * scale); // 102px
        const renderX = 3; // Leaves 3px left margin, 9px right margin. Shoes center at 57.5px.
        const renderY = 1; // Hair tip starts at y=1, shoes terminate at y=181

        const cBase = document.createElement('canvas');
        cBase.width = 114;
        cBase.height = 182;
        const ctxBase = cBase.getContext('2d');
        ctxBase.imageSmoothingEnabled = true;
        ctxBase.imageSmoothingQuality = 'high';
        ctxBase.drawImage(cRaw, bMinX, bMinY, charW, charH, renderX, renderY, renderW, renderH);

        // Ensure bottom-most pixels do not exceed y=181
        const baseData = ctxBase.getImageData(0, 0, 114, 182);
        for (let y = 182; y < 182; y++) {
          for (let x = 0; x < 114; x++) {
            baseData.data[(y * 114 + x) * 4 + 3] = 0;
          }
        }
        ctxBase.putImageData(baseData, 0, 0);

        // Function to create organic stride frame
        function createWalkFrame(leadX, trailX, armTiltDeg) {
          const c = document.createElement('canvas');
          c.width = 114;
          c.height = 182;
          const ctx = c.getContext('2d');
          ctx.imageSmoothingEnabled = true;
          ctx.imageSmoothingQuality = 'high';

          // 1. Draw trailing leg (y: 154 to 182)
          ctx.save();
          ctx.translate(trailX, 0);
          ctx.drawImage(cBase, 40, 154, 38, 28, 40, 154, 38, 28);
          ctx.globalCompositeOperation = 'source-atop';
          ctx.fillStyle = 'rgba(25, 20, 15, 0.18)';
          ctx.fillRect(35, 154, 48, 28);
          ctx.restore();

          // 2. Draw leading leg (y: 154 to 182)
          ctx.save();
          ctx.translate(leadX, 0);
          ctx.drawImage(cBase, 44, 154, 36, 28, 44, 154, 36, 28);
          ctx.restore();

          // 3. Draw upper body (head, shirt torso, shorts: y: 0 to 156)
          ctx.drawImage(cBase, 0, 0, 114, 156, 0, 0, 114, 156);

          // 4. Clean shorts cuffs to seal leg tops naturally
          ctx.drawImage(cBase, 42, 146, 36, 10, 42, 146, 36, 10);

          // 5. Arm swing with clean pivot at shoulder (x: 55, y: 110)
          if (armTiltDeg !== 0) {
            ctx.save();
            ctx.translate(55, 110);
            ctx.rotate((armTiltDeg * Math.PI) / 180);
            ctx.drawImage(cBase, 45, 106, 22, 42, -10, -4, 22, 42);
            ctx.restore();
          }

          // Clean any pixels outside base character's vertical envelope
          const fData = ctx.getImageData(0, 0, 114, 182);
          const oData = baseData.data;

          for (let y = 0; y < 154; y++) {
            for (let x = 0; x < 114; x++) {
              const p = (y * 114 + x) * 4;
              if (oData[p + 3] === 0) {
                fData.data[p + 3] = 0;
              }
            }
          }

          ctx.putImageData(fData, 0, 0);
          return c.toDataURL('image/png');
        }

        const standData = cBase.toDataURL('image/png');
        const walk1Data = createWalkFrame(3.5, -3, -5);
        const walk2Data = createWalkFrame(-3, 3.5, 5);

        // Mirrored Left-facing stand
        const cLeft = document.createElement('canvas');
        cLeft.width = 114;
        cLeft.height = 182;
        const ctxL = cLeft.getContext('2d');
        ctxL.save();
        ctxL.translate(114, 0);
        ctxL.scale(-1, 1);
        ctxL.drawImage(cBase, 0, 0);
        ctxL.restore();
        const leftData = cLeft.toDataURL('image/png');

        resolve({
          charBox: { bMinX, bMaxX, bMinY, bMaxY, charW, charH },
          renderW,
          renderH,
          renderX,
          renderY,
          standData,
          walk1Data,
          walk2Data,
          leftData
        });
      };
      sheet.src = 'data:image/jpeg;base64,' + '${imgBase64}';
    })
  `);

  console.log('Generation results:', result.charBox, {
    renderW: result.renderW,
    renderH: result.renderH,
    renderX: result.renderX,
    renderY: result.renderY
  });

  function save(dataUrl, file) {
    fs.writeFileSync(path.join(__dirname, 'src', 'renderer', file), dataUrl.replace(/^data:image\/png;base64,/, ''), 'base64');
  }

  // Save new sprites
  save(result.standData, 'pico-side-stand.png');
  save(result.standData, 'pico-side-profile.png');
  save(result.standData, 'pico-side-right.png');
  save(result.leftData, 'pico-side-left.png');
  save(result.walk1Data, 'pico-side-walk-1.png');
  save(result.walk2Data, 'pico-side-walk-2.png');

  console.log('All side sprites successfully updated with pristine full hair outline!');
  app.quit();
});
