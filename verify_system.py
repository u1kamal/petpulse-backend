import requests
import sys
import time

API_URL = "http://127.0.0.1:8001"

def check_backend():
    print("🔍 Checking Backend Health...")
    try:
        resp = requests.get(f"{API_URL}/health", timeout=10)
        if resp.status_code == 200:
            print(f"✅ Backend is ONLINE: {resp.json()}")
            return True
        else:
            print(f"❌ Backend returned status {resp.status_code}")
            return False
    except requests.exceptions.ConnectionError:
        print("❌ Backend is OFFLINE (Connection Refused)")
        return False

def check_endpoints():
    print("\n🔍 Checking API Endpoints...")
    
    # 1. Feed
    try:
        resp = requests.post(f"{API_URL}/feed", json={"device_id": "test_device", "amount": 10})
        if resp.status_code == 200:
            print("✅ /feed endpoint working")
        else:
            print(f"❌ /feed failed: {resp.text}")
    except:
        print("❌ /feed check failed")

    # 2. Analytics
    try:
        resp = requests.get(f"{API_URL}/analytics/weekly")
        if resp.status_code == 200:
            print("✅ /analytics/weekly endpoint working")
            print(f"   Data: {resp.json()}")
        else:
            print(f"❌ /analytics/weekly failed: {resp.text}")
    except:
        print("❌ /analytics/weekly check failed")

if __name__ == "__main__":
    print("=== PetPulse System Verification ===")
    if check_backend():
        check_endpoints()
        print("\n✅ System Verification Complete: Backend is healthy.")
    else:
        print("\n❌ System Verification Failed: Start the backend with 'uvicorn backend.main:app --port 8001'")
