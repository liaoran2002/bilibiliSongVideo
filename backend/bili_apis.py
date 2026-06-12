import requests

from bili_utils import get_common_headers, getqvId, get_search_params, getW_rid


class BiliApis:
    """
        搜索音乐相关视频
        :param keyword: 搜索关键字
        返回搜索结果
    """
    def search_song(self, keyword):
        try:
            url = 'https://api.bilibili.com/x/web-interface/wbi/search/type'
            headers = get_common_headers()
            m = get_search_params(keyword)
            w_rid = getW_rid(m)
            m["tids"] = 3
            m["w_rid"] = w_rid
            params = m
            response = requests.get(url, params=params, headers=headers)
            res_json = response.json()
        except Exception as e:
            res_json = {"code": 500, "message": str(e)}
        return res_json

    """
        搜索一些内容
        :param keyword: 搜索关键字
        :param order: 排序方式  dm 弹幕数排序 click 播放量排序
        返回搜索结果
    """
    def search_some(self, keyword, order):
        try:
            url = 'https://api.bilibili.com/x/web-interface/wbi/search/type'
            headers = get_common_headers()
            qvId = getqvId()
            m = get_search_params(keyword, order)
            w_rid = getW_rid(m)
            m["w_rid"] = w_rid
            params = m
            response = requests.get(url, params=params, headers=headers)
            res_json = response.json()
        except Exception as e:
            res_json = {"code": 500, "message": str(e)}
        return res_json
