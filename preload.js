const { contextBridge, ipcRenderer } = require('electron');

contextBridge.exposeInMainWorld('electronAPI', {
  getSettings: () => ipcRenderer.invoke('get-settings'),
  saveSettings: (settings) => ipcRenderer.invoke('save-settings', settings),
  minimizeWindow: () => ipcRenderer.invoke('minimize-window'),
  maximizeWindow: () => ipcRenderer.invoke('maximize-window'),
  closeWindow: () => ipcRenderer.invoke('close-window'),
  isMaximized: () => ipcRenderer.invoke('is-maximized'),
  addHistory: (entry) => ipcRenderer.invoke('add-history', entry),
  getHistory: () => ipcRenderer.invoke('get-history'),
  clearHistory: () => ipcRenderer.invoke('clear-history'),
  addBookmark: (entry) => ipcRenderer.invoke('add-bookmark', entry),
  removeBookmark: (url) => ipcRenderer.invoke('remove-bookmark', url),
  getBookmarks: () => ipcRenderer.invoke('get-bookmarks'),
  isBookmarked: (url) => ipcRenderer.invoke('is-bookmarked', url),
  checkForUpdates: () => ipcRenderer.invoke('check-for-updates'),
  installUpdate: () => ipcRenderer.invoke('install-update'),
  getAppVersion: () => ipcRenderer.invoke('get-app-version'),
  onUpdateStatus: (callback) => {
    ipcRenderer.on('update-status', (_, status, version) => callback(status, version));
  }
});
