/*
 * Smart Damp & Mold Prevention System - Arduino Mega 2560 WiFi R3 Firmware
 * 
 * This board has an onboard ESP8266 that shares Serial3 (pins TX3=14, RX3=15)
 * with the ATmega2560.  The Mega reads all sensors, runs the automation logic,
 * and prints a JSON packet on BOTH Serial0 (USB debug) and Serial3 (to ESP8266).
 *
 * The ESP8266 is flashed separately (see esp8266_wifi_bridge.ino) and forwards
 * the JSON over HTTP POST to the Node.js dashboard server.
 *
 * Hardware Pin Mapping:
 * - DHT11 Temp & Humidity Sensor: Digital Pin D2
 * - Relay (Exhaust Fan):          Digital Pin D5
 * - Warning LED:                  Digital Pin D13
 * - LDR Light Sensor:             Analog Pin A0
 * - MQ135 Gas Sensor:             Analog Pin A1
 * - Capacitive Moisture Sensor:   Analog Pin A2
 * - ESP8266 TX3 (to ESP RX):      Digital Pin 14
 * - ESP8266 RX3 (from ESP TX):    Digital Pin 15
 */

// --- PIN CONFIGURATION ---
#define DHT_PIN 2
#define RELAY_PIN 5
#define LED_PIN 13
#define LDR_PIN A0
#define MQ135_PIN A1
#define MOISTURE_PIN A2

// --- THRESHOLD CONSTANTS ---
#define HUMIDITY_THRESH 60.0
#define TEMP_THRESH 30.0
#define GAS_THRESH 700
#define MOISTURE_THRESH 400
#define LIGHT_THRESH 500

unsigned long lastLogTime = 0;
const unsigned long LOG_INTERVAL = 2000; // 2 seconds

float currentTemp = 25.0;
float currentHumidity = 54.0;
bool fanState = false;
bool ledState = false;

// --- Self-Contained DHT11 Protocol Driver (No library needed) ---
bool readDHT11(uint8_t pin, float &t, float &h) {
  uint8_t data[5] = {0, 0, 0, 0, 0};
  
  pinMode(pin, OUTPUT);
  digitalWrite(pin, LOW);
  delay(18);
  digitalWrite(pin, HIGH);
  delayMicroseconds(40);
  pinMode(pin, INPUT_PULLUP);

  unsigned long timeout = micros();
  while (digitalRead(pin) == HIGH) { if (micros() - timeout > 200) return false; }
  while (digitalRead(pin) == LOW)  { if (micros() - timeout > 200) return false; }
  while (digitalRead(pin) == HIGH) { if (micros() - timeout > 200) return false; }

  for (int i = 0; i < 40; i++) {
    while (digitalRead(pin) == LOW);
    unsigned long tStart = micros();
    while (digitalRead(pin) == HIGH);
    if ((micros() - tStart) > 40) {
      data[i / 8] |= (1 << (7 - (i % 8)));
    }
  }

  if (data[4] == ((data[0] + data[1] + data[2] + data[3]) & 0xFF) && (data[0] > 0 || data[2] > 0)) {
    h = data[0] + data[1] * 0.1;
    t = data[2] + data[3] * 0.1;
    return true;
  }
  return false;
}

void setup() {
  Serial.begin(9600);    // USB debug monitor
  Serial3.begin(115200); // To onboard ESP8266

  pinMode(RELAY_PIN, OUTPUT);
  pinMode(LED_PIN, OUTPUT);
  digitalWrite(RELAY_PIN, LOW);
  digitalWrite(LED_PIN, LOW);

  Serial.println("====================================================");
  Serial.println("DAMP, AIR QUALITY & AUTOMATED VENTILATION SYSTEM");
  Serial.println("(WiFi Mode — Serial3 → ESP8266 → HTTP POST)");
  Serial.println("====================================================");
  Serial.println("System Initialization Complete. Beginning Data Log...");
}

void loop() {
  // Read commands from ESP8266 (Serial3) — fan/LED toggles from dashboard
  if (Serial3.available() > 0) {
    String cmd = Serial3.readStringUntil('\n');
    cmd.trim();
    processCommand(cmd);
  }

  // Also accept USB commands for debugging
  if (Serial.available() > 0) {
    String cmd = Serial.readStringUntil('\n');
    cmd.trim();
    processCommand(cmd);
  }

  // Periodic Sensor Read & Data Log
  if (millis() - lastLogTime >= LOG_INTERVAL) {
    lastLogTime = millis();

    // Read DHT11 Sensor
    float readT, readH;
    if (readDHT11(2, readT, readH)) {
      currentTemp = readT;
      currentHumidity = readH;
    }

    // Read Analog Sensors
    int lightVal = analogRead(LDR_PIN);
    int gasVal = analogRead(MQ135_PIN);
    int moistureVal = analogRead(MOISTURE_PIN);

    // Automation Logic (AND gate for fan, OR gate for LED)
    if (currentHumidity > HUMIDITY_THRESH && currentTemp > TEMP_THRESH) {
      fanState = true;
      digitalWrite(RELAY_PIN, HIGH);
    } else {
      fanState = false;
      digitalWrite(RELAY_PIN, LOW);
    }

    if (currentHumidity > HUMIDITY_THRESH || currentTemp > TEMP_THRESH || gasVal > GAS_THRESH || moistureVal < MOISTURE_THRESH || lightVal < LIGHT_THRESH) {
      ledState = true;
      digitalWrite(LED_PIN, HIGH);
    } else {
      ledState = false;
      digitalWrite(LED_PIN, LOW);
    }

    String sysStatus = (fanState || ledState) ? "WARNING" : "NORMAL";

    // Build JSON payload
    String json = "{";
    json += "\"temperature\":" + String(currentTemp, 1) + ",";
    json += "\"humidity\":" + String(currentHumidity, 1) + ",";
    json += "\"light\":" + String(lightVal) + ",";
    json += "\"gas\":" + String(gasVal) + ",";
    json += "\"moisture\":" + String(moistureVal) + ",";
    json += "\"fan\":" + String(fanState ? "true" : "false") + ",";
    json += "\"led\":" + String(ledState ? "true" : "false") + ",";
    json += "\"status\":\"" + sysStatus + "\"";
    json += "}";

    // Send JSON to ESP8266 over Serial3 (for WiFi HTTP POST)
    Serial3.println(json);

    // Also print to USB Serial for debug
    Serial.print("[WiFi TX] ");
    Serial.println(json);
  }
}

void processCommand(String cmd) {
  if (cmd.indexOf("\"fan\":true") != -1) {
    digitalWrite(RELAY_PIN, HIGH);
    fanState = true;
    Serial.println("[CMD] Fan ON");
  } else if (cmd.indexOf("\"fan\":false") != -1) {
    digitalWrite(RELAY_PIN, LOW);
    fanState = false;
    Serial.println("[CMD] Fan OFF");
  }

  if (cmd.indexOf("\"led\":true") != -1) {
    digitalWrite(LED_PIN, HIGH);
    ledState = true;
    Serial.println("[CMD] LED ON");
  } else if (cmd.indexOf("\"led\":false") != -1) {
    digitalWrite(LED_PIN, LOW);
    ledState = false;
    Serial.println("[CMD] LED OFF");
  }
}
