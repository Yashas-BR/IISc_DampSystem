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

    this.state.fan = newFan;
    this.state.led = newLed;
    this.state.status = newStatus;
  }

  tick() {
    if (!this.isConnected) return;

    const packet = {
      ...this.state,
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
