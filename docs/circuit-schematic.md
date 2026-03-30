# EcoTrack — Circuit Schematic & Wiring Guide

## Block Diagram

```
┌──────────────┐     ┌──────────────┐     ┌──────────────┐
│   MQ-7       │     │   MQ-135     │     │   DHT22      │
│  (CO Sensor) │     │ (AQI/HC/CO2) │     │ (Temp/Humid) │
│  GPIO34 ADC  │     │  GPIO35 ADC  │     │   GPIO4      │
└──────┬───────┘     └──────┬───────┘     └──────┬───────┘
       │                    │                    │
       └────────────────────┴────────────────────┘
                            │
                     ┌──────▼───────┐     ┌──────────────┐
                     │    ESP32     │◄────│   MPU6050    │
                     │  Devkit V1   │     │ (Vibration)  │
                     │              │◄────│  I2C: 21,22  │
                     │              │     └──────────────┘
                     │              │     ┌──────────────┐
                     │              │◄────│   DS3231 RTC │
                     └──────┬───────┘     │  I2C: 21,22  │
                            │             └──────────────┘
                     ┌──────▼───────┐
                     │   WiFi HTTP  │
                     │   POST JSON  │
                     └──────┬───────┘
                            │
                     ┌──────▼───────┐
                     │  Node.js     │
                     │  Server      │
                     └──────┬───────┘
                            │
                     ┌──────▼───────┐
                     │  Web         │
                     │  Dashboard   │
                     └──────────────┘
```

---

## Power System

```
2× 18650 Li-ion cells (series)
         │
         │  7.4V nominal
         ▼
   ┌─────────────┐
   │  2S BMS     │  ← overcharge / overdischarge / short-circuit protection
   └──────┬──────┘
          │
          ▼
   ┌─────────────┐
   │ LM2596 Buck │  ← adjust trimmer to exactly 5.0V output
   └──────┬──────┘
          │
          ├──────────────────────────────────────────┐
          │  5V rail                                 │
          ▼                                          ▼
   ESP32 VIN pin                          MQ-7 VCC, MQ-135 VCC
   100μF capacitor across 5V/GND
```

---

## Complete Pin Map

| Component | Pin | ESP32 GPIO | Notes |
|-----------|-----|-----------|-------|
| MQ-7 | AO | GPIO34 | Via 1kΩ/2kΩ voltage divider |
| MQ-135 | AO | GPIO35 | Via 1kΩ/2kΩ voltage divider |
| DHT22 | DATA | GPIO4 | 10kΩ pullup to 3.3V |
| MPU6050 | SDA | GPIO21 | Shared I2C bus |
| MPU6050 | SCL | GPIO22 | Shared I2C bus |
| MPU6050 | INT | GPIO27 | Interrupt pin |
| DS3231 | SDA | GPIO21 | Shared I2C bus |
| DS3231 | SCL | GPIO22 | Shared I2C bus |
| Buzzer | (+) | GPIO25 | Active buzzer |
| Limit Switch | — | GPIO14 | Master power, pulled to GND |

---

## Voltage Divider (MQ Sensors)

MQ-7 and MQ-135 are powered by 5V but ESP32 ADC max is 3.3V.

```
MQ AO pin ──┬── 1kΩ ──── GPIO (ADC)
            │
           2kΩ
            │
           GND

Vout = 5V × 2kΩ/(1kΩ+2kΩ) = 3.33V  ✅ within ESP32 ADC range
```

---

## I2C Bus (Shared)

```
ESP32 GPIO21 (SDA) ──┬── MPU6050 SDA
                     └── DS3231 SDA

ESP32 GPIO22 (SCL) ──┬── MPU6050 SCL
                     └── DS3231 SCL

I2C Addresses:
  MPU6050 → 0x68
  DS3231  → 0x57
```

---

## Protection & Safety

| Risk | Mitigation |
|------|-----------|
| Exhaust heat (200–700°C) | 50cm silicone tube — gas cools before reaching sensors |
| Engine vibration | Hot glue on all connectors + foam padding inside enclosure |
| Rain / dust ingress | Sealed ABS enclosure, silicone-sealed cable entry holes |
| ADC overvoltage | Voltage divider on all 5V sensor outputs |
| Battery hazard | 2S BMS handles overcharge, overdischarge, short circuit |
| Voltage spikes | 100μF bulk capacitor on 5V rail |
