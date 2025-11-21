import { menuService } from './MenuService';
import { databaseService } from './DatabaseService';
import { centralTelefonica } from './CentralTelefonica';
import { Logger } from '../utils/logger';
import { Env } from '../config/environment';
import { AntiLoop } from '../utils/antiloop';
import { Area } from '../models/enums';
import { Conversacion, WebhookMessage } from '../models/types';

const antiLoop = new AntiLoop(Env.antiLoopMinutes);
const ROUTER_ESTADO_PRINCIPAL = 'PSI Principal';

class MessageProcessor {
  async processIncoming(message: WebhookMessage, area: Area = Area.PSI_PRINCIPAL) {
    const telefono = message.from;
    let conversacion = await databaseService.buscarOCrearConversacion(
      telefono,
      Env.whatsapp.numbers.wsp4,
      area
    );

    const esFlujoPrincipal = area === Area.PSI_PRINCIPAL;

    if (esFlujoPrincipal && conversacion.area !== Area.PSI_PRINCIPAL) {
      Logger.info('[MessageProcessor] Normalizando conversación a PSI Principal', {
        conversacionId: conversacion.id,
        areaAnterior: conversacion.area,
      });
      conversacion = await databaseService.updateConversacion(conversacion.id, {
        area: Area.PSI_PRINCIPAL,
        derivado_a: null,
        inbox_destino: 'psi_principal',
        inbox_id: null,
      });
    }

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

    const updates: Partial<Conversacion> = {
      router_estado: ROUTER_ESTADO_PRINCIPAL,
      submenu_actual: menuResponse.submenu,
    };
    if (esFlujoPrincipal) {
      updates.area = Area.PSI_PRINCIPAL;
      updates.derivado_a = null;
      updates.inbox_destino = 'psi_principal';
      updates.inbox_id = null;
    }
    let conversacionActualizada: Conversacion = conversacion;

    if (menuResponse.derivar && menuResponse.area) {
      Logger.info('[MessageProcessor] Iniciando derivación final', {
        conversacionId: conversacion.id,
        areaDestino: menuResponse.area,
        subetiqueta: menuResponse.subetiqueta,
      });
      conversacionActualizada = await this.crearDerivacion(
        conversacion,
        menuResponse.area,
        menuResponse.subetiqueta
      );
      Logger.info('[MessageProcessor] Derivación finalizada', {
        conversacionId: conversacion.id,
        ticketId: conversacionActualizada.ticket_id,
        areaDestino: conversacionActualizada.area,
      });
    } else {
      Logger.info('[MessageProcessor] Actualizando conversación sin derivación', {
        conversacionId: conversacion.id,
        updates,
        routerEstadoAnterior: conversacion.router_estado,
        routerEstadoNuevo: updates.router_estado,
      });
      conversacionActualizada = await databaseService.updateConversacion(conversacion.id, updates);
      Logger.info('[MessageProcessor] Conversación actualizada');
    }

    const areaEnvio = conversacionActualizada.area || Area.PSI_PRINCIPAL;
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

  private generarTicketId(): string {
    const correlativo = Math.floor(Math.random() * 1_000_000)
      .toString()
      .padStart(6, '0');
    return `PSI-2025-${correlativo}`;
  }

  private mapearInbox(area: Area): { nombre: string; id: number | null } {
    const map: Record<Area, { nombre: string; id: number | null }> = {
      [Area.PSI_PRINCIPAL]: { nombre: 'psi_principal', id: null },
      [Area.ADMINISTRACION]: { nombre: 'administracion', id: 79828 },
      [Area.ALUMNOS]: { nombre: 'alumnos', id: null },
      [Area.INSCRIPCIONES]: { nombre: 'inscripciones', id: null },
      [Area.COMUNIDAD]: { nombre: 'comunidad', id: null },
      [Area.VENTAS1]: { nombre: 'ventas1', id: 81935 },
    };

    return map[area] || { nombre: 'psi_principal', id: null };
  }

  private async crearDerivacion(
    conversacion: Conversacion,
    area: Area,
    subetiqueta?: string
  ): Promise<Conversacion> {
    const ticketId = this.generarTicketId();
    const countdownDate = new Date(Date.now() + 24 * 60 * 60 * 1000);
    const tsDerivacion = new Date();
    const inboxDestino = this.mapearInbox(area);

    Logger.info('[MessageProcessor] Generando datos de derivación', {
      conversacionId: conversacion.id,
      ticketId,
      countdown: countdownDate.toISOString(),
      area,
      subetiqueta,
      inboxDestino,
    });

    const conversacionActualizada = await databaseService.updateConversacion(conversacion.id, {
      area,
      router_estado: `derivado_${area}`,
      submenu_actual: null,
      ticket_id: ticketId,
      countdown_24h: countdownDate.toISOString(),
      ts_derivacion: tsDerivacion.toISOString(),
      derivado_a: area,
      inbox_destino: inboxDestino.nombre,
      inbox_id: inboxDestino.id,
    });

    await databaseService.registrarAuditLog({
      conversacion_id: conversacion.id,
      accion: 'derivacion',
      area_destino: area,
      ticket_id: ticketId,
      metadata: {
        countdown_24h: countdownDate.toISOString(),
        subetiqueta,
      },
    });

    return conversacionActualizada;
  }
}

export const messageProcessor = new MessageProcessor();

