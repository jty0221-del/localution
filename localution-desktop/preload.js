const { ipcRenderer } = require('electron');

window.localution = {
  openHometax: (data) => ipcRenderer.send('open-hometax', data),
  minimize: () => ipcRenderer.send('window-minimize'),
  maximize: () => ipcRenderer.send('window-maximize'),
  close: () => ipcRenderer.send('window-close'),
  onAutofillResult: (cb) => ipcRenderer.on('autofill-result', (_, data) => cb(data)),
};
