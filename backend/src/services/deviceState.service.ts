import { IrrigationModeValue, TelemetryReading } from '../types';

/**
 * Snapshot of the automation-relevant settings, mirrored from the DB so the
 * automation engine and safety checks don't hit Postgres on every tick.
 */
export interface SettingsSnapshot {
  moistureMinThreshold: number;
  moistureTargetThreshold: number;
  rainProbabilityThreshold: number;
  tankMinThreshold: number;
  maxPumpRuntimeSeconds: number;
}

export interface WeatherSnapshotState {
  temperature: number;
  humidity: number;
  rainProbability: number;
  summary: string;
  at: number;
}

/** Live, in-memory runtime state for a single device. */
export interface DeviceRuntimeState {
  deviceId: string;
  online: boolean;
  deviceSocketId?: string;

  mode: IrrigationModeValue;
  emergencyStop: boolean;

  pumpStatus: boolean;
  valveStatus: boolean;
  pumpStartedAt?: number; // epoch ms when the pump last turned on
  pumpSource?: 'MANUAL' | 'AUTO' | 'SAFETY' | 'SYSTEM';

  lastTelemetry?: TelemetryReading;
  lastTelemetryAt?: number;

  settings: SettingsSnapshot;
  weather?: WeatherSnapshotState;

  lastAutomationAt?: number;
  /** de-dupe flags so we don't spam identical alerts */
  alertFlags: {
    lowMoisture: boolean;
    lowTank: boolean;
    disconnected: boolean;
    weatherUnavailable: boolean;
  };
}

const DEFAULT_SETTINGS: SettingsSnapshot = {
  moistureMinThreshold: 30,
  moistureTargetThreshold: 55,
  rainProbabilityThreshold: 70,
  tankMinThreshold: 20,
  maxPumpRuntimeSeconds: 300,
};

class DeviceStateStore {
  private states = new Map<string, DeviceRuntimeState>();

  ensure(deviceId: string): DeviceRuntimeState {
    let state = this.states.get(deviceId);
    if (!state) {
      state = {
        deviceId,
        online: false,
        mode: 'MANUAL',
        emergencyStop: false,
        pumpStatus: false,
        valveStatus: false,
        settings: { ...DEFAULT_SETTINGS },
        alertFlags: {
          lowMoisture: false,
          lowTank: false,
          disconnected: false,
          weatherUnavailable: false,
        },
      };
      this.states.set(deviceId, state);
    }
    return state;
  }

  get(deviceId: string): DeviceRuntimeState | undefined {
    return this.states.get(deviceId);
  }

  all(): DeviceRuntimeState[] {
    return [...this.states.values()];
  }

  setOnline(deviceId: string, online: boolean, socketId?: string): DeviceRuntimeState {
    const state = this.ensure(deviceId);
    state.online = online;
    state.deviceSocketId = online ? socketId : undefined;
    if (!online) {
      // A disconnected device cannot be running a pump from our perspective.
      state.pumpStatus = false;
      state.valveStatus = false;
      state.pumpStartedAt = undefined;
    }
    return state;
  }

  applyTelemetry(deviceId: string, reading: TelemetryReading): DeviceRuntimeState {
    const state = this.ensure(deviceId);
    state.lastTelemetry = reading;
    state.lastTelemetryAt = Date.now();
    state.pumpStatus = reading.pumpStatus;
    state.valveStatus = reading.valveStatus;
    state.emergencyStop = reading.emergencyStop;
    if (reading.pumpStatus && !state.pumpStartedAt) {
      state.pumpStartedAt = Date.now();
    }
    if (!reading.pumpStatus) {
      state.pumpStartedAt = undefined;
    }
    return state;
  }

  setSettings(deviceId: string, settings: SettingsSnapshot): DeviceRuntimeState {
    const state = this.ensure(deviceId);
    state.settings = settings;
    return state;
  }

  setMode(deviceId: string, mode: IrrigationModeValue): DeviceRuntimeState {
    const state = this.ensure(deviceId);
    state.mode = mode;
    return state;
  }

  setWeather(deviceId: string, weather: WeatherSnapshotState): DeviceRuntimeState {
    const state = this.ensure(deviceId);
    state.weather = weather;
    return state;
  }

  /** Current pump runtime in seconds, or 0 if not running. */
  pumpRuntimeSeconds(deviceId: string): number {
    const state = this.states.get(deviceId);
    if (!state?.pumpStartedAt) return 0;
    return Math.floor((Date.now() - state.pumpStartedAt) / 1000);
  }
}

export const deviceState = new DeviceStateStore();
