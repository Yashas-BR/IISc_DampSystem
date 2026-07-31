import React, { useState } from 'react';
import { useSocket } from '../context/SocketContext';
import {
  Thermometer,
  Droplets,
  Wind,
  Sun,
  Layers,
  Fan,
  Lightbulb,
  Zap,
  Clock,
  Settings,
  Cpu,
  CheckCircle2,
  AlertTriangle,
  Flame,
  Activity,
  BarChart3,
  TrendingUp,
  ShieldAlert,
  GitMerge,
  FlaskConical,
  Gauge,
  Bell,
  BellOff,
  Trash2,
  Home,
  DoorOpen,
  Beaker
} from 'lucide-react';
import {
  ResponsiveContainer,
  AreaChart,
  Area,
  LineChart,
  Line,
  BarChart,
  Bar,
  XAxis,
  YAxis,
  Tooltip,
  CartesianGrid,
  ReferenceLine,
  Legend
} from 'recharts';

export const DashboardPage: React.FC = () => {
  const {
    latestTelemetry,
    telemetryHistory,
    settings,
    updateSettings,
    resetSettings,
    sendCommand,
    alerts,
    acknowledgeAlert,
    clearAlerts
  } = useSocket();

  const [showSettings, setShowSettings] = useState(false);
  const [formSettings, setFormSettings] = useState({ ...settings });
  const [saveMsg, setSaveMsg] = useState(false);

  const temp = latestTelemetry?.temperature ?? 24.5;
  const hum = latestTelemetry?.humidity ?? 52;
  const gas = latestTelemetry?.gas ?? 350;
  const light = latestTelemetry?.light ?? 480;
  const moisture = latestTelemetry?.moisture ?? 720;
  const fanState = latestTelemetry?.fan ?? false;
  const ledState = latestTelemetry?.led ?? false;
  const status = latestTelemetry?.status ?? 'NORMAL';
  const riskScore = latestTelemetry?.riskScore ?? 28;
  const timestamp = latestTelemetry?.timestamp
    ? new Date(latestTelemetry.timestamp).toLocaleTimeString()
    : 'Live Sync';

  const hThresh = Number(settings.humidity_thresh || 60);
  const tThresh = Number(settings.temp_thresh || 30);
  const gThresh = Number(settings.gas_thresh || 700);
  const mThresh = Number(settings.moisture_thresh || 400);

  // ── Feature 2: Derived Science Metrics (from Technical Report formulas) ──
  // Dew Point: Magnus approximation (°C). Condensation starts when Td ≈ surface temp.
  const dewPoint = parseFloat((temp - ((100 - hum) / 5)).toFixed(1));
  // Absolute Humidity: mass of water vapor per m³ of air (g/m³)
  const absHumidity = parseFloat(
    (6.112 * Math.exp((17.67 * temp) / (temp + 243.5)) * hum * 2.1674 / (273.15 + temp)).toFixed(2)
  );
  // Mold Growth Index: composite 0–100 score
  const moistureRisk = moisture < mThresh ? (mThresh - moisture) / mThresh * 100 : 0;
  const moldIndex = Math.min(100, Math.round(
    (hum * 0.4) + (temp / 50 * 30) + (gas / 1023 * 20) + (moistureRisk * 0.1)
  ));
  // Wardrobe Enclosure Risk: dark + stagnant air combo
  const enclosureDark = light < 300;
  const airStagnant = gas > gThresh;
  const wardrobeRiskScore = Math.round(
    ((300 - Math.min(300, light)) / 300 * 50) + (Math.min(gas, 1023) / 1023 * 50)
  );

  // ── Feature 1: Logic Gate Conditions ──
  const condTempHigh = temp > tThresh;
  const condHumHigh = hum > hThresh;
  const logicGateTriggered = condTempHigh && condHumHigh;

  // ── Feature 3: Room Health Scores ──
  const room1Score = Math.min(100, Math.round(
    (hum / hThresh * 40) + (temp / tThresh * 30) + (moisture < mThresh ? 30 : 0)
  ));
  const room1Health = room1Score > 70 ? 'DANGER' : room1Score > 40 ? 'CAUTION' : 'SAFE';
  const room2Score = Math.min(100, Math.round(
    (gas / gThresh * 60) + (light < 300 ? 40 : 0)
  ));
  const room2Health = room2Score > 70 ? 'HAZARD' : room2Score > 40 ? 'STAGNANT' : 'VENTILATED';

  const chartData = telemetryHistory.slice(-30).map((t, idx) => ({
    time: t.timestamp ? new Date(t.timestamp).toLocaleTimeString() : `#${idx}`,
    Temperature: t.temperature,
    Humidity: t.humidity,
    Gas: t.gas,
    Moisture: t.moisture,
    Light: t.light,
    RiskScore: t.riskScore || Math.round((t.humidity * 0.35) + (t.gas / 1023 * 25) + (t.temperature / 50 * 15))
  }));

  const handleSaveSettings = (e: React.FormEvent) => {
    e.preventDefault();
    updateSettings(formSettings);
    setSaveMsg(true);
    setTimeout(() => setSaveMsg(false), 2000);
  };

  return (
    <div className="space-y-6">
      {/* Top Overview Bar: Risk Index & Hardware Status */}
      <div className="grid grid-cols-1 gap-6 lg:grid-cols-3">
        {/* Risk Score & System Status */}
        <div className="lg:col-span-2 glass-panel rounded-2xl p-5 border border-slate-800 shadow-2xl flex flex-col justify-between">
          <div className="flex flex-wrap items-center justify-between gap-4">
            <div>
              <span className="text-[11px] font-mono font-bold tracking-wider uppercase text-emerald-400">
                Mold & Damp Risk Assessment
              </span>
              <h2 className="text-xl font-bold text-white mt-0.5">
                Live Sensor Risk Meter
              </h2>
            </div>

            <div className="flex items-center gap-3">
              <span className={`px-3 py-1 rounded-xl text-xs font-bold font-mono uppercase border flex items-center gap-1.5 ${
                status === 'CRITICAL'
                  ? 'bg-rose-950 text-rose-300 border-rose-600 animate-pulse'
                  : status === 'WARNING'
                  ? 'bg-amber-950 text-amber-300 border-amber-600'
                  : 'bg-emerald-950 text-emerald-300 border-emerald-600'
              }`}>
                {status === 'CRITICAL' ? (
                  <Flame className="h-4 w-4 text-rose-400 animate-bounce" />
                ) : status === 'WARNING' ? (
                  <AlertTriangle className="h-4 w-4 text-amber-400" />
                ) : (
                  <CheckCircle2 className="h-4 w-4 text-emerald-400" />
                )}
                <span>{status}</span>
              </span>

              <button
                onClick={() => setShowSettings(!showSettings)}
                className="flex items-center gap-1.5 rounded-xl bg-slate-900 px-3 py-1.5 text-xs font-semibold text-slate-300 border border-slate-800 hover:bg-slate-800 transition-all"
              >
                <Settings className="h-3.5 w-3.5 text-emerald-400" />
                <span>Thresholds</span>
              </button>
            </div>
          </div>

          <div className="grid grid-cols-1 sm:grid-cols-2 gap-6 items-center mt-4">
            {/* Risk Gauge Circle */}
            <div className="flex items-center gap-5">
              <div className="relative flex items-center justify-center h-24 w-24 rounded-full border-4 border-slate-800 bg-slate-950 shadow-inner shrink-0">
                <svg className="h-full w-full transform -rotate-90" viewBox="0 0 36 36">
                  <path className="text-slate-800" strokeWidth="3.5" stroke="currentColor" fill="none" d="M18 2.0845 a 15.9155 15.9155 0 0 1 0 31.831 a 15.9155 15.9155 0 0 1 0 -31.831" />
                  <path
                    className={riskScore > 65 ? 'text-rose-500' : riskScore > 35 ? 'text-amber-400' : 'text-emerald-400'}
                    strokeDasharray={`${riskScore}, 100`}
                    strokeWidth="3.5"
                    strokeLinecap="round"
                    stroke="currentColor"
                    fill="none"
                    d="M18 2.0845 a 15.9155 15.9155 0 0 1 0 31.831 a 15.9155 15.9155 0 0 1 0 -31.831"
                  />
                </svg>
                <div className="absolute flex flex-col items-center">
                  <span className="text-xl font-black font-mono text-white">{riskScore}%</span>
                  <span className="text-[8px] uppercase tracking-wider text-slate-400 font-semibold">Risk</span>
                </div>
              </div>

              <div>
                <h4 className="text-xs font-bold text-white">
                  {riskScore > 65 ? 'High Damp Hazard' : riskScore > 35 ? 'Moderate Accumulation' : 'Optimal Environment'}
                </h4>
                <p className="text-[11px] text-slate-400 mt-0.5">
                  {riskScore > 65 ? 'Exhaust Fan engaged to clear moisture.' : riskScore > 35 ? 'Monitoring humidity threshold.' : 'All sensor levels inside safe limits.'}
                </p>
                <div className="flex items-center gap-1 text-[10px] text-slate-500 font-mono mt-1">
                  <Clock className="h-3 w-3" />
                  <span>Sync: {timestamp}</span>
                </div>
              </div>
            </div>

            {/* Quick Threshold Meters */}
            <div className="space-y-2 bg-slate-950/60 rounded-xl p-3 border border-slate-800 text-xs">
              <div className="flex justify-between items-center text-[11px]">
                <span className="text-slate-400">Humidity Limit:</span>
                <span className="font-mono text-cyan-400 font-bold">{hum}% / {hThresh}%</span>
              </div>
              <div className="w-full bg-slate-800 h-1.5 rounded-full overflow-hidden">
                <div className="bg-cyan-400 h-full transition-all duration-300" style={{ width: `${Math.min(100, (hum / hThresh) * 100)}%` }} />
              </div>

              <div className="flex justify-between items-center text-[11px]">
                <span className="text-slate-400">Temp Limit:</span>
                <span className="font-mono text-rose-400 font-bold">{temp}°C / {tThresh}°C</span>
              </div>
              <div className="w-full bg-slate-800 h-1.5 rounded-full overflow-hidden">
                <div className="bg-rose-400 h-full transition-all duration-300" style={{ width: `${Math.min(100, (temp / tThresh) * 100)}%` }} />
              </div>
            </div>
          </div>
        </div>

        {/* Live Actuator Controls Card */}
        <div className="glass-panel rounded-2xl p-5 border border-slate-800 shadow-2xl flex flex-col justify-between">
          <div>
            <div className="flex items-center justify-between pb-2 border-b border-slate-800">
              <h3 className="text-sm font-bold text-white flex items-center gap-1.5">
                <Zap className="h-4 w-4 text-emerald-400" />
                <span>Live Actuator Control</span>
              </h3>
              <span className="text-[10px] font-mono text-slate-400 bg-slate-900 px-2 py-0.5 rounded border border-slate-800">
                Arduino D5 & D13
              </span>
            </div>

            <div className="mt-3 space-y-3">
              {/* Exhaust Fan Relay Switch */}
              <div className={`p-3 rounded-xl border transition-all flex items-center justify-between ${
                fanState ? 'bg-emerald-950/40 border-emerald-600/50 text-emerald-200' : 'bg-slate-950/60 border-slate-800 text-slate-400'
              }`}>
                <div className="flex items-center gap-3">
                  <div className={`p-2 rounded-lg ${fanState ? 'bg-emerald-500/20 text-emerald-400' : 'bg-slate-900 text-slate-600'}`}>
                    <Fan className={`h-5 w-5 ${fanState ? 'animate-spin-slow text-emerald-400' : ''}`} />
                  </div>
                  <div>
                    <h4 className="text-xs font-bold text-white">Exhaust Fan (Relay D5)</h4>
                    <span className="text-[10px] text-slate-400 block">{fanState ? 'Air Circulation Active' : 'Ventilation Idle'}</span>
                  </div>
                </div>

                <button
                  onClick={() => sendCommand({ fan: !fanState })}
                  className={`px-3 py-1.5 rounded-lg text-xs font-mono font-bold transition-all ${
                    fanState
                      ? 'bg-emerald-500 text-slate-950 shadow-md shadow-emerald-500/20'
                      : 'bg-slate-800 text-slate-300 hover:bg-slate-700'
                  }`}
                >
                  {fanState ? 'RUNNING [ON]' : 'STOPPED [OFF]'}
                </button>
              </div>

              {/* Warning LED Switch */}
              <div className={`p-3 rounded-xl border transition-all flex items-center justify-between ${
                ledState ? 'bg-rose-950/40 border-rose-600/50 text-rose-200' : 'bg-slate-950/60 border-slate-800 text-slate-400'
              }`}>
                <div className="flex items-center gap-3">
                  <div className={`p-2 rounded-lg ${ledState ? 'bg-rose-500/20 text-rose-400 animate-pulse-glow' : 'bg-slate-900 text-slate-600'}`}>
                    <Lightbulb className="h-5 w-5" />
                  </div>
                  <div>
                    <h4 className="text-xs font-bold text-white">Warning LED (Pin D13)</h4>
                    <span className="text-[10px] text-slate-400 block">{ledState ? 'Hazard Alert Glowing' : 'Normal Standby'}</span>
                  </div>
                </div>

                <button
                  onClick={() => sendCommand({ led: !ledState })}
                  className={`px-3 py-1.5 rounded-lg text-xs font-mono font-bold transition-all ${
                    ledState
                      ? 'bg-rose-500 text-white shadow-md shadow-rose-500/20'
                      : 'bg-slate-800 text-slate-300 hover:bg-slate-700'
                  }`}
                >
                  {ledState ? 'ACTIVE [ON]' : 'OFF'}
                </button>
              </div>
            </div>
          </div>
        </div>
      </div>

      {/* Threshold Settings Modal Drawer */}
      {showSettings && (
        <form onSubmit={handleSaveSettings} className="glass-panel rounded-2xl p-5 border border-slate-800 shadow-2xl space-y-4 animate-fade-in">
          <div className="flex items-center justify-between border-b border-slate-800 pb-2">
            <h3 className="text-sm font-bold text-white flex items-center gap-2">
              <Settings className="h-4 w-4 text-emerald-400" />
              <span>Configure Sensor Alert Thresholds</span>
            </h3>
            <button type="button" onClick={() => setShowSettings(false)} className="text-xs text-slate-400 hover:text-white">
              Close ✕
            </button>
          </div>

          {saveMsg && (
            <div className="p-2.5 rounded-lg bg-emerald-950 text-emerald-300 text-xs font-mono flex items-center gap-2">
              <CheckCircle2 className="h-4 w-4 text-emerald-400" />
              <span>Threshold settings updated successfully!</span>
            </div>
          )}

          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4 text-xs">
            <div className="bg-slate-950 p-3 rounded-xl border border-slate-800 space-y-1">
              <label className="text-slate-300 font-semibold block">Humidity Threshold ({formSettings.humidity_thresh}%)</label>
              <input
                type="range"
                min="30"
                max="90"
                value={formSettings.humidity_thresh}
                onChange={(e) => setFormSettings({ ...formSettings, humidity_thresh: e.target.value })}
                className="w-full accent-cyan-400"
              />
            </div>

            <div className="bg-slate-950 p-3 rounded-xl border border-slate-800 space-y-1">
              <label className="text-slate-300 font-semibold block">Temperature Threshold ({formSettings.temp_thresh}°C)</label>
              <input
                type="range"
                min="20"
                max="45"
                value={formSettings.temp_thresh}
                onChange={(e) => setFormSettings({ ...formSettings, temp_thresh: e.target.value })}
                className="w-full accent-rose-500"
              />
            </div>

            <div className="bg-slate-950 p-3 rounded-xl border border-slate-800 space-y-1">
              <label className="text-slate-300 font-semibold block">MQ135 Gas Limit ({formSettings.gas_thresh} ADC)</label>
              <input
                type="range"
                min="300"
                max="900"
                step="10"
                value={formSettings.gas_thresh}
                onChange={(e) => setFormSettings({ ...formSettings, gas_thresh: e.target.value })}
                className="w-full accent-emerald-400"
              />
            </div>

            <div className="bg-slate-950 p-3 rounded-xl border border-slate-800 space-y-1">
              <label className="text-slate-300 font-semibold block">Moisture Limit ({formSettings.moisture_thresh} ADC)</label>
              <input
                type="range"
                min="100"
                max="800"
                step="10"
                value={formSettings.moisture_thresh}
                onChange={(e) => setFormSettings({ ...formSettings, moisture_thresh: e.target.value })}
                className="w-full accent-indigo-400"
              />
            </div>
          </div>

          <div className="flex items-center justify-end gap-2 pt-2 border-t border-slate-800">
            <button
              type="button"
              onClick={() => {
                resetSettings();
                setFormSettings({ humidity_thresh: '60', temp_thresh: '30', gas_thresh: '700', moisture_thresh: '400', light_thresh: '500', auto_actuators: 'true' });
              }}
              className="px-3 py-1.5 rounded-lg bg-slate-900 text-xs font-semibold text-slate-300 border border-slate-800 hover:bg-slate-800"
            >
              Reset Defaults
            </button>
            <button
              type="submit"
              className="px-4 py-1.5 rounded-lg bg-emerald-600 text-xs font-bold text-white shadow hover:bg-emerald-500"
            >
              Save Thresholds
            </button>
          </div>
        </form>
      )}

      {/* 5 Core Telemetry Cards Grid */}
      <div className="grid grid-cols-1 gap-4 sm:grid-cols-2 lg:grid-cols-5">
        {/* Temperature Card */}
        <div className="glass-panel rounded-2xl p-4 border border-slate-800 flex flex-col justify-between">
          <div className="flex items-center justify-between mb-1">
            <span className="text-xs font-semibold text-rose-400 flex items-center gap-1">
              <Thermometer className="h-4 w-4" /> Temperature
            </span>
            <span className={`text-[10px] font-mono px-2 py-0.5 rounded font-bold ${temp > tThresh ? 'bg-rose-950 text-rose-300' : 'bg-slate-800 text-slate-300'}`}>
              {temp > tThresh ? 'HIGH' : 'OK'}
            </span>
          </div>
          <div className="flex items-baseline justify-between my-1">
            <span className="text-2xl font-black font-mono text-white">{temp.toFixed(1)}°C</span>
            <span className="text-[10px] text-slate-400 font-mono">Limit: {tThresh}°C</span>
          </div>
          <span className="text-[10px] text-slate-500 font-mono">DHT11 Pin D2</span>
        </div>

        {/* Humidity Card */}
        <div className="glass-panel rounded-2xl p-4 border border-slate-800 flex flex-col justify-between">
          <div className="flex items-center justify-between mb-1">
            <span className="text-xs font-semibold text-cyan-400 flex items-center gap-1">
              <Droplets className="h-4 w-4" /> Humidity
            </span>
            <span className={`text-[10px] font-mono px-2 py-0.5 rounded font-bold ${hum > hThresh ? 'bg-cyan-950 text-cyan-300' : 'bg-slate-800 text-slate-300'}`}>
              {hum > hThresh ? 'HIGH MOLD' : 'OK'}
            </span>
          </div>
          <div className="flex items-baseline justify-between my-1">
            <span className="text-2xl font-black font-mono text-white">{hum}%</span>
            <span className="text-[10px] text-slate-400 font-mono">Limit: {hThresh}%</span>
          </div>
          <span className="text-[10px] text-slate-500 font-mono">DHT11 Pin D2</span>
        </div>

        {/* MQ135 Gas Card */}
        <div className="glass-panel rounded-2xl p-4 border border-slate-800 flex flex-col justify-between">
          <div className="flex items-center justify-between mb-1">
            <span className="text-xs font-semibold text-emerald-400 flex items-center gap-1">
              <Wind className="h-4 w-4" /> MQ135 Gas
            </span>
            <span className={`text-[10px] font-mono px-2 py-0.5 rounded font-bold ${gas > gThresh ? 'bg-rose-950 text-rose-300' : 'bg-slate-800 text-slate-300'}`}>
              {gas > gThresh ? 'ALERT' : 'GOOD'}
            </span>
          </div>
          <div className="flex items-baseline justify-between my-1">
            <span className="text-2xl font-black font-mono text-white">{gas}</span>
            <span className="text-[10px] text-slate-400 font-mono">Limit: {gThresh}</span>
          </div>
          <span className="text-[10px] text-slate-500 font-mono">MQ135 Pin A1</span>
        </div>

        {/* LDR Light Card */}
        <div className="glass-panel rounded-2xl p-4 border border-slate-800 flex flex-col justify-between">
          <div className="flex items-center justify-between mb-1">
            <span className="text-xs font-semibold text-amber-400 flex items-center gap-1">
              <Sun className="h-4 w-4" /> Light Level
            </span>
            <span className="text-[10px] font-mono px-2 py-0.5 rounded bg-slate-800 text-slate-300">
              LDR
            </span>
          </div>
          <div className="flex items-baseline justify-between my-1">
            <span className="text-2xl font-black font-mono text-white">{light}</span>
            <span className="text-[10px] text-slate-400 font-mono">0-1023 ADC</span>
          </div>
          <span className="text-[10px] text-slate-500 font-mono">LDR Pin A0</span>
        </div>

        {/* Surface Moisture Card */}
        <div className="glass-panel rounded-2xl p-4 border border-slate-800 flex flex-col justify-between">
          <div className="flex items-center justify-between mb-1">
            <span className="text-xs font-semibold text-indigo-400 flex items-center gap-1">
              <Layers className="h-4 w-4" /> Surface Moisture
            </span>
            <span className={`text-[10px] font-mono px-2 py-0.5 rounded font-bold ${moisture < mThresh ? 'bg-amber-950 text-amber-300' : 'bg-slate-800 text-slate-300'}`}>
              {moisture < mThresh ? 'HIGH DAMPNESS' : 'SAFE'}
            </span>
          </div>
          <div className="flex items-baseline justify-between my-1">
            <span className="text-2xl font-black font-mono text-white">{moisture}</span>
            <span className="text-[10px] text-slate-400 font-mono">Limit: {mThresh}</span>
          </div>
          <span className="text-[10px] text-slate-500 font-mono">Capacitive Pin A2</span>
        </div>
      </div>

      {/* ══════════════════════════════════════════════════════ */}
      {/* FEATURE 1: AUTOMATION LOGIC GATE VISUALIZER           */}
      {/* ══════════════════════════════════════════════════════ */}
      <div className="glass-panel rounded-2xl p-5 border border-slate-800 shadow-2xl space-y-4">
        <div className="flex items-center justify-between">
          <div className="flex items-center gap-2">
            <GitMerge className="h-5 w-5 text-violet-400" />
            <div>
              <h3 className="text-sm font-bold text-white">Automation Logic Gate Visualizer</h3>
              <span className="text-[10px] text-slate-400 font-mono">AND Gate: Humidity &gt; {hThresh}% AND Temp &gt; {tThresh}°C → Fan Relay D5 + LED D13</span>
            </div>
          </div>
          <span className={`text-[10px] font-mono font-bold px-3 py-1 rounded-lg border ${
            logicGateTriggered
              ? 'bg-rose-950 text-rose-300 border-rose-600 animate-pulse'
              : 'bg-emerald-950 text-emerald-300 border-emerald-700'
          }`}>
            {logicGateTriggered ? '⚡ ACTUATORS ENGAGED' : '✓ SYSTEM STANDBY'}
          </span>
        </div>

        <div className="flex flex-col sm:flex-row items-center justify-center gap-4 py-2">
          {/* Condition A: Temperature */}
          <div className={`flex-1 max-w-[200px] rounded-2xl border-2 p-4 text-center transition-all duration-300 ${
            condTempHigh
              ? 'border-rose-500 bg-rose-950/40 shadow-rose-500/20 shadow-lg'
              : 'border-slate-700 bg-slate-900/60'
          }`}>
            <Thermometer className={`h-6 w-6 mx-auto mb-1 ${ condTempHigh ? 'text-rose-400' : 'text-slate-500' }`} />
            <div className="text-[10px] font-mono text-slate-400 uppercase tracking-wider">Condition A</div>
            <div className="text-sm font-bold text-white mt-0.5">Temp &gt; {tThresh}°C</div>
            <div className="text-xl font-black font-mono mt-1" style={{ color: condTempHigh ? '#f87171' : '#64748b' }}>
              {temp.toFixed(1)}°C
            </div>
            <div className={`mt-2 text-[11px] font-bold font-mono px-2 py-0.5 rounded-full inline-block ${
              condTempHigh ? 'bg-rose-500/20 text-rose-300' : 'bg-slate-800 text-slate-400'
            }`}>
              {condTempHigh ? '✓ TRIGGERED' : '✗ BELOW LIMIT'}
            </div>
          </div>

          {/* AND Gate Symbol */}
          <div className="flex flex-col items-center gap-1 shrink-0">
            <div className="flex items-center gap-1">
              <div className={`h-px w-8 ${ condTempHigh ? 'bg-rose-500' : 'bg-slate-700' }`} />
              <div className={`w-12 h-12 rounded-full border-2 flex items-center justify-center font-bold text-xs transition-all duration-300 ${
                logicGateTriggered
                  ? 'border-violet-400 bg-violet-950/60 text-violet-300 shadow-violet-500/30 shadow-md'
                  : 'border-slate-700 bg-slate-900 text-slate-500'
              }`}>
                AND
              </div>
              <div className={`h-px w-8 ${ logicGateTriggered ? 'bg-violet-400' : 'bg-slate-700' }`} />
            </div>
            <div className={`h-px w-px`}/>
            <div className={`text-[9px] font-mono tracking-wider ${ logicGateTriggered ? 'text-violet-400' : 'text-slate-600' }`}>LOGIC GATE</div>
          </div>

          {/* Condition B: Humidity */}
          <div className={`flex-1 max-w-[200px] rounded-2xl border-2 p-4 text-center transition-all duration-300 ${
            condHumHigh
              ? 'border-cyan-500 bg-cyan-950/40 shadow-cyan-500/20 shadow-lg'
              : 'border-slate-700 bg-slate-900/60'
          }`}>
            <Droplets className={`h-6 w-6 mx-auto mb-1 ${ condHumHigh ? 'text-cyan-400' : 'text-slate-500' }`} />
            <div className="text-[10px] font-mono text-slate-400 uppercase tracking-wider">Condition B</div>
            <div className="text-sm font-bold text-white mt-0.5">Humidity &gt; {hThresh}%</div>
            <div className="text-xl font-black font-mono mt-1" style={{ color: condHumHigh ? '#22d3ee' : '#64748b' }}>
              {hum.toFixed(1)}%
            </div>
            <div className={`mt-2 text-[11px] font-bold font-mono px-2 py-0.5 rounded-full inline-block ${
              condHumHigh ? 'bg-cyan-500/20 text-cyan-300' : 'bg-slate-800 text-slate-400'
            }`}>
              {condHumHigh ? '✓ TRIGGERED' : '✗ BELOW LIMIT'}
            </div>
          </div>

          {/* Output arrow + result */}
          <div className="flex flex-col items-center gap-1 shrink-0">
            <div className={`h-px w-8 ${ logicGateTriggered ? 'bg-violet-400' : 'bg-slate-700' }`} />
          </div>

          {/* Result Block */}
          <div className={`flex-1 max-w-[220px] rounded-2xl border-2 p-4 transition-all duration-300 ${
            logicGateTriggered
              ? 'border-violet-500 bg-violet-950/40 shadow-violet-500/20 shadow-xl'
              : 'border-slate-700 bg-slate-900/60'
          }`}>
            <div className="text-[10px] font-mono text-slate-400 uppercase tracking-wider text-center mb-2">Output Result</div>
            <div className="flex items-center gap-2 mb-2">
              <Fan className={`h-4 w-4 shrink-0 ${ logicGateTriggered ? 'text-emerald-400 animate-spin' : 'text-slate-600' }`} />
              <div>
                <div className="text-[10px] text-slate-400">Exhaust Fan (D5)</div>
                <div className={`text-xs font-bold font-mono ${ logicGateTriggered ? 'text-emerald-300' : 'text-slate-500' }`}>
                  {logicGateTriggered ? 'RELAY CLOSED — RUNNING' : 'RELAY OPEN — STOPPED'}
                </div>
              </div>
            </div>
            <div className="flex items-center gap-2">
              <Lightbulb className={`h-4 w-4 shrink-0 ${ logicGateTriggered ? 'text-rose-400 animate-pulse' : 'text-slate-600' }`} />
              <div>
                <div className="text-[10px] text-slate-400">Warning LED (D13)</div>
                <div className={`text-xs font-bold font-mono ${ logicGateTriggered ? 'text-rose-300' : 'text-slate-500' }`}>
                  {logicGateTriggered ? 'HIGH — ALARM ACTIVE' : 'LOW — STANDBY'}
                </div>
              </div>
            </div>
          </div>
        </div>

        <div className="text-[10px] font-mono text-slate-500 text-center pt-1 border-t border-slate-800">
          Logic Expression: <span className="text-violet-400">(humidity &gt; {hThresh}% &amp;&amp; temperature &gt; {tThresh}°C)</span> → <span className="text-emerald-400">digitalWrite(FAN_RELAY_PIN, HIGH) + digitalWrite(LEDPIN, HIGH)</span>
        </div>
      </div>

      {/* ══════════════════════════════════════════════════════ */}
      {/* FEATURE 2: DERIVED SCIENCE METRICS                    */}
      {/* ══════════════════════════════════════════════════════ */}
      <div className="glass-panel rounded-2xl p-5 border border-slate-800 shadow-2xl space-y-4">
        <div className="flex items-center gap-2">
          <FlaskConical className="h-5 w-5 text-fuchsia-400" />
          <div>
            <h3 className="text-sm font-bold text-white">Derived Environmental Science Metrics</h3>
            <span className="text-[10px] text-slate-400 font-mono">Calculated from live sensor data — Thermodynamics + Mycology Risk Models</span>
          </div>
        </div>

        <div className="grid grid-cols-2 gap-4 lg:grid-cols-4">
          {/* Dew Point */}
          <div className="bg-slate-950/70 rounded-2xl p-4 border border-slate-800 space-y-2">
            <div className="flex items-center gap-1.5">
              <Thermometer className="h-4 w-4 text-sky-400" />
              <span className="text-[10px] font-bold text-slate-300 uppercase tracking-wider">Dew Point</span>
            </div>
            <div className="text-2xl font-black font-mono text-sky-300">{dewPoint}°C</div>
            <div className="text-[10px] text-slate-500 leading-tight">
              Condensation starts when Dew Point ≈ Surface Temp.<br />
              <span className={`font-mono font-bold ${ dewPoint >= temp - 3 ? 'text-amber-400' : 'text-emerald-400' }`}>
                {dewPoint >= temp - 3 ? '⚠ CONDENSATION RISK' : '✓ No Condensation Risk'}
              </span>
            </div>
            <div className="text-[9px] font-mono text-slate-600">Magnus Approx: T − ((100−RH)/5)</div>
          </div>

          {/* Absolute Humidity */}
          <div className="bg-slate-950/70 rounded-2xl p-4 border border-slate-800 space-y-2">
            <div className="flex items-center gap-1.5">
              <Beaker className="h-4 w-4 text-indigo-400" />
              <span className="text-[10px] font-bold text-slate-300 uppercase tracking-wider">Absolute Humidity</span>
            </div>
            <div className="text-2xl font-black font-mono text-indigo-300">{absHumidity} <span className="text-sm font-semibold">g/m³</span></div>
            <div className="text-[10px] text-slate-500 leading-tight">
              Mass of water vapor in the air.<br />
              <span className={`font-mono font-bold ${ absHumidity > 15 ? 'text-rose-400' : absHumidity > 10 ? 'text-amber-400' : 'text-emerald-400' }`}>
                {absHumidity > 15 ? '⚠ HIGH MOISTURE LOAD' : absHumidity > 10 ? '~ MODERATE' : '✓ LOW'}
              </span>
            </div>
            <div className="text-[9px] font-mono text-slate-600">Buck Equation (simplified)</div>
          </div>

          {/* Mold Growth Index */}
          <div className="bg-slate-950/70 rounded-2xl p-4 border border-slate-800 space-y-2">
            <div className="flex items-center gap-1.5">
              <Gauge className="h-4 w-4 text-fuchsia-400" />
              <span className="text-[10px] font-bold text-slate-300 uppercase tracking-wider">Mold Growth Index</span>
            </div>
            <div className="flex items-baseline gap-1">
              <div className="text-2xl font-black font-mono" style={{
                color: moldIndex > 65 ? '#f43f5e' : moldIndex > 40 ? '#f59e0b' : '#10b981'
              }}>{moldIndex}</div>
              <div className="text-sm text-slate-400 font-mono">/100</div>
            </div>
            <div className="w-full bg-slate-800 h-2 rounded-full overflow-hidden">
              <div
                className="h-full rounded-full transition-all duration-500"
                style={{
                  width: `${moldIndex}%`,
                  background: moldIndex > 65 ? '#f43f5e' : moldIndex > 40 ? '#f59e0b' : '#10b981'
                }}
              />
            </div>
            <div className="text-[9px] font-mono text-slate-600">Composite: RH×0.4 + Temp×0.3 + Gas×0.2 + Moisture×0.1</div>
          </div>

          {/* Wardrobe VOC / Enclosure Risk */}
          <div className="bg-slate-950/70 rounded-2xl p-4 border border-slate-800 space-y-2">
            <div className="flex items-center gap-1.5">
              <DoorOpen className="h-4 w-4 text-amber-400" />
              <span className="text-[10px] font-bold text-slate-300 uppercase tracking-wider">Wardrobe VOC Risk</span>
            </div>
            <div className="text-2xl font-black font-mono" style={{
              color: wardrobeRiskScore > 65 ? '#f43f5e' : wardrobeRiskScore > 40 ? '#f59e0b' : '#10b981'
            }}>{wardrobeRiskScore}%</div>
            <div className="flex gap-2 flex-wrap">
              <span className={`text-[10px] font-mono px-1.5 py-0.5 rounded border font-bold ${
                enclosureDark ? 'bg-slate-950 text-amber-300 border-amber-700' : 'bg-slate-950 text-slate-500 border-slate-700'
              }`}>
                {enclosureDark ? '🌑 DARK' : '☀ LIT'}
              </span>
              <span className={`text-[10px] font-mono px-1.5 py-0.5 rounded border font-bold ${
                airStagnant ? 'bg-rose-950 text-rose-300 border-rose-700' : 'bg-slate-950 text-emerald-400 border-slate-700'
              }`}>
                {airStagnant ? '💨 STAGNANT' : '✓ FRESH'}
              </span>
            </div>
            <div className="text-[9px] font-mono text-slate-600">LDR dark enclosure + MQ135 VOC accumulation</div>
          </div>
        </div>
      </div>

      {/* ══════════════════════════════════════════════════════ */}
      {/* FEATURE 3: PER-ROOM HEALTH SCORECARD                  */}
      {/* ══════════════════════════════════════════════════════ */}
      <div className="grid grid-cols-1 gap-4 lg:grid-cols-2">
        {/* Room 1 Health */}
        <div className={`rounded-2xl p-4 border-2 transition-all ${
          room1Health === 'DANGER' ? 'border-rose-600/70 bg-rose-950/20'
          : room1Health === 'CAUTION' ? 'border-amber-600/70 bg-amber-950/20'
          : 'border-emerald-700/60 bg-emerald-950/20'
        }`}>
          <div className="flex items-center justify-between">
            <div className="flex items-center gap-2">
              <Home className={`h-5 w-5 ${ room1Health === 'DANGER' ? 'text-rose-400' : room1Health === 'CAUTION' ? 'text-amber-400' : 'text-emerald-400' }`} />
              <div>
                <div className="text-sm font-bold text-white">Room 1 — Main Room Health</div>
                <div className="text-[10px] text-slate-400 font-mono">DHT11 + Capacitive Moisture Sensor</div>
              </div>
            </div>
            <span className={`text-xs font-black font-mono px-3 py-1 rounded-xl border ${
              room1Health === 'DANGER' ? 'bg-rose-950 text-rose-300 border-rose-600 animate-pulse'
              : room1Health === 'CAUTION' ? 'bg-amber-950 text-amber-300 border-amber-600'
              : 'bg-emerald-950 text-emerald-300 border-emerald-700'
            }`}>
              {room1Health === 'DANGER' ? '🔴' : room1Health === 'CAUTION' ? '🟡' : '🟢'} {room1Health}
            </span>
          </div>

          <div className="mt-3 grid grid-cols-3 gap-2">
            {[{ label: 'Temperature', val: `${temp.toFixed(1)}°C`, limit: `>${tThresh}°C`, over: temp > tThresh, color: 'text-rose-400' },
              { label: 'Humidity', val: `${hum.toFixed(1)}%`, limit: `>${hThresh}%`, over: hum > hThresh, color: 'text-cyan-400' },
              { label: 'Dampness', val: `${moisture} ADC`, limit: `<${mThresh}`, over: moisture < mThresh, color: 'text-indigo-400' }
            ].map(s => (
              <div key={s.label} className="bg-slate-950/50 rounded-xl p-2 text-center">
                <div className={`text-xs font-bold font-mono ${s.over ? s.color : 'text-slate-300'}`}>{s.val}</div>
                <div className="text-[9px] text-slate-500 mt-0.5">{s.label}</div>
                <div className={`text-[9px] font-mono mt-0.5 ${s.over ? 'text-rose-400 font-bold' : 'text-slate-600'}`}>
                  {s.over ? `⚠ ${s.limit}` : '✓ OK'}
                </div>
              </div>
            ))}
          </div>

          <div className="mt-3">
            <div className="flex justify-between text-[10px] font-mono text-slate-400 mb-1">
              <span>Room 1 Risk Score</span><span>{room1Score}%</span>
            </div>
            <div className="w-full bg-slate-900 h-2 rounded-full overflow-hidden">
              <div className="h-full rounded-full transition-all duration-500" style={{
                width: `${room1Score}%`,
                background: room1Score > 70 ? '#f43f5e' : room1Score > 40 ? '#f59e0b' : '#10b981'
              }} />
            </div>
          </div>
        </div>

        {/* Room 2 Health */}
        <div className={`rounded-2xl p-4 border-2 transition-all ${
          room2Health === 'HAZARD' ? 'border-rose-600/70 bg-rose-950/20'
          : room2Health === 'STAGNANT' ? 'border-amber-600/70 bg-amber-950/20'
          : 'border-emerald-700/60 bg-emerald-950/20'
        }`}>
          <div className="flex items-center justify-between">
            <div className="flex items-center gap-2">
              <DoorOpen className={`h-5 w-5 ${ room2Health === 'HAZARD' ? 'text-rose-400' : room2Health === 'STAGNANT' ? 'text-amber-400' : 'text-emerald-400' }`} />
              <div>
                <div className="text-sm font-bold text-white">Room 2 — Wardrobe Health</div>
                <div className="text-[10px] text-slate-400 font-mono">LDR (A0) + MQ135 Gas Sensor (A1)</div>
              </div>
            </div>
            <span className={`text-xs font-black font-mono px-3 py-1 rounded-xl border ${
              room2Health === 'HAZARD' ? 'bg-rose-950 text-rose-300 border-rose-600 animate-pulse'
              : room2Health === 'STAGNANT' ? 'bg-amber-950 text-amber-300 border-amber-600'
              : 'bg-emerald-950 text-emerald-300 border-emerald-700'
            }`}>
              {room2Health === 'HAZARD' ? '🔴' : room2Health === 'STAGNANT' ? '🟡' : '🟢'} {room2Health}
            </span>
          </div>

          <div className="mt-3 grid grid-cols-3 gap-2">
            {[{ label: 'Light Level', val: `${light} ADC`, limit: `<300`, over: light < 300, color: 'text-amber-400' },
              { label: 'Gas / VOC', val: `${gas} ADC`, limit: `>${gThresh}`, over: gas > gThresh, color: 'text-emerald-400' },
              { label: 'Enclosure', val: enclosureDark ? 'DARK' : 'LIT', limit: 'Dark = Risk', over: enclosureDark, color: 'text-amber-400' }
            ].map(s => (
              <div key={s.label} className="bg-slate-950/50 rounded-xl p-2 text-center">
                <div className={`text-xs font-bold font-mono ${s.over ? s.color : 'text-slate-300'}`}>{s.val}</div>
                <div className="text-[9px] text-slate-500 mt-0.5">{s.label}</div>
                <div className={`text-[9px] font-mono mt-0.5 ${s.over ? 'text-rose-400 font-bold' : 'text-slate-600'}`}>
                  {s.over ? `⚠ ${s.limit}` : '✓ OK'}
                </div>
              </div>
            ))}
          </div>

          <div className="mt-3">
            <div className="flex justify-between text-[10px] font-mono text-slate-400 mb-1">
              <span>Wardrobe Risk Score</span><span>{room2Score}%</span>
            </div>
            <div className="w-full bg-slate-900 h-2 rounded-full overflow-hidden">
              <div className="h-full rounded-full transition-all duration-500" style={{
                width: `${room2Score}%`,
                background: room2Score > 70 ? '#f43f5e' : room2Score > 40 ? '#f59e0b' : '#10b981'
              }} />
            </div>
          </div>
        </div>
      </div>

      {/* ROOM-BASED IoT ANALYTICS — 2 ROOMS */}

      {/* ── ROOM 1: Bedroom / Living Area ── */}
      <div className="space-y-3">
        <div className="flex items-center gap-3">
          <div className="flex items-center gap-2 bg-cyan-950/50 border border-cyan-700/50 rounded-xl px-3 py-1.5">
            <span className="text-lg">🏠</span>
            <div>
              <span className="text-xs font-bold text-cyan-300 block">Room 1 — Main Room</span>
              <span className="text-[10px] text-slate-400 font-mono">Sensors: DHT11 (D2) + Capacitive Moisture (A2)</span>
            </div>
          </div>
          <span className="text-xs font-mono text-slate-400 flex items-center gap-1">
            <span className="h-2 w-2 rounded-full bg-cyan-400 animate-pulse" /> Live Damp & Temp Monitoring
          </span>
        </div>

        <div className="grid grid-cols-1 gap-5 lg:grid-cols-2">
          {/* GRAPH 1: Temp vs Humidity — Room 1 */}
          <div className="glass-panel rounded-2xl p-5 border border-cyan-900/50 shadow-2xl space-y-3">
            <div className="flex items-center justify-between">
              <div className="flex items-center gap-2">
                <Thermometer className="h-4 w-4 text-cyan-400" />
                <div>
                  <h4 className="text-xs font-bold text-white">Temperature & Humidity Trend</h4>
                  <span className="text-[10px] text-slate-400">DHT11 Sensor — Room 1</span>
                </div>
              </div>
              <span className={`text-[10px] font-mono px-2 py-0.5 rounded border font-bold ${hum > hThresh ? 'bg-rose-950 text-rose-300 border-rose-700 animate-pulse' : 'bg-slate-900 text-emerald-400 border-slate-700'}`}>
                {hum > hThresh ? '⚠ HIGH MOLD RISK' : '✓ SAFE'}
              </span>
            </div>

            <div className="h-56 w-full pt-1">
              <ResponsiveContainer width="100%" height="100%">
                <AreaChart data={chartData}>
                  <defs>
                    <linearGradient id="gradTemp2" x1="0" y1="0" x2="0" y2="1">
                      <stop offset="5%" stopColor="#f43f5e" stopOpacity={0.4} />
                      <stop offset="95%" stopColor="#f43f5e" stopOpacity={0} />
                    </linearGradient>
                    <linearGradient id="gradHum2" x1="0" y1="0" x2="0" y2="1">
                      <stop offset="5%" stopColor="#06b6d4" stopOpacity={0.45} />
                      <stop offset="95%" stopColor="#06b6d4" stopOpacity={0} />
                    </linearGradient>
                  </defs>
                  <CartesianGrid strokeDasharray="3 3" stroke="#1e293b" />
                  <XAxis dataKey="time" stroke="#64748b" tick={{ fontSize: 9 }} />
                  <YAxis stroke="#64748b" tick={{ fontSize: 9 }} />
                  <Tooltip contentStyle={{ backgroundColor: '#0f172a', borderColor: '#334155', borderRadius: '12px', fontSize: '11px' }} />
                  <Legend wrapperStyle={{ fontSize: '11px', paddingTop: '4px' }} />
                  <ReferenceLine y={hThresh} stroke="#06b6d4" strokeDasharray="4 4" label={{ value: `Humidity Limit (${hThresh}%)`, fill: '#06b6d4', fontSize: 9 }} />
                  <ReferenceLine y={tThresh} stroke="#f43f5e" strokeDasharray="4 4" label={{ value: `Temp Limit (${tThresh}°C)`, fill: '#f43f5e', fontSize: 9 }} />
                  <Area type="monotone" dataKey="Humidity" name="Humidity (%)" stroke="#06b6d4" fillOpacity={1} fill="url(#gradHum2)" strokeWidth={2} />
                  <Area type="monotone" dataKey="Temperature" name="Temperature (°C)" stroke="#f43f5e" fillOpacity={1} fill="url(#gradTemp2)" strokeWidth={2} />
                </AreaChart>
              </ResponsiveContainer>
            </div>
          </div>

          {/* GRAPH 2: Surface Moisture over time — Room 1 */}
          <div className="glass-panel rounded-2xl p-5 border border-cyan-900/50 shadow-2xl space-y-3">
            <div className="flex items-center justify-between">
              <div className="flex items-center gap-2">
                <Layers className="h-4 w-4 text-indigo-400" />
                <div>
                  <h4 className="text-xs font-bold text-white">Wall / Surface Dampness Level</h4>
                  <span className="text-[10px] text-slate-400">Capacitive Moisture Sensor (A2) — Room 1</span>
                </div>
              </div>
              <span className={`text-[10px] font-mono px-2 py-0.5 rounded border font-bold ${moisture < mThresh ? 'bg-amber-950 text-amber-300 border-amber-700 animate-pulse' : 'bg-slate-900 text-emerald-400 border-slate-700'}`}>
                {moisture < mThresh ? '💧 DAMP DETECTED' : '✓ DRY & SAFE'}
              </span>
            </div>

            <div className="h-56 w-full pt-1">
              <ResponsiveContainer width="100%" height="100%">
                <AreaChart data={chartData}>
                  <defs>
                    <linearGradient id="gradMoist" x1="0" y1="0" x2="0" y2="1">
                      <stop offset="5%" stopColor="#6366f1" stopOpacity={0.5} />
                      <stop offset="95%" stopColor="#6366f1" stopOpacity={0} />
                    </linearGradient>
                  </defs>
                  <CartesianGrid strokeDasharray="3 3" stroke="#1e293b" />
                  <XAxis dataKey="time" stroke="#64748b" tick={{ fontSize: 9 }} />
                  <YAxis domain={[0, 1023]} stroke="#64748b" tick={{ fontSize: 9 }} />
                  <Tooltip contentStyle={{ backgroundColor: '#0f172a', borderColor: '#334155', borderRadius: '12px', fontSize: '11px' }} />
                  <ReferenceLine y={mThresh} stroke="#f59e0b" strokeDasharray="4 4" label={{ value: `Damp Alert (${mThresh} ADC)`, fill: '#f59e0b', fontSize: 9 }} />
                  <Area type="monotone" dataKey="Moisture" name="Surface Moisture (ADC)" stroke="#6366f1" fillOpacity={1} fill="url(#gradMoist)" strokeWidth={2.5} />
                </AreaChart>
              </ResponsiveContainer>
            </div>
          </div>
        </div>
      </div>

      {/* ── ROOM 2: Wardrobe ── */}
      <div className="space-y-3">
        <div className="flex items-center gap-3">
          <div className="flex items-center gap-2 bg-amber-950/50 border border-amber-700/50 rounded-xl px-3 py-1.5">
            <span className="text-lg">🚪</span>
            <div>
              <span className="text-xs font-bold text-amber-300 block">Room 2 — Wardrobe / Enclosed Space</span>
              <span className="text-[10px] text-slate-400 font-mono">Sensors: LDR (A0) + MQ135 Smoke (A1) + LED Alert (D13) + Fan Relay (D5)</span>
            </div>
          </div>
          <span className="text-xs font-mono text-slate-400 flex items-center gap-1">
            <span className="h-2 w-2 rounded-full bg-amber-400 animate-pulse" /> Live Dark/Smoke Detection
          </span>
        </div>

        <div className="grid grid-cols-1 gap-5 lg:grid-cols-2">
          {/* GRAPH 3: LDR Light Level — Room 2 Wardrobe */}
          <div className="glass-panel rounded-2xl p-5 border border-amber-900/50 shadow-2xl space-y-3">
            <div className="flex items-center justify-between">
              <div className="flex items-center gap-2">
                <Sun className="h-4 w-4 text-amber-400" />
                <div>
                  <h4 className="text-xs font-bold text-white">Wardrobe Light Level (LDR)</h4>
                  <span className="text-[10px] text-slate-400">LDR Sensor (A0) — Wardrobe: Low = Door Closed / Dark</span>
                </div>
              </div>
              <span className={`text-[10px] font-mono px-2 py-0.5 rounded border font-bold ${light < 500 ? 'bg-slate-900 text-amber-300 border-amber-700' : 'bg-slate-900 text-slate-400 border-slate-700'}`}>
                {light < 500 ? '🌑 DARK (Door Closed)' : '☀ LIGHT (Door Open)'}
              </span>
            </div>

            <div className="h-56 w-full pt-1">
              <ResponsiveContainer width="100%" height="100%">
                <AreaChart data={chartData}>
                  <defs>
                    <linearGradient id="gradLight" x1="0" y1="0" x2="0" y2="1">
                      <stop offset="5%" stopColor="#f59e0b" stopOpacity={0.5} />
                      <stop offset="95%" stopColor="#f59e0b" stopOpacity={0} />
                    </linearGradient>
                  </defs>
                  <CartesianGrid strokeDasharray="3 3" stroke="#1e293b" />
                  <XAxis dataKey="time" stroke="#64748b" tick={{ fontSize: 9 }} />
                  <YAxis domain={[0, 1023]} stroke="#64748b" tick={{ fontSize: 9 }} />
                  <Tooltip contentStyle={{ backgroundColor: '#0f172a', borderColor: '#334155', borderRadius: '12px', fontSize: '11px' }} />
                  <ReferenceLine y={500} stroke="#f59e0b" strokeDasharray="4 4" label={{ value: 'Dark Threshold (500)', fill: '#f59e0b', fontSize: 9 }} />
                  <Area type="monotone" dataKey="Light" name="Light Level (ADC)" stroke="#f59e0b" fillOpacity={1} fill="url(#gradLight)" strokeWidth={2.5} />
                </AreaChart>
              </ResponsiveContainer>
            </div>
          </div>

          {/* GRAPH 4: MQ135 Smoke & Gas — Room 2 Wardrobe */}
          <div className="glass-panel rounded-2xl p-5 border border-amber-900/50 shadow-2xl space-y-3">
            <div className="flex items-center justify-between">
              <div className="flex items-center gap-2">
                <Wind className="h-4 w-4 text-emerald-400" />
                <div>
                  <h4 className="text-xs font-bold text-white">Wardrobe Air Quality / Smoke (MQ135)</h4>
                  <span className="text-[10px] text-slate-400">MQ135 Gas Sensor (A1) — Wardrobe: Detects smoke & VOCs</span>
                </div>
              </div>
              <span className={`text-[10px] font-mono px-2 py-0.5 rounded border font-bold ${gas > gThresh ? 'bg-rose-950 text-rose-300 border-rose-700 animate-pulse' : 'bg-slate-900 text-emerald-400 border-slate-700'}`}>
                {gas > gThresh ? '🚨 SMOKE / GAS ALERT' : '✓ CLEAN AIR'}
              </span>
            </div>

            <div className="h-56 w-full pt-1">
              <ResponsiveContainer width="100%" height="100%">
                <BarChart data={chartData}>
                  <CartesianGrid strokeDasharray="3 3" stroke="#1e293b" />
                  <XAxis dataKey="time" stroke="#64748b" tick={{ fontSize: 9 }} />
                  <YAxis domain={[0, 1023]} stroke="#64748b" tick={{ fontSize: 9 }} />
                  <Tooltip contentStyle={{ backgroundColor: '#0f172a', borderColor: '#334155', borderRadius: '12px', fontSize: '11px' }} />
                  <ReferenceLine y={gThresh} stroke="#f43f5e" strokeDasharray="4 4" label={{ value: `Gas Alert (${gThresh} ADC)`, fill: '#f43f5e', fontSize: 9 }} />
                  <Bar dataKey="Gas" name="Gas / Smoke (ADC)" fill="#10b981" radius={[4, 4, 0, 0]} />
                </BarChart>
              </ResponsiveContainer>
            </div>
          </div>
        </div>
      </div>

      {/* ══════════════════════════════════════════════════════ */}
      {/* FEATURE 4: ALERT EVENT LOG                            */}
      {/* ══════════════════════════════════════════════════════ */}
      <div className="glass-panel rounded-2xl p-5 border border-slate-800 shadow-2xl space-y-3">
        <div className="flex items-center justify-between">
          <div className="flex items-center gap-2">
            <Bell className="h-5 w-5 text-amber-400" />
            <div>
              <h3 className="text-sm font-bold text-white">Live Alert Event Log</h3>
              <span className="text-[10px] text-slate-400 font-mono">System event history — Bench Validation Trace (Section 6 of Report)</span>
            </div>
          </div>
          <div className="flex items-center gap-2">
            <span className="text-[10px] font-mono text-slate-400 bg-slate-900 px-2 py-0.5 rounded border border-slate-800">
              {alerts.length} event{alerts.length !== 1 ? 's' : ''}
            </span>
            {alerts.length > 0 && (
              <button
                onClick={() => clearAlerts()}
                className="flex items-center gap-1 text-[10px] font-mono text-slate-400 hover:text-rose-400 px-2 py-0.5 rounded border border-slate-800 hover:border-rose-700 transition-all"
              >
                <Trash2 className="h-3 w-3" /> Clear
              </button>
            )}
          </div>
        </div>

        <div className="max-h-64 overflow-y-auto space-y-1.5 pr-1" style={{ scrollbarWidth: 'thin', scrollbarColor: '#334155 transparent' }}>
          {alerts.length === 0 ? (
            <div className="flex flex-col items-center justify-center py-8 text-slate-600">
              <BellOff className="h-8 w-8 mb-2 opacity-40" />
              <div className="text-xs font-mono">No alert events recorded yet</div>
              <div className="text-[10px] text-slate-700 mt-1">Events log when sensors cross thresholds</div>
            </div>
          ) : (
            alerts.slice(0, 50).map((alert, idx) => (
              <div
                key={alert.id ?? idx}
                className={`flex items-start gap-3 p-2.5 rounded-xl border text-xs transition-all ${
                  !alert.acknowledged
                    ? alert.severity === 'CRITICAL'
                      ? 'bg-rose-950/40 border-rose-800/60'
                      : alert.severity === 'WARNING'
                      ? 'bg-amber-950/30 border-amber-800/50'
                      : 'bg-slate-900 border-slate-800'
                    : 'bg-slate-950/50 border-slate-800/50 opacity-60'
                }`}
              >
                <div className="shrink-0 mt-0.5">
                  {alert.severity === 'CRITICAL' ? (
                    <Flame className="h-3.5 w-3.5 text-rose-400" />
                  ) : alert.severity === 'WARNING' ? (
                    <AlertTriangle className="h-3.5 w-3.5 text-amber-400" />
                  ) : (
                    <CheckCircle2 className="h-3.5 w-3.5 text-emerald-400" />
                  )}
                </div>
                <div className="flex-1 min-w-0">
                  <div className="flex items-center gap-2 flex-wrap">
                    <span className={`font-bold font-mono text-[10px] ${
                      alert.severity === 'CRITICAL' ? 'text-rose-300'
                      : alert.severity === 'WARNING' ? 'text-amber-300'
                      : 'text-emerald-300'
                    }`}>[{alert.severity ?? 'INFO'}]</span>
                    <span className="text-slate-300 font-mono text-[10px] truncate">{alert.message}</span>
                  </div>
                  <div className="flex items-center gap-3 mt-0.5">
                    <span className="text-[9px] text-slate-500 font-mono">
                      {alert.timestamp ? new Date(alert.timestamp).toLocaleString() : 'Just now'}
                    </span>
                    {alert.sensor && (
                      <span className="text-[9px] font-mono text-slate-600">Sensor: {alert.sensor}</span>
                    )}
                  </div>
                </div>
                {!alert.acknowledged && alert.id != null && (
                  <button
                    onClick={() => acknowledgeAlert(alert.id!)}
                    className="shrink-0 text-[9px] font-mono text-slate-500 hover:text-emerald-400 px-1.5 py-0.5 rounded border border-slate-700 hover:border-emerald-700 transition-all"
                  >
                    ACK
                  </button>
                )}
              </div>
            ))
          )}
        </div>
      </div>

      {/* Hardware Pin Mapping Quick Reference Footer Card */}
      <div className="glass-panel rounded-2xl p-4 border border-slate-800 text-xs flex flex-wrap items-center justify-between gap-4">
        <div className="flex items-center gap-2">
          <Cpu className="h-4 w-4 text-emerald-400 shrink-0" />
          <span className="font-bold text-white">Arduino Mega 2560 Pin Wiring Reference:</span>
        </div>
        <div className="flex flex-wrap items-center gap-3 font-mono text-[11px] text-slate-300">
          <span className="bg-slate-950 px-2 py-1 rounded border border-slate-800">DHT11: <strong className="text-cyan-400">D2</strong></span>
          <span className="bg-slate-950 px-2 py-1 rounded border border-slate-800">Relay: <strong className="text-emerald-400">D5</strong></span>
          <span className="bg-slate-950 px-2 py-1 rounded border border-slate-800">LED: <strong className="text-rose-400">D13</strong></span>
          <span className="bg-slate-950 px-2 py-1 rounded border border-slate-800">LDR: <strong className="text-amber-400">A0</strong></span>
          <span className="bg-slate-950 px-2 py-1 rounded border border-slate-800">MQ135: <strong className="text-emerald-400">A1</strong></span>
          <span className="bg-slate-950 px-2 py-1 rounded border border-slate-800">Moisture: <strong className="text-indigo-400">A2</strong></span>
        </div>
      </div>
    </div>
  );
};
