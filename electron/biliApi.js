const { net } = require('electron');
const crypto = require('crypto');

const SEARCH_API = 'https://api.bilibili.com/x/web-interface/wbi/search/type';
const NAV_API = 'https://api.bilibili.com/x/web-interface/nav';
const VIEW_API = 'https://api.bilibili.com/x/web-interface/view';
const PLAYURL_API = 'https://api.bilibili.com/x/player/wbi/playurl';
const SONG_LIST_API = 'https://sss.unmeta.cn/songlist';

const USER_AGENT =
  'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/123.0.0.0 Safari/537.36';

const MIXIN_KEY_ENC_TAB = [
  46, 47, 18, 2, 53, 8, 23, 32, 15, 50, 10, 31, 58, 3, 45, 35,
  27, 43, 5, 49, 33, 9, 42, 19, 29, 28, 14, 39, 12, 38, 41, 13,
  37, 48, 7, 16, 24, 55, 40, 61, 26, 17, 0, 1, 60, 51, 30, 4,
  22, 25, 54, 21, 56, 59, 6, 63, 57, 62, 11, 36, 20, 34, 44, 52,
];

let cachedMixinKey = null;
let mixinKeyExpireAt = 0;

function md5(str) {
  return crypto.createHash('md5').update(str).digest('hex');
}

function getMixinKey(imgKey, subKey) {
  const raw = imgKey + subKey;
  let result = '';
  for (let i = 0; i < 32; i++) {
    result += raw[MIXIN_KEY_ENC_TAB[i]];
  }
  return result;
}

async function refreshMixinKey(cookieStr) {
  try {
    const response = await net.fetch(NAV_API, {
      method: 'GET',
      headers: {
        Cookie: cookieStr || '',
        'User-Agent': USER_AGENT,
        Referer: 'https://www.bilibili.com/',
        Accept: 'application/json',
      },
    });
    const json = await response.json();
    const imgUrl = json.data?.wbi_img?.img_url || '';
    const subUrl = json.data?.wbi_img?.sub_url || '';
    if (!imgUrl || !subUrl) return null;
    const imgKey = imgUrl.split('/').pop().split('.')[0];
    const subKey = subUrl.split('/').pop().split('.')[0];
    cachedMixinKey = getMixinKey(imgKey, subKey);
    mixinKeyExpireAt = Date.now() + 3600 * 1000;
    return cachedMixinKey;
  } catch {
    return null;
  }
}

async function getMixinKeyCached(cookieStr) {
  if (cachedMixinKey && Date.now() < mixinKeyExpireAt) {
    return cachedMixinKey;
  }
  return refreshMixinKey(cookieStr);
}

function encWbi(params, mixinKey) {
  params.wts = Math.floor(Date.now() / 1000);
  const sorted = Object.keys(params).sort().reduce((acc, key) => {
    acc[key] = params[key];
    return acc;
  }, {});
  const query = Object.entries(sorted)
    .map(([k, v]) => {
      const val = String(v).replace(/[!'()*]/g, '');
      return `${encodeURIComponent(k)}=${encodeURIComponent(val)}`;
    })
    .join('&');
  const w_rid = md5(query + mixinKey);
  return query + `&w_rid=${w_rid}`;
}

function getQvId() {
  const chars =
    '0123456789abcdefghijklmnopqrstuvwxyzABCDEFGHIJKLMNOPQRSTUVWXYZ';
  let result = '';
  for (let i = 0; i < 32; i++) {
    result += chars[Math.floor(Math.random() * chars.length)];
  }
  return result;
}

function oldGetW_rid(params) {
  const paramStr = Object.entries(params)
    .map(([k, v]) => `${k}=${v}`)
    .join('&');
  return md5(paramStr + 'ea1db124af3c7062474693fa704f4ff8');
}

function buildSearchParams(keyword) {
  return {
    __refresh__: 'true',
    _extra: '',
    ad_resource: '5654',
    category_id: '',
    context: '',
    from_source: '',
    from_spmid: '333.337',
    gaia_vtoken: '',
    highlight: '1',
    keyword,
    order: '',
    page_size: '42',
    platform: 'pc',
    qv_id: getQvId(),
    search_type: 'video',
    single_column: '0',
    source_tag: '3',
    web_location: '1430654',
    wts: Math.floor(Date.now() / 1000).toString(),
  };
}

function biliHeaders(cookieStr) {
  return {
    Cookie: cookieStr || '',
    'User-Agent': USER_AGENT,
    Referer: 'https://www.bilibili.com/',
    Accept: 'application/json, text/plain, */*',
    'Accept-Language': 'zh-CN,zh;q=0.9,en;q=0.8',
  };
}

async function biliGet(url, cookieStr) {
  const response = await net.fetch(url, {
    method: 'GET',
    headers: biliHeaders(cookieStr),
  });
  if (!response.ok) {
    throw new Error(`HTTP ${response.status}`);
  }
  return response.json();
}

async function searchSong(keyword, cookieStr, retryCount = 0) {
  const mixinKey = await getMixinKeyCached(cookieStr);

  if (mixinKey) {
    const params = buildSearchParams(keyword);
    params.tids = '3';
    const query = encWbi(params, mixinKey);
    const url = `${SEARCH_API}?${query}`;
    try {
      return await biliGet(url, cookieStr);
    } catch (innerErr) {
      if (retryCount < 2) {
        await new Promise((r) => setTimeout(r, 1000));
        return searchSong(keyword, cookieStr, retryCount + 1);
      }
      throw innerErr;
    }
  }

  const params = buildSearchParams(keyword);
  const w_rid = oldGetW_rid(params);
  params.tids = '3';
  params.w_rid = w_rid;
  const queryString = Object.entries(params)
    .map(([k, v]) => `${encodeURIComponent(k)}=${encodeURIComponent(v)}`)
    .join('&');
  const url = `${SEARCH_API}?${queryString}`;

  try {
    return await biliGet(url, cookieStr);
  } catch (err) {
    if (retryCount < 2) {
      await new Promise((r) => setTimeout(r, 1000));
      return searchSong(keyword, cookieStr, retryCount + 1);
    }
    throw err;
  }
}

async function resolveVideoUrl(bvid, cookieStr) {
  try {
    const viewData = await biliGet(`${VIEW_API}?bvid=${bvid}`, cookieStr);
    if (viewData.code !== 0) {
      throw new Error(viewData.message || '获取视频信息失败');
    }
    const cid = viewData.data.cid;
    if (!cid) {
      throw new Error('无法获取视频CID');
    }

    const mixinKey = await getMixinKeyCached(cookieStr);

    if (mixinKey) {
      try {
        const params = {
          bvid,
          cid,
          qn: 64,
          fnval: 1,
          fnver: 0,
          fourk: 1,
          platform: 'html5',
          high_quality: 1,
        };
        const query = encWbi(params, mixinKey);
        const playData = await biliGet(`${PLAYURL_API}?${query}`, cookieStr);
        if (playData.code === 0 && playData.data?.durl?.length > 0) {
          return playData.data.durl[0].url;
        }
      } catch {
        // fallback below
      }
    }

    const params2 = {
      bvid,
      cid,
      qn: 64,
      fnval: 1,
      fnver: 0,
      fourk: 1,
      platform: 'html5',
      high_quality: 1,
    };
    const w_rid = oldGetW_rid(params2);
    params2.w_rid = w_rid;
    const queryString = Object.entries(params2)
      .map(([k, v]) => `${encodeURIComponent(k)}=${encodeURIComponent(v)}`)
      .join('&');
    const legacyUrl = `https://api.bilibili.com/x/player/playurl?${queryString}`;
    const playData2 = await biliGet(legacyUrl, cookieStr);
    if (playData2.code !== 0) {
      if (playData2.code === -101 || playData2.code === -403) {
        throw new Error('AUTH_FAILED');
      }
      throw new Error(playData2.message || '获取视频地址失败');
    }
    if (playData2.data?.durl?.length > 0) {
      return playData2.data.durl[0].url;
    }

    const params3 = {
      bvid,
      cid,
      qn: 64,
      fnval: 16,
      fnver: 0,
      fourk: 1,
    };
    const w_rid3 = oldGetW_rid(params3);
    params3.w_rid = w_rid3;
    const qs3 = Object.entries(params3)
      .map(([k, v]) => `${encodeURIComponent(k)}=${encodeURIComponent(v)}`)
      .join('&');
    const dashUrl = `https://api.bilibili.com/x/player/playurl?${qs3}`;
    const dashData = await biliGet(dashUrl, cookieStr);
    if (dashData.code === 0 && dashData.data?.dash?.video?.length > 0) {
      return dashData.data.dash.video[0].baseUrl;
    }

    throw new Error('无法获取视频地址');
  } catch (err) {
    if (err.message === 'AUTH_FAILED') throw err;
    throw new Error(`视频解析失败: ${err.message}`);
  }
}

async function fetchSongList(songListUrl) {
  try {
    const response = await net.fetch(
      `${SONG_LIST_API}?detailed=false&format=song-singer`,
      {
        method: 'POST',
        headers: {
          'Content-Type': 'application/x-www-form-urlencoded',
          'User-Agent': USER_AGENT,
        },
        body: `url=${encodeURIComponent(songListUrl)}`,
      }
    );
    if (!response.ok) {
      throw new Error(`HTTP ${response.status}`);
    }
    const json = await response.json();
    return json.data || json;
  } catch (err) {
    throw new Error(`获取歌单失败: ${err.message}`);
  }
}

async function getUserInfo(cookieStr) {
  try {
    const navData = await biliGet(NAV_API, cookieStr);
    if (!navData.data?.isLogin) throw new Error('未登录');
    return {
      face: navData.data.face || '',
      name: navData.data.uname || '',
    };
  } catch (err) {
    throw new Error(`获取用户信息失败: ${err.message}`);
  }
}

module.exports = { searchSong, resolveVideoUrl, fetchSongList, getUserInfo };
