const {
  app,
  BrowserWindow,
  ipcMain,
  session,
  screen,
  Tray,
  Menu,
  nativeImage,
  dialog,
} = require('electron');
const path = require('path');
const cookieManager = require('./cookie');
const cacheManager = require('./cache');
const { registerIpcHandlers } = require('./ipcHandlers');
const { isInWorkerWLayer } = require('./wallpaperDetect');

let asWallpaper;
try {
  asWallpaper = require('electron-as-wallpaper');
} catch {
  asWallpaper = null;
}

const isDev = !app.isPackaged;

let mainWindow = null;
let loginWindow = null;
let tray = null;
let isLoggedIn = false;
let isPaused = true;
let playMode = 0;
let wallpaperEnabled = false;
let externalWallpaper = false;
let savedBounds = null;
let savedMaximized = false;
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
    const shouldWallpaper = process.argv.includes('--wallpaper-mode');
    const hwnd = mainWindow.getNativeWindowHandle();
    if (shouldWallpaper || isInWorkerWLayer(hwnd)) {
      wallpaperEnabled = true;
      if (shouldWallpaper) {
        const primaryDisplay = screen.getPrimaryDisplay();
        const { width, height } = primaryDisplay.size;
        mainWindow.setBounds({ x: 0, y: 0, width, height });
        mainWindow.setFullScreen(true);
        mainWindow.setAlwaysOnTop(true, 'desktop');
        mainWindow.setVisibleOnAllWorkspaces(true);
        try {
          asWallpaper.attach(mainWindow, {
            transparent: true,
            forwardMouseInput: true,
            forwardKeyboardInput: false,
          });
        } catch {}
      }
      if (tray && !tray.isDestroyed()) {
        tray.destroy();
        tray = null;
      }
      mainWindow.webContents.send('wallpaper:state', true);
    }
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

function toggleWallpaper() {
  if (!asWallpaper || !mainWindow || mainWindow.isDestroyed()) return;
  wallpaperEnabled = !wallpaperEnabled;
  if (wallpaperEnabled) {
    savedMaximized = mainWindow.isMaximized();
    savedBounds = mainWindow.getBounds();
    const primaryDisplay = screen.getPrimaryDisplay();
    const { width, height } = primaryDisplay.size;
    mainWindow.setBounds({ x: 0, y: 0, width, height });
    mainWindow.setFullScreen(true);
    mainWindow.setAlwaysOnTop(true, 'desktop');
    mainWindow.setVisibleOnAllWorkspaces(true);
    try {
      asWallpaper.attach(mainWindow, {
        transparent: true,
        forwardMouseInput: true,
        forwardKeyboardInput: false,
      });
    } catch {}
    if (tray && !tray.isDestroyed()) {
      tray.destroy();
      tray = null;
    }
  } else {
    try {
      asWallpaper.detach(mainWindow);
    } catch {}
    try {
      asWallpaper.reset();
    } catch {}
    mainWindow.setFullScreen(false);
    mainWindow.setAlwaysOnTop(false);
    const boundsToRestore = savedBounds;
    const maximizedToRestore = savedMaximized;
    savedBounds = null;
    savedMaximized = false;
    setTimeout(() => {
      if (!mainWindow || mainWindow.isDestroyed()) return;
      mainWindow.unmaximize();
      if (boundsToRestore) {
        mainWindow.setBounds(boundsToRestore);
        if (maximizedToRestore) {
          mainWindow.maximize();
        }
      }
    }, 50);
    createTray();
  }
  if (mainWindow && !mainWindow.isDestroyed()) {
    mainWindow.webContents.send('wallpaper:state', wallpaperEnabled);
  }
  buildTrayMenu();
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
    frame: false,
    webPreferences: {
      session: session.defaultSession,
    },
  });

  loginWindow.loadURL('https://passport.bilibili.com/login');

  loginWindow.webContents.on('dom-ready', () => {
    loginWindow.webContents.insertCSS(`
      .mimo-close-btn {
        position: fixed; top: 0; right: 0; z-index: 99999;
        width: 36px; height: 36px;
        display: flex; align-items: center; justify-content: center;
        cursor: pointer; color: rgba(0,0,0,0.4);
        transition: background 0.15s, color 0.15s;
      }
      .mimo-close-btn:hover { background: #e81123; color: white; }
    `);
    loginWindow.webContents.executeJavaScript(`
      const btn = document.createElement('div');
      btn.className = 'mimo-close-btn';
      btn.innerHTML = '<svg width="14" height="14" viewBox="0 0 14 14"><path d="M1 1L13 13M1 13L13 1" stroke="currentColor" stroke-width="1.5" stroke-linecap="round"/></svg>';
      btn.onclick = () => window.close();
      document.body.appendChild(btn);
    `);
  });

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
    {
      label: wallpaperEnabled ? '应用程序' : '桌面壁纸',
      click: () => toggleWallpaper(),
    },
    { type: 'separator' },
    {
      label: isLoggedIn ? '退出登录' : '登录',
      click: () => {
        if (isLoggedIn) {
          if (mainWindow && !mainWindow.isDestroyed()) {
            mainWindow.show();
            mainWindow.focus();
            mainWindow.webContents.send('tray:showLogoutConfirm');
          }
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
    ? path.join(__dirname, '../public/bilibili.ico')
    : path.join(__dirname, '../dist/bilibili.ico');
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

  ipcMain.handle('wallpaper:toggle', () => {
    toggleWallpaper();
    return wallpaperEnabled;
  });

  ipcMain.handle('wallpaper:isEnabled', () => wallpaperEnabled);
  ipcMain.handle('wallpaper:isExternal', () => externalWallpaper);

  ipcMain.handle('auth:executeLogout', async () => {
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
  });

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
