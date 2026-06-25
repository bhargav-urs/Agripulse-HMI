import type { Namespace, Socket } from 'socket.io';
import { DEVICE_IN, DEVICE_OUT } from '../constants/events';
import { createLogger } from '../lib/logger';
import { prisma } from '../lib/prisma';
import { socketHub } from './socketHub';
import { deviceState } from '../services/deviceState.service';
import { hydrateSettings } from '../services/settings.service';
import { processIncomingTelemetry } from '../services/telemetry.service';
import {
  clearDeviceDisconnected,
  raiseDeviceDisconnected,
} from '../services/alert.service';
import { DeviceHelloPayload, DeviceTelemetryPayload } from '../types';

const log = createLogger('device-ns');

/**
 * Handles the device/simulator namespace. A device announces itself with
 * `device:hello`, then streams `device:telemetry`. Commands flow back via
 * socketHub (control.service emits them).
 */
export function registerDeviceGateway(nsp: Namespace): void {
  nsp.on('connection', (socket: Socket) => {
    let deviceId: string | undefined;
    log.info(`device socket connected: ${socket.id}`);

    socket.on(DEVICE_IN.HELLO, async (payload: DeviceHelloPayload) => {
      deviceId = payload?.deviceId;
      if (!deviceId) {
        log.warn(`device:hello without deviceId from ${socket.id}`);
        return;
      }

      // Verify the device exists in the DB (auto-create unknown devices is off).
      const device = await prisma.device.findUnique({ where: { id: deviceId } });
      if (!device) {
        log.warn(`Unknown device ${deviceId} tried to connect - rejecting`);
        socket.disconnect(true);
        return;
      }

      // Enforce a single active device per id (drop any stale connection first).
      socketHub.disconnectExistingDevice(deviceId, socket.id);
      socketHub.registerDeviceSocket(deviceId, socket);
      deviceState.setOnline(deviceId, true, socket.id);
      await prisma.device.update({ where: { id: deviceId }, data: { status: 'ONLINE' } });
      await hydrateSettings(deviceId);
      clearDeviceDisconnected(deviceId);

      // Send the device its operating config so it starts in the right state.
      const state = deviceState.ensure(deviceId);
      socket.emit(DEVICE_OUT.CONFIG, {
        deviceId,
        mode: state.mode,
        emergencyStop: state.emergencyStop,
        maxPumpRuntimeSeconds: state.settings.maxPumpRuntimeSeconds,
      });

      socketHub.emitDeviceConnection({
        deviceId,
        status: 'ONLINE',
        timestamp: new Date().toISOString(),
      });
      log.info(`device ${deviceId} is ONLINE`);
    });

    socket.on(DEVICE_IN.TELEMETRY, async (payload: DeviceTelemetryPayload) => {
      if (!deviceId || payload?.deviceId !== deviceId) return;
      await processIncomingTelemetry(deviceId, {
        soilMoisture: payload.soilMoisture,
        temperature: payload.temperature,
        humidity: payload.humidity,
        tankLevel: payload.tankLevel,
        pumpStatus: payload.pumpStatus,
        valveStatus: payload.valveStatus,
        emergencyStop: payload.emergencyStop,
      });
    });

    socket.on('disconnect', async (reason) => {
      if (!deviceId) {
        log.info(`device socket ${socket.id} disconnected before hello (${reason})`);
        return;
      }
      socketHub.unregisterDeviceSocket(deviceId);
      deviceState.setOnline(deviceId, false);
      await prisma.device
        .update({ where: { id: deviceId }, data: { status: 'OFFLINE' } })
        .catch(() => undefined);
      socketHub.emitDeviceConnection({
        deviceId,
        status: 'OFFLINE',
        timestamp: new Date().toISOString(),
      });
      await raiseDeviceDisconnected(deviceId);
      log.warn(`device ${deviceId} is OFFLINE (${reason})`);
    });
  });
}
