import React from 'react';
import { SocketProvider } from './context/SocketContext';
import { Header } from './components/Header';
import { SimulationControls } from './components/SimulationControls';
import { DashboardPage } from './pages/DashboardPage';

export const MainLayout: React.FC = () => {
  return (
    <div className="min-h-screen flex flex-col justify-between bg-industrial-950 text-slate-100 font-sans">
      <div>
        {/* Top Bar with Live Mode / Simulation Mode Toggle & COM Port Status */}
        <Header />

        <main className="mx-auto max-w-7xl px-4 py-6 sm:px-6">
          {/* Interactive Simulation Controls (Active when in Simulation Mode) */}
          <SimulationControls />

          {/* Core IoT Dashboard View */}
          <DashboardPage />
        </main>
      </div>

      {/* Simplified Footer */}
      <footer className="glass-panel border-t border-slate-800/80 py-4 px-6 mt-8">
        <div className="mx-auto max-w-7xl flex flex-wrap items-center justify-between text-xs text-slate-500 font-mono">
          <span>Arduino Mega 2560 Smart Damp & Mold Prevention IoT Control Center</span>
          <div className="flex items-center gap-4">
            <span className="text-emerald-400">● Live Socket.IO</span>
            <span>Baud: 115200</span>
          </div>
        </div>
      </footer>
    </div>
  );
};

export function App() {
  return (
    <SocketProvider>
      <MainLayout />
    </SocketProvider>
  );
}

export default App;
