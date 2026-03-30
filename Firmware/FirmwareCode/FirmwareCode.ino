// ─────────────────────────────────────────
// EcoTrack — Vehicle Emission Monitor
// ESP32 Firmware v1.0
// ─────────────────────────────────────────

#include <WiFi.h>
#include <HTTPClient.h>
#include <ArduinoJson.h>
#include <DHT.h>
#include <Wire.h>
#include <MPU6050.h>
#include <RTClib.h>

// ── CONFIGURE THESE ──────────────────────
const char* WIFI_SSID     = "NAREN";
const char* WIFI_PASSWORD = "naren123";
const char* SERVER_URL    = "https://ecotrack-emission-monitor-production.up.railway.app/data";

// ── PIN DEFINITIONS ──────────────────────
#define MQ7_PIN      34
#define MQ135_PIN    35
#define DHT_PIN      4
#define BUZZER_PIN   25
#define MPU_INT_PIN  27
#define LIMIT_SW_PIN 14
#define DHT_TYPE     DHT22
#define DIVIDER_RATIO 0.6667
// ── SENSOR OBJECTS ───────────────────────
DHT     dht(DHT_PIN, DHT_TYPE);
MPU6050 mpu;
RTC_DS3231 rtc;

// ── TIMING CONSTANTS ─────────────────────
#define SEND_INTERVAL     30000  // Send data every 30 sec
#define WARMUP_TIME       60000 // 1 min sensor warmup
#define VEHICLE_TIMEOUT   60000  // 60 sec no vibration = stopped
#define VIBRATION_THRESH  0.3    // g-force threshold

// ── STATE VARIABLES ───────────────────────
bool vehicleRunning    = false;
bool sensorsWarmedUp   = false;
unsigned long lastSend = 0;
unsigned long vehicleStartTime  = 0;
unsigned long lastVibrationTime = 0;
bool checkVibration(bool printResult = false);

// ─────────────────────────────────────────
void setup() {
  Serial.begin(115200);
  delay(1000);
  Serial.println("\n============================");
  Serial.println("   EcoTrack v1.0 Starting   ");
  Serial.println("============================\n");

  // Initialize pins
  pinMode(BUZZER_PIN, OUTPUT);
  digitalWrite(BUZZER_PIN, LOW);

  // ← NEW: Limit switch with internal pullup
  pinMode(LIMIT_SW_PIN, INPUT_PULLUP);

  // ← NEW: MPU interrupt pin
  pinMode(MPU_INT_PIN, INPUT);

  // Initialize I2C
  Wire.begin(21, 22);

  // DHT22
  dht.begin();

  // MPU6050
  mpu.initialize();
  if (mpu.testConnection()) {
    Serial.println("✅ MPU6050 connected");
  } else {
    Serial.println("❌ MPU6050 failed - check wiring");
  }

  // DS3231 RTC
  if (rtc.begin()) {
    Serial.println("✅ DS3231 connected");
    if (rtc.lostPower()) {
      Serial.println("⚠️  RTC lost power - setting time");
      rtc.adjust(DateTime(F(__DATE__), F(__TIME__)));
    }
  } else {
    Serial.println("❌ DS3231 failed");
  }

  // Reset WiFi completely on boot
  WiFi.disconnect(true);
  WiFi.mode(WIFI_OFF);
  delay(500);

  // Connect WiFi
  connectWiFi();

  Serial.println("\n✅ EcoTrack Ready!");
  Serial.println("Waiting for vehicle vibration...\n");
  beep(2);
}

// ── State variables (add these at top of file 
//    near other state variables if not present) ──
static unsigned long lastPrintTime = 0;

void loop() {

  // ── Step 1: Check vibration quietly ──
  bool vibrationDetected = checkVibration(false);

  if (vibrationDetected) {
    lastVibrationTime = millis();

    if (!vehicleRunning) {
      vehicleRunning   = true;
      sensorsWarmedUp  = false;
      vehicleStartTime = millis();
      Serial.println("🚗 Vehicle STARTED");
      Serial.println("⏳ Warming up sensors (3 min)...");
      beep(1);
    }
  }

  // ── Step 2: Check if vehicle stopped ──
  if (vehicleRunning &&
      millis() - lastVibrationTime > VEHICLE_TIMEOUT) {
    vehicleRunning  = false;
    sensorsWarmedUp = false;
    Serial.println("🛑 Vehicle STOPPED - Going idle");
    beep(3);
  }

  // ── Step 3: Print status every 10 seconds only ──
  if (millis() - lastPrintTime >= 10000) {
    int16_t ax, ay, az, gx, gy, gz;
    mpu.getMotion6(&ax, &ay, &az, &gx, &gy, &gz);
    float accel = sqrt(
      pow(ax / 16384.0, 2) +
      pow(ay / 16384.0, 2) +
      pow(az / 16384.0, 2)
    );
    float vib = abs(accel - 1.0);
    Serial.printf("[ %s ] Vibration: %.3f g\n",
      vehicleRunning ? "RUNNING" : "IDLE", vib);
    lastPrintTime = millis();
  }

  // ── Step 4: If vehicle not running — sleep ──
  if (!vehicleRunning) {
    delay(1000);
    return;
  }

  // ── Step 5: Handle warmup period ──
  if (!sensorsWarmedUp) {
    unsigned long elapsed   = millis() - vehicleStartTime;
    unsigned long remaining = (WARMUP_TIME - elapsed) / 1000;

    if (elapsed < WARMUP_TIME) {
      // Print warmup countdown every 10 seconds only
      if (millis() - lastPrintTime >= 10000) {
        Serial.printf("⏳ Warmup: %lu sec remaining\n",
                      remaining);
      }
      delay(1000);
      return;
    } else {
      sensorsWarmedUp = true;
      Serial.println("✅ Sensors ready! Starting readings.");
      beep(2);
    }
  }

  // ── Step 6: Send reading every 30 seconds ──
  if (millis() - lastSend >= SEND_INTERVAL) {
    readAndSend();
    lastSend = millis();
  }

  delay(1000);
}
// ─────────────────────────────────────────
// CHECK VEHICLE VIBRATION VIA MPU6050
// ─────────────────────────────────────────
bool checkVibration(bool printResult) {
  int16_t ax, ay, az, gx, gy, gz;
  mpu.getMotion6(&ax, &ay, &az, &gx, &gy, &gz);

  float accel = sqrt(
    pow(ax / 16384.0, 2) +
    pow(ay / 16384.0, 2) +
    pow(az / 16384.0, 2)
  );

  float vibration    = abs(accel - 1.0);
  bool  intTriggered = digitalRead(MPU_INT_PIN) == HIGH;

  if (printResult) {
    Serial.printf("Vibration: %.3f g | INT: %s\n",
      vibration, intTriggered ? "YES" : "NO");
  }

  return vibration > VIBRATION_THRESH || intTriggered;
}

// ─────────────────────────────────────────
// READ ALL SENSORS AND SEND TO SERVER
// ─────────────────────────────────────────
void readAndSend() {
  Serial.println("\n--- Taking Reading ---");

  // ── MQ-7 → CO PPM ──
  int raw7    = analogRead(MQ7_PIN);
  float co_ppm = rawToPPM(raw7, 99.042, -1.518);
  Serial.printf("CO:   %.1f PPM (raw: %d)\n", co_ppm, raw7);

  // ── MQ-135 → AQI + HC ──
  int raw135   = analogRead(MQ135_PIN);
  float aqi    = map(raw135, 0, 4095, 0, 500);
  float hc_ppm = rawToPPM(raw135, 110.47, -2.862);
  Serial.printf("AQI:  %.1f  (raw: %d)\n", aqi, raw135);
  Serial.printf("HC:   %.1f PPM\n", hc_ppm);

  // ── DHT22 → Temp + Humidity ──
  float temp = dht.readTemperature();
  float hum  = dht.readHumidity();
  if (isnan(temp)) temp = 0;
  if (isnan(hum))  hum  = 0;
  Serial.printf("Temp: %.1f°C  Hum: %.1f%%\n", temp, hum);

  // ── MPU6050 → Vibration Level ──
  int16_t ax, ay, az, gx, gy, gz;
  mpu.getMotion6(&ax, &ay, &az, &gx, &gy, &gz);
  float vibration = abs(sqrt(
    pow(ax/16384.0,2) +
    pow(ay/16384.0,2) +
    pow(az/16384.0,2)
  ) - 1.0);

  // ── DS3231 → Timestamp ──
  String timestamp = "";
  DateTime now = rtc.now();
  char buf[25];
  sprintf(buf, "%04d-%02d-%02dT%02d:%02d:%02d",
    now.year(), now.month(),  now.day(),
    now.hour(), now.minute(), now.second());
  timestamp = String(buf);
  Serial.printf("Time: %s\n", buf);

  // ── Buzzer Alert ──
  if (co_ppm > 4000) {
    Serial.println("🔴 DANGER: High CO!");
    beep(5);
  } else if (co_ppm > 2000) {
    Serial.println("⚠️  WARNING: Elevated CO");
    beep(2);
  }

  // ── Send to Server ──
  sendToServer(co_ppm, aqi, hc_ppm,
               temp, hum,
               vibration, timestamp);
}

// ─────────────────────────────────────────
// SEND JSON TO RAILWAY SERVER
// ─────────────────────────────────────────
void sendToServer(float co, float aqi, float hc,
                  float temp, float hum,
                  float vibration, String timestamp) {

  if (WiFi.status() != WL_CONNECTED) {
    Serial.println("⚠️ WiFi lost - reconnecting...");
    connectWiFi();
    return;
  }

  HTTPClient http;
  http.begin(SERVER_URL);
  http.addHeader("Content-Type", "application/json");
  http.setTimeout(10000); // 10 sec timeout

  // Build JSON payload
  StaticJsonDocument<300> doc;
  doc["co_ppm"]          = round(co  * 10) / 10.0;
  doc["aqi"]             = round(aqi * 10) / 10.0;
  doc["hc_ppm"]          = round(hc  * 10) / 10.0;
  doc["temperature"]     = round(temp * 10) / 10.0;
  doc["humidity"]        = round(hum  * 10) / 10.0;
  doc["vehicle_status"]  = "RUNNING";
  doc["vibration_level"] = round(vibration * 100) / 100.0;
  doc["timestamp"]       = timestamp;

  String json;
  serializeJson(doc, json);
  Serial.println("Sending: " + json);

  int code = http.POST(json);

  if (code == 200) {
    Serial.println("✅ Data sent successfully!\n");
  } else if (code < 0) {
    Serial.println("❌ Connection failed\n");
  } else {
    Serial.printf("❌ Server error: %d\n\n", code);
  }

  http.end();
}

// ─────────────────────────────────────────
// CONVERT RAW ANALOG TO PPM
// ─────────────────────────────────────────
float rawToPPM(int raw, float a, float b) {
  if (raw <= 0) return 0;
  float adcVoltage = raw * (3.3 / 4095.0);
  float sensorVoltage = adcVoltage / DIVIDER_RATIO;
  if (sensorVoltage <= 0) return 0;
  float rs    = ((5.0 * 10.0) / sensorVoltage) - 10.0;
  float ratio = rs / 10.0; 
  float ppm   = a * pow(ratio, b);
  return max(0.0f, min(ppm, 9999.0f));
}


// ─────────────────────────────────────────
// WIFI CONNECTION WITH RETRY
// ─────────────────────────────────────────
void connectWiFi() {
  Serial.printf("Connecting to WiFi: %s\n", WIFI_SSID);
  
  // ← ADD THESE 3 LINES — resets WiFi before connecting
  WiFi.disconnect(true);
  WiFi.mode(WIFI_OFF);
  delay(1000);
  
  WiFi.mode(WIFI_STA);
  WiFi.begin(WIFI_SSID, WIFI_PASSWORD);

  int tries = 0;
  while (WiFi.status() != WL_CONNECTED && tries < 30) {
    delay(500);
    Serial.print(".");
    tries++;
  }

  if (WiFi.status() == WL_CONNECTED) {
    Serial.printf("\n✅ WiFi Connected! IP: %s\n",
                  WiFi.localIP().toString().c_str());
  } else {
    Serial.println("\n❌ WiFi failed. Will retry later.");
  }
}

// ─────────────────────────────────────────
// BUZZER HELPER
// ─────────────────────────────────────────
void beep(int times) {
  for (int i = 0; i < times; i++) {
    digitalWrite(BUZZER_PIN, HIGH);
    delay(150);
    digitalWrite(BUZZER_PIN, LOW);
    delay(150);
  }
}