import { prisma } from '../lib/prisma';
import { socketHub } from '../sockets/socketHub';
import { deviceState } from './deviceState.service';
import { evaluateConditionAlerts, raisePumpOverrun } from './alert.service';
import { stopPump } from './control.service';
import { runAutomation } from '../automation/automationEngine';
import { TelemetryReading, TelemetryUpdate } from '../types';

/** Persist at most one row per device per this interval (telemetry is broadcast every tick regardless). */
const PERSIST_INTERVAL_MS = 10_000;
const lastPersistAt = new Map<string, number>();
const lastPumpStatus = new Map<string, boolean>();

/**
 * Full ingestion pipeline for one telemetry reading from a device:
 *  1. update in-memory state
 *  2. broadcast to mobile clients
 *  3. persist (throttled, plus always on pump-state change)
 *  4. evaluate condition alerts (low moisture / low tank)
 *  5. enforce the pump max-runtime safety limit
 *  6. run the automation engine (if the device is in AUTO mode)
 */
export async function processIncomingTelemetry(
  deviceId: string,
  reading: TelemetryReading,
): Promise<void> {
  deviceState.applyTelemetry(deviceId, reading);

  const update: TelemetryUpdate = {
    deviceId,
    ...reading,
    timestamp: new Date().toISOString(),
  };
  socketHub.emitTelemetry(update);

  await maybePersist(deviceId, reading);
  await evaluateConditionAlerts(deviceId);
  await enforceRuntimeLimit(deviceId);
  await runAutomation(deviceId);
}

async function maybePersist(deviceId: string, reading: TelemetryReading): Promise<void> {
  const now = Date.now();
  const last = lastPersistAt.get(deviceId) ?? 0;
  const pumpChanged = lastPumpStatus.get(deviceId) !== reading.pumpStatus;

  if (now - last >= PERSIST_INTERVAL_MS || pumpChanged) {
    lastPersistAt.set(deviceId, now);
    lastPumpStatus.set(deviceId, reading.pumpStatus);
    await prisma.telemetry.create({
      data: {
        deviceId,
        soilMoisture: reading.soilMoisture,
        temperature: reading.temperature,
        humidity: reading.humidity,
        tankLevel: reading.tankLevel,
        pumpStatus: reading.pumpStatus,
        valveStatus: reading.valveStatus,
        emergencyStop: reading.emergencyStop,
      },
    });
  }
}

/** Auto-stop + overrun alert if the pump exceeds its configured maximum runtime. */
async function enforceRuntimeLimit(deviceId: string): Promise<void> {
  const state = deviceState.get(deviceId);
  if (!state?.pumpStatus || !state.pumpStartedAt) return;
  const runtime = deviceState.pumpRuntimeSeconds(deviceId);
  if (runtime >= state.settings.maxPumpRuntimeSeconds) {
    await stopPump(deviceId, 'SAFETY', 'Maximum pump runtime exceeded');
    await raisePumpOverrun(deviceId, runtime);
  }
}

// -- History queries ----------------------------------------------------------

const RANGE_MS: Record<string, number> = {
  '1h': 60 * 60 * 1000,
  '6h': 6 * 60 * 60 * 1000,
  '12h': 12 * 60 * 60 * 1000,
  '24h': 24 * 60 * 60 * 1000,
  '7d': 7 * 24 * 60 * 60 * 1000,
  '30d': 30 * 24 * 60 * 60 * 1000,
};

export function rangeToSince(range?: string): Date | undefined {
  if (!range) return undefined;
  const ms = RANGE_MS[range];
  if (!ms) return undefined;
  return new Date(Date.now() - ms);
}

export async function getTelemetryHistory(deviceId: string, range?: string, limit = 500) {
  const since = rangeToSince(range);
  return prisma.telemetry.findMany({
    where: {
      deviceId,
      ...(since ? { createdAt: { gte: since } } : {}),
    },
    orderBy: { createdAt: 'asc' },
    take: limit,
  });
}

export async function getLatestTelemetry(deviceId: string) {
  return prisma.telemetry.findFirst({
    where: { deviceId },
    orderBy: { createdAt: 'desc' },
  });
}
