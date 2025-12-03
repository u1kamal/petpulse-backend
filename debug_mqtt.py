import paho.mqtt.client as mqtt
import json
import ssl

# Configuration from backend/.env
BROKER = "ac50eacadeff45e183f2f431293d17d7.s1.eu.hivemq.cloud"
PORT = 8883
USERNAME = "u1kamal"
PASSWORD = "Cadence@1234"
TOPIC = "feeder/device123/control"

def on_connect(client, userdata, flags, rc):
    print(f"Connected to {BROKER} with result code {rc}")
    client.subscribe(TOPIC)
    print(f"Subscribed to {TOPIC}")

def on_message(client, userdata, msg):
    print(f"RECEIVED MESSAGE: {msg.topic} -> {msg.payload.decode()}")

client = mqtt.Client()
client.username_pw_set(USERNAME, PASSWORD)
client.tls_set(cert_reqs=ssl.CERT_NONE) # Enable SSL for port 8883

client.on_connect = on_connect
client.on_message = on_message

print("Connecting to MQTT Broker...")
client.connect(BROKER, PORT, 60)
client.loop_forever()
