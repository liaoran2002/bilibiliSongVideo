const { contextBridge, ipcRenderer } = require('electron');

contextBridge.exposeInMainWorld('electronAPI', {
  checkCookie: () => ipcRenderer.invoke('cookie:check'),
  clearCookie: () => ipcRenderer.invoke('cookie:clear'),

  startLogin: () => ipcRenderer.invoke('auth:startLogin'),
  reLogin: () => ipcRenderer.invoke('auth:reLogin'),

  getUserInfo: () => ipcRenderer.invoke('api:getUserInfo'),
  searchSong: (keyword) => ipcRenderer.invoke('api:searchSong', keyword),
  resolveVideoUrl: (bvid) => ipcRenderer.invoke('api:resolveVideo', bvid),
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
