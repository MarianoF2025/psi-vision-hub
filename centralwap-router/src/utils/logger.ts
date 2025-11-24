import winston from 'winston';
import { config } from '../config/environment';

// Configurar formato estructurado
const format = winston.format.combine(
  winston.format.timestamp({ format: 'YYYY-MM-DD HH:mm:ss' }),
  winston.format.errors({ stack: true }),
  winston.format.splat(),
  winston.format.json()
);

// Configurar transports
const transports: winston.transport[] = [
  new winston.transports.Console({
    format: winston.format.combine(
      winston.format.colorize(),
      winston.format.printf(({ timestamp, level, message, ...meta }) => {
        const metaStr = Object.keys(meta).length ? JSON.stringify(meta, null, 2) : '';
        return `${timestamp} [${level}]: ${message} ${metaStr}`;
      })
    ),
  }),
];

// Agregar file transport en producción
if (config.logging.level === 'error' || process.env.NODE_ENV === 'production') {
  transports.push(
    new winston.transports.File({
      filename: 'logs/error.log',
      level: 'error',
      format,
    }),
    new winston.transports.File({
      filename: 'logs/combined.log',
      format,
    })
  );
}

// Crear logger
export const logger = winston.createLogger({
  level: config.logging.level,
  format,
  transports,
  defaultMeta: { service: 'centralwap-router' },
});

// Helper para logging con request_id
export const logWithRequestId = (
  requestId: string,
  level: 'info' | 'warn' | 'error' | 'debug',
  message: string,
  meta?: Record<string, any>
) => {
  logger[level](message, { request_id: requestId, ...meta });
};




