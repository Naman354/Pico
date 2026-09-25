const { app, BrowserWindow } = require('electron');
const path = require('path');
const fs = require('fs');

app.whenReady().then(async () => {
  const win = new BrowserWindow({ show: false });
  await win.loadURL('about:blank');

  const curiousB64 = fs.readFileSync(path.join(__dirname, 'exp-curious.png')).toString('base64');
  const thinkingB64 = fs.readFileSync(path.join(__dirname, 'exp-thinking.png')).toString('base64');
  const sleepyB64 = fs.readFileSync(path.join(__dirname, 'exp-sleepy.png')).toString('base64');

  const info = await win.webContents.executeJavaScript(`
    (([curious, thinking, sleepy]) => {
      return new Promise((resolve) => {
        let loaded = 0;
        const imgs = [];
        function check() {
          loaded++;
          if (loaded < 3) return;
          const [imCurious, imThinking, imSleepy] = imgs;

          // Let's create a full preview of each image with a 10px grid so we can see exact eye coordinates
          const c = document.createElement('canvas');
          c.width = 110 * 3 + 40;
          c.height = 140;
          const ctx = c.getContext('2d');
          ctx.fillStyle = '#1e293b';
          ctx.fillRect(0, 0, c.width, c.height);

          [imCurious, imThinking, imSleepy].forEach((im, i) => {
            const x = 10 + i * 120;
            ctx.drawImage(im, x, 0);
          });

          resolve(c.toDataURL('image/png'));
        }
        [curious, thinking, sleepy].forEach(src => {
          const img = new Image();
          img.onload = check;
          img.src = 'data:image/png;base64,' + src;
          imgs.push(img);
        });
      });
    })([ '${curiousB64}', '${thinkingB64}', '${sleepyB64}' ])
  `);

  fs.writeFileSync(path.join(__dirname, 'exp-grid-preview.png'), info.replace(/^data:image\/png;base64,/, ''), 'base64');
  console.log('Saved exp-grid-preview.png');
  app.quit();
});
