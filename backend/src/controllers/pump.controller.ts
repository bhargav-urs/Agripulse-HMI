import type { Request, Response } from 'express';
import { z } from 'zod';
import { getDevice } from '../services/device.service';
import {
  activateEmergencyStop,
  resetEmergencyStop,
  startPump,
  stopPump,
} from '../services/control.service';
import { ApiError } from '../utils/ApiError';

const startSchema = z.object({
  runtimeSeconds: z.number().int().positive().max(3600).optional(),
});

export async function postPumpStart(req: Request, res: Response): Promise<void> {
  await getDevice(req.params.id);
  const { runtimeSeconds } = startSchema.parse(req.body ?? {});
  const result = await startPump(req.params.id, 'MANUAL', runtimeSeconds);
  if (!result.ok) throw ApiError.conflict(result.reason ?? 'Unable to start pump');
  res.json({ data: { ok: true, pumpStatus: true } });
}

export async function postPumpStop(req: Request, res: Response): Promise<void> {
  await getDevice(req.params.id);
  const result = await stopPump(req.params.id, 'MANUAL');
  res.json({ data: { ok: result.ok, pumpStatus: false } });
}

export async function postEmergencyStop(req: Request, res: Response): Promise<void> {
  await getDevice(req.params.id);
  await activateEmergencyStop(req.params.id, 'MANUAL');
  res.json({ data: { ok: true, emergencyStop: true } });
}

export async function postEmergencyReset(req: Request, res: Response): Promise<void> {
  await getDevice(req.params.id);
  await resetEmergencyStop(req.params.id, 'MANUAL');
  res.json({ data: { ok: true, emergencyStop: false } });
}
