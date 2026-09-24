const { app, BrowserWindow } = require('electron');
const path = require('path');
const fs = require('fs');

app.whenReady().then(async () => {
  const win = new BrowserWindow({ show: false });
  await win.loadURL('about:blank');

  const base64 = fs.readFileSync(path.join(__dirname, 'src', 'renderer', 'pico-side-left.png')).toString('base64');
  const uri = `data:image/png;base64,${base64}`;

  const clean = await win.webContents.executeJavaScript(`
    new Promise((resolve) => {
      const img = new Image();
      img.onload = () => {
        const c = document.createElement('canvas');
        c.width = img.width;
        c.height = img.height;
        const ctx = c.getContext('2d');
        ctx.drawImage(img, 0, 0);

        const imgData = ctx.getImageData(0, 0, c.width, c.height);
        const d = imgData.data;

        // Clear stray pixels on the far left (x <= 16)
        for (let y = 0; y < c.height; y++) {
          for (let x = 0; x <= 16; x++) {
            d[(y * c.width + x) * 4 + 3] = 0;
          }
        }

        ctx.putImageData(imgData, 0, 0);

        // Find clean bounds
        let minX = c.width, maxX = 0, minY = c.height, maxY = 0;
        for (let y = 0; y < c.height; y++) {
          for (let x = 0; x < c.width; x++) {
            if (d[(y * c.width + x) * 4 + 3] > 30) {
              if (x < minX) minX = x;
              if (x > maxX) maxX = x;
              if (y < minY) minY = y;
              if (y > maxY) maxY = y;
            }
          }
        }

        // Center on 114x182 canvas
        const cFinalLeft = document.createElement('canvas');
        cFinalLeft.width = 114;
        cFinalLeft.height = 182;
        const ctxL = cFinalLeft.getContext('2d');

        const charW = maxX - minX + 1;
        const charH = maxY - minY + 1;
        const offsetX = Math.round((114 - charW) / 2);
        const offsetY = 181 - charH; // bottom of soles at y=181

        ctxL.drawImage(c, minX, minY, charW, charH, offsetX, offsetY, charW, charH);

        // Create mirrored right-facing sprite
        const cFinalRight = document.createElement('canvas');
        cFinalRight.width = 114;
        cFinalRight.height = 182;
        const ctxR = cFinalRight.getContext('2d');
        ctxR.save();
        ctxR.translate(114, 0);
        ctxR.scale(-1, 1);
        ctxR.drawImage(cFinalLeft, 0, 0);
        ctxR.restore();

        resolve({
          bounds: { minX, maxX, minY, maxY, charW, charH },
          leftData: cFinalLeft.toDataURL('image/png'),
          rightData: cFinalRight.toDataURL('image/png')
        });
      };
      img.src = '${uri}';
    })
  `);

  console.log('Cleaned bounds:', clean.bounds);
  fs.writeFileSync(path.join(__dirname, 'src', 'renderer', 'pico-side-left.png'), clean.leftData.replace(/^data:image\/png;base64,/, ''), 'base64');
  fs.writeFileSync(path.join(__dirname, 'src', 'renderer', 'pico-side-right.png'), clean.rightData.replace(/^data:image\/png;base64,/, ''), 'base64');
  console.log('Successfully saved pristine pico-side-left.png and pico-side-right.png');

  app.quit();
});
