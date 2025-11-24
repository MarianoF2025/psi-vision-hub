import { Router, Request, Response, NextFunction } from 'express';
import { body, validationResult } from 'express-validator';
import { MigrationController } from '../migration/MigrationController';
import { MensajeEntrante } from '../types';
import { logger } from '../utils/logger';

const router = Router();

// Controller de migración (se inicializa desde index.ts)
export let migrationController: MigrationController | null = null;

export function setMigrationController(controller: MigrationController) {
  migrationController = controller;
}

// Validaciones para endpoints de migración
const trafficValidation = [
  body('percentage')
    .isInt({ min: 0, max: 100 })
    .withMessage('El porcentaje debe ser entre 0 y 100'),
];

const rollbackValidation = [
  body('reason').optional().isString().withMessage('La razón debe ser un string'),
];

/**
 * POST /api/migration/message
 * Procesar mensaje durante migración (usa routing inteligente)
 */
router.post(
  '/message',
  async (req: Request, res: Response, next: NextFunction) => {
    try {
      if (!migrationController) {
        return res.status(503).json({
          success: false,
          error: 'Migration controller no está inicializado',
        });
      }

      const {
        telefono,
        contenido,
        whatsapp_message_id,
        timestamp,
        origen = 'evolution',
        multimedia,
        utm_data,
      } = req.body;

      // Construir mensaje entrante
      const mensaje: MensajeEntrante = {
        telefono,
        contenido,
        whatsapp_message_id,
        timestamp: timestamp ? new Date(timestamp) : new Date(),
        multimedia: multimedia
          ? {
              tipo: multimedia.tipo,
              url: multimedia.url,
              metadata: multimedia.metadata,
            }
          : undefined,
        metadata: {
          ...utm_data,
          request_id: req.headers['x-request-id'] as string,
          session_id: req.headers['x-session-id'] as string,
          ip_address: req.ip,
          user_agent: req.headers['user-agent'],
          webhook_source: origen,
        },
      };

      // Procesar con controlador de migración
      const resultado = await migrationController.processMessageDuringMigration(mensaje);

      res.status(200).json(resultado);
    } catch (error) {
      logger.error('Error en endpoint /migration/message', {
        error: error instanceof Error ? error.message : 'Error desconocido',
        stack: error instanceof Error ? error.stack : undefined,
      });
      next(error);
    }
  }
);

/**
 * POST /api/migration/traffic
 * Cambiar porcentaje de tráfico a Centralwap
 */
router.post(
  '/traffic',
  trafficValidation,
  async (req: Request, res: Response, next: NextFunction) => {
    try {
      const errors = validationResult(req);
      if (!errors.isEmpty()) {
        return res.status(400).json({
          success: false,
          error: 'Errores de validación',
          details: errors.array(),
        });
      }

      if (!migrationController) {
        return res.status(503).json({
          success: false,
          error: 'Migration controller no está inicializado',
        });
      }

      const { percentage, mode } = req.body;

      // Actualizar configuración de tráfico
      const modeValue = mode || (percentage === 100 ? 'full' : percentage === 0 ? 'active' : 'active');
      (migrationController as any).trafficRouter.updateTrafficSplit(percentage, modeValue);

      logger.info('Configuración de tráfico actualizada', { percentage, mode: modeValue });

      res.status(200).json({
        success: true,
        message: 'Configuración de tráfico actualizada',
        traffic_split: (migrationController as any).trafficRouter.getCurrentConfig(),
      });
    } catch (error) {
      logger.error('Error actualizando configuración de tráfico', {
        error: error instanceof Error ? error.message : 'Error desconocido',
      });
      next(error);
    }
  }
);

/**
 * POST /api/migration/rollback
 * Rollback inmediato a Router PSI 100%
 */
router.post(
  '/rollback',
  rollbackValidation,
  async (req: Request, res: Response, next: NextFunction) => {
    try {
      if (!migrationController) {
        return res.status(503).json({
          success: false,
          error: 'Migration controller no está inicializado',
        });
      }

      const { reason = 'manual_rollback' } = req.body;

      // Ejecutar rollback
      (migrationController as any).trafficRouter.updateTrafficSplit(0, 'active');

      logger.warn('Rollback manual ejecutado', { reason });

      res.status(200).json({
        success: true,
        message: 'Rollback ejecutado exitosamente',
        reason,
        traffic_split: (migrationController as any).trafficRouter.getCurrentConfig(),
      });
    } catch (error) {
      logger.error('Error ejecutando rollback', {
        error: error instanceof Error ? error.message : 'Error desconocido',
      });
      next(error);
    }
  }
);

/**
 * GET /api/migration/status
 * Obtener estado actual de la migración
 */
router.get('/status', async (req: Request, res: Response, next: NextFunction) => {
  try {
    if (!migrationController) {
      return res.status(503).json({
        success: false,
        error: 'Migration controller no está inicializado',
      });
    }

    const status = await migrationController.getMigrationStatus();

    res.status(200).json({
      success: true,
      ...status,
    });
  } catch (error) {
    logger.error('Error obteniendo estado de migración', {
      error: error instanceof Error ? error.message : 'Error desconocido',
    });
    next(error);
  }
});

/**
 * GET /api/migration/health
 * Verificar salud de ambos sistemas
 */
router.get('/health', async (req: Request, res: Response, next: NextFunction) => {
  try {
    if (!migrationController) {
      return res.status(503).json({
        success: false,
        error: 'Migration controller no está inicializado',
      });
    }

    const health = await (migrationController as any).metrics.getCurrentHealth();

    res.status(200).json({
      success: true,
      health,
      timestamp: new Date().toISOString(),
    });
  } catch (error) {
    logger.error('Error obteniendo health de migración', {
      error: error instanceof Error ? error.message : 'Error desconocido',
    });
    next(error);
  }
});

/**
 * POST /api/migration/shadow
 * Activar/desactivar modo shadow
 */
router.post('/shadow', async (req: Request, res: Response, next: NextFunction) => {
  try {
    if (!migrationController) {
      return res.status(503).json({
        success: false,
        error: 'Migration controller no está inicializado',
      });
    }

    const { enabled = true } = req.body;

    const mode = enabled ? 'shadow' : 'active';
    const percentage = enabled ? 0 : (migrationController as any).trafficRouter.getCurrentConfig().centralwap_percentage;

    (migrationController as any).trafficRouter.updateTrafficSplit(percentage, mode);

    logger.info('Modo shadow actualizado', { enabled, mode });

    res.status(200).json({
      success: true,
      message: `Modo shadow ${enabled ? 'activado' : 'desactivado'}`,
      traffic_split: (migrationController as any).trafficRouter.getCurrentConfig(),
    });
  } catch (error) {
    logger.error('Error actualizando modo shadow', {
      error: error instanceof Error ? error.message : 'Error desconocido',
    });
    next(error);
  }
});

export default router;
