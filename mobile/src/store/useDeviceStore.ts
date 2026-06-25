import { create } from 'zustand';
import {
  Alert,
  AutomationDecision,
  DeviceLatestState,
  DeviceSettings,
  IrrigationMode,
  PumpStatusUpdate,
  TelemetryReading,
  TelemetryUpdate,
  WeatherSnapshot,
  CommandAck,
} from '../types';

interface PumpState {
  status: boolean;
  valveStatus: boolean;
  runtimeSeconds: number;
  source: string | null;
}

interface DeviceStore {
  // connection
  online: boolean;
  socketConnected: boolean;

  // telemetry
  telemetry: TelemetryReading | null;
  lastTelemetryAt: number | null;

  // control / status
  pump: PumpState;
  mode: IrrigationMode;
  emergencyStop: boolean;

  // config + data
  settings: DeviceSettings | null;
  weather: WeatherSnapshot | null;
  alerts: Alert[];
  latestDecision: AutomationDecision | null;
  lastAck: CommandAck | null;

  // actions
  hydrateFromLatest: (state: DeviceLatestState) => void;
  setSocketConnected: (v: boolean) => void;
  applyTelemetry: (u: TelemetryUpdate) => void;
  applyPumpStatus: (u: PumpStatusUpdate) => void;
  applyConnection: (online: boolean) => void;
  applyDecision: (d: AutomationDecision) => void;
  setWeather: (w: WeatherSnapshot | null) => void;
  setSettings: (s: DeviceSettings | null) => void;
  setMode: (m: IrrigationMode) => void;
  setAlerts: (a: Alert[]) => void;
  addAlert: (a: Alert) => void;
  acknowledgeLocal: (id: string) => void;
  setAck: (a: CommandAck) => void;
}

export const useDeviceStore = create<DeviceStore>((set) => ({
  online: false,
  socketConnected: false,
  telemetry: null,
  lastTelemetryAt: null,
  pump: { status: false, valveStatus: false, runtimeSeconds: 0, source: null },
  mode: 'MANUAL',
  emergencyStop: false,
  settings: null,
  weather: null,
  alerts: [],
  latestDecision: null,
  lastAck: null,

  hydrateFromLatest: (s) =>
    set({
      online: s.online,
      mode: s.mode,
      emergencyStop: s.emergencyStop,
      settings: s.settings,
      weather: s.weather,
      latestDecision: s.latestDecision,
      pump: {
        status: s.pump.status,
        valveStatus: s.pump.valveStatus,
        runtimeSeconds: s.pump.runtimeSeconds,
        source: s.pump.source,
      },
      telemetry: s.telemetry
        ? {
            soilMoisture: s.telemetry.soilMoisture,
            temperature: s.telemetry.temperature,
            humidity: s.telemetry.humidity,
            tankLevel: s.telemetry.tankLevel,
            pumpStatus: s.telemetry.pumpStatus,
            valveStatus: s.telemetry.valveStatus,
            emergencyStop: s.telemetry.emergencyStop,
          }
        : null,
      lastTelemetryAt: s.telemetry ? Date.parse(s.telemetry.createdAt) : null,
    }),

  setSocketConnected: (v) => set({ socketConnected: v }),

  applyTelemetry: (u) =>
    set({
      telemetry: {
        soilMoisture: u.soilMoisture,
        temperature: u.temperature,
        humidity: u.humidity,
        tankLevel: u.tankLevel,
        pumpStatus: u.pumpStatus,
        valveStatus: u.valveStatus,
        emergencyStop: u.emergencyStop,
      },
      lastTelemetryAt: Date.parse(u.timestamp) || Date.now(),
      emergencyStop: u.emergencyStop,
    }),

  applyPumpStatus: (u) =>
    set((state) => ({
      pump: {
        status: u.pumpStatus,
        valveStatus: u.valveStatus,
        runtimeSeconds: u.runtimeSeconds ?? state.pump.runtimeSeconds,
        source: u.source,
      },
    })),

  applyConnection: (online) => set({ online }),
  applyDecision: (d) => set({ latestDecision: d }),
  setWeather: (w) => set({ weather: w }),
  setSettings: (s) => set({ settings: s, mode: s?.mode ?? 'MANUAL' }),
  setMode: (m) => set({ mode: m }),
  setAlerts: (a) => set({ alerts: a }),
  addAlert: (a) => set((state) => ({ alerts: [a, ...state.alerts].slice(0, 200) })),
  acknowledgeLocal: (id) =>
    set((state) => ({
      alerts: state.alerts.map((al) => (al.id === id ? { ...al, acknowledged: true } : al)),
    })),
  setAck: (a) => set({ lastAck: a }),
}));
