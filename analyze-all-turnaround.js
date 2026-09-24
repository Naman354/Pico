const { app, BrowserWindow } = require('electron');
const path = require('path');
const fs = require('fs');

app.whenReady().then(async () => {
  const win = new BrowserWindow({ show: false });
  await win.loadURL('about:blank');

  const charSheetPath = 'C:/Users/hp/.gemini/antigravity-ide/brain/31db9470-0d36-42b9-9098-2ceae6d52096/.tempmediaStorage/media_1790277058739.jpg';
  const imgBase64 = fs.readFileSync(charSheetPath).toString('base64');
  const dataUri = 'data:image/jpeg;base64,' + imgBase64;

  const analysis = await win.webContents.executeJavaScript(`
    new Promise((resolve) => {
      const img = new Image();
      img.onload = () => {
        const c = document.createElement('canvas');
        c.width = img.width;
        c.height = img.height;
        const ctx = c.getContext('2d');
        ctx.drawImage(img, 0, 0);

        // Crop four turnaround views:
        // 1. Front: x: 10 to 130, y: 80 to 290
        // 2. Side (Left): x: 120 to 240, y: 80 to 290
        // 3. Back: x: 235 to 355, y: 80 to 290
        // 4. Side (Right): x: 345 to 465, y: 80 to 290

        function analyzeRegion(minX, maxX, minY, maxY) {
          const w = maxX - minX;
          const h = maxY - minY;
          const imgData = ctx.getImageData(minX, minY, w, h);
          const d = imgData.data;

          let topHair = -1;
          let bottomShoe = -1;
          let leftX = -1;
          let rightX = -1;

          for (let y = 0; y < h; y++) {
            for (let x = 0; x < w; x++) {
              const p = (y * w + x) * 4;
              const r = d[p], g = d[p+1], b = d[p+2];
              // Non-background pixel
              const isBg = (r > 225 && g > 215 && b > 200) || (y > h - 25 && r > 180 && g > 170 && b > 155);
              if (!isBg) {
                if (topHair === -1) topHair = y;
                bottomShoe = y;
                if (leftX === -1 || x < leftX) leftX = x;
                if (rightX === -1 || x > rightX) rightX = x;
              }
            }
          }
          return {
            globalBox: { minX: minX + leftX, maxX: minX + rightX, minY: minY + topHair, maxY: minY + bottomShoe },
            width: rightX - leftX + 1,
            height: bottomShoe - topHair + 1
          };
        }

        const front = analyzeRegion(10, 130, 80, 290);
        const sideLeft = analyzeRegion(120, 240, 80, 290);
        const back = analyzeRegion(235, 355, 80, 290);
        const sideRight = analyzeRegion(345, 465, 80, 290);

        resolve({ front, sideLeft, back, sideRight });
      };
      img.src = '${dataUri}';
    })
  `);

  console.log('Turnaround analysis:', JSON.stringify(analysis, null, 2));
  app.quit();
});
