import initSqlJs from 'sql.js';
import fs from 'fs';
import path from 'path';
import { fileURLToPath } from 'url';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

const dbPath = path.join(__dirname, 'database.sqlite');
let db = null;

function saveDatabaseToFile() {
  if (!db) return;
  try {
    const data = db.export();
    const buffer = Buffer.from(data);
    fs.writeFileSync(dbPath, buffer);
  } catch (err) {
    console.error('Failed to save database file:', err.message);
  }
}

// Initialize database schema
export async function initDB() {
  const SQL = await initSqlJs();

  if (fs.existsSync(dbPath)) {
    try {
      const fileBuffer = fs.readFileSync(dbPath);
      db = new SQL.Database(fileBuffer);
    } catch (e) {
      console.warn('Could not read existing SQLite DB file, creating new database.');
      db = new SQL.Database();
    }
  } else {
    db = new SQL.Database();
  }

  db.run(`
    CREATE TABLE IF NOT EXISTS telemetry (
      id INTEGER PRIMARY KEY AUTOINCREMENT,
      timestamp DATETIME DEFAULT CURRENT_TIMESTAMP,
      temperature REAL,
      humidity INTEGER,
      light INTEGER,
      gas INTEGER,
      moisture INTEGER,
      fan INTEGER,
      led INTEGER,
      status TEXT,
      risk_score INTEGER,
      mode TEXT
    );

    CREATE TABLE IF NOT EXISTS alerts (
      id INTEGER PRIMARY KEY AUTOINCREMENT,
      timestamp DATETIME DEFAULT CURRENT_TIMESTAMP,
      type TEXT,
      message TEXT,
      severity TEXT,
      acknowledged INTEGER DEFAULT 0
    );

    CREATE TABLE IF NOT EXISTS settings (
      key TEXT PRIMARY KEY,
      value TEXT
    );

    CREATE TABLE IF NOT EXISTS actuator_logs (
      id INTEGER PRIMARY KEY AUTOINCREMENT,
      timestamp DATETIME DEFAULT CURRENT_TIMESTAMP,
      actuator TEXT,
      state INTEGER,
      reason TEXT
    );
  `);

  // Insert default settings if empty
  const defaultSettings = [
    { key: 'humidity_thresh', value: '60' },
    { key: 'temp_thresh', value: '30' },
    { key: 'gas_thresh', value: '700' },
    { key: 'moisture_thresh', value: '400' },
    { key: 'light_thresh', value: '500' },
    { key: 'auto_actuators', value: 'true' }
  ];

  for (const s of defaultSettings) {
    const res = db.exec(`SELECT COUNT(*) as count FROM settings WHERE key = '${s.key}'`);
    const count = res.length > 0 ? res[0].values[0][0] : 0;
    if (count === 0) {
      db.run('INSERT INTO settings (key, value) VALUES (?, ?)', [s.key, s.value]);
    }
  }

  saveDatabaseToFile();

  // Save to disk periodically every 10 seconds
  setInterval(saveDatabaseToFile, 10000);
}

// Telemetry Helpers
export function saveTelemetry(data, mode, riskScore) {
  if (!db) return;
  const stmt = db.prepare(`
    INSERT INTO telemetry (temperature, humidity, light, gas, moisture, fan, led, status, risk_score, mode)
    VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?)
  `);
  stmt.run([
    data.temperature,
    data.humidity,
    data.light,
    data.gas,
    data.moisture,
    data.fan ? 1 : 0,
    data.led ? 1 : 0,
    data.status || 'NORMAL',
    riskScore || 0,
    mode || 'SIMULATION'
  ]);
  stmt.free();
}

export function getLatestTelemetry(limit = 100) {
  if (!db) return [];
  const res = db.exec(`SELECT * FROM telemetry ORDER BY id DESC LIMIT ${limit}`);
  if (res.length === 0) return [];
  const columns = res[0].columns;
  const rows = res[0].values;

  const results = rows.map(row => {
    const obj = {};
    columns.forEach((col, idx) => {
      obj[col] = row[idx];
    });
    return obj;
  });

  return results.reverse();
}

export function getAnalyticsData() {
  if (!db) {
    return {
      stats: { avgTemp: 0, maxTemp: 0, avgHumidity: 0, maxHumidity: 0, avgGas: 0, maxGas: 0, avgMoisture: 0, minMoisture: 0 },
      totalAlerts: 0,
      fanRuntimeSeconds: 0,
      uptimeSeconds: Math.floor(process.uptime())
    };
  }

  const statsRes = db.exec(`
    SELECT 
      AVG(temperature) as avgTemp,
      MAX(temperature) as maxTemp,
      AVG(humidity) as avgHumidity,
      MAX(humidity) as maxHumidity,
      AVG(gas) as avgGas,
      MAX(gas) as maxGas,
      AVG(moisture) as avgMoisture,
      MIN(moisture) as minMoisture,
      COUNT(*) as totalRecords
    FROM telemetry
  `);

  let stats = { avgTemp: 24.5, maxTemp: 32, avgHumidity: 52, maxHumidity: 78, avgGas: 350, maxGas: 850, avgMoisture: 720, minMoisture: 250 };

  if (statsRes.length > 0 && statsRes[0].values.length > 0) {
    const vals = statsRes[0].values[0];
    stats = {
      avgTemp: vals[0] || 24.5,
      maxTemp: vals[1] || 32,
      avgHumidity: vals[2] || 52,
      maxHumidity: vals[3] || 78,
      avgGas: vals[4] || 350,
      maxGas: vals[5] || 850,
      avgMoisture: vals[6] || 720,
      minMoisture: vals[7] || 250
    };
  }

  const alertRes = db.exec('SELECT COUNT(*) as totalAlerts FROM alerts');
  const alertCount = alertRes.length > 0 ? alertRes[0].values[0][0] : 0;

  const fanRes = db.exec('SELECT COUNT(*) as count FROM telemetry WHERE fan = 1');
  const fanCount = fanRes.length > 0 ? fanRes[0].values[0][0] : 0;

  return {
    stats,
    totalAlerts: alertCount,
    fanRuntimeSeconds: fanCount * 2,
    uptimeSeconds: Math.floor(process.uptime())
  };
}

// Alerts Helpers
export function saveAlert(type, message, severity = 'WARNING') {
  if (!db) return;
  db.run('INSERT INTO alerts (type, message, severity) VALUES (?, ?, ?)', [type, message, severity]);
  saveDatabaseToFile();
}

export function getAlerts(limit = 50) {
  if (!db) return [];
  const res = db.exec(`SELECT * FROM alerts ORDER BY id DESC LIMIT ${limit}`);
  if (res.length === 0) return [];
  const columns = res[0].columns;
  return res[0].values.map(row => {
    const obj = {};
    columns.forEach((col, idx) => {
      obj[col] = row[idx];
    });
    return obj;
  });
}

export function acknowledgeAlert(id) {
  if (!db) return;
  db.run(`UPDATE alerts SET acknowledged = 1 WHERE id = ${id}`);
  saveDatabaseToFile();
}

export function clearAlerts() {
  if (!db) return;
  db.run('DELETE FROM alerts');
  saveDatabaseToFile();
}

// Settings Helpers
export function getSettings() {
  const defaults = {
    humidity_thresh: '60',
    temp_thresh: '30',
    gas_thresh: '700',
    moisture_thresh: '400',
    light_thresh: '500',
    auto_actuators: 'true'
  };
  if (!db) return defaults;

  const res = db.exec('SELECT * FROM settings');
  if (res.length === 0) return defaults;

  const settingsObj = { ...defaults };
  for (const row of res[0].values) {
    settingsObj[row[0]] = row[1];
  }
  return settingsObj;
}

export function updateSettings(newSettings) {
  if (!db) return newSettings;
  for (const [k, v] of Object.entries(newSettings)) {
    db.run('INSERT OR REPLACE INTO settings (key, value) VALUES (?, ?)', [k, String(v)]);
  }
  saveDatabaseToFile();
  return getSettings();
}

export default db;
