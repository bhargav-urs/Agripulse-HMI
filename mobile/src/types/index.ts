/** Wire types shared with the backend (mirrors backend/src/types + Prisma enums). */

export type IrrigationMode = 'MANUAL' | 'AUTO';
export type DeviceStatus = 'ONLINE' | 'OFFLINE';

export interface DeviceSettings {
  id: string;
  deviceId: string;
  moistureMinThreshold: number;
  moistureTargetThreshold: number;
  rainProbabilityThreshold: number;
  tankMinThreshold: number;
  maxPumpRuntimeSeconds: number;
  mode: IrrigationMode;
  createdAt: string;
  updatedAt: string;
}

export interface Device {
  id: string;
  name: string;
  fieldName: string;
  location: string;
  status: DeviceStatus;
  settings?: DeviceSettings;
}

export interface TelemetryReading {
  soilMoisture: number;
  temperature: number;
  humidity: number;
  tankLevel: number;
  pumpStatus: boolean;
  valveStatus: boolean;
  emergencyStop: boolean;
}

export interface TelemetryUpdate extends TelemetryReading {
  deviceId: string;
  timestamp: string;
}

export interface TelemetryRow extends TelemetryReading {
  id: string;
  deviceId: string;
  createdAt: string;
}

export interface PumpStatusUpdate {
  deviceId: string;
  pumpStatus: boolean;
  valveStatus: boolean;
  source: 'MANUAL' | 'AUTO' | 'SAFETY' | 'SYSTEM';
  runtimeSeconds?: number;
  timestamp: string;
}

export interface DeviceConnectionUpdate {
  deviceId: string;
  status: DeviceStatus;
  timestamp: string;
}

export type AlertType =
  | 'LOW_SOIL_MOISTURE'
  | 'LOW_TANK_LEVEL'
  | 'PUMP_OVERRUN'
  | 'DEVICE_DISCONNECTED'
  | 'EMERGENCY_STOP'
  | 'WEATHER_UNAVAILABLE';

export type AlertSeverity = 'INFO' | 'WARNING' | 'CRITICAL';

export interface Alert {
  id: string;
  deviceId: string;
  type: AlertType;
  severity: AlertSeverity;
  message: string;
  acknowledged: boolean;
  createdAt: string;
}

export interface AutomationDecision {
  id: string;
  deviceId: string;
  decision: 'IRRIGATE' | 'SKIP';
  reason: string;
  soilMoisture: number;
  tankLevel: number;
  rainProbability: number | null;
  pumpStarted: boolean;
  createdAt: string;
}

export interface WeatherSnapshot {
  id?: string;
  deviceId?: string;
  temperature: number;
  humidity: number;
  rainProbability: number;
  forecastSummary: string;
  observedAt?: string;
  createdAt?: string;
}

export interface CommandAck {
  event: string;
  ok: boolean;
  reason?: string;
  timestamp: string;
}

/** Composite latest-state returned by GET /devices/:id/latest */
export interface DeviceLatestState {
  device: Device;
  settings: DeviceSettings | null;
  mode: IrrigationMode;
  online: boolean;
  emergencyStop: boolean;
  pump: {
    status: boolean;
    valveStatus: boolean;
    runtimeSeconds: number;
    source: string | null;
  };
  telemetry: TelemetryRow | null;
  weather: WeatherSnapshot | null;
  latestAlert: Alert | null;
  latestDecision: AutomationDecision | null;
}
