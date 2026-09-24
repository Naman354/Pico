const { contextBridge, ipcRenderer } = require('electron');

contextBridge.exposeInMainWorld('picoAPI', {
  setIgnoreMouseEvents: (ignore, options) => {
    ipcRenderer.send('set-ignore-mouse-events', ignore, options);
  },
  getTaskbarSurface: () => ipcRenderer.invoke('get-taskbar-surface'),
  onCharacterAction: (callback) => {
    ipcRenderer.on('character-action', (_event, action) => callback(action));
  }
});
