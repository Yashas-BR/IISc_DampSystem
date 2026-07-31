import { SerialPort } from 'serialport';
import { ReadlineParser } from '@serialport/parser-readline';
import BaseDataSource from './BaseDataSource.js';

export class SerialDataSource extends BaseDataSource {
  constructor() {
    super('SERIAL');
    this.port = null;
    this.parser = null;
    this.currentPortName = null;
    this.baudRate = 9600; // Default to 9600 baud
    this.reconnectTimer = null;
    this.autoReconnect = true;
    this.lastPacketTime = null;
    this.bufferText = '';
  }

  async listAvailablePorts() {
    try {
      const ports = await SerialPort.list();
      return ports.map(p => {
        const vId = (p.vendorId || '').toLowerCase();
        const mfg = (p.manufacturer || '').toLowerCase();
        const pnp = (p.pnpId || '').toLowerCase();
        const friendly = (p.friendlyName || '').toLowerCase();

        const isArduino = Boolean(
          mfg.includes('arduino') ||
          mfg.includes('wch') ||
          pnp.includes('arduino') ||
          friendly.includes('ch340') ||
          friendly.includes('serial') ||
          friendly.includes('arduino') ||
          vId === '2341' ||
          vId === '1a86' ||
          vId === '0403' ||
          vId === '10c4'
        );

        return {
          path: p.path,
          manufacturer: p.manufacturer || 'Unknown',
          serialNumber: p.serialNumber || '',
          pnpId: p.pnpId || '',
          vendorId: p.vendorId || '',
          productId: p.productId || '',
          friendlyName: p.friendlyName || p.path,
          isArduino
        };
      });
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
    return ports.length > 0 ? ports[0].path : null;
  }

  async connect(targetPort = null, requestedBaud = 9600) {
    if (this.isConnected && this.port) {
      await this.disconnect();
    }

    this.autoReconnect = true;
    this.baudRate = requestedBaud;
    const portToOpen = targetPort || await this.autoDetectPort();

    if (!portToOpen) {
      console.warn('No COM ports available to open.');
      this.isConnected = false;
      this.emit('status', {
        connected: false,
        port: null,
        message: 'No COM Port detected. Please plug in Arduino Mega 2560.'
      });
      return false;
    }

    this.currentPortName = portToOpen;

    return new Promise((resolve) => {
      try {
        console.log(`Opening serial port ${portToOpen} at ${this.baudRate} baud...`);
        this.port = new SerialPort({
          path: portToOpen,
          baudRate: this.baudRate,
          autoOpen: false
        });

        this.parser = this.port.pipe(new ReadlineParser({ delimiter: '\n' }));

        this.port.open((err) => {
          if (err) {
            console.error(`Failed to open serial port ${portToOpen}:`, err.message);
            this.isConnected = false;
            this.emit('status', {
              connected: false,
              port: portToOpen,
              error: err.message,
              message: err.message.includes('Access denied')
                ? `Port ${portToOpen} is locked. Please close Arduino IDE Serial Monitor.`
                : `Error opening ${portToOpen}: ${err.message}`
            });
            this.emit('alert', {
              type: 'PORT_ERROR',
              message: err.message.includes('Access denied')
                ? `COM Port ${portToOpen} Access Denied. Close Arduino IDE Serial Monitor.`
                : `Failed to open ${portToOpen}: ${err.message}`,
              severity: 'CRITICAL'
            });
            resolve(false);
            return;
          }

          this.isConnected = true;
          console.log(`Successfully opened serial port ${portToOpen} at ${this.baudRate} baud.`);
          this.emit('status', {
            connected: true,
            port: portToOpen,
            baudRate: this.baudRate,
            message: `Connected to Arduino on ${portToOpen}`
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
            message: 'Port closed'
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
        resolve(false);
      }
    });
  }

  handleIncomingData(line) {
    line = line.trim();
    if (!line) return;

    console.log(`[SERIAL STREAM ${this.currentPortName}]:`, line);

    let parsedData = null;

    // 1. Try Parsing JSON Format
    const startIdx = line.indexOf('{');
    const endIdx = line.lastIndexOf('}');
    if (startIdx !== -1 && endIdx !== -1 && endIdx > startIdx) {
      try {
        const jsonSub = line.substring(startIdx, endIdx + 1);
        const data = JSON.parse(jsonSub);
        parsedData = {
          temperature: Number(data.temperature ?? 25.0),
          humidity: Number(data.humidity ?? 50),
          light: Number(data.light ?? 500),
          gas: Number(data.gas ?? 400),
          moisture: Number(data.moisture ?? 600),
          fan: Boolean(data.fan),
          led: Boolean(data.led),
          status: data.status || 'NORMAL'
        };
      } catch (e) {
        // Fallthrough to text parser
      }
    }

    // 2. Try Parsing Text Format: "Temp: 24.0°C | Air Humid: 54.0% | Light: 561 | Gas Level: 432 | Surf Moist: 1010 -> [STATUS: NORMAL]"
    if (!parsedData && (line.includes('Temp') || line.includes('Humid') || line.includes('Light') || line.includes('Gas') || line.includes('Moist') || line.includes('LED') || line.includes('Fan'))) {
      this.bufferText += ' ' + line;
      
      const tMatch = this.bufferText.match(/Temp:\s*([0-9.]+)/i);
      const hMatch = this.bufferText.match(/Humid(?:ity)?:\s*([0-9.]+)/i);
      const lMatch = this.bufferText.match(/Light:\s*([0-9]+)/i);
      const gMatch = this.bufferText.match(/Gas(?:\s*Level)?:\s*([0-9]+)/i);
      const mMatch = this.bufferText.match(/Moist(?:ure)?:\s*([0-9]+)/i);
      const sMatch = this.bufferText.match(/STATUS:\s*([A-Z_]+)/i);
      const ledMatch = this.bufferText.match(/LED:\s*(ON|OFF|1|0|true|false)/i);
      const fanMatch = this.bufferText.match(/Fan:\s*(ON|OFF|1|0|true|false)/i);

      if (tMatch || hMatch || lMatch || gMatch || mMatch) {
        const tempVal = tMatch ? parseFloat(tMatch[1]) : 24.5;
        const humVal = hMatch ? parseFloat(hMatch[1]) : 52;
        const lightVal = lMatch ? parseInt(lMatch[1]) : 500;
        const gasVal = gMatch ? parseInt(gMatch[1]) : 350;
        const moistVal = mMatch ? parseInt(mMatch[1]) : 700;
        const statusVal = sMatch ? sMatch[1] : (humVal > 60 || gasVal > 700 ? 'WARNING' : 'NORMAL');

        // Evaluate LED state: explicit LED string OR LDR dark (< 500) OR high humidity / gas / temp / low moisture
        const ledVal = ledMatch
          ? (ledMatch[1].toUpperCase() === 'ON' || ledMatch[1] === '1' || ledMatch[1].toLowerCase() === 'true')
          : (lightVal < 500 || humVal > 60 || tempVal > 30 || gasVal > 700 || moistVal < 400 || statusVal !== 'NORMAL');

        const fanVal = fanMatch
          ? (fanMatch[1].toUpperCase() === 'ON' || fanMatch[1] === '1' || fanMatch[1].toLowerCase() === 'true')
          : (humVal > 60 || gasVal > 700);

        parsedData = {
          temperature: tempVal,
          humidity: humVal,
          light: lightVal,
          gas: gasVal,
          moisture: moistVal,
          fan: fanVal,
          led: ledVal,
          status: statusVal
        };

        this.bufferText = '';
      }
    }

    if (parsedData) {
      this.lastPacketTime = new Date().toISOString();
      parsedData.timestamp = this.lastPacketTime;
      console.log('[PARSED TELEMETRY PACKET]:', parsedData);
      this.emit('data', parsedData);
    }
  }

  scheduleReconnect() {
    if (!this.autoReconnect || this.reconnectTimer) return;
    this.reconnectTimer = setTimeout(async () => {
      this.reconnectTimer = null;
      if (!this.isConnected && this.currentPortName) {
        console.log(`Attempting auto-reconnect to ${this.currentPortName}...`);
        await this.connect(this.currentPortName, this.baudRate);
      }
    }, 4000);
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
