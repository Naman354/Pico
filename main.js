const { app, BrowserWindow, screen, ipcMain } = require('electron');
const path = require('path');
const { Surface, SurfaceManager, TaskbarWorldSurface } = require('./surfaces.js');

app.commandLine.appendSwitch('enable-transparent-visuals');

let mainWindow = null;
const surfaceManager = new SurfaceManager();

function createWindow() {
  const surface = TaskbarWorldSurface.getSurface();

  // Full-desktop transparent canvas covering the primary display workArea
  const windowWidth = surface.workArea.width;
  const windowHeight = surface.workArea.height;

  // Position window covering workArea so its bottom edge rests precisely on the taskbar ledge
  mainWindow = new BrowserWindow({
    width: windowWidth,
    height: windowHeight,
    x: surface.workArea.x,
    y: surface.workArea.y,
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

  // Align window bottom precisely with the taskbar top ledge accounting for scaling
  const bounds = mainWindow.getBounds();
  const alignedY = surface.ledgeY - bounds.height;
  mainWindow.setPosition(bounds.x, alignedY);

  // Enforce topmost z-order across all desktop spaces and windows
  mainWindow.setAlwaysOnTop(true, 'screen-saver', 1);
  mainWindow.setVisibleOnAllWorkspaces(true, { visibleOnFullScreen: true });

  // Reassert topmost status when focus blurs (e.g. clicking taskbar, desktop, or other apps)
  mainWindow.on('blur', () => {
    mainWindow.setAlwaysOnTop(true, 'screen-saver', 1);
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

  ipcMain.handle('get-taskbar-surface', () => {
    return TaskbarWorldSurface.getSurface();
  });

  ipcMain.handle('get-all-surfaces', () => {
    return surfaceManager.getAllSurfaces();
  });

  ipcMain.handle('get-active-surface', () => {
    return surfaceManager.getActiveSurface();
  });

  ipcMain.handle('get-surface', (_event, id) => {
    return surfaceManager.getSurface(id);
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
  surfaceManager.initPrimaryDisplaySurfaces();
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

module.exports = { Surface, SurfaceManager, TaskbarWorldSurface, surfaceManager };
