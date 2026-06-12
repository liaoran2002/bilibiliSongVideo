const { app, BrowserWindow, ipcMain, session } = require('electron');
const path = require('path');
const cookieManager = require('./cookie');
const cacheManager = require('./cache');
const { registerIpcHandlers } = require('./ipcHandlers');

const isDev = !app.isPackaged;

let mainWindow = null;
let loginWindow = null;

function createMainWindow() {
  mainWindow = new BrowserWindow({
    width: 1600,
    height: 900,
    title: 'B站音乐视频',
    frame: false,
    webPreferences: {
      preload: path.join(__dirname, 'preload.js'),
      contextIsolation: true,
      nodeIntegration: false,
    },
    show: false,
  });

  const startUrl = isDev
    ? 'http://localhost:5173'
    : `file://${path.join(__dirname, '../dist/index.html')}`;

  mainWindow.loadURL(startUrl);

  mainWindow.once('ready-to-show', () => {
    mainWindow.show();
  });

  mainWindow.on('closed', () => {
    mainWindow = null;
  });

  mainWindow.on('maximize', () => {
    mainWindow.webContents.send('window:maximized', true);
  });

  mainWindow.on('unmaximize', () => {
    mainWindow.webContents.send('window:maximized', false);
  });

  mainWindow.on('enter-full-screen', () => {
    mainWindow.webContents.send('window:fullscreen', true);
  });

  mainWindow.on('leave-full-screen', () => {
    mainWindow.webContents.send('window:fullscreen', false);
  });
}

function createLoginWindow() {
  if (loginWindow && !loginWindow.isDestroyed()) {
    loginWindow.focus();
    return;
  }

  loginWindow = new BrowserWindow({
    width: 500,
    height: 600,
    parent: mainWindow,
    modal: true,
    title: '登录B站账号',
    webPreferences: {
      session: session.defaultSession,
    },
  });

  loginWindow.loadURL('https://passport.bilibili.com/login');

  loginWindow.webContents.on('did-navigate', async (_event, url) => {
    if (
      url.includes('bilibili.com') &&
      !url.includes('passport.bilibili.com')
    ) {
      await captureAndSaveCookies();
      if (loginWindow && !loginWindow.isDestroyed()) {
        loginWindow.close();
      }
      loginWindow = null;
      if (mainWindow && !mainWindow.isDestroyed()) {
        mainWindow.webContents.send('auth:loginSuccess');
      }
    }
  });

  loginWindow.on('closed', () => {
    loginWindow = null;
  });
}

async function captureAndSaveCookies() {
  const cookies = await session.defaultSession.cookies.get({});
  await cookieManager.saveCookies(cookies);
}

app.whenReady().then(async () => {
  session.defaultSession.webRequest.onBeforeSendHeaders(
    { urls: ['*://*.bilivideo.com/*', '*://*.bilibili.com/*'] },
    (details, callback) => {
      details.requestHeaders['Referer'] = 'https://www.bilibili.com/';
      callback({ requestHeaders: details.requestHeaders });
    },
  );

  const hasCookies = await cookieManager.loadCookies();

  registerIpcHandlers({
    cookieManager,
    cacheManager,
    session,
    createLoginWindow,
    getMainWindow: () => mainWindow,
  });

  ipcMain.handle('win:minimize', () => mainWindow?.minimize());
  ipcMain.handle('win:maximize', () => {
    if (mainWindow?.isMaximized()) mainWindow.unmaximize();
    else mainWindow?.maximize();
  });
  ipcMain.handle('win:close', () => mainWindow?.close());
  ipcMain.handle('win:isMaximized', () => mainWindow?.isMaximized() ?? false);
  ipcMain.handle('win:toggleFullscreen', () => {
    if (!mainWindow) return false;
    mainWindow.setFullScreen(!mainWindow.isFullScreen());
    return mainWindow.isFullScreen();
  });
  ipcMain.handle('win:isFullscreen', () => mainWindow?.isFullScreen() ?? false);

  createMainWindow();

  if (!hasCookies) {
    createLoginWindow();
  }
});

app.on('window-all-closed', () => {
  app.quit();
});

app.on('activate', () => {
  if (!mainWindow) {
    createMainWindow();
  }
});
