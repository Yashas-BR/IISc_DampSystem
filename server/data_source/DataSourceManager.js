import { EventEmitter } from 'events';
import SerialDataSource from './SerialDataSource.js';
import SimulationDataSource from './SimulationDataSource.js';
import WiFiDataSource from './WiFiDataSource.js';
import { saveTelemetry, saveAlert, getSettings } from '../db.js';

export class DataSourceManager extends EventEmitter {
  constructor() {
    super();
    this.mode = 'SIMULATION'; // 'LIVE' | 'SIMULATION' | 'CLOUD'
    this.settings = getSettings();

    this.serialSource = new SerialDataSource();
    this.simSource = new SimulationDataSource(this.settings);
    this.wifiSource = new WiFiDataSource();

    this.activeSource = null;
    this.lastData = null;

    this.setupListeners(this.serialSource);
    this.setupListeners(this.simSource);
    this.setupListeners(this.wifiSource);
  }

  setupListeners(source) {
    source.on('data', (data) => {
      // Accept data from:  the active source, OR the wifi source when mode is CLOUD
      if (source !== this.activeSource && !(this.mode === 'CLOUD' && source === this.wifiSource)) return;

      const riskScore = this.calculateRiskScore(data);
      const fullPayload = {
        ...data,
        riskScore,
        mode: this.mode
      };

      this.lastData = fullPayload;

      try {
        saveTelemetry(fullPayload, this.mode, riskScore);
      } catch (err) {
        console.error('Failed to save telemetry to DB:', err.message);
      }

      // Check thresholds and generate alerts
      this.evaluateAlerts(fullPayload);

      this.emit('telemetry', fullPayload);
    });

    source.on('status', (status) => {
      if (source !== this.activeSource && !(this.mode === 'CLOUD' && source === this.wifiSource)) return;
      this.emit('connection_status', {
        mode: this.mode,
        ...status
      });
    });

    source.on('alert', (alertData) => {
      if (source !== this.activeSource && !(this.mode === 'CLOUD' && source === this.wifiSource)) return;
      try {
        saveAlert(alertData.type, alertData.message, alertData.severity);
      } catch (e) {
        console.error('Failed to log alert to DB:', e.message);
      }
      this.emit('alert', alertData);
    });
  }

  // ─── Cloud / WiFi HTTP ingestion (called by POST /api/telemetry route) ──

  handleCloudTelemetry(payload, remoteIp) {
    // Auto-switch to CLOUD mode when the first wireless packet arrives
    if (this.mode !== 'CLOUD') {
      console.log('[DataSourceManager] Received wireless telemetry — auto-switching to CLOUD mode.');
      this.mode = 'CLOUD';
      // Stop simulation if it was running
      if (this.activeSource === this.simSource) {
        this.simSource.disconnect().catch(() => {});
      }
      this.activeSource = null;
    }

    // Delegate to WiFiDataSource (fires 'data' event → setupListeners picks it up)
    this.wifiSource.handleIncoming(payload, remoteIp);
  }

  // ─── Threshold alert evaluation ────────────────────────────────────────

  evaluateAlerts(data) {
    const hThresh = Number(this.settings.humidity_thresh || 60);
    const tThresh = Number(this.settings.temp_thresh || 30);
    const gThresh = Number(this.settings.gas_thresh || 700);
    const mThresh = Number(this.settings.moisture_thresh || 400);

    if (data.humidity > hThresh && data.temperature > tThresh) {
      const alert = {
        type: 'CLIMATE_CRITICAL',
        message: `Humidity ${data.humidity}% AND Temp ${data.temperature}°C both exceeded limits — Fan + LED triggered`,
        severity: 'CRITICAL',
        sensor: 'DHT11'
      };
      try { saveAlert(alert.type, alert.message, alert.severity); } catch (e) {}
      this.emit('alert', alert);
    }

    if (data.gas > gThresh) {
      const alert = {
        type: 'GAS_ALERT',
        message: `MQ135 Gas level ${data.gas} exceeded threshold ${gThresh} ADC`,
        severity: 'WARNING',
        sensor: 'MQ135'
      };
      try { saveAlert(alert.type, alert.message, alert.severity); } catch (e) {}
      this.emit('alert', alert);
    }

    if (data.moisture < mThresh) {
      const alert = {
        type: 'MOISTURE_ALERT',
        message: `Surface moisture ${data.moisture} ADC below damp threshold ${mThresh}`,
        severity: 'WARNING',
        sensor: 'Capacitive'
      };
      try { saveAlert(alert.type, alert.message, alert.severity); } catch (e) {}
      this.emit('alert', alert);
    }
  }

  // ─── Lifecycle ─────────────────────────────────────────────────────────

  async init() {
    console.log('Initializing DataSourceManager...');
    const serialSuccess = await this.serialSource.connect();
    if (serialSuccess) {
      console.log('Successfully auto-connected to Arduino Serial! Mode set to LIVE.');
      this.mode = 'LIVE';
      this.activeSource = this.serialSource;
    } else {
      console.log('No physical USB Serial connection ready on boot. Defaulting mode to SIMULATION.');
      this.mode = 'SIMULATION';
      this.activeSource = this.simSource;
      await this.simSource.connect();
    }
    return this.mode;
  }

  async setMode(newMode, portPath = null) {
    console.log(`Switching DataSourceManager mode to ${newMode}`);

    // Disconnect current active source
    if (this.activeSource) {
      await this.activeSource.disconnect();
    }
    // Also disconnect wifi source if switching away from CLOUD
    if (this.mode === 'CLOUD' && newMode !== 'CLOUD') {
      await this.wifiSource.disconnect();
    }

    this.mode = newMode;

    if (newMode === 'LIVE') {
      this.activeSource = this.serialSource;
      const connected = await this.serialSource.connect(portPath);
      if (!connected) {
        console.warn('Serial connection attempt returned false.');
      }
    } else if (newMode === 'CLOUD') {
      this.activeSource = null;           // WiFiDataSource is passive, not "active"
      await this.wifiSource.connect();
      console.log('Mode set to WIRELESS CLOUD (Listening on POST /api/telemetry)');
    } else {
      this.activeSource = this.simSource;
      await this.simSource.connect();
    }

    const status = this.getStatus();
    this.emit('mode_changed', status);
    return status;
  }

  updateSimulationValues(values) {
    if (this.simSource) {
      this.simSource.updateValues(values);
    }
  }

  updateSettings(newSettings) {
    this.settings = newSettings;
    if (this.simSource) {
      this.simSource.updateSettings(newSettings);
    }
  }

  calculateRiskScore(data) {
    let risk = 0;
    const h = Number(data.humidity || 0);
    const m = Number(data.moisture || 0);
    const g = Number(data.gas || 0);
    const t = Number(data.temperature || 0);

    risk += Math.min(100, h) * 0.35;
    if (m < 400) risk += ((400 - m) / 400) * 100 * 0.25;
    risk += Math.min(100, (g / 1023) * 100) * 0.25;
    risk += Math.min(100, (t / 50) * 100) * 0.15;

    return Math.round(Math.min(100, Math.max(0, risk)));
  }

  async sendCommand(commandObj) {
    // In CLOUD mode, delegate to WiFiDataSource (queues for ESP8266 to poll)
    if (this.mode === 'CLOUD') {
      return await this.wifiSource.sendCommand(commandObj);
    }
    if (this.activeSource) {
      return await this.activeSource.sendCommand(commandObj);
    }
    return false;
  }

  getStatus() {
    let activeSourceStatus;
    if (this.mode === 'CLOUD') {
      activeSourceStatus = this.wifiSource.getStatus();
    } else if (this.activeSource) {
      activeSourceStatus = this.activeSource.getStatus();
    } else {
      activeSourceStatus = { name: 'NONE', connected: false, port: null };
    }

    return {
      mode: this.mode,
      activeSourceStatus,
      lastData: this.lastData,
      settings: this.settings
    };
  }

  /**
   * getWiFiSource() — Exposes the WiFiDataSource instance so that
   * route handlers can call getPendingCommands() / clearPendingCommands().
   */
  getWiFiSource() {
    return this.wifiSource;
  }

  async getAvailablePorts() {
    return await this.serialSource.listAvailablePorts();
  }
}

export default DataSourceManager;
