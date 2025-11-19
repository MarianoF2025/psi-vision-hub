import { NextFunction, Request, Response } from 'express';
import { Logger } from '../utils/logger';

export function errorHandler(err: any, _req: Request, res: Response, _next: NextFunction) {
  Logger.error('Error en router PSI', { err });
  const status = err.status || 500;
  res.status(status).json({
    success: false,
    error: err.message || 'Error interno del router',
  });
}
