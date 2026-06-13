import requests

from bili_utils import (
    get_common_headers, getqvId, get_search_params, getW_rid,
    get_mixin_key_cached, enc_wbi, md5
)

SEARCH_API = 'https://api.bilibili.com/x/web-interface/wbi/search/type'
NAV_API = 'https://api.bilibili.com/x/web-interface/nav'
VIEW_API = 'https://api.bilibili.com/x/web-interface/view'
PLAYURL_API = 'https://api.bilibili.com/x/player/wbi/playurl'
SONG_LIST_API = 'https://sss.unmeta.cn/songlist'

def bili_get(url):
    headers = get_common_headers()
    if not headers['cookies']:
        print("没有cookies")
    headers['accept'] = 'application/json, text/plain, */*'
    response = requests.get(url, headers=headers)
    if response.status_code != 200:
        raise Exception(f"HTTP {response.status_code}")
    return response.json()

def search_song(keyword,retry_count=0):
    try:
        mixin_key = get_mixin_key_cached()
        if mixin_key:
            params = get_search_params(keyword)
            params['tids'] = 3
            query = enc_wbi(params, mixin_key)
            url = f"{SEARCH_API}?{query}"
            try:
                return bili_get(url)
            except Exception:
                if retry_count < 2:
                    import time
                    time.sleep(1)
                    return search_song(keyword, retry_count + 1)
                raise
        else:
            headers = get_common_headers()
            m = get_search_params(keyword)
            w_rid = getW_rid(m)
            m['tids'] = 3
            m['w_rid'] = w_rid
            response = requests.get(SEARCH_API, params=m, headers=headers)
            return response.json()
    except Exception as e:
        return {"code": 500, "message": str(e)}


def search_some(keyword, order, retry_count):
    try:
        mixin_key = get_mixin_key_cached()
        if mixin_key:
            params = get_search_params(keyword, order)
            params['tids'] = 3
            query = enc_wbi(params, mixin_key)
            url = f"{SEARCH_API}?{query}"
            try:
                return bili_get(url)
            except Exception:
                if retry_count < 2:
                    import time
                    time.sleep(1)
                    return search_some(keyword, order, retry_count + 1)
                raise
        else:
            headers = get_common_headers()
            m = get_search_params(keyword)
            w_rid = getW_rid(m)
            m['tids'] = 3
            m['w_rid'] = w_rid
            response = requests.get(SEARCH_API, params=m, headers=headers)
            return response.json()
    except Exception as e:
        res_json = {"code": 500, "message": str(e)}
    return res_json


def resolve_video_url(bvid):
    try:
        view_data = bili_get(f"{VIEW_API}?bvid={bvid}")
        if view_data.get('code') != 0:
            raise Exception(view_data.get('message', '获取视频信息失败'))
        cid = view_data.get('data', {}).get('cid')
        if not cid:
            raise Exception('无法获取视频CID')

        mixin_key = get_mixin_key_cached()
        if mixin_key:
            try:
                params = {
                    'bvid': bvid,
                    'cid': cid,
                    'qn': 64,
                    'fnval': 1,
                    'fnver': 0,
                    'fourk': 1,
                    'platform': 'html5',
                    'high_quality': 1,
                }
                query = enc_wbi(params, mixin_key)
                play_data = bili_get(f"{PLAYURL_API}?{query}")
                if play_data.get('code') == 0 and play_data.get('data', {}).get('durl'):
                    return play_data['data']['durl'][0]['url']
            except Exception:
                pass

        params2 = {
            'bvid': bvid,
            'cid': cid,
            'qn': 64,
            'fnval': 1,
            'fnver': 0,
            'fourk': 1,
            'platform': 'html5',
            'high_quality': 1,
        }
        w_rid = getW_rid(params2)
        params2['w_rid'] = w_rid
        query_string = '&'.join([f"{k}={v}" for k, v in params2.items()])
        legacy_url = f"https://api.bilibili.com/x/player/playurl?{query_string}"
        play_data2 = bili_get(legacy_url)
        if play_data2.get('code') not in (0, None):
            if play_data2.get('code') in (-101, -403):
                raise Exception('AUTH_FAILED')
            raise Exception(play_data2.get('message', '获取视频地址失败'))
        if play_data2.get('data', {}).get('durl'):
            return play_data2['data']['durl'][0]['url']

        params3 = {
            'bvid': bvid,
            'cid': cid,
            'qn': 64,
            'fnval': 16,
            'fnver': 0,
            'fourk': 1,
        }
        w_rid3 = getW_rid(params3)
        params3['w_rid'] = w_rid3
        qs3 = '&'.join([f"{k}={v}" for k, v in params3.items()])
        dash_url = f"https://api.bilibili.com/x/player/playurl?{qs3}"
        dash_data = bili_get(dash_url)
        if dash_data.get('code') == 0 and dash_data.get('data', {}).get('dash', {}).get('video'):
            return dash_data['data']['dash']['video'][0]['baseUrl']

        raise Exception('无法获取视频地址')
    except Exception as e:
        if str(e) == 'AUTH_FAILED':
            raise
        raise Exception(f'视频解析失败: {e}')


def get_user_info():
    try:
        nav_data = bili_get(NAV_API)
        print(nav_data)
        if not nav_data.get('data', {}).get('isLogin'):
            raise Exception('未登录')
        return {
            'face': nav_data.get('data', {}).get('face', ''),
            'name': nav_data.get('data', {}).get('uname', ''),
        }
    except Exception as e:
        raise Exception(f'获取用户信息失败: {e}')


def fetch_song_list(song_list_url):
    try:
        response = requests.post(
            SONG_LIST_API,
            params={'detailed': 'false', 'format': 'song-singer'},
            data={'url': song_list_url},
            headers={
                'Content-Type': 'application/x-www-form-urlencoded',
                'User-Agent': 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/123.0.0.0 Safari/537.36',
            }
        )
        if response.status_code != 200:
            raise Exception(f"HTTP {response.status_code}")
        json_data = response.json()
        return json_data.get('data', json_data)
    except Exception as e:
        raise Exception(f'获取歌单失败: {e}')

