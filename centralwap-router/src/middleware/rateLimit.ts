import rateLimit from 'express-rate-limit';
import { config } from '../config/environment';

// Rate limiter general
export const apiRateLimiter = rateLimit({
  windowMs: 60 * 1000, // 1 minuto
  max: config.sistema.rate_limit_por_minuto,
  message: {
    success: false,
    error: 'Demasiadas solicitudes. Por favor, intentá nuevamente en un momento.',
  },
  standardHeaders: true,
  legacyHeaders: false,
});

// Rate limiter para webhooks (más permisivo)
export const webhookRateLimiter = rateLimit({
  windowMs: 60 * 1000, // 1 minuto
  max: 120, // Permitir más requests por minuto para webhooks
  message: {
    success: false,
    error: 'Demasiadas solicitudes de webhook.',
  },
  standardHeaders: true,
  legacyHeaders: false,
});









