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
  await wait(300);

  const frameCaptures = [];
  for (let i = 0; i < 8; i++) {
    const rect = await win.webContents.executeJavaScript(`
      (() => {
        const r = document.getElementById('pico-runner').getBoundingClientRect();
        return { x: Math.round(r.left - 10), y: Math.round(r.top - 10), width: Math.round(r.width + 20), height: Math.round(r.height + 20) };
      })()
    `);
    const img = await win.capturePage(rect);
    const info = await win.webContents.executeJavaScript('status.textContent');
    frameCaptures.push({ buf: img.toPNG(), info });
    await wait(80);
  }

  const compHtml = `
    <!DOCTYPE html>
    <html>
    <head>
      <style>
        body { background: #0b0f19; color: #fff; font-family: sans-serif; padding: 10px; margin: 0; }
        .grid { display: grid; grid-template-columns: repeat(4, 1fr); gap: 10px; }
        .frame-box { background: #1e293b; border-radius: 6px; padding: 6px; text-align: center; }
        .label { font-size: 11px; color: #38bdf8; margin-bottom: 4px; font-family: monospace; }
        img { width: 70px; height: 95px; border: 1px solid #334155; }
      </style>
    </head>
    <body>
      <h3>Pico Dynamic Walk Cycle Tracking</h3>
      <div class="grid">
        ${frameCaptures.map((f, idx) => `
          <div class="frame-box">
            <div class="label">${idx + 1} (${idx * 80}ms)<br/>${f.info.split('|')[2] || ''}</div>
            <img src="data:image/png;base64,${f.buf.toString('base64')}" />
          </div>
        `).join('')}
      </div>
    </body>
    </html>
  `;

  const compWin = new BrowserWindow({ width: 600, height: 420, show: false });
  await compWin.loadURL('data:text/html;charset=utf-8,' + encodeURIComponent(compHtml));
  await wait(300);
  const sheetImg = await compWin.capturePage();
  fs.writeFileSync(path.join(__dirname, 'pico-walk-closeup-sequence-2.png'), sheetImg.toPNG());
  console.log('Saved pico-walk-closeup-sequence-2.png');

  app.quit();
});
