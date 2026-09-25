const { app, BrowserWindow } = require('electron');
const path = require('path');
const fs = require('fs');

app.whenReady().then(async () => {
  const win = new BrowserWindow({ show: false });
  await win.loadURL('about:blank');

  const curiousB64 = fs.readFileSync(path.join(__dirname, 'exp-curious.png')).toString('base64');
  const thinkingB64 = fs.readFileSync(path.join(__dirname, 'exp-thinking.png')).toString('base64');

  const zoomUrl = await win.webContents.executeJavaScript(`
    (([curious, thinking]) => {
      return new Promise((resolve) => {
        let loaded = 0;
        const imgs = [];
        function check() {
          loaded++;
          if (loaded < 2) return;
          const [imCurious, imThinking] = imgs;

          const c = document.createElement('canvas');
          c.width = 400;
          c.height = 200;
          const ctx = c.getContext('2d');
          ctx.fillStyle = '#0f172a';
          ctx.fillRect(0, 0, 400, 200);

          // Find eyes in imCurious and imThinking
          // Curious eyes are around x: 30..90, y: 35..65
          ctx.drawImage(imCurious, 35, 30, 55, 30, 10, 20, 165, 90);
          ctx.drawImage(imThinking, 35, 30, 55, 30, 200, 20, 165, 90);

          ctx.font = 'bold 12px sans-serif';
          ctx.fillStyle = '#38bdf8';
          ctx.fillText('Curious (Look Right)', 20, 140);
          ctx.fillText('Thinking (Look Left)', 210, 140);

          resolve(c.toDataURL('image/png'));
        }
        [curious, thinking].forEach(src => {
          const img = new Image();
          img.onload = check;
          img.src = 'data:image/png;base64,' + src;
          imgs.push(img);
        });
      });
    })([ '${curiousB64}', '${thinkingB64}' ])
  `);

  fs.writeFileSync(path.join(__dirname, 'exp-eyes-zoom.png'), zoomUrl.replace(/^data:image\/png;base64,/, ''), 'base64');
  console.log('Saved exp-eyes-zoom.png');
  app.quit();
});
