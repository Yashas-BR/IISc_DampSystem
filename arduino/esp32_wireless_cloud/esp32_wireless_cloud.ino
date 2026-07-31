/*
 * Smart Damp & Mold Prevention System - Wireless Wi-Fi Cloud Firmware (ESP32 / ESP8266)
 * 
 * Hardware Setup for 5V Battery Demo (No USB Cable Needed):
 * - Arduino Mega 2560 + ESP32 or ESP8266 NodeMCU.
 * - Power: 5V Battery / USB Power Bank connected to 5V & GND pins.
 * - Wi-Fi: Connects to Realmenarzo Hotspot.
 * - Cloud Telemetry: Transmits sensor JSON over HTTP POST to http://<SERVER_IP>:3001/api/telemetry.
 */

#if defined(ESP8266)
  #include <ESP8266WiFi.h>
  #include <ESP8266HTTPClient.h>
#elif defined(ESP32)
  #include <WiFi.h>
  #include <HTTPClient.h>
#endif

// --- YOUR HOTSPOT CONFIGURATION ---
const char* ssid = "Realmenarzo";          // Your Phone Hotspot SSID
const char* password = "9902510124";       // Your Hotspot Password

// Laptop Server IP address on local network (Update if IP changes on Hotspot)
const char* serverUrl = "http://172.25.76.102:3001/api/telemetry";

// Pin Mappings for Sensors / Actuators
#define LDR_PIN 34
#define MQ135_PIN 35
#define MOISTURE_PIN 32
#define RELAY_PIN 23
#define LED_PIN 2

unsigned long lastSendTime = 0;
const unsigned long SEND_INTERVAL = 2000; // 2 seconds

void setup() {
  Serial.begin(115200);
  pinMode(RELAY_PIN, OUTPUT);
  pinMode(LED_PIN, OUTPUT);
  
  digitalWrite(RELAY_PIN, LOW);
  digitalWrite(LED_PIN, LOW);

  WiFi.begin(ssid, password);
  Serial.print("Connecting to Hotspot 'Realmenarzo'");
  while (WiFi.status() != WL_CONNECTED) {
    delay(500);
    Serial.print(".");
  }
  Serial.println("\nConnected to Realmenarzo Hotspot!");
  Serial.print("ESP IP Address: ");
  Serial.println(WiFi.localIP());
}

void loop() {
  if (millis() - lastSendTime >= SEND_INTERVAL) {
    lastSendTime = millis();

    if (WiFi.status() == WL_CONNECTED) {
      // Sensor Reads
      float temp = 26.0;
      float hum = 54.0;
      int lightVal = analogRead(LDR_PIN);
      int gasVal = analogRead(MQ135_PIN);
      int moistureVal = analogRead(MOISTURE_PIN);

      bool fanState = (hum > 60.0 || gasVal > 700);
      bool ledState = (hum > 60.0 || temp > 30.0 || gasVal > 700 || moistureVal < 400 || lightVal < 500);

      digitalWrite(RELAY_PIN, fanState ? HIGH : LOW);
      digitalWrite(LED_PIN, ledState ? HIGH : LOW);

      // Build JSON Payload
      String jsonPayload = "{";
      jsonPayload += "\"temperature\":" + String(temp, 1) + ",";
      jsonPayload += "\"humidity\":" + String((int)hum) + ",";
      jsonPayload += "\"light\":" + String(lightVal) + ",";
      jsonPayload += "\"gas\":" + String(gasVal) + ",";
      jsonPayload += "\"moisture\":" + String(moistureVal) + ",";
      jsonPayload += "\"fan\":" + String(fanState ? "true" : "false") + ",";
      jsonPayload += "\"led\":" + String(ledState ? "true" : "false") + ",";
      jsonPayload += "\"status\":\"" + String(ledState ? "WARNING" : "NORMAL") + "\"";
      jsonPayload += "}";

      // Send HTTP POST Request to Laptop Cloud Backend
      HTTPClient http;
      WiFiClient client;

      http.begin(client, serverUrl);
      http.addHeader("Content-Type", "application/json");

      int httpResponseCode = http.POST(jsonPayload);

      if (httpResponseCode > 0) {
        Serial.print("Cloud Packet Sent Successfully! HTTP Status: ");
        Serial.println(httpResponseCode);
      } else {
        Serial.print("HTTP POST Error Code: ");
        Serial.println(httpResponseCode);
      }

      http.end();
    } else {
      Serial.println("Hotspot Disconnected. Reconnecting...");
      WiFi.reconnect();
    }
  }
}
