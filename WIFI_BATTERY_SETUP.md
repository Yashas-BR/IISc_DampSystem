# Wireless Battery Operation Guide
## Arduino Mega 2560 WiFi R3 Clone — No USB Required

This guide explains how to cut the USB cable and run the entire IoT system
on a 12V battery, communicating with the web dashboard over Wi-Fi.

---

## How It Works (Architecture)

```
12V Battery
    │
    ▼
Arduino Mega 2560 WiFi R3
├── ATmega2560 (runs smart_mold_prevention.ino)
│   ├── Reads: DHT11 (D2), LDR (A0), MQ135 (A1), Moisture (A2)
│   ├── Controls: Relay Fan (D5), Warning LED (D13)
│   └── Sends JSON → Serial3 (pin 14/15) ──────────────────────────┐
│                                                                   │
└── Onboard ESP8266 (runs esp8266_wifi_bridge.ino)  ◄──────────────┘
    ├── Connects to: Phone Hotspot (Wi-Fi)
    ├── HTTP POST JSON → Node.js Server :3001/api/telemetry
    └── HTTP GET → Node.js Server :3001/api/commands → Serial back to Mega
                            │
                            ▼
                    Node.js Backend (WiFiDataSource.js)
                            │
                       Socket.IO
                            │
                            ▼
                    React Dashboard (your laptop browser)
```

---

## Step 1 — Set DIP Switches to "Mega + ESP Communication" Mode

Your Mega WiFi R3 clone has a row of **8 DIP switches** between the USB port
and the large ATmega chip.  These switches route the Serial lines.

> ⚠️ **CRITICAL**: Wrong switch positions = no communication between chips.

### For Normal Operation (Mega reads sensors, ESP8266 sends to WiFi):

| Switch | Label | Position | Purpose |
|--------|-------|----------|---------|
| 1 | RXD3 | **ON** | ATmega Serial3 RX ↔ ESP8266 TX |
| 2 | TXD3 | **ON** | ATmega Serial3 TX ↔ ESP8266 RX |
| 3 | GPIO0 | **OFF** | ESP8266 normal run mode (not flash mode) |
| 4 | GPIO15 | **OFF** | ESP8266 normal boot |
| 5-8 | — | **OFF** | Not used |

> **Note:** Switch labels vary by clone brand. Common labels: `RXD`, `TXD`, `GPIO0`, `GPIO2`. If your labels differ, the pattern is: first two switches ON, rest OFF.

---

## Step 2 — Flash the ESP8266 Bridge Firmware

The onboard ESP8266 needs custom firmware. Flash it **before** connecting to battery.

### Switch to ESP8266 Flash Mode:

| Switch | Position |
|--------|----------|
| 1 (RXD) | ON |
| 2 (TXD) | ON |
| 3 (GPIO0) | **ON** ← This puts ESP8266 in flash mode |
| 4-8 | OFF |

### Arduino IDE Settings:
```
Board:         Generic ESP8266 Module
Flash Size:    4MB (FS:2MB OTA:1MB)   [try 1MB if 4MB fails]
Upload Speed:  115200
Crystal Freq:  26 MHz
Port:          Your Arduino's COM port (same cable, same port)
```

### Steps:
1. Install **ESP8266 board package**: Arduino IDE → File → Preferences → Additional URLs:
   `http://arduino.esp8266.com/stable/package_esp8266com_index.json`
2. Tools → Board Manager → search "esp8266" → Install
3. Open `arduino/esp8266_wifi_bridge/esp8266_wifi_bridge.ino`
4. **Update these two lines** before uploading:
   ```cpp
   const char* ssid     = "YOUR_HOTSPOT_NAME";
   const char* serverHost = "YOUR_LAPTOP_IP";  // see Step 3
   ```
5. Set switches to Flash Mode (above), then Upload
6. After upload: set switches back to Normal Operation (Step 1)

---

## Step 3 — Find Your Laptop's IP Address

Your laptop and the Arduino must be on the **same hotspot network**.

1. Enable your phone hotspot
2. Connect your **laptop** to the hotspot via Wi-Fi
3. Open PowerShell and run:
   ```powershell
   ipconfig
   ```
4. Find **"Wireless LAN adapter Wi-Fi"** → **IPv4 Address**
   Example: `192.168.43.123`
5. Put this IP in `esp8266_wifi_bridge.ino`:
   ```cpp
   const char* serverHost = "192.168.43.123";  // ← YOUR IP here
   ```

> ⚠️ Your laptop's IP on the hotspot may change each time. Re-flash if it changes,
> OR set a static IP in your phone's hotspot settings for your laptop's MAC address.

---

## Step 4 — Flash the Mega Firmware

1. Switch back to **Arduino Mega 2560** board in Arduino IDE
2. Open `arduino/smart_mold_prevention.ino`
3. Upload it via USB (**last time you need USB!**)
4. After upload, disconnect USB

---

## Step 5 — Power via 12V Battery

### Wiring:
```
12V Battery (+) ─────► Arduino Mega VIN pin (or DC barrel jack)
12V Battery (−) ─────► Arduino Mega GND pin
```

> The Mega has an onboard voltage regulator that steps 7–12V down to 5V for the
> sensors and the ESP8266. **Do NOT connect 12V to the 5V pin directly.**

### Fan Circuit (separate 12V loop):
```
12V Battery (+) ──► Relay COM terminal
                    Relay NO terminal ──► Fan Red wire (+)
12V Battery (−) ─────────────────────► Fan Black wire (−)
```

---

## Step 6 — Start the Dashboard Server

On your **laptop** (connected to the same phone hotspot):

```powershell
cd "C:\Users\Yashas BR\OneDrive\Desktop\IISc_Prototyping"
npm run dev
```

The server starts on port 3001. Open: `http://localhost:5173`

---

## Step 7 — Switch Dashboard to CLOUD Mode

1. Open the dashboard at `http://localhost:5173`
2. Click the **mode button** in the header
3. Select **"CLOUD / WiFi"** mode
4. Power on the Arduino with the 12V battery
5. Within ~10 seconds, you should see:
   - Status badge: `CLOUD (WiFi)` with green dot
   - Live sensor cards updating every 2 seconds
   - The Alert Event Log confirming "Receiving Wi-Fi telemetry"

---

## Troubleshooting

| Problem | Fix |
|---------|-----|
| No data appears in dashboard | Check laptop IP in ESP8266 firmware matches current hotspot IP |
| ESP8266 won't connect to WiFi | Check hotspot SSID/password in firmware. Enable hotspot BEFORE powering board |
| "WiFi telemetry timeout" alert | Check DIP switches are in Normal Operation position |
| Arduino IDE can't upload to ESP8266 | Set GPIO0 switch to ON (flash mode), then set back to OFF after |
| Fan doesn't respond to dashboard toggle | Commands are polled — there's ~2 sec delay. Check server is running |
| Board resets on 12V battery | Use a battery that can supply ≥1A. Cheap power banks may cut out |

---

## What Each File Does

| File | Where it runs | Role |
|------|--------------|------|
| `arduino/smart_mold_prevention.ino` | ATmega2560 | Reads sensors, runs logic, sends JSON on Serial3 |
| `arduino/esp8266_wifi_bridge/esp8266_wifi_bridge.ino` | Onboard ESP8266 | Forwards JSON to server over WiFi, polls for commands |
| `server/data_source/WiFiDataSource.js` | Node.js server | Receives HTTP POST data, queues commands for ESP8266 to pick up |
| `server/data_source/DataSourceManager.js` | Node.js server | Routes CLOUD mode data through WiFiDataSource |
| `server/server.js` | Node.js server | POST /api/telemetry + GET /api/commands endpoints |
