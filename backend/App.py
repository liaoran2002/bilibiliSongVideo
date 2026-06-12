import json
import os

import uvicorn
from bili_apis import BiliApis
from fastapi import FastAPI
from fastapi.middleware.cors import CORSMiddleware

SONG_DIR = "song"
os.makedirs(SONG_DIR, exist_ok=True)
apis = BiliApis()
app = FastAPI()
app.add_middleware(
    CORSMiddleware,
    allow_origins=["*"],
    allow_credentials=True,
    allow_methods=["*"],
    allow_headers=["*"],
)

"""
    搜索内容
    :json keyword: 搜索关键字
    :json order: 排序方式  dm 弹幕数排序 click 播放量排序
"""
@app.post("/search_song")
def search(data: dict):
    try:
        keyword = data["keyword"]
        if not keyword:
            return {"code": 400,"message":"关键词不能为空"}
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
        res_json = apis.search_song(keyword)
        if res_json["code"] != 0:
            print(f"获取数据失败: {keyword}")
            return res_json
        with open(file_path, 'w', encoding='utf-8') as fd:
            fd.write(json.dumps(res_json, indent=4, ensure_ascii=False))
        print(f"数据已保存到 {file_path}")
        return res_json
    except Exception:
        return {"code": 400, "message": "关键词搜索出错，请重试"}

"""
    搜索一些内容
    :json keyword: 搜索关键字
    :json order: 排序方式  dm 弹幕数排序 click 播放量排序
"""
@app.post("/search_some")
def search_some(data: dict):
    try:
        keyword = data["keyword"]
        order = data["order"]
        return apis.search_some(keyword, order)
    except Exception:
        return {"code": 400, "message": "关键词搜索出错，请重试"}


if __name__ == "__main__":
    uvicorn.run(app, host="0.0.0.0", port=5000, forwarded_allow_ips='*')
