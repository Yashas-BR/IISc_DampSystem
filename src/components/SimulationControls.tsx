import React from 'react';
import { useSocket } from '../context/SocketContext';
import {
  Sliders,
  Thermometer,
  Droplets,
  Sun,
  Wind,
  Layers,
  RotateCcw
} from 'lucide-react';

export const SimulationControls: React.FC = () => {
  const { mode, latestTelemetry, updateSimulation } = useSocket();

  if (mode !== 'SIMULATION') return null;

  const currentTemp = latestTelemetry?.temperature ?? 24.5;
  const currentHum = latestTelemetry?.humidity ?? 52;
  const currentLight = latestTelemetry?.light ?? 480;
  const currentGas = latestTelemetry?.gas ?? 350;
  const currentMoisture = latestTelemetry?.moisture ?? 720;

  const presets = [
    {
      name: '🌱 Optimal Safe',
      values: { temperature: 24, humidity: 45, light: 500, gas: 300, moisture: 750 }
    },
    {
      name: '⚠️ High Mold Risk',
      values: { temperature: 32, humidity: 78, light: 300, gas: 420, moisture: 350 }
    },
    {
      name: '🚨 Gas Leak Hazard',
      values: { temperature: 28, humidity: 55, light: 600, gas: 850, moisture: 600 }
    },
    {
      name: '💧 Wall Dampness Alert',
      values: { temperature: 31, humidity: 72, light: 350, gas: 450, moisture: 250 }
    }
  ];

  return (
    <div className="w-full glass-panel-simulation border-b border-purple-500/30 px-4 py-4 sm:px-6 mb-6 rounded-2xl animate-fade-in shadow-2xl">
      <div className="flex flex-wrap items-center justify-between gap-4 pb-3 border-b border-purple-500/20">
        <div className="flex items-center gap-2">
          <div className="p-1.5 rounded-lg bg-purple-500/20 text-purple-300">
            <Sliders className="h-4 w-4" />
          </div>
          <div>
            <h3 className="text-sm font-bold text-white flex items-center gap-2">
              <span>Simulation Control Deck</span>
              <span className="text-[10px] bg-purple-950 text-purple-300 border border-purple-700 px-2 py-0.5 rounded-full font-mono">
                Manual Override Active
              </span>
            </h3>
            <p className="text-xs text-purple-300/70">
              Drag sliders or input numbers to simulate sensor telemetry in real-time.
            </p>
          </div>
        </div>

        {/* Quick Scenario Presets */}
        <div className="flex flex-wrap items-center gap-2">
          <span className="text-xs text-purple-300 font-semibold mr-1">Presets:</span>
          {presets.map((p) => (
            <button
              key={p.name}
              onClick={() => updateSimulation(p.values)}
              className="rounded-lg bg-purple-950/70 px-2.5 py-1 text-xs text-purple-200 border border-purple-700/50 hover:bg-purple-900 hover:border-purple-500 transition-all font-medium flex items-center gap-1 shadow-sm"
            >
              {p.name}
            </button>
          ))}
          <button
            onClick={() => updateSimulation({ temperature: 24.5, humidity: 50, light: 500, gas: 350, moisture: 700 })}
            className="p-1 rounded-lg text-purple-400 hover:text-white hover:bg-purple-900/50"
            title="Reset to Normal"
          >
            <RotateCcw className="h-3.5 w-3.5" />
          </button>
        </div>
      </div>

      {/* Sliders Grid */}
      <div className="grid grid-cols-1 gap-4 sm:grid-cols-2 lg:grid-cols-5 pt-3">
        {/* Temperature Control */}
        <div className="rounded-xl bg-purple-950/40 p-3 border border-purple-800/40">
          <div className="flex items-center justify-between mb-1.5">
            <label className="text-xs font-semibold text-rose-300 flex items-center gap-1.5">
              <Thermometer className="h-3.5 w-3.5 text-rose-400" />
              <span>Temperature</span>
            </label>
            <div className="flex items-center gap-1">
              <input
                type="number"
                min="0"
                max="50"
                step="0.1"
                value={currentTemp}
                onChange={(e) => updateSimulation({ temperature: parseFloat(e.target.value) || 0 })}
                className="w-14 rounded bg-purple-900/80 text-right text-xs font-mono text-white px-1.5 py-0.5 border border-purple-700 focus:outline-none focus:ring-1 focus:ring-rose-400"
              />
              <span className="text-[10px] text-slate-400 font-mono">°C</span>
            </div>
          </div>
          <input
            type="range"
            min="0"
            max="50"
            step="0.5"
            value={currentTemp}
            onChange={(e) => updateSimulation({ temperature: parseFloat(e.target.value) })}
            className="w-full h-1.5 bg-slate-800 rounded-lg appearance-none cursor-pointer accent-rose-500"
          />
          <div className="flex justify-between text-[10px] text-slate-500 font-mono mt-1">
            <span>0°C</span>
            <span>25°C</span>
            <span>50°C</span>
          </div>
        </div>

        {/* Humidity Control */}
        <div className="rounded-xl bg-purple-950/40 p-3 border border-purple-800/40">
          <div className="flex items-center justify-between mb-1.5">
            <label className="text-xs font-semibold text-cyan-300 flex items-center gap-1.5">
              <Droplets className="h-3.5 w-3.5 text-cyan-400" />
              <span>Humidity</span>
            </label>
            <div className="flex items-center gap-1">
              <input
                type="number"
                min="0"
                max="100"
                value={currentHum}
                onChange={(e) => updateSimulation({ humidity: parseInt(e.target.value) || 0 })}
                className="w-14 rounded bg-purple-900/80 text-right text-xs font-mono text-white px-1.5 py-0.5 border border-purple-700 focus:outline-none focus:ring-1 focus:ring-cyan-400"
              />
              <span className="text-[10px] text-slate-400 font-mono">%</span>
            </div>
          </div>
          <input
            type="range"
            min="0"
            max="100"
            value={currentHum}
            onChange={(e) => updateSimulation({ humidity: parseInt(e.target.value) })}
            className="w-full h-1.5 bg-slate-800 rounded-lg appearance-none cursor-pointer accent-cyan-400"
          />
          <div className="flex justify-between text-[10px] text-slate-500 font-mono mt-1">
            <span>0%</span>
            <span>60% (Thresh)</span>
            <span>100%</span>
          </div>
        </div>

        {/* Light Control */}
        <div className="rounded-xl bg-purple-950/40 p-3 border border-purple-800/40">
          <div className="flex items-center justify-between mb-1.5">
            <label className="text-xs font-semibold text-amber-300 flex items-center gap-1.5">
              <Sun className="h-3.5 w-3.5 text-amber-400" />
              <span>Ambient Light</span>
            </label>
            <div className="flex items-center gap-1">
              <input
                type="number"
                min="0"
                max="1023"
                value={currentLight}
                onChange={(e) => updateSimulation({ light: parseInt(e.target.value) || 0 })}
                className="w-16 rounded bg-purple-900/80 text-right text-xs font-mono text-white px-1.5 py-0.5 border border-purple-700 focus:outline-none focus:ring-1 focus:ring-amber-400"
              />
            </div>
          </div>
          <input
            type="range"
            min="0"
            max="1023"
            value={currentLight}
            onChange={(e) => updateSimulation({ light: parseInt(e.target.value) })}
            className="w-full h-1.5 bg-slate-800 rounded-lg appearance-none cursor-pointer accent-amber-400"
          />
          <div className="flex justify-between text-[10px] text-slate-500 font-mono mt-1">
            <span>0 (Dark)</span>
            <span>1023 (Bright)</span>
          </div>
        </div>

        {/* Gas Control */}
        <div className="rounded-xl bg-purple-950/40 p-3 border border-purple-800/40">
          <div className="flex items-center justify-between mb-1.5">
            <label className="text-xs font-semibold text-emerald-300 flex items-center gap-1.5">
              <Wind className="h-3.5 w-3.5 text-emerald-400" />
              <span>MQ135 Gas</span>
            </label>
            <div className="flex items-center gap-1">
              <input
                type="number"
                min="0"
                max="1023"
                value={currentGas}
                onChange={(e) => updateSimulation({ gas: parseInt(e.target.value) || 0 })}
                className="w-16 rounded bg-purple-900/80 text-right text-xs font-mono text-white px-1.5 py-0.5 border border-purple-700 focus:outline-none focus:ring-1 focus:ring-emerald-400"
              />
            </div>
          </div>
          <input
            type="range"
            min="0"
            max="1023"
            value={currentGas}
            onChange={(e) => updateSimulation({ gas: parseInt(e.target.value) })}
            className="w-full h-1.5 bg-slate-800 rounded-lg appearance-none cursor-pointer accent-emerald-400"
          />
          <div className="flex justify-between text-[10px] text-slate-500 font-mono mt-1">
            <span>0</span>
            <span>700 (Warn)</span>
            <span>1023</span>
          </div>
        </div>

        {/* Surface Moisture Control */}
        <div className="rounded-xl bg-purple-950/40 p-3 border border-purple-800/40">
          <div className="flex items-center justify-between mb-1.5">
            <label className="text-xs font-semibold text-indigo-300 flex items-center gap-1.5">
              <Layers className="h-3.5 w-3.5 text-indigo-400" />
              <span>Surface Moisture</span>
            </label>
            <div className="flex items-center gap-1">
              <input
                type="number"
                min="0"
                max="1023"
                value={currentMoisture}
                onChange={(e) => updateSimulation({ moisture: parseInt(e.target.value) || 0 })}
                className="w-16 rounded bg-purple-900/80 text-right text-xs font-mono text-white px-1.5 py-0.5 border border-purple-700 focus:outline-none focus:ring-1 focus:ring-indigo-400"
              />
            </div>
          </div>
          <input
            type="range"
            min="0"
            max="1023"
            value={currentMoisture}
            onChange={(e) => updateSimulation({ moisture: parseInt(e.target.value) })}
            className="w-full h-1.5 bg-slate-800 rounded-lg appearance-none cursor-pointer accent-indigo-400"
          />
          <div className="flex justify-between text-[10px] text-slate-500 font-mono mt-1">
            <span>0 (Damp)</span>
            <span>400 (Warn)</span>
            <span>1023 (Dry)</span>
          </div>
        </div>
      </div>
    </div>
  );
};
