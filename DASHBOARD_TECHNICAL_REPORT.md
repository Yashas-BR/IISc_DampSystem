# Web Dashboard Technical Report & Architecture Guide
**Project:** Automated Micro-Zone Damp, Air Quality, and Climate-Ventilation Control System  
**Component:** Full-Stack IoT Web Dashboard (React + Node.js)

This document provides a comprehensive breakdown of the web dashboard's architecture, its individual components, and the end-to-end logic that powers real-time monitoring and control.

---

## 1. System Architecture Overview
The web dashboard is built as a full-stack application that acts as the command and control center for the Arduino Mega 2560 hardware.

It uses a **Three-Tier Architecture**:
1. **Frontend (Client):** A React (TypeScript) Single Page Application (SPA) styled with Tailwind CSS, providing real-time data visualization and interactive controls.
2. **Backend (Server):** A Node.js + Express server that manages HTTP API requests, maintains real-time WebSocket connections (via Socket.IO), and handles the data persistence.
3. **Data Source Layer (Hardware Bridge):** A decoupled engine within the backend that abstracts where data comes from—either a physical Arduino (`SerialDataSource`) or a software simulator (`SimulationDataSource`).

---

## 2. Backend Logic & Components

### 2.1 `DataSourceManager.js` (The Brain)
This acts as the central traffic controller for telemetry data.
- **Role:** Manages the active data source (Live Serial or Simulation).
- **Logic:** 
  - Listens to the active data source for new telemetry readings.
  - Intercepts the data and passes it to `db.saveTelemetry()` for database logging and threshold evaluation.
  - Broadcasts the processed data (and any generated alerts) to all connected web clients via Socket.IO.
  - Routes actuator commands (Fan/LED toggles) back to the active data source.

### 2.2 `SerialDataSource.js` (Hardware Communication)
- **Role:** Connects directly to the physical Arduino Mega via USB Serial port.
- **Logic:**
  - Uses the `serialport` library to automatically detect the Arduino (matching vendor IDs like `1A86` for CH340 chips).
  - Listens for incoming JSON strings printed by the Arduino's `Serial.println()`.
  - Parses the JSON into JavaScript objects.
  - For commands (e.g., turning the fan on via dashboard), it constructs a JSON command string and writes it back to the Arduino over the serial bus.

### 2.3 `SimulationDataSource.js` (Testing & Fallback)
- **Role:** Generates synthetic data when the physical hardware is disconnected.
- **Logic:**
  - Uses mathematical drift models to simulate realistic temperature, humidity, and gas fluctuations.
  - Automatically reacts to threshold changes to test alert triggering mechanisms without needing physical environmental changes.

### 2.4 `db.js` (Persistence & Alert Engine)
- **Role:** SQLite-based storage (`sql.js`) for keeping historical data, settings, and evaluating alerts.
- **Logic:**
  - **Telemetry Logging:** Saves every data point to the `telemetry` table.
  - **Alert Evaluation:** Every time new data arrives, it compares the values against user-defined thresholds (e.g., if `humidity > humidity_thresh`). If breached, it inserts a new record into the `alerts` table and returns the alert object to be broadcasted to the frontend.

---

## 3. Frontend Logic & Components

The frontend is a React application built with Vite, emphasizing a highly responsive, industrial "dark mode" aesthetic.

### 3.1 `SocketContext.tsx` (Global State Manager)
- **Role:** Maintains the persistent WebSocket connection with the Node.js server and shares data globally across all React components.
- **Logic:**
  - Listens to `telemetry_update` events and maintains a rolling array of the last 120 readings (`telemetryHistory`) for charting.
  - Listens to `alert_triggered` events to update the live event log.
  - Provides helper functions to components (e.g., `sendCommand`, `switchMode`, `updateSettings`) which make HTTP POST requests to the backend API.

### 3.2 `Header.tsx` (Top Navigation & Control)
- **Role:** Main navigation and hardware connection interface.
- **Logic:**
  - Displays a dropdown of all detected COM ports on the host machine.
  - Allows the user to dynamically hot-swap between **LIVE** mode (reading from physical Arduino) and **SIMULATION** mode.

### 3.3 `DashboardPage.tsx` (Main UI & Analytics Engine)
This is the core view of the application. It takes raw telemetry data and processes it into actionable scientific visualizations.

#### A. Derived Science Metrics Panel
Instead of just displaying raw sensor values, the dashboard executes client-side mathematical models:
- **Dew Point:** Uses the Magnus approximation formula `T - ((100-RH)/5)` to calculate when condensation will form on surfaces.
- **Absolute Humidity:** Uses a simplified Buck equation to calculate the actual mass of water vapor in the air (g/m³).
- **Mold Growth Index:** A weighted algorithm `(Hum*0.4) + (Temp*0.3) + (Gas*0.2) + (Moisture*0.1)` that outputs a 0-100 risk score.
- **Wardrobe VOC Risk:** Combines the LDR (darkness) and MQ135 (gas) to identify stagnant, enclosed hazard zones.

#### B. Automation Logic Gate Visualizer
- **Role:** Provides a live X-Ray into the Arduino's core C++ logic loop.
- **Logic:** Visually evaluates `Condition A (Temp > Limit)` and `Condition B (Humidity > Limit)`. When both are true, the UI's virtual AND gate illuminates, matching the physical relay engaging the 12V exhaust fan.

#### C. Room Health Scorecards
- **Role:** Groups isolated sensors into spatial "Rooms".
- **Logic:** 
  - **Room 1 (Main):** Aggregates DHT11 (Temp/Hum) and Capacitive Moisture (Surface dampness).
  - **Room 2 (Wardrobe):** Aggregates LDR (Enclosure state) and MQ135 (Stagnant VOCs).
  - Assigns a unified status string (`SAFE`, `CAUTION`, `DANGER` or `VENTILATED`, `STAGNANT`, `HAZARD`) based on component performance.

#### D. Live Telemetry Charts (Recharts)
- **Role:** Historical data visualization.
- **Logic:** Binds to the `telemetryHistory` array from `SocketContext`. As new data arrives every 2 seconds, the charts dynamically push the array forward, creating a seamless scrolling effect. Reference lines are drawn dynamically based on the current user thresholds.

#### E. Alert Event Log
- **Role:** Live auditing trace.
- **Logic:** Renders the `alerts` array from state. Color codes based on severity (`WARNING` = Amber, `CRITICAL` = Red). Allows users to acknowledge (ACK) alerts or clear the history database entirely via API calls.

---

## 4. End-to-End Data Flow Example

**Scenario:** The physical room suddenly becomes very humid (Humidity hits 65%).

1. **Hardware:** Arduino's DHT11 reads 65%. Arduino executes `Serial.println("{\"humidity\": 65, ...}")`.
2. **Backend Engine:** `SerialDataSource.js` receives the string over COM3, parses it to a JSON object, and emits it.
3. **Database & Logic:** `DataSourceManager` receives the object, calls `db.saveTelemetry()`. The DB notes that 65% > Threshold (60%). It generates a `CRITICAL` alert for "Humidity Limit Breached".
4. **WebSocket Transport:** The Node server emits `telemetry_update` and `alert_triggered` via Socket.IO.
5. **Frontend State:** `SocketContext.tsx` receives the events, updates `latestTelemetry`, appends to `telemetryHistory`, and prepends the new alert to the `alerts` array.
6. **UI Render:** `DashboardPage.tsx` automatically re-renders:
   - The Humidity card turns Red.
   - The Area Chart plots a new point above the reference line.
   - The Logic Gate visualizer checks its conditions, lighting up the `Condition B` block.
   - A new Red entry appears in the Alert Event Log.
