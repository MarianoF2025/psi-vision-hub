import express from 'express';
import helmet from 'helmet';
import cors from 'cors';
import compression from 'compression';
import { config } from './config/environment';
import { logger } from './utils/logger';
import { errorHandler } from './middleware/errorHandler';
import { apiRateLimiter, webhookRateLimiter } from './middleware/rateLimit';
import messageRouter from './routes/message';
import messagesRouter from './routes/messages';
import webhookRouter from './routes/webhook';
import ingestaRouter from './routes/ingesta';
import healthRouter from './routes/health';
import migrationRouter, { setMigrationController } from './routes/migration';
import { incrementRequestCount, incrementErrorCount } from './routes/health';
import { setupMigration } from './migration/setup';

// Crear aplicación Express
const app = express();

// Middlewares de seguridad
app.use(helmet());
app.use(cors());
app.use(compression());

// Body parser
app.use(express.json({ limit: '10mb' }));
app.use(express.urlencoded({ extended: true, limit: '10mb' }));

// Request logging
app.use((req, res, next) => {
  incrementRequestCount();
  logger.info('HTTP Request', {
    method: req.method,
    path: req.path,
    ip: req.ip,
    userAgent: req.headers['user-agent'],
  });
  next();
});

// Rate limiting
app.use('/api/centralwap/message', apiRateLimiter);
app.use('/api/centralwap/messages', apiRateLimiter);
app.use('/api/centralwap/webhooks', webhookRateLimiter);
app.use('/api/centralwap/ingesta', webhookRateLimiter);
app.use('/webhook/router', webhookRateLimiter);
app.use('/webhook/evolution', webhookRateLimiter);

// Inicializar sistema de migración si está habilitado
const migrationController = setupMigration();
if (migrationController) {
  setMigrationController(migrationController);
  logger.info('✅ Sistema de migración habilitado - usar /api/migration/* endpoints');
}

// Rutas
app.use('/api/centralwap/message', messageRouter);
app.use('/api/centralwap/messages', messagesRouter);
app.use('/api/centralwap/webhooks', webhookRouter);
app.use('/api/centralwap/ingesta', ingestaRouter);
app.use('/api/centralwap/health', healthRouter);

// Rutas de ingesta N8N - Mapeo directo de URLs de webhooks
// Estas rutas coinciden con las URLs que N8N usará para enviar mensajes
app.use('/webhook/router', ingestaRouter);
app.use('/webhook/evolution', ingestaRouter);

// Rutas de migración (si está habilitada)
if (migrationController) {
  app.use('/api/migration', migrationRouter);
  logger.info('✅ Endpoints de migración disponibles en /api/migration/*');
}

// Error handling
app.use((err: any, req: express.Request, res: express.Response, next: express.NextFunction) => {
  incrementErrorCount();
  errorHandler(err, req, res, next);
});

// 404 handler
app.use((req: express.Request, res: express.Response) => {
  res.status(404).json({
    success: false,
    error: 'Endpoint no encontrado',
    path: req.path,
  });
});

// Iniciar servidor
const port = process.env.PORT || 3002;

app.listen(port, () => {
  logger.info(`🚀 Centralwap Router iniciado`, {
    port,
    nodeEnv: config.logging.level,
    version: '1.0.0',
  });
});

// Manejo de señales de terminación
process.on('SIGTERM', () => {
  logger.info('SIGTERM recibido, cerrando servidor...');
  process.exit(0);
});

process.on('SIGINT', () => {
  logger.info('SIGINT recibido, cerrando servidor...');
  process.exit(0);
});

export default app;
