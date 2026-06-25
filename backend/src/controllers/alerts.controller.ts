import type { Request, Response } from 'express';
import { prisma } from '../lib/prisma';
import { getDevice } from '../services/device.service';
import { ApiError } from '../utils/ApiError';

export async function getAlerts(req: Request, res: Response): Promise<void> {
  await getDevice(req.params.id);
  const acknowledged =
    req.query.acknowledged === 'true'
      ? true
      : req.query.acknowledged === 'false'
        ? false
        : undefined;
  const limit = req.query.limit ? Number(req.query.limit) : 100;

  const alerts = await prisma.alert.findMany({
    where: {
      deviceId: req.params.id,
      ...(acknowledged === undefined ? {} : { acknowledged }),
    },
    orderBy: { createdAt: 'desc' },
    take: Number.isFinite(limit) ? limit : 100,
  });
  res.json({ data: alerts, count: alerts.length });
}

export async function acknowledgeAlert(req: Request, res: Response): Promise<void> {
  const alert = await prisma.alert.findUnique({ where: { id: req.params.id } });
  if (!alert) throw ApiError.notFound(`Alert ${req.params.id} not found`);
  const updated = await prisma.alert.update({
    where: { id: req.params.id },
    data: { acknowledged: true },
  });
  res.json({ data: updated });
}
