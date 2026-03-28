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

function getEmissionStatus(co, aqi, hc) {
  if (co > 5000 || aqi > 300 || hc > 200) return 'DANGER';
  if (co > 3000 || aqi > 150 || hc > 120) return 'WARNING';
  return 'SAFE';
}

function getGrade(co, aqi, hc) {
  if (co > 5000 || hc > 200) return 'F';
  if (co > 3000 || hc > 150) return 'C';
  if (co > 1000 || hc > 100) return 'B';
  return 'A';
}

// ── Routes ───────────────────────────────

// ESP32 posts data here
app.post('/data', (req, res) => {
  try {
    const {
      co_ppm = 0, aqi = 0, hc_ppm = 0,
      temperature = 0, humidity = 0,
      vehicle_status = 'UNKNOWN',
      vibration_level = 0
    } = req.body;

    const emission_status = getEmissionStatus(co_ppm, aqi, hc_ppm);
    const co_status  = co_ppm < 4000  ? 'PASS' : 'FAIL';
    const hc_status  = hc_ppm < 150   ? 'PASS' : 'FAIL';
    const overall_grade = getGrade(co_ppm, aqi, hc_ppm);

    db.saveReading({
      co_ppm, aqi, hc_ppm,
      temperature, humidity,
      vehicle_status, vibration_level,
      emission_status, co_status,
      hc_status, overall_grade
    });

    console.log(`[${new Date().toLocaleTimeString()}] Reading saved | CO:${co_ppm} AQI:${aqi} Status:${emission_status}`);
    res.json({ success: true, status: emission_status });

  } catch (err) {
    console.error('Error saving reading:', err);
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