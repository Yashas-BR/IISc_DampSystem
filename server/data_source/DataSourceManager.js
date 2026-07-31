import { EventEmitter } from 'events';
import SerialDataSource from './SerialDataSource.js';
import SimulationDataSource from './SimulationDataSource.js';
import { saveTelemetry, saveAlert, getSettings } from '../db.js';

export class DataSourceManager extends EventEmitter {
  constructor() {
    super();
    this.mode = 'SIMULATION'; // Default mode ('LIVE' | 'SIMULATION' | 'CLOUD')
    this.settings = getSettings();
    
    this.serialSource = new SerialDataSource();
    this.simSource = new SimulationDataSource(this.settings);
    
    this.activeSource = null;
    this.lastData = null;

    this.setupListeners(this.serialSource);
    this.setupListeners(this.simSource);
  }

  setupListeners(source) {
    source.on('data', (data) => {
      if (source !== this.activeSource && this.mode !== 'CLOUD') return;

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

      this.emit('telemetry', fullPayload);
    });

    source.on('status', (status) => {
      if (source !== this.activeSource && this.mode !== 'CLOUD') return;
      this.emit('connection_status', {
        mode: this.mode,
        ...status
      });
    });

    source.on('alert', (alertData) => {
      if (source !== this.activeSource && this.mode !== 'CLOUD') return;
      try {
        saveAlert(alertData.type, alertData.message, alertData.severity);
      } catch (e) {
        console.error('Failed to log alert to DB:', e.message);
      }
      this.emit('alert', alertData);
    });
  }

  // Support direct Cloud HTTP / Wireless Wi-Fi Ingestion from battery-powered Arduino/ESP32
  handleCloudTelemetry(data) {
    const parsedData = {
      temperature: Number(data.temperature ?? 25.0),
      humidity: Number(data.humidity ?? 50),
      light: Number(data.light ?? 500),
      gas: Number(data.gas ?? 400),
      moisture: Number(data.moisture ?? 600),
      fan: Boolean(data.fan),
      led: Boolean(data.led),
      status: data.status || 'NORMAL',
      timestamp: new Date().toISOString()
    };

    const riskScore = this.calculateRiskScore(parsedData);
    const fullPayload = {
      ...parsedData,
      riskScore,
      mode: 'CLOUD'
    };

    this.mode = 'CLOUD';
    this.lastData = fullPayload;

    try {
      saveTelemetry(fullPayload, 'CLOUD', riskScore);
    } catch (err) {
      console.error('Failed to save cloud telemetry to DB:', err.message);
    }

    this.emit('telemetry', fullPayload);
    this.emit('connection_status', {
      connected: true,
      port: 'WIRELESS_CLOUD_WIFI',
      mode: 'CLOUD',
      message: 'Receiving Wireless Cloud Telemetry over Wi-Fi'
    });
  }

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

    if (this.activeSource) {
      await this.activeSource.disconnect();
    }

    this.mode = newMode;

    if (newMode === 'LIVE') {
      this.activeSource = this.serialSource;
      const connected = await this.serialSource.connect(portPath);
      if (!connected) {
        console.warn('Serial connection attempt returned false.');
      }
    } else if (newMode === 'CLOUD') {
      this.activeSource = null;
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
    if (this.activeSource) {
      return await this.activeSource.sendCommand(commandObj);
    }
    return false;
  }

  getStatus() {
    return {
      mode: this.mode,
      activeSourceStatus: this.activeSource ? this.activeSource.getStatus() : { name: 'CLOUD', connected: true, port: 'WIRELESS_CLOUD_WIFI' },
      lastData: this.lastData,
      settings: this.settings
    };
  }

  async getAvailablePorts() {
    return await this.serialSource.listAvailablePorts();
  }
}

export default DataSourceManager;
