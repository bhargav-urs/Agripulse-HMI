/** Wire types shared with the backend (kept in sync manually). */

export interface TelemetryReading {
  soilMoisture: number;
  temperature: number;
  humidity: number;
  tankLevel: number;
  pumpStatus: boolean;
  valveStatus: boolean;
  emergencyStop: boolean;
}

export interface PumpCommand {
  action: 'start' | 'stop';
  runtimeSeconds?: number;
  source: 'MANUAL' | 'AUTO' | 'SAFETY' | 'SYSTEM';
}

export interface EmergencyCommand {
  action: 'stop' | 'reset';
}

export interface DeviceConfig {
  deviceId: string;
  mode: 'MANUAL' | 'AUTO';
  emergencyStop: boolean;
  maxPumpRuntimeSeconds: number;
}

/** Internal mutable simulation state. */
export interface SimState extends TelemetryReading {
  /** epoch ms the pump was last started (for self-imposed runtime limit) */
  pumpStartedAt?: number;
  maxPumpRuntimeSeconds: number;
}
