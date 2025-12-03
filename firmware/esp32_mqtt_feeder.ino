#include "HX711.h"
#include <ArduinoJson.h>
#include <ESP32Servo.h>
#include <PubSubClient.h>
#include <WiFi.h>
#include <WiFiClientSecure.h>

// ---------- Configuration ----------
#define DEVICE_ID "device123"
const char *ssid = "Incubation Center_4G";
const char *pass = "p@ssw@rd";

// MQTT Broker (Public Test Broker)
// MQTT Broker (Private HiveMQ Cloud)
const char *mqtt_server = "ac50eacadeff45e183f2f431293d17d7.s1.eu.hivemq.cloud";
const int mqtt_port = 8883;
const char *mqtt_user = "u1kamal";
const char *mqtt_password = "Cadence@1234";

// Topics
const char *mqtt_topic_control = "feeder/" DEVICE_ID "/control";
const char *mqtt_topic_status = "feeder/" DEVICE_ID "/status";

// ---------- Objects ----------
WiFiClientSecure espClient; // Use Secure Client for SSL
PubSubClient client(espClient);
HX711 scale;
Servo servoMotor;

// ---------- Pins ----------
#define DOUT 21 // HX711 DOUT -> GPIO21
#define CLK 22  // HX711 CLK  -> GPIO22
#define SERVO_PIN 18
#define RELAY_PIN 14

// ---------- Settings ----------
float targetWeight = 50.0;
float calibration_factor = 835.0;
const bool RELAY_ACTIVE_LOW = true;
const int OPEN_ANGLE = 180;
const int CLOSE_ANGLE = 0;
const unsigned long CALIB_WINDOW_MS = 15000UL;
const int PUMP_MS_PER_ML = 100; // Calibrate: How many ms to run for 1ml

// ---------- Globals ----------
float bowlWeight = 0.0;
bool bowlCaptured = false;
bool doorOpen = false;
bool feedingStarted = false;
unsigned long lastMsg = 0;

// ---------- Helper Functions ----------

float getRawWeight() {
  if (!scale.is_ready())
    return 0.0;
  return scale.get_units(10);
}

float getFoodWeight() {
  if (!bowlCaptured)
    return 0.0;
  float food = getRawWeight() - bowlWeight;
  if (food < 0.0f)
    food = 0.0f;
  return food;
}

void publishStatus(const char *msg) {
  JsonDocument doc;
  doc["status"] = msg;
  doc["weight"] = getFoodWeight();
  doc["online"] = true;

  char buffer[256];
  serializeJson(doc, buffer);
  client.publish(mqtt_topic_status, buffer);
}

// ---------- MQTT Callback ----------
void callback(char *topic, byte *payload, unsigned int length) {
  String message;
  for (int i = 0; i < length; i++)
    message += (char)payload[i];
  Serial.print("Message arrived: ");
  Serial.println(message);

  JsonDocument doc;
  DeserializationError error = deserializeJson(doc, message);

  if (error) {
    Serial.print("JSON Error: ");
    Serial.println(error.c_str());
    return;
  }

  const char *cmd = doc["cmd"];
  float amount = doc["amount"];

  if (strcmp(cmd, "feed") == 0) {
    Serial.printf("Command: FEED %.2fg\n", amount);
    targetWeight = amount;

    float currentFood = getFoodWeight();
    if (currentFood < targetWeight) {
      servoMotor.write(OPEN_ANGLE);
      doorOpen = true;
      feedingStarted = true;
      Serial.println("[ACTION] Door OPEN");
      publishStatus("Feeding started");
    } else {
      Serial.println("[INFO] Target already reached");
      publishStatus("Target reached");
    }

  } else if (strcmp(cmd, "water") == 0) {
    unsigned long duration = amount * PUMP_MS_PER_ML;
    Serial.printf("Command: WATER %.2fml -> Running for %lu ms\n", amount,
                  duration);

    // Pump ON
    digitalWrite(RELAY_PIN, RELAY_ACTIVE_LOW ? LOW : HIGH);
    publishStatus("Dispensing water...");

    delay(duration);

    // Pump OFF
    digitalWrite(RELAY_PIN, RELAY_ACTIVE_LOW ? HIGH : LOW);
    publishStatus("Water dispensed");
    Serial.println("Pump OFF");
  }
}

void reconnect() {
  while (!client.connected()) {
    Serial.print("Attempting MQTT connection...");
    String clientId = "ESP32Client-" + String(random(0xffff), HEX);

    if (client.connect(clientId.c_str(), mqtt_user, mqtt_password)) {
      Serial.println("connected");
      client.subscribe(mqtt_topic_control);
    } else {
      Serial.print("failed, rc=");
      Serial.print(client.state());
      Serial.println(" try again in 5s");
      delay(5000);
    }
  }
}

void autoLogic() {
  if (!feedingStarted)
    return;

  // Faster reading during feeding (5 samples instead of 10)
  // Note: We are calling getRawWeight() which uses 10 by default,
  // but let's just use the existing function for now to keep it simple.
  float food = getFoodWeight();

  // 1. Print Debug Info
  Serial.printf("[FEEDING] Current: %.2fg / Target: %.2fg\n", food,
                targetWeight);

  // 2. Publish Update to App (every 2 seconds to avoid spam)
  static unsigned long lastUpdate = 0;
  if (millis() - lastUpdate > 2000) {
    lastUpdate = millis();
    char msg[32];
    snprintf(msg, sizeof(msg), "Feeding... %.0fg", food);
    publishStatus(msg);
  }

  // 3. Check Threshold
  if (food >= targetWeight) {
    Serial.printf("[AUTO] Target reached %.2fg >= %.2fg -> closing door\n",
                  food, targetWeight);
    servoMotor.write(CLOSE_ANGLE);
    doorOpen = false;
    feedingStarted = false;
    publishStatus("Feeding completed");
  }

  // 4. Safety Timeout (e.g., 60 seconds)
  // If food runs out, don't leave door open forever!
  static unsigned long feedStartTime = 0;
  if (doorOpen && feedStartTime == 0)
    feedStartTime = millis();

  if (doorOpen && (millis() - feedStartTime > 60000)) {
    Serial.println("[SAFETY] Timeout reached (60s) -> closing door");
    servoMotor.write(CLOSE_ANGLE);
    doorOpen = false;
    feedingStarted = false;
    publishStatus("Feeding timeout");
    feedStartTime = 0; // Reset
  }
  if (!doorOpen)
    feedStartTime = 0; // Reset if closed normally
}

// ---------- Setup ----------
void setup() {
  Serial.begin(115200);
  delay(200);
  Serial.println("\n--- AutoPetFeeder (MQTT) ---");

  // Init Relay
  pinMode(RELAY_PIN, OUTPUT);
  digitalWrite(RELAY_PIN, RELAY_ACTIVE_LOW ? HIGH : LOW); // OFF

  // Init Servo
  servoMotor.attach(SERVO_PIN);
  servoMotor.write(CLOSE_ANGLE);

  // Init Scale
  scale.begin(DOUT, CLK);

  // --- Calibration Window (From your code) ---
  Serial.println("Calibration window started (15s). Use +/- to adjust.");
  Serial.printf("Starting factor: %.1f\n", calibration_factor);

  unsigned long startCal = millis();
  while (millis() - startCal < CALIB_WINDOW_MS) {
    scale.set_scale(calibration_factor);
    float val = getRawWeight();
    Serial.printf("Reading: %.2f g   Factor: %.1f\n", val, calibration_factor);

    while (Serial.available()) {
      char c = Serial.read();
      if (c == '+')
        calibration_factor += 10.0;
      else if (c == '-')
        calibration_factor -= 10.0;
    }
    delay(500);
  }
  scale.set_scale(calibration_factor);
  Serial.println("Calibration ended.");

  // Tare / Bowl Capture
  Serial.println("Place bowl now. Capturing in 2s...");
  delay(2000);

  float sum = 0.0;
  for (int i = 0; i < 10; ++i) {
    sum += getRawWeight();
    delay(150);
  }
  bowlWeight = sum / 10.0;
  bowlCaptured = true;
  Serial.printf("Bowl weight: %.2fg\n", bowlWeight);

  // WiFi & MQTT
  Serial.print("Connecting to WiFi");
  WiFi.begin(ssid, pass);
  while (WiFi.status() != WL_CONNECTED) {
    delay(500);
    Serial.print(".");
  }
  Serial.println("\nWiFi connected");

  // Allow insecure SSL (skip certificate check) for simplicity
  espClient.setInsecure();

  client.setServer(mqtt_server, mqtt_port);
  client.setCallback(callback);
}

// ---------- Loop ----------
void loop() {
  if (!client.connected())
    reconnect();
  client.loop();

  autoLogic();

  // Periodic Status
  unsigned long now = millis();
  if (now - lastMsg > 2000) {
    lastMsg = now;
    // Only publish if idle to avoid spamming during feed
    if (!feedingStarted)
      publishStatus("Idle");
  }
}
