import os
import json
import time
import requests
import faker
from selenium import webdriver
from flask import Flask, jsonify, request
from flask_cors import CORS  # 导入CORS模块

SONG_DIR = "song"
cookie = ""
os.makedirs(SONG_DIR, exist_ok=True)


def get_bili_cookie():
    options = webdriver.ChromeOptions()
    options.add_argument("headless")  # 无头模式
    service = webdriver.ChromeService(executable_path="C:/Program Files/Google/Chrome/Application/chromedriver.exe")
    driver = webdriver.Chrome(options=options, service=service)
    url = 'https://www.bilibili.com'
    driver.get(url)
    time.sleep(5)
    cookies = driver.get_cookies()
    cookie_str = ""
    n = 1
    for i in cookies:
        cookie_str += i["name"] + "=" + i["value"] + ("" if (n == len(cookies)) else ";")
        n += 1
    print(cookie_str)
    driver.quit()
    return cookie_str


def get_songs_data(keyword):
    # 构建文件名 - 使用关键词作为文件名
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
    song_data = get_bili_search(keyword)
    with open(file_path, 'w', encoding='utf-8') as fd:
        fd.write(json.dumps(song_data, indent=4, ensure_ascii=False))
    print(f"数据已保存到 {file_path}")
    return song_data


def get_bili_search(song_name):
    headers = {
        "accept": "text/html,application/xhtml+xml,application/xml;q=0.9,image/avif,image/webp,image/apng,"
                  "*/*;q=0.8,"
                  "application/signed-exchange;v=b3;q=0.9",
        "accept - encoding": "gzip, deflate, br",
        "accept - language": "zh-CN, zh;q=0.9",
        "cache - control": "max-age = 0",
        "cookie": cookie,
        "sec-ch-ua-mobile": "?0",
        "sec-ch-ua-platform": "Windows",
        "sec-fetch-dest": "document",
        "sec-fetch-mode": "navigate",
        "sec-fetch-site": "none",
        "sec-fetch-user": "?1",
        "upgrade-insecure-requests": "1",
        "user-agent": faker.Faker().user_agent()
    }
    url = "https://api.bilibili.com/x/web-interface/search/type?search_type=video&keyword={}".format(
        song_name)
    print(url)
    result = requests.get(url=url, headers=headers).json()
    return result

    # 获取歌曲数据，如果文件不存在则爬取


app = Flask(__name__)
CORS(app)


# API路由
@app.route('/search', methods=['POST'])
def get_data():
    global cookie
    if cookie == "":
        cookie = get_bili_cookie()
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
        return jsonify({"error": "关键词不能为空"}), 400
    # 获取歌曲数据
    song_data = get_songs_data(keyword)
    return song_data


if __name__ == '__main__':
    app.run(debug=True, host='0.0.0.0', port=5000)
