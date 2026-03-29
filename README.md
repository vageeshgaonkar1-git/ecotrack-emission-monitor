# 🚗 EcoTrack — Smart Vehicle Emission Monitor

> A low-cost, real-time, on-board vehicle emission monitoring system built for sustainability.

![Status](https://img.shields.io/badge/Status-Active-brightgreen)
![Platform](https://img.shields.io/badge/Platform-ESP32-blue)
![Backend](https://img.shields.io/badge/Backend-Node.js-green)
![Database](https://img.shields.io/badge/Database-JSON%2FSQLite-yellow)
![Deploy](https://img.shields.io/badge/Deploy-Railway-purple)

---

## 📋 Table of Contents

1. [Problem Statement](#problem-statement)
2. [Our Solution](#our-solution)
3. [System Architecture](#system-architecture)
4. [Hardware Components](#hardware-components)
5. [Circuit & Wiring](#circuit--wiring)
6. [Sensors & Workflow](#sensors--workflow)
7. [PUC Standards Reference](#puc-standards-reference)
8. [Software Stack](#software-stack)
9. [API Reference](#api-reference)
10. [Dashboard Features](#dashboard-features)
11. [Setup & Installation](#setup--installation)
12. [ESP32 Firmware](#esp32-firmware)
13. [Sustainability Impact](#sustainability-impact)
14. [Scalability Roadmap](#scalability-roadmap)
15. [Team](#team)

---

## 🎯 Problem Statement

Over **1 crore vehicles** in India undergo PUC (Pollution Under Control) checks just **once a year** at fixed stations. This means:

- No continuous, real-time monitoring of vehicle emissions
- No data on what vehicles actually emit while running on roads
- Professional emission monitoring equipment costs **₹50,000+** — unaffordable at scale
- High-emission vehicles go undetected for months between checks
- No location-tagged pollution data for urban planning

> **The gap:** There is no affordable, continuous, on-board emission monitoring solution available today.

---

## 💡 Our Solution

**EcoTrack** is a ₹2500 on-board device that:

- Mounts on **any vehicle** via a sealed enclosure
- Monitors **5 emission parameters** continuously in real time
- Compares readings against **Indian BS6 PUC standards**
- Streams live data to a **web dashboard** accessible from any browser
- Powers on automatically when the **vehicle starts** and sleeps when it stops
- Runs on an **integrated battery system** — no vehicle wiring needed

---

## 🏗️ System Architecture

```
┌─────────────────────────────────────────────────────────┐
│                  HARDWARE DEVICE                        │
│   MQ-7 + MQ-135 + DHT22 + MPU6050 + DS3231            │
│              ↓ (reads every 30 sec)                     │
│                    ESP32                                │
│              ↓ HTTP POST (JSON)                         │
│                  WiFi Network                           │
└─────────────────────────────────────────────────────────┘
                        ↓
┌─────────────────────────────────────────────────────────┐
│                CLOUD BACKEND (Railway)                  │
│            Node.js + Express Server                     │
│         Receives, processes, stores data                │
│              JSON File Database                         │
└─────────────────────────────────────────────────────────┘
                        ↓
┌─────────────────────────────────────────────────────────┐
│              WEB DASHBOARD (Any Browser)                │
│   Live readings • Graphs • PUC comparison               │
│   Session history • Alerts • Additional parameters      │
└─────────────────────────────────────────────────────────┘
```

---

## 📦 Hardware Components

| # | Component | Purpose | Cost |
|---|-----------|---------|------|
| 1 | ESP32 Devkit V1 | Main controller + WiFi | ~₹400 |
| 2 | MQ-7 Sensor | Carbon Monoxide (CO) detection | ~₹200 |
| 3 | MQ-135 Sensor | HC, CO2, AQI measurement | ~₹150 |
| 4 | DHT22 Sensor | Temperature + Humidity | ~₹120 |
| 5 | MPU6050 | Vehicle detection via vibration | ~₹150 |
| 6 | DS3231 RTC | Accurate timestamps | ~₹150 |
| 7 | 2S BMS Board | Li-ion battery protection | ~₹80 |
| 8 | LM2596 Buck | Voltage regulation 7.4V→5V | ~₹60 |
| 9 | 18650 Cells (x4) | Power source | ~₹800 |
| 10 | Limit Switch | Master power control | ~₹20 |
| 11 | Buzzer | Audio danger alerts | ~₹20 |
| 12 | ABS Enclosure | Device housing + protection | ~₹80 |
| 13 | Silicone tube (1m) | Safe gas sampling | ~₹50 |
| — | Resistors, caps, wires | Supporting components | ~₹100 |
| | **Grand Total** | | **~₹2380** |

> 💡 EcoTrack costs **20x less** than professional PUC testing equipment (₹50,000+)

---

## 🔌 Circuit & Wiring

### Power System
```
2x 18650 Li-ion (series) → 7.4V
         ↓
    2S BMS Board (protection)
         ↓
  LM2596 Buck Converter
  Adjust to exactly 5V output
         ↓
  ESP32 VIN pin (5V rail)
  100μF capacitor across 5V/GND rails
```

### Complete Pin Connections
```
POWER:
ESP32 VIN    → 5V rail (from LM2596)
ESP32 GND    → GND rail
Limit Switch → One terminal GND, other GPIO14

MQ-7 (CO Sensor):
VCC → 5V rail
GND → GND rail  
AO  → 1kΩ → GPIO34 → 2kΩ → GND  [voltage divider]

MQ-135 (AQI/HC):
VCC → 5V rail
GND → GND rail
AO  → 1kΩ → GPIO35 → 2kΩ → GND  [voltage divider]

DHT22 (Temp/Humidity):
VCC  → ESP32 3.3V
GND  → GND rail
DATA → GPIO4 + 10kΩ pullup to 3.3V

MPU6050 (Vibration):
VCC → ESP32 3.3V
GND → GND rail
SDA → GPIO21
SCL → GPIO22
INT → GPIO27
0.1μF capacitor across VCC/GND

DS3231 (RTC):
VCC → ESP32 3.3V
GND → GND rail
SDA → GPIO21  (shared I2C bus)
SCL → GPIO22  (shared I2C bus)

BUZZER:
(+) → GPIO25
(-) → GND rail
```

### Why Voltage Divider for MQ Sensors?
```
MQ sensors output 0–5V (powered by 5V rail)
ESP32 ADC only tolerates 0–3.3V MAX

Voltage Divider formula:
Vout = Vin × 2kΩ / (1kΩ + 2kΩ)
Vout = 5V × 0.667 = 3.33V ✅ Safe
```

### Device Safety Features
| Risk | Protection |
|------|-----------|
| Exhaust heat (200–700°C) | 50cm silicone sampling tube — gas cools before sensors |
| Engine vibration | Hot glue on connections + foam padding inside enclosure |
| Rain/dust | Sealed ABS enclosure, silicone-sealed holes only |
| Voltage spikes | LM2596 regulated 5V output + 100μF bulk capacitor |
| Battery safety | 2S BMS handles overcharge, overdischarge, short circuit |

---

## 📡 Sensors & Workflow

### MQ-7 — Carbon Monoxide (CO)
```
Engine exhaust → 50cm silicone tube → sensor chamber
       ↓
SnO2 surface reacts with CO molecules
       ↓
Resistance changes → voltage output (0–5V)
       ↓
Voltage divider → ESP32 ADC (0–3.3V)
       ↓
rawToPPM() formula → CO in PPM
       ↓
Compare vs BS6 limit (3000 PPM)
       ↓
PASS / WARNING / FAIL + buzzer if DANGER
```

### MQ-135 — Air Quality / HC / CO2
```
Mixed exhaust gases → sensor chamber
       ↓
Sensitive layer reacts to multiple gases
       ↓
Combined resistance change → voltage
       ↓
AQI mapped (0–500 scale)
HC extracted via calibration curve
CO2 estimated (400 + AQI × 2.1)
       ↓
Compare vs CPCB AQI standards
```

### DHT22 — Temperature + Humidity
```
Capacitive humidity + NTC thermistor
       ↓
Digital 1-Wire output → GPIO4
       ↓
Temperature used to calibrate MQ readings
Humidity used for heat index calculation
```

### MPU6050 — Vehicle Detection
```
Engine OFF → near-zero vibration (0.000 g)
       ↓
Engine ON → chassis vibration > 0.3g threshold
       ↓
ESP32 wakes from idle state
MQ sensors powered on
3-minute warmup begins
       ↓
Engine OFF → no vibration for 60 sec
       ↓
Sensors power down → ESP32 idles
```

### DS3231 RTC — Accurate Timestamps
```
Battery-backed real-time clock
       ↓
Provides accurate IST timestamps
       ↓
Even without WiFi/internet
       ↓
Timestamps every sensor reading
       ↓
Enables reliable historical graphs
```

---

## 📊 PUC Standards Reference

### Indian BS6 Standards (Current)

#### Petrol Vehicles
| Parameter | BS6 Legal Limit | EcoTrack Warning | EcoTrack Danger |
|-----------|----------------|-----------------|----------------|
| CO | < 0.3% (3000 PPM) | > 2000 PPM | > 3000 PPM |
| HC | < 100 PPM (4-wheeler) | > 80 PPM | > 100 PPM |

#### CPCB AQI Scale (India)
| AQI Range | Category | EcoTrack Status |
|-----------|---------|----------------|
| 0–50 | Good | ✅ SAFE |
| 51–100 | Satisfactory | ✅ SAFE |
| 101–200 | Moderate | ⚠️ WARNING |
| 201–300 | Poor | 🔴 DANGER |
| 301–400 | Very Poor | 🔴 DANGER |
| 401–500 | Severe | 🔴 DANGER |

### Emission Grading System
| Grade | CO Level | HC Level | Meaning |
|-------|---------|---------|---------|
| A | < 1000 PPM | < 50 PPM | Excellent |
| B | 1000–2000 PPM | 50–80 PPM | Good |
| C | 2000–3000 PPM | 80–100 PPM | Marginal |
| F | > 3000 PPM | > 100 PPM | Fail — PUC violation |

---

## 💻 Software Stack

### Firmware (ESP32)
| Item | Detail |
|------|--------|
| IDE | Arduino IDE 2.x |
| Language | C++ (Arduino Framework) |
| Libraries | DHT (Adafruit), ArduinoJson, MPU6050, RTClib, WiFi, HTTPClient |
| Protocol | HTTP POST over WiFi |
| Data Format | JSON |
| Sampling Interval | Every 30 seconds |
| Warmup Time | 3 minutes after vehicle start |

### Backend
| Item | Detail |
|------|--------|
| Runtime | Node.js v24 |
| Framework | Express.js |
| Language | JavaScript |
| API Type | REST API |
| Database | JSON file (zero compilation, works everywhere) |
| Max Records | 1000 readings (auto-managed) |

### Frontend
| Item | Detail |
|------|--------|
| Languages | HTML5, CSS3, JavaScript ES6 |
| Charts | Chart.js |
| Theme | Dark UI |
| Live Refresh | Every 5 seconds |
| Graph Refresh | Every 15 seconds |
| Responsive | Yes — mobile + desktop |

### Deployment
| Item | Detail |
|------|--------|
| Version Control | Git + GitHub |
| Hosting | Railway.app |
| Deployment | Auto on git push |
| Cost | Free tier |

---

## 📡 API Reference

| Method | Route | Description |
|--------|-------|-------------|
| POST | `/data` | ESP32 sends sensor reading |
| GET | `/api/live` | Latest single reading |
| GET | `/api/history?hours=1` | Readings for last N hours |
| GET | `/api/stats` | Daily session averages |
| GET | `/api/alerts` | Last 10 danger readings |
| GET | `/api/recent` | Last 5 readings |
| GET | `/reset` | Clear all data |
| GET | `/test` | Simulate fake reading |

### Sample JSON Payload (ESP32 → Server)
```json
{
  "co_ppm": 245.3,
  "aqi": 67.2,
  "hc_ppm": 43.8,
  "temperature": 31.4,
  "humidity": 68.2,
  "vehicle_status": "RUNNING",
  "vibration_level": 0.842,
  "timestamp": "2026-03-29T14:32:05"
}
```

### Sample API Response
```json
{
  "success": true,
  "emission_status": "SAFE",
  "overall_grade": "A",
  "co_status": "PASS",
  "hc_status": "PASS",
  "aqi_status": "PASS",
  "co2_ppm": 541,
  "nh3_ppm": 5.4,
  "engine_load": "MEDIUM",
  "lambda": 0.995,
  "lambda_status": "OPTIMAL",
  "heat_index": 34.2,
  "benzene_risk": "NORMAL"
}
```

---

## 🖥️ Dashboard Features

| Feature | Description |
|---------|-------------|
| Live Readings | CO, AQI, HC, Temperature, Humidity — updates every 5 sec |
| Emission Status | SAFE / WARNING / DANGER with color coding |
| Emission Grade | A / B / C / F based on BS6 standards |
| Vehicle Status | RUNNING / OFF via MPU6050 detection |
| Additional Parameters | CO2, NH3, Engine Load, Lambda (AFR), Heat Index, Benzene Risk |
| Live Graph | Line graph of CO, AQI, HC over last 1 hour |
| PUC Comparison | Side-by-side vs Indian BS6 legal limits |
| Last 5 Readings | Instant recent history table |
| Session History | Daily averages with grade |
| Reset Button | One-click graph data reset |
| Audio Alert | Buzzer triggers at danger threshold |

---

## ⚙️ Setup & Installation

### Prerequisites
- Node.js v18+ installed
- Git installed
- Arduino IDE 2.x installed

### Clone & Run Locally
```bash
git clone https://github.com/YOUR-USERNAME/ecotrack-emission-monitor
cd ecotrack-emission-monitor
npm install
node server.js
```

Open browser → `http://localhost:3000`

### Test Without Hardware
```
Open: http://localhost:3000/test
Refresh 5–6 times to populate data
Open: http://localhost:3000 to see dashboard
```

### Deploy to Railway
```
1. Push code to GitHub
2. Go to railway.app
3. New Project → Deploy from GitHub
4. Select repository
5. Railway auto-deploys
6. Settings → Networking → Generate Domain
```

---

## 📟 ESP32 Firmware

### Required Libraries (Arduino IDE)
```
DHT sensor library     → by Adafruit
ArduinoJson            → by Benoit Blanchon
MPU6050                → by Electronic Cats
RTClib                 → by Adafruit
WiFi                   → built-in ESP32
HTTPClient             → built-in ESP32
```

### Configuration (update before uploading)
```cpp
const char* WIFI_SSID     = "YOUR_WIFI_NAME";
const char* WIFI_PASSWORD = "YOUR_WIFI_PASSWORD";
const char* SERVER_URL    = "https://YOUR-RAILWAY-URL.up.railway.app/data";
```

### Firmware Behavior
```
Boot → Initialize sensors → Connect WiFi
     ↓
Wait for vehicle vibration (MPU6050)
     ↓
Vehicle detected → 3 min sensor warmup
     ↓
Take reading every 30 seconds:
  Read MQ-7, MQ-135, DHT22, MPU6050, DS3231
  Calculate PPM values
  Send JSON to server
  Buzzer if CO > 3000 PPM
     ↓
Vehicle stops → idle mode → wait for next start
```

---

## 🌍 Sustainability Impact

### Direct Impact
- Detects high-emission vehicles **continuously** vs once-a-year PUC
- Enables **early intervention** before vehicles exceed legal limits
- Reduces urban air pollution through real-time accountability

### Cost Sustainability
| Metric | Standard PUC Station | EcoTrack |
|--------|---------------------|---------|
| Cost per unit | ₹50,000+ | ₹2,380 |
| Coverage | Fixed location only | Any vehicle, any road |
| Monitoring frequency | Once a year | Every 30 seconds |
| Data availability | Paper certificate | Live cloud dashboard |

> For the cost of ONE PUC station, you can deploy **21 EcoTrack devices**

### Energy Sustainability
- Intelligent sleep mode — sensors only active when vehicle runs
- Integrated battery — zero vehicle wiring, zero grid dependency
- Deep sleep between readings — minimal power consumption

---

## 📈 Scalability Roadmap

```
V1 (Current - Hackathon)
Single device, local/cloud dashboard, basic monitoring

V2 (Campus/Fleet Deployment)
Fixed sensor nodes at key locations
Cloud dashboard with multiple devices
Firebase real-time database

V3 (City Scale)
Solar powered nodes — zero running cost
LoRa communication — no WiFi needed
PM2.5 sensor added
AI-based pollution spike prediction

V4 (Government Integration)
Open public API
Integration with municipal corporations
Policy decision support tool
Compare: ₹2380 nodes vs ₹50,000 stations
```

---

## 👥 Team

Built at SAMYUTI 2026 Hardware Hackathon @ Chanakya University.

---

## 📄 License

MIT License — Open source for sustainability research and education.

---

*EcoTrack doesn't just measure pollution. It creates accountability — one vehicle, one kilometer at a time.*
