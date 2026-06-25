import { createServer } from 'http';
import { createApp } from './app';
import { env } from './config/env';
import { prisma } from './lib/prisma';
import { createLogger } from './lib/logger';
import { ensureSeedData } from './lib/seedData';
import { initSockets } from './sockets';
import { hydrateSettings } from './services/settings.service';
import { startWeatherPolling, stopWeatherPolling } from './weather/weatherService';

const log = createLogger('boot');

async function main(): Promise<void> {
  // 1. Make sure the database is reachable.
  await prisma.$connect();
  log.info('Connected to PostgreSQL');

  // 2. Ensure the demo device exists (idempotent).
  if (env.seedOnStart) {
    await ensureSeedData(prisma);
  }

  // 3. Load the demo device's settings into runtime state.
  await hydrateSettings(env.demoDeviceId);

  // 4. HTTP + WebSocket server.
  const app = createApp();
  const httpServer = createServer(app);
  initSockets(httpServer);

  // 5. Begin weather polling for the demo device.
  startWeatherPolling(env.demoDeviceId);

  httpServer.listen(env.port, () => {
    log.info(`AgriPulse backend listening on http://localhost:${env.port}`);
    log.info(`  REST     -> http://localhost:${env.port}/health`);
    log.info(`  Mobile WS -> ws://localhost:${env.port}/ (default namespace)`);
    log.info(`  Device WS -> ws://localhost:${env.port}/device`);
  });

  // Graceful shutdown
  const shutdown = async (signal: string) => {
    log.warn(`${signal} received - shutting down`);
    stopWeatherPolling();
    httpServer.close();
    await prisma.$disconnect();
    process.exit(0);
  };
  process.on('SIGINT', () => void shutdown('SIGINT'));
  process.on('SIGTERM', () => void shutdown('SIGTERM'));
}

main().catch((err) => {
  log.error('Fatal startup error', err instanceof Error ? err.stack : String(err));
  process.exit(1);
});
