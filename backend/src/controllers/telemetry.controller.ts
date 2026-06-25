import type { Request, Response } from 'express';
import { getDevice } from '../services/device.service';
import { getLatestTelemetry, getTelemetryHistory } from '../services/telemetry.service';

export async function getTelemetry(req: Request, res: Response): Promise<void> {
  await getDevice(req.params.id);
  const range = typeof req.query.range === 'string' ? req.query.range : undefined;
  const limit = req.query.limit ? Number(req.query.limit) : 500;
  const rows = await getTelemetryHistory(req.params.id, range, Number.isFinite(limit) ? limit : 500);
  res.json({ data: rows, range: range ?? 'all', count: rows.length });
}

export async function getLatestTelemetryReading(req: Request, res: Response): Promise<void> {
  await getDevice(req.params.id);
  const latest = await getLatestTelemetry(req.params.id);
  res.json({ data: latest });
}
