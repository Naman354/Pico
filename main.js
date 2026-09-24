const { app, BrowserWindow, screen, ipcMain } = require('electron');
const path = require('path');

app.commandLine.appendSwitch('enable-transparent-visuals');

let mainWindow = null;

/**
 * TaskbarWorldSurface:
 * Reusable world-coordinate / physical surface abstraction.
 * Treats the visible Windows taskbar as a real physical ledge.
 * Establishes the exact screen baseline for Pico's feet.
 */
class TaskbarWorldSurface {
  static getSurface() {
    const display = screen.getPrimaryDisplay();
    const { bounds, workArea } = display;

    // Detect taskbar top edge in desktop screen coordinates
    let ledgeY = workArea.y + workArea.height; // Standard bottom taskbar ledge
    let isBottom = true;

    if (workArea.y > bounds.y) {
      // Top taskbar fallback
      ledgeY = workArea.y;
      isBottom = false;
    }

    return {
      ledgeY,
      isBottom,
      leftBound: workArea.x,
      rightBound: workArea.x + workArea.width,
      bounds,
      workArea,
      // Default resting X coordinate near the system tray on the taskbar
      defaultX: workArea.x + workArea.width - 320
    };
  }
}

function createWindow() {
  const surface = TaskbarWorldSurface.getSurface();

  const windowWidth = 290;
  const windowHeight = 85;

  // Position window so its bottom edge rests precisely on the taskbar ledge
  const posX = surface.defaultX;
  const posY = surface.ledgeY - windowHeight;

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

  // Keep Pico above normal desktop windows and resting on the taskbar
  mainWindow.setAlwaysOnTop(true, 'screen-saver');

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

module.exports = { TaskbarWorldSurface };
