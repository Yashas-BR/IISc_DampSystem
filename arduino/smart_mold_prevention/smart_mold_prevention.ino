/*
 * Smart Damp & Mold Prevention System - Arduino Mega 2560 Firmware
 * 
 * Fixed Bugs:
 * 1. Mapped explicitly to Active-Low Relay Modules (LOW = ON, HIGH = OFF)
 * 2. Added isManualMode flag so Laptop commands aren't instantly overwritten by sensors.
 * 3. Wrapped text strings in F() macro to save Arduino dynamic RAM stability.
 * 
 * Zero External Dependencies (No DHT.h library needed to compile!)
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
bool isManualMode = false; // Protects manual laptop controls from sensor loops

// --- Self-Contained DHT11 Protocol Driver ---
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
  Serial.begin(9600); 

  pinMode(RELAY_PIN, OUTPUT);
  pinMode(LED_PIN, OUTPUT);
  
  // SAFE STARTUP STATE FOR ACTIVE-LOW RELAYS: HIGH keeps the physical fan OFF
  digitalWrite(RELAY_PIN, HIGH); 
  digitalWrite(LED_PIN, LOW);

  Serial.println(F("===================================================="));
  Serial.println(F("DAMP, AIR QUALITY & AUTOMATED VENTILATION SYSTEM"));
  Serial.println(F("===================================================="));
  Serial.println(F("System Initialization Complete. Beginning Data Log..."));
}

void loop() {
  // Read Serial Commands from Laptop (Manual Actuator Overrides)
  if (Serial.available() > 0) {
    String cmd = Serial.readStringUntil('\n');
    cmd.trim();

    if (cmd.indexOf("\"fan\":true") != -1) {
      isManualMode = true; 
      digitalWrite(RELAY_PIN, LOW); // Active-Low ON
      fanState = true;
    } else if (cmd.indexOf("\"fan\":false") != -1) {
      isManualMode = true; 
      digitalWrite(RELAY_PIN, HIGH); // Active-Low OFF
      fanState = false;
    }

    if (cmd.indexOf("\"led\":true") != -1) {
      isManualMode = true; 
      digitalWrite(LED_PIN, HIGH);
      ledState = true;
    } else if (cmd.indexOf("\"led\":false") != -1) {
      isManualMode = true; 
      digitalWrite(LED_PIN, LOW);
      ledState = false;
    }

    // Command to exit override state and hand control back to the automated loop
    if (cmd.indexOf("\"auto\":true") != -1) {
      isManualMode = false;
      Serial.println(F("[SYSTEM] Manual Override Disengaged. Automation Active."));
    }
  }

  // Periodic Sensor Read & Data Log
  if (millis() - lastLogTime >= LOG_INTERVAL) {
    lastLogTime = millis();

    // Read DHT11 Sensor
    float readT, readH;
    if (readDHT11(DHT_PIN, readT, readH)) {
      currentTemp = readT;
      currentHumidity = readH;
    }

    // Read Analog Sensors
    int lightVal = analogRead(LDR_PIN);
    int gasVal = analogRead(MQ135_PIN);
    int moistureVal = analogRead(MOISTURE_PIN);

    // Automation rules only apply when no active laptop serial manual control is requested
    if (!isManualMode) {
      // Corrected Rule Logic for Active-Low Relay Modules
      if (currentHumidity > HUMIDITY_THRESH || gasVal > GAS_THRESH) {
        fanState = true;
        digitalWrite(RELAY_PIN, LOW);   // Active-Low Relay ON (Engages Fan)
      } else {
        fanState = false;
        digitalWrite(RELAY_PIN, HIGH);  // Active-Low Relay OFF (Stops Fan)
      }

      // Rule Logic for Warning LED
      if (currentHumidity > HUMIDITY_THRESH || currentTemp > TEMP_THRESH || gasVal > GAS_THRESH || moistureVal < MOISTURE_THRESH || lightVal < LIGHT_THRESH) {
        ledState = true;
        digitalWrite(LED_PIN, HIGH);
      } else {
        ledState = false;
        digitalWrite(LED_PIN, LOW);
      }
    }

    // Determine the descriptive status tag output string
    String sysStatus;
    if (isManualMode) {
      sysStatus = "MANUAL OVERRIDE";
    } else {
      sysStatus = (fanState || ledState) ? "WARNING" : "NORMAL";
    }

    // Print Telemetry Line
    Serial.print(F("Temp: "));
    Serial.print(currentTemp, 1);
    Serial.print(F("°C | Air Humid: "));
    Serial.print(currentHumidity, 1);
    Serial.print(F("% | Light: "));
    Serial.print(lightVal);
    Serial.print(F(" | Gas Level: "));
    Serial.print(gasVal);
    Serial.print(F(" | Surf Moist: "));
    Serial.print(moistureVal);
    Serial.print(F(" -> [STATUS: "));
    Serial.print(sysStatus);
    Serial.println(F("]"));
  }
}
