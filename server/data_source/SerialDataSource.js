import { SerialPort } from 'serialport';
import { ReadlineParser } from '@serialport/parser-readline';
import BaseDataSource from './BaseDataSource.js';

export class SerialDataSource extends BaseDataSource {
  constructor() {
    super('SERIAL');
    this.port = null;
    this.parser = null;
    this.currentPortName = null;
    this.baudRate = 115200;
    this.reconnectTimer = null;
    this.autoReconnect = true;
    this.lastPacketTime = null;
  }

  async listAvailablePorts() {
    try {
      const ports = await SerialPort.list();
      return ports.map(p => ({
        path: p.path,
        manufacturer: p.manufacturer || 'Unknown',
        serialNumber: p.serialNumber || '',
        pnpId: p.pnpId || '',
        vendorId: p.vendorId || '',
        productId: p.productId || '',
        isArduino: (
          (p.manufacturer && p.manufacturer.toLowerCase().includes('arduino')) ||
          (p.pnpId && p.pnpId.toLowerCase().includes('arduino')) ||
          p.vendorId === '2341' || // Arduino SA Vendor ID
          p.vendorId === '1a86'    // CH340 USB Serial
        )
      }));
    } catch (err) {
      console.error('Error listing serial ports:', err);
      return [];
    }
  }

  async autoDetectPort() {
    const ports = await this.listAvailablePorts();
    const arduinoPort = ports.find(p => p.isArduino);
    if (arduinoPort) {
      return arduinoPort.path;
    }
    // Fallback: pick first available COM port if any
    return ports.length > 0 ? ports[0].path : null;
  }

  async connect(targetPort = null) {
    if (this.isConnected && this.port) {
      await this.disconnect();
    }

    const portToOpen = targetPort || await this.autoDetectPort();
    if (!portToOpen) {
      this.isConnected = false;
      this.emit('status', {
        connected: false,
        port: null,
        message: 'No Arduino or Serial Device detected.'
      });
      this.scheduleReconnect();
      return false;
    }

    this.currentPortName = portToOpen;

    return new Promise((resolve) => {
      try {
        this.port = new SerialPort({
          path: portToOpen,
          baudRate: this.baudRate,
          autoOpen: false
        });

        this.parser = this.port.pipe(new ReadlineParser({ delimiter: '\r\n' }));

        this.port.open((err) => {
          if (err) {
            console.warn(`Failed to open serial port ${portToOpen}:`, err.message);
            this.isConnected = false;
            this.emit('status', {
              connected: false,
              port: portToOpen,
              error: err.message
            });
            this.scheduleReconnect();
            resolve(false);
            return;
          }

          this.isConnected = true;
          this.emit('status', {
            connected: true,
            port: portToOpen,
            baudRate: this.baudRate,
            message: `Connected to ${portToOpen}`
          });

          resolve(true);
        });

        this.parser.on('data', (line) => {
          this.handleIncomingData(line);
        });

        this.port.on('close', () => {
          console.warn(`Serial port ${this.currentPortName} closed.`);
          this.isConnected = false;
          this.emit('status', {
            connected: false,
            port: this.currentPortName,
            message: 'Port closed unexpectedly'
          });
          this.emit('alert', {
            type: 'DISCONNECT',
            message: `Arduino disconnected from ${this.currentPortName}`,
            severity: 'CRITICAL'
          });
          this.scheduleReconnect();
        });

        this.port.on('error', (err) => {
          console.error(`Serial port error on ${this.currentPortName}:`, err.message);
          this.emit('error', err);
        });

      } catch (err) {
        console.error('Error instantiating SerialPort:', err);
        this.isConnected = false;
        this.scheduleReconnect();
        resolve(false);
      }
    });
  }

  handleIncomingData(line) {
    line = line.trim();
    if (!line || !line.startsWith('{')) return;

    try {
      const data = JSON.parse(line);
      this.lastPacketTime = new Date().toISOString();
      
      // Ensure all fields exist with fallback values
      const parsedData = {
        temperature: Number(data.temperature ?? 25.0),
        humidity: Number(data.humidity ?? 50),
        light: Number(data.light ?? 500),
        gas: Number(data.gas ?? 400),
        moisture: Number(data.moisture ?? 600),
        fan: Boolean(data.fan),
        led: Boolean(data.led),
        status: data.status || 'NORMAL',
        timestamp: this.lastPacketTime
      };

      this.emit('data', parsedData);
    } catch (e) {
      console.warn('Failed to parse JSON from Arduino:', line, e.message);
    }
  }

  scheduleReconnect() {
    if (!this.autoReconnect || this.reconnectTimer) return;
    this.reconnectTimer = setTimeout(async () => {
      this.reconnectTimer = null;
      if (!this.isConnected) {
        console.log('Attempting auto-reconnect to Arduino Serial...');
        await this.connect(this.currentPortName);
      }
    }, 5000);
  }

  async disconnect() {
    this.autoReconnect = false;
    if (this.reconnectTimer) {
      clearTimeout(this.reconnectTimer);
      this.reconnectTimer = null;
    }

    if (this.port && this.port.isOpen) {
      await new Promise((resolve) => {
        this.port.close(() => resolve(true));
      });
    }

    this.isConnected = false;
    this.emit('status', {
      connected: false,
      port: this.currentPortName,
      message: 'Disconnected by user'
    });
  }

  async sendCommand(commandObj) {
    if (!this.isConnected || !this.port) return false;
    const jsonStr = JSON.stringify(commandObj) + '\n';
    return new Promise((resolve) => {
      this.port.write(jsonStr, (err) => {
        if (err) {
          console.error('Failed to send command over serial:', err);
          resolve(false);
        } else {
          resolve(true);
        }
      });
    });
  }

  getStatus() {
    return {
      name: this.name,
      connected: this.isConnected,
      port: this.currentPortName,
      baudRate: this.baudRate,
      lastPacketTime: this.lastPacketTime
    };
  }
}

export default SerialDataSource;
