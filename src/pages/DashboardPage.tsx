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
  Activity
} from 'lucide-react';
import { ResponsiveContainer, AreaChart, Area, XAxis, YAxis, Tooltip, CartesianGrid } from 'recharts';

export const DashboardPage: React.FC = () => {
  const {
    latestTelemetry,
    telemetryHistory,
    settings,
    updateSettings,
    resetSettings,
    sendCommand,
    connectionStatus
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

  const chartData = telemetryHistory.slice(-40).map((t, idx) => ({
    time: t.timestamp ? new Date(t.timestamp).toLocaleTimeString() : `#${idx}`,
    Temperature: t.temperature,
    Humidity: t.humidity,
    Gas: t.gas
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

      {/* Real-Time Live Telemetry Chart */}
      <div className="glass-panel rounded-2xl p-5 border border-slate-800 shadow-2xl space-y-4">
        <div className="flex items-center justify-between border-b border-slate-800 pb-2">
          <h3 className="text-sm font-bold text-white flex items-center gap-2">
            <Activity className="h-4 w-4 text-emerald-400" />
            <span>Live Stream Telemetry Chart (Temp, Humidity, Gas)</span>
          </h3>
          <span className="text-xs font-mono text-emerald-400 flex items-center gap-1">
            <span className="h-2 w-2 rounded-full bg-emerald-400 animate-pulse" /> Live 2s Feed
          </span>
        </div>

        <div className="h-64 w-full pt-2">
          <ResponsiveContainer width="100%" height="100%">
            <AreaChart data={chartData}>
              <defs>
                <linearGradient id="gradTemp" x1="0" y1="0" x2="0" y2="1">
                  <stop offset="5%" stopColor="#f43f5e" stopOpacity={0.4} />
                  <stop offset="95%" stopColor="#f43f5e" stopOpacity={0} />
                </linearGradient>
                <linearGradient id="gradHum" x1="0" y1="0" x2="0" y2="1">
                  <stop offset="5%" stopColor="#06b6d4" stopOpacity={0.4} />
                  <stop offset="95%" stopColor="#06b6d4" stopOpacity={0} />
                </linearGradient>
              </defs>
              <CartesianGrid strokeDasharray="3 3" stroke="#1e293b" />
              <XAxis dataKey="time" stroke="#64748b" tick={{ fontSize: 10 }} />
              <YAxis stroke="#64748b" tick={{ fontSize: 10 }} />
              <Tooltip contentStyle={{ backgroundColor: '#0f172a', borderColor: '#334155', borderRadius: '12px', fontSize: '11px' }} />
              <Area type="monotone" dataKey="Humidity" stroke="#06b6d4" fillOpacity={1} fill="url(#gradHum)" strokeWidth={2} />
              <Area type="monotone" dataKey="Temperature" stroke="#f43f5e" fillOpacity={1} fill="url(#gradTemp)" strokeWidth={2} />
            </AreaChart>
          </ResponsiveContainer>
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
