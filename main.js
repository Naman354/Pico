const { app, BrowserWindow, screen, ipcMain } = require('electron');
const path = require('path');

app.commandLine.appendSwitch('enable-transparent-visuals');

let mainWindow = null;

/**
 * Taskbar Surface World Baseline:
 * Calculates the exact top ledge of the visible taskbar on Windows.
 * This establishes the permanent physical surface for Pico's feet.
 */
function getTaskbarSurface() {
  const primaryDisplay = screen.getPrimaryDisplay();
  const { x: workX, y: workY, width: workWidth, height: workHeight } = primaryDisplay.workArea;

  // On Windows, workArea represents desktop space above/bounded by the taskbar.
  // The top edge of a bottom taskbar is at workY + workHeight.
  const surfaceY = workY + workHeight;

  return {
    surfaceY,
    workX,
    workY,
    workWidth,
    workHeight
  };
}

function createWindow() {
  const surface = getTaskbarSurface();

  const windowWidth = 300;
  const windowHeight = 85;

  // Window's bottom sits precisely on the taskbar ledge (surfaceY)
  const posX = surface.workX + surface.workWidth - windowWidth - 40;
  const posY = surface.surfaceY - windowHeight;

  mainWindow = new BrowserWindow({
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
      nodeIntegration: false,
      devTools: true
    }
  });

  mainWindow.loadFile(path.join(__dirname, 'src', 'renderer', 'index.html'));

  // Forward mouse events over transparent regions so desktop icons are directly clickable
  mainWindow.setIgnoreMouseEvents(true, { forward: true });

  ipcMain.on('set-ignore-mouse-events', (event, ignore, options) => {
    const win = BrowserWindow.fromWebContents(event.sender);
    if (win && !win.isDestroyed()) {
      win.setIgnoreMouseEvents(ignore, options);
    }
  });

  // Toggle DevTools with Ctrl+Shift+I in development
  mainWindow.webContents.on('before-input-event', (event, input) => {
    if (input.control && input.shift && input.key.toLowerCase() === 'i') {
      mainWindow.webContents.toggleDevTools();
      event.preventDefault();
    }
  });

  mainWindow.on('closed', () => {
    mainWindow = null;
  });
}

app.whenReady().then(() => {
  createWindow();

  app.on('activate', () => {
    if (BrowserWindow.getAllWindows().length === 0) createWindow();
  });
});

app.on('window-all-closed', () => {
  if (process.platform !== 'darwin') {
    app.quit();
  }
});
