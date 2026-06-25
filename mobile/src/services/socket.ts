import { io, Socket } from 'socket.io-client';
import { ENV } from '../config/env';
import { CLIENT_EVENTS } from '../constants/events';
import { IrrigationMode } from '../types';

/**
 * Thin singleton wrapper around the Socket.IO mobile connection. Components
 * subscribe via the store; this module just owns the connection + emitters.
 */
class SocketService {
  private socket: Socket | null = null;

  connect(): Socket {
    if (this.socket) return this.socket;
    this.socket = io(ENV.SOCKET_URL, {
      transports: ['websocket'],
      reconnection: true,
      reconnectionDelay: 1500,
    });
    return this.socket;
  }

  get instance(): Socket | null {
    return this.socket;
  }

  isConnected(): boolean {
    return this.socket?.connected ?? false;
  }

  subscribe(deviceId = ENV.DEVICE_ID): void {
    this.socket?.emit(CLIENT_EVENTS.SUBSCRIBE, { deviceId });
  }

  unsubscribe(deviceId = ENV.DEVICE_ID): void {
    this.socket?.emit(CLIENT_EVENTS.UNSUBSCRIBE, { deviceId });
  }

  // -- Commands ------------------------------------------------------------
  startPump(runtimeSeconds?: number, deviceId = ENV.DEVICE_ID): void {
    this.socket?.emit(CLIENT_EVENTS.PUMP_START, { deviceId, runtimeSeconds });
  }
  stopPump(deviceId = ENV.DEVICE_ID): void {
    this.socket?.emit(CLIENT_EVENTS.PUMP_STOP, { deviceId });
  }
  setMode(mode: IrrigationMode, deviceId = ENV.DEVICE_ID): void {
    this.socket?.emit(CLIENT_EVENTS.MODE_SET, { deviceId, mode });
  }
  emergencyStop(deviceId = ENV.DEVICE_ID): void {
    this.socket?.emit(CLIENT_EVENTS.EMERGENCY_STOP, { deviceId });
  }
  emergencyReset(deviceId = ENV.DEVICE_ID): void {
    this.socket?.emit(CLIENT_EVENTS.EMERGENCY_RESET, { deviceId });
  }
  updateSettings(patch: Record<string, number | string>, deviceId = ENV.DEVICE_ID): void {
    this.socket?.emit(CLIENT_EVENTS.SETTINGS_UPDATE, { deviceId, ...patch });
  }

  disconnect(): void {
    this.socket?.disconnect();
    this.socket = null;
  }
}

export const socketService = new SocketService();
