import React, { useEffect, useState, useRef } from 'react';
import { useSocket } from '../context/SocketContext';
import { AnalyticsSummary } from '../types/iot';
import {
  BarChart3,
  Download,
  FileImage,
  Clock,
  Zap,
  Activity,
  Flame,
  Droplets,
  Wind,
  Layers,
  Calendar
} from 'lucide-react';
import {
  ResponsiveContainer,
  AreaChart,
  Area,
  XAxis,
  YAxis,
  Tooltip,
  CartesianGrid,
  Legend
} from 'recharts';
import html2canvas from 'html2canvas';

export const AnalyticsPage: React.FC = () => {
  const { telemetryHistory } = useSocket();
  const [analytics, setAnalytics] = useState<AnalyticsSummary | null>(null);
  const [timeframe, setTimeframe] = useState<'1m' | '5m' | '1h' | '24h'>('5m');
  const chartRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    fetchAnalytics();
    const interval = setInterval(fetchAnalytics, 5000);
    return () => clearInterval(interval);
  }, []);

  const fetchAnalytics = async () => {
    try {
      const res = await fetch('/api/analytics');
      const data = await res.json();
      setAnalytics(data);
    } catch (err) {
      console.error('Failed to fetch analytics summary:', err);
    }
  };

  // Filter telemetry points by timeframe
  const pointsCount =
    timeframe === '1m' ? 30 : timeframe === '5m' ? 150 : timeframe === '1h' ? 1800 : 43200;

  const chartData = telemetryHistory.slice(-pointsCount).map((t, idx) => ({
    time: t.timestamp ? new Date(t.timestamp).toLocaleTimeString() : `#${idx}`,
    Temperature: t.temperature,
    Humidity: t.humidity,
    Gas: t.gas,
    Light: t.light,
    Moisture: t.moisture,
    Risk: t.riskScore || 0
  }));

  const exportPNG = async () => {
    if (!chartRef.current) return;
    try {
      const canvas = await html2canvas(chartRef.current, { backgroundColor: '#070a12' });
      const image = canvas.toDataURL('image/png');
      const link = document.createElement('a');
      link.href = image;
      link.download = `IoT_Analytics_Chart_${timeframe}.png`;
      link.click();
    } catch (e) {
      console.error('Export PNG failed:', e);
    }
  };

  const exportCSV = () => {
    window.location.href = '/api/reports/csv';
  };

  return (
    <div className="space-y-6">
      {/* Top Section Header */}
      <div className="flex flex-wrap items-center justify-between gap-4">
        <div>
          <h2 className="text-xl font-bold text-white flex items-center gap-2">
            <BarChart3 className="h-5 w-5 text-emerald-400" />
            <span>Industrial Telemetry & Environmental Analytics</span>
          </h2>
          <p className="text-xs text-slate-400 mt-1">
            Statistical aggregation, historical sensor trend curves, actuator duty cycles, and risk correlation models.
          </p>
        </div>

        {/* Timeframe Selectors & Export Buttons */}
        <div className="flex flex-wrap items-center gap-3">
          {/* Timeframe Buttons */}
          <div className="flex items-center rounded-xl bg-slate-950 p-1 border border-slate-800">
            {(['1m', '5m', '1h', '24h'] as const).map((tf) => (
              <button
                key={tf}
                onClick={() => setTimeframe(tf)}
                className={`rounded-lg px-3 py-1.5 text-xs font-mono font-semibold transition-all ${
                  timeframe === tf
                    ? 'bg-emerald-500/20 text-emerald-400 border border-emerald-500/40 shadow-sm'
                    : 'text-slate-400 hover:text-slate-200'
                }`}
              >
                {tf.toUpperCase()}
              </button>
            ))}
          </div>

          <button
            onClick={exportCSV}
            className="flex items-center gap-1.5 rounded-xl bg-slate-900 px-3 py-2 text-xs font-semibold text-slate-300 border border-slate-800 hover:bg-slate-800 hover:text-white transition-all"
          >
            <Download className="h-3.5 w-3.5 text-emerald-400" />
            <span>Export CSV</span>
          </button>

          <button
            onClick={exportPNG}
            className="flex items-center gap-1.5 rounded-xl bg-slate-900 px-3 py-2 text-xs font-semibold text-slate-300 border border-slate-800 hover:bg-slate-800 hover:text-white transition-all"
          >
            <FileImage className="h-3.5 w-3.5 text-cyan-400" />
            <span>Export PNG</span>
          </button>
        </div>
      </div>

      {/* Analytics Summary Stats Grid */}
      <div className="grid grid-cols-2 gap-4 sm:grid-cols-3 lg:grid-cols-5">
        <div className="glass-panel rounded-2xl p-4 border border-slate-800">
          <span className="text-[11px] text-slate-400 flex items-center gap-1">
            <Flame className="h-3.5 w-3.5 text-rose-400" /> Average Temp
          </span>
          <p className="text-xl font-bold font-mono text-white mt-1">
            {analytics?.stats.avgTemp ? analytics.stats.avgTemp.toFixed(1) : '24.5'} °C
          </p>
          <span className="text-[10px] text-slate-500 font-mono">
            Max Peak: {analytics?.stats.maxTemp ? analytics.stats.maxTemp.toFixed(1) : '32.0'} °C
          </span>
        </div>

        <div className="glass-panel rounded-2xl p-4 border border-slate-800">
          <span className="text-[11px] text-slate-400 flex items-center gap-1">
            <Droplets className="h-3.5 w-3.5 text-cyan-400" /> Average Humidity
          </span>
          <p className="text-xl font-bold font-mono text-white mt-1">
            {analytics?.stats.avgHumidity ? analytics.stats.avgHumidity.toFixed(1) : '52.0'} %
          </p>
          <span className="text-[10px] text-slate-500 font-mono">
            Max Peak: {analytics?.stats.maxHumidity ? analytics.stats.maxHumidity.toFixed(0) : '78'} %
          </span>
        </div>

        <div className="glass-panel rounded-2xl p-4 border border-slate-800">
          <span className="text-[11px] text-slate-400 flex items-center gap-1">
            <Wind className="h-3.5 w-3.5 text-emerald-400" /> Average Gas
          </span>
          <p className="text-xl font-bold font-mono text-white mt-1">
            {analytics?.stats.avgGas ? analytics.stats.avgGas.toFixed(0) : '350'}
          </p>
          <span className="text-[10px] text-slate-500 font-mono">
            Max Peak: {analytics?.stats.maxGas || '850'} ADC
          </span>
        </div>

        <div className="glass-panel rounded-2xl p-4 border border-slate-800">
          <span className="text-[11px] text-slate-400 flex items-center gap-1">
            <Layers className="h-3.5 w-3.5 text-indigo-400" /> Average Moisture
          </span>
          <p className="text-xl font-bold font-mono text-white mt-1">
            {analytics?.stats.avgMoisture ? analytics.stats.avgMoisture.toFixed(0) : '720'}
          </p>
          <span className="text-[10px] text-slate-500 font-mono">
            Min Wetness: {analytics?.stats.minMoisture || '250'} ADC
          </span>
        </div>

        <div className="glass-panel rounded-2xl p-4 border border-slate-800">
          <span className="text-[11px] text-slate-400 flex items-center gap-1">
            <Zap className="h-3.5 w-3.5 text-amber-400" /> Fan Runtime
          </span>
          <p className="text-xl font-bold font-mono text-white mt-1">
            {analytics ? Math.floor(analytics.fanRuntimeSeconds / 60) : 0} m{' '}
            <span className="text-xs text-slate-400">({analytics ? analytics.fanRuntimeSeconds % 60 : 0}s)</span>
          </p>
          <span className="text-[10px] text-slate-500 font-mono">
            Total System Alerts: {analytics?.totalAlerts ?? 0}
          </span>
        </div>
      </div>

      {/* Main Interactive Multi-Stream Recharts Area */}
      <div ref={chartRef} className="glass-panel rounded-2xl p-6 border border-slate-800 space-y-6 shadow-2xl">
        <div className="flex items-center justify-between pb-3 border-b border-slate-800">
          <div>
            <h3 className="text-sm font-bold text-white flex items-center gap-2">
              <Activity className="h-4 w-4 text-emerald-400" />
              <span>Multi-Parameter Real-Time Trend Stream</span>
            </h3>
            <span className="text-xs text-slate-400">
              Showing last {chartData.length} records ({timeframe} window)
            </span>
          </div>
          <div className="flex items-center gap-4 text-xs font-mono">
            <span className="flex items-center gap-1 text-rose-400">● Temp (°C)</span>
            <span className="flex items-center gap-1 text-cyan-400">● Humidity (%)</span>
            <span className="flex items-center gap-1 text-emerald-400">● Gas (ADC)</span>
            <span className="flex items-center gap-1 text-purple-400">● Risk Score (%)</span>
          </div>
        </div>

        <div className="h-96 w-full pt-4">
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
                <linearGradient id="gradRisk" x1="0" y1="0" x2="0" y2="1">
                  <stop offset="5%" stopColor="#a855f7" stopOpacity={0.4} />
                  <stop offset="95%" stopColor="#a855f7" stopOpacity={0} />
                </linearGradient>
              </defs>
              <CartesianGrid strokeDasharray="3 3" stroke="#1e293b" />
              <XAxis dataKey="time" stroke="#64748b" tick={{ fontSize: 11 }} />
              <YAxis stroke="#64748b" tick={{ fontSize: 11 }} />
              <Tooltip
                contentStyle={{
                  backgroundColor: '#0f172a',
                  borderColor: '#334155',
                  borderRadius: '12px',
                  color: '#fff',
                  fontSize: '12px'
                }}
              />
              <Area type="monotone" dataKey="Humidity" stroke="#06b6d4" fillOpacity={1} fill="url(#gradHum)" strokeWidth={2} />
              <Area type="monotone" dataKey="Temperature" stroke="#f43f5e" fillOpacity={1} fill="url(#gradTemp)" strokeWidth={2} />
              <Area type="monotone" dataKey="Risk" stroke="#a855f7" fillOpacity={1} fill="url(#gradRisk)" strokeWidth={2} />
            </AreaChart>
          </ResponsiveContainer>
        </div>
      </div>
    </div>
  );
};
