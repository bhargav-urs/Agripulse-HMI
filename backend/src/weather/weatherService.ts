import { env } from '../config/env';
import { prisma } from '../lib/prisma';
import { createLogger } from '../lib/logger';
import { socketHub } from '../sockets/socketHub';
import { deviceState } from '../services/deviceState.service';
import { raiseWeatherUnavailable, clearWeatherUnavailable } from '../services/alert.service';

const log = createLogger('weather');

const BASE_URL = 'https://api.open-meteo.com/v1/forecast';

function clamp(v: number, lo: number, hi: number): number {
  return Math.max(lo, Math.min(hi, v));
}

export interface WeatherResult {
  temperature: number;
  humidity: number;
  rainProbability: number; // 0-100, max over the next few hours
  summary: string;
}

export interface ForecastResult {
  latitude: number;
  longitude: number;
  hourly: Array<{ time: string; temperature: number; rainProbability: number }>;
}

function summarise(rainProbability: number, temperature: number): string {
  let sky: string;
  if (rainProbability >= 70) sky = 'Rain very likely';
  else if (rainProbability >= 40) sky = 'Showers possible';
  else if (rainProbability >= 15) sky = 'Mostly clear';
  else sky = 'Clear & dry';
  return `${sky}, ${temperature.toFixed(0)}°C`;
}

/** Fetch current conditions + near-term rain probability from Open-Meteo. */
export async function fetchWeather(latitude: number, longitude: number): Promise<WeatherResult> {
  const url =
    `${BASE_URL}?latitude=${latitude}&longitude=${longitude}` +
    `&current=temperature_2m,relative_humidity_2m,precipitation` +
    `&hourly=precipitation_probability&forecast_days=1&timezone=auto`;

  const res = await fetch(url, { signal: AbortSignal.timeout(10_000) });
  if (!res.ok) {
    throw new Error(`Open-Meteo responded ${res.status}`);
  }
  const data = (await res.json()) as {
    current?: { temperature_2m?: number; relative_humidity_2m?: number };
    hourly?: { precipitation_probability?: number[] };
  };

  const temperature = data.current?.temperature_2m ?? 0;
  const humidity = data.current?.relative_humidity_2m ?? 0;
  const probs = (data.hourly?.precipitation_probability ?? []).slice(0, 6).filter((n) => n != null);
  const rainProbability = probs.length ? Math.max(...probs) : 0;

  return {
    temperature,
    humidity,
    rainProbability,
    summary: summarise(rainProbability, temperature),
  };
}

/** Fetch a 24h hourly forecast (for the History / weather screens). */
export async function fetchForecast(latitude: number, longitude: number): Promise<ForecastResult> {
  const url =
    `${BASE_URL}?latitude=${latitude}&longitude=${longitude}` +
    `&hourly=temperature_2m,precipitation_probability&forecast_days=1&timezone=auto`;
  const res = await fetch(url, { signal: AbortSignal.timeout(10_000) });
  if (!res.ok) throw new Error(`Open-Meteo responded ${res.status}`);
  const data = (await res.json()) as {
    hourly?: { time?: string[]; temperature_2m?: number[]; precipitation_probability?: number[] };
  };
  const time = data.hourly?.time ?? [];
  const temp = data.hourly?.temperature_2m ?? [];
  const rain = data.hourly?.precipitation_probability ?? [];
  return {
    latitude,
    longitude,
    hourly: time.map((t, i) => ({
      time: t,
      temperature: temp[i] ?? 0,
      rainProbability: rain[i] ?? 0,
    })),
  };
}

/**
 * Poll the weather for the demo device, persist a snapshot, update runtime state
 * (so the automation engine can use rain probability), and manage the
 * weather-unavailable alert.
 */

// -- Simulated weather model --------------------------------------------------
// Stateful, mean-reverting rain-probability model (single demo device).
// It is updated on each weather tick and is driven, logically, by:
//   - relative humidity  -> humid air is more likely to precipitate
//   - afternoon heat     -> convective (thunderstorm) potential
//   - a passing "front"  -> a slow random walk that brings rainy/dry spells
// The result drifts realistically over time and periodically crosses the
// rain-probability threshold, which makes AUTO mode skip irrigation.
export interface RainModelState {
  rainProbability: number;
  front: number;
}

/**
 * Advance the rain-probability model one step (pure except for Math.random).
 * Exposed so the logic can be unit-tested without the socket/DB stack.
 */
export function nextRainProbability(
  model: RainModelState,
  humidity: number,
  temperature: number,
): number {
  const humidityTerm = clamp((humidity - 60) * 2.0, 0, 60); // RH 60->0 ... 90->60
  const convectiveTerm = clamp((temperature - 27) * 3.0, 0, 30); // hot afternoons
  // Weather front: slow mean-reverting random walk in [0,1].
  model.front = clamp(model.front + (Math.random() * 2 - 1) * 0.3, 0, 1);
  const target = clamp(humidityTerm * 0.45 + convectiveTerm * 0.5 + model.front * 70, 0, 98);
  // Ease toward the target (no instant jumps) + a little observation noise.
  model.rainProbability = clamp(
    model.rainProbability + 0.5 * (target - model.rainProbability) + (Math.random() * 2 - 1) * 8,
    0,
    98,
  );
  return Math.round(model.rainProbability);
}

const weatherModel: RainModelState = { rainProbability: 20, front: 0.2 };

function generateSimulatedWeather(deviceId: string): WeatherResult {
  const latest = deviceState.get(deviceId)?.lastTelemetry;
  const temperature = latest?.temperature ?? 25;
  const humidity = latest?.humidity ?? 60;
  const rainProbability = nextRainProbability(weatherModel, humidity, temperature);
  return { temperature, humidity, rainProbability, summary: summarise(rainProbability, temperature) };
}

export async function pollWeatherOnce(deviceId: string): Promise<void> {
  try {
    const weather =
      env.weather.mode === 'live'
        ? await fetchWeather(env.weather.latitude, env.weather.longitude)
        : generateSimulatedWeather(deviceId);

    deviceState.setWeather(deviceId, {
      temperature: weather.temperature,
      humidity: weather.humidity,
      rainProbability: weather.rainProbability,
      summary: weather.summary,
      at: Date.now(),
    });

    await prisma.weatherSnapshot.create({
      data: {
        deviceId,
        temperature: weather.temperature,
        humidity: weather.humidity,
        rainProbability: weather.rainProbability,
        forecastSummary: weather.summary,
      },
    });

    // Broadcast so the dashboard's rain chance updates live.
    socketHub.emitWeather(deviceId, {
      temperature: weather.temperature,
      humidity: weather.humidity,
      rainProbability: weather.rainProbability,
      forecastSummary: weather.summary,
    });

    clearWeatherUnavailable(deviceId);
    log.info(
      `[${deviceId}] weather (${env.weather.mode}): ${weather.summary} (rain ${weather.rainProbability}%)`,
    );
  } catch (err) {
    log.error(`[${deviceId}] weather update failed`, (err as Error).message);
    await raiseWeatherUnavailable(deviceId);
  }
}

let timer: NodeJS.Timeout | undefined;

export function startWeatherPolling(deviceId: string): void {
  void pollWeatherOnce(deviceId);
  timer = setInterval(() => void pollWeatherOnce(deviceId), env.weather.intervalMs);
  log.info(
    `Weather updates started - mode=${env.weather.mode}, every ${Math.round(env.weather.intervalMs / 1000)}s`,
  );
}

export function stopWeatherPolling(): void {
  if (timer) clearInterval(timer);
}

export async function getLatestWeatherSnapshot(deviceId: string) {
  return prisma.weatherSnapshot.findFirst({
    where: { deviceId },
    orderBy: { createdAt: 'desc' },
  });
}
