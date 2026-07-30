import React, { useState } from 'react';
import {
  FileSpreadsheet,
  Download,
  FileText,
  Calendar,
  CheckCircle2,
  Database,
  Layers
} from 'lucide-react';

export const ReportsPage: React.FC = () => {
  const [reportRange, setReportRange] = useState<'1h' | '24h' | '7d' | '30d'>('24h');
  const [isGenerating, setIsGenerating] = useState(false);

  const handleDownloadPDF = () => {
    setIsGenerating(true);
    setTimeout(() => {
      window.location.href = '/api/reports/pdf';
      setIsGenerating(false);
    }, 500);
  };

  const handleDownloadCSV = () => {
    window.location.href = '/api/reports/csv';
  };

  return (
    <div className="space-y-6 max-w-5xl mx-auto">
      {/* Header */}
      <div>
        <h2 className="text-xl font-bold text-white flex items-center gap-2">
          <FileSpreadsheet className="h-5 w-5 text-emerald-400" />
          <span>Industrial Compliance & Telemetry Reports</span>
        </h2>
        <p className="text-xs text-slate-400 mt-1">
          Generate formatted PDF documentation and raw CSV data logs for environmental audit compliance and research records.
        </p>
      </div>

      {/* Date Range & Configuration Card */}
      <div className="glass-panel rounded-2xl p-6 border border-slate-800 shadow-2xl space-y-6">
        <h3 className="text-sm font-bold text-white border-b border-slate-800 pb-3 flex items-center gap-2">
          <Calendar className="h-4 w-4 text-cyan-400" />
          <span>Report Scope & Target Range</span>
        </h3>

        <div className="grid grid-cols-1 sm:grid-cols-4 gap-3">
          {(
            [
              { id: '1h', label: 'Last 1 Hour', desc: 'High-density 2s resolution' },
              { id: '24h', label: 'Last 24 Hours', desc: 'Daily operational summary' },
              { id: '7d', label: 'Last 7 Days', desc: 'Weekly mold trend audit' },
              { id: '30d', label: 'Last 30 Days', desc: 'Monthly compliance log' }
            ] as const
          ).map((item) => (
            <button
              key={item.id}
              onClick={() => setReportRange(item.id)}
              className={`p-4 rounded-xl border text-left transition-all ${
                reportRange === item.id
                  ? 'bg-emerald-500/20 text-emerald-300 border-emerald-500/50 shadow-lg shadow-emerald-500/10 ring-1 ring-emerald-500/40'
                  : 'bg-slate-950/60 border-slate-800 text-slate-400 hover:bg-slate-900 hover:text-slate-200'
              }`}
            >
              <span className="text-xs font-bold font-mono block">{item.label}</span>
              <span className="text-[10px] text-slate-400 mt-1 block">{item.desc}</span>
            </button>
          ))}
        </div>

        {/* Download Buttons Section */}
        <div className="grid grid-cols-1 sm:grid-cols-2 gap-6 pt-4 border-t border-slate-800">
          {/* PDF Download Panel */}
          <div className="bg-slate-950/60 rounded-xl p-5 border border-slate-800 flex flex-col justify-between space-y-4">
            <div>
              <div className="flex items-center gap-3">
                <div className="p-2.5 rounded-xl bg-rose-500/20 text-rose-400">
                  <FileText className="h-6 w-6" />
                </div>
                <div>
                  <h4 className="text-sm font-bold text-white">Formatted PDF Audit Report</h4>
                  <p className="text-xs text-slate-400">
                    Includes summary charts, min/max statistics, active threshold rules, and structured telemetry log table.
                  </p>
                </div>
              </div>
              <ul className="mt-4 space-y-1.5 text-xs text-slate-400">
                <li className="flex items-center gap-2">
                  <CheckCircle2 className="h-3.5 w-3.5 text-emerald-400" /> Statistical Min/Max/Avg environmental metrics
                </li>
                <li className="flex items-center gap-2">
                  <CheckCircle2 className="h-3.5 w-3.5 text-emerald-400" /> Active threshold breach documentation
                </li>
                <li className="flex items-center gap-2">
                  <CheckCircle2 className="h-3.5 w-3.5 text-emerald-400" /> Ready for printing & industrial archives
                </li>
              </ul>
            </div>

            <button
              onClick={handleDownloadPDF}
              disabled={isGenerating}
              className="w-full flex items-center justify-center gap-2 rounded-xl bg-gradient-to-r from-rose-600 to-rose-700 py-3 text-xs font-bold text-white shadow-lg shadow-rose-600/20 hover:from-rose-500 hover:to-rose-600 transition-all disabled:opacity-50"
            >
              <Download className="h-4 w-4" />
              <span>{isGenerating ? 'Generating PDF...' : 'Download PDF Report'}</span>
            </button>
          </div>

          {/* CSV Download Panel */}
          <div className="bg-slate-950/60 rounded-xl p-5 border border-slate-800 flex flex-col justify-between space-y-4">
            <div>
              <div className="flex items-center gap-3">
                <div className="p-2.5 rounded-xl bg-emerald-500/20 text-emerald-400">
                  <Database className="h-6 w-6" />
                </div>
                <div>
                  <h4 className="text-sm font-bold text-white">Raw Telemetry Data (CSV)</h4>
                  <p className="text-xs text-slate-400">
                    Export full dataset containing temperature, humidity, gas, light, moisture, fan/LED states, risk score, and timestamps.
                  </p>
                </div>
              </div>
              <ul className="mt-4 space-y-1.5 text-xs text-slate-400">
                <li className="flex items-center gap-2">
                  <CheckCircle2 className="h-3.5 w-3.5 text-emerald-400" /> Compatible with Excel, MATLAB, Python Pandas
                </li>
                <li className="flex items-center gap-2">
                  <CheckCircle2 className="h-3.5 w-3.5 text-emerald-400" /> Exact 2-second timestamp resolution
                </li>
                <li className="flex items-center gap-2">
                  <CheckCircle2 className="h-3.5 w-3.5 text-emerald-400" /> Includes Live & Simulation tagged records
                </li>
              </ul>
            </div>

            <button
              onClick={handleDownloadCSV}
              className="w-full flex items-center justify-center gap-2 rounded-xl bg-gradient-to-r from-emerald-600 to-emerald-700 py-3 text-xs font-bold text-white shadow-lg shadow-emerald-600/20 hover:from-emerald-500 hover:to-emerald-600 transition-all"
            >
              <Download className="h-4 w-4" />
              <span>Download CSV Dataset</span>
            </button>
          </div>
        </div>
      </div>
    </div>
  );
};
