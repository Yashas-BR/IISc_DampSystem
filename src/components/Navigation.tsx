import React from 'react';
import {
  LayoutDashboard,
  BarChart3,
  AlertOctagon,
  FileSpreadsheet,
  Settings,
  Activity,
  Info
} from 'lucide-react';

export type PageTab =
  | 'dashboard'
  | 'analytics'
  | 'alerts'
  | 'reports'
  | 'settings'
  | 'device-health'
  | 'about';

interface NavigationProps {
  activeTab: PageTab;
  setActiveTab: (tab: PageTab) => void;
}

export const Navigation: React.FC<NavigationProps> = ({ activeTab, setActiveTab }) => {
  const tabs = [
    { id: 'dashboard' as PageTab, label: 'Dashboard', icon: LayoutDashboard },
    { id: 'analytics' as PageTab, label: 'Analytics', icon: BarChart3 },
    { id: 'alerts' as PageTab, label: 'Alerts & History', icon: AlertOctagon },
    { id: 'reports' as PageTab, label: 'Reports', icon: FileSpreadsheet },
    { id: 'settings' as PageTab, label: 'Settings', icon: Settings },
    { id: 'device-health' as PageTab, label: 'Device Health', icon: Activity },
    { id: 'about' as PageTab, label: 'About & Wiring', icon: Info },
  ];

  return (
    <nav className="mb-6 w-full glass-panel rounded-2xl p-1.5 border border-slate-800">
      <div className="flex items-center gap-1 overflow-x-auto no-scrollbar py-0.5">
        {tabs.map((t) => {
          const Icon = t.icon;
          const isActive = activeTab === t.id;
          return (
            <button
              key={t.id}
              onClick={() => setActiveTab(t.id)}
              className={`flex items-center gap-2 whitespace-nowrap rounded-xl px-4 py-2 text-xs font-semibold transition-all ${
                isActive
                  ? 'bg-gradient-to-r from-emerald-500/20 to-cyan-500/20 text-emerald-300 border border-emerald-500/40 shadow-lg shadow-emerald-500/10'
                  : 'text-slate-400 hover:bg-slate-900 hover:text-slate-200'
              }`}
            >
              <Icon className={`h-4 w-4 ${isActive ? 'text-emerald-400' : 'text-slate-400'}`} />
              <span>{t.label}</span>
            </button>
          );
        })}
      </div>
    </nav>
  );
};
