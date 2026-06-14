import axios from 'axios'
import {
  getCommonHeaders,
  getMixinKeyCached,
  refreshMixinKey,
  encWbi,
  getSearchParams,
} from './biliUtils.js'
import { getBiliCookie } from './cookieManager.js'

const SEARCH_API = 'https://api.bilibili.com/x/web-interface/wbi/search/type'
const NAV_API = 'https://api.bilibili.com/x/web-interface/nav'
const VIEW_API = 'https://api.bilibili.com/x/web-interface/view'
const PLAYURL_API = 'https://api.bilibili.com/x/player/wbi/playurl'
const SONG_LIST_API = 'https://sss.unmeta.cn/songlist'

let cookieStr = ''

async function ensureCookie() {
  if (!cookieStr) {
    cookieStr = await getBiliCookie()
  }
}

async function biliGet(url) {
  await ensureCookie()
  const headers = getCommonHeaders(cookieStr)
  headers.accept = 'application/json, text/plain, */*'
  const resp = await axios.get(url, { headers, timeout: 10000 })
  if (resp.status !== 200) throw new Error(`HTTP ${resp.status}`)
  return resp.data
}

async function ensureMixinKey() {
  let key = getMixinKeyCached()
  if (key) return key
  await ensureCookie()
  const headers = getCommonHeaders(cookieStr)
  key = await refreshMixinKey(axios.create({ headers }))
  return key
}

export async function searchSong(keyword, retryCount = 0) {
  try {
    const mixinKey = await ensureMixinKey()
    if (mixinKey) {
      const params = getSearchParams(keyword)
      params.tids = 3
      const query = encWbi(params, mixinKey)
      const url = `${SEARCH_API}?${query}`
      try {
        return await biliGet(url)
      } catch {
        if (retryCount < 2) {
          await new Promise((r) => setTimeout(r, 1000))
          return searchSong(keyword, retryCount + 1)
        }
        throw new Error('搜索失败')
      }
    } else {
      await ensureCookie()
      const headers = getCommonHeaders(cookieStr)
      const params = getSearchParams(keyword)
      params.tids = 3
      const resp = await axios.get(SEARCH_API, { params, headers, timeout: 10000 })
      return resp.data
    }
  } catch (e) {
    return { code: 500, message: e.message }
  }
}

export async function searchSome(keyword, order, retryCount = 0) {
  try {
    const mixinKey = await ensureMixinKey()
    if (mixinKey) {
      const params = getSearchParams(keyword, order)
      params.tids = 3
      const query = encWbi(params, mixinKey)
      const url = `${SEARCH_API}?${query}`
      try {
        return await biliGet(url)
      } catch {
        if (retryCount < 2) {
          await new Promise((r) => setTimeout(r, 1000))
          return searchSome(keyword, order, retryCount + 1)
        }
        throw new Error('搜索失败')
      }
    } else {
      await ensureCookie()
      const headers = getCommonHeaders(cookieStr)
      const params = getSearchParams(keyword, order)
      params.tids = 3
      const resp = await axios.get(SEARCH_API, { params, headers, timeout: 10000 })
      return resp.data
    }
  } catch (e) {
    return { code: 500, message: e.message }
  }
}

export async function resolveVideoUrl(bvid) {
  const viewData = await biliGet(`${VIEW_API}?bvid=${bvid}`)
  if (viewData.code !== 0) {
    throw new Error(viewData.message || '获取视频信息失败')
  }
  const cid = viewData.data?.cid
  if (!cid) throw new Error('无法获取视频CID')

  const mixinKey = await ensureMixinKey()
  if (mixinKey) {
    try {
      const params = {
        bvid, cid, qn: 64, fnval: 1, fnver: 0, fourk: 1,
        platform: 'html5', high_quality: 1,
      }
      const query = encWbi(params, mixinKey)
      const playData = await biliGet(`${PLAYURL_API}?${query}`)
      if (playData.code === 0 && playData.data?.durl) {
        return playData.data.durl[0].url
      }
    } catch { /* fallback */ }
  }

  // Legacy playurl
  const params2 = {
    bvid, cid, qn: 64, fnval: 1, fnver: 0, fourk: 1,
    platform: 'html5', high_quality: 1,
  }
  const queryStr = Object.entries(params2).map(([k, v]) => `${k}=${v}`).join('&')
  const legacyUrl = `https://api.bilibili.com/x/player/playurl?${queryStr}`
  const playData2 = await biliGet(legacyUrl)
  if (playData2.code === 0 && playData2.data?.durl) {
    return playData2.data.durl[0].url
  }
  if (playData2.code === -101 || playData2.code === -403) {
    throw new Error('AUTH_FAILED')
  }
  if (playData2.code !== 0) {
    throw new Error(playData2.message || '获取视频地址失败')
  }

  // DASH fallback
  const params3 = { bvid, cid, qn: 64, fnval: 16, fnver: 0, fourk: 1 }
  const queryStr3 = Object.entries(params3).map(([k, v]) => `${k}=${v}`).join('&')
  const dashUrl = `https://api.bilibili.com/x/player/playurl?${queryStr3}`
  const dashData = await biliGet(dashUrl)
  if (dashData.code === 0 && dashData.data?.dash?.video) {
    return dashData.data.dash.video[0].baseUrl
  }

  throw new Error('无法获取视频地址')
}

export async function getUserInfo() {
  const navData = await biliGet(NAV_API)
  if (!navData.data?.isLogin) throw new Error('未登录')
  return {
    face: navData.data.face || '',
    name: navData.data.uname || '',
  }
}

export async function fetchSongList(songListUrl) {
  const resp = await axios.post(
    SONG_LIST_API,
    new URLSearchParams({ url: songListUrl }).toString(),
    {
      params: { detailed: 'false', format: 'song-singer' },
      headers: {
        'Content-Type': 'application/x-www-form-urlencoded',
        'User-Agent': 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/123.0.0.0 Safari/537.36',
      },
      timeout: 10000,
    },
  )
  if (resp.status !== 200) throw new Error(`HTTP ${resp.status}`)
  return resp.data?.data || resp.data
}

export function refreshCookie() {
  cookieStr = ''
  cookieExpireAt = 0
}
