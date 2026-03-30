# EcoTrack — System Architecture

## Overview

EcoTrack is a three-layer system: hardware sensor node → cloud backend → web dashboard.

```
┌─────────────────────────────────────────────────────────────┐
│                     HARDWARE LAYER                          │
│                                                             │
│  Sensors → ESP32 → WiFi → HTTP POST JSON → Server          │
│                                                             │
│  Sampling interval : every 30 seconds                       │
│  Warmup time       : 3 minutes after vehicle start          │
│  Sleep mode        : when vibration < 0.3g for 60 sec       │
└─────────────────────────────────────────────────────────────┘
                              │
                    HTTP POST /data
                    JSON payload
                              │
                              ▼
┌─────────────────────────────────────────────────────────────┐
│                     BACKEND LAYER                           │
│                                                             │
│  Express.js REST API                                        │
│                                                             │
│  POST /data        ← receives ESP32 readings                │
│    └─ processReading()  → calculates statuses & grades      │
│    └─ saveReading()     → persists to data.json (ISO ts)    │
│                                                             │
│  GET /api/live     → latest reading                         │
│  GET /api/history  → last N hours of readings               │
│  GET /api/recent   → last 5 readings                        │
│  GET /api/stats    → daily session averages                 │
│  GET /test         → simulate reading (no hardware needed)  │
│  GET /reset        → clear all data                         │
│                                                             │
│  Database: JSON flat file, capped at 1000 readings          │
└─────────────────────────────────────────────────────────────┘
                              │
                    REST API (polling)
                              │
                              ▼
┌─────────────────────────────────────────────────────────────┐
│                     DASHBOARD LAYER                         │
│                                                             │
│  Vanilla JS + Chart.js                                      │
│                                                             │
│  /api/live     polled every  5 sec → live cards             │
│  /api/history  polled every 15 sec → line graph             │
│  /api/recent   polled every 15 sec → last 5 table           │
│  /api/stats    polled every 30 sec → session history        │
│                                                             │
│  Graph plots: CO (PPM), AQI, HC (PPM), Temperature (°C)    │
└─────────────────────────────────────────────────────────────┘
```

---

## Data Flow — Single Reading

```
1. MPU6050 detects vibration > 0.3g  →  vehicle running
2. ESP32 reads MQ-7, MQ-135, DHT22, DS3231
3. Converts ADC values to PPM using calibration curves
4. Sends HTTP POST to /data with JSON payload
5. Server runs processReading():
     - CO status   : PASS if < 3000 PPM (BS6)
     - HC status   : PASS if < 100 PPM  (BS6)
     - AQI status  : PASS if < 200      (CPCB)
     - Grade       : A / B / C / F
     - Emission    : SAFE / WARNING / DANGER
     - Derived     : CO2, NH3, lambda, heat index, benzene risk
6. saveReading() stores with ISO 8601 timestamp
7. Dashboard polls /api/live → updates cards in real time
8. Dashboard polls /api/history → updates Chart.js graph
```

---

## Emission Processing Logic

```
Input: co_ppm, aqi, hc_ppm, temperature, humidity, vibration

CO Status:
  co_ppm < 3000  → PASS   (BS6 limit = 0.3% = 3000 PPM)
  co_ppm > 2000  → WARNING (early alert)
  co_ppm ≥ 3000  → FAIL

HC Status:
  hc_ppm < 100   → PASS   (BS6 4-wheeler limit)
  hc_ppm > 80    → WARNING
  hc_ppm ≥ 100   → FAIL

Emission Status:
  DANGER  if co > 3000 OR aqi > 300 OR hc > 100
  WARNING if co > 2000 OR aqi > 100 OR hc > 80
  SAFE    otherwise

Overall Grade:
  F  if co > 3000 OR hc > 100
  C  if co > 2000 OR hc > 80
  B  if co > 1000 OR hc > 50
  A  otherwise
```

---

## Technology Choices & Rationale

| Decision | Choice | Why |
|----------|--------|-----|
| Backend runtime | Node.js | Lightweight, async I/O, easy JSON handling |
| Database | JSON flat file | Zero setup, portable, sufficient for 1000 readings |
| Frontend charts | Chart.js | CDN-loaded, no build step, responsive |
| Timestamp format | ISO 8601 | Universally parseable by `new Date()` across all environments |
| Polling vs WebSocket | Polling | Simpler, no persistent connection needed at 5-sec intervals |
| Deployment | Railway.app | Free tier, auto-deploy on git push |
