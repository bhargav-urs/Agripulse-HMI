import { Router } from 'express';
import { asyncHandler } from '../utils/asyncHandler';
import devicesRouter from './devices.routes';
import { acknowledgeAlert } from '../controllers/alerts.controller';
import { getCurrentWeather, getForecast } from '../controllers/weather.controller';
import { getHealth } from '../controllers/health.controller';

const router = Router();

// Diagnostics
router.get('/health', asyncHandler(getHealth));

// Devices (+ nested telemetry / pump / mode / alerts / settings)
router.use('/devices', devicesRouter);

// Alerts (acknowledge by alert id)
router.patch('/alerts/:id/acknowledge', asyncHandler(acknowledgeAlert));

// Weather
router.get('/weather/current', asyncHandler(getCurrentWeather));
router.get('/weather/forecast', asyncHandler(getForecast));

export default router;
