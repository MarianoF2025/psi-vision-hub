import { Env } from '../config/environment';
import { databaseService } from './DatabaseService';
import { whatsappService } from './WhatsAppService';
import { Area } from '../models/enums';
import { Logger } from '../utils/logger';

class CentralTelefonica {
  async enviarMensaje(conversacionId: string, mensaje: string, area: Area = Area.ADMINISTRACION) {
    const conversacion = await databaseService.updateConversacion(conversacionId, {});

    const bypass = conversacion.bypass_wsp4;
    const numeroEnvio = bypass ? conversacion.numero_origen || Env.whatsapp.numbers.ventas1 : Env.whatsapp.numbers.wsp4;
    const contexto = bypass ? 'ventas1' : 'wsp4';

    await whatsappService.sendTextMessage({
      to: conversacion.telefono,
      body: mensaje,
      fromContext: contexto as any,
    });

    await databaseService.saveMessage({
      conversacion_id: conversacionId,
      remitente: 'system',
      tipo: 'text',
      mensaje,
      metadata: {
        numero_envio: numeroEnvio,
        area,
      },
    });

    Logger.info('Mensaje del sistema guardado y enviado', {
      conversacionId,
      contexto,
      mensaje: mensaje.substring(0, 50),
    });
  }

  definirBypass(conversacionId: string, bypass: boolean) {
    return databaseService.updateConversacion(conversacionId, {
      bypass_wsp4: bypass,
      numero_activo: bypass ? Env.whatsapp.numbers.ventas1 : Env.whatsapp.numbers.wsp4,
    });
  }
}

export const centralTelefonica = new CentralTelefonica();


