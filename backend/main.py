import os
import json
import time
import requests
import faker
from selenium import webdriver
from flask import Flask, jsonify, request
from flask_cors import CORS  # 导入CORS模块
from selenium.common import WebDriverException
from requests.exceptions import JSONDecodeError

SONG_DIR = "song"
os.makedirs(SONG_DIR, exist_ok=True)
headers = None
url = "https://api.bilibili.com/x/web-interface/search/type?search_type=video&keyword={}&tids=3"

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

def get_bili_headers():
    driver = get_any_driver(headless=True)
    try:
        driver.get('https://www.bilibili.com')
        time.sleep(3)  # 等待页面加载完成
        # ✅ 最佳拼接方式（一行搞定）
        cookies = driver.get_cookies()
        cookie_str = "; ".join([f"{c['name']}={c['value']}" for c in cookies])
        print("✅ 获取Cookie成功：")
        print(cookie_str)
        return {
            "accept": "text/html,application/xhtml+xml,application/xml;q=0.9,image/avif,image/webp,image/apng,"
                      "*/*;q=0.8,"
                      "application/signed-exchange;v=b3;q=0.9",
            "accept - encoding": "gzip, deflate, br",
            "accept - language": "zh-CN, zh;q=0.9",
            "cache - control": "max-age = 0",
            "cookie": cookie_str,
            "sec-ch-ua-mobile": "?0",
            "sec-ch-ua-platform": "Windows",
            "sec-fetch-dest": "document",
            "sec-fetch-mode": "navigate",
            "sec-fetch-site": "none",
            "sec-fetch-user": "?1",
            "upgrade-insecure-requests": "1",
            "user-agent": faker.Faker().user_agent()
        }
    except Exception as e:
        print(str(e))
    finally:
        driver.quit()  # 确保一定会关闭浏览器

app = Flask(__name__)
CORS(app)

# API路由
@app.route('/search_song', methods=['POST'])
def get_data():
    global headers
    if headers is None:
        headers = get_bili_headers()
    # 检查Content-Type并获取keyword
    content_type = request.headers.get('Content-Type')
    keyword = ""
    if content_type == 'application/json':
        # JSON格式
        data = request.json
        keyword = data.get('keyword', '')
    elif content_type == 'application/x-www-form-urlencoded' or content_type.startswith('multipart/form-data'):
        # 表单格式
        keyword = request.form.get('keyword', '')
    else:
        # 尝试从请求体中获取
        try:
            data = request.get_json(silent=True)
            if data:
                keyword = data.get('keyword', '')
            else:
                keyword = request.form.get('keyword', '')
        except Exception as e:
            print(e)
    print(f"收到搜索关键词: {keyword}")
    if not keyword:
        return jsonify({"message": "关键词不能为空"}), 400
    # 获取歌曲数据
    invalid_chars = r'\/:*?"<>|'
    filename = f"{keyword}.json"
    filename = ''.join(c if c not in invalid_chars else '' for c in filename)
    file_path = os.path.join(SONG_DIR, filename)
    # 检查文件是否存在
    if os.path.exists(file_path):
        try:
            with open(file_path, 'r', encoding='utf-8') as f:
                return json.load(f)
        except Exception as e:
            print(f"读取文件错误: {e}")
    try:
        result = requests.get(url=url.format(keyword), headers=headers).json()
    except JSONDecodeError as e:
        print(e)
        return jsonify({"message": "关键词搜索出错，请重试"}), 400
    if result is None or result['code'] != 0:
        print(f"获取数据失败: {keyword}")
        return jsonify({"message": "关键词搜索出错，请重试"}), 400
    with open(file_path, 'w', encoding='utf-8') as fd:
        fd.write(json.dumps(result, indent=4, ensure_ascii=False))
    print(f"数据已保存到 {file_path}")
    return result


if __name__ == '__main__':
    app.run(debug=True, host='0.0.0.0', port=5000)
