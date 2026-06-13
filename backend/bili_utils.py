import hashlib
import time
import re
import faker
import requests
from selenium import webdriver
from selenium.webdriver.common.by import By
from selenium.webdriver.support.ui import WebDriverWait
from selenium.common.exceptions import WebDriverException
from selenium.webdriver.support import expected_conditions as EC


import execjs

NAV_API = 'https://api.bilibili.com/x/web-interface/nav'

MIXIN_KEY_ENC_TAB = [
    46, 47, 18, 2, 53, 8, 23, 32, 15, 50, 10, 31, 58, 3, 45, 35,
    27, 43, 5, 49, 33, 9, 42, 19, 29, 28, 14, 39, 12, 38, 41, 13,
    37, 48, 7, 16, 24, 55, 40, 61, 26, 17, 0, 1, 60, 51, 30, 4,
    22, 25, 54, 21, 56, 59, 6, 63, 57, 62, 11, 36, 20, 34, 44, 52,
]

cached_mixin_key = None
mixin_key_expire_at = 0

def get_any_driver(headless=True):
    browsers = [
        (webdriver.Chrome, webdriver.ChromeOptions),
        (webdriver.Edge, webdriver.EdgeOptions),
        (webdriver.Firefox, webdriver.FirefoxOptions),
    ]
    for driver_class, options_class in browsers:
        try:
            options = options_class()
            if headless:
                if driver_class == webdriver.Firefox:
                    options.add_argument("--headless")
                else:
                    options.add_argument("--headless=new")
            driver = driver_class(options=options)
            print(f"✅ 启动：{driver_class.__name__}")
            return driver
        except WebDriverException:
            continue
    raise RuntimeError("无可用浏览器")

def get_bili_cookie():
    driver = get_any_driver(headless=True)
    url = 'https://www.bilibili.com'
    try:
        driver.get(url)
        time.sleep(3)
        cookies = driver.get_cookies()
        cookie_str = "; ".join([f"{c['name']}={c['value']}" for c in cookies])
        print("✅ 获取Cookie成功")
        return cookie_str
    finally:
        driver.quit()

try:
    user_agent = faker.Faker().user_agent()
    cookies_str = get_bili_cookie()
    js = execjs.compile(open('bili.js').read())
except:
    user_agent = faker.Faker().user_agent()
    cookies_str = get_bili_cookie()
    js = execjs.compile(open('bili.js').read())

def get_common_headers():
    return {
        'cookies': cookies_str,
        'accept': 'text/html,application/xhtml+xml,application/xml;q=0.9,image/avif,image/webp,image/apng,*/*;q=0.8,application/signed-exchange;v=b3;q=0.7',
        'accept-language': 'zh-CN,zh;q=0.9,en;q=0.8,en-GB;q=0.7,en-US;q=0.6',
        'cache-control': 'max-age=0',
        'referer': 'https://www.bilibili.com/',
        'sec-ch-ua': '"Microsoft Edge";v="123", "Not:A-Brand";v="8", "Chromium";v="123"',
        'sec-ch-ua-mobile': '?0',
        'sec-ch-ua-platform': '"Windows"',
        'sec-fetch-dest': 'document',
        'sec-fetch-mode': 'navigate',
        'sec-fetch-site': 'same-origin',
        'sec-fetch-user': '?1',
        'upgrade-insecure-requests': '1',
        'user-agent': user_agent,
    }

def trans_cookies(cookies):
    return {i.split('=')[0]: i.split('=')[1] for i in cookies.split('; ')}

def splice_url(params):
    s = ""
    for k, v in params.items():
        s += f"{k}={v}&"
    return s[:-1]

# md5加密 用于生成w_rid
def md5(string):
    m = hashlib.md5()
    m.update(string.encode())
    return m.hexdigest()

def get_mixin_key(img_key, sub_key):
    raw = img_key + sub_key
    result = ''
    for i in range(32):
        result += raw[MIXIN_KEY_ENC_TAB[i]]
    return result

def refresh_mixin_key():
    global cached_mixin_key, mixin_key_expire_at
    try:
        headers = get_common_headers()
        response = requests.get(NAV_API, headers=headers)
        data = response.json()
        img_url = data.get('data', {}).get('wbi_img', {}).get('img_url', '')
        sub_url = data.get('data', {}).get('wbi_img', {}).get('sub_url', '')
        if not img_url or not sub_url:
            return None
        img_key = img_url.split('/')[-1].split('.')[0]
        sub_key = sub_url.split('/')[-1].split('.')[0]
        cached_mixin_key = get_mixin_key(img_key, sub_key)
        mixin_key_expire_at = time.time() + 3600
        return cached_mixin_key
    except Exception:
        return None

def get_mixin_key_cached():
    global cached_mixin_key, mixin_key_expire_at
    if cached_mixin_key and time.time() < mixin_key_expire_at:
        return cached_mixin_key
    return refresh_mixin_key()

def enc_wbi(params, mixin_key):
    params['wts'] = int(time.time())
    sorted_keys = sorted(params.keys())
    query_parts = []
    for k in sorted_keys:
        v = str(params[k])
        v = re.sub(r"[!'()*]", '', v)
        query_parts.append(f"{k}={v}")
    query = '&'.join(query_parts)
    w_rid = md5(query + mixin_key)
    return query + f'&w_rid={w_rid}'

def get_search_params(keyword, order=""):
    return {
        "__refresh__": "true",
        "_extra": "",
        "ad_resource": "5654",
        "category_id": "",
        "context": "",
        "from_source": "",
        "from_spmid": "333.337",
        "gaia_vtoken": "",
        "highlight": "1",
        "keyword": keyword,
        "order": order,
        "page_size": "42",
        "platform": "pc",
        "qv_id": getqvId(),
        "search_type": "video",
        "single_column": "0",
        "source_tag": "3",
        "web_location": "1430654",
        "wts": str(int(time.time())),
    }

def getqvId():
    qvId = js.call('getqvId')
    return qvId

def getW_rid(m):
    on = "ea1db124af3c7062474693fa704f4ff8"
    w_rid = md5(splice_url(m) + on)
    return w_rid