from flask import Flask, jsonify
import requests
from bs4 import BeautifulSoup
from datetime import datetime

app = Flask(__name__)

cached_data = {
    "cepea": 4.5,
    "cme": 236,
    "market_price": 5000,
    "last_update": None
}

def fetch_cepea():
    # 实际项目中替换为爬取CEPEA官方数据逻辑
    return 4.5

def fetch_cme():
    # 实际项目中爬取/调用CME数据接口
    return 236

def fetch_china_market_price():
    # 实际爬取中国海关或者商务部数据
    return 5000

@app.route('/api/price-data')
def price_data():
    global cached_data
    now = datetime.now()
    # 数据缓存1小时
    if not cached_data['last_update'] or (now - cached_data['last_update']).total_seconds() > 3600:
        try:
            cached_data['cepea'] = fetch_cepea()
            cached_data['cme'] = fetch_cme()
            cached_data['market_price'] = fetch_china_market_price()
            cached_data['last_update'] = now
        except Exception as e:
            print("数据拉取失败:", e)
    return jsonify({
        "cepea": cached_data["cepea"],
        "cme": cached_data["cme"],
        "market_price": cached_data["market_price"],
        "lastUpdate": cached_data["last_update"].strftime("%Y-%m-%d %H:%M:%S") if cached_data["last_update"] else None
    })

if __name__ == '__main__':
    app.run()
