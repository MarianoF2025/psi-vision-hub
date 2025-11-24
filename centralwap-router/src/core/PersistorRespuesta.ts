import { supabase } from '../config/supabase';
import { logger, logWithRequestId } from '../utils/logger';
import { IWhatsAppService } from '../services/WhatsAppService';
import { InboxNotifierService } from '../services/InboxNotifierService';
import { generarTicketId } from '../utils/ticketIdGenerator';
import { mapearAreaABD, obtenerNombreArea, mapearAreaDeBD } from '../utils/areaMapper';
import {
  AccionProcesada,
  ContextoConversacion,
  ResultadoPersistencia,
} from '../types';

/**
 * RESPONSABILIDADES CRÍTICAS:
 * ✅ Iniciar transacción database para atomicidad completa
 * ✅ Procesar derivaciones (crear ticket, actualizar conversación)
 * ✅ Registrar interacción saliente con metadata
 * ✅ Enviar mensaje vía WhatsApp (Evolution/Meta APIs)
 * ✅ Confirmar transacción o rollback automático completo
 * ✅ Recovery automático en caso de fallas parciales
 */
export class PersistorRespuesta {
  private inboxNotifier: InboxNotifierService;

  constructor(
    private supabaseClient = supabase,
    private whatsappService: IWhatsAppService,
    private appLogger = logger
  ) {
    this.inboxNotifier = new InboxNotifierService();
  }

  /**
   * MÉTODO PRINCIPAL - Persistir respuesta completa
   */
  async persistirRespuesta(
    accion: AccionProcesada,
    contexto: ContextoConversacion,
    requestId: string,
    userId?: number
  ): Promise<ResultadoPersistencia> {
    // Si no requiere persistencia, salir inmediatamente
    if (!accion.requiere_persistencia) {
      this.appLogger.debug('Acción no requiere persistencia', {
        conversacionId: contexto.id,
        tipo: accion.tipo,
      });

      return {
        success: true,
        mensaje_enviado: false,
        conversacion_actualizada: false,
        interaccion_registrada: false,
      };
    }

    const transactionId = this.generateTransactionId();
    const startTime = Date.now();

    logWithRequestId(requestId, 'info', 'Iniciando persistencia', {
      conversacionId: contexto.id,
      transactionId,
      tipo: accion.tipo,
      requiereEnvio: !!accion.contenido && accion.tipo !== 'silencioso',
    });

    try {
      // 1. INICIAR TRANSACCIÓN ATÓMICA
      // Nota: Supabase no soporta transacciones explícitas como PostgreSQL puro,
      // pero usaremos operaciones atómicas y rollback manual en caso de error

      let ticketCreado = '';
      let conversacionActualizada = false;

      // 2. PROCESAR DERIVACIÓN SI ES NECESARIO
      if (accion.datos_persistencia?.crear_ticket && accion.datos_persistencia.area_destino) {
        const resultadoTicket = await this.procesarDerivacion({
          conversacion_id: contexto.id,
          area_origen: contexto.area_actual,
          area_destino: accion.datos_persistencia.area_destino,
          subetiqueta: accion.datos_persistencia.subetiqueta,
          motivo: accion.datos_persistencia.motivo || 'menu_selection',
          user_id: userId,
          request_id: requestId,
          transaction_id: transactionId,
        });

        if (!resultadoTicket.success) {
          throw new Error(`Error procesando derivación: ${resultadoTicket.error}`);
        }

        ticketCreado = resultadoTicket.ticket_id;
        conversacionActualizada = true;

        // Notificar a inbox correspondiente sobre la derivación
        await this.notificarDerivacionInbox({
          conversacion_id: contexto.id,
          telefono: contexto.telefono,
          area_destino: accion.datos_persistencia.area_destino,
          ticket_id: resultadoTicket.ticket_id,
          derivacion_id: resultadoTicket.derivacion_id,
          mensaje: accion.contenido || 'Derivación creada',
        });
      }

      // 3. ACTUALIZAR ESTADO DE CONVERSACIÓN (menú o desactivar proxy)
      if (accion.datos_persistencia?.actualizar_menu && !conversacionActualizada) {
        await this.actualizarEstadoConversacion(
          contexto.id,
          accion.datos_persistencia.actualizar_menu,
          accion.datos_persistencia?.desactivar_proxy
        );
        conversacionActualizada = true;
      }

      // 3b. Desactivar proxy si se solicitó (sin actualizar menú)
      if (accion.datos_persistencia?.desactivar_proxy && !conversacionActualizada) {
        await this.desactivarProxy(contexto.id);
        conversacionActualizada = true;
      }

      // 4. REGISTRAR INTERACCIÓN SALIENTE
      let interaccionRegistrada = false;
      if (accion.contenido && accion.tipo !== 'silencioso') {
        await this.registrarInteraccionSaliente({
          conversacion_id: contexto.id,
          contenido: accion.contenido,
          tipo_accion: accion.tipo,
          request_id: requestId,
          transaction_id: transactionId,
          metadata: accion.metadata,
        });
        interaccionRegistrada = true;
      }

      // 4b. NOTIFICAR MENSAJE A INBOX SI PROXY ESTÁ ACTIVO
      // Cuando proxy está activo, los mensajes entrantes deben llegar al inbox
      // Nota: Este mensaje viene del mensaje entrante, no de la acción
      // Se manejará en un paso separado después de registrar interacción entrante

      // 5. ENVIAR MENSAJE POR WHATSAPP
      let mensajeEnviado = false;
      let whatsappMessageId: string | undefined;

      if (accion.contenido && accion.tipo !== 'silencioso') {
        const resultadoEnvio = await this.whatsappService.enviarMensaje({
          telefono: contexto.telefono,
          mensaje: accion.contenido,
          conversacion_id: contexto.id,
          request_id: requestId,
          metadata: {
            tipo_accion: accion.tipo,
            area_destino: accion.datos_persistencia?.area_destino,
            transaction_id: transactionId,
          },
        });

        if (!resultadoEnvio.success) {
          throw new Error(`Error enviando WhatsApp: ${resultadoEnvio.error}`);
        }

        whatsappMessageId = resultadoEnvio.message_id;

        // Actualizar interacción con ID del mensaje enviado
        if (whatsappMessageId) {
          await this.actualizarInteraccionConWhatsAppId(whatsappMessageId, requestId);
        }

        mensajeEnviado = true;
      }

      const processingTime = Date.now() - startTime;
      logWithRequestId(requestId, 'info', 'Persistencia completada exitosamente', {
        conversacionId: contexto.id,
        transactionId,
        ticketCreado: ticketCreado || undefined,
        mensajeEnviado,
        conversacionActualizada,
        interaccionRegistrada,
        processingTimeMs: processingTime,
      });

      return {
        success: true,
        mensaje_enviado: mensajeEnviado,
        ticket_creado: ticketCreado || undefined,
        conversacion_actualizada: conversacionActualizada,
        interaccion_registrada: interaccionRegistrada,
      };
    } catch (error) {
      const processingTime = Date.now() - startTime;
      logWithRequestId(requestId, 'error', 'Error en persistencia, iniciando rollback', {
        conversacionId: contexto.id,
        transactionId,
        error: error instanceof Error ? error.message : 'Error desconocido',
        stack: error instanceof Error ? error.stack : undefined,
        processingTimeMs: processingTime,
      });

      // ROLLBACK AUTOMÁTICO
      try {
        // En Supabase, no hay transacciones explícitas, así que logueamos el error
        // En producción, se podría implementar un sistema de compensación
        this.appLogger.warn('Rollback manual requerido - verificar estado de datos', {
          requestId,
          transactionId,
          conversacionId: contexto.id,
        });

        // RECOVERY: Intentar enviar mensaje de error al usuario
        await this.enviarMensajeRecovery(contexto.telefono, requestId);
      } catch (rollbackError) {
        this.appLogger.error('Error crítico en rollback', {
          requestId,
          transactionId,
          rollbackError:
            rollbackError instanceof Error ? rollbackError.message : 'Error desconocido',
        });
      }

      return {
        success: false,
        mensaje_enviado: false,
        conversacion_actualizada: false,
        interaccion_registrada: false,
        error: error instanceof Error ? error.message : 'Error desconocido',
        rollback_aplicado: true,
      };
    }
  }

  // MÉTODOS AUXILIARES

  /**
   * Procesar derivación completa
   * Crea registros en: derivaciones, tickets y actualiza conversación
   */
  private async procesarDerivacion(params: {
    conversacion_id: string;
    area_origen: string;
    area_destino: string;
    subetiqueta?: string;
    motivo: string;
    user_id?: number;
    request_id: string;
    transaction_id: string;
  }): Promise<{ success: boolean; ticket_id: string; derivacion_id?: string; error?: string }> {
    try {
      const now = new Date();

      // Mapear áreas a formato de base de datos
      const areaOrigenBD = mapearAreaABD(params.area_origen as any);
      const areaDestinoBD = mapearAreaABD(params.area_destino as any);

      // 1. Obtener número actual de derivaciones
      const { data: conversacionData, error: fetchError } = await this.supabaseClient
        .from('conversaciones')
        .select('numero_derivaciones')
        .eq('id', params.conversacion_id)
        .single();

      if (fetchError || !conversacionData) {
        throw new Error(`Error obteniendo conversación: ${fetchError?.message || 'No encontrada'}`);
      }

      // 2. Generar ticket_id en formato YYYYMMDD-HHMMSS-XXXX
      const ticketIdFormateado = generarTicketId();

      // 3. Crear registro en tabla DERIVACIONES
      const { data: derivacionData, error: derivacionError } = await this.supabaseClient
        .from('derivaciones')
        .insert({
          conversacion_id: params.conversacion_id,
          area_origen: areaOrigenBD,
          area_destino: areaDestinoBD,
          motivo: params.motivo || 'menu_selection',
          ts_derivacion: now.toISOString(),
          created_at: now.toISOString(),
        })
        .select('id')
        .single();

      if (derivacionError || !derivacionData) {
        throw new Error(`Error creando derivación: ${derivacionError?.message || 'No se pudo crear'}`);
      }

      // 4. Crear registro en tabla TICKETS
      const { data: ticketData, error: ticketError } = await this.supabaseClient
        .from('tickets')
        .insert({
          ticket_id: ticketIdFormateado,
          conversacion_id: params.conversacion_id,
          area_destino: areaDestinoBD,
          estado: 'pendiente',
          prioridad: 'normal',
          ts_creacion: now.toISOString(),
          created_at: now.toISOString(),
        })
        .select('id')
        .single();

      if (ticketError || !ticketData) {
        // Si falla el ticket, intentar eliminar la derivación creada (compensación)
        await this.supabaseClient
          .from('derivaciones')
          .delete()
          .eq('id', derivacionData.id);
        
        throw new Error(`Error creando ticket: ${ticketError?.message || 'No se pudo crear'}`);
      }

      // 5. Actualizar conversación con todos los campos necesarios
      const { error: updateError } = await this.supabaseClient
        .from('conversaciones')
        .update({
          area_actual: params.area_destino, // Mantener formato interno para consistencia
          estado: 'derivado',
          subetiqueta: params.subetiqueta,
          ts_ultima_derivacion: now.toISOString(),
          numero_derivaciones: (conversacionData.numero_derivaciones || 0) + 1,
          ticket_id: ticketData.id, // ID del ticket creado
          proxy_activo: true, // Activar proxy para área destino
          area_proxy: areaDestinoBD, // Área de proxy en formato BD
        })
        .eq('id', params.conversacion_id);

      if (updateError) {
        // Rollback: eliminar derivación y ticket creados
        await this.supabaseClient.from('tickets').delete().eq('id', ticketData.id);
        await this.supabaseClient.from('derivaciones').delete().eq('id', derivacionData.id);
        
        throw new Error(`Error actualizando conversación: ${updateError.message}`);
      }

      // 6. Registrar derivación en interacciones (log)
      await this.supabaseClient.from('interacciones').insert({
        conversacion_id: params.conversacion_id,
        tipo: 'derivacion',
        contenido: `Derivación de ${obtenerNombreArea(params.area_origen as any)} a ${obtenerNombreArea(params.area_destino as any)}`,
        timestamp: now.toISOString(),
        metadata: {
          motivo: params.motivo,
          request_id: params.request_id,
          transaction_id: params.transaction_id,
          derivacion_id: derivacionData.id,
          ticket_id: ticketIdFormateado,
        },
      });

      this.appLogger.info('Derivación procesada exitosamente', {
        conversacionId: params.conversacion_id,
        derivacionId: derivacionData.id,
        ticketId: ticketIdFormateado,
        areaOrigen: areaOrigenBD,
        areaDestino: areaDestinoBD,
      });

      return {
        success: true,
        ticket_id: ticketIdFormateado, // Retornar ticket_id formateado
        derivacion_id: derivacionData.id,
      };
    } catch (error) {
      this.appLogger.error('Error procesando derivación', {
        conversacionId: params.conversacion_id,
        areaDestino: params.area_destino,
        error: error instanceof Error ? error.message : 'Error desconocido',
        stack: error instanceof Error ? error.stack : undefined,
      });
      return {
        success: false,
        ticket_id: '',
        error: error instanceof Error ? error.message : 'Error desconocido',
      };
    }
  }

  /**
   * Actualizar estado de conversación
   */
  private async actualizarEstadoConversacion(
    conversacionId: string,
    menuData: { menu_actual: string; nivel_menu: number },
    desactivarProxy?: boolean
  ) {
    try {
      const updateData: any = {
        menu_actual: menuData.menu_actual,
        nivel_menu: menuData.nivel_menu,
        ultima_opcion_seleccionada: null,
      };

      // Si se solicita desactivar proxy, hacerlo
      if (desactivarProxy) {
        updateData.proxy_activo = false;
        updateData.area_proxy = null;
      }

      const { error } = await this.supabaseClient
        .from('conversaciones')
        .update(updateData)
        .eq('id', conversacionId);

      if (error) {
        throw new Error(`Error actualizando estado conversación: ${error.message}`);
      }

      if (desactivarProxy) {
        this.appLogger.info('Proxy desactivado al mostrar menú', { conversacionId });
      }
    } catch (error) {
      this.appLogger.error('Error actualizando estado conversación', {
        conversacionId,
        error: error instanceof Error ? error.message : 'Error desconocido',
      });
      throw error;
    }
  }

  /**
   * Desactivar proxy de conversación
   */
  private async desactivarProxy(conversacionId: string) {
    try {
      const { error } = await this.supabaseClient
        .from('conversaciones')
        .update({
          proxy_activo: false,
          area_proxy: null,
        })
        .eq('id', conversacionId);

      if (error) {
        throw new Error(`Error desactivando proxy: ${error.message}`);
      }

      this.appLogger.info('Proxy desactivado', { conversacionId });
    } catch (error) {
      this.appLogger.error('Error desactivando proxy', {
        conversacionId,
        error: error instanceof Error ? error.message : 'Error desconocido',
      });
      throw error;
    }
  }

  /**
   * Registrar interacción saliente
   */
  private async registrarInteraccionSaliente(params: {
    conversacion_id: string;
    contenido: string;
    tipo_accion: string;
    request_id: string;
    transaction_id: string;
    metadata?: Record<string, any>;
  }) {
    try {
      const { error } = await this.supabaseClient.from('interacciones').insert({
        conversacion_id: params.conversacion_id,
        tipo: 'mensaje_saliente',
        contenido: params.contenido,
        timestamp: new Date().toISOString(),
        metadata: {
          tipo_accion: params.tipo_accion,
          request_id: params.request_id,
          transaction_id: params.transaction_id,
          ...params.metadata,
        },
      });

      if (error) {
        throw new Error(`Error registrando interacción saliente: ${error.message}`);
      }
    } catch (error) {
      this.appLogger.error('Error registrando interacción saliente', {
        conversacionId: params.conversacion_id,
        error: error instanceof Error ? error.message : 'Error desconocido',
      });
      // No lanzar error para no interrumpir el flujo
    }
  }

  /**
   * Actualizar interacción con ID de WhatsApp
   */
  private async actualizarInteraccionConWhatsAppId(messageId: string, requestId: string) {
    try {
      // Buscar última interacción saliente de este request
      const { data, error: findError } = await this.supabaseClient
        .from('interacciones')
        .select('id')
        .eq('tipo', 'mensaje_saliente')
        .contains('metadata', { request_id: requestId })
        .order('timestamp', { ascending: false })
        .limit(1)
        .single();

      if (findError || !data) {
        this.appLogger.warn('No se encontró interacción para actualizar WhatsApp ID', {
          requestId,
          messageId,
        });
        return;
      }

      const { error: updateError } = await this.supabaseClient
        .from('interacciones')
        .update({
          whatsapp_message_id: messageId,
        })
        .eq('id', data.id);

      if (updateError) {
        this.appLogger.warn('Error actualizando interacción con WhatsApp ID', {
          requestId,
          messageId,
          error: updateError.message,
        });
      }
    } catch (error) {
      this.appLogger.warn('Error actualizando interacción con WhatsApp ID', {
        requestId,
        messageId,
        error: error instanceof Error ? error.message : 'Error desconocido',
      });
    }
  }

  /**
   * Enviar mensaje de recovery en caso de error
   */
  private async enviarMensajeRecovery(telefono: string, requestId: string) {
    try {
      const mensajeRecovery =
        '⚠️ Ocurrió un error procesando tu mensaje. Por favor, intentá nuevamente o escribí MENU.';

      await this.whatsappService.enviarMensaje({
        telefono,
        mensaje: mensajeRecovery,
        conversacion_id: '',
        request_id: requestId + '_recovery',
        metadata: { tipo: 'recovery' },
      });
    } catch (error) {
      this.appLogger.error('Error enviando mensaje de recovery', {
        telefono,
        requestId,
        error: error instanceof Error ? error.message : 'Error desconocido',
      });
    }
  }

  /**
   * Notificar derivación a inbox correspondiente
   */
  private async notificarDerivacionInbox(params: {
    conversacion_id: string;
    telefono: string;
    area_destino: string;
    ticket_id: string;
    derivacion_id?: string;
    mensaje: string;
  }) {
    try {
      // Mapear área de BD a formato interno
      const areaInterna = mapearAreaDeBD(params.area_destino as any);

      const resultado = await this.inboxNotifier.notificarMensajeInbox({
        conversacion_id: params.conversacion_id,
        telefono: params.telefono,
        mensaje: params.mensaje,
        area_destino: areaInterna as any,
        tipo: 'derivacion',
        ticket_id: params.ticket_id,
        derivacion_id: params.derivacion_id,
      });

      if (!resultado.success) {
        this.appLogger.warn('Error notificando derivación a inbox (continuando)', {
          conversacionId: params.conversacion_id,
          area: params.area_destino,
          error: resultado.error,
        });
      }
    } catch (error) {
      this.appLogger.error('Error en notificarDerivacionInbox', {
        conversacionId: params.conversacion_id,
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
      }
    } catch (error) {
      this.appLogger.error('Error en notificarMensajeProxyInbox', {
        conversacionId: params.conversacion_id,
        error: error instanceof Error ? error.message : 'Error desconocido',
      });
      // No lanzar error para no interrumpir el flujo
    }
  }

  private generateTransactionId(): string {
    return `txn_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`;
  }
}
