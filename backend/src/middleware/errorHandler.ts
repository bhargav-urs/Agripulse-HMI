import type { NextFunction, Request, Response } from 'express';
import { Prisma } from '@prisma/client';
import { ZodError } from 'zod';
import { ApiError } from '../utils/ApiError';
import { createLogger } from '../lib/logger';

const log = createLogger('http');

export function notFoundHandler(req: Request, res: Response): void {
  res.status(404).json({ error: 'Not found', path: req.originalUrl });
}

// eslint-disable-next-line @typescript-eslint/no-unused-vars
export function errorHandler(
  err: unknown,
  _req: Request,
  res: Response,
  _next: NextFunction,
): void {
  if (err instanceof ZodError) {
    res.status(422).json({ error: 'Validation failed', details: err.flatten() });
    return;
  }

  if (err instanceof ApiError) {
    res.status(err.statusCode).json({ error: err.message, details: err.details });
    return;
  }

  if (err instanceof Prisma.PrismaClientKnownRequestError) {
    if (err.code === 'P2025') {
      res.status(404).json({ error: 'Resource not found' });
      return;
    }
    if (err.code === 'P2002') {
      res.status(409).json({ error: 'Unique constraint violation' });
      return;
    }
  }

  log.error('Unhandled error', err instanceof Error ? err.stack ?? err.message : String(err));
  res.status(500).json({ error: 'Internal server error' });
}
