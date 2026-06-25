import type { Request, Response } from 'express';
import { z } from 'zod';
import { getDevice } from '../services/device.service';
import { getSettings, updateSettings } from '../services/settings.service';
import { ApiError } from '../utils/ApiError';

const settingsSchema = z
  .object({
    moistureMinThreshold: z.number().min(0).max(100).optional(),
    moistureTargetThreshold: z.number().min(0).max(100).optional(),
    rainProbabilityThreshold: z.number().min(0).max(100).optional(),
    tankMinThreshold: z.number().min(0).max(100).optional(),
    maxPumpRuntimeSeconds: z.number().int().min(10).max(7200).optional(),
    mode: z.enum(['MANUAL', 'AUTO']).optional(),
  })
  .refine((obj) => Object.keys(obj).length > 0, {
    message: 'At least one setting must be provided',
  });

export async function getDeviceSettings(req: Request, res: Response): Promise<void> {
  await getDevice(req.params.id);
  const settings = await getSettings(req.params.id);
  if (!settings) throw ApiError.notFound('Settings not found for device');
  res.json({ data: settings });
}

export async function patchDeviceSettings(req: Request, res: Response): Promise<void> {
  await getDevice(req.params.id);
  const input = settingsSchema.parse(req.body ?? {});
  const updated = await updateSettings(req.params.id, input);
  res.json({ data: updated });
}
