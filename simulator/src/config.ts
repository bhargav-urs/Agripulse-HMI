import dotenv from 'dotenv';

dotenv.config();

function num(value: string | undefined, fallback: number): number {
  const parsed = Number(value);
  return Number.isFinite(parsed) ? parsed : fallback;
}

function bool(value: string | undefined, fallback: boolean): boolean {
  if (value === undefined) return fallback;
  return ['1', 'true', 'yes', 'on'].includes(value.toLowerCase());
}

export const config = {
  backendUrl: process.env.BACKEND_URL ?? 'http://localhost:4000',
  deviceId: process.env.DEVICE_ID ?? 'demo-device-1',
  tickIntervalMs: num(process.env.SIM_TICK_INTERVAL_MS, 2000),

  /**
   * How fast simulated time advances relative to real time.
   *   1   = real time (temperature tracks the actual hour of day)
   *   120 = 1 simulated hour every 30 real seconds (a full day in ~12 min)
   * A faster clock lets you watch the day/night temperature curve - and its
   * effect on the soil-evaporation rate - during a short demo.
   */
  timeScale: num(process.env.SIM_TIME_SCALE, 120),

  /** Optional fixed starting hour (0-24). Defaults to the real local hour. */
  startHour:
    process.env.SIM_START_HOUR !== undefined ? num(process.env.SIM_START_HOUR, 8) : undefined,

  /** Random faults (occasional network drops). Off by default - trigger manually with the 'd' key. */
  enableRandomFaults: bool(process.env.ENABLE_FAULTS, false),

  firmware: '1.1.0-sim',
} as const;

/**
 * Deterministic daily temperature curve (hour-of-day -> °C). The simulator
 * linearly interpolates between these points and wraps at midnight, so every
 * simulated day is identical (as requested for a simulation).
 */
export const TEMP_CURVE: Array<{ h: number; t: number }> = [
  { h: 0, t: 22 }, // midnight
  { h: 4, t: 18 }, // coolest, pre-dawn
  { h: 6, t: 20 },
  { h: 8, t: 22 },
  { h: 10, t: 25 },
  { h: 12, t: 28 }, // noon
  { h: 15, t: 32 }, // afternoon peak
  { h: 17, t: 30 },
  { h: 19, t: 27 },
  { h: 21, t: 24 },
  { h: 24, t: 22 }, // wraps back to 0:00
];

/** Physics / behaviour tuning for the virtual field + tank. */
export const physics = {
  // Soil moisture (%)
  initialSoilMoisture: 42,
  minSoilMoisture: 5,
  maxSoilMoisture: 100,

  /** Constant gain per second while water is reaching the soil (pump on). */
  irrigationRatePerSec: 0.6, // ~ +1.2 %/tick at 2s ticks

  /**
   * Evaporation per second when idle, scaled by temperature:
   *   loss/sec = evaporationBasePerSec * tempFactor
   * tempFactor ramps from `evapFactorAtCold` (at TEMP_COLD) to
   * `evapFactorAtHot` (at TEMP_HOT) - so soil dries faster in the heat of the
   * day and slower at night.
   */
  evaporationBasePerSec: 0.05,
  evapFactorAtCold: 0.35,
  evapFactorAtHot: 1.6,
  tempCold: 18,
  tempHot: 32,

  // Tank (%)
  initialTankLevel: 90,
  tankDrainPerSec: 0.35, // consumed while pumping
  tankRefillPerSec: 0.0, // set >0 to simulate a refilling source

  // Humidity (%): computed as true relative humidity from the temperature curve
  // and a fixed dew point (see telemetryGenerator). Because temperature follows
  // the daily curve, RH tracks time of day - high pre-dawn, low mid-afternoon.
  dewPointC: 16, // typical dew point; RH = e_s(dewPoint) / e_s(T)
  pumpHumidityBoost: 4, // local moistening while the pump runs
} as const;
