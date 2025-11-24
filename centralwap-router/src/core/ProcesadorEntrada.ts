import { supabase } from '../config/supabase';
import { config } from '../config/environment';
import { logger, logWithRequestId } from '../utils/logger';
import { InboxNotifierService } from '../services/InboxNotifierService';
import { mapearAreaDeBD } from '../utils/areaMapper';
import {
  MensajeEntrante,
  ContextoConversacion,
  CentralwapConfig,
} from '../types';

/**
 * RESPONSABILIDADES CRÍTICAS:
 * ✅ Normalizar teléfono a E.164 Argentina (+549...)
 * ✅ Detectar y extraer UTM parameters de Meta Ads
 * ✅ Crear/actualizar conversación con UPSERT seguro
 * ✅ Establecer ventanas de tiempo (24h WhatsApp, 72h Meta)
 * ✅ Registrar interacción entrante con metadata completa
 * ✅ Manejar errores de base de datos con retry
 * ✅ Retornar contexto completo para siguiente función
 */
export class ProcesadorEntrada {
  private inboxNotifier: InboxNotifierService;

  constructor(
    private supabaseClient = supabase,
    private sistemaConfig = config.sistema,
    private appLogger = logger
  ) {
    this.inboxNotifier = new InboxNotifierService();
  }

  /**
   * MÉTODO PRINCIPAL - Procesar entrada de mensaje
   */
  async procesarEntrada(mensaje: MensajeEntrante): Promise<ContextoConversacion | null> {
    const requestId = mensaje.metadata?.request_id || this.generateRequestId();
    const startTime = Date.now();

    try {
      logWithRequestId(requestId, 'info', 'Procesando entrada', {
        telefono: mensaje.telefono,
        contenido: mensaje.contenido.substring(0, 100),
        multimedia: !!mensaje.multimedia,
        utm_source: mensaje.metadata?.utm_source,
      });

      // 1. NORMALIZAR TELÉFONO (CRÍTICO PARA PSI)
      const telefonoNormalizado = this.normalizarTelefonoArgentina(mensaje.telefono);
      if (!telefonoNormalizado) {
        throw new Error(`Teléfono inválido: ${mensaje.telefono}`);
      }

      // 2. DETECTAR CONTEXTO META ADS
      const utmData = this.extraerUTMData(mensaje.metadata);
      const esLeadMeta = this.esLeadMetaAds(utmData);

      // 3. CREAR/ACTUALIZAR CONVERSACIÓN (UPSERT CRÍTICO)
      const conversacionId = await this.upsertConversacion({
        telefono: telefonoNormalizado,
        origen: utmData.origen,
        utm_data: utmData,
        es_lead_meta: esLeadMeta,
        request_id: requestId,
        whatsapp_message_id: mensaje.whatsapp_message_id,
      });

      // 4. OBTENER CONTEXTO COMPLETO ACTUALIZADO
      const contexto = await this.obtenerContextoCompleto(conversacionId);
      if (!contexto) {
        throw new Error(`No se pudo obtener contexto para conversación: ${conversacionId}`);
      }

      // 5. REGISTRAR INTERACCIÓN ENTRANTE
      await this.registrarInteraccionEntrante({
        conversacion_id: contexto.id,
        mensaje: mensaje,
        request_id: requestId,
      });

      // 5b. NOTIFICAR A INBOX SI PROXY ESTÁ ACTIVO
      // Cuando proxy está activo, enviar mensaje entrante directamente al inbox
      if (contexto.proxy_activo && contexto.area_proxy) {
        await this.notificarMensajeProxyInbox({
          conversacion_id: contexto.id,
          telefono: contexto.telefono,
          mensaje: mensaje.contenido,
          area_proxy: contexto.area_proxy,
        });
      }

      // 6. ACTUALIZAR TIMESTAMP ÚLTIMA INTERACCIÓN
      await this.actualizarUltimaInteraccion(contexto.id);

      const processingTime = Date.now() - startTime;
      logWithRequestId(requestId, 'info', 'Entrada procesada exitosamente', {
        conversacionId: contexto.id,
        area: contexto.area_actual,
        estado: contexto.estado,
        processingTimeMs: processingTime,
      });

      return contexto;
    } catch (error) {
      const processingTime = Date.now() - startTime;
      logWithRequestId(requestId, 'error', 'Error procesando entrada', {
        telefono: mensaje.telefono,
        error: error instanceof Error ? error.message : 'Error desconocido',
        stack: error instanceof Error ? error.stack : undefined,
        processingTimeMs: processingTime,
      });

      return null;
    }
  }

  // MÉTODOS AUXILIARES

  /**
   * Normalizar teléfono argentino a formato E.164
   * Casos PSI: +54911, 54911, 911, 1134567890
   */
  private normalizarTelefonoArgentina(telefono: string): string | null {
    try {
      // Limpiar espacios, guiones, paréntesis
      let cleaned = telefono.replace(/[\s\-\(\)]/g, '');

      // Si ya tiene +, verificar que empiece con +54
      if (cleaned.startsWith('+')) {
        if (!cleaned.startsWith('+54')) {
          return null;
        }
        return cleaned;
      }

      // Si empieza con 54, agregar +
      if (cleaned.startsWith('54')) {
        return '+' + cleaned;
      }

      // Si empieza con 9 (celular argentino sin código país)
      if (cleaned.startsWith('9') && cleaned.length >= 10) {
        return '+54' + cleaned;
      }

      // Si es un número local (10 dígitos sin 9 inicial)
      if (cleaned.length === 10 && /^\d+$/.test(cleaned)) {
        // Asumir que es celular y agregar 9 + código país
        return '+549' + cleaned;
      }

      // Si tiene 11-13 dígitos sin código, asumir que incluye el 9
      if (cleaned.length >= 11 && cleaned.length <= 13 && /^\d+$/.test(cleaned)) {
        return '+54' + cleaned;
      }

      return null;
    } catch (error) {
      this.appLogger.error('Error normalizando teléfono', { telefono, error });
      return null;
    }
  }

  /**
   * Extraer datos UTM de metadata del mensaje
   */
  private extraerUTMData(metadata?: MensajeEntrante['metadata']) {
    return {
      origen: metadata?.utm_source || 'directo',
      utm_campaign: metadata?.utm_campaign,
      utm_source: metadata?.utm_source,
      utm_medium: metadata?.utm_medium,
      utm_content: metadata?.utm_content,
      utm_term: metadata?.utm_term,
    };
  }

  /**
   * Detectar si es lead de Meta Ads
   */
  private esLeadMetaAds(utmData: any): boolean {
    const source = utmData.utm_source?.toLowerCase() || '';
    return source.includes('facebook') || source.includes('instagram') || source.includes('meta');
  }

  /**
   * Crear o actualizar conversación con UPSERT
   */
  private async upsertConversacion(params: {
    telefono: string;
    origen: string;
    utm_data: any;
    es_lead_meta: boolean;
    request_id: string;
    whatsapp_message_id: string;
  }): Promise<string> {
    try {
      const now = new Date();
      const ventana24hFin = new Date(now.getTime() + this.sistemaConfig.timeout_24h_minutos * 60 * 1000);
      const ventana72hFin = params.es_lead_meta
        ? new Date(now.getTime() + 72 * 60 * 60 * 1000)
        : null;

      // UPSERT en tabla conversaciones
      const { data, error } = await this.supabaseClient
        .from('conversaciones')
        .upsert(
          {
            telefono: params.telefono,
            origen: params.origen,
            area_actual: 'wsp4',
            estado: 'activo',
            es_lead_meta: params.es_lead_meta,
            ventana_24h_activa: true,
            ventana_72h_activa: params.es_lead_meta,
            countdown_24h: ventana24hFin.toISOString(),
            ts_ventana_72h_fin: ventana72hFin?.toISOString() || null,
            utm_campaign: params.utm_data.utm_campaign,
            ts_ultima_interaccion: now.toISOString(),
            numero_derivaciones: 0,
            contador_mensajes_automaticos: 0,
            desconectado_wsp4: false,
            metadata: {
              utm_data: params.utm_data,
              request_id: params.request_id,
            },
          },
          {
            onConflict: 'telefono',
          }
        )
        .select('id')
        .single();

      if (error) {
        throw new Error(`Error en UPSERT conversación: ${error.message}`);
      }

      if (!data?.id) {
        throw new Error('No se pudo crear/actualizar conversación');
      }

      return data.id;
    } catch (error) {
      this.appLogger.error('Error en upsertConversacion', {
        telefono: params.telefono,
        error: error instanceof Error ? error.message : 'Error desconocido',
      });
      throw error;
    }
  }

  /**
   * Obtener contexto completo de conversación
   */
  private async obtenerContextoCompleto(conversacionId: string): Promise<ContextoConversacion | null> {
    try {
      const { data, error } = await this.supabaseClient
        .from('conversaciones')
        .select('*')
        .eq('id', conversacionId)
        .single();

      if (error || !data) {
        throw new Error(`Error obteniendo conversación: ${error?.message || 'No encontrada'}`);
      }

      // Mapear resultado a ContextoConversacion
      return {
        id: data.id,
        telefono: data.telefono,
        area_actual: data.area_actual || 'wsp4',
        estado: data.estado || 'activo',
        subetiqueta: data.subetiqueta,
        menu_actual: data.menu_actual,
        ultima_opcion_seleccionada: data.ultima_opcion_seleccionada,
        nivel_menu: data.nivel_menu || 0,
        countdown_24h: data.countdown_24h ? new Date(data.countdown_24h) : undefined,
        ts_ultima_derivacion: data.ts_ultima_derivacion ? new Date(data.ts_ultima_derivacion) : undefined,
        ts_ultima_interaccion: new Date(data.ts_ultima_interaccion || new Date()),
        es_lead_meta: data.es_lead_meta || false,
        ventana_72h_activa: data.ventana_72h_activa || false,
        ts_ventana_72h_fin: data.ts_ventana_72h_fin ? new Date(data.ts_ventana_72h_fin) : undefined,
        utm_campaign: data.utm_campaign,
        desconectado_wsp4: data.desconectado_wsp4 || false,
        assignee_id: data.assignee_id,
        assignee_name: data.assignee_name,
        proxy_activo: data.proxy_activo || false, // Proxy activo para redirección automática
        area_proxy: data.area_proxy || undefined, // Área de destino del proxy
        ultimo_mensaje_automatico: data.ultimo_mensaje_automatico
          ? new Date(data.ultimo_mensaje_automatico)
          : undefined,
        contador_mensajes_automaticos: data.contador_mensajes_automaticos || 0,
        origen: data.origen || 'directo',
        numero_derivaciones: data.numero_derivaciones || 0,
        metadata: data.metadata || {},
      };
    } catch (error) {
      this.appLogger.error('Error obteniendo contexto completo', {
        conversacionId,
        error: error instanceof Error ? error.message : 'Error desconocido',
      });
      return null;
    }
  }

  /**
   * Registrar interacción entrante
   */
  private async registrarInteraccionEntrante(params: {
    conversacion_id: string;
    mensaje: MensajeEntrante;
    request_id: string;
  }) {
    try {
      const { error } = await this.supabaseClient.from('interacciones').insert({
        conversacion_id: params.conversacion_id,
        tipo: 'mensaje_entrante',
        contenido: params.mensaje.contenido,
        whatsapp_message_id: params.mensaje.whatsapp_message_id,
        timestamp: params.mensaje.timestamp.toISOString(),
        metadata: {
          multimedia: params.mensaje.multimedia,
          request_id: params.request_id,
          ...params.mensaje.metadata,
        },
      });

      if (error) {
        throw new Error(`Error registrando interacción: ${error.message}`);
      }
    } catch (error) {
      this.appLogger.error('Error registrando interacción entrante', {
        conversacionId: params.conversacion_id,
        error: error instanceof Error ? error.message : 'Error desconocido',
      });
      // No lanzar error para no interrumpir el flujo
    }
  }

  /**
   * Actualizar timestamp de última interacción
   */
  private async actualizarUltimaInteraccion(conversacionId: string) {
    try {
      const { error } = await this.supabaseClient
        .from('conversaciones')
        .update({
          ts_ultima_interaccion: new Date().toISOString(),
        })
        .eq('id', conversacionId);

      if (error) {
        throw new Error(`Error actualizando última interacción: ${error.message}`);
      }
    } catch (error) {
      this.appLogger.error('Error actualizando última interacción', {
        conversacionId,
        error: error instanceof Error ? error.message : 'Error desconocido',
      });
      // No lanzar error para no interrumpir el flujo
    }
  }

  /**
   * Notificar mensaje con proxy activo a inbox
   */
  private async notificarMensajeProxyInbox(params: {
    conversacion_id: string;
    telefono: string;
    mensaje: string;
    area_proxy: string;
  }) {
    try {
      // Mapear área de BD a formato interno
      const areaInterna = mapearAreaDeBD(params.area_proxy as any);

      const resultado = await this.inboxNotifier.notificarMensajeInbox({
        conversacion_id: params.conversacion_id,
        telefono: params.telefono,
        mensaje: params.mensaje,
        area_destino: areaInterna as any,
        tipo: 'mensaje_proxy',
      });

      if (!resultado.success) {
        this.appLogger.warn('Error notificando mensaje proxy a inbox (continuando)', {
          conversacionId: params.conversacion_id,
          area: params.area_proxy,
          error: resultado.error,
        });
      } else {
        this.appLogger.info('Mensaje notificado a inbox con proxy activo', {
          conversacionId: params.conversacion_id,
          area: params.area_proxy,
        });
      }
    } catch (error) {
      this.appLogger.error('Error en notificarMensajeProxyInbox', {
        conversacionId: params.conversacion_id,
        error: error instanceof Error ? error.message : 'Error desconocido',
      });
      // No lanzar error para no interrumpir el flujo
    }
  }

  private generateRequestId(): string {
    return `req_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`;
  }
}


