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

  getStatus() {
    return {
      name: this.name,
      connected: this.isConnected,
    };
  }
}

export default BaseDataSource;
