import type { Request, Response } from 'express';
import { z } from 'zod';
import {
  getConnectionState,
  getDevice,
  getLatestState,
  listDevices,
  updateDeviceProfile,
} from '../services/device.service';

const profileSchema = z
  .object({
    name: z.string().min(1).max(80).optional(),
    fieldName: z.string().min(1).max(80).optional(),
    location: z.string().min(1).max(120).optional(),
  })
  .refine((o) => Object.keys(o).length > 0, { message: 'No fields to update' });

export async function getDevices(_req: Request, res: Response): Promise<void> {
  const devices = await listDevices();
  res.json({ data: devices });
}

export async function getDeviceById(req: Request, res: Response): Promise<void> {
  const device = await getDevice(req.params.id);
  res.json({ data: device });
}

export async function getDeviceLatest(req: Request, res: Response): Promise<void> {
  const state = await getLatestState(req.params.id);
  res.json({ data: state });
}

export async function getDeviceConnection(req: Request, res: Response): Promise<void> {
  // Ensure the device exists (throws 404 otherwise) before reporting connection.
  await getDevice(req.params.id);
  res.json({ data: getConnectionState(req.params.id) });
}

export async function patchDeviceProfile(req: Request, res: Response): Promise<void> {
  const input = profileSchema.parse(req.body ?? {});
  const updated = await updateDeviceProfile(req.params.id, input);
  res.json({ data: updated });
}
