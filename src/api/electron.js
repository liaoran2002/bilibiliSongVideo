const api = window.electronAPI;

export default {
  startLogin: () => api.startLogin(),
  reLogin: () => api.reLogin(),
  setLoggedIn: (val) => api.setLoggedIn(val),
  trayUpdateState: (state) => api.trayUpdateState(state),

  onLogout: (callback) => api.onLogout(callback),
  onTrayPlayControl: (callback) => api.onTrayPlayControl(callback),
  onTrayPrev: (callback) => api.onTrayPrev(callback),
  onTrayNext: (callback) => api.onTrayNext(callback),
  onTrayToggleMode: (callback) => api.onTrayToggleMode(callback),
  onTrayShowPlaylist: (callback) => api.onTrayShowPlaylist(callback),

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
  onLogout: (callback) => api.onLogout(callback),
  onMaximized: (callback) => api.onMaximized(callback),
  onFullscreen: (callback) => api.onFullscreen(callback),
};
