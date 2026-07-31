export interface TelemetryData {
  temperature: number;
  humidity: number;
  light: number;
  gas: number;
  moisture: number;
  fan: boolean;
  led: boolean;
  status: 'NORMAL' | 'WARNING' | 'CRITICAL';
  riskScore?: number;
  timestamp?: string;
  mode?: 'LIVE' | 'SIMULATION';
}

export interface Alert {
  id?: number;
  timestamp?: string;
  type: string;
  message: string;
  severity: 'INFO' | 'WARNING' | 'CRITICAL';
  acknowledged?: number | boolean;
}

export interface SystemSettings {
  humidity_thresh: string | number;
  temp_thresh: string | number;
  gas_thresh: string | number;
  moisture_thresh: string | number;
  light_thresh: string | number;
  auto_actuators: string | boolean;
}

export interface SerialPortInfo {
  path: string;
  manufacturer?: string;
  serialNumber?: string;
  pnpId?: string;
  vendorId?: string;
  productId?: string;
  friendlyName?: string;
  isArduino?: boolean;
}

export interface ConnectionStatus {
  connected: boolean;
  port: string | null;
  baudRate?: number;
  message?: string;
  error?: string;
  mode?: 'LIVE' | 'SIMULATION';
}

export interface AnalyticsSummary {
  stats: {
    avgTemp: number | null;
    maxTemp: number | null;
    avgHumidity: number | null;
    maxHumidity: number | null;
    avgGas: number | null;
    maxGas: number | null;
    avgMoisture: number | null;
    minMoisture: number | null;
    avgRisk: number | null;
    totalRecords: number;
  };
  totalAlerts: number;
  fanRuntimeSeconds: number;
  uptimeSeconds: number;
}
