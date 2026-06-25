import { SettingsSnapshot } from '../services/deviceState.service';

export interface RuleInputs {
  online: boolean;
  emergencyStop: boolean;
  pumpStatus: boolean;
  soilMoisture: number;
  tankLevel: number;
  /** null when weather data is unavailable */
  rainProbability: number | null;
  settings: SettingsSnapshot;
}

export interface RuleResult {
  decision: 'IRRIGATE' | 'SKIP';
  reason: string;
}

/**
 * Pure, rule-based irrigation decision. No side effects - easy to unit test.
 *
 * IRRIGATE when ALL of:
 *   - device online
 *   - emergency stop not active
 *   - pump not already running
 *   - soil moisture below the minimum threshold
 *   - tank level above its minimum threshold
 *   - rain probability below its threshold (or weather unavailable)
 *
 * Otherwise SKIP, with the most relevant reason.
 */
export function evaluateIrrigationRules(inputs: RuleInputs): RuleResult {
  const { online, emergencyStop, pumpStatus, soilMoisture, tankLevel, rainProbability, settings } =
    inputs;

  if (emergencyStop) {
    return { decision: 'SKIP', reason: 'Emergency stop is active.' };
  }
  if (!online) {
    return { decision: 'SKIP', reason: 'Device is offline.' };
  }
  if (pumpStatus) {
    return { decision: 'SKIP', reason: 'Pump is already running.' };
  }
  if (soilMoisture >= settings.moistureMinThreshold) {
    return {
      decision: 'SKIP',
      reason: `Soil is sufficiently moist (${soilMoisture.toFixed(1)}% >= ${settings.moistureMinThreshold}%).`,
    };
  }
  if (tankLevel < settings.tankMinThreshold) {
    return {
      decision: 'SKIP',
      reason: `Tank level too low to irrigate safely (${tankLevel.toFixed(1)}% < ${settings.tankMinThreshold}%).`,
    };
  }
  if (rainProbability !== null && rainProbability >= settings.rainProbabilityThreshold) {
    return {
      decision: 'SKIP',
      reason: `Rain likely (${rainProbability.toFixed(0)}% >= ${settings.rainProbabilityThreshold}%) - conserving water.`,
    };
  }

  const rainNote =
    rainProbability === null
      ? 'weather unavailable'
      : `rain ${rainProbability.toFixed(0)}% < ${settings.rainProbabilityThreshold}%`;
  return {
    decision: 'IRRIGATE',
    reason: `Soil dry (${soilMoisture.toFixed(1)}% < ${settings.moistureMinThreshold}%), tank OK (${tankLevel.toFixed(1)}%), ${rainNote}.`,
  };
}
