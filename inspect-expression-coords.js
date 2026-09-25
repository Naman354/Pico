const { app, BrowserWindow } = require('electron');
const path = require('path');
const fs = require('fs');

app.whenReady().then(async () => {
  const win = new BrowserWindow({ show: false });
  await win.loadURL('about:blank');

  const sheetPath = 'C:/Users/hp/.gemini/antigravity-ide/brain/31db9470-0d36-42b9-9098-2ceae6d52096/.tempmediaStorage/media_1790277058739.jpg';
  const imgBase64 = fs.readFileSync(sheetPath).toString('base64');

  const crops = await win.webContents.executeJavaScript(`
    ((sheetB64) => {
      return new Promise((resolve) => {
        const img = new Image();
        img.onload = () => {
          // Expressions row is around Y: 330..500.
          // Neutral: x ~ 15..135
          // Happy: x ~ 125..240
          // Curious: x ~ 235..355
          // Surprised: x ~ 350..470
          // Thinking: x ~ 460..575
          // Sleepy: x ~ 565..680
          
          const exps = [
            { name: 'neutral', x: 18, y: 350, w: 110, h: 140 },
            { name: 'happy', x: 130, y: 350, w: 110, h: 140 },
            { name: 'curious', x: 240, y: 350, w: 110, h: 140 },
            { name: 'surprised', x: 350, y: 350, w: 110, h: 140 },
            { name: 'thinking', x: 460, y: 350, w: 110, h: 140 },
            { name: 'sleepy', x: 570, y: 350, w: 110, h: 140 }
          ];

          const res = {};
          exps.forEach(e => {
            const c = document.createElement('canvas');
            c.width = e.w;
            c.height = e.h;
            const ctx = c.getContext('2d');
            ctx.drawImage(img, e.x, e.y, e.w, e.h, 0, 0, e.w, e.h);
            res[e.name] = c.toDataURL('image/png');
          });

          resolve(res);
        };
        img.src = 'data:image/jpeg;base64,' + sheetB64;
      });
    })('${imgBase64}')
  `);

  Object.entries(crops).forEach(([k, v]) => {
    fs.writeFileSync(path.join(__dirname, `exp-${k}.png`), v.replace(/^data:image\/png;base64,/, ''), 'base64');
  });
  console.log('Saved expression crops');
  app.quit();
});
