import { PumpCommand, EmergencyCommand, SimState } from './types';

/**
 * Applies pump / emergency commands to the simulation state, enforcing the same
 * physical interlocks a real controller would (a real pump cannot run during an
 * emergency stop or with a dry tank).
 */
export class PumpController {
  constructor(private log: (msg: string) => void) {}

  applyPumpCommand(state: SimState, command: PumpCommand): SimState {
    const next = { ...state };
    if (command.action === 'start') {
      if (next.emergencyStop) {
        this.log('Pump START ignored - emergency stop active');
        return next;
      }
      if (next.tankLevel <= 0) {
        this.log('Pump START ignored - tank empty');
        return next;
      }
      next.pumpStatus = true;
      next.valveStatus = true;
      next.pumpStartedAt = Date.now();
      if (command.runtimeSeconds) next.maxPumpRuntimeSeconds = command.runtimeSeconds;
      this.log(`Pump STARTED (${command.source}) for ${next.maxPumpRuntimeSeconds}s`);
    } else {
      next.pumpStatus = false;
      next.valveStatus = false;
      next.pumpStartedAt = undefined;
      this.log(`Pump STOPPED (${command.source})`);
    }
    return next;
  }

  applyEmergencyCommand(state: SimState, command: EmergencyCommand): SimState {
    const next = { ...state };
    if (command.action === 'stop') {
      next.emergencyStop = true;
      next.pumpStatus = false;
      next.valveStatus = false;
      next.pumpStartedAt = undefined;
      this.log('EMERGENCY STOP applied');
    } else {
      next.emergencyStop = false;
      this.log('Emergency stop RESET');
    }
    return next;
  }

  /** Self-imposed runtime safety cut-off (the backend also enforces this). */
  enforceRuntime(state: SimState): SimState {
    if (!state.pumpStatus || !state.pumpStartedAt) return state;
    const runtime = (Date.now() - state.pumpStartedAt) / 1000;
    if (runtime >= state.maxPumpRuntimeSeconds) {
      this.log(`Pump auto-stop - runtime ${Math.round(runtime)}s reached limit`);
      return { ...state, pumpStatus: false, valveStatus: false, pumpStartedAt: undefined };
    }
    return state;
  }
}
