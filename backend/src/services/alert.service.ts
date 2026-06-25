import { AlertSeverity, AlertType } from '@prisma/client';
import { prisma } from '../lib/prisma';
import { createLogger } from '../lib/logger';
import { socketHub } from '../sockets/socketHub';
import { deviceState } from './deviceState.service';
import { AlertPayload } from '../types';

const log = createLogger('alerts');

function toPayload(alert: {
  id: string;
  deviceId: string;
  type: AlertType;
  severity: AlertSeverity;
  message: string;
  acknowledged: boolean;
  createdAt: Date;
}): AlertPayload {
  return {
    id: alert.id,
    deviceId: alert.deviceId,
    type: alert.type,
    severity: alert.severity,
    message: alert.message,
    acknowledged: alert.acknowledged,
    createdAt: alert.createdAt.toISOString(),
  };
}

/** Persist an alert and broadcast it to subscribed mobile clients. */
export async function createAlert(
  deviceId: string,
  type: AlertType,
  severity: AlertSeverity,
  message: string,
): Promise<AlertPayload> {
  const alert = await prisma.alert.create({
    data: { deviceId, type, severity, message },
  });
  const payload = toPayload(alert);
  socketHub.emitAlert(payload);
  log.warn(`[${deviceId}] ${type} (${severity}): ${message}`);
  return payload;
}

// -- De-duplicated, condition-based alerts ------------------------------------
// These only fire on the rising edge of a condition, then reset when it clears,
// so a persistent low-moisture state doesn't spam an alert every telemetry tick.

export async function evaluateConditionAlerts(deviceId: string): Promise<void> {
  const state = deviceState.get(deviceId);
  if (!state?.lastTelemetry) return;
  const { soilMoisture, tankLevel } = state.lastTelemetry;
  const { moistureMinThreshold, tankMinThreshold } = state.settings;

  // Low soil moisture
  if (soilMoisture < moistureMinThreshold) {
    if (!state.alertFlags.lowMoisture) {
      state.alertFlags.lowMoisture = true;
      await createAlert(
        deviceId,
        'LOW_SOIL_MOISTURE',
        'WARNING',
        `Soil moisture ${soilMoisture.toFixed(1)}% is below the minimum threshold of ${moistureMinThreshold}%.`,
      );
    }
  } else if (soilMoisture > moistureMinThreshold + 3) {
    state.alertFlags.lowMoisture = false; // hysteresis to avoid flapping
  }

  // Low tank level
  if (tankLevel < tankMinThreshold) {
    if (!state.alertFlags.lowTank) {
      state.alertFlags.lowTank = true;
      await createAlert(
        deviceId,
        'LOW_TANK_LEVEL',
        'CRITICAL',
        `Tank level ${tankLevel.toFixed(1)}% is below the safe minimum of ${tankMinThreshold}%.`,
      );
    }
  } else if (tankLevel > tankMinThreshold + 5) {
    state.alertFlags.lowTank = false;
  }
}

export async function raiseDeviceDisconnected(deviceId: string): Promise<void> {
  const state = deviceState.ensure(deviceId);
  if (state.alertFlags.disconnected) return;
  state.alertFlags.disconnected = true;
  await createAlert(
    deviceId,
    'DEVICE_DISCONNECTED',
    'CRITICAL',
    'Device has gone offline - telemetry and control are unavailable.',
  );
}

export function clearDeviceDisconnected(deviceId: string): void {
  const state = deviceState.ensure(deviceId);
  state.alertFlags.disconnected = false;
}

export async function raiseEmergencyStop(deviceId: string): Promise<void> {
  await createAlert(
    deviceId,
    'EMERGENCY_STOP',
    'CRITICAL',
    'Emergency stop activated - pump halted immediately.',
  );
}

export async function raisePumpOverrun(deviceId: string, runtimeSeconds: number): Promise<void> {
  await createAlert(
    deviceId,
    'PUMP_OVERRUN',
    'WARNING',
    `Pump exceeded its maximum runtime (${runtimeSeconds}s) and was stopped automatically by the safety system.`,
  );
}

export async function raiseWeatherUnavailable(deviceId: string): Promise<void> {
  const state = deviceState.ensure(deviceId);
  if (state.alertFlags.weatherUnavailable) return;
  state.alertFlags.weatherUnavailable = true;
  await createAlert(
    deviceId,
    'WEATHER_UNAVAILABLE',
    'INFO',
    'Weather data is unavailable - automation will fall back to soil + tank rules only.',
  );
}

export function clearWeatherUnavailable(deviceId: string): void {
  const state = deviceState.ensure(deviceId);
  state.alertFlags.weatherUnavailable = false;
}
