import React from 'react';
import { useSocket } from '../context/SocketContext';
import {
  Activity,
  Cpu,
  Radio,
  CheckCircle2,
  XCircle,
  Clock,
  Zap,
  ShieldCheck,
  RefreshCw,
  HardDrive
} from 'lucide-react';

export const DeviceHealthPage: React.FC = () => {
  const { connectionStatus, latestTelemetry, availablePorts, mode, refreshPorts, sendCommand } = useSocket();

  const isConnected = connectionStatus.connected;
  const lastTime = latestTelemetry?.timestamp
    ? new Date(latestTelemetry.timestamp).toLocaleString()
    : 'None received yet';

  const sensors = [
    {
      name: 'DHT11 Temperature & Humidity',
      pin: 'Pin D2 (Digital)',
      status: latestTelemetry ? 'OPERATIONAL' : 'OFFLINE',
      value: latestTelemetry ? `${latestTelemetry.temperature}°C / ${latestTelemetry.humidity}%` : 'N/A',
      health: 'GOOD'
    },
    {
      name: 'LDR Ambient Light Sensor',
      pin: 'Pin A0 (Analog)',
      status: latestTelemetry ? 'OPERATIONAL' : 'OFFLINE',
      value: latestTelemetry ? `${latestTelemetry.light} ADC` : 'N/A',
      health: 'GOOD'
    },
    {
      name: 'MQ135 Air Quality / Gas',
      pin: 'Pin A1 (Analog)',
      status: latestTelemetry ? 'OPERATIONAL' : 'OFFLINE',
      value: latestTelemetry ? `${latestTelemetry.gas} ADC` : 'N/A',
      health: 'GOOD'
    },
    {
      name: 'Capacitive Surface Moisture',
      pin: 'Pin A2 (Analog)',
      status: latestTelemetry ? 'OPERATIONAL' : 'OFFLINE',
      value: latestTelemetry ? `${latestTelemetry.moisture} ADC` : 'N/A',
      health: 'GOOD'
    }
  ];

  const actuators = [
    {
      name: 'Relay Exhaust Fan',
      pin: 'Pin D5 (Digital Output)',
      state: latestTelemetry?.fan ? 'RUNNING (HIGH)' : 'STOPPED (LOW)',
      isActive: latestTelemetry?.fan,
      cmdKey: 'fan' as const
    },
    {
      name: 'Warning Indicator LED',
      pin: 'Pin D13 (Digital Output)',
      state: latestTelemetry?.led ? 'ACTIVE (HIGH)' : 'STANDBY (LOW)',
      isActive: latestTelemetry?.led,
      cmdKey: 'led' as const
    }
  ];

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex flex-wrap items-center justify-between gap-4">
        <div>
          <h2 className="text-xl font-bold text-white flex items-center gap-2">
            <Activity className="h-5 w-5 text-emerald-400" />
            <span>Arduino Hardware & Device Diagnostics</span>
          </h2>
          <p className="text-xs text-slate-400 mt-1">
            Real-time I/O pin integrity, COM serial link telemetry, and actuator self-test diagnostic controls.
          </p>
        </div>

        <button
          onClick={refreshPorts}
          className="flex items-center gap-1.5 rounded-xl bg-slate-900 px-3.5 py-2 text-xs font-semibold text-slate-300 border border-slate-800 hover:bg-slate-800 transition-all"
        >
          <RefreshCw className="h-3.5 w-3.5 text-emerald-400" />
          <span>Rescan Hardware</span>
        </button>
      </div>

      {/* Main Grid */}
      <div className="grid grid-cols-1 gap-6 lg:grid-cols-3">
        {/* Arduino Connection Card (Green/Red Status) */}
        <div className="glass-panel rounded-2xl p-6 border border-slate-800 shadow-2xl flex flex-col justify-between space-y-6">
          <div>
            <div className="flex items-center justify-between pb-3 border-b border-slate-800">
              <h3 className="text-sm font-bold text-white flex items-center gap-2">
                <Cpu className="h-4 w-4 text-emerald-400" />
                <span>Arduino Mega 2560 Serial Link</span>
              </h3>
              {/* Green when connected, Red when disconnected */}
              <span className={`px-2.5 py-1 rounded-full text-[10px] font-mono font-bold flex items-center gap-1.5 ${
                isConnected
                  ? 'bg-emerald-950 text-emerald-300 border border-emerald-600'
                  : 'bg-rose-950 text-rose-300 border border-rose-600'
              }`}>
                <span className={`h-2 w-2 rounded-full ${isConnected ? 'bg-emerald-400 animate-pulse' : 'bg-rose-500'}`} />
                {isConnected ? 'CONNECTED' : 'DISCONNECTED'}
              </span>
            </div>

            <div className="mt-4 space-y-3 text-xs">
              <div className="flex justify-between py-1.5 border-b border-slate-800/60">
                <span className="text-slate-400">Current COM Port:</span>
                <span className="font-mono text-emerald-400 font-bold">
                  {connectionStatus.port || (mode === 'SIMULATION' ? 'SIMULATOR_PORT_0' : 'None Detected')}
                </span>
              </div>

              <div className="flex justify-between py-1.5 border-b border-slate-800/60">
                <span className="text-slate-400">Baud Rate:</span>
                <span className="font-mono text-white">115200 Baud</span>
              </div>

              <div className="flex justify-between py-1.5 border-b border-slate-800/60">
                <span className="text-slate-400">System Data Source:</span>
                <span className="font-mono text-purple-400 font-bold">{mode} MODE</span>
              </div>

              <div className="flex justify-between py-1.5 border-b border-slate-800/60">
                <span className="text-slate-400">Last Telemetry Sync:</span>
                <span className="font-mono text-slate-300">{lastTime}</span>
              </div>
            </div>
          </div>

          <div className="p-3 rounded-xl bg-slate-950/80 border border-slate-800 text-[11px] text-slate-400">
            <span className="font-semibold text-slate-300 block mb-1">Auto-Detect Status:</span>
            Scans for Vendor IDs 0x2341 (Arduino SA), 0x1A86 (CH340), and standard FTDI USB serial chips on Windows COM stack.
          </div>
        </div>

        {/* Sensor & Actuator Diagnostic Breakdown (Right 2 Columns) */}
        <div className="lg:col-span-2 space-y-6">
          {/* Sensors Status Table */}
          <div className="glass-panel rounded-2xl p-6 border border-slate-800 shadow-2xl">
            <h3 className="text-sm font-bold text-white mb-4 border-b border-slate-800 pb-3 flex items-center gap-2">
              <ShieldCheck className="h-4 w-4 text-cyan-400" />
              <span>Sensors Health Diagnostics</span>
            </h3>

            <div className="overflow-x-auto">
              <table className="w-full text-left text-xs">
                <thead className="bg-slate-900/80 text-slate-400 uppercase font-mono text-[10px]">
                  <tr>
                    <th className="p-3">Sensor Name</th>
                    <th className="p-3">Hardware Pin</th>
                    <th className="p-3">Live Payload</th>
                    <th className="p-3 text-right">Status</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-slate-800/60 font-mono">
                  {sensors.map((s, idx) => (
                    <tr key={idx} className="hover:bg-slate-900/40">
                      <td className="p-3 text-white font-semibold font-sans">{s.name}</td>
                      <td className="p-3 text-cyan-400">{s.pin}</td>
                      <td className="p-3 text-slate-300">{s.value}</td>
                      <td className="p-3 text-right">
                        <span className="px-2 py-0.5 rounded text-[10px] bg-emerald-950 text-emerald-300 border border-emerald-800 font-bold">
                          {s.status}
                        </span>
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          </div>

          {/* Actuator Self-Test Cards */}
          <div className="glass-panel rounded-2xl p-6 border border-slate-800 shadow-2xl space-y-4">
            <h3 className="text-sm font-bold text-white border-b border-slate-800 pb-3 flex items-center gap-2">
              <Zap className="h-4 w-4 text-amber-400" />
              <span>Actuator Diagnostics & Manual Test Toggle</span>
            </h3>

            <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
              {actuators.map((act) => (
                <div key={act.name} className="p-4 rounded-xl bg-slate-950/60 border border-slate-800 flex items-center justify-between">
                  <div>
                    <h4 className="text-xs font-bold text-white">{act.name}</h4>
                    <span className="text-[10px] text-cyan-400 font-mono block mt-0.5">{act.pin}</span>
                    <span className={`text-[10px] font-mono mt-1 inline-block ${act.isActive ? 'text-emerald-400 font-bold' : 'text-slate-400'}`}>
                      {act.state}
                    </span>
                  </div>

                  <button
                    onClick={() => sendCommand({ [act.cmdKey]: !act.isActive })}
                    className={`px-3 py-1.5 rounded-lg text-xs font-mono font-bold transition-all ${
                      act.isActive
                        ? 'bg-rose-500/20 text-rose-300 border border-rose-500/40 hover:bg-rose-500/30'
                        : 'bg-emerald-500/20 text-emerald-300 border border-emerald-500/40 hover:bg-emerald-500/30'
                    }`}
                  >
                    {act.isActive ? 'Turn OFF' : 'Test ON'}
                  </button>
                </div>
              ))}
            </div>
          </div>
        </div>
      </div>
    </div>
  );
};
