const { app, BrowserWindow, ipcMain, session } = require('electron');
const path = require('path');
const fs = require('fs');
const { autoUpdater } = require('electron-updater');
const Tracker = require('./src/tracker');

let mainWindow;
const userDataPath = app.getPath('userData');
const settingsPath = path.join(userDataPath, 'settings.json');

function loadSettings() {
  try {
    if (fs.existsSync(settingsPath)) {
      return JSON.parse(fs.readFileSync(settingsPath, 'utf-8'));
    }
  } catch (e) { }
  return { theme: 'light' };
}

function saveSettings(settings) {
  fs.writeFileSync(settingsPath, JSON.stringify(settings, null, 2));
}

function createWindow() {
  mainWindow = new BrowserWindow({
    width: 1280,
    height: 800,
    minWidth: 800,
    minHeight: 600,
    frame: false,
    titleBarStyle: 'hidden',
    webPreferences: {
      preload: path.join(__dirname, 'preload.js'),
      contextIsolation: true,
      nodeIntegration: false,
      webviewTag: true
    },
    icon: path.join(__dirname, 'icons', 'icon.ico'),
    backgroundColor: '#ffffff'
  });

  mainWindow.loadFile(path.join(__dirname, 'src', 'index.html'));
}

app.whenReady().then(() => {
  createWindow();
  Tracker.trackLaunch();
  app.on('activate', () => {
    if (BrowserWindow.getAllWindows().length === 0) createWindow();
  });

  // Auto-updater
  autoUpdater.autoDownload = true;
  autoUpdater.autoInstallOnAppQuit = true;

  autoUpdater.on('checking-for-update', () => {
    console.log('Checking for updates...');
  });

  autoUpdater.on('update-available', (info) => {
    console.log('Update available:', info.version);
    if (mainWindow) {
      mainWindow.webContents.send('update-status', 'available', info.version);
    }
  });

  autoUpdater.on('update-not-available', () => {
    console.log('No updates available');
  });

  autoUpdater.on('download-progress', (progress) => {
    console.log(`Download progress: ${Math.round(progress.percent)}%`);
  });

  autoUpdater.on('update-downloaded', (info) => {
    console.log('Update downloaded, will install on restart');
    if (mainWindow) {
      mainWindow.webContents.send('update-status', 'downloaded', info.version);
    }
  });

  autoUpdater.on('error', (err) => {
    console.error('Auto-updater error:', err);
  });

  // Check for updates 3 seconds after window loads
  setTimeout(() => {
    autoUpdater.checkForUpdatesAndNotify().catch(() => {});
  }, 3000);
});

app.on('window-all-closed', () => {
  if (process.platform !== 'darwin') app.quit();
});

ipcMain.handle('get-settings', () => loadSettings());
ipcMain.handle('save-settings', (_, settings) => { saveSettings(settings); return true; });
ipcMain.handle('add-history', (_, entry) => {
  const settings = loadSettings();
  if (!settings.history) settings.history = [];
  settings.history.unshift({ ...entry, timestamp: Date.now() });
  if (settings.history.length > 200) settings.history.length = 200;
  saveSettings(settings);
  return true;
});
ipcMain.handle('get-history', () => loadSettings().history || []);
ipcMain.handle('clear-history', () => { const s = loadSettings(); s.history = []; saveSettings(s); return true; });
ipcMain.handle('add-bookmark', (_, entry) => {
  const settings = loadSettings();
  if (!settings.bookmarks) settings.bookmarks = [];
  if (!settings.bookmarks.find(b => b.url === entry.url)) {
    settings.bookmarks.unshift({ url: entry.url, title: entry.title || entry.url, timestamp: Date.now() });
    saveSettings(settings);
  }
  return true;
});
ipcMain.handle('remove-bookmark', (_, url) => {
  const settings = loadSettings();
  if (settings.bookmarks) {
    settings.bookmarks = settings.bookmarks.filter(b => b.url !== url);
    saveSettings(settings);
  }
  return true;
});
ipcMain.handle('get-bookmarks', () => loadSettings().bookmarks || []);
ipcMain.handle('is-bookmarked', (_, url) => {
  const settings = loadSettings();
  return !!(settings.bookmarks && settings.bookmarks.find(b => b.url === url));
});
ipcMain.handle('minimize-window', () => mainWindow.minimize());
ipcMain.handle('maximize-window', () => { mainWindow.isMaximized() ? mainWindow.unmaximize() : mainWindow.maximize(); });
ipcMain.handle('close-window', () => mainWindow.close());
ipcMain.handle('is-maximized', () => mainWindow.isMaximized());
ipcMain.handle('check-for-updates', () => autoUpdater.checkForUpdatesAndNotify());
ipcMain.handle('install-update', () => autoUpdater.quitAndInstall());
ipcMain.handle('get-app-version', () => app.getVersion());
