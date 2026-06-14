const {
  app,
  BrowserWindow,
  ipcMain,
  session,
  screen,
  Tray,
  Menu,
  nativeImage,
} = require('electron');
const path = require('path');
const cookieManager = require('./cookie');
const cacheManager = require('./cache');
const { registerIpcHandlers } = require('./ipcHandlers');

const isDev = !app.isPackaged;

let mainWindow = null;
let loginWindow = null;
let tray = null;
let isLoggedIn = false;
let isPaused = true;
let playMode = 0;
const MODE_NAMES = ['列表循环', '单曲循环', '随机播放'];
app.commandLine.appendSwitch('force-device-scale-factor', '1');
function createMainWindow() {
  mainWindow = new BrowserWindow({
    width: 1600,
    height: 900,
    minWidth: 800,
    minHeight: 450,
    title: 'B站音乐视频',
    frame: false,
    center: true,
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
  mainWindow.setAspectRatio(16 / 9);
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
    width: 1150,
    height: 600,
    parent: mainWindow,
    modal: true,
    title: '账号登录',
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
      const cookies = await session.defaultSession.cookies.get({});
      const hasSESSDATA = cookies.some((c) => c.name === 'SESSDATA');
      if (hasSESSDATA) {
        if (loginWindow && !loginWindow.isDestroyed()) {
          loginWindow.close();
        }
        loginWindow = null;
        isLoggedIn = true;
        buildTrayMenu();
        if (mainWindow && !mainWindow.isDestroyed()) {
          mainWindow.webContents.send('auth:loginSuccess');
        }
      }
    }
  });

  loginWindow.on('closed', () => {
    loginWindow = null;
  });
}

function buildTrayMenu() {
  const send = (channel) => {
    if (mainWindow && !mainWindow.isDestroyed()) {
      mainWindow.webContents.send(channel);
    }
  };
  const template = [
    {
      label: isPaused ? '播放' : '暂停',
      click: () => send('tray:playControl'),
    },
    {
      label: '上一首',
      click: () => send('tray:prev'),
    },
    {
      label: '下一首',
      click: () => send('tray:next'),
    },
    {
      label: `${MODE_NAMES[playMode]}`,
      click: () => send('tray:toggleMode'),
    },
    { type: 'separator' },
    {
      label: '设置歌单',
      click: () => {
        if (mainWindow && !mainWindow.isDestroyed()) {
          mainWindow.show();
          mainWindow.focus();
          mainWindow.webContents.send('tray:showPlaylist');
        }
      },
    },
    { type: 'separator' },
    {
      label: isLoggedIn ? '退出登录' : '登录',
      click: async () => {
        if (isLoggedIn) {
          isLoggedIn = false;
          const fs = require('fs');
          const infoPath = path.join(app.getPath('userData'), 'userInfo.json');
          if (fs.existsSync(infoPath)) fs.unlinkSync(infoPath);
          const cookies = await session.defaultSession.cookies.get({});
          for (const c of cookies) {
            if (
              c.name === 'SESSDATA' ||
              c.name === 'bili_jct' ||
              c.name === 'DedeUserID'
            ) {
              await session.defaultSession.cookies.remove(
                `http${c.secure ? 's' : ''}://${c.domain.replace(/^\./, '')}${c.path}`,
                c.name,
              );
            }
          }
          if (mainWindow && !mainWindow.isDestroyed()) {
            mainWindow.webContents.send('auth:logout');
          }
          buildTrayMenu();
        } else {
          createLoginWindow();
        }
      },
    },
    {
      label: '退出应用',
      click: () => app.quit(),
    },
  ];
  if (tray && !tray.isDestroyed()) {
    tray.setContextMenu(Menu.buildFromTemplate(template));
  }
}

function createTray() {
  const iconPath = isDev
    ? path.join(__dirname, '../public/favicon.ico')
    : path.join(__dirname, '../dist/favicon.ico');
  const icon = nativeImage.createFromPath(iconPath);
  tray = new Tray(icon);
  tray.setToolTip('B站音乐视频');
  tray.on('click', () => {
    if (mainWindow && !mainWindow.isDestroyed()) {
      mainWindow.show();
      mainWindow.focus();
    }
  });
  buildTrayMenu();
}

async function grabCookiesSilently() {
  const cookieWindow = new BrowserWindow({
    width: 1280,
    height: 720,
    show: false,
    webPreferences: {
      session: session.defaultSession,
    },
  });

  return new Promise((resolve) => {
    let settled = false;
    const settle = async () => {
      if (settled) return;
      settled = true;
      if (!cookieWindow.isDestroyed()) cookieWindow.destroy();
      resolve();
    };

    let pollCount = 0;
    const poll = async () => {
      if (settled) return;
      pollCount++;
      try {
        const cookies = await session.defaultSession.cookies.get({});
        if (cookies.some((c) => c.name === 'buvid3')) {
          settled = true;
          if (!cookieWindow.isDestroyed()) cookieWindow.destroy();
          resolve();
          return;
        }
      } catch {}
      if (pollCount < 20) setTimeout(poll, 500);
      else settle();
    };

    cookieWindow.webContents.on('did-finish-load', () => {
      setTimeout(poll, 1000);
    });

    cookieWindow.webContents.on('did-fail-load', () => settle());

    cookieWindow.loadURL('https://www.bilibili.com/').catch(() => settle());
  });
}

app.whenReady().then(async () => {
  session.defaultSession.webRequest.onBeforeSendHeaders(
    { urls: ['*://*.bilivideo.com/*', '*://*.bilibili.com/*'] },
    (details, callback) => {
      details.requestHeaders['Referer'] = 'https://www.bilibili.com/';
      callback({ requestHeaders: details.requestHeaders });
    },
  );

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

  ipcMain.handle('auth:setLoggedIn', (_event, loggedIn) => {
    isLoggedIn = loggedIn;
    buildTrayMenu();
  });

  ipcMain.handle('tray:updateState', (_event, state) => {
    if (state.paused !== undefined) isPaused = state.paused;
    if (state.playMode !== undefined) playMode = state.playMode;
    buildTrayMenu();
  });

  createMainWindow();
  createTray();

  grabCookiesSilently();
});

app.on('window-all-closed', () => {
  app.quit();
});

app.on('activate', () => {
  if (!mainWindow) {
    createMainWindow();
  }
});
