import type { Request, Response } from 'express';
import { z } from 'zod';
import { IrrigationMode } from '@prisma/client';
import { getDevice } from '../services/device.service';
import { setMode } from '../services/control.service';

const modeSchema = z.object({
  mode: z.enum(['MANUAL', 'AUTO']),
});

export async function postMode(req: Request, res: Response): Promise<void> {
  await getDevice(req.params.id);
  const { mode } = modeSchema.parse(req.body ?? {});
  await setMode(req.params.id, mode === 'AUTO' ? IrrigationMode.AUTO : IrrigationMode.MANUAL);
  res.json({ data: { ok: true, mode } });
}
