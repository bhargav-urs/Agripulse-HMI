import { PrismaClient } from '@prisma/client';
import { env } from '../config/env';
import { createLogger } from './logger';

const log = createLogger('seed');

/**
 * Idempotently ensure the demo device + default settings exist. Safe to call on
 * every boot and from the standalone seed script.
 */
export async function ensureSeedData(prisma: PrismaClient): Promise<void> {
  const deviceId = env.demoDeviceId;

  const device = await prisma.device.upsert({
    where: { id: deviceId },
    update: {},
    create: {
      id: deviceId,
      name: 'Greenhouse Pump A',
      fieldName: 'North Field',
      location: 'Bengaluru, IN',
      status: 'OFFLINE',
    },
  });

  await prisma.deviceSettings.upsert({
    where: { deviceId: device.id },
    update: {},
    create: {
      deviceId: device.id,
      moistureMinThreshold: 30,
      moistureTargetThreshold: 55,
      rainProbabilityThreshold: 70,
      tankMinThreshold: 20,
      maxPumpRuntimeSeconds: 300,
      mode: 'MANUAL',
    },
  });

  log.info(`Demo device ensured: ${device.id} (${device.name} / ${device.fieldName})`);
}
