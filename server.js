const express = require('express');
const cors = require('cors');
const path = require('path');
const db = require('./database');

const app = express();
app.use(express.json());
app.use(cors());
app.use(express.static(path.join(__dirname, 'dashboard')));

const PORT = 3000;

// ── Helpers ──────────────────────────────

// ── Enhanced Emission Processing ─────────

function processReading(data) {
  const co_ppm    = parseFloat(data.co_ppm)       || 0;
  const aqi       = parseFloat(data.aqi)          || 0;
  const hc_ppm    = parseFloat(data.hc_ppm)       || 0;
  const temp      = parseFloat(data.temperature)  || 0;
  const humidity  = parseFloat(data.humidity)     || 0;
  const vibration = parseFloat(data.vibration_level) || 0;

  // ── Verified Indian BS6 PUC Standards ──

  // CO: BS6 limit = 0.3% = 3000 PPM
  const co_status = co_ppm < 3000 ? 'PASS' : 'FAIL';
  const co_warn   = co_ppm > 2000; // Early warning

  // HC: BS6 limit = 100 PPM (4-wheeler) / 200 PPM (2-wheeler)
  // Using 100 PPM as conservative limit
  const hc_status = hc_ppm < 100 ? 'PASS' : 'FAIL';
  const hc_warn   = hc_ppm > 80;  // Early warning

  // AQI: CPCB India standard
  // 0-100 = Safe, 101-200 = Moderate, 201+ = Poor
  const aqi_status = aqi < 200 ? 'PASS' : 'FAIL';

  // ── Emission Status (3 levels) ──
  let emission_status = 'SAFE';

  if (co_ppm > 3000 || aqi > 300 || hc_ppm > 100) {
    emission_status = 'DANGER';
  } else if (co_ppm > 2000 || aqi > 100 || hc_ppm > 80) {
    emission_status = 'WARNING';
  }

  // ── Overall Grade (based on BS6) ──
  let overall_grade = 'A';
  if      (co_ppm > 3000 || hc_ppm > 100) overall_grade = 'F';
  else if (co_ppm > 2000 || hc_ppm > 80)  overall_grade = 'C';
  else if (co_ppm > 1000 || hc_ppm > 50)  overall_grade = 'B';
  // else A

  // ── Additional Parameters ──
  const co2_ppm      = Math.round(400 + (aqi * 2.1));
  const nh3_ppm      = parseFloat((aqi * 0.08).toFixed(1));
  const benzene_risk = aqi > 200 ? 'ELEVATED' : 'NORMAL';

  // Engine load via vibration
  let engine_load = 'IDLE';
  if      (vibration > 1.5) engine_load = 'HIGH';
  else if (vibration > 0.8) engine_load = 'MEDIUM';
  else if (vibration > 0.3) engine_load = 'LOW';

  // Heat index
  let heat_index = temp;
  try {
    heat_index = parseFloat(
      (temp + 0.33 * (humidity / 100 * 6.105 *
      Math.exp(17.27 * temp / (237.7 + temp))) - 4)
      .toFixed(1)
    );
  } catch(e) { heat_index = temp; }

  // Lambda (Air-Fuel Ratio indicator)
  let lambda = 1.0;
  let lambda_status = 'OPTIMAL';
  try {
    lambda = parseFloat(
      (1.0 - (co_ppm/50000) - (hc_ppm/10000)).toFixed(3)
    );
    lambda_status = lambda > 0.97 && lambda < 1.03
      ? 'OPTIMAL' : lambda < 0.97 ? 'RICH' : 'LEAN';
  } catch(e) {
    lambda = 1.0;
    lambda_status = 'OPTIMAL';
  }

  return {
    co_status, hc_status, aqi_status,
    emission_status, overall_grade,
    co2_ppm, nh3_ppm, benzene_risk,
    engine_load, heat_index,
    lambda, lambda_status,
    co_warn, hc_warn
  };
}

// ── Routes ───────────────────────────────

// ESP32 posts data here
app.post('/data', (req, res) => {
  try {
    const incoming = req.body;

    if (!incoming || !incoming.co_ppm) {
      return res.status(400).json({
        success: false,
        error: 'Missing sensor data'
      });
    }

    // ← ADD THIS LINE
    incoming.timestamp = new Date().toLocaleString('en-IN', {
      timeZone: 'Asia/Kolkata'
    });

    const processed = processReading(incoming);
    db.saveReading({ ...incoming, ...processed });

    console.log(`[${incoming.timestamp}] CO:${incoming.co_ppm} AQI:${incoming.aqi} Status:${processed.emission_status}`);
    res.json({ success: true, ...processed });

  } catch (err) {
    console.error('POST /data error:', err.message);
    res.status(500).json({ success: false, error: err.message });
  }
});

// Live reading for dashboard
app.get('/api/live', (req, res) => {
  const reading = db.getLatestReading();
  res.json(reading || {});
});

// History for graphs
app.get('/api/history', (req, res) => {
  const hours = req.query.hours || 1;
  const readings = db.getReadingsByHours(hours);
  res.json(readings);
});

// Last 5 readings
app.get('/api/recent', (req, res) => {
  const recent = db.getLastFiveReadings();
  res.json(recent);
});

// Session stats
app.get('/api/stats', (req, res) => {
  const stats = db.getSessionStats();
  res.json(stats);
});

// Danger alerts
app.get('/api/alerts', (req, res) => {
  const alerts = db.getDangerAlerts();
  res.json(alerts);
});

// Test route — simulate a reading without ESP32
app.get('/test', (req, res) => {
  const testData = {
    co_ppm: Math.random() * 2000,
    aqi: Math.random() * 200,
    hc_ppm: Math.random() * 130,
    temperature: 28 + Math.random() * 10,
    humidity: 60 + Math.random() * 20,
    vehicle_status: 'RUNNING',
    vibration_level: 0.8 + Math.random()
  };

  testData.timestamp = new Date().toLocaleString('en-IN', {
    timeZone: 'Asia/Kolkata'
  });

  const processed = processReading(testData);
  db.saveReading({ ...testData, ...processed });

  console.log(`[Test] CO:${testData.co_ppm} AQI:${testData.aqi} Status:${processed.emission_status}`);
  res.json({ success: true, ...processed });
});

// Reset database
app.get('/reset', (req, res) => {
  const fs = require('fs');
  const dbPath = require('path').join(__dirname, 'data.json');
  fs.writeFileSync(dbPath, JSON.stringify({ readings: [] }));
  console.log('Database reset!');
  res.json({ success: true, message: 'All data cleared' });
});

app.listen(PORT, () => {
  console.log(`\n🚗 EcoTrack Server Running!`);
  console.log(`📡 Dashboard  → http://localhost:${PORT}`);
  console.log(`🔌 ESP32 POST → http://localhost:${PORT}/data`);
  console.log(`🧪 Test mode  → http://localhost:${PORT}/test\n`);
});