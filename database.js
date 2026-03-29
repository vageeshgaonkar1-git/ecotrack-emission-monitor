const fs   = require('fs');
const path = require('path');

// Simple JSON file database
// Works everywhere, zero dependencies
const DB_FILE = path.join(__dirname, 'data.json');

// Initialize database file
function initDB() {
  if (!fs.existsSync(DB_FILE)) {
    fs.writeFileSync(DB_FILE, JSON.stringify({ readings: [] }));
  }
}

function readDB() {
  initDB();
  return JSON.parse(fs.readFileSync(DB_FILE, 'utf8'));
}

function writeDB(data) {
  fs.writeFileSync(DB_FILE, JSON.stringify(data, null, 2));
}

// Save one reading
function saveReading(data) {
  const db = readDB();
  const reading = {
    id: Date.now(),
    timestamp: new Date().toISOString(),
    ...data
  };
  db.readings.push(reading);

  // Keep only last 1000 readings to prevent file getting too large
  if (db.readings.length > 1000) {
    db.readings = db.readings.slice(-1000);
  }

  writeDB(db);
  return reading;
}

// Get latest single reading
function getLatestReading() {
  const db = readDB();
  if (!db.readings.length) return null;
  return db.readings[db.readings.length - 1];
}

// Get readings for last N hours
function getReadingsByHours(hours) {
  const db = readDB();
  const cutoff = new Date(Date.now() - hours * 60 * 60 * 1000);
  return db.readings.filter(r => new Date(r.timestamp) >= cutoff);
}

// Get daily session stats
function getSessionStats() {
  const db = readDB();
  const groups = {};

  db.readings.forEach(r => {
    const date = r.timestamp.split('T')[0];
    if (!groups[date]) {
      groups[date] = {
        date,
        co_vals: [], aqi_vals: [], hc_vals: [],
        grades: [], count: 0
      };
    }
    groups[date].co_vals.push(r.co_ppm   || 0);
    groups[date].aqi_vals.push(r.aqi     || 0);
    groups[date].hc_vals.push(r.hc_ppm   || 0);
    groups[date].grades.push(r.overall_grade || 'A');
    groups[date].count++;
  });

  return Object.values(groups)
    .map(g => ({
      date:           g.date,
      avg_co:         +(g.co_vals.reduce((a,b)=>a+b,0)/g.count).toFixed(2),
      avg_aqi:        +(g.aqi_vals.reduce((a,b)=>a+b,0)/g.count).toFixed(2),
      avg_hc:         +(g.hc_vals.reduce((a,b)=>a+b,0)/g.count).toFixed(2),
      overall_grade:  g.grades[g.grades.length - 1],
      total_readings: g.count
    }))
    .sort((a, b) => b.date.localeCompare(a.date))
    .slice(0, 10);
}

// Get danger alerts
function getDangerAlerts() {
  const db = readDB();
  return db.readings
    .filter(r => r.emission_status === 'DANGER')
    .slice(-10)
    .reverse();
}

// Get last 5 readings
function getLastFiveReadings() {
  const db = readDB();
  return db.readings.slice(-5).reverse();
}

module.exports = {
  saveReading,
  getLatestReading,
  getReadingsByHours,
  getSessionStats,
  getDangerAlerts,
  getLastFiveReadings
};