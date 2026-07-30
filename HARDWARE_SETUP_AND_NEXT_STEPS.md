# Smart Damp & Mold Prevention System - Hardware Setup & Deployment Guide

This document provides step-by-step instructions for wiring your Arduino Mega 2560 hardware, uploading the C++ firmware, connecting the physical sensors to the web dashboard, and outlining future development next steps.

---

## 🛠️ 1. Hardware Pin Mapping & Circuit Wiring

Connect your sensors and actuators to the Arduino Mega 2560 according to the following wiring table:

| Component | Arduino Pin | Pin Type | VCC Power | GND Ground | Description |
| :--- | :--- | :--- | :--- | :--- | :--- |
| **DHT11 Sensor** | **Digital D2** | Digital Input | 5V / 3.3V | GND | Ambient Temp (°C) & Relative Humidity (%) |
| **Relay Module** | **Digital D5** | Digital Output | 5V | GND | Controls High-Voltage Exhaust Fan |
| **Warning LED** | **Digital D13** | Digital Output | 5V (via 220Ω) | GND | Visual Mold Hazard Alert Signal |
| **LDR Sensor** | **Analog A0** | Analog Input | 5V (via 10kΩ) | GND | Ambient Surface Light Level (0–1023 ADC) |
| **MQ135 Gas** | **Analog A1** | Analog Input | 5V | GND | Airborne Gas / Air Quality Sensing (0–1023 ADC) |
| **Moisture Sensor**| **Analog A2** | Analog Input | 5V / 3.3V | GND | Capacitive Wall/Surface Dampness (0–1023 ADC) |

> [!IMPORTANT]
> **Relay Circuit Caution**: The Relay Module controls the 220V/110V Exhaust Fan. Ensure proper isolation between low-voltage DC signals and high-voltage AC mains.

---

## 💻 2. Uploading Arduino Firmware

1. Open the Arduino IDE.
2. Open `arduino/smart_mold_prevention.ino`.
3. Install the **DHT sensor library** by Adafruit via **Tools > Manage Libraries...**.
4. Select Board: **Tools > Board > Arduino AVR Boards > Arduino Mega or Mega 2560**.
5. Select Port: **Tools > Port > COMx** (where `COMx` is your connected Arduino COM port).
6. Click **Upload** (Ctrl + U).
7. Open Serial Monitor at **115200 Baud** to verify outputting JSON data formatted like:
   ```json
   {"temperature":28.4,"humidity":63,"light":420,"gas":510,"moisture":760,"fan":true,"led":true,"status":"WARNING"}
   ```

---

## 🔌 3. Connecting Hardware to Web Dashboard

1. **Keep Arduino Plugged into USB**: Ensure your Arduino Mega 2560 is connected to your computer via USB.
2. **Start the Web Dashboard**:
   ```bash
   npm run dev
   ```
   Open your browser to `http://localhost:5173/`.

3. **Enable Live Mode**:
   - In the top right header bar, click **`🟢 Live Mode`**.
   - Click the COM Port status badge (e.g. `SIMULATOR_PORT_0`) and select your physical Arduino COM port (e.g. `COM3`, `COM4`, or `COM5`).

4. **Verify Live Data Streaming**:
   - Sensor values, risk score, live stream chart, and actuator states will immediately update in real-time as physical sensor telemetry arrives over Serial every 2 seconds.
   - Click the **Exhaust Fan [RUNNING/STOPPED]** or **Warning LED [ACTIVE/OFF]** buttons to test sending remote serial commands to your physical hardware.

---

## 🚀 4. Next Steps & Development Roadmap

### Phase 1: Sensor Calibration & Baseline Tuning
- [ ] **MQ135 Preheat & Calibration**: Allow MQ135 sensor to warm up for 24 hours to establish accurate baseline ADC values for clean air vs gas contamination.
- [ ] **Capacitive Moisture Thresholds**: Measure dry wall ADC values vs damp wall ADC values to fine-tune the `moisture_thresh` setpoint in the dashboard settings.

### Phase 2: Wireless ESP32 Wi-Fi & MQTT Migration
- [ ] **ESP32 Wi-Fi Node**: Wire an ESP32 microcontroller or ESP-01 module to Arduino Mega `Serial1` (TX1/RX1).
- [ ] **MQTT Broker Integration**: Publish telemetry to an MQTT broker (e.g., Mosquitto / HiveMQ).
- [ ] **Zero Frontend Changes**: Change backend `DataSourceManager.js` data provider from `SerialDataSource` to `MQTTDataSource`. The React dashboard will receive data seamlessly without any code modifications.

### Phase 3: Field Enclosure & Wall Installation
- [ ] **3D Printed Enclosure**: Design a CAD model enclosure with ventilation slots for DHT11 and MQ135 sensors.
- [ ] **Wall Mount & Relay Box**: Mount capacitive moisture probe against building walls vulnerable to dampness.

### Phase 4: Push Notifications & Remote Telemetry
- [ ] **Telegram / Email Webhooks**: Add Node.js webhook triggers in `server/server.js` to send instant phone notifications when Mold Hazard status reaches `CRITICAL`.
- [ ] **Cloud Deployment**: Host Express server on AWS / DigitalOcean / Vercel for remote mobile phone access anywhere.
