import { Prisma } from '@prisma/client';
import { HttpError } from '../lib/http-error.js';

export function notFound(req, _res, next) {
  next(new HttpError(404, `Route ${req.method} ${req.originalUrl} not found`));
}

export function errorHandler(error, _req, res, _next) {
  if (error instanceof HttpError) {
    return res.status(error.status).json({
      error: { message: error.message, ...(error.details && { details: error.details }) },
    });
  }

  if (error instanceof Prisma.PrismaClientKnownRequestError) {
    if (error.code === 'P2002') {
      return res.status(409).json({ error: { message: 'A record with this value already exists' } });
    }
    if (error.code === 'P2025') {
      return res.status(404).json({ error: { message: 'Record not found' } });
    }
    if (error.code === 'P2003') {
      return res.status(409).json({ error: { message: 'Record is still referenced by other data' } });
    }
  }

  console.error(error);
  return res.status(500).json({ error: { message: 'Internal server error' } });
}
