import type { Namespace, Socket } from 'socket.io';
import { IrrigationMode } from '@prisma/client';
import { MOBILE_IN, MOBILE_OUT, deviceRoom } from '../constants/events';
import { createLogger } from '../lib/logger';
import { deviceState } from '../services/deviceState.service';
import {
  activateEmergencyStop,
  resetEmergencyStop,
  setMode,
  startPump,
  stopPump,
} from '../services/control.service';
import { updateSettings } from '../services/settings.service';

const log = createLogger('mobile-ns');

interface DeviceScoped {
  deviceId: string;
}

/** Handles the mobile/operator namespace (default namespace). */
export function registerMobileGateway(nsp: Namespace): void {
  nsp.on('connection', (socket: Socket) => {
    log.info(`mobile client connected: ${socket.id}`);

    const ack = (event: string, ok: boolean, reason?: string) =>
      socket.emit(MOBILE_OUT.COMMAND_ACK, { event, ok, reason, timestamp: new Date().toISOString() });

    socket.on(MOBILE_IN.SUBSCRIBE, (payload: DeviceScoped) => {
      const { deviceId } = payload ?? {};
      if (!deviceId) return;
      socket.join(deviceRoom(deviceId));
      log.info(`client ${socket.id} subscribed to ${deviceId}`);

      // Push an immediate snapshot so the dashboard isn't blank until next tick.
      const state = deviceState.get(deviceId);
      socket.emit(MOBILE_OUT.DEVICE_CONNECTION, {
        deviceId,
        status: state?.online ? 'ONLINE' : 'OFFLINE',
        timestamp: new Date().toISOString(),
      });
      if (state?.lastTelemetry) {
        socket.emit(MOBILE_OUT.TELEMETRY_UPDATE, {
          deviceId,
          ...state.lastTelemetry,
          timestamp: new Date(state.lastTelemetryAt ?? Date.now()).toISOString(),
        });
      }
    });

    socket.on(MOBILE_IN.UNSUBSCRIBE, (payload: DeviceScoped) => {
      const { deviceId } = payload ?? {};
      if (deviceId) socket.leave(deviceRoom(deviceId));
    });

    socket.on(
      MOBILE_IN.PUMP_START,
      async (payload: DeviceScoped & { runtimeSeconds?: number }) => {
        if (!payload?.deviceId) return;
        const result = await startPump(payload.deviceId, 'MANUAL', payload.runtimeSeconds);
        ack(MOBILE_IN.PUMP_START, result.ok, result.reason);
      },
    );

    socket.on(MOBILE_IN.PUMP_STOP, async (payload: DeviceScoped) => {
      if (!payload?.deviceId) return;
      const result = await stopPump(payload.deviceId, 'MANUAL');
      ack(MOBILE_IN.PUMP_STOP, result.ok, result.reason);
    });

    socket.on(MOBILE_IN.MODE_SET, async (payload: DeviceScoped & { mode: string }) => {
      if (!payload?.deviceId) return;
      const mode = payload.mode === 'AUTO' ? IrrigationMode.AUTO : IrrigationMode.MANUAL;
      const result = await setMode(payload.deviceId, mode);
      ack(MOBILE_IN.MODE_SET, result.ok, result.reason);
    });

    socket.on(MOBILE_IN.EMERGENCY_STOP, async (payload: DeviceScoped) => {
      if (!payload?.deviceId) return;
      const result = await activateEmergencyStop(payload.deviceId, 'MANUAL');
      ack(MOBILE_IN.EMERGENCY_STOP, result.ok, result.reason);
    });

    socket.on(MOBILE_IN.EMERGENCY_RESET, async (payload: DeviceScoped) => {
      if (!payload?.deviceId) return;
      const result = await resetEmergencyStop(payload.deviceId, 'MANUAL');
      ack(MOBILE_IN.EMERGENCY_RESET, result.ok, result.reason);
    });

    socket.on(
      MOBILE_IN.SETTINGS_UPDATE,
      async (
        payload: DeviceScoped & {
          moistureMinThreshold?: number;
          moistureTargetThreshold?: number;
          rainProbabilityThreshold?: number;
          tankMinThreshold?: number;
          maxPumpRuntimeSeconds?: number;
          mode?: string;
        },
      ) => {
        if (!payload?.deviceId) return;
        const { deviceId, mode, ...thresholds } = payload;
        try {
          await updateSettings(deviceId, {
            ...thresholds,
            ...(mode ? { mode: mode === 'AUTO' ? IrrigationMode.AUTO : IrrigationMode.MANUAL } : {}),
          });
          ack(MOBILE_IN.SETTINGS_UPDATE, true);
        } catch (err) {
          ack(MOBILE_IN.SETTINGS_UPDATE, false, (err as Error).message);
        }
      },
    );

    socket.on('disconnect', () => {
      log.info(`mobile client disconnected: ${socket.id}`);
    });
  });
}
