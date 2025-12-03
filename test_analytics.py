import requests
import json
import time

API_URL = "http://127.0.0.1:8001"
DEVICE_ID = "device123"

def test_analytics():
    print(f"Testing Analytics for {DEVICE_ID}...")

    # 1. Feed 100g
    print("\n1. Feeding 100g...")
    resp = requests.post(f"{API_URL}/feed", json={"device_id": DEVICE_ID, "amount": 100})
    print(f"Feed Response: {resp.json()}")

    # 2. Feed 50g
    print("\n2. Feeding 50g...")
    resp = requests.post(f"{API_URL}/feed", json={"device_id": DEVICE_ID, "amount": 50})
    print(f"Feed Response: {resp.json()}")

    # 3. Check Analytics
    print("\n3. Checking Weekly Analytics...")
    resp = requests.get(f"{API_URL}/analytics/weekly")
    data = resp.json()
    print(f"Analytics Data: {data}")
    
    # Verify today has at least 150g
    import datetime
    today_str = datetime.datetime.now().strftime("%a")
    today_amount = data['data'].get(today_str, 0)
    
    if today_amount >= 150:
        print(f"✅ PASS: Today ({today_str}) has {today_amount}g (>= 150g)")
    else:
        print(f"❌ FAIL: Today ({today_str}) has {today_amount}g (Expected >= 150g)")

if __name__ == "__main__":
    try:
        test_analytics()
    except Exception as e:
        print(f"Test Failed: {e}")
