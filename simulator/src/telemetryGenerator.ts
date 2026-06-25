import { physics, TEMP_CURVE } from './config';
import { SimState } from './types';

function clamp(value: number, min: number, max: number): number {
  return Math.max(min, Math.min(max, value));
}

function round1(value: number): number {
  return Math.round(value * 10) / 10;
}

/** Linear map of x in [inMin,inMax] onto [outMin,outMax], clamped. */
function lerpRange(x: number, inMin: number, inMax: number, outMin: number, outMax: number): number {
  if (inMax === inMin) return outMin;
  const t = clamp((x - inMin) / (inMax - inMin), 0, 1);
  return outMin + t * (outMax - outMin);
}

/**
 * Deterministic temperature for a given hour-of-day (0-24), linearly
 * interpolated from TEMP_CURVE with midnight wraparound. Same every day.
 */
export function temperatureAt(hour: number): number {
  const h = ((hour % 24) + 24) % 24;
  for (let i = 0; i < TEMP_CURVE.length - 1; i++) {
    const a = TEMP_CURVE[i];
    const b = TEMP_CURVE[i + 1];
    if (h >= a.h && h <= b.h) {
      return round1(lerpRange(h, a.h, b.h, a.t, b.t));
    }
  }
  return TEMP_CURVE[0].t;
}

/** Saturation vapour pressure (hPa) - Magnus-Tetens approximation. */
function saturationVaporPressure(tempC: number): number {
  return 6.112 * Math.exp((17.625 * tempC) / (243.04 + tempC));
}

/**
 * Relative humidity (%), derived scientifically from the current temperature and
 * a fixed dew point:  RH = 100 · e_s(T_dew) / e_s(T).
 *
 * Since temperature follows the daily curve, RH automatically tracks time of day
 * - high in the cool pre-dawn (T near the dew point), low in the afternoon heat.
 * A small boost models local moistening while the pump runs.
 */
export function humidityFromTemp(temp: number, pumpOn: boolean): number {
  const rh = (100 * saturationVaporPressure(physics.dewPointC)) / saturationVaporPressure(temp);
  return round1(clamp(rh + (pumpOn ? physics.pumpHumidityBoost : 0), 20, 99));
}

/** Temperature-scaled evaporation multiplier (slow at night, fast in the heat). */
export function evaporationFactor(temp: number): number {
  return lerpRange(
    temp,
    physics.tempCold,
    physics.tempHot,
    physics.evapFactorAtCold,
    physics.evapFactorAtHot,
  );
}

/**
 * Advance the simulation by `dtSeconds`, using the deterministic climate at
 * `simHour`. No random noise - readings move smoothly:
 *
 *   - pump effectively ON  -> soil moisture rises at a CONSTANT rate; tank drains
 *   - pump OFF             -> soil moisture falls at a temperature-scaled rate
 *                            (faster when hot, slower at night)
 */
export function advance(state: SimState, simHour: number, dtSeconds: number): SimState {
  const next: SimState = { ...state };

  // Deterministic climate
  next.temperature = temperatureAt(simHour);

  const pumpEffectivelyOn = next.pumpStatus && !next.emergencyStop && next.tankLevel > 0;

  if (pumpEffectivelyOn) {
    // Water reaching the soil -> constant gain.
    next.soilMoisture = clamp(
      next.soilMoisture + physics.irrigationRatePerSec * dtSeconds,
      physics.minSoilMoisture,
      physics.maxSoilMoisture,
    );
    next.tankLevel = clamp(next.tankLevel - physics.tankDrainPerSec * dtSeconds, 0, 100);
    next.valveStatus = true;

    // Dry tank -> pump can no longer move water; auto-shutoff.
    if (next.tankLevel <= 0) {
      next.pumpStatus = false;
      next.valveStatus = false;
      next.pumpStartedAt = undefined;
    }
  } else {
    // No water -> temperature-scaled evaporation.
    const loss = physics.evaporationBasePerSec * evaporationFactor(next.temperature) * dtSeconds;
    next.soilMoisture = clamp(
      next.soilMoisture - loss,
      physics.minSoilMoisture,
      physics.maxSoilMoisture,
    );
    next.valveStatus = false;
    if (physics.tankRefillPerSec > 0) {
      next.tankLevel = clamp(next.tankLevel + physics.tankRefillPerSec * dtSeconds, 0, 100);
    }
  }

  next.humidity = humidityFromTemp(next.temperature, pumpEffectivelyOn);
  next.soilMoisture = round1(next.soilMoisture);
  next.tankLevel = round1(next.tankLevel);
  return next;
}

export function initialState(maxPumpRuntimeSeconds: number): SimState {
  return {
    soilMoisture: physics.initialSoilMoisture,
    temperature: 22,
    humidity: 60,
    tankLevel: physics.initialTankLevel,
    pumpStatus: false,
    valveStatus: false,
    emergencyStop: false,
    maxPumpRuntimeSeconds,
  };
}
