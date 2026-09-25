const { app, BrowserWindow } = require('electron');
const path = require('path');
const fs = require('fs');

app.whenReady().then(async () => {
  const win = new BrowserWindow({ show: false });
  await win.loadURL('about:blank');

  const idleB64 = fs.readFileSync(path.join(__dirname, 'src/renderer/pico-idle.png')).toString('base64');
  const curiousB64 = fs.readFileSync(path.join(__dirname, 'exp-curious.png')).toString('base64');

  const align = await win.webContents.executeJavaScript(`
    (([idleSrc, curiousSrc]) => {
      return new Promise((resolve) => {
        let loaded = 0;
        const imgs = [];
        function check() {
          loaded++;
          if (loaded < 2) return;
          const [imIdle, imCurious] = imgs;

          // In imIdle (114x182):
          // Head is roughly: x: 0..114, y: 0..110
          // In imCurious (110x140):
          // Head is roughly: x: 0..110, y: 0..110
          const c = document.createElement('canvas');
          c.width = 300;
          c.height = 150;
          const ctx = c.getContext('2d');
          ctx.fillStyle = '#0f172a';
          ctx.fillRect(0, 0, 300, 150);

          ctx.drawImage(imIdle, 0, 0, 114, 110, 10, 10, 114, 110);
          ctx.drawImage(imCurious, 0, 0, 110, 110, 140, 10, 110, 110);

          resolve(c.toDataURL('image/png'));
        }
        [idleSrc, curiousSrc].forEach(src => {
          const img = new Image();
          img.onload = check;
          img.src = 'data:image/png;base64,' + src;
          imgs.push(img);
        });
      });
    })([ '${idleB64}', '${curiousB64}' ])
  `);

  fs.writeFileSync(path.join(__dirname, 'compare-idle-curious-heads.png'), align.replace(/^data:image\/png;base64,/, ''), 'base64');
  console.log('Saved compare-idle-curious-heads.png');
  app.quit();
});
