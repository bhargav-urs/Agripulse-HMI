import { DeviceSettings } from '../types';

interface PreviewInputs {
  online: boolean;
  emergencyStop: boolean;
  pumpStatus: boolean;
  soilMoisture: number;
  tankLevel: number;
  rainProbability: number | null;
  settings: DeviceSettings;
}

/**
 * Client-side mirror of the backend automation rules (backend/automation/rules.ts).
 * Used purely to preview what AUTO mode would decide right now - the backend
 * remains the source of truth.
 */
export function previewDecision(inputs: PreviewInputs): { decision: 'IRRIGATE' | 'SKIP'; reason: string } {
  const { online, emergencyStop, pumpStatus, soilMoisture, tankLevel, rainProbability, settings } = inputs;

  if (emergencyStop) return { decision: 'SKIP', reason: 'Emergency stop is active.' };
  if (!online) return { decision: 'SKIP', reason: 'Device is offline.' };
  if (pumpStatus) return { decision: 'SKIP', reason: 'Pump is already running.' };
  if (soilMoisture >= settings.moistureMinThreshold)
    return { decision: 'SKIP', reason: `Soil is moist enough (${soilMoisture.toFixed(0)}% >= ${settings.moistureMinThreshold}%).` };
  if (tankLevel < settings.tankMinThreshold)
    return { decision: 'SKIP', reason: `Tank too low (${tankLevel.toFixed(0)}% < ${settings.tankMinThreshold}%).` };
  if (rainProbability !== null && rainProbability >= settings.rainProbabilityThreshold)
    return { decision: 'SKIP', reason: `Rain likely (${rainProbability.toFixed(0)}% >= ${settings.rainProbabilityThreshold}%).` };

  return {
    decision: 'IRRIGATE',
    reason: `Soil dry & conditions OK - would irrigate.`,
  };
}
