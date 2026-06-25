/**
 * Shared payload types for REST + WebSocket messages. These mirror the
 * structures used by the simulator and the mobile app so all three agree on
 * the wire format.
 */

export type IrrigationModeValue = 'MANUAL' | 'AUTO';

/** A single sensor reading set published by a device. */
export interface TelemetryReading {
  soilMoisture: number; // %
  temperature: number; // °C
  humidity: number; // %
  tankLevel: number; // %
  pumpStatus: boolean; // ON/OFF
  valveStatus: boolean; // OPEN/CLOSED
  emergencyStop: boolean;
}

/** Telemetry as broadcast to mobile clients (reading + metadata). */
export interface TelemetryUpdate extends TelemetryReading {
  deviceId: string;
  timestamp: string; // ISO
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
  status: 'ONLINE' | 'OFFLINE';
  timestamp: string;
}

export interface AlertPayload {
  id: string;
  deviceId: string;
  type:
    | 'LOW_SOIL_MOISTURE'
    | 'LOW_TANK_LEVEL'
    | 'PUMP_OVERRUN'
    | 'DEVICE_DISCONNECTED'
    | 'EMERGENCY_STOP'
    | 'WEATHER_UNAVAILABLE';
  severity: 'INFO' | 'WARNING' | 'CRITICAL';
  message: string;
  acknowledged: boolean;
  createdAt: string;
}

export interface AutomationDecisionPayload {
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

// -- Device -> server payloads -------------------------------------------------

export interface DeviceHelloPayload {
  deviceId: string;
  firmware?: string;
}

export interface DeviceTelemetryPayload extends TelemetryReading {
  deviceId: string;
}

// -- Server -> device commands -------------------------------------------------

export interface PumpCommand {
  action: 'start' | 'stop';
  runtimeSeconds?: number;
  source: 'MANUAL' | 'AUTO' | 'SAFETY' | 'SYSTEM';
}

export interface EmergencyCommand {
  action: 'stop' | 'reset';
}

/** Result of evaluating safety rules before issuing a pump command. */
export interface SafetyCheckResult {
  ok: boolean;
  reason?: string;
}
