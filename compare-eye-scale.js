const { app, BrowserWindow } = require('electron');
const path = require('path');
const fs = require('fs');

app.whenReady().then(async () => {
  const win = new BrowserWindow({ show: false });
  await win.loadURL('about:blank');

  const idleB64 = fs.readFileSync(path.join(__dirname, 'src/renderer/pico-idle.png')).toString('base64');
  const curiousB64 = fs.readFileSync(path.join(__dirname, 'exp-curious.png')).toString('base64');

  const compare = await win.webContents.executeJavaScript(`
    (([idle, curious]) => {
      return new Promise((resolve) => {
        let loaded = 0;
        const imgs = [];
        function check() {
          loaded++;
          if (loaded < 2) return;
          // In idle: eye center Y is around 76. Distance between eyes is ~38px.
          // Let's find eye center in curious:
          resolve({
            idleW: imgs[0].width,
            idleH: imgs[0].height,
            curiousW: imgs[1].width,
            curiousH: imgs[1].height
          });
        }
        [idle, curious].forEach(src => {
          const img = new Image();
          img.onload = check;
          img.src = 'data:image/png;base64,' + src;
          imgs.push(img);
        });
      });
    })([ '${idleB64}', '${curiousB64}' ])
  `);

  console.log('Comparison:', compare);
  app.quit();
});
