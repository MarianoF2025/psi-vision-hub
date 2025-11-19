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
    Logger.info('[MessageProcessor] Iniciando procesamiento', {
      conversacionId: conversacion.id,
      telefono,
      texto,
      textoLength: texto.length,
      messageType: message.type,
    });
    
    // 1. Guardar mensaje del usuario ANTES de procesar
    Logger.info('[MessageProcessor] Guardando mensaje del usuario en Supabase');
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
    Logger.info('[MessageProcessor] Mensaje del usuario guardado en Supabase', {
      conversacionId: conversacion.id,
      telefono,
      texto: texto.substring(0, 50),
    });

    // 2. Procesar lógica de menú
    Logger.info('[MessageProcessor] Procesando entrada con MenuService', { texto });
    const menuResponse = menuService.procesarEntrada(texto);
    Logger.info('[MessageProcessor] Respuesta del menú obtenida', {
      replyLength: menuResponse.reply?.length || 0,
      submenu: menuResponse.submenu,
      area: menuResponse.area,
      derivar: menuResponse.derivar,
      replyPreview: menuResponse.reply?.substring(0, 100),
    });

    const updates = {
      router_estado: menuResponse.submenu || conversacion.router_estado,
      submenu_actual: menuResponse.submenu,
      area: menuResponse.area || conversacion.area,
    };
    Logger.info('[MessageProcessor] Actualizando conversación', {
      conversacionId: conversacion.id,
      updates,
      routerEstadoAnterior: conversacion.router_estado,
      routerEstadoNuevo: updates.router_estado,
    });

    await databaseService.updateConversacion(conversacion.id, updates);
    Logger.info('[MessageProcessor] Conversación actualizada');

    const areaEnvio = menuResponse.area || conversacion.area || Area.ADMINISTRACION;
    Logger.info('[MessageProcessor] Enviando mensaje', {
      conversacionId: conversacion.id,
      areaEnvio,
      derivar: menuResponse.derivar,
      replyLength: menuResponse.reply?.length || 0,
    });

    if (menuResponse.derivar && menuResponse.area) {
      Logger.info('[MessageProcessor] Enviando con derivación a área específica', { area: menuResponse.area });
      await centralTelefonica.enviarMensaje(
        conversacion.id,
        menuResponse.reply,
        menuResponse.area
      );
    } else {
      Logger.info('[MessageProcessor] Enviando sin derivación', { areaEnvio });
      await centralTelefonica.enviarMensaje(
        conversacion.id,
        menuResponse.reply,
        areaEnvio
      );
    }
    Logger.info('[MessageProcessor] Mensaje enviado exitosamente');

    return {
      conversacionId: conversacion.id,
      menuResponse,
    };
  }
}

export const messageProcessor = new MessageProcessor();

