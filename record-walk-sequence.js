const { app, BrowserWindow } = require('electron');
const path = require('path');
const fs = require('fs');

app.whenReady().then(async () => {
  const win = new BrowserWindow({
    width: 860,
    height: 360,
    show: false,
    webPreferences: {
      nodeIntegration: false,
      contextIsolation: true
    }
  });

  await win.loadFile(path.join(__dirname, 'preview-walk.html'));
  win.show();

  const wait = (ms) => new Promise(r => setTimeout(r, ms));

  // Wait for animation to start
  await wait(300);

  // Capture 12 frames at 60ms intervals (spanning ~720ms = nearly 2 full steps)
  const frameCaptures = [];
  for (let i = 0; i < 12; i++) {
    const img = await win.capturePage({ x: 20, y: 70, width: 800, height: 120 });
    frameCaptures.push(img.toPNG());
    await wait(60);
  }

  // Create a composite contact sheet of the captures
  const compHtml = `
    <!DOCTYPE html>
    <html>
    <head>
      <style>
        body { background: #0b0f19; color: #fff; font-family: sans-serif; padding: 10px; margin: 0; }
        .grid { display: grid; grid-template-columns: repeat(3, 1fr); gap: 10px; }
        .frame-box { background: #1e293b; border-radius: 6px; padding: 6px; }
        .label { font-size: 11px; color: #38bdf8; margin-bottom: 4px; }
        img { width: 100%; border: 1px solid #334155; }
      </style>
    </head>
    <body>
      <h3>Pico Walk Motion Sequence (60ms intervals)</h3>
      <div class="grid">
        ${frameCaptures.map((buf, idx) => `
          <div class="frame-box">
            <div class="label">Frame ${idx + 1} (${idx * 60}ms)</div>
            <img src="data:image/png;base64,${buf.toString('base64')}" />
          </div>
        `).join('')}
      </div>
    </body>
    </html>
  `;

  const compWin = new BrowserWindow({ width: 900, height: 750, show: false });
  await compWin.loadURL('data:text/html;charset=utf-8,' + encodeURIComponent(compHtml));
  await wait(300);
  const sheetImg = await compWin.capturePage();
  fs.writeFileSync(path.join(__dirname, 'walk-sequence-capture.png'), sheetImg.toPNG());
  console.log('Saved walk-sequence-capture.png');

  app.quit();
});
