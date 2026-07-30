import React, { createContext, useContext, useEffect, useState } from 'react';
import { io, Socket } from 'socket.io-client';
import {
  TelemetryData,
  Alert,
  SystemSettings,
  ConnectionStatus,
  SerialPortInfo
} from '../types/iot';

interface SocketContextType {
  socket: Socket | null;
  mode: 'LIVE' | 'SIMULATION';
  latestTelemetry: TelemetryData | null;
  telemetryHistory: TelemetryData[];
  connectionStatus: ConnectionStatus;
  availablePorts: SerialPortInfo[];
  alerts: Alert[];
  unreadAlertCount: number;
  settings: SystemSettings;
  switchMode: (mode: 'LIVE' | 'SIMULATION', portPath?: string) => Promise<void>;
  updateSimulation: (values: Partial<TelemetryData>) => Promise<void>;
  updateSettings: (newSettings: SystemSettings) => Promise<void>;
  resetSettings: () => Promise<void>;
  sendCommand: (cmd: { fan?: boolean; led?: boolean }) => Promise<void>;
  acknowledgeAlert: (id: number) => Promise<void>;
  clearAlerts: () => Promise<void>;
  refreshPorts: () => Promise<void>;
}

const SocketContext = createContext<SocketContextType | undefined>(undefined);

export const SocketProvider: React.FC<{ children: React.ReactNode }> = ({ children }) => {
  const [socket, setSocket] = useState<Socket | null>(null);
  const [mode, setMode] = useState<'LIVE' | 'SIMULATION'>('SIMULATION');
  const [latestTelemetry, setLatestTelemetry] = useState<TelemetryData | null>(null);
  const [telemetryHistory, setTelemetryHistory] = useState<TelemetryData[]>([]);
  const [connectionStatus, setConnectionStatus] = useState<ConnectionStatus>({
    connected: false,
    port: null,
    mode: 'SIMULATION'
  });
  const [availablePorts, setAvailablePorts] = useState<SerialPortInfo[]>([]);
  const [alerts, setAlerts] = useState<Alert[]>([]);
  const [settings, setSettingsState] = useState<SystemSettings>({
    humidity_thresh: '60',
    temp_thresh: '30',
    gas_thresh: '700',
    moisture_thresh: '400',
    light_thresh: '500',
    auto_actuators: 'true'
  });

  const unreadAlertCount = alerts.filter(a => !a.acknowledged).length;

  useEffect(() => {
    const newSocket = io(window.location.origin, {
      transports: ['websocket', 'polling'],
      reconnectionAttempts: 10
    });

    newSocket.on('connect', () => {
      console.log('Socket.IO connected to backend server');
    });

    newSocket.on('system_init', (data) => {
      if (data.status) {
        setMode(data.status.mode || 'SIMULATION');
        setConnectionStatus(data.status.activeSourceStatus || { connected: false, port: null });
        if (data.status.lastData) {
          setLatestTelemetry(data.status.lastData);
        }
      }
      if (data.settings) setSettingsState(data.settings);
      if (data.alerts) setAlerts(data.alerts);
      if (data.telemetryHistory) setTelemetryHistory(data.telemetryHistory);
    });

    newSocket.on('telemetry_update', (data: TelemetryData) => {
      setLatestTelemetry(data);
      setTelemetryHistory(prev => {
        const updated = [...prev, data];
        return updated.slice(-120); // Keep last 120 points (4 minutes at 2s interval)
      });
    });

    newSocket.on('connection_status', (status: ConnectionStatus) => {
      setConnectionStatus(status);
      if (status.mode) setMode(status.mode);
    });

    newSocket.on('mode_changed', (status) => {
      setMode(status.mode);
      setConnectionStatus(status.activeSourceStatus || { connected: false, port: null });
    });

    newSocket.on('alert_triggered', (alert: Alert) => {
      setAlerts(prev => [alert, ...prev]);
    });

    newSocket.on('settings_updated', (newSettings: SystemSettings) => {
      setSettingsState(newSettings);
    });

    setSocket(newSocket);
    refreshPorts();

    return () => {
      newSocket.disconnect();
    };
  }, []);

  const refreshPorts = async () => {
    try {
      const res = await fetch('/api/ports');
      const data = await res.json();
      if (Array.isArray(data)) {
        setAvailablePorts(data);
      }
    } catch (e) {
      console.error('Failed to fetch available serial ports:', e);
    }
  };

  const switchMode = async (newMode: 'LIVE' | 'SIMULATION', portPath?: string) => {
    try {
      const res = await fetch('/api/mode', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ mode: newMode, portPath })
      });
      const data = await res.json();
      setMode(data.mode);
      if (data.activeSourceStatus) {
        setConnectionStatus(data.activeSourceStatus);
      }
    } catch (err) {
      console.error('Failed to switch mode:', err);
    }
  };

  const updateSimulation = async (values: Partial<TelemetryData>) => {
    try {
      await fetch('/api/simulate', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(values)
      });
    } catch (err) {
      console.error('Failed to send simulation values:', err);
    }
  };

  const updateSettings = async (newSettings: SystemSettings) => {
    try {
      const res = await fetch('/api/settings', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(newSettings)
      });
      const data = await res.json();
      setSettingsState(data);
    } catch (err) {
      console.error('Failed to update settings:', err);
    }
  };

  const resetSettings = async () => {
    try {
      const res = await fetch('/api/settings/reset', { method: 'POST' });
      const data = await res.json();
      setSettingsState(data);
    } catch (err) {
      console.error('Failed to reset settings:', err);
    }
  };

  const sendCommand = async (cmd: { fan?: boolean; led?: boolean }) => {
    try {
      await fetch('/api/command', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(cmd)
      });
    } catch (err) {
      console.error('Failed to send command:', err);
    }
  };

  const acknowledgeAlert = async (id: number) => {
    try {
      await fetch(`/api/alerts/ack/${id}`, { method: 'POST' });
      setAlerts(prev => prev.map(a => a.id === id ? { ...a, acknowledged: 1 } : a));
    } catch (err) {
      console.error('Failed to acknowledge alert:', err);
    }
  };

  const clearAlerts = async () => {
    try {
      await fetch('/api/alerts', { method: 'DELETE' });
      setAlerts([]);
    } catch (err) {
      console.error('Failed to clear alerts:', err);
    }
  };

  return (
    <SocketContext.Provider
      value={{
        socket,
        mode,
        latestTelemetry,
        telemetryHistory,
        connectionStatus,
        availablePorts,
        alerts,
        unreadAlertCount,
        settings,
        switchMode,
        updateSimulation,
        updateSettings,
        resetSettings,
        sendCommand,
        acknowledgeAlert,
        clearAlerts,
        refreshPorts
      }}
    >
      {children}
    </SocketContext.Provider>
  );
};

export const useSocket = () => {
  const context = useContext(SocketContext);
  if (!context) {
    throw new Error('useSocket must be used within a SocketProvider');
  }
  return context;
};
