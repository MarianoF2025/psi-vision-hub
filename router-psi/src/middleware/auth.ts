import { Request, Response, NextFunction } from 'express';
import { Env } from '../config/environment';
import { Logger } from '../utils/logger';

export function verifyWebhook(req: Request, res: Response, next: NextFunction) {
  if (req.method === 'GET') {
    const mode = req.query['hub.mode'];
    const token = req.query['hub.verify_token'];
    const challenge = req.query['hub.challenge'];

    if (mode === 'subscribe' && token === Env.verifyToken) {
      Logger.info('Verificación de webhook exitosa');
      return res.status(200).send(challenge);
    }

    Logger.warn('Intento de verificación inválido');
    return res.status(403).send('Forbidden');
  }

  next();
}
