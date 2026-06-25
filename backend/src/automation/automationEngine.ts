import { prisma } from '../lib/prisma';
import { createLogger } from '../lib/logger';
import { socketHub } from '../sockets/socketHub';
import { deviceState } from '../services/deviceState.service';
import { startPump } from '../services/control.service';
import { evaluateIrrigationRules } from './rules';
import { AutomationDecisionPayload } from '../types';

const log = createLogger('automation');

/** Minimum gap between automation evaluations per device, to avoid log spam. */
const AUTOMATION_INTERVAL_MS = 15_000;

/**
 * Run the automation engine for a device. No-op unless the device is in AUTO
 * mode. Evaluates the rules, persists the decision, broadcasts it, and starts
 * the pump when the decision is IRRIGATE (subject to control-layer safety).
 */
export async function runAutomation(deviceId: string): Promise<void> {
  const state = deviceState.get(deviceId);
  if (!state || state.mode !== 'AUTO') return;
  if (!state.lastTelemetry) return;

  const now = Date.now();
  if (state.lastAutomationAt && now - state.lastAutomationAt < AUTOMATION_INTERVAL_MS) {
    return;
  }
  state.lastAutomationAt = now;

  const { soilMoisture, tankLevel } = state.lastTelemetry;
  const rainProbability = state.weather?.rainProbability ?? null;

  const result = evaluateIrrigationRules({
    online: state.online,
    emergencyStop: state.emergencyStop,
    pumpStatus: state.pumpStatus,
    soilMoisture,
    tankLevel,
    rainProbability,
    settings: state.settings,
  });

  let pumpStarted = false;
  if (result.decision === 'IRRIGATE') {
    const control = await startPump(
      deviceId,
      'AUTO',
      state.settings.maxPumpRuntimeSeconds,
      `Automation: ${result.reason}`,
    );
    pumpStarted = control.ok;
    if (!control.ok) {
      result.reason = `${result.reason} (blocked: ${control.reason})`;
    }
  }

  const record = await prisma.automationDecision.create({
    data: {
      deviceId,
      decision: result.decision,
      reason: result.reason,
      soilMoisture,
      tankLevel,
      rainProbability,
      pumpStarted,
    },
  });

  const payload: AutomationDecisionPayload = {
    id: record.id,
    deviceId,
    decision: record.decision,
    reason: record.reason,
    soilMoisture: record.soilMoisture,
    tankLevel: record.tankLevel,
    rainProbability: record.rainProbability,
    pumpStarted: record.pumpStarted,
    createdAt: record.createdAt.toISOString(),
  };
  socketHub.emitAutomationDecision(payload);

  log.info(`[${deviceId}] AUTO ${result.decision} - ${result.reason}`);
}
