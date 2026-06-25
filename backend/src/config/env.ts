import dotenv from 'dotenv';

dotenv.config();

function num(value: string | undefined, fallback: number): number {
  const parsed = Number(value);
  return Number.isFinite(parsed) ? parsed : fallback;
}

function bool(value: string | undefined, fallback = false): boolean {
  if (value === undefined) return fallback;
  return ['1', 'true', 'yes', 'on'].includes(value.toLowerCase());
}

export const env = {
  nodeEnv: process.env.NODE_ENV ?? 'development',
  isProd: process.env.NODE_ENV === 'production',
  port: num(process.env.PORT, 4000),

  databaseUrl: process.env.DATABASE_URL ?? '',

  demoDeviceId: process.env.DEMO_DEVICE_ID ?? 'demo-device-1',

  weather: {
    latitude: num(process.env.WEATHER_LATITUDE, 12.9716),
    longitude: num(process.env.WEATHER_LONGITUDE, 77.5946),
    // 'simulated' = generate a time-varying rain probability locally (default);
    // 'live'      = fetch the real forecast from Open-Meteo.
    mode: (process.env.WEATHER_MODE === 'live' ? 'live' : 'simulated') as 'live' | 'simulated',
    // How often weather (rain probability) is refreshed.
    intervalMs: num(
      process.env.WEATHER_UPDATE_INTERVAL_MS ?? process.env.WEATHER_POLL_INTERVAL_MS,
      10 * 60 * 1000,
    ),
  },

  seedOnStart: bool(process.env.SEED_ON_START, true),

  corsOrigin: process.env.CORS_ORIGIN ?? '*',
} as const;

if (!env.databaseUrl) {
  // Fail fast with a helpful message rather than a cryptic Prisma error.
  // eslint-disable-next-line no-console
  console.warn(
    '[env] DATABASE_URL is not set. Copy backend/.env.example to backend/.env and configure it.',
  );
}
