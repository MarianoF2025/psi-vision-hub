import { Router } from 'express';
import { verifyWebhook } from '../middleware/auth';
import { webhookPayloadSchema } from '../utils/validation';
import { Logger } from '../utils/logger';
import { messageProcessor } from '../services/MessageProcessor';
import { Area } from '../models/enums';
import { metaAdsHandler } from '../services/MetaAdsHandler';

export const webhookRouter = Router();

webhookRouter.get('/webhook/whatsapp/:inbox', verifyWebhook);

webhookRouter.post('/webhook/whatsapp/wsp4', async (req, res, next) => {
  try {
    // Si es webhook de status directo de WhatsApp Cloud API (sin messages)
    if (req.body.messaging_product === 'whatsapp' && !req.body.messages) {
      Logger.info('Webhook de status WhatsApp Cloud API ignorado (WSP4)');
      return res.status(200).json({ success: true, ignored: true });
    }

    const { error, value } = webhookPayloadSchema.validate(req.body);
    if (error) {
      Logger.warn('Payload invalido WSP4', { error });
      return res.status(400).json({ success: false, error: 'payload invalido' });
    }

    const message = value.messages[0];
    const result = await messageProcessor.processIncoming(message, Area.ADMINISTRACION);
    res.json({ success: true, result });
  } catch (err) {
    next(err);
  }
});

webhookRouter.post('/webhook/whatsapp/ventas1', async (req, res, next) => {
  try {
    // Si es webhook de status directo de WhatsApp Cloud API (sin messages)
    if (req.body.messaging_product === 'whatsapp' && !req.body.messages) {
      Logger.info('Webhook de status WhatsApp Cloud API ignorado (VENTAS1)');
      return res.status(200).json({ success: true, ignored: true });
    }

    const telefono = req.body?.messages?.[0]?.from;
    const texto = req.body?.messages?.[0]?.text?.body || '';

    if (!telefono) {
      return res.status(400).json({ success: false, error: 'Telefono requerido' });
    }

    let origen: 'meta_ads' | 'derivado_wsp4' = 'meta_ads';
    if (req.body.conversacion_id) origen = 'derivado_wsp4';

    if (origen === 'meta_ads') {
      const data = await metaAdsHandler.procesarMensajeMetaAds(telefono, texto);
      return res.json({ success: true, data });
    }

    const { error, value } = webhookPayloadSchema.validate(req.body);
    if (error) {
      return res.status(400).json({ success: false, error: 'payload invalido' });
    }

    const result = await messageProcessor.processIncoming(value.messages[0], Area.VENTAS1);
    res.json({ success: true, result });
  } catch (err) {
    next(err);
  }
});

const redirAreas: Record<string, Area> = {
  administracion: Area.ADMINISTRACION,
  alumnos: Area.ALUMNOS,
  comunidad: Area.COMUNIDAD,
};

webhookRouter.post('/webhook/whatsapp/:area', async (req, res, next) => {
  try {
    // Si es webhook de status directo de WhatsApp Cloud API (sin messages)
    if (req.body.messaging_product === 'whatsapp' && !req.body.messages) {
      Logger.info(`Webhook de status WhatsApp Cloud API ignorado (${req.params.area})`);
      return res.status(200).json({ success: true, ignored: true });
    }

    const areaParam = req.params.area.toLowerCase();
    const area = redirAreas[areaParam];
    if (!area) {
      return res.status(404).json({ success: false, error: 'area no soportada' });
    }

    const { error, value } = webhookPayloadSchema.validate(req.body);
    if (error) {
      return res.status(400).json({ success: false, error: 'payload invalido' });
    }

    const result = await messageProcessor.processIncoming(value.messages[0], area);
    res.json({ success: true, result });
  } catch (err) {
    next(err);
  }
});


