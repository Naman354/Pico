const { app, BrowserWindow } = require('electron');
const path = require('path');
const fs = require('fs');

app.whenReady().then(async () => {
  const win = new BrowserWindow({ show: false });
  await win.loadURL('about:blank');

  const idleB64 = fs.readFileSync(path.join(__dirname, 'src/renderer/pico-idle.png')).toString('base64');
  const curiousB64 = fs.readFileSync(path.join(__dirname, 'exp-curious.png')).toString('base64');
  const thinkingB64 = fs.readFileSync(path.join(__dirname, 'exp-thinking.png')).toString('base64');

  const sizes = await win.webContents.executeJavaScript(`
    (([idle, curious, thinking]) => {
      return new Promise((resolve) => {
        let loaded = 0;
        const imgs = [];
        function check() {
          loaded++;
          if (loaded < 3) return;
          resolve({
            idle: { w: imgs[0].width, h: imgs[0].height },
            curious: { w: imgs[1].width, h: imgs[1].height },
            thinking: { w: imgs[2].width, h: imgs[2].height }
          });
        }
        [idle, curious, thinking].forEach(src => {
          const img = new Image();
          img.onload = check;
          img.src = 'data:image/png;base64,' + src;
          imgs.push(img);
        });
      });
    })([ '${idleB64}', '${curiousB64}', '${thinkingB64}' ])
  `);

  console.log('Image dimensions:', sizes);
  app.quit();
});
