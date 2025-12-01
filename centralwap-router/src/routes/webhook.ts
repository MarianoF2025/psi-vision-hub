import { Router, Request, Response, NextFunction } from 'express';
import { CentralwapRouter } from '../core/CentralwapRouter';
import { EvolutionWhatsAppService } from '../services/WhatsAppService';
import { MensajeEntrante } from '../types';
import { logger } from '../utils/logger';
import { config } from '../config/environment';

const router = Router();

// Crear instancia del router central
const whatsappService = new EvolutionWhatsAppService();
const centralwapRouter = new CentralwapRouter(whatsappService);

/**
 * POST /api/centralwap/webhooks/evolution
 * Webhook para recibir eventos de Evolution API
 */
router.post('/evolution', async (req: Request, res: Response, next: NextFunction) => {
  try {
    // Validar webhook secret si está configurado
    const webhookSecret = req.headers['x-webhook-secret'] as string;
    if (config.whatsapp.evolution.webhook_secret) {
      if (webhookSecret !== config.whatsapp.evolution.webhook_secret) {
        logger.warn('Webhook secret inválido', {
          ip: req.ip,
          provided: webhookSecret,
        });
        return res.status(401).json({
          success: false,
          error: 'Unauthorized',
        });
      }
    }

    const { event, instance, data } = req.body;

    // Solo procesar mensajes entrantes
    if (event !== 'messages.upsert' || !data?.messages) {
      logger.debug('Evento ignorado', { event, instance });
      return res.status(200).json({ success: true, message: 'Evento ignorado' });
    }

    // Procesar cada mensaje
    const mensajes = Array.isArray(data.messages) ? data.messages : [data.messages];
    const resultados = [];

    for (const mensajeData of mensajes) {
      // Solo procesar mensajes de texto entrantes
      if (
        mensajeData.messageType !== 'conversation' ||
        mensajeData.from === 'status@broadcast' ||
        !mensajeData.body?.text
      ) {
        continue;
      }

      // Construir mensaje entrante
      const mensaje: MensajeEntrante = {
        telefono: mensajeData.from,
        contenido: mensajeData.body.text,
        whatsapp_message_id: mensajeData.key?.id || `evo_${Date.now()}`,
        timestamp: new Date(parseInt(mensajeData.messageTimestamp) * 1000),
        metadata: {
          request_id: `webhook_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`,
          webhook_source: 'evolution',
          instance_name: instance,
          ip_address: req.ip,
          user_agent: req.headers['user-agent'],
        },
      };

      // Procesar mensaje
      const resultado = await centralwapRouter.procesarMensaje(mensaje);
      resultados.push(resultado);
    }

    res.status(200).json({
      success: true,
      mensajes_procesados: resultados.length,
      resultados,
    });
  } catch (error) {
    logger.error('Error en webhook Evolution', {
      error: error instanceof Error ? error.message : 'Error desconocido',
      stack: error instanceof Error ? error.stack : undefined,
    });
    next(error);
  }
});

export default router;









