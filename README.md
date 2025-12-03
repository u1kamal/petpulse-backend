# AutoPetFeeder Project 🐾

## 🚧 Current Status: Hardware Debugging
- **Backend**: ✅ Running on Port **8001** (Fixed port conflict).
- **MQTT**: ✅ Switched to **broker.hivemq.com** (Stable).
- **Mobile App**: ✅ Connected to Backend.
- **Hardware**: ⚠️ Debugging Connection (Using Spy Script).

## 🚀 How to Run

### 1. Start the Backend 🧠
```bash
cd backend
# Note: Port is now 8001
python -m uvicorn main:app --host 0.0.0.0 --port 8001 --reload
```

### 2. Start the App 📱
```bash
cd mobile
npx expo start
```

### 3. Debugging (Spy Script) 🕵️
If the feeder isn't responding, run this to see if messages are reaching the internet:
```bash
python debug_mqtt.py
```

## 🤖 Hardware Setup
1.  **Firmware**: `firmware/esp32_mqtt_feeder.ino` (Updated for HiveMQ).
2.  **Upload**: Flash to ESP32.
3.  **Test**: Open Serial Monitor (115200) and press "Feed" in App.
