const { contextBridge, ipcRenderer } = require('electron');

contextBridge.exposeInMainWorld('electronAPI', {
  startLogin: () => ipcRenderer.invoke('auth:startLogin'),
  reLogin: () => ipcRenderer.invoke('auth:reLogin'),
  setLoggedIn: (val) => ipcRenderer.invoke('auth:setLoggedIn', val),
  trayUpdateState: (state) => ipcRenderer.invoke('tray:updateState', state),

  onLogout: (callback) => {
    const handler = () => callback();
    ipcRenderer.on('auth:logout', handler);
    return () => ipcRenderer.removeListener('auth:logout', handler);
  },
  onTrayPlayControl: (callback) => {
    const handler = () => callback();
    ipcRenderer.on('tray:playControl', handler);
    return () => ipcRenderer.removeListener('tray:playControl', handler);
  },
  onTrayPrev: (callback) => {
    const handler = () => callback();
    ipcRenderer.on('tray:prev', handler);
    return () => ipcRenderer.removeListener('tray:prev', handler);
  },
  onTrayNext: (callback) => {
    const handler = () => callback();
    ipcRenderer.on('tray:next', handler);
    return () => ipcRenderer.removeListener('tray:next', handler);
  },
  onTrayToggleMode: (callback) => {
    const handler = () => callback();
    ipcRenderer.on('tray:toggleMode', handler);
    return () => ipcRenderer.removeListener('tray:toggleMode', handler);
  },
  onTrayShowPlaylist: (callback) => {
    const handler = () => callback();
    ipcRenderer.on('tray:showPlaylist', handler);
    return () => ipcRenderer.removeListener('tray:showPlaylist', handler);
  },

  getUserInfo: () => ipcRenderer.invoke('api:getUserInfo'),
  searchSong: (keyword) => ipcRenderer.invoke('api:searchSong', keyword),
  resolveVideoUrl: (bvid, keyword, skipCache) => ipcRenderer.invoke('api:resolveVideo', bvid, keyword, skipCache),
  fetchSongList: (url) => ipcRenderer.invoke('api:fetchSongList', url),

  getPlaylist: () => ipcRenderer.invoke('playlist:get'),
  savePlaylist: (data) => ipcRenderer.invoke('playlist:save', data),

  clearCache: () => ipcRenderer.invoke('cache:clearAll'),
  clearSingleCache: (keyword) => ipcRenderer.invoke('cache:clearSingle', keyword),

  winMinimize: () => ipcRenderer.invoke('win:minimize'),
  winMaximize: () => ipcRenderer.invoke('win:maximize'),
  winClose: () => ipcRenderer.invoke('win:close'),
  winIsMaximized: () => ipcRenderer.invoke('win:isMaximized'),
  winToggleFullscreen: () => ipcRenderer.invoke('win:toggleFullscreen'),
  winIsFullscreen: () => ipcRenderer.invoke('win:isFullscreen'),

  wallpaperToggle: () => ipcRenderer.invoke('wallpaper:toggle'),
  wallpaperIsEnabled: () => ipcRenderer.invoke('wallpaper:isEnabled'),
  executeLogout: () => ipcRenderer.invoke('auth:executeLogout'),
  onTrayShowLogoutConfirm: (callback) => {
    const handler = () => callback();
    ipcRenderer.on('tray:showLogoutConfirm', handler);
    return () => ipcRenderer.removeListener('tray:showLogoutConfirm', handler);
  },
  onWallpaperState: (callback) => {
    const handler = (_e, enabled) => callback(enabled);
    ipcRenderer.on('wallpaper:state', handler);
    return () => ipcRenderer.removeListener('wallpaper:state', handler);
  },

  onLoginSuccess: (callback) => {
    const handler = () => callback();
    ipcRenderer.on('auth:loginSuccess', handler);
    return () => ipcRenderer.removeListener('auth:loginSuccess', handler);
  },
  onMaximized: (callback) => {
    const handler = (_e, val) => callback(val);
    ipcRenderer.on('window:maximized', handler);
    return () => ipcRenderer.removeListener('window:maximized', handler);
  },
  onFullscreen: (callback) => {
    const handler = (_e, val) => callback(val);
    ipcRenderer.on('window:fullscreen', handler);
    return () => ipcRenderer.removeListener('window:fullscreen', handler);
  },
});
