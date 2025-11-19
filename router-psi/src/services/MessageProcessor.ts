import { menuService } from './MenuService';
import { databaseService } from './DatabaseService';
import { centralTelefonica } from './CentralTelefonica';
import { Logger } from '../utils/logger';
import { Env } from '../config/environment';
import { AntiLoop } from '../utils/antiloop';
import { Area } from '../models/enums';
import { WebhookMessage } from '../models/types';

const antiLoop = new AntiLoop(Env.antiLoopMinutes);

class MessageProcessor {
  async processIncoming(message: WebhookMessage, area: Area = Area.ADMINISTRACION) {
    const telefono = message.from;
    const conversacion = await databaseService.buscarOCrearConversacion(
      telefono,
      Env.whatsapp.numbers.wsp4,
      area
    );

    if (antiLoop.isWithinWindow(conversacion.id)) {
      Logger.warn('Mensaje dentro de ventana anti-loop, se ignora', { conversacionId: conversacion.id });
      return { ignored: true };
    }

    antiLoop.touch(conversacion.id);

    const texto = message.text?.body || message.interactive?.button_reply?.title || '';
    
    // 1. Guardar mensaje del usuario ANTES de procesar
    await databaseService.saveMessage({
      conversacion_id: conversacion.id,
      remitente: telefono,
      tipo: message.type,
      mensaje: texto,
      telefono: telefono, // Agregar teléfono explícitamente
      timestamp: new Date(parseInt(message.timestamp) * 1000).toISOString(), // Convertir timestamp de WhatsApp
      whatsapp_message_id: message.id,
      metadata: {
        interactive: message.interactive,
      },
    });
    Logger.info('Mensaje del usuario guardado en Supabase', {
      conversacionId: conversacion.id,
      telefono,
      texto: texto.substring(0, 50),
    });

    // 2. Procesar lógica de menú
    const menuResponse = menuService.procesarEntrada(texto);

    const updates = {
      router_estado: menuResponse.submenu || conversacion.router_estado,
      submenu_actual: menuResponse.submenu,
      area: menuResponse.area || conversacion.area,
    };

    await databaseService.updateConversacion(conversacion.id, updates);

    if (menuResponse.derivar && menuResponse.area) {
      await centralTelefonica.enviarMensaje(
        conversacion.id,
        menuResponse.reply,
        menuResponse.area
      );
    } else {
      await centralTelefonica.enviarMensaje(
        conversacion.id,
        menuResponse.reply,
        menuResponse.area || conversacion.area || Area.ADMINISTRACION
      );
    }

    return {
      conversacionId: conversacion.id,
      menuResponse,
    };
  }
}

export const messageProcessor = new MessageProcessor();

