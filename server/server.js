import express from 'express';
import http from 'http';
import { Server } from 'socket.io';
import cors from 'cors';
import { jsPDF } from 'jspdf';
import 'jspdf-autotable';

import {
  initDB,
  getLatestTelemetry,
  getAnalyticsData,
  getAlerts,
  acknowledgeAlert,
  clearAlerts,
  getSettings,
  updateSettings
} from './db.js';

import DataSourceManager from './data_source/DataSourceManager.js';

const app = express();
app.use(cors());
app.use(express.json());

const server = http.createServer(app);
const io = new Server(server, {
  cors: {
    origin: '*',
    methods: ['GET', 'POST']
  }
});

let dsManager = null;

// Handshake & Broadcast Setup
io.on('connection', (socket) => {
  console.log(`Client connected: ${socket.id}`);

  if (dsManager) {
    socket.emit('system_init', {
      status: dsManager.getStatus(),
      settings: getSettings(),
      alerts: getAlerts(20),
      telemetryHistory: getLatestTelemetry(50)
    });
  }

  socket.on('disconnect', () => {
    console.log(`Client disconnected: ${socket.id}`);
  });
});

// --- REST API Endpoints ---

app.get('/api/status', async (req, res) => {
  try {
    if (!dsManager) return res.status(503).json({ error: 'System initializing' });
    const status = dsManager.getStatus();
    const ports = await dsManager.getAvailablePorts();
    res.json({
      ...status,
      availablePorts: ports
    });
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

app.get('/api/ports', async (req, res) => {
  try {
    if (!dsManager) return res.json([]);
    const ports = await dsManager.getAvailablePorts();
    res.json(ports);
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

app.post('/api/mode', async (req, res) => {
  const { mode, portPath } = req.body;
  try {
    if (!dsManager) return res.status(503).json({ error: 'System initializing' });
    const newStatus = await dsManager.setMode(mode, portPath);
    res.json(newStatus);
  } catch (err) {
    res.status(400).json({ error: err.message });
  }
});

app.post('/api/simulate', (req, res) => {
  try {
    if (dsManager) dsManager.updateSimulationValues(req.body);
    res.json({ success: true, updated: req.body });
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

app.get('/api/settings', (req, res) => {
  res.json(getSettings());
});

app.post('/api/settings', (req, res) => {
  try {
    const updated = updateSettings(req.body);
    if (dsManager) dsManager.updateSettings(updated);
    io.emit('settings_updated', updated);
    res.json(updated);
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

app.post('/api/settings/reset', (req, res) => {
  const defaults = {
    humidity_thresh: '60',
    temp_thresh: '30',
    gas_thresh: '700',
    moisture_thresh: '400',
    light_thresh: '500',
    auto_actuators: 'true'
  };
  try {
    const updated = updateSettings(defaults);
    if (dsManager) dsManager.updateSettings(updated);
    io.emit('settings_updated', updated);
    res.json(updated);
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

app.get('/api/telemetry/recent', (req, res) => {
  const limit = parseInt(req.query.limit) || 100;
  res.json(getLatestTelemetry(limit));
});

app.get('/api/analytics', (req, res) => {
  try {
    const analytics = getAnalyticsData();
    res.json(analytics);
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

app.get('/api/alerts', (req, res) => {
  const limit = parseInt(req.query.limit) || 50;
  res.json(getAlerts(limit));
});

app.post('/api/alerts/ack/:id', (req, res) => {
  try {
    acknowledgeAlert(req.params.id);
    res.json({ success: true, id: req.params.id });
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

app.delete('/api/alerts', (req, res) => {
  try {
    clearAlerts();
    res.json({ success: true });
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

app.post('/api/command', async (req, res) => {
  try {
    const success = dsManager ? await dsManager.sendCommand(req.body) : false;
    res.json({ success });
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

// CSV Report
app.get('/api/reports/csv', (req, res) => {
  try {
    const data = getLatestTelemetry(500);
    let csv = 'Timestamp,Temperature (°C),Humidity (%),Light (0-1023),Gas (0-1023),Moisture (0-1023),Fan,LED,Status,Risk Score,Mode\n';

    data.forEach(row => {
      csv += `"${row.timestamp}",${row.temperature},${row.humidity},${row.light},${row.gas},${row.moisture},${row.fan ? 'ON' : 'OFF'},${row.led ? 'ON' : 'OFF'},"${row.status}",${row.risk_score},"${row.mode}"\n`;
    });

    res.setHeader('Content-Type', 'text/csv');
    res.setHeader('Content-Disposition', 'attachment; filename="IoT_Smart_Mold_Telemetry_Report.csv"');
    res.status(200).send(csv);
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

// PDF Report
app.get('/api/reports/pdf', (req, res) => {
  try {
    const doc = new jsPDF();
    const data = getLatestTelemetry(30);
    const analytics = getAnalyticsData();
    const settings = getSettings();

    doc.setFillColor(15, 23, 42);
    doc.rect(0, 0, 210, 30, 'F');
    doc.setTextColor(255, 255, 255);
    doc.setFontSize(16);
    doc.text('Smart Damp & Mold Prevention System', 14, 15);
    doc.setFontSize(10);
    doc.text('Telemetry & Compliance Report | Generated: ' + new Date().toLocaleString(), 14, 23);

    doc.setTextColor(30, 41, 59);
    doc.setFontSize(12);
    doc.text('System Analytics Summary', 14, 40);

    doc.setFontSize(9);
    const avgT = analytics.stats.avgTemp ? analytics.stats.avgTemp.toFixed(1) : 'N/A';
    const avgH = analytics.stats.avgHumidity ? analytics.stats.avgHumidity.toFixed(1) : 'N/A';
    const maxT = analytics.stats.maxTemp || 'N/A';
    const maxH = analytics.stats.maxHumidity || 'N/A';
    const totalA = analytics.totalAlerts;
    const uptimeM = Math.floor(analytics.uptimeSeconds / 60);

    doc.text(`Avg Temp: ${avgT} °C | Max Temp: ${maxT} °C`, 14, 48);
    doc.text(`Avg Humidity: ${avgH} % | Max Humidity: ${maxH} %`, 14, 54);
    doc.text(`Total System Alerts: ${totalA} | Uptime: ${uptimeM} minutes`, 14, 60);
    doc.text(`Active Thresholds: Humidity > ${settings.humidity_thresh}%, Temp > ${settings.temp_thresh}°C, Gas > ${settings.gas_thresh}`, 14, 66);

    const tableRows = data.map(r => [
      new Date(r.timestamp).toLocaleTimeString(),
      `${r.temperature}°C`,
      `${r.humidity}%`,
      r.gas,
      r.moisture,
      r.fan ? 'RUNNING' : 'STOPPED',
      r.led ? 'ON' : 'OFF',
      r.status,
      `${r.risk_score}%`
    ]);

    doc.autoTable({
      startY: 75,
      head: [['Time', 'Temp', 'Humidity', 'Gas', 'Moisture', 'Fan', 'LED', 'Status', 'Risk']],
      body: tableRows,
      theme: 'grid',
      headStyles: { fillColor: [16, 185, 129] },
      styles: { fontSize: 8 }
    });

    const pdfOutput = doc.output('arraybuffer');
    res.setHeader('Content-Type', 'application/pdf');
    res.setHeader('Content-Disposition', 'attachment; filename="IoT_Smart_Mold_Report.pdf"');
    res.send(Buffer.from(pdfOutput));
  } catch (err) {
    console.error('PDF Generation Error:', err);
    res.status(500).json({ error: err.message });
  }
});

const PORT = process.env.PORT || 3001;

server.listen(PORT, async () => {
  console.log(`Server running on port ${PORT}`);
  await initDB();
  dsManager = new DataSourceManager();

  dsManager.on('telemetry', (data) => io.emit('telemetry_update', data));
  dsManager.on('connection_status', (status) => io.emit('connection_status', status));
  dsManager.on('alert', (alertData) => io.emit('alert_triggered', alertData));
  dsManager.on('mode_changed', (status) => io.emit('mode_changed', status));

  await dsManager.init();
});
