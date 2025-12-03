import os
import json
import logging
from fastapi import FastAPI, HTTPException
from pydantic import BaseModel
import paho.mqtt.client as mqtt
from dotenv import load_dotenv
from apscheduler.schedulers.background import BackgroundScheduler
from apscheduler.triggers.cron import CronTrigger
import uuid
from datetime import datetime, timedelta

# Load environment variables
load_dotenv()

# Configuration
MQTT_BROKER = os.getenv("MQTT_BROKER", "broker.hivemq.com")
MQTT_PORT = int(os.getenv("MQTT_PORT", 1883))
MQTT_TOPIC = os.getenv("MQTT_TOPIC", "autofeed/control")
MQTT_USERNAME = os.getenv("MQTT_USERNAME")
MQTT_PASSWORD = os.getenv("MQTT_PASSWORD")

# Logging setup
logging.basicConfig(level=logging.INFO)
logger = logging.getLogger(__name__)

# FastAPI app
app = FastAPI(title="AutoPetFeeder Backend")

from fastapi.middleware.cors import CORSMiddleware

app.add_middleware(
    CORSMiddleware,
    allow_origins=["*"],  # Allows all origins
    allow_credentials=True,
    allow_methods=["*"],  # Allows all methods
    allow_headers=["*"],  # Allows all headers
)

from fastapi import Request

@app.middleware("http")
async def log_requests(request: Request, call_next):
    logger.info(f"➡️ Incoming Request: {request.method} {request.url}")
    try:
        response = await call_next(request)
        logger.info(f"⬅️ Response: {response.status_code}")
        return response
    except Exception as e:
        logger.error(f"❌ Request Failed: {e}")
        raise e

# Global state for devices
device_states = {}

# MQTT Client setup
mqtt_client = mqtt.Client()

def on_connect(client, userdata, flags, rc):
    if rc == 0:
        logger.info("Connected to MQTT Broker!")
        # Subscribe to all device status topics
        client.subscribe("feeder/+/status")
    else:
        logger.error(f"Failed to connect, return code {rc}")

def on_message(client, userdata, msg):
    try:
        topic = msg.topic
        payload = json.loads(msg.payload.decode())
        
        # Extract device_id from topic: feeder/{device_id}/status
        parts = topic.split('/')
        if len(parts) >= 3:
            device_id = parts[1]
            
            # Calculate dispensed amount if feeding completed
            status_msg = payload.get("status", "")
            current_weight = payload.get("weight", 0)
            previous_weight = device_states.get(device_id, {}).get("weight", 0)
            
            # Update state
            # CRITICAL FIX: Preserve the EXISTING container_weight from the global state
            # Do NOT use a default of 500 if the device already exists, otherwise it resets!
            existing_state = device_states.get(device_id, {})
            current_container = existing_state.get("container_weight", 500)

            device_states[device_id] = {
                "online": True,
                "weight": current_weight,
                "container_weight": current_container, # Use the preserved value
                "status": status_msg,
                "last_seen": str(datetime.now())
            }
            
            if status_msg == "Feeding completed":
                # Optimistic update is now handled in /feed and scheduled_feed_job
                # This prevents double counting and reliance on potentially noisy scale data
                logger.info(f"✅ Device {device_id} confirmed feeding completion.")
                
                # We still send the notification for confirmation
                send_notification("Feeding Complete! 🐾", f"Feeder finished cycle.")
                
            logger.info(f"Updated status for {device_id}: {device_states[device_id]}")
    except Exception as e:
        logger.error(f"Error processing message: {e}")

mqtt_client.on_connect = on_connect
mqtt_client.on_message = on_message

if MQTT_USERNAME and MQTT_PASSWORD:
    mqtt_client.username_pw_set(MQTT_USERNAME, MQTT_PASSWORD)

if MQTT_PORT == 8883:
    mqtt_client.tls_set()  # Enable SSL/TLS for secure connection

try:
    mqtt_client.connect(MQTT_BROKER, MQTT_PORT, 60)
    mqtt_client.loop_start()
except Exception as e:
    logger.error(f"Could not connect to MQTT Broker: {e}")

# Scheduler Setup
# Scheduler Setup
from apscheduler.schedulers.background import BackgroundScheduler
from pytz import timezone
import tzlocal

# Use local system timezone
local_tz = tzlocal.get_localzone()
scheduler = BackgroundScheduler(timezone=local_tz)
scheduler.start()

SCHEDULE_FILE = "schedules.json"

def load_schedules():
    if os.path.exists(SCHEDULE_FILE):
        try:
            with open(SCHEDULE_FILE, "r") as f:
                return json.load(f)
        except:
            return []
    return []

def save_schedules(schedules):
    with open(SCHEDULE_FILE, "w") as f:
        json.dump(schedules, f, indent=2)

def scheduled_feed_job(device_id, amount, unit):
    logger.info(f"⏰ Executing Scheduled Feed for {device_id}: {amount}{unit}")
    
    # 1. Optimistic Storage Update
    current_state = device_states.get(device_id, {})
    current_container = current_state.get("container_weight", 500)
    new_container = max(0, current_container - amount)
    
    # Update state (create if not exists)
    if device_id not in device_states:
        device_states[device_id] = {}
    device_states[device_id]["container_weight"] = new_container
    
    # 2. Optimistic History Log
    history = load_history()
    history.append({
        "timestamp": str(datetime.now()),
        "device_id": device_id,
        "amount": amount,
        "unit": unit,
        "source": "schedule"
    })
    save_history(history)
    
    # 3. Send MQTT Command
    topic = f"feeder/{device_id}/control"
    payload = {
        "cmd": "feed",
        "amount": amount,
        "unit": unit
    }
    try:
        mqtt_client.publish(topic, json.dumps(payload))
        logger.info(f"✅ Scheduled Feed Published to {topic}")
    except Exception as e:
        logger.error(f"Failed to execute scheduled feed: {e}")

# Restore schedules on startup
active_schedules = load_schedules()
for s in active_schedules:
    # Re-add jobs (assuming daily for now)
    # Format HH:MM
    hour, minute = map(int, s['time'].split(':'))
    scheduler.add_job(
        scheduled_feed_job,
        CronTrigger(hour=hour, minute=minute),
        id=s['id'],
        args=[s['device_id'], s['amount'], s['unit']],
        replace_existing=True
    )
    logger.info(f"Restored schedule: {s['time']} - {s['amount']}g")

# Gemini AI Setup
import google.generativeai as genai

GEMINI_API_KEY = os.getenv("GEMINI_API_KEY")
if GEMINI_API_KEY:
    genai.configure(api_key=GEMINI_API_KEY)
    # Using gemini-2.0-flash as it is available for this key
    model = genai.GenerativeModel('gemini-2.0-flash')
else:
    logger.warning("GEMINI_API_KEY not found. AI features will not work.")

# Firebase Admin Setup
# Firebase removed by user request
# import firebase_admin
# from firebase_admin import credentials, messaging

# try:
#     cred = credentials.Certificate("serviceAccountKey.json")
#     firebase_admin.initialize_app(cred)
#     logger.info("✅ Firebase Admin Initialized")
# except Exception as e:
#     logger.error(f"❌ Firebase Init Failed: {e}")

def send_notification(title, body):
    """
    Dummy notification function (Firebase disabled)
    """
    logger.info(f"🔔 [Mock Notification] {title}: {body}")

# Data Models
class FeedRequest(BaseModel):
    device_id: str
    amount: int
    unit: str = "g"

class WaterRequest(BaseModel):
    device_id: str
    amount: int
    unit: str = "ml"

class ChatRequest(BaseModel):
    message: str
    context: str = ""

class DietRequest(BaseModel):
    pet_name: str
    species: str
    breed: str = ""
    weight: float
    age: float

class ScheduleRequest(BaseModel):
    device_id: str
    time: str # HH:MM (24h format)
    amount: int
    unit: str = "g"

# Endpoints
@app.get("/")
def read_root():
    return {"status": "online", "service": "AutoPetFeeder Backend"}

@app.get("/health")
def health_check():
    return {"status": "ok", "mqtt_connected": mqtt_client.is_connected()}

HISTORY_FILE = "history.json"

def load_history():
    if os.path.exists(HISTORY_FILE):
        try:
            with open(HISTORY_FILE, "r") as f:
                return json.load(f)
        except:
            return []
    return []

def save_history(history):
    with open(HISTORY_FILE, "w") as f:
        json.dump(history, f, indent=2)

@app.post("/feed")
def feed_pet(request: FeedRequest):
    """
    Triggers the feeding mechanism via MQTT for a specific device.
    """
    if request.amount <= 0:
        raise HTTPException(status_code=400, detail="Amount must be positive")

    # Dynamic Topic
    topic = f"feeder/{request.device_id}/control"
    
    payload = {
        "cmd": "feed",
        "amount": request.amount,
        "unit": request.unit
    }
    
    try:
        mqtt_client.publish(topic, json.dumps(payload))
        logger.info(f"Published to {topic}: {payload}")
        
        # Optimistic Update for Manual Feed
        # Update Container
        current_state = device_states.get(request.device_id, {})
        current_container = current_state.get("container_weight", 500)
        new_container = max(0, current_container - request.amount)
        
        if request.device_id not in device_states:
             device_states[request.device_id] = {}
        device_states[request.device_id]["container_weight"] = new_container
        
        # Save History
        history = load_history()
        history.append({
            "timestamp": str(datetime.now()),
            "device_id": request.device_id,
            "amount": request.amount,
            "unit": request.unit,
            "source": "manual"
        })
        save_history(history)
        
        return {"message": f"Feed command sent to {request.device_id}", "data": payload}
    except Exception as e:
        raise HTTPException(status_code=500, detail="Failed to communicate with device")

@app.get("/analytics/weekly")
def get_weekly_analytics():
    """
    Returns feeding data for the last 7 days.
    """
    history = load_history()
    today = datetime.now().date()
    data = {}
    
    # Initialize last 7 days with 0
    for i in range(6, -1, -1):
        day = today - timedelta(days=i)
        day_str = day.strftime("%a") # Mon, Tue...
        data[day_str] = 0
        
    # Sum up amounts
    for entry in history:
        try:
            entry_date = datetime.fromisoformat(entry["timestamp"]).date()
            if (today - entry_date).days < 7:
                day_str = entry_date.strftime("%a")
                data[day_str] += entry["amount"]
        except:
            pass
            
    return {"data": data}

@app.get("/history")
def get_history():
    """
    Returns the full list of feeding events, sorted by newest first.
    """
    history = load_history()
    # Sort by timestamp descending
    history.sort(key=lambda x: x["timestamp"], reverse=True)
    return {"history": history}

@app.get("/device/{device_id}/status")
def get_device_status(device_id: str):
    """
    Get the latest status (weight, etc.) of a device.
    """
    status = device_states.get(device_id)
    if not status:
        # Return a default/offline state if no data yet
        return {
            "online": False, 
            "weight": 0, 
            "container_weight": 500,
            "status": "offline",
            "last_seen": "never"
        }
    return status

@app.post("/device/{device_id}/refill")
def refill_container(device_id: str):
    """
    Resets the virtual food container weight to 500g.
    """
    current_state = device_states.get(device_id, {})
    
    # Update state
    device_states[device_id] = {
        "online": False,
        "weight": 0,
        "status": "Idle",
        "last_seen": "never",
        **current_state,
        "container_weight": 500
    }
    
    return {"message": "Container refilled", "container_weight": 500}

@app.post("/water")
def dispense_water(request: WaterRequest):
    """
    Triggers the water dispensing mechanism via MQTT for a specific device.
    """
    if request.amount <= 0:
        raise HTTPException(status_code=400, detail="Amount must be positive")

    # Dynamic Topic
    topic = f"feeder/{request.device_id}/control"

    payload = {
        "cmd": "water",
        "amount": request.amount,
        "unit": request.unit
    }
    
    try:
        mqtt_client.publish(topic, json.dumps(payload))
        logger.info(f"Published to {topic}: {payload}")
        return {"message": f"Water command sent to {request.device_id}", "data": payload}
    except Exception as e:
        logger.error(f"Failed to publish MQTT message: {e}")
        raise HTTPException(status_code=500, detail="Failed to communicate with device")

@app.post("/chat")
async def chat_with_ai(request: ChatRequest):
    """
    Chat with the AI Assistant about pet care.
    """
    if not GEMINI_API_KEY:
        raise HTTPException(status_code=503, detail="AI Service Unavailable (Missing API Key)")
    
    try:
        # Optimize: Limit tokens for faster response
        generation_config = genai.types.GenerationConfig(
            max_output_tokens=150,
            temperature=0.7
        )
        
        prompt = f"You are a concise AI Pet Assistant. Context: {request.context}. User: {request.message}. Keep answer under 50 words."
        response = model.generate_content(prompt, generation_config=generation_config)
        return {"response": response.text}
    except Exception as e:
        logger.error(f"AI Error: {e}")
        raise HTTPException(status_code=500, detail=f"AI Error: {str(e)}")

@app.post("/diet-plan")
async def generate_diet_plan(request: DietRequest):
    """
    Generates a diet plan for a pet.
    """
    if not GEMINI_API_KEY:
        raise HTTPException(status_code=503, detail="AI Service Unavailable (Missing API Key)")

    try:
        # Optimize: Limit tokens
        generation_config = genai.types.GenerationConfig(
            max_output_tokens=200,
            temperature=0.7
        )

        prompt = f"""
        Create a very brief daily diet plan for:
        {request.pet_name} ({request.species}, {request.breed}, {request.weight}kg, {request.age}yr).
        
        Format:
        - Morning: [Food]
        - Evening: [Food]
        - 1 Tip: [Tip]
        Max 50 words.
        """
        response = model.generate_content(prompt, generation_config=generation_config)
        return {"plan": response.text}
    except Exception as e:
        logger.error(f"AI Error: {e}")
        raise HTTPException(status_code=500, detail=f"AI Error: {str(e)}")

@app.get("/schedules")
def get_schedules():
    return load_schedules()

@app.post("/schedules")
def add_schedule(request: ScheduleRequest):
    logger.info(f"Received schedule request: {request}")
    try:
        hour, minute = map(int, request.time.split(':'))
        job_id = str(uuid.uuid4())
        
        # Debug: Check time
        now = datetime.now(local_tz)
        logger.info(f"🕒 Server Time: {now}")
        logger.info(f"🎯 Target Time: {hour}:{minute}")

        job = scheduler.add_job(
            scheduled_feed_job,
            CronTrigger(hour=hour, minute=minute, timezone=local_tz),
            id=job_id,
            args=[request.device_id, request.amount, request.unit]
        )
        logger.info(f"📅 Job Next Run: {job.next_run_time}")
        
        new_schedule = {
            "id": job_id,
            "device_id": request.device_id,
            "time": request.time,
            "amount": request.amount,
            "unit": request.unit
        }
        
        schedules = load_schedules()
        schedules.append(new_schedule)
        save_schedules(schedules)
        
        logger.info(f"Added schedule: {new_schedule}")
        return {"message": "Schedule added", "schedule": new_schedule}
    except ValueError:
        raise HTTPException(status_code=400, detail="Invalid time format. Use HH:MM")
    except Exception as e:
        logger.error(f"Error adding schedule: {e}")
        raise HTTPException(status_code=500, detail=str(e))

@app.delete("/schedules/{job_id}")
def delete_schedule(job_id: str):
    try:
        scheduler.remove_job(job_id)
    except:
        pass # Job might not exist in scheduler but exists in file
        
    schedules = load_schedules()
    schedules = [s for s in schedules if s['id'] != job_id]
    save_schedules(schedules)
    
    return {"message": "Schedule deleted"}
