import { Router } from 'express';
import { centralTelefonica } from '../services/CentralTelefonica';
import { databaseService } from '../services/DatabaseService';

export const apiRouter = Router();

apiRouter.post('/api/derivar', async (req, res, next) => {
  try {
    const { conversacionId, mensaje, area } = req.body;
    if (!conversacionId || !mensaje) {
      return res.status(400).json({ success: false, error: 'conversacionId y mensaje requeridos' });
    }
    await centralTelefonica.enviarMensaje(conversacionId, mensaje, area);
    res.json({ success: true });
  } catch (err) {
    next(err);
  }
});

apiRouter.post('/api/toggle-bypass', async (req, res, next) => {
  try {
    const { conversacionId, bypass } = req.body;
    if (typeof bypass !== 'boolean') {
      return res.status(400).json({ success: false, error: 'bypass debe ser boolean' });
    }
    const conversacion = await centralTelefonica.definirBypass(conversacionId, bypass);
    res.json({ success: true, conversacion });
  } catch (err) {
    next(err);
  }
});

apiRouter.get('/api/ventana/:conversationId', async (req, res, next) => {
  try {
    const conversacion = await databaseService.updateConversacion(req.params.conversationId, {});
    res.json({
      success: true,
      ventana_24h_activa: conversacion.ventana_24h_activa,
      ventana_24h_inicio: conversacion.ventana_24h_inicio,
      ventana_72h_activa: conversacion.ventana_72h_activa,
      ventana_72h_inicio: conversacion.ventana_72h_inicio,
    });
  } catch (err) {
    next(err);
  }
});






