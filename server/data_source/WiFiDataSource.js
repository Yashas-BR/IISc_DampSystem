import BaseDataSource from './BaseDataSource.js';

/**
 * WiFiDataSource — Third selectable data source for the DataSourceManager.
 *
 * Instead of reading a serial port or generating synthetic data, this source
 * accepts telemetry payloads that arrive over HTTP POST from the onboard
 * ESP8266 on the Arduino Mega 2560 WiFi R3 clone.
 *
 * Interface contract mirrors SerialDataSource exactly:
 *   Events emitted:  'data', 'status', 'alert', 'error'
 *   Lifecycle:       connect(), disconnect(), sendCommand(), getStatus()
 *
 * Because the ESP8266 initiates contact (HTTP POST), outbound commands
 * (fan/LED toggles) cannot be pushed. They are queued in-memory and
 * returned to the ESP8266 when it next calls GET /api/commands (poll model).
 */
export class WiFiDataSource extends BaseDataSource {
  constructor() {
    super('WIFI');
    this.lastPacketTime = null;
    this.packetCount = 0;
    this.remoteIp = null;

    // Outbound command queue  (fan/LED toggles waiting for ESP8266 to pick up)
    this.pendingCommands = [];

    // Stale-connection watchdog: if no POST arrives for 10 s, mark disconnected
    this.watchdogTimer = null;
    this.WATCHDOG_TIMEOUT_MS = 10_000;
  }

  // ─── Lifecycle ────────────────────────────────────────────────────────

  /**
   * connect() — For WiFi there is no port to open.  We simply flip the flag
   * and start the watchdog.  The first incoming HTTP POST will confirm that
   * the ESP8266 is actually online.
   */
  async connect() {
    this.isConnected = true;
    this.packetCount = 0;
    this.pendingCommands = [];

    console.log('[WiFiDataSource] Listening for incoming HTTP telemetry from ESP8266…');
    this.emit('status', {
      connected: true,
      port: 'WIFI_HTTP',
      message: 'Waiting for first Wi-Fi telemetry packet from Arduino…'
    });

    this.resetWatchdog();
    return true;                       // always succeeds (no port to fail)
  }

  /**
   * disconnect() — Tear down the watchdog and clear queues.
   */
  async disconnect() {
    this.isConnected = false;
    this.clearWatchdog();
    this.pendingCommands = [];

    this.emit('status', {
      connected: false,
      port: 'WIFI_HTTP',
      message: 'Wi-Fi data source disconnected'
    });
  }

  // ─── Inbound telemetry (called by DataSourceManager / route handler) ──

  /**
   * handleIncoming(jsonPayload, remoteIp)
   *
   * The route handler (POST /api/telemetry) calls this with the parsed
   * req.body.  The method normalises the shape to the exact same object
   * that SerialDataSource.handleIncomingData() emits, then fires 'data'.
   */
  handleIncoming(payload, remoteIp = null) {
    if (remoteIp) this.remoteIp = remoteIp;

    const parsedData = {
      temperature: Number(payload.temperature ?? 25.0),
      humidity:    Number(payload.humidity ?? 50),
      light:      Number(payload.light ?? 500),
      gas:        Number(payload.gas ?? 400),
      moisture:   Number(payload.moisture ?? 600),
      fan:        Boolean(payload.fan),
      led:        Boolean(payload.led),
      status:     payload.status || 'NORMAL',
      timestamp:  new Date().toISOString()
    };

    this.lastPacketTime = parsedData.timestamp;
    this.packetCount++;

    // If this is the very first packet, announce connectivity
    if (!this.isConnected || this.packetCount === 1) {
      this.isConnected = true;
      this.emit('status', {
        connected: true,
        port: 'WIFI_HTTP',
        remoteIp: this.remoteIp,
        message: `Receiving Wi-Fi telemetry from ${this.remoteIp || 'ESP8266'}`
      });
    }

    console.log(`[WIFI PACKET #${this.packetCount}] from ${this.remoteIp}:`, parsedData);

    // Emit the same 'data' event that SerialDataSource emits
    this.emit('data', parsedData);

    // Reset the stale-connection watchdog
    this.resetWatchdog();
  }

  // ─── Outbound command queue (poll model) ──────────────────────────────

  /**
   * sendCommand(commandObj)
   *
   * Called by DataSourceManager when the dashboard user clicks Fan ON/OFF
   * or LED ON/OFF.  Since we cannot push to the ESP8266, the command is
   * queued and returned the next time the ESP8266 polls GET /api/commands.
   */
  async sendCommand(commandObj) {
    this.pendingCommands.push({
      ...commandObj,
      queuedAt: new Date().toISOString()
    });
    console.log('[WiFiDataSource] Command queued for ESP8266 pickup:', commandObj);
    return true;                       // always succeeds (just a queue push)
  }

  /**
   * getPendingCommands() — Returns the full queue (used by the route handler).
   */
  getPendingCommands() {
    return [...this.pendingCommands];
  }

  /**
   * clearPendingCommands() — Called after the ESP8266 has fetched them.
   */
  clearPendingCommands() {
    this.pendingCommands = [];
  }

  // ─── Watchdog ─────────────────────────────────────────────────────────

  resetWatchdog() {
    this.clearWatchdog();
    this.watchdogTimer = setTimeout(() => {
      if (this.isConnected) {
        console.warn('[WiFiDataSource] No packets received for 10 s — marking disconnected.');
        this.isConnected = false;
        this.emit('status', {
          connected: false,
          port: 'WIFI_HTTP',
          message: 'Wi-Fi telemetry timeout — no packets for 10 s'
        });
        this.emit('alert', {
          type: 'WIFI_TIMEOUT',
          message: 'No telemetry received from ESP8266 for 10 seconds. Check Arduino power and WiFi connection.',
          severity: 'CRITICAL',
          sensor: 'Network'
        });
      }
    }, this.WATCHDOG_TIMEOUT_MS);
  }

  clearWatchdog() {
    if (this.watchdogTimer) {
      clearTimeout(this.watchdogTimer);
      this.watchdogTimer = null;
    }
  }

  // ─── Status ───────────────────────────────────────────────────────────

  getStatus() {
    return {
      name: this.name,
      connected: this.isConnected,
      port: 'WIFI_HTTP',
      remoteIp: this.remoteIp,
      lastPacketTime: this.lastPacketTime,
      packetCount: this.packetCount,
      pendingCommands: this.pendingCommands.length
    };
  }
}

export default WiFiDataSource;
