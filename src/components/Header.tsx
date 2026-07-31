import React, { useState } from 'react';
import { useSocket } from '../context/SocketContext';
import {
  Bell,
  Cpu,
  Radio,
  Sliders,
  Wifi,
  CheckCircle2,
  AlertTriangle,
  XCircle,
  RefreshCw
} from 'lucide-react';

export const Header: React.FC = () => {
  const {
    mode,
    connectionStatus,
    availablePorts,
    switchMode,
    unreadAlertCount,
    alerts,
    acknowledgeAlert,
    clearAlerts,
    refreshPorts
  } = useSocket();

  const [showAlertDrawer, setShowAlertDrawer] = useState(false);
  const [showPortMenu, setShowPortMenu] = useState(false);

  return (
    <header className="sticky top-0 z-40 w-full glass-panel border-b border-slate-800/80 px-4 py-3 sm:px-6">
      <div className="mx-auto flex flex-wrap items-center justify-between gap-4">
        {/* Brand & System Title */}
        <div className="flex items-center gap-3">
          <div className="relative flex h-10 w-10 items-center justify-center rounded-xl bg-gradient-to-br from-emerald-500/20 to-cyan-500/20 p-2 border border-emerald-500/30 shadow-lg shadow-emerald-500/10">
            <Cpu className="h-6 w-6 text-emerald-400" />
            <span className="absolute -bottom-0.5 -right-0.5 flex h-3 w-3">
              <span className="animate-ping absolute inline-flex h-full w-full rounded-full bg-emerald-400 opacity-75"></span>
              <span className="relative inline-flex rounded-full h-3 w-3 bg-emerald-500"></span>
            </span>
          </div>
          <div>
            <div className="flex items-center gap-2">
              <h1 className="text-lg font-bold tracking-tight text-white sm:text-xl">
                Smart Mold & Damp Prevention
              </h1>
              <span className="hidden rounded-full bg-slate-800 px-2 py-0.5 text-xs font-mono text-emerald-400 border border-slate-700 md:inline-block">
                v1.0 Mega 2560
              </span>
            </div>
            <p className="text-xs text-slate-400 flex items-center gap-2">
              <span>Real-Time IoT Telemetry & Industrial Automation</span>
            </p>
          </div>
        </div>

        {/* Controls, Mode Switcher & Status Badges */}
        <div className="flex flex-wrap items-center gap-3">
          {/* Mode Switcher Toggle Buttons */}
          <div className="flex items-center rounded-xl bg-slate-950/80 p-1 border border-slate-800">
            {/* LIVE — physical Arduino over Serial */}
            <button
              onClick={() => {
                const target = availablePorts.length > 0 ? availablePorts[0].path : null;
                switchMode('LIVE', target || undefined);
              }}
              className={`flex items-center gap-1.5 rounded-lg px-3 py-1.5 text-xs font-semibold transition-all ${
                mode === 'LIVE'
                  ? 'bg-emerald-500/20 text-emerald-400 border border-emerald-500/50 shadow-md shadow-emerald-500/10'
                  : 'text-slate-400 hover:text-slate-200'
              }`}
            >
              <Radio className={`h-3.5 w-3.5 ${mode === 'LIVE' ? 'animate-pulse text-emerald-400' : ''}`} />
              <span>🟢 Live</span>
            </button>

            {/* WIFI — battery-powered Arduino via ESP8266 HTTP POST */}
            <button
              onClick={() => switchMode('CLOUD')}
              className={`flex items-center gap-1.5 rounded-lg px-3 py-1.5 text-xs font-semibold transition-all ${
                mode === 'CLOUD' || mode === 'WIFI'
                  ? 'bg-cyan-500/20 text-cyan-300 border border-cyan-500/50 shadow-md shadow-cyan-500/10'
                  : 'text-slate-400 hover:text-slate-200'
              }`}
            >
              <Wifi className={`h-3.5 w-3.5 ${(mode === 'CLOUD' || mode === 'WIFI') ? 'animate-pulse text-cyan-400' : ''}`} />
              <span>📶 WiFi</span>
            </button>

            {/* SIMULATION — synthetic data, no hardware */}
            <button
              onClick={() => switchMode('SIMULATION')}
              className={`flex items-center gap-1.5 rounded-lg px-3 py-1.5 text-xs font-semibold transition-all ${
                mode === 'SIMULATION'
                  ? 'bg-purple-500/20 text-purple-300 border border-purple-500/50 shadow-md shadow-purple-500/10'
                  : 'text-slate-400 hover:text-slate-200'
              }`}
            >
              <Sliders className="h-3.5 w-3.5 text-purple-400" />
              <span>🟣 Sim</span>
            </button>
          </div>

          {/* Connection Status Badge & Port Dropdown — hidden in WiFi/Cloud mode */}
          {mode !== 'CLOUD' && mode !== 'WIFI' && (
          <div className="relative">
            <button
              onClick={() => {
                refreshPorts();
                setShowPortMenu(!showPortMenu);
              }}
              className={`flex items-center gap-2 rounded-xl px-3 py-1.5 text-xs font-medium border transition-all ${
                connectionStatus.connected
                  ? 'bg-emerald-500/10 text-emerald-300 border-emerald-500/30 hover:bg-emerald-500/20'
                  : 'bg-rose-500/10 text-rose-300 border-rose-500/30 hover:bg-rose-500/20'
              }`}
            >
              <span className={`h-2 w-2 rounded-full ${connectionStatus.connected ? 'bg-emerald-400 animate-pulse' : 'bg-rose-500'}`} />
              <span className="font-mono">
                {connectionStatus.connected
                  ? connectionStatus.port || 'Connected'
                  : mode === 'LIVE' ? 'Connect COM Port' : 'Disconnected'}
              </span>
              <RefreshCw className="h-3 w-3 text-slate-400 hover:rotate-180 transition-transform" />
            </button>

            {/* COM Port Selector Menu */}
            {showPortMenu && (
              <div className="absolute right-0 mt-2 w-72 rounded-xl glass-panel p-3 shadow-2xl z-50 border border-slate-700">
                <div className="flex items-center justify-between pb-2 mb-2 border-b border-slate-800">
                  <span className="text-xs font-bold text-slate-300">Select COM Port</span>
                  <button onClick={refreshPorts} className="text-slate-400 hover:text-white text-xs flex items-center gap-1">
                    <RefreshCw className="h-3 w-3" /> Rescan
                  </button>
                </div>
                {availablePorts.length === 0 ? (
                  <p className="text-xs text-slate-400 py-2 text-center">No COM Ports detected on host machine.</p>
                ) : (
                  <div className="space-y-1">
                    {availablePorts.map((p) => (
                      <button
                        key={p.path}
                        onClick={() => {
                          switchMode('LIVE', p.path);
                          setShowPortMenu(false);
                        }}
                        className={`w-full text-left px-2.5 py-2 rounded-lg text-xs font-mono flex items-center justify-between transition-colors ${
                          connectionStatus.port === p.path
                            ? 'bg-emerald-500/20 text-emerald-300 border border-emerald-500/30'
                            : 'hover:bg-slate-800 text-slate-300'
                        }`}
                      >
                        <div className="flex flex-col">
                          <span className="font-bold text-white">{p.path}</span>
                          <span className="text-[10px] text-slate-400">{p.friendlyName || p.manufacturer}</span>
                        </div>
                        {p.isArduino && (
                          <span className="text-[10px] bg-emerald-950 text-emerald-400 px-1.5 py-0.5 rounded border border-emerald-800">
                            Arduino
                          </span>
                        )}
                      </button>
                    ))}
                  </div>
                )}
              </div>
            )}
          </div>
          )}

          {/* WiFi connection status badge — shown only in WiFi/Cloud mode */}
          {(mode === 'CLOUD' || mode === 'WIFI') && (
            <div className={`flex items-center gap-2 rounded-xl px-3 py-1.5 text-xs font-medium border ${
              connectionStatus.connected
                ? 'bg-cyan-500/10 text-cyan-300 border-cyan-500/30'
                : 'bg-slate-900/60 text-slate-400 border-slate-700'
            }`}>
              <span className={`h-2 w-2 rounded-full ${
                connectionStatus.connected ? 'bg-cyan-400 animate-pulse' : 'bg-slate-600'
              }`} />
              <span className="font-mono">
                {connectionStatus.connected
                  ? `WiFi ${connectionStatus.port || '— ESP8266'}`
                  : 'Waiting for ESP8266…'}
              </span>
            </div>
          )}

          {/* Notification Bell & Unread Badge Drawer */}
          <div className="relative">
            <button
              onClick={() => setShowAlertDrawer(!showAlertDrawer)}
              className="relative rounded-xl bg-slate-900/80 p-2.5 text-slate-300 border border-slate-800 hover:bg-slate-800 hover:text-white transition-all"
            >
              <Bell className="h-4 w-4" />
              {unreadAlertCount > 0 && (
                <span className="absolute -top-1 -right-1 flex h-4 w-4 items-center justify-center rounded-full bg-rose-500 text-[10px] font-bold text-white shadow-lg animate-bounce">
                  {unreadAlertCount}
                </span>
              )}
            </button>

            {/* Alert Drawer */}
            {showAlertDrawer && (
              <div className="absolute right-0 mt-2 w-80 sm:w-96 rounded-2xl glass-panel p-4 shadow-2xl z-50 border border-slate-700">
                <div className="flex items-center justify-between pb-3 border-b border-slate-800">
                  <div className="flex items-center gap-2">
                    <Bell className="h-4 w-4 text-emerald-400" />
                    <span className="text-sm font-bold text-white">System Notifications</span>
                  </div>
                  {alerts.length > 0 && (
                    <button
                      onClick={clearAlerts}
                      className="text-xs text-rose-400 hover:underline"
                    >
                      Clear All
                    </button>
                  )}
                </div>

                <div className="mt-3 max-h-80 overflow-y-auto space-y-2 pr-1">
                  {alerts.length === 0 ? (
                    <div className="py-6 text-center text-slate-500 text-xs">
                      No active alerts. System running normally.
                    </div>
                  ) : (
                    alerts.slice(0, 15).map((a, idx) => (
                      <div
                        key={idx}
                        onClick={() => a.id && acknowledgeAlert(a.id)}
                        className={`p-2.5 rounded-xl border text-xs transition-all cursor-pointer ${
                          a.severity === 'CRITICAL'
                            ? 'bg-rose-950/40 border-rose-800/60 text-rose-200'
                            : a.severity === 'WARNING'
                            ? 'bg-amber-950/40 border-amber-800/60 text-amber-200'
                            : 'bg-slate-900 border-slate-800 text-slate-300'
                        } ${!a.acknowledged ? 'ring-1 ring-emerald-500/40' : 'opacity-70'}`}
                      >
                        <div className="flex items-start gap-2">
                          {a.severity === 'CRITICAL' ? (
                            <XCircle className="h-4 w-4 text-rose-400 shrink-0 mt-0.5" />
                          ) : a.severity === 'WARNING' ? (
                            <AlertTriangle className="h-4 w-4 text-amber-400 shrink-0 mt-0.5" />
                          ) : (
                            <CheckCircle2 className="h-4 w-4 text-emerald-400 shrink-0 mt-0.5" />
                          )}
                          <div className="flex-1">
                            <p className="font-semibold">{a.message}</p>
                            <span className="text-[10px] text-slate-400 font-mono">
                              {a.timestamp ? new Date(a.timestamp).toLocaleTimeString() : 'Just now'}
                            </span>
                          </div>
                        </div>
                      </div>
                    ))
                  )}
                </div>
              </div>
            )}
          </div>
        </div>
      </div>
    </header>
  );
};
