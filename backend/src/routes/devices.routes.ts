import { Router } from 'express';
import { asyncHandler } from '../utils/asyncHandler';
import {
  getDeviceById,
  getDeviceConnection,
  getDeviceLatest,
  getDevices,
  patchDeviceProfile,
} from '../controllers/devices.controller';
import { getLatestTelemetryReading, getTelemetry } from '../controllers/telemetry.controller';
import {
  postEmergencyReset,
  postEmergencyStop,
  postPumpStart,
  postPumpStop,
} from '../controllers/pump.controller';
import { postMode } from '../controllers/mode.controller';
import { getAlerts } from '../controllers/alerts.controller';
import { getDeviceSettings, patchDeviceSettings } from '../controllers/settings.controller';

const router = Router();

// Devices
router.get('/', asyncHandler(getDevices));
router.get('/:id', asyncHandler(getDeviceById));
router.patch('/:id', asyncHandler(patchDeviceProfile));
router.get('/:id/latest', asyncHandler(getDeviceLatest));
router.get('/:id/connection', asyncHandler(getDeviceConnection));

// Telemetry
router.get('/:id/telemetry', asyncHandler(getTelemetry));
router.get('/:id/telemetry/latest', asyncHandler(getLatestTelemetryReading));

// Pump control
router.post('/:id/pump/start', asyncHandler(postPumpStart));
router.post('/:id/pump/stop', asyncHandler(postPumpStop));
router.post('/:id/pump/emergency-stop', asyncHandler(postEmergencyStop));
router.post('/:id/pump/emergency-reset', asyncHandler(postEmergencyReset));

// Mode
router.post('/:id/mode', asyncHandler(postMode));

// Alerts (list)
router.get('/:id/alerts', asyncHandler(getAlerts));

// Settings
router.get('/:id/settings', asyncHandler(getDeviceSettings));
router.patch('/:id/settings', asyncHandler(patchDeviceSettings));

export default router;
