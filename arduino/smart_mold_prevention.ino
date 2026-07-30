/*
 * Smart Damp & Mold Prevention System - Arduino Mega 2560 Firmware
 * 
 * Hardware Pin Mapping:
 * - DHT11 Temperature & Humidity Sensor -> Pin D2
 * - Relay Module (Exhaust Fan Control)   -> Pin D5
 * - Warning LED                          -> Pin D13
 * - LDR Ambient Light Sensor             -> Pin A0
 * - MQ135 Air Quality / Gas Sensor       -> Pin A1
 * - Capacitive Moisture Sensor           -> Pin A2
 * 
 * Serial Output: JSON every 2000 ms at 115200 Baud Rate.
 */

#include <DHT.h>

#define DHTPIN 2
#define DHTTYPE DHT11

#define RELAY_PIN 5
#define LED_PIN 13

#define LDR_PIN A0
#define MQ135_PIN A1
#define MOISTURE_PIN A2

// Threshold Defaults
#define HUMIDITY_THRESH 60.0
#define TEMP_THRESH 30.0
#define GAS_THRESH 700
#define MOISTURE_THRESH 400

DHT dht(DHTPIN, DHTTYPE);

// System States
bool fanState = false;
bool ledState = false;
unsigned long lastSensorRead = 0;
const unsigned long INTERVAL = 2000;

void setup() {
  Serial.begin(115200);
  
  pinMode(RELAY_PIN, OUTPUT);
  pinMode(LED_PIN, OUTPUT);
  
  // Active low or high relay initialization (Assuming Relay LOW = OFF, HIGH = ON)
  digitalWrite(RELAY_PIN, LOW);
  digitalWrite(LED_PIN, LOW);
  
  dht.begin();
  
  // Warm up sensors
  delay(1000);
}

void loop() {
  // Check for incoming remote commands over Serial (e.g. {"fan":true})
  checkIncomingSerialCommands();

  unsigned long currentMillis = millis();
  if (currentMillis - lastSensorRead >= INTERVAL) {
    lastSensorRead = currentMillis;

    // Read Sensors
    float humidity = dht.readHumidity();
    float temperature = dht.readTemperature();

    // Fallback if DHT read fails
    if (isnan(humidity)) humidity = 45.0;
    if (isnan(temperature)) temperature = 24.5;

    int lightVal = analogRead(LDR_PIN);
    int gasVal = analogRead(MQ135_PIN);
    int moistureVal = analogRead(MOISTURE_PIN);

    // Rule Logic for Actuators
    // High humidity (>60%) or high gas (>700) triggers Exhaust Fan Relay
    if (humidity > HUMIDITY_THRESH || gasVal > GAS_THRESH) {
      fanState = true;
    } else {
      fanState = false;
    }

    // High mold risk conditions trigger Warning LED
    if (humidity > HUMIDITY_THRESH || temperature > TEMP_THRESH || gasVal > GAS_THRESH || moistureVal < MOISTURE_THRESH) {
      ledState = true;
    } else {
      ledState = false;
    }

    // Set Physical Outputs
    digitalWrite(RELAY_PIN, fanState ? HIGH : LOW);
    digitalWrite(LED_PIN, ledState ? HIGH : LOW);

    // Determine System Status String
    String statusStr = "NORMAL";
    if (humidity > 75.0 || gasVal > 850 || temperature > 38.0) {
      statusStr = "CRITICAL";
    } else if (humidity > HUMIDITY_THRESH || temperature > TEMP_THRESH || gasVal > GAS_THRESH || moistureVal < MOISTURE_THRESH) {
      statusStr = "WARNING";
    }

    // Output Formatted JSON
    Serial.print("{");
    Serial.print("\"temperature\":"); Serial.print(temperature, 1); Serial.print(",");
    Serial.print("\"humidity\":"); Serial.print((int)humidity); Serial.print(",");
    Serial.print("\"light\":"); Serial.print(lightVal); Serial.print(",");
    Serial.print("\"gas\":"); Serial.print(gasVal); Serial.print(",");
    Serial.print("\"moisture\":"); Serial.print(moistureVal); Serial.print(",");
    Serial.print("\"fan\":"); Serial.print(fanState ? "true" : "false"); Serial.print(",");
    Serial.print("\"led\":"); Serial.print(ledState ? "true" : "false"); Serial.print(",");
    Serial.print("\"status\":\""); Serial.print(statusStr); Serial.print("\"");
    Serial.println("}");
  }
}

void checkIncomingSerialCommands() {
  if (Serial.available() > 0) {
    String input = Serial.readStringUntil('\n');
    input.trim();

    if (input.indexOf("\"fan\":true") != -1) {
      fanState = true;
      digitalWrite(RELAY_PIN, HIGH);
    } else if (input.indexOf("\"fan\":false") != -1) {
      fanState = false;
      digitalWrite(RELAY_PIN, LOW);
    }

    if (input.indexOf("\"led\":true") != -1) {
      ledState = true;
      digitalWrite(LED_PIN, HIGH);
    } else if (input.indexOf("\"led\":false") != -1) {
      ledState = false;
      digitalWrite(LED_PIN, LOW);
    }
  }
}
