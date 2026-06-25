import { CommandSource, IrrigationMode, PumpAction } from '@prisma/client';
import { prisma } from '../lib/prisma';
import { createLogger } from '../lib/logger';
import { socketHub } from '../sockets/socketHub';
import { deviceState } from './deviceState.service';
import { raiseEmergencyStop } from './alert.service';
import { SafetyCheckResult } from '../types';

const log = createLogger('control');

export type ControlSource = 'MANUAL' | 'AUTO' | 'SAFETY' | 'SYSTEM';

export interface ControlResult {
  ok: boolean;
  reason?: string;
  pumpStatus?: boolean;
}

/**
 * Validate that it is safe to START the pump. Mirrors the brief's safety rules:
 *   - device must be online
 *   - emergency stop must not be active
 *   - tank level must be above its minimum threshold
 *   - the pump must not already be running
 */
export function checkPumpStartSafety(deviceId: string): SafetyCheckResult {
  const state = deviceState.get(deviceId);
  if (!state || !state.online) {
    return { ok: false, reason: 'Device is offline.' };
  }
  if (state.emergencyStop) {
    return { ok: false, reason: 'Emergency stop is active.' };
  }
  if (state.pumpStatus) {
    return { ok: false, reason: 'Pump is already running.' };
  }
  const tank = state.lastTelemetry?.tankLevel ?? 0;
  if (tank < state.settings.tankMinThreshold) {
    return {
      ok: false,
      reason: `Tank level ${tank.toFixed(1)}% is below the minimum of ${state.settings.tankMinThreshold}%.`,
    };
  }
  return { ok: true };
}

function emitPumpStatus(
  deviceId: string,
  pumpStatus: boolean,
  source: ControlSource,
  runtimeSeconds?: number,
): void {
  socketHub.emitPumpStatus({
    deviceId,
    pumpStatus,
    valveStatus: pumpStatus,
    source,
    runtimeSeconds,
    timestamp: new Date().toISOString(),
  });
}

export async function startPump(
  deviceId: string,
  source: ControlSource,
  runtimeSeconds?: number,
  reason?: string,
): Promise<ControlResult> {
  const safety = checkPumpStartSafety(deviceId);
  if (!safety.ok) {
    log.warn(`[${deviceId}] pump START rejected: ${safety.reason}`);
    return { ok: false, reason: safety.reason };
  }

  const state = deviceState.ensure(deviceId);
  const runtime = runtimeSeconds ?? state.settings.maxPumpRuntimeSeconds;

  const sent = socketHub.sendPumpCommand(deviceId, {
    action: 'start',
    runtimeSeconds: runtime,
    source,
  });
  if (!sent) {
    return { ok: false, reason: 'Device is not connected.' };
  }

  await prisma.pumpEvent.create({
    data: {
      deviceId,
      action: PumpAction.START,
      source: source as CommandSource,
      durationSeconds: runtime,
      reason: reason ?? `Pump started (${source.toLowerCase()})`,
    },
  });

  // Optimistic state + broadcast; telemetry will confirm shortly.
  state.pumpStatus = true;
  state.valveStatus = true;
  state.pumpStartedAt = Date.now();
  state.pumpSource = source;
  emitPumpStatus(deviceId, true, source, runtime);

  log.info(`[${deviceId}] pump START (${source}) for ${runtime}s`);
  return { ok: true, pumpStatus: true };
}

export async function stopPump(
  deviceId: string,
  source: ControlSource,
  reason?: string,
): Promise<ControlResult> {
  const state = deviceState.ensure(deviceId);
  const runtime = deviceState.pumpRuntimeSeconds(deviceId);

  socketHub.sendPumpCommand(deviceId, { action: 'stop', source });

  await prisma.pumpEvent.create({
    data: {
      deviceId,
      action: PumpAction.STOP,
      source: source as CommandSource,
      durationSeconds: runtime,
      reason: reason ?? `Pump stopped (${source.toLowerCase()})`,
    },
  });

  state.pumpStatus = false;
  state.valveStatus = false;
  state.pumpStartedAt = undefined;
  state.pumpSource = undefined;
  emitPumpStatus(deviceId, false, source, runtime);

  log.info(`[${deviceId}] pump STOP (${source}) after ${runtime}s`);
  return { ok: true, pumpStatus: false };
}

export async function activateEmergencyStop(
  deviceId: string,
  source: ControlSource = 'MANUAL',
): Promise<ControlResult> {
  const state = deviceState.ensure(deviceId);
  state.emergencyStop = true;

  socketHub.sendEmergencyCommand(deviceId, { action: 'stop' });

  await prisma.pumpEvent.create({
    data: {
      deviceId,
      action: PumpAction.EMERGENCY_STOP,
      source: source as CommandSource,
      reason: 'Emergency stop activated',
    },
  });

  state.pumpStatus = false;
  state.valveStatus = false;
  state.pumpStartedAt = undefined;
  emitPumpStatus(deviceId, false, 'SAFETY');
  await raiseEmergencyStop(deviceId);

  log.warn(`[${deviceId}] EMERGENCY STOP activated (${source})`);
  return { ok: true, pumpStatus: false };
}

export async function resetEmergencyStop(
  deviceId: string,
  source: ControlSource = 'MANUAL',
): Promise<ControlResult> {
  const state = deviceState.ensure(deviceId);
  state.emergencyStop = false;

  socketHub.sendEmergencyCommand(deviceId, { action: 'reset' });

  await prisma.pumpEvent.create({
    data: {
      deviceId,
      action: PumpAction.EMERGENCY_RESET,
      source: source as CommandSource,
      reason: 'Emergency stop reset',
    },
  });

  log.info(`[${deviceId}] emergency stop reset (${source})`);
  return { ok: true };
}

export async function setMode(deviceId: string, mode: IrrigationMode): Promise<ControlResult> {
  await prisma.deviceSettings.update({ where: { deviceId }, data: { mode } });
  const value = mode === 'AUTO' ? 'AUTO' : 'MANUAL';
  deviceState.setMode(deviceId, value);
  socketHub.emitModeChanged(deviceId, value); // broadcast so all clients reflect it
  log.info(`[${deviceId}] mode set to ${mode}`);
  return { ok: true };
}
