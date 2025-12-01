import { Router, Request, Response, NextFunction } from 'express';
import { body, validationResult, param } from 'express-validator';
import { CentralwapRouter } from '../core/CentralwapRouter';
import { EvolutionWhatsAppService } from '../services/WhatsAppService';
import { MensajeEntrante, AreaType } from '../types';
import { logger } from '../utils/logger';

const router = Router();

// Crear instancia del router central
const whatsappService = new EvolutionWhatsAppService();
const centralwapRouter = new CentralwapRouter(whatsappService);

// Validaciones para el endpoint de ingesta
const ingestaValidation = [
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
  body('area_ingesta')
    .optional()
    .isIn(['wsp4', 'administracion', 'alumnos', 'ventas', 'comunidad'])
    .withMessage('El área de ingesta debe ser válida'),
];

// Mapeo de áreas desde la URL a áreas internas
const areaUrlMap: Record<string, AreaType> = {
  wsp4: 'wsp4',
  administracion: 'admin',
  alumnos: 'alumnos',
  ventas: 'ventas',
  ventas1: 'ventas',
  ventas2: 'ventas',
  ventas3: 'ventas',
  comunidad: 'comunidad',
};

/**
 * POST /api/centralwap/ingesta/:area
 * Recibir mensaje desde N8N organizado por área
 * Ejemplo: /api/centralwap/ingesta/administracion
 */
router.post(
  '/:area',
  [
    param('area').isIn(Object.keys(areaUrlMap)).withMessage('Área inválida'),
    ...ingestaValidation,
  ],
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

      const areaUrl = req.params.area.toLowerCase();
      const areaInterna = areaUrlMap[areaUrl] || 'wsp4';

      const {
        telefono,
        contenido,
        whatsapp_message_id,
        timestamp,
        multimedia,
        utm_data,
        area_ingesta,
        metadata: metadataBody,
      } = req.body;

      // Construir mensaje entrante con información del área de ingesta
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
          request_id: req.headers['x-request-id'] as string || `ingesta_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`,
          session_id: req.headers['x-session-id'] as string,
          ip_address: req.ip,
          user_agent: req.headers['user-agent'],
          webhook_source: 'n8n_ingesta',
          area_ingesta: area_ingesta || areaInterna,
          area_url: areaUrl,
          ...metadataBody,
        },
      };

      logger.info('Mensaje recibido desde N8N ingesta', {
        area: areaInterna,
        areaUrl,
        telefono,
        request_id: mensaje.metadata?.request_id,
      });

      // Procesar mensaje
      const resultado = await centralwapRouter.procesarMensaje(mensaje);

      // Responder según resultado
      if (resultado.success) {
        res.status(200).json({
          success: true,
          request_id: resultado.request_id,
          conversacion_id: resultado.conversacion_id,
          accion_ejecutada: resultado.accion_ejecutada,
          area_destino: resultado.area_destino,
          area_ingesta: areaInterna,
          ticket_creado: resultado.ticket_creado,
          mensaje_enviado: true,
          processing_time_ms: resultado.processing_time_ms,
        });
      } else {
        res.status(500).json({
          success: false,
          request_id: resultado.request_id,
          error: resultado.error,
          area_ingesta: areaInterna,
          processing_time_ms: resultado.processing_time_ms,
        });
      }
    } catch (error) {
      logger.error('Error en endpoint de ingesta N8N', {
        area: req.params.area,
        error: error instanceof Error ? error.message : 'Error desconocido',
        stack: error instanceof Error ? error.stack : undefined,
      });
      next(error);
    }
  }
);

/**
 * POST /webhook/router/:area/incoming
 * POST /api/centralwap/ingesta/directa/:area
 * Recibir mensaje desde N8N Router organizado por área
 * Ejemplo: /webhook/router/administracion/incoming
 */
router.post(
  '/router/:area/incoming',
  [
    param('area').isIn(['wsp4', 'administracion', 'alumnos', 'comunidad', 'ventas1', 'ventas2', 'ventas3']).withMessage('Área inválida para ingesta router'),
    ...ingestaValidation,
  ],
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

      const areaUrl = req.params.area.toLowerCase();
      const areaInterna = areaUrlMap[areaUrl] || 'wsp4';

      const {
        telefono,
        contenido,
        whatsapp_message_id,
        timestamp,
        multimedia,
        utm_data,
        metadata: metadataBody,
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
          request_id: req.headers['x-request-id'] as string || `ingesta_router_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`,
          session_id: req.headers['x-session-id'] as string,
          ip_address: req.ip,
          user_agent: req.headers['user-agent'],
          webhook_source: 'n8n_router',
          area_ingesta: areaInterna,
          area_url: areaUrl,
          ...metadataBody,
        },
      };

      logger.info('Mensaje recibido desde ingesta N8N Router', {
        area: areaInterna,
        areaUrl,
        telefono,
        request_id: mensaje.metadata?.request_id,
      });

      // Procesar mensaje
      const resultado = await centralwapRouter.procesarMensaje(mensaje);

      // Responder según resultado
      if (resultado.success) {
        res.status(200).json({
          success: true,
          request_id: resultado.request_id,
          conversacion_id: resultado.conversacion_id,
          accion_ejecutada: resultado.accion_ejecutada,
          area_destino: resultado.area_destino,
          area_ingesta: areaInterna,
          ticket_creado: resultado.ticket_creado,
          mensaje_enviado: true,
          processing_time_ms: resultado.processing_time_ms,
        });
      } else {
        res.status(500).json({
          success: false,
          request_id: resultado.request_id,
          error: resultado.error,
          area_ingesta: areaInterna,
          processing_time_ms: resultado.processing_time_ms,
        });
      }
    } catch (error) {
      logger.error('Error en endpoint de ingesta directa', {
        area: req.params.area,
        error: error instanceof Error ? error.message : 'Error desconocido',
        stack: error instanceof Error ? error.stack : undefined,
      });
      next(error);
    }
  }
);

/**
 * POST /webhook/evolution/:area/incoming
 * Recibir mensaje directo desde Evolution API organizado por área
 * Ejemplo: /webhook/evolution/administracion/incoming
 */
router.post(
  '/evolution/:area/incoming',
  [
    param('area').isIn(['administracion', 'alumnos', 'comunidad']).withMessage('Área inválida para ingesta directa Evolution'),
    ...ingestaValidation,
  ],
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

      const areaUrl = req.params.area.toLowerCase();
      const areaInterna = areaUrlMap[areaUrl] || 'wsp4';

      const {
        telefono,
        contenido,
        whatsapp_message_id,
        timestamp,
        multimedia,
        utm_data,
        metadata: metadataBody,
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
          request_id: req.headers['x-request-id'] as string || `ingesta_evolution_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`,
          session_id: req.headers['x-session-id'] as string,
          ip_address: req.ip,
          user_agent: req.headers['user-agent'],
          webhook_source: 'evolution_directa',
          area_ingesta: areaInterna,
          area_url: areaUrl,
          ...metadataBody,
        },
      };

      logger.info('Mensaje recibido desde ingesta directa Evolution', {
        area: areaInterna,
        areaUrl,
        telefono,
        request_id: mensaje.metadata?.request_id,
      });

      // Procesar mensaje
      const resultado = await centralwapRouter.procesarMensaje(mensaje);

      // Responder según resultado
      if (resultado.success) {
        res.status(200).json({
          success: true,
          request_id: resultado.request_id,
          conversacion_id: resultado.conversacion_id,
          accion_ejecutada: resultado.accion_ejecutada,
          area_destino: resultado.area_destino,
          area_ingesta: areaInterna,
          ticket_creado: resultado.ticket_creado,
          mensaje_enviado: true,
          processing_time_ms: resultado.processing_time_ms,
        });
      } else {
        res.status(500).json({
          success: false,
          request_id: resultado.request_id,
          error: resultado.error,
          area_ingesta: areaInterna,
          processing_time_ms: resultado.processing_time_ms,
        });
      }
    } catch (error) {
      logger.error('Error en endpoint de ingesta directa Evolution', {
        area: req.params.area,
        error: error instanceof Error ? error.message : 'Error desconocido',
        stack: error instanceof Error ? error.stack : undefined,
      });
      next(error);
    }
  }
);

export default router;

