import { Router, Request, Response, NextFunction } from 'express';
import { body, validationResult } from 'express-validator';
import { createWhatsAppService } from '../services/WhatsAppServiceFactory';
import { logger, logWithRequestId } from '../utils/logger';
import { supabase } from '../config/supabase';
import { v4 as uuidv4 } from 'uuid';

const router = Router();

// Validaciones para el endpoint de envío de mensajes
const sendMessageValidation = [
  body('telefono')
    .trim()
    .notEmpty()
    .withMessage('El teléfono es requerido')
    .matches(/^\+?[1-9]\d{1,14}$/)
    .withMessage('Formato de teléfono inválido (debe ser E.164)'),
  body('mensaje')
    .trim()
    .notEmpty()
    .withMessage('El contenido del mensaje es requerido')
    .isLength({ max: 4096 })
    .withMessage('El mensaje no puede exceder 4096 caracteres'),
  body('conversacion_id')
    .trim()
    .notEmpty()
    .withMessage('El ID de conversación es requerido')
    .isUUID()
    .withMessage('El ID de conversación debe ser un UUID válido'),
];

/**
 * POST /api/centralwap/messages/send
 * Enviar mensaje desde el CRM a través del Router
 * 
 * Este endpoint permite que el CRM envíe mensajes por WhatsApp
 * a través del Router Centralwap
 */
router.post(
  '/send',
  sendMessageValidation,
  async (req: Request, res: Response, next: NextFunction) => {
    const requestId = req.headers['x-request-id'] as string || `send_${Date.now()}_${uuidv4().substring(0, 8)}`;
    
    try {
      // Validar resultados de validación
      const errors = validationResult(req);
      if (!errors.isEmpty()) {
        return res.status(400).json({
          success: false,
          request_id: requestId,
          error: 'Errores de validación',
          details: errors.array(),
        });
      }

      const { telefono, mensaje, conversacion_id, remitente } = req.body;

      logWithRequestId(requestId, 'info', 'Enviando mensaje desde CRM', {
        telefono,
        conversacion_id,
        mensajeLength: mensaje.length,
        remitente: remitente || 'unknown',
      });

      // 1. Verificar que la conversación existe y obtener información
      const { data: conversacion, error: convError } = await supabase
        .from('conversaciones')
        .select('id, telefono, area, estado')
        .eq('id', conversacion_id)
        .single();

      if (convError || !conversacion) {
        logWithRequestId(requestId, 'error', 'Conversación no encontrada', {
          conversacion_id,
          error: convError?.message,
        });
        return res.status(404).json({
          success: false,
          request_id: requestId,
          error: 'Conversación no encontrada',
        });
      }

      // 2. Verificar que el teléfono coincide con la conversación
      if (conversacion.telefono !== telefono) {
        logWithRequestId(requestId, 'warn', 'Teléfono no coincide con conversación', {
          telefono_recibido: telefono,
          telefono_conversacion: conversacion.telefono,
        });
        // No es un error crítico, continuamos con el teléfono de la conversación
      }

      // 3. Crear servicio de WhatsApp según configuración
      const whatsappService = createWhatsAppService();

      // 4. Enviar mensaje por WhatsApp
      const resultadoEnvio = await whatsappService.enviarMensaje({
        telefono: conversacion.telefono || telefono,
        mensaje,
        conversacion_id,
        request_id: requestId,
        metadata: {
          remitente: remitente || 'crm_agent',
          origen: 'crm',
          timestamp: new Date().toISOString(),
        },
      });

      if (!resultadoEnvio.success) {
        logWithRequestId(requestId, 'error', 'Error al enviar mensaje por WhatsApp', {
          conversacion_id,
          error: resultadoEnvio.error,
        });

        // Actualizar mensaje en BD con estado de error
        await supabase
          .from('mensajes')
          .update({
            estado: 'error',
            metadata: {
              error: resultadoEnvio.error,
              error_timestamp: new Date().toISOString(),
            },
            updated_at: new Date().toISOString(),
          })
          .eq('conversacion_id', conversacion_id)
          .eq('remitente_tipo', 'agent')
          .order('timestamp', { ascending: false })
          .limit(1);

        return res.status(500).json({
          success: false,
          request_id: requestId,
          error: resultadoEnvio.error || 'Error al enviar mensaje por WhatsApp',
        });
      }

      // 5. Opcional: Intentar actualizar mensaje en BD con message_id y estado
      // El CRM puede actualizarlo, pero intentamos aquí por si acaso
      try {
        const { error: updateError } = await supabase
          .from('mensajes')
          .update({
            metadata: {
              whatsapp_message_id: resultadoEnvio.message_id,
              estado_enviado: 'sent',
              sent_at: new Date().toISOString(),
              router_request_id: requestId,
            },
            estado: 'sent',
            updated_at: new Date().toISOString(),
          })
          .eq('conversacion_id', conversacion_id)
          .eq('remitente_tipo', 'agent')
          .order('timestamp', { ascending: false })
          .limit(1);

        if (updateError) {
          logWithRequestId(requestId, 'warn', 'Error al actualizar mensaje en BD (no crítico)', {
            conversacion_id,
            error: updateError.message,
          });
          // No es crítico, el mensaje ya se envió y el CRM lo actualizará
        }
      } catch (updateException) {
        logWithRequestId(requestId, 'warn', 'Excepción al actualizar mensaje en BD (no crítico)', {
          conversacion_id,
          error: updateException instanceof Error ? updateException.message : 'Error desconocido',
        });
        // No es crítico, continuamos
      }

      // 6. Actualizar última actividad de la conversación
      await supabase
        .from('conversaciones')
        .update({
          ts_ultimo_mensaje: new Date().toISOString(),
          updated_at: new Date().toISOString(),
        })
        .eq('id', conversacion_id);

      logWithRequestId(requestId, 'info', 'Mensaje enviado exitosamente desde CRM', {
        conversacion_id,
        message_id: resultadoEnvio.message_id,
      });

      return res.status(200).json({
        success: true,
        request_id: requestId,
        message_id: resultadoEnvio.message_id,
        conversacion_id,
        estado: 'sent',
      });
    } catch (error) {
      logWithRequestId(requestId, 'error', 'Error en endpoint /messages/send', {
        error: error instanceof Error ? error.message : 'Error desconocido',
        stack: error instanceof Error ? error.stack : undefined,
      });
      next(error);
    }
  }
);

export default router;

