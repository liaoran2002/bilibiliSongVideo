const { ipcMain, app } = require('electron');
const fs = require('fs');
const path = require('path');

function getPlaylistPath() {
  return path.join(app.getPath('userData'), 'playlist.json');
}

function getUserInfoPath() {
  return path.join(app.getPath('userData'), 'userInfo.json');
}

function readJsonFile(filePath) {
  try {
    if (!fs.existsSync(filePath)) return null;
    return JSON.parse(fs.readFileSync(filePath, 'utf-8'));
  } catch {
    return null;
  }
}

function writeJsonFile(filePath, data) {
  fs.writeFileSync(filePath, JSON.stringify(data, null, 2), 'utf-8');
}

function registerIpcHandlers(context) {
  const { cookieManager, cacheManager, createLoginWindow } = context;

  ipcMain.handle('cookie:check', async () => {
    return cookieManager.hasValidCookies();
  });

  ipcMain.handle('cookie:clear', async () => {
    return cookieManager.clearCookies();
  });

  ipcMain.handle('auth:startLogin', async () => {
    createLoginWindow();
  });

  ipcMain.handle('auth:reLogin', async () => {
    await cookieManager.clearCookies();
    const infoPath = getUserInfoPath();
    if (fs.existsSync(infoPath)) fs.unlinkSync(infoPath);
    createLoginWindow();
  });

  ipcMain.handle('api:getUserInfo', async () => {
    const cached = readJsonFile(getUserInfoPath());
    if (cached && cached.face) return cached;

    const cookieStr = await cookieManager.getCookieString();
    if (!cookieStr) throw new Error('NO_COOKIE');
    const biliApi = require('./biliApi');
    const info = await biliApi.getUserInfo(cookieStr);
    writeJsonFile(getUserInfoPath(), info);
    return info;
  });

  ipcMain.handle('api:searchSong', async (event, keyword) => {
    if (!keyword || !keyword.trim()) {
      throw new Error('关键词不能为空');
    }

    const cached = await cacheManager.get(keyword);
    if (cached && cached.data) {
      return { result: cached.data.data?.result || cached.data.result || [] };
    }

    const cookieStr = await cookieManager.getCookieString();
    if (!cookieStr) throw new Error('NO_COOKIE');

    const biliApi = require('./biliApi');
    const result = await biliApi.searchSong(keyword, cookieStr);

    if (result.code !== 0) {
      if (result.code === -101 || result.code === -403) {
        await cookieManager.clearCookies();
        throw new Error('AUTH_FAILED');
      }
      throw new Error(result.message || '搜索失败');
    }

    await cacheManager.save(keyword, result);
    return { result: result.data?.result || [] };
  });

  ipcMain.handle('api:resolveVideo', async (_event, bvid) => {
    const cookieStr = await cookieManager.getCookieString();
    const biliApi = require('./biliApi');
    const videoUrl = await biliApi.resolveVideoUrl(bvid, cookieStr || '');
    return { videoUrl };
  });

  ipcMain.handle('api:fetchSongList', async (_event, songListUrl) => {
    const biliApi = require('./biliApi');
    return biliApi.fetchSongList(songListUrl);
  });

  ipcMain.handle('playlist:get', async () => {
    return readJsonFile(getPlaylistPath());
  });

  ipcMain.handle('playlist:save', async (_event, data) => {
    writeJsonFile(getPlaylistPath(), data);
    return true;
  });

  ipcMain.handle('cache:clearAll', async () => {
    return cacheManager.clearAll();
  });

  ipcMain.handle('cache:clearSingle', async (_event, keyword) => {
    return cacheManager.clearSingle(keyword);
  });
}

module.exports = { registerIpcHandlers };
