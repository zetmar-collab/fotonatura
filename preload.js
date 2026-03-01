const { contextBridge, ipcRenderer } = require('electron');

contextBridge.exposeInMainWorld('electronAPI', {
  openFile: () => ipcRenderer.invoke('open-file'),
  openFilePath: (filePath) => ipcRenderer.invoke('open-file-path', filePath),
  saveFile: (dataUrl) => ipcRenderer.invoke('save-file', dataUrl),
  savePDF: (jpegBase64) => ipcRenderer.invoke('save-pdf', jpegBase64),
});
