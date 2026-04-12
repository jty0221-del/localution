const { app, BrowserWindow, ipcMain } = require('electron');
const path = require('path');

let mainWindow;
let hometaxWindow;

function createMainWindow() {
  mainWindow = new BrowserWindow({
    width: 1100,
    height: 750,
    frame: false,
    webPreferences: {
      nodeIntegration: true,
      contextIsolation: false,
      preload: path.join(__dirname, 'preload.js'),
    },
    backgroundColor: '#0f0f13',
    show: false,
  });
  mainWindow.loadFile('renderer/index.html');
  mainWindow.once('ready-to-show', () => mainWindow.show());
  mainWindow.on('closed', () => app.quit());
}

ipcMain.on('open-hometax', (e, data) => {
  if (hometaxWindow && !hometaxWindow.isDestroyed()) {
    hometaxWindow.focus();
    return;
  }
  hometaxWindow = new BrowserWindow({
    width: 1400,
    height: 900,
    webPreferences: {
      nodeIntegration: false,
      contextIsolation: true,
    },
  });
  hometaxWindow.loadURL(
    'https://www.hometax.go.kr/websquare/websquare.html?w2xPath=/ui/ab/a/a/UTERPAAA001M.xml&menuCd=MDR030101000'
  );
  hometaxWindow.on('closed', () => { hometaxWindow = null; });
});

ipcMain.on('window-minimize', () => mainWindow.minimize());
ipcMain.on('window-maximize', () =>
  mainWindow.isMaximized() ? mainWindow.unmaximize() : mainWindow.maximize()
);
ipcMain.on('window-close', () => app.quit());

app.whenReady().then(createMainWindow);
app.on('window-all-closed', () => {
  if (process.platform !== 'darwin') app.quit();
});
