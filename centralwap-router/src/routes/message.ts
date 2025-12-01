import { Router, Request, Response, NextFunction } from 'express';
import { body, validationResult } from 'express-validator';
import { CentralwapRouter } from '../core/CentralwapRouter';
import { EvolutionWhatsAppService } from '../services/WhatsAppService';
import { MensajeEntrante } from '../types';
import { logger } from '../utils/logger';

const router = Router();

// Crear instancia del router central
const whatsappService = new EvolutionWhatsAppService();
const centralwapRouter = new CentralwapRouter(whatsappService);

// Validaciones para el endpoint de mensaje
const messageValidation = [
  body('telefono')
    .trim()
    .notEmpty()
    .withMessage('El teléfono es requerido')
    .isLength({ min: 10, max: 15 })
    .withMessage('El teléfono debe tener entre 10 y 15 caracteres'),
  body('contenido')
    .trim()
    .notEmpty()
    .withMessage('El contenido del mensaje es requerido')
    .isLength({ max: 4096 })
    .withMessage('El contenido no puede exceder 4096 caracteres'),
  body('whatsapp_message_id')
    .trim()
    .notEmpty()
    .withMessage('El ID del mensaje de WhatsApp es requerido'),
  body('timestamp').optional().isISO8601().withMessage('El timestamp debe ser una fecha válida'),
  body('origen')
    .optional()
    .isIn(['evolution', 'cloud_api', 'manual'])
    .withMessage('El origen debe ser evolution, cloud_api o manual'),
];

/**
 * POST /api/centralwap/message
 * Procesar mensaje WhatsApp entrante
 */
router.post(
  '/',
  messageValidation,
  async (req: Request, res: Response, next: NextFunction) => {
    try {
      // Validar resultados de validación
      const errors = validationResult(req);
      if (!errors.isEmpty()) {
        return res.status(400).json({
          success: false,
          error: 'Errores de validación',
          details: errors.array(),
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

      // Procesar mensaje
      const resultado = await centralwapRouter.procesarMensaje(mensaje);

      // Responder según resultado
      if (resultado.success) {
        res.status(200).json({
          success: true,
          request_id: resultado.request_id,
          conversacion_id: undefined, // Se podría obtener del contexto si es necesario
          accion_ejecutada: resultado.accion_ejecutada,
          area_destino: resultado.area_destino,
          ticket_creado: resultado.ticket_creado,
          mensaje_enviado: true,
          processing_time_ms: resultado.processing_time_ms,
        });
      } else {
        res.status(500).json({
          success: false,
          request_id: resultado.request_id,
          error: resultado.error,
          processing_time_ms: resultado.processing_time_ms,
        });
      }
    } catch (error) {
      logger.error('Error en endpoint /message', {
        error: error instanceof Error ? error.message : 'Error desconocido',
        stack: error instanceof Error ? error.stack : undefined,
      });
      next(error);
    }
  }
);

export default router;









