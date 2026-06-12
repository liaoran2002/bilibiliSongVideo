const api = window.electronAPI;

export default {
  checkCookie: () => api.checkCookie(),
  clearCookie: () => api.clearCookie(),
  startLogin: () => api.startLogin(),
  reLogin: () => api.reLogin(),

  getUserInfo: () => api.getUserInfo(),
  searchSong: (keyword) => api.searchSong(keyword),
  resolveVideoUrl: (bvid) => api.resolveVideoUrl(bvid),
  fetchSongList: (url) => api.fetchSongList(url),

  getPlaylist: () => api.getPlaylist(),
  savePlaylist: (data) => api.savePlaylist(data),

  clearCache: () => api.clearCache(),
  clearSingleCache: (keyword) => api.clearSingleCache(keyword),

  winMinimize: () => api.winMinimize(),
  winMaximize: () => api.winMaximize(),
  winClose: () => api.winClose(),
  winIsMaximized: () => api.winIsMaximized(),
  winToggleFullscreen: () => api.winToggleFullscreen(),
  winIsFullscreen: () => api.winIsFullscreen(),

  onLoginSuccess: (callback) => api.onLoginSuccess(callback),
  onMaximized: (callback) => api.onMaximized(callback),
  onFullscreen: (callback) => api.onFullscreen(callback),
};
