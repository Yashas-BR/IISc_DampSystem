/*
 * ESP8266 Wi-Fi Bridge Firmware (Onboard ESP8266 on Arduino Mega 2560 WiFi R3)
 * 
 * This firmware runs on the ONBOARD ESP8266 chip of the Mega WiFi R3 clone.
 * It does NOT read any sensors itself — it acts purely as a Wi-Fi bridge:
 *
 * 1. Receives JSON telemetry from the ATmega2560 over Serial (shared UART).
 * 2. Connects to your phone hotspot via Wi-Fi.
 * 3. HTTP POSTs the JSON to the Node.js dashboard server.
 * 4. Polls GET /api/commands for any pending fan/LED toggle commands.
 * 5. Forwards received commands back to the ATmega2560 over Serial.
 *
 * ─── HOW TO FLASH THIS ONTO THE ONBOARD ESP8266 ───
 *
 * Your Mega WiFi R3 clone has DIP switches (usually 4 or 8 tiny toggles).
 * To flash the ESP8266:
 *   1. Set DIP switches to "ESP8266 Flash Mode":
 *      - Switch 1 (RXD):  ON
 *      - Switch 2 (TXD):  ON
 *      - Switch 3 (GPIO0): ON  (enables flash mode)
 *      - Switch 4 (GPIO15): varies by board (try OFF first)
 *      - All other switches: OFF
 *   2. In Arduino IDE:
 *      - Board: "Generic ESP8266 Module"
 *      - Flash Size: 4MB (or 1MB depending on your clone)
 *      - Upload Speed: 115200
 *      - Port: Same COM port as your Mega
 *   3. Upload this sketch.
 *   4. After upload, set DIP switches back to "Mega+ESP Communication Mode":
 *      - Switch 1 (RXD):  ON
 *      - Switch 2 (TXD):  ON
 *      - Switch 3 (GPIO0): OFF  (normal run mode)
 *      - Switch 4: OFF
 *
 * ─── IMPORTANT: UPDATE THESE VALUES ───
 * - ssid:      Your phone hotspot name
 * - password:  Your hotspot password
 * - serverUrl: Your laptop's IP on the hotspot network + port 3001
 *              (Run 'ipconfig' on your laptop to find the IP)
 */

#include <ESP8266WiFi.h>
#include <ESP8266HTTPClient.h>
#include <WiFiClient.h>

// ─── YOUR HOTSPOT CONFIGURATION ───
const char* ssid     = "Realmenarzo";        // Your Phone Hotspot SSID
const char* password = "9902510124";         // Your Hotspot Password

// ─── LAPTOP SERVER ADDRESS ───
// Open PowerShell on your laptop, run: ipconfig
// Find the IP under "Wireless LAN adapter Wi-Fi" → IPv4 Address
// Replace the IP below with YOUR laptop's IP on the hotspot network
const char* serverHost = "192.168.43.1";     // UPDATE THIS with your laptop IP
const int   serverPort = 3001;

// ─── Timing ───
unsigned long lastPostTime = 0;
const unsigned long POST_INTERVAL = 100;     // Minimum ms between POSTs (debounce)

// ─── Status LED (onboard ESP8266 LED, usually GPIO2) ───
#define STATUS_LED 2

void setup() {
  Serial.begin(115200);  // Shared UART with ATmega2560 via DIP switches
  pinMode(STATUS_LED, OUTPUT);
  digitalWrite(STATUS_LED, HIGH); // LED off (active low on most ESP8266)

  // Connect to Wi-Fi
  WiFi.mode(WIFI_STA);
  WiFi.begin(ssid, password);

  Serial.println();
  Serial.print("[ESP8266 Bridge] Connecting to hotspot '");
  Serial.print(ssid);
  Serial.print("'");

  int attempts = 0;
  while (WiFi.status() != WL_CONNECTED && attempts < 60) {
    delay(500);
    Serial.print(".");
    attempts++;
    // Blink LED while connecting
    digitalWrite(STATUS_LED, !digitalRead(STATUS_LED));
  }

  if (WiFi.status() == WL_CONNECTED) {
    Serial.println("\n[ESP8266 Bridge] Connected to Wi-Fi!");
    Serial.print("[ESP8266 Bridge] IP Address: ");
    Serial.println(WiFi.localIP());
    digitalWrite(STATUS_LED, LOW); // LED on = connected
  } else {
    Serial.println("\n[ESP8266 Bridge] FAILED to connect to Wi-Fi. Will keep retrying...");
    digitalWrite(STATUS_LED, HIGH); // LED off = not connected
  }
}

void loop() {
  // Ensure Wi-Fi stays connected
  if (WiFi.status() != WL_CONNECTED) {
    Serial.println("[ESP8266 Bridge] Wi-Fi disconnected. Reconnecting...");
    WiFi.reconnect();
    delay(3000);
    return;
  }

  // Check if ATmega2560 sent a JSON line over Serial
  if (Serial.available()) {
    String line = Serial.readStringUntil('\n');
    line.trim();

    // Only forward lines that look like JSON (start with '{')
    if (line.length() > 5 && line.startsWith("{")) {
      postTelemetry(line);
      pollCommands();
    }
  }
}

// ─── POST telemetry JSON to the Node.js server ───
void postTelemetry(String jsonPayload) {
  if (millis() - lastPostTime < POST_INTERVAL) return;
  lastPostTime = millis();

  WiFiClient client;
  HTTPClient http;

  String url = "http://" + String(serverHost) + ":" + String(serverPort) + "/api/telemetry";
  http.begin(client, url);
  http.addHeader("Content-Type", "application/json");
  http.setTimeout(3000);

  int httpCode = http.POST(jsonPayload);

  if (httpCode > 0) {
    // Blink LED briefly on successful POST
    digitalWrite(STATUS_LED, HIGH);
    delay(20);
    digitalWrite(STATUS_LED, LOW);
  } else {
    Serial.print("[ESP8266 Bridge] POST failed: ");
    Serial.println(http.errorToString(httpCode));
  }

  http.end();
}

// ─── Poll for pending commands from the dashboard ───
void pollCommands() {
  WiFiClient client;
  HTTPClient http;

  String url = "http://" + String(serverHost) + ":" + String(serverPort) + "/api/commands";
  http.begin(client, url);
  http.setTimeout(2000);

  int httpCode = http.GET();

  if (httpCode == 200) {
    String response = http.getString();

    // Simple parsing: look for fan/led commands in the response JSON
    // Response shape: {"commands":[{"fan":true},{"led":false}]}
    if (response.indexOf("\"fan\":true") != -1) {
      Serial.println("{\"fan\":true}");  // Forward to ATmega2560
    }
    if (response.indexOf("\"fan\":false") != -1) {
      Serial.println("{\"fan\":false}");
    }
    if (response.indexOf("\"led\":true") != -1) {
      Serial.println("{\"led\":true}");
    }
    if (response.indexOf("\"led\":false") != -1) {
      Serial.println("{\"led\":false}");
    }
  }

  http.end();
}
