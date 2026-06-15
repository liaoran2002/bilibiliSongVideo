const { ipcMain, app } = require('electron');
const fs = require('fs');
const path = require('path');
const biliApi = require('./biliApi');
function getPlaylistPath() {
  return path.join(app.getPath('userData'), 'playlist.json');
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

function extractVideoUrl(playData) {
  if (playData?.data?.durl?.length > 0) return playData.data.durl[0].url;
  if (playData?.data?.dash?.video?.length > 0)
    return playData.data.dash.video[0].baseUrl;
  return null;
}

function registerIpcHandlers(context) {
  const { cacheManager, createLoginWindow } = context;

  ipcMain.handle('auth:startLogin', async () => {
    createLoginWindow();
  });

  ipcMain.handle('auth:reLogin', async () => {
    biliApi.clearNavData();
    const { session } = require('electron');
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
    createLoginWindow();
  });

  ipcMain.handle('api:getUserInfo', async () => {
    return biliApi.getUserInfo();
  });

  ipcMain.handle('api:searchSong', async (event, keyword) => {
    if (!keyword || !keyword.trim()) {
      throw new Error('关键词不能为空');
    }

    const cached = await cacheManager.get(keyword);
    if (cached && cached.data) {
      return { data: cached.data.data || cached.data || [] };
    }
    const result = await biliApi.searchSong(keyword);

    if (result.code !== 0) {
      throw new Error(result.message || '搜索失败');
    }
    result.data.result = result.data.result.filter(
      (item) => item.type == 'video',
    );
    await cacheManager.save(keyword, result);
    return { data: result.data || [] };
  });

  ipcMain.handle(
    'api:resolveVideo',
    async (_event, bvid, keyword, skipCache) => {
      try {
        const loggedIn = biliApi.isLoggedIn();
        let videoUrl = null;
        let viewData = null;
        let playData = null;
        let cached = null;
        let results = [];

        // 读取缓存（有 keyword 才走缓存逻辑）
        if (keyword) {
          cached = await cacheManager.get(keyword);
          results = Array.isArray(cached?.data?.data?.result)
            ? cached.data.data.result
            : [];
        }

        // 在缓存列表中查找当前 bvid 对应的视频项
        let targetVideo = results.find((item) => item.bvid === bvid);

        // 分支：使用缓存 / 重新解析
        if (targetVideo && !skipCache) {
          // 缓存存在且不跳过缓存，校验数据有效性
          const hasValidData =
            targetVideo.view_result && targetVideo.playurl_result;
          const loginOk = !loggedIn || targetVideo.playurl_result?.loginState;
          if (hasValidData && loginOk) {
            // 缓存可用，直接提取播放地址
            videoUrl = extractVideoUrl(targetVideo.playurl_result);
          } else {
            // 缓存数据失效，重新拉取
            ({ videoUrl, viewData, playData } =
              await biliApi.resolveVideoUrl(bvid));
            // 更新当前缓存项
            targetVideo.view_result = viewData;
            targetVideo.playurl_result = playData;
            targetVideo.playurl_result.loginState = loggedIn;
          }
        } else {
          // 无缓存项 / 强制跳过缓存：直接调用接口解析
          ({ videoUrl, viewData, playData } =
            await biliApi.resolveVideoUrl(bvid));
          // 构造新的缓存项
          targetVideo = {
            bvid,
            view_result: viewData,
            playurl_result: playData,
            playurl_result: {
              ...playData,
              loginState: loggedIn,
            },
          };
          results.push(targetVideo);
        }

        // 有 keyword 时统一更新缓存（selectedBvid + 数据）
        if (keyword && cached) {
          // 更新选中 bvid
          if (cached.data?.data) {
            cached.data.data.selectedBvid = bvid;
            cached.data.data.result = results;
          }
          // 写入缓存
          await cacheManager.save(keyword, cached.data);
        }
        // 最终返回播放地址
        return { videoUrl };
      } catch (err) {
        // 全局异常捕获：接口失败、缓存读写失败等
        console.error('解析视频地址异常：', err);
        return { videoUrl: null, error: '视频地址解析失败' };
      }
    },
  );

  ipcMain.handle('api:fetchSongList', async (_event, songListUrl) => {
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
