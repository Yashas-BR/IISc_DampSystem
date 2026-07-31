import { EventEmitter } from 'events';

export class BaseDataSource extends EventEmitter {
  constructor(name) {
    super();
    this.name = name;
    this.isConnected = false;
  }

  async connect() {
    throw new Error('connect() must be implemented by subclass');
  }

  async disconnect() {
    throw new Error('disconnect() must be implemented by subclass');
  }

  async sendCommand(command) {
    throw new Error('sendCommand() must be implemented by subclass');
  }

  handleIncoming(payload, metadata) {
    // Only implemented by push-based sources (e.g. WiFi HTTP POST)
    // By default it does nothing so pull-based sources aren't required to implement it.
  }

  getStatus() {
    return {
      name: this.name,
      connected: this.isConnected,
    };
  }
}

export default BaseDataSource;
