import crypto from 'crypto'

const NAV_API = 'https://api.bilibili.com/x/web-interface/nav'

const MIXIN_KEY_ENC_TAB = [
  46, 47, 18, 2, 53, 8, 23, 32, 15, 50, 10, 31, 58, 3, 45, 35,
  27, 43, 5, 49, 33, 9, 42, 19, 29, 28, 14, 39, 12, 38, 41, 13,
  37, 48, 7, 16, 24, 55, 40, 61, 26, 17, 0, 1, 60, 51, 30, 4,
  22, 25, 54, 21, 56, 59, 6, 63, 57, 62, 11, 36, 20, 34, 44, 52,
]

let cachedMixinKey = null
let mixinKeyExpireAt = 0

export function md5(str) {
  return crypto.createHash('md5').update(str).digest('hex')
}

export function getMixinKey(imgKey, subKey) {
  const raw = imgKey + subKey
  let result = ''
  for (let i = 0; i < 32; i++) {
    result += raw[MIXIN_KEY_ENC_TAB[i]]
  }
  return result
}

export async function refreshMixinKey(axiosInstance) {
  try {
    const resp = await axiosInstance.get(NAV_API)
    const data = resp.data
    const imgUrl = data?.data?.wbi_img?.img_url || ''
    const subUrl = data?.data?.wbi_img?.sub_url || ''
    if (!imgUrl || !subUrl) return null
    const imgKey = imgUrl.split('/').pop().split('.')[0]
    const subKey = subUrl.split('/').pop().split('.')[0]
    cachedMixinKey = getMixinKey(imgKey, subKey)
    mixinKeyExpireAt = Date.now() + 3600 * 1000
    return cachedMixinKey
  } catch {
    return null
  }
}

export function getMixinKeyCached() {
  if (cachedMixinKey && Date.now() < mixinKeyExpireAt) return cachedMixinKey
  return null
}

export function encWbi(params, mixinKey) {
  params.wts = Math.floor(Date.now() / 1000)
  const sortedKeys = Object.keys(params).sort()
  const queryParts = []
  for (const k of sortedKeys) {
    const v = String(params[k]).replace(/[!'()*]/g, '')
    queryParts.push(`${k}=${v}`)
  }
  const query = queryParts.join('&')
  const wRid = md5(query + mixinKey)
  return `${query}&w_rid=${wRid}`
}

const CHAR_SET = {
  number: '0123456789',
  letter: 'abcdefghijklmnopqrstuvwxyz',
}

function randomNum(max) {
  return Math.floor(Math.random() * max)
}

export function getqvId() {
  const chars = CHAR_SET.number + CHAR_SET.letter + CHAR_SET.letter.toUpperCase()
  let result = ''
  for (let i = 0; i < 32; i++) {
    result += chars[randomNum(chars.length)]
  }
  return result
}

export function getSearchParams(keyword, order = '') {
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
    order,
    page_size: '42',
    platform: 'pc',
    qv_id: getqvId(),
    search_type: 'video',
    single_column: '0',
    source_tag: '3',
    web_location: '1430654',
    wts: String(Math.floor(Date.now() / 1000)),
  }
}

export function getCommonHeaders(cookieStr) {
  return {
    cookie: cookieStr,
    accept: 'text/html,application/xhtml+xml,application/xml;q=0.9,image/avif,image/webp,image/apng,*/*;q=0.8,application/signed-exchange;v=b3;q=0.7',
    'accept-language': 'zh-CN,zh;q=0.9,en;q=0.8,en-GB;q=0.7,en-US;q=0.6',
    'cache-control': 'max-age=0',
    referer: 'https://www.bilibili.com/',
    'sec-ch-ua': '"Chromium";v="123", "Not:A-Brand";v="8", "Microsoft Edge";v="123"',
    'sec-ch-ua-mobile': '?0',
    'sec-ch-ua-platform': '"Windows"',
    'sec-fetch-dest': 'document',
    'sec-fetch-mode': 'navigate',
    'sec-fetch-site': 'same-origin',
    'sec-fetch-user': '?1',
    'upgrade-insecure-requests': '1',
    'user-agent': 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/123.0.0.0 Safari/537.36',
  }
}
