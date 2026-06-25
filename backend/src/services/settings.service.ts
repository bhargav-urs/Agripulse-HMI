import { IrrigationMode } from '@prisma/client';
import { prisma } from '../lib/prisma';
import { deviceState, SettingsSnapshot } from './deviceState.service';

/**
 * Load a device's settings + mode from the DB into the in-memory runtime state.
 * Called when a device connects and after any settings update.
 */
export async function hydrateSettings(deviceId: string): Promise<void> {
  const settings = await prisma.deviceSettings.findUnique({ where: { deviceId } });
  if (!settings) return;
  const snapshot: SettingsSnapshot = {
    moistureMinThreshold: settings.moistureMinThreshold,
    moistureTargetThreshold: settings.moistureTargetThreshold,
    rainProbabilityThreshold: settings.rainProbabilityThreshold,
    tankMinThreshold: settings.tankMinThreshold,
    maxPumpRuntimeSeconds: settings.maxPumpRuntimeSeconds,
  };
  deviceState.setSettings(deviceId, snapshot);
  deviceState.setMode(deviceId, settings.mode === 'AUTO' ? 'AUTO' : 'MANUAL');
}

export interface SettingsUpdateInput {
  moistureMinThreshold?: number;
  moistureTargetThreshold?: number;
  rainProbabilityThreshold?: number;
  tankMinThreshold?: number;
  maxPumpRuntimeSeconds?: number;
  mode?: IrrigationMode;
}

export async function updateSettings(deviceId: string, input: SettingsUpdateInput) {
  const updated = await prisma.deviceSettings.update({
    where: { deviceId },
    data: input,
  });
  await hydrateSettings(deviceId);
  return updated;
}

export async function getSettings(deviceId: string) {
  return prisma.deviceSettings.findUnique({ where: { deviceId } });
}
