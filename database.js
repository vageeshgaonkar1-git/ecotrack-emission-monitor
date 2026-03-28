const Database = require('better-sqlite3');
const db = new Database('ecotrack.db');

// Create tables
db.exec(`
  CREATE TABLE IF NOT EXISTS readings (
    id INTEGER PRIMARY KEY AUTOINCREMENT,
    timestamp DATETIME DEFAULT CURRENT_TIMESTAMP,
    co_ppm REAL,
    aqi REAL,
    hc_ppm REAL,
    temperature REAL,
    humidity REAL,
    vehicle_status TEXT,
    vibration_level REAL,
    emission_status TEXT,
    co_status TEXT,
    hc_status TEXT,
    overall_grade TEXT
  );
`);

// Save one reading
function saveReading(data) {
  const stmt = db.prepare(`
    INSERT INTO readings 
    (co_ppm, aqi, hc_ppm, temperature, humidity,
     vehicle_status, vibration_level, emission_status,
     co_status, hc_status, overall_grade)
    VALUES 
    (@co_ppm, @aqi, @hc_ppm, @temperature, @humidity,
     @vehicle_status, @vibration_level, @emission_status,
     @co_status, @hc_status, @overall_grade)
  `);
  stmt.run(data);
}

// Get latest reading
function getLatestReading() {
  return db.prepare(`
    SELECT * FROM readings 
    ORDER BY timestamp DESC 
    LIMIT 1
  `).get();
}

// Get readings for last N hours
function getReadingsByHours(hours) {
  return db.prepare(`
    SELECT * FROM readings
    WHERE timestamp >= datetime('now', '-${hours} hours')
    ORDER BY timestamp ASC
  `).all();
}

// Get daily averages
function getSessionStats() {
  return db.prepare(`
    SELECT 
      DATE(timestamp) as date,
      ROUND(AVG(co_ppm), 2) as avg_co,
      ROUND(AVG(aqi), 2) as avg_aqi,
      ROUND(AVG(hc_ppm), 2) as avg_hc,
      overall_grade,
      COUNT(*) as total_readings
    FROM readings
    GROUP BY DATE(timestamp)
    ORDER BY date DESC
    LIMIT 10
  `).all();
}

// Get danger alerts
function getDangerAlerts() {
  return db.prepare(`
    SELECT * FROM readings
    WHERE emission_status = 'DANGER'
    ORDER BY timestamp DESC
    LIMIT 10
  `).all();
}

module.exports = {
  saveReading,
  getLatestReading,
  getReadingsByHours,
  getSessionStats,
  getDangerAlerts
};