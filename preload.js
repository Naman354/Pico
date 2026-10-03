const { contextBridge, ipcRenderer } = require('electron');

contextBridge.exposeInMainWorld('picoAPI', {
  setIgnoreMouseEvents: (ignore, options) => {
    ipcRenderer.send('set-ignore-mouse-events', ignore, options);
  },
  getTaskbarSurface: () => ipcRenderer.invoke('get-taskbar-surface'),
  getAllSurfaces: () => ipcRenderer.invoke('get-all-surfaces'),
  getActiveSurface: () => ipcRenderer.invoke('get-active-surface'),
  getSurface: (id) => ipcRenderer.invoke('get-surface', id),
  getSurfaceBelow: (x, y) => ipcRenderer.invoke('get-surface-below', x, y),
  getReachableSurfaces: (surfaceId, x, jumpLimits) => ipcRenderer.invoke('get-reachable-surfaces', surfaceId, x, jumpLimits),
  findNavigationPath: (fromId, fromX, toId, toX, jumpLimits) => ipcRenderer.invoke('find-navigation-path', fromId, fromX, toId, toX, jumpLimits),
  onCharacterAction: (callback) => {
    ipcRenderer.on('character-action', (_event, action) => callback(action));
  }
});
