import requests
import json
import time

API_URL = "http://127.0.0.1:8001"
DEVICE_ID = "device123"

def test_storage_logic():
    print(f"Testing Storage Logic for {DEVICE_ID}...")

    # 1. Reset Container
    print("\n1. Resetting Container...")
    resp = requests.post(f"{API_URL}/device/{DEVICE_ID}/refill")
    print(f"Refill Response: {resp.json()}")
    
    # Check Status
    resp = requests.get(f"{API_URL}/device/{DEVICE_ID}/status")
    status = resp.json()
    print(f"Initial Status: {status}")
    initial_weight = status.get("container_weight", 500)
    if initial_weight != 500:
        print("❌ FAIL: Container weight not 500 after refill")
        return

    # 2. Feed 50g
    print("\n2. Feeding 50g...")
    resp = requests.post(f"{API_URL}/feed", json={"device_id": DEVICE_ID, "amount": 50})
    print(f"Feed Response: {resp.json()}")

    # Check Status Immediately
    resp = requests.get(f"{API_URL}/device/{DEVICE_ID}/status")
    status = resp.json()
    print(f"Status after Feed: {status}")
    
    expected_weight = 450
    actual_weight = status.get("container_weight")
    
    if actual_weight == expected_weight:
        print(f"✅ PASS: Weight updated to {actual_weight}")
    else:
        print(f"❌ FAIL: Expected {expected_weight}, got {actual_weight}")

if __name__ == "__main__":
    try:
        test_storage_logic()
    except Exception as e:
        print(f"Test Failed: {e}")
