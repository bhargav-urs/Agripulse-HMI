import type { Request, Response } from 'express';
import { prisma } from '../lib/prisma';
import { deviceState } from '../services/deviceState.service';

const startedAt = Date.now();

export async function getHealth(_req: Request, res: Response): Promise<void> {
  let db = false;
  try {
    await prisma.$queryRaw`SELECT 1`;
    db = true;
  } catch {
    db = false;
  }

  const devices = deviceState.all();
  res.status(db ? 200 : 503).json({
    status: db ? 'ok' : 'degraded',
    uptimeSeconds: Math.floor((Date.now() - startedAt) / 1000),
    timestamp: new Date().toISOString(),
    database: db ? 'connected' : 'unreachable',
    connectedDevices: devices.filter((d) => d.online).map((d) => d.deviceId),
  });
}
