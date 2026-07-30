import React, { useState } from 'react';
import {
  Info,
  Cpu,
  Code,
  Copy,
  Check,
  Zap,
  Layers,
  ShieldCheck,
  Radio,
  FileCode
} from 'lucide-react';

export const AboutPage: React.FC = () => {
  const [copied, setCopied] = useState(false);

  const arduinoCode = `/*
 * Smart Damp & Mold Prevention System - Arduino Mega 2560 Firmware
 * Hardware Pin Mapping:
 * - DHT11 Temperature & Humidity Sensor -> Pin D2
 * - Relay Module (Exhaust Fan Control)   -> Pin D5
 * - Warning LED                          -> Pin D13
 * - LDR Ambient Light Sensor             -> Pin A0
 * - MQ135 Air Quality / Gas Sensor       -> Pin A1
 * - Capacitive Moisture Sensor           -> Pin A2
 */

#include <DHT.h>

#define DHTPIN 2
#define DHTTYPE DHT11
#define RELAY_PIN 5
#define LED_PIN 13
#define LDR_PIN A0
#define MQ135_PIN A1
#define MOISTURE_PIN A2

DHT dht(DHTPIN, DHTTYPE);
bool fanState = false;
bool ledState = false;
unsigned long lastRead = 0;

void setup() {
  Serial.begin(115200);
  pinMode(RELAY_PIN, OUTPUT);
  pinMode(LED_PIN, OUTPUT);
  dht.begin();
}

void loop() {
  if (millis() - lastRead >= 2000) {
    lastRead = millis();
    float h = dht.readHumidity();
    float t = dht.readTemperature();
    int lightVal = analogRead(LDR_PIN);
    int gasVal = analogRead(MQ135_PIN);
    int moistureVal = analogRead(MOISTURE_PIN);

    fanState = (h > 60.0 || gasVal > 700);
    ledState = (h > 60.0 || t > 30.0 || gasVal > 700 || moistureVal < 400);

    digitalWrite(RELAY_PIN, fanState ? HIGH : LOW);
    digitalWrite(LED_PIN, ledState ? HIGH : LOW);

    Serial.print("{\"temperature\":"); Serial.print(t, 1);
    Serial.print(",\"humidity\":"); Serial.print((int)h);
    Serial.print(",\"light\":"); Serial.print(lightVal);
    Serial.print(",\"gas\":"); Serial.print(gasVal);
    Serial.print(",\"moisture\":"); Serial.print(moistureVal);
    Serial.print(",\"fan\":"); Serial.print(fanState ? "true" : "false");
    Serial.print(",\"led\":"); Serial.print(ledState ? "true" : "false");
    Serial.print(",\"status\":\""); Serial.print(ledState ? "WARNING" : "NORMAL");
    Serial.println("\"}");
  }
}`;

  const copyCode = () => {
    navigator.clipboard.writeText(arduinoCode);
    setCopied(true);
    setTimeout(() => setCopied(false), 2000);
  };

  const pinMappings = [
    { component: 'DHT11 Temp & Humidity Sensor', pin: 'D2 (Digital Input)', role: 'Ambient Temp (°C) & Relative Humidity (%)' },
    { component: 'Relay Module (Exhaust Fan)', pin: 'D5 (Digital Output)', role: 'Active Ventilation Relay Control' },
    { component: 'Warning Indicator LED', pin: 'D13 (Digital Output)', role: 'Visual Mold Hazard Alert Signal' },
    { component: 'LDR Ambient Light Sensor', pin: 'A0 (Analog Input)', role: 'Surface Illumination (0-1023 ADC)' },
    { component: 'MQ135 Gas / Air Quality', pin: 'A1 (Analog Input)', role: 'Airborne VOC & Smoke Sensing (0-1023 ADC)' },
    { component: 'Capacitive Soil Moisture', pin: 'A2 (Analog Input)', role: 'Surface Dampness Detection (0-1023 ADC)' }
  ];

  return (
    <div className="space-y-6 max-w-5xl mx-auto">
      {/* Header */}
      <div>
        <h2 className="text-xl font-bold text-white flex items-center gap-2">
          <Info className="h-5 w-5 text-emerald-400" />
          <span>System Architecture & Hardware Specs</span>
        </h2>
        <p className="text-xs text-slate-400 mt-1">
          Detailed hardware pinout, clean software architecture breakdown, and Arduino C++ firmware sketch.
        </p>
      </div>

      {/* Pin Mapping Card */}
      <div className="glass-panel rounded-2xl p-6 border border-slate-800 shadow-2xl">
        <h3 className="text-sm font-bold text-white mb-4 border-b border-slate-800 pb-3 flex items-center gap-2">
          <Cpu className="h-4 w-4 text-emerald-400" />
          <span>Arduino Mega 2560 Hardware Wiring Pinout</span>
        </h3>

        <div className="overflow-x-auto">
          <table className="w-full text-left text-xs">
            <thead className="bg-slate-900/80 text-slate-400 uppercase font-mono text-[10px]">
              <tr>
                <th className="p-3">Sensor / Actuator Component</th>
                <th className="p-3">Target Pin</th>
                <th className="p-3">Functional Role</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-slate-800/60 font-mono">
              {pinMappings.map((pm, idx) => (
                <tr key={idx} className="hover:bg-slate-900/40">
                  <td className="p-3 text-white font-semibold font-sans">{pm.component}</td>
                  <td className="p-3 text-cyan-400 font-bold">{pm.pin}</td>
                  <td className="p-3 text-slate-300 font-sans">{pm.role}</td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </div>

      {/* Arduino Firmware Viewer */}
      <div className="glass-panel rounded-2xl p-6 border border-slate-800 shadow-2xl space-y-3">
        <div className="flex items-center justify-between border-b border-slate-800 pb-3">
          <div className="flex items-center gap-2">
            <FileCode className="h-4 w-4 text-cyan-400" />
            <h3 className="text-sm font-bold text-white">Arduino Mega 2560 Firmware C++ Code</h3>
          </div>
          <button
            onClick={copyCode}
            className="flex items-center gap-1.5 rounded-lg bg-slate-800 px-3 py-1.5 text-xs text-emerald-400 border border-slate-700 hover:bg-slate-700 transition-all font-mono"
          >
            {copied ? <Check className="h-3.5 w-3.5" /> : <Copy className="h-3.5 w-3.5" />}
            <span>{copied ? 'Copied!' : 'Copy Sketch'}</span>
          </button>
        </div>

        <pre className="bg-slate-950 p-4 rounded-xl text-xs font-mono text-emerald-300 overflow-x-auto border border-slate-900 leading-relaxed max-h-96">
          {arduinoCode}
        </pre>
      </div>
    </div>
  );
};
