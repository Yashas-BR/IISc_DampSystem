import React, { useState } from 'react';
import { useSocket } from '../context/SocketContext';
import { SystemSettings } from '../types/iot';
import {
  Settings as SettingsIcon,
  Save,
  RotateCcw,
  Sliders,
  CheckCircle2,
  SlidersHorizontal,
  Flame,
  Droplets,
  Wind,
  Layers,
  Sun
} from 'lucide-react';

export const SettingsPage: React.FC = () => {
  const { settings, updateSettings, resetSettings } = useSocket();

  const [formState, setFormState] = useState<SystemSettings>({
    humidity_thresh: settings.humidity_thresh || '60',
    temp_thresh: settings.temp_thresh || '30',
    gas_thresh: settings.gas_thresh || '700',
    moisture_thresh: settings.moisture_thresh || '400',
    light_thresh: settings.light_thresh || '500',
    auto_actuators: settings.auto_actuators || 'true'
  });

  const [savedSuccess, setSavedSuccess] = useState(false);

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    updateSettings(formState);
    setSavedSuccess(true);
    setTimeout(() => setSavedSuccess(false), 3000);
  };

  const handleReset = () => {
    resetSettings();
    setFormState({
      humidity_thresh: '60',
      temp_thresh: '30',
      gas_thresh: '700',
      moisture_thresh: '400',
      light_thresh: '500',
      auto_actuators: 'true'
    });
    setSavedSuccess(true);
    setTimeout(() => setSavedSuccess(false), 3000);
  };

  return (
    <div className="space-y-6 max-w-4xl mx-auto">
      <div>
        <h2 className="text-xl font-bold text-white flex items-center gap-2">
          <SettingsIcon className="h-5 w-5 text-emerald-400" />
          <span>System Parameter & Threshold Settings</span>
        </h2>
        <p className="text-xs text-slate-400 mt-1">
          Configure rule engine setpoints for Relay Exhaust Fan triggers, Warning LED activation, and Mold Hazard risk scoring.
        </p>
      </div>

      <form onSubmit={handleSubmit} className="glass-panel rounded-2xl p-6 border border-slate-800 shadow-2xl space-y-6">
        {savedSuccess && (
          <div className="p-4 rounded-xl bg-emerald-950/60 border border-emerald-500/40 text-emerald-300 text-xs flex items-center gap-2 animate-fade-in font-mono">
            <CheckCircle2 className="h-4 w-4 text-emerald-400 shrink-0" />
            <span>Settings successfully saved to SQLite database and broadcasted to system engines.</span>
          </div>
        )}

        <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
          {/* Relative Humidity Threshold */}
          <div className="bg-slate-950/60 rounded-xl p-4 border border-slate-800 space-y-2">
            <div className="flex items-center justify-between">
              <label className="text-xs font-bold text-cyan-300 flex items-center gap-2">
                <Droplets className="h-4 w-4 text-cyan-400" />
                <span>Humidity High Alert Limit</span>
              </label>
              <span className="text-xs font-mono text-cyan-400 font-bold">
                {formState.humidity_thresh}% RH
              </span>
            </div>
            <p className="text-[11px] text-slate-400">
              Triggers Exhaust Fan and Warning LED when ambient relative humidity exceeds this boundary.
            </p>
            <input
              type="range"
              min="30"
              max="95"
              value={formState.humidity_thresh}
              onChange={(e) => setFormState({ ...formState, humidity_thresh: e.target.value })}
              className="w-full h-1.5 bg-slate-800 rounded-lg appearance-none cursor-pointer accent-cyan-400"
            />
          </div>

          {/* Temperature Threshold */}
          <div className="bg-slate-950/60 rounded-xl p-4 border border-slate-800 space-y-2">
            <div className="flex items-center justify-between">
              <label className="text-xs font-bold text-rose-300 flex items-center gap-2">
                <Flame className="h-4 w-4 text-rose-400" />
                <span>Temperature Warning Limit</span>
              </label>
              <span className="text-xs font-mono text-rose-400 font-bold">
                {formState.temp_thresh}°C
              </span>
            </div>
            <p className="text-[11px] text-slate-400">
              Triggers Warning LED and elevates mold spore incubation hazard rating.
            </p>
            <input
              type="range"
              min="15"
              max="45"
              value={formState.temp_thresh}
              onChange={(e) => setFormState({ ...formState, temp_thresh: e.target.value })}
              className="w-full h-1.5 bg-slate-800 rounded-lg appearance-none cursor-pointer accent-rose-500"
            />
          </div>

          {/* MQ135 Gas Threshold */}
          <div className="bg-slate-950/60 rounded-xl p-4 border border-slate-800 space-y-2">
            <div className="flex items-center justify-between">
              <label className="text-xs font-bold text-emerald-300 flex items-center gap-2">
                <Wind className="h-4 w-4 text-emerald-400" />
                <span>MQ135 Air Quality / Gas Limit</span>
              </label>
              <span className="text-xs font-mono text-emerald-400 font-bold">
                {formState.gas_thresh} ADC
              </span>
            </div>
            <p className="text-[11px] text-slate-400">
              Activates Relay Exhaust Fan immediately upon detecting high VOC or airborne gas levels.
            </p>
            <input
              type="range"
              min="200"
              max="950"
              step="10"
              value={formState.gas_thresh}
              onChange={(e) => setFormState({ ...formState, gas_thresh: e.target.value })}
              className="w-full h-1.5 bg-slate-800 rounded-lg appearance-none cursor-pointer accent-emerald-400"
            />
          </div>

          {/* Surface Moisture Threshold */}
          <div className="bg-slate-950/60 rounded-xl p-4 border border-slate-800 space-y-2">
            <div className="flex items-center justify-between">
              <label className="text-xs font-bold text-indigo-300 flex items-center gap-2">
                <Layers className="h-4 w-4 text-indigo-400" />
                <span>Surface Dampness Limit</span>
              </label>
              <span className="text-xs font-mono text-indigo-400 font-bold">
                {formState.moisture_thresh} ADC
              </span>
            </div>
            <p className="text-[11px] text-slate-400">
              Triggers alert when capacitive surface moisture drops below safe dryness value.
            </p>
            <input
              type="range"
              min="100"
              max="900"
              step="10"
              value={formState.moisture_thresh}
              onChange={(e) => setFormState({ ...formState, moisture_thresh: e.target.value })}
              className="w-full h-1.5 bg-slate-800 rounded-lg appearance-none cursor-pointer accent-indigo-400"
            />
          </div>
        </div>

        {/* Action Buttons */}
        <div className="flex items-center justify-end gap-3 pt-4 border-t border-slate-800">
          <button
            type="button"
            onClick={handleReset}
            className="flex items-center gap-1.5 rounded-xl bg-slate-900 px-4 py-2.5 text-xs font-bold text-slate-300 border border-slate-800 hover:bg-slate-800 transition-all"
          >
            <RotateCcw className="h-4 w-4 text-slate-400" />
            <span>Reset Defaults</span>
          </button>

          <button
            type="submit"
            className="flex items-center gap-1.5 rounded-xl bg-gradient-to-r from-emerald-600 to-cyan-600 px-6 py-2.5 text-xs font-bold text-white shadow-lg shadow-emerald-600/20 hover:from-emerald-500 hover:to-cyan-500 transition-all"
          >
            <Save className="h-4 w-4" />
            <span>Save Settings</span>
          </button>
        </div>
      </form>
    </div>
  );
};
