import { prisma } from '../lib/prisma';
import { ApiError } from '../utils/ApiError';
import { deviceState } from './deviceState.service';

export async function listDevices() {
  return prisma.device.findMany({
    orderBy: { createdAt: 'asc' },
    include: { settings: true },
  });
}

export async function getDevice(deviceId: string) {
  const device = await prisma.device.findUnique({
    where: { id: deviceId },
    include: { settings: true },
  });
  if (!device) throw ApiError.notFound(`Device ${deviceId} not found`);
  return device;
}

export interface DeviceProfileInput {
  name?: string;
  fieldName?: string;
  location?: string;
}

export async function updateDeviceProfile(deviceId: string, input: DeviceProfileInput) {
  await getDevice(deviceId); // 404 if missing
  return prisma.device.update({
    where: { id: deviceId },
    data: input,
    include: { settings: true },
  });
}

export function getConnectionState(deviceId: string) {
  const state = deviceState.get(deviceId);
  return {
    deviceId,
    status: state?.online ? 'ONLINE' : 'OFFLINE',
    lastTelemetryAt: state?.lastTelemetryAt
      ? new Date(state.lastTelemetryAt).toISOString()
      : null,
    pumpStatus: state?.pumpStatus ?? false,
    emergencyStop: state?.emergencyStop ?? false,
    mode: state?.mode ?? 'MANUAL',
  };
}

/** Composite "latest state" snapshot for the dashboard. */
export async function getLatestState(deviceId: string) {
  const device = await getDevice(deviceId);
  const runtime = deviceState.get(deviceId);

  const [latestTelemetry, latestWeather, latestAlert, latestDecision] = await Promise.all([
    prisma.telemetry.findFirst({ where: { deviceId }, orderBy: { createdAt: 'desc' } }),
    prisma.weatherSnapshot.findFirst({ where: { deviceId }, orderBy: { createdAt: 'desc' } }),
    prisma.alert.findFirst({ where: { deviceId }, orderBy: { createdAt: 'desc' } }),
    prisma.automationDecision.findFirst({ where: { deviceId }, orderBy: { createdAt: 'desc' } }),
  ]);

  return {
    device: {
      id: device.id,
      name: device.name,
      fieldName: device.fieldName,
      location: device.location,
      status: runtime?.online ? 'ONLINE' : 'OFFLINE',
    },
    settings: device.settings,
    mode: runtime?.mode ?? device.settings?.mode ?? 'MANUAL',
    online: runtime?.online ?? false,
    emergencyStop: runtime?.emergencyStop ?? false,
    pump: {
      status: runtime?.pumpStatus ?? false,
      valveStatus: runtime?.valveStatus ?? false,
      runtimeSeconds: deviceState.pumpRuntimeSeconds(deviceId),
      source: runtime?.pumpSource ?? null,
    },
    telemetry: latestTelemetry,
    weather: latestWeather,
    latestAlert,
    latestDecision,
  };
}
