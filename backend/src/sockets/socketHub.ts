import type { Namespace, Server, Socket } from 'socket.io';
import { MOBILE_OUT, DEVICE_OUT, deviceRoom } from '../constants/events';
import { createLogger } from '../lib/logger';
import {
  AlertPayload,
  AutomationDecisionPayload,
  DeviceConnectionUpdate,
  EmergencyCommand,
  PumpCommand,
  PumpStatusUpdate,
  TelemetryUpdate,
} from '../types';

const log = createLogger('socket');

/**
 * Central hub that owns the Socket.IO server and bridges the two namespaces:
 *   - mobile namespace (operator apps)   - receives broadcasts, sends commands
 *   - device namespace (simulator/IoT)   - sends telemetry, receives commands
 *
 * Services depend on this singleton (not the other way around) to avoid
 * circular imports.
 */
class SocketHub {
  private io?: Server;
  private mobileNs?: Namespace;
  private deviceNs?: Namespace;

  /** deviceId -> the device's socket (one connected device per id). */
  private deviceSockets = new Map<string, Socket>();

  init(io: Server, mobileNs: Namespace, deviceNs: Namespace): void {
    this.io = io;
    this.mobileNs = mobileNs;
    this.deviceNs = deviceNs;
  }

  // -- Device socket registry ------------------------------------------------

  registerDeviceSocket(deviceId: string, socket: Socket): void {
    this.deviceSockets.set(deviceId, socket);
  }

  /**
   * Disconnect any already-connected device socket for this id. Ensures a single
   * active device per id - prevents two simulator instances from interleaving
   * telemetry for the same device. Returns true if a stale socket was dropped.
   */
  disconnectExistingDevice(deviceId: string, exceptSocketId?: string): boolean {
    const existing = this.deviceSockets.get(deviceId);
    if (existing && existing.id !== exceptSocketId) {
      log.warn(`Replacing existing device connection for ${deviceId} (dropping ${existing.id})`);
      // Tell the old client it's been superseded so it stops instead of
      // auto-reconnecting and ping-ponging with the new one.
      existing.emit(DEVICE_OUT.KICKED, { reason: 'Another device instance connected' });
      setTimeout(() => existing.disconnect(true), 150);
      this.deviceSockets.delete(deviceId);
      return true;
    }
    return false;
  }

  unregisterDeviceSocket(deviceId: string): void {
    this.deviceSockets.delete(deviceId);
  }

  isDeviceConnected(deviceId: string): boolean {
    return this.deviceSockets.has(deviceId);
  }

  // -- Broadcasts to mobile clients (per-device room) ------------------------

  emitTelemetry(payload: TelemetryUpdate): void {
    this.mobileNs?.to(deviceRoom(payload.deviceId)).emit(MOBILE_OUT.TELEMETRY_UPDATE, payload);
  }

  emitPumpStatus(payload: PumpStatusUpdate): void {
    this.mobileNs?.to(deviceRoom(payload.deviceId)).emit(MOBILE_OUT.PUMP_STATUS, payload);
  }

  emitAlert(payload: AlertPayload): void {
    this.mobileNs?.to(deviceRoom(payload.deviceId)).emit(MOBILE_OUT.ALERT_NEW, payload);
  }

  emitDeviceConnection(payload: DeviceConnectionUpdate): void {
    this.mobileNs?.to(deviceRoom(payload.deviceId)).emit(MOBILE_OUT.DEVICE_CONNECTION, payload);
  }

  emitAutomationDecision(payload: AutomationDecisionPayload): void {
    this.mobileNs?.to(deviceRoom(payload.deviceId)).emit(MOBILE_OUT.AUTOMATION_DECISION, payload);
  }

  emitModeChanged(deviceId: string, mode: 'MANUAL' | 'AUTO'): void {
    this.mobileNs?.to(deviceRoom(deviceId)).emit(MOBILE_OUT.MODE_CHANGED, {
      deviceId,
      mode,
      timestamp: new Date().toISOString(),
    });
  }

  emitWeather(
    deviceId: string,
    weather: { temperature: number; humidity: number; rainProbability: number; forecastSummary: string },
  ): void {
    this.mobileNs?.to(deviceRoom(deviceId)).emit(MOBILE_OUT.WEATHER_UPDATE, {
      deviceId,
      ...weather,
      timestamp: new Date().toISOString(),
    });
  }

  // -- Commands to a device (simulator) --------------------------------------

  sendPumpCommand(deviceId: string, command: PumpCommand): boolean {
    const socket = this.deviceSockets.get(deviceId);
    if (!socket) {
      log.warn(`No connected device for ${deviceId}; pump command dropped`, command);
      return false;
    }
    socket.emit(DEVICE_OUT.COMMAND_PUMP, command);
    return true;
  }

  sendEmergencyCommand(deviceId: string, command: EmergencyCommand): boolean {
    const socket = this.deviceSockets.get(deviceId);
    if (!socket) {
      log.warn(`No connected device for ${deviceId}; emergency command dropped`, command);
      return false;
    }
    socket.emit(DEVICE_OUT.COMMAND_EMERGENCY, command);
    return true;
  }
}

export const socketHub = new SocketHub();
