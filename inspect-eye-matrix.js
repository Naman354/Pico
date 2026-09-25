const { app, BrowserWindow } = require('electron');
const path = require('path');
const fs = require('fs');

app.whenReady().then(async () => {
  const win = new BrowserWindow({ show: false });
  await win.loadURL('about:blank');

  const idleB64 = fs.readFileSync(path.join(__dirname, 'src/renderer/pico-idle.png')).toString('base64');

  const html = await win.webContents.executeJavaScript(`
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

          // Left Eye (viewer's left):
          // x: 23..54, y: 64..87
          // Let's print out the exact RGB values as a table:
          const d = ctx.getImageData(0, 0, w, h).data;
          
          let table = '<table border="1" style="border-collapse:collapse;font-size:8px;">';
          for (let y = 65; y <= 86; y++) {
            table += '<tr><td>' + y + '</td>';
            for (let x = 25; x <= 52; x++) {
              const idx = (y * w + x) * 4;
              const r = d[idx], g = d[idx+1], b = d[idx+2];
              const hex = ((1 << 24) + (r << 16) + (g << 8) + b).toString(16).slice(1);
              table += '<td style="background:#' + hex + ';width:12px;height:12px;" title="(' + x + ',' + y + ') #' + hex + '"></td>';
            }
            table += '</tr>';
          }
          table += '</table>';
          resolve(table);
        };
        img.src = 'data:image/png;base64,' + idleSrc;
      });
    })('${idleB64}')
  `);

  fs.writeFileSync(path.join(__dirname, 'left-eye-matrix.html'), html);
  console.log('Saved left-eye-matrix.html');
  app.quit();
});
