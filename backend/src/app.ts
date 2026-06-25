import express, { type Express } from 'express';
import cors from 'cors';
import { env } from './config/env';
import router from './routes';
import { errorHandler, notFoundHandler } from './middleware/errorHandler';
import { createLogger } from './lib/logger';

const log = createLogger('http');

export function createApp(): Express {
  const app = express();

  app.use(cors({ origin: env.corsOrigin }));
  app.use(express.json());

  // Lightweight request logger
  app.use((req, _res, next) => {
    if (req.path !== '/health') log.debug(`${req.method} ${req.originalUrl}`);
    next();
  });

  app.get('/', (_req, res) => {
    res.json({
      name: 'AgriPulse HMI API',
      version: '1.0.0',
      docs: '/health, /devices, /weather/current',
    });
  });

  app.use('/', router);

  app.use(notFoundHandler);
  app.use(errorHandler);

  return app;
}
