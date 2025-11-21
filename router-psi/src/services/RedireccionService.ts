import { Logger } from '../utils/logger';
import { Env } from '../config/environment';
import { databaseService } from './DatabaseService';
import { Area } from '../models/enums';

export interface RedireccionPayload {
  telefono: string;
  mensaje: string;
  inboxOrigen: Area;
  numeroDestino?: string;
}

class RedireccionService {
  buildLink(texto: string) {
    const encoded = encodeURIComponent(texto);
    return `https://wa.me/${Env.whatsapp.numbers.wsp4}?text=${encoded}`;
  }

  async redireccionSuave(payload: RedireccionPayload) {
    const link = this.buildLink('Hola, quiero seguir por el numero principal');
    const texto = [
      'Hola! Te atendemos por aquí, pero para una mejor experiencia usá nuestro número principal:',
      link,
      'Desde ahí accedes a todas nuestras áreas con menú completo.',
      `¿En qué podemos ayudarte con ${payload.inboxOrigen}?`,
    ].join('\n\n');

    Logger.info('Redireccion suave generada', { telefono: payload.telefono });
    return texto;
  }

  async redireccionFuerte(payload: RedireccionPayload) {
    const link = this.buildLink('Hola, ya tengo una conversacion');
    const texto = [
      'Hola! Vemos que ya tenes una conversación activa con nosotros.',
      'Para brindarte la mejor atención, continua por nuestro número principal:',
      link,
      'Te esperamos!',
    ].join('\n\n');

    Logger.info('Redireccion fuerte generada', { telefono: payload.telefono });
    return texto;
  }

  async manejarRedireccion(payload: RedireccionPayload) {
    const conversacion = await databaseService.buscarOCrearConversacion(
      payload.telefono,
      payload.numeroDestino || Env.whatsapp.numbers.wsp4,
      payload.inboxOrigen
    );

    const link = this.buildLink(payload.mensaje || 'Hola');

    return {
      conversacion,
      link,
    };
  }
}

export const redireccionService = new RedireccionService();





