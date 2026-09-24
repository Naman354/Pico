const { app, BrowserWindow, screen } = require('electron');
const path = require('path');
const fs = require('fs');

app.commandLine.appendSwitch('enable-transparent-visuals');

app.whenReady().then(async () => {
  const primaryDisplay = screen.getPrimaryDisplay();
  const { width: screenWidth, height: screenHeight } = primaryDisplay.workAreaSize;
  const { x: workX, y: workY } = primaryDisplay.workArea;

  const windowWidth = 320;
  const windowHeight = 110;
  const posX = workX + screenWidth - windowWidth - 50;
  const posY = workY + screenHeight - windowHeight;

  const win = new BrowserWindow({
    width: windowWidth,
    height: windowHeight,
    x: posX,
    y: posY,
    transparent: true,
    frame: false,
    hasShadow: false,
    resizable: false,
    alwaysOnTop: true,
    skipTaskbar: true,
    backgroundColor: '#00000000',
    webPreferences: {
      preload: path.join(__dirname, 'preload.js'),
      contextIsolation: true,
      nodeIntegration: false
    }
  });

  win.loadFile(path.join(__dirname, 'src', 'renderer', 'index.html'));

  win.webContents.on('did-finish-load', async () => {
    // Wait for initial render
    await new Promise(r => setTimeout(r, 200));

    // Capture idle screenshot
    const idleImg = await win.capturePage();
    fs.writeFileSync(path.join(__dirname, 'pico-idle.png'), idleImg.toPNG());
    console.log('Saved pico-idle.png');

    // Click Pico to open attached speech bubble
    await win.webContents.executeJavaScript(`
      document.getElementById('pico-container').click();
    `);
    
    // Wait for transition animation to complete
    await new Promise(r => setTimeout(r, 400));

    // Capture open speech bubble screenshot
    const openImg = await win.capturePage();
    fs.writeFileSync(path.join(__dirname, 'pico-open.png'), openImg.toPNG());
    console.log('Saved pico-open.png');

    app.quit();
  });
});
