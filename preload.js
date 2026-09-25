const { contextBridge, ipcRenderer } = require('electron');

contextBridge.exposeInMainWorld('picoAPI', {
  setIgnoreMouseEvents: (ignore, options) => {
    ipcRenderer.send('set-ignore-mouse-events', ignore, options);
  },
  getTaskbarSurface: () => ipcRenderer.invoke('get-taskbar-surface'),
  getAllSurfaces: () => ipcRenderer.invoke('get-all-surfaces'),
  getActiveSurface: () => ipcRenderer.invoke('get-active-surface'),
  getSurface: (id) => ipcRenderer.invoke('get-surface', id),
  onCharacterAction: (callback) => {
    ipcRenderer.on('character-action', (_event, action) => callback(action));
  }
});
