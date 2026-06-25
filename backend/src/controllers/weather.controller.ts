import type { Request, Response } from 'express';
import { env } from '../config/env';
import { fetchForecast, getLatestWeatherSnapshot } from '../weather/weatherService';
import { deviceState } from '../services/deviceState.service';

/**
 * Current weather. If a device id is supplied (?deviceId=) we prefer the latest
 * persisted snapshot for that device; otherwise we report the in-memory value
 * for the demo device.
 */
export async function getCurrentWeather(req: Request, res: Response): Promise<void> {
  const deviceId =
    (typeof req.query.deviceId === 'string' && req.query.deviceId) || env.demoDeviceId;

  const runtime = deviceState.get(deviceId)?.weather;
  if (runtime) {
    res.json({
      data: {
        temperature: runtime.temperature,
        humidity: runtime.humidity,
        rainProbability: runtime.rainProbability,
        forecastSummary: runtime.summary,
        observedAt: new Date(runtime.at).toISOString(),
        source: 'live',
      },
    });
    return;
  }

  const snapshot = await getLatestWeatherSnapshot(deviceId);
  res.json({ data: snapshot, source: snapshot ? 'snapshot' : 'none' });
}

export async function getForecast(req: Request, res: Response): Promise<void> {
  const latitude = req.query.lat ? Number(req.query.lat) : env.weather.latitude;
  const longitude = req.query.lon ? Number(req.query.lon) : env.weather.longitude;
  const forecast = await fetchForecast(latitude, longitude);
  res.json({ data: forecast });
}
