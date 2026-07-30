import React, { useState } from 'react';
import { useSocket } from '../context/SocketContext';
import {
  AlertOctagon,
  CheckCircle2,
  AlertTriangle,
  XCircle,
  Clock,
  Filter,
  Trash2,
  CheckCheck
} from 'lucide-react';

export const AlertsPage: React.FC = () => {
  const { alerts, acknowledgeAlert, clearAlerts } = useSocket();
  const [severityFilter, setSeverityFilter] = useState<'ALL' | 'CRITICAL' | 'WARNING' | 'INFO'>('ALL');

  const filteredAlerts = alerts.filter(a => {
    if (severityFilter === 'ALL') return true;
    return a.severity === severityFilter;
  });

  return (
    <div className="space-y-6">
      {/* Page Header */}
      <div className="flex flex-wrap items-center justify-between gap-4">
        <div>
          <h2 className="text-xl font-bold text-white flex items-center gap-2">
            <AlertOctagon className="h-5 w-5 text-rose-400" />
            <span>Alert Audit Log & Timeline</span>
          </h2>
          <p className="text-xs text-slate-400 mt-1">
            Real-time hazard notifications, threshold violation events, and serial disconnect logs.
          </p>
        </div>

        <div className="flex flex-wrap items-center gap-3">
          {/* Severity Filters */}
          <div className="flex items-center rounded-xl bg-slate-950 p-1 border border-slate-800 text-xs">
            {(['ALL', 'CRITICAL', 'WARNING', 'INFO'] as const).map((sev) => (
              <button
                key={sev}
                onClick={() => setSeverityFilter(sev)}
                className={`rounded-lg px-3 py-1.5 font-semibold transition-all ${
                  severityFilter === sev
                    ? 'bg-slate-800 text-white shadow-sm'
                    : 'text-slate-400 hover:text-slate-200'
                }`}
              >
                {sev}
              </button>
            ))}
          </div>

          <button
            onClick={clearAlerts}
            className="flex items-center gap-1.5 rounded-xl bg-rose-950/60 px-3 py-2 text-xs font-semibold text-rose-300 border border-rose-800 hover:bg-rose-900 transition-all"
          >
            <Trash2 className="h-3.5 w-3.5" />
            <span>Clear History</span>
          </button>
        </div>
      </div>

      {/* Main Content Grid: Alert Timeline + Filterable Table */}
      <div className="grid grid-cols-1 gap-6 lg:grid-cols-3">
        {/* Timeline View (Left Column) */}
        <div className="glass-panel rounded-2xl p-6 border border-slate-800 shadow-2xl">
          <h3 className="text-sm font-bold text-white mb-4 flex items-center gap-2 border-b border-slate-800 pb-3">
            <Clock className="h-4 w-4 text-emerald-400" />
            <span>Event Timeline Stream</span>
          </h3>

          <div className="relative pl-6 space-y-6 before:absolute before:left-2 before:top-3 before:bottom-3 before:w-0.5 before:bg-slate-800">
            {filteredAlerts.length === 0 ? (
              <p className="text-xs text-slate-500 py-6">No historical alerts in log buffer.</p>
            ) : (
              filteredAlerts.slice(0, 10).map((a, idx) => (
                <div key={idx} className="relative group">
                  <span className={`absolute -left-6 top-1 h-3 w-3 rounded-full border-2 border-slate-950 ${
                    a.severity === 'CRITICAL'
                      ? 'bg-rose-500'
                      : a.severity === 'WARNING'
                      ? 'bg-amber-400'
                      : 'bg-emerald-400'
                  }`} />
                  <div>
                    <span className="text-[10px] font-mono text-slate-500">
                      {a.timestamp ? new Date(a.timestamp).toLocaleTimeString() : 'Recent'}
                    </span>
                    <h4 className={`text-xs font-bold ${
                      a.severity === 'CRITICAL' ? 'text-rose-300' : a.severity === 'WARNING' ? 'text-amber-300' : 'text-slate-200'
                    }`}>
                      {a.type}
                    </h4>
                    <p className="text-xs text-slate-400 mt-0.5">{a.message}</p>
                  </div>
                </div>
              ))
            )}
          </div>
        </div>

        {/* Detailed Filterable Table (Right 2 Columns) */}
        <div className="lg:col-span-2 glass-panel rounded-2xl p-6 border border-slate-800 shadow-2xl">
          <div className="flex items-center justify-between pb-3 border-b border-slate-800 mb-4">
            <h3 className="text-sm font-bold text-white flex items-center gap-2">
              <Filter className="h-4 w-4 text-cyan-400" />
              <span>Recorded Alert Register ({filteredAlerts.length})</span>
            </h3>
          </div>

          <div className="overflow-x-auto">
            <table className="w-full text-left text-xs">
              <thead className="bg-slate-900/80 text-slate-400 uppercase font-mono text-[10px] border-b border-slate-800">
                <tr>
                  <th className="p-3">Status</th>
                  <th className="p-3">Severity</th>
                  <th className="p-3">Event Type</th>
                  <th className="p-3">Message</th>
                  <th className="p-3">Timestamp</th>
                  <th className="p-3 text-right">Action</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-800/60">
                {filteredAlerts.length === 0 ? (
                  <tr>
                    <td colSpan={6} className="p-6 text-center text-slate-500">
                      No matching alert records found.
                    </td>
                  </tr>
                ) : (
                  filteredAlerts.map((a, idx) => (
                    <tr key={idx} className="hover:bg-slate-900/50 transition-colors">
                      <td className="p-3">
                        {a.acknowledged ? (
                          <span className="flex items-center gap-1 text-[10px] text-slate-500 font-mono">
                            <CheckCheck className="h-3 w-3 text-emerald-400" /> Ack
                          </span>
                        ) : (
                          <span className="flex items-center gap-1 text-[10px] text-amber-400 font-mono font-bold animate-pulse">
                            Unread
                          </span>
                        )}
                      </td>
                      <td className="p-3">
                        <span className={`px-2 py-0.5 rounded text-[10px] font-mono font-bold ${
                          a.severity === 'CRITICAL'
                            ? 'bg-rose-950 text-rose-300 border border-rose-800'
                            : a.severity === 'WARNING'
                            ? 'bg-amber-950 text-amber-300 border border-amber-800'
                            : 'bg-emerald-950 text-emerald-300 border border-emerald-800'
                        }`}>
                          {a.severity}
                        </span>
                      </td>
                      <td className="p-3 font-mono font-semibold text-white">{a.type}</td>
                      <td className="p-3 text-slate-300">{a.message}</td>
                      <td className="p-3 font-mono text-slate-400">
                        {a.timestamp ? new Date(a.timestamp).toLocaleString() : 'N/A'}
                      </td>
                      <td className="p-3 text-right">
                        {a.id && !a.acknowledged && (
                          <button
                            onClick={() => a.id && acknowledgeAlert(a.id)}
                            className="text-xs text-emerald-400 hover:underline font-mono"
                          >
                            Acknowledge
                          </button>
                        )}
                      </td>
                    </tr>
                  ))
                )}
              </tbody>
            </table>
          </div>
        </div>
      </div>
    </div>
  );
};
