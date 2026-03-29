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
  const { co_ppm, aqi, hc_ppm, temperature, 
          humidity, vibration_level } = data;

  // ── PUC Status ──
  const co_status  = co_ppm  < 4000 ? 'PASS' : 'FAIL';
  const hc_status  = hc_ppm  < 150  ? 'PASS' : 'FAIL';
  const aqi_status = aqi     < 200  ? 'PASS' : 'FAIL';

  // ── Emission Status ──
  let emission_status = 'SAFE';
  if (co_ppm > 5000 || aqi > 300 || hc_ppm > 200)
    emission_status = 'DANGER';
  else if (co_ppm > 3000 || aqi > 150 || hc_ppm > 120)
    emission_status = 'WARNING';

  // ── Overall Grade ──
  let overall_grade = 'A';
  if      (co_ppm > 5000 || hc_ppm > 200) overall_grade = 'F';
  else if (co_ppm > 3000 || hc_ppm > 150) overall_grade = 'C';
  else if (co_ppm > 1000 || hc_ppm > 100) overall_grade = 'B';

  // ── Additional Parameters ──

  // CO2 estimate from MQ-135 (approximate)
  const co2_ppm = Math.round(400 + (aqi * 2.1));

  // NH3 estimate from MQ-135
  const nh3_ppm = parseFloat((aqi * 0.08).toFixed(1));

  // Benzene flag
  const benzene_risk = aqi > 200 ? 'ELEVATED' : 'NORMAL';

  // Engine load from vibration
  let engine_load = 'IDLE';
  if      (vibration_level > 1.5) engine_load = 'HIGH';
  else if (vibration_level > 0.8) engine_load = 'MEDIUM';
  else if (vibration_level > 0.3) engine_load = 'LOW';

  // Heat index (Steadman formula simplified)
  const heat_index = parseFloat(
    (temperature + 0.33 * (humidity / 100 * 6.105 *
    Math.exp(17.27 * temperature / (237.7 + temperature))) - 4)
    .toFixed(1)
  );

  // Lambda (air-fuel ratio indicator)
  // Estimated from CO and HC levels
  const lambda = parseFloat(
    (1.0 - (co_ppm / 50000) - (hc_ppm / 10000)).toFixed(3)
  );
  const lambda_status = lambda > 0.97 && lambda < 1.03
    ? 'OPTIMAL' : lambda < 0.97 ? 'RICH' : 'LEAN';

  return {
    co_status, hc_status, aqi_status,
    emission_status, overall_grade,
    co2_ppm, nh3_ppm, benzene_risk,
    engine_load, heat_index,
    lambda, lambda_status
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

    const processed = processReading(incoming);
    db.saveReading({ ...incoming, ...processed });

    console.log(`[${new Date().toLocaleTimeString()}] CO:${incoming.co_ppm} AQI:${incoming.aqi} Status:${processed.emission_status} Grade:${processed.overall_grade}`);

    res.json({ success: true, ...processed });

  } catch (err) {
    console.error('POST /data error:', err.message);
    res.status(500).json({
      success: false,
      error: err.message
    });
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

app.get('/reset', (req, res) => {
  const fs = require('fs');
  fs.writeFileSync('data.json', JSON.stringify({ readings: [] }));
  console.log('Database reset!');
  res.json({ success: true, message: 'All data cleared' });
});

  const emission_status = getEmissionStatus(
    testData.co_ppm, testData.aqi, testData.hc_ppm
  );

  db.saveReading({
    ...testData,
    emission_status,
    co_status:  testData.co_ppm < 4000 ? 'PASS' : 'FAIL',
    hc_status:  testData.hc_ppm < 150  ? 'PASS' : 'FAIL',
    overall_grade: getGrade(testData.co_ppm, testData.aqi, testData.hc_ppm)
  });

  res.json({ success: true, data: testData, status: emission_status });
});

app.listen(PORT, () => {
  console.log(`\n🚗 EcoTrack Server Running!`);
  console.log(`📡 Dashboard  → http://localhost:${PORT}`);
  console.log(`🔌 ESP32 POST → http://localhost:${PORT}/data`);
  console.log(`🧪 Test mode  → http://localhost:${PORT}/test\n`);
});