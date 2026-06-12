import hashlib
import time
import faker
from selenium import webdriver
from selenium.common.exceptions import WebDriverException

import execjs

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
                # 自动区分新旧无头！！！
                if driver_class == webdriver.Firefox:
                    options.add_argument("--headless")
                else:
                    options.add_argument("--headless=new")  # Chrome/Edge用新版
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
        time.sleep(3)  # 等待页面加载完成
        # ✅ 最佳拼接方式（一行搞定）
        cookies = driver.get_cookies()
        cookie_str = "; ".join([f"{c['name']}={c['value']}" for c in cookies])
        print("✅ 获取Cookie成功：")
        print(cookie_str)
        return cookie_str
    finally:
        driver.quit()  # 确保一定会关闭浏览器

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