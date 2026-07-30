import BaseDataSource from './BaseDataSource.js';

export class SimulationDataSource extends BaseDataSource {
  constructor(settings = {}) {
    super('SIMULATION');
    this.timer = null;

    // Simulation Sensor Controls
    this.state = {
      temperature: 24.5,
      humidity: 52,
      light: 480,
      gas: 350,
      moisture: 720,
      fan: false,
      led: false,
      status: 'NORMAL'
    };

    // System threshold reference
    this.settings = {
      humidity_thresh: 60,
      temp_thresh: 30,
      gas_thresh: 700,
      moisture_thresh: 400,
      light_thresh: 500,
      ...settings
    };

    this.previousFan = false;
    this.previousLed = false;
    this.previousStatus = 'NORMAL';
  }

  updateSettings(newSettings) {
    this.settings = { ...this.settings, ...newSettings };
    this.reevaluate();
  }

  async connect() {
    this.isConnected = true;
    this.emit('status', {
      connected: true,
      port: 'SIMULATOR_PORT_0',
      message: 'Simulation Mode Active'
    });

    if (!this.timer) {
      // Periodic tick every 2 seconds to match Arduino interval
      this.timer = setInterval(() => {
        this.tick();
      }, 2000);
    }
    
    this.tick(); // Immediate initial tick
    return true;
  }

  async disconnect() {
    this.isConnected = false;
    if (this.timer) {
      clearInterval(this.timer);
      this.timer = null;
    }
    this.emit('status', {
      connected: false,
      port: null,
      message: 'Simulation Disconnected'
    });
    return true;
  }

  // Update simulation state manually from UI sliders / inputs
  updateValues(newValues) {
    if (newValues.temperature !== undefined) this.state.temperature = Number(newValues.temperature);
    if (newValues.humidity !== undefined) this.state.humidity = Number(newValues.humidity);
    if (newValues.light !== undefined) this.state.light = Number(newValues.light);
    if (newValues.gas !== undefined) this.state.gas = Number(newValues.gas);
    if (newValues.moisture !== undefined) this.state.moisture = Number(newValues.moisture);

    this.reevaluate();
    this.tick();
  }

  calculateRiskScore() {
    let risk = 0;
    // Humidity contribution (0-100%) -> 35% weight
    const hWeight = Math.min(100, Math.max(0, (this.state.humidity / 100) * 100));
    risk += hWeight * 0.35;

    // Moisture contribution (inverted: <400 is dry/damp risk) -> 25% weight
    const mRisk = this.state.moisture < 400 ? (1 - this.state.moisture / 400) * 100 : 0;
    risk += mRisk * 0.25;

    // Gas contribution (0-1023) -> 25% weight
    const gRisk = Math.min(100, (this.state.gas / 1023) * 100);
    risk += gRisk * 0.25;

    // Temp contribution (0-50°C) -> 15% weight
    const tRisk = Math.min(100, Math.max(0, (this.state.temperature / 50) * 100));
    risk += tRisk * 0.15;

    return Math.round(Math.min(100, Math.max(0, risk)));
  }

  reevaluate() {
    const hThresh = Number(this.settings.humidity_thresh || 60);
    const tThresh = Number(this.settings.temp_thresh || 30);
    const gThresh = Number(this.settings.gas_thresh || 700);
    const mThresh = Number(this.settings.moisture_thresh || 400);

    // Actuator logic
    const newFan = this.state.humidity > hThresh || this.state.gas > gThresh;
    const newLed = this.state.humidity > hThresh || this.state.temperature > tThresh || this.state.gas > gThresh || this.state.moisture < mThresh;

    // System Status
    let newStatus = 'NORMAL';
    if (this.state.humidity > 80 || this.state.gas > 850 || this.state.temperature > 40) {
      newStatus = 'CRITICAL';
    } else if (newLed) {
      newStatus = 'WARNING';
    }

    // Trigger alerts for state transitions
    if (newFan !== this.previousFan) {
      this.emit('alert', {
        type: newFan ? 'FAN_ON' : 'FAN_OFF',
        message: newFan ? 'Exhaust Fan turned ON (Threshold exceeded)' : 'Exhaust Fan turned OFF (Sensors normal)',
        severity: 'INFO'
      });
      this.previousFan = newFan;
    }

    if (this.state.humidity > hThresh && this.state.humidity - 1 <= hThresh) {
      this.emit('alert', {
        type: 'HIGH_HUMIDITY',
        message: `High Humidity detected (${this.state.humidity}% > ${hThresh}%)`,
        severity: 'WARNING'
      });
    }

    if (this.state.temperature > tThresh && this.state.temperature - 0.5 <= tThresh) {
      this.emit('alert', {
        type: 'HIGH_TEMP',
        message: `High Temperature detected (${this.state.temperature}°C > ${tThresh}°C)`,
        severity: 'WARNING'
      });
    }

    if (this.state.gas > gThresh && this.state.gas - 10 <= gThresh) {
      this.emit('alert', {
        type: 'HIGH_GAS',
        message: `High Gas Level detected (${this.state.gas} > ${gThresh})`,
        severity: 'CRITICAL'
      });
    }

    if (this.state.moisture < mThresh && this.state.moisture + 10 >= mThresh) {
      this.emit('alert', {
        type: 'LOW_MOISTURE',
        message: `Low Surface Moisture detected (${this.state.moisture} < ${mThresh})`,
        severity: 'WARNING'
      });
    }

    this.state.fan = newFan;
    this.state.led = newLed;
    this.state.status = newStatus;
  }

  tick() {
    if (!this.isConnected) return;

    const riskScore = this.calculateRiskScore();
    const packet = {
      ...this.state,
      riskScore,
      timestamp: new Date().toISOString()
    };

    this.emit('data', packet);
  }

  async sendCommand(commandObj) {
    if (commandObj.fan !== undefined) this.state.fan = Boolean(commandObj.fan);
    if (commandObj.led !== undefined) this.state.led = Boolean(commandObj.led);
    this.tick();
    return true;
  }

  getStatus() {
    return {
      name: this.name,
      connected: this.isConnected,
      port: 'SIMULATOR_PORT_0',
      state: this.state
    };
  }
}

export default SimulationDataSource;
