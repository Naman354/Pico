const { app, BrowserWindow } = require('electron');
const path = require('path');
const fs = require('fs');

app.whenReady().then(async () => {
  const win = new BrowserWindow({ show: false });
  await win.loadURL('about:blank');

  const curiousB64 = fs.readFileSync(path.join(__dirname, 'exp-curious.png')).toString('base64');
  const thinkingB64 = fs.readFileSync(path.join(__dirname, 'exp-thinking.png')).toString('base64');
  const neutralB64 = fs.readFileSync(path.join(__dirname, 'exp-neutral.png')).toString('base64');

  const eyes = await win.webContents.executeJavaScript(`
    (([curious, thinking, neutral]) => {
      return new Promise((resolve) => {
        let loaded = 0;
        const imgs = [];
        function check() {
          loaded++;
          if (loaded < 3) return;
          const [imCurious, imThinking, imNeutral] = imgs;

          // Let's create an enlarged visualization of the eye rows in each expression
          // In exp-curious: character is 110x140. Head center is around (55, 60).
          // Eye row is roughly y: 40..75.
          const c = document.createElement('canvas');
          c.width = 110 * 3 * 2;
          c.height = 70 * 2;
          const ctx = c.getContext('2d');
          ctx.imageSmoothingEnabled = false;

          // Neutral eyes
          ctx.drawImage(imNeutral, 15, 35, 80, 50, 0, 0, 80 * 2, 50 * 2);
          // Curious eyes (look right)
          ctx.drawImage(imCurious, 15, 35, 80, 50, 180, 0, 80 * 2, 50 * 2);
          // Thinking eyes (look left)
          ctx.drawImage(imThinking, 15, 35, 80, 50, 360, 0, 80 * 2, 50 * 2);

          resolve(c.toDataURL('image/png'));
        }
        [curious, thinking, neutral].forEach(src => {
          const img = new Image();
          img.onload = check;
          img.src = 'data:image/png;base64,' + src;
          imgs.push(img);
        });
      });
    })([ '${curiousB64}', '${thinkingB64}', '${neutralB64}' ])
  `);

  fs.writeFileSync(path.join(__dirname, 'expression-eyes-compared.png'), eyes.replace(/^data:image\/png;base64,/, ''), 'base64');
  console.log('Saved expression-eyes-compared.png');
  app.quit();
});
