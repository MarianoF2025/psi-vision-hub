// ===========================================
// ROUTER CONTROLLER - Controlador Principal
// Versión 3.4.0 - Soporte para mensajes citados (context)
// ===========================================
import { contactoService } from '../services/ContactoService';
import { conversacionService } from '../services/ConversacionService';
import { mensajeService } from '../services/MensajeService';
import { derivacionService } from '../services/DerivacionService';
import { ticketService } from '../services/TicketService';
import { auditLogService } from '../services/AuditLogService';
import { webhookService } from '../services/WebhookService';
import { menuProcessor } from './MenuProcessor';
import { RouterResponse, WhatsAppIncoming, Area } from '../types/database';
import { MENUS, generarTextoMenu } from '../config/menus';

// Configuración anti-loop
const ANTI_LOOP_MINUTOS = 15;

export class RouterController {

  /**
   * Procesar mensaje entrante de WhatsApp
   * Este es el punto de entrada principal del Router
   */
  async procesarMensaje(incoming: WhatsAppIncoming): Promise<RouterResponse> {
    const startTime = Date.now();

    try {
      console.log(`[Router] Procesando mensaje de ${incoming.telefono}: "${incoming.mensaje?.substring(0, 50)}..."`);

      // 1. Normalizar teléfono
      const telefonoNormalizado = contactoService.normalizarTelefono(incoming.telefono);

      // 2. Obtener o crear contacto
      const { contacto, esNuevo: contactoNuevo } = await contactoService.obtenerOCrear({
        telefono: telefonoNormalizado,
        nombre: incoming.nombre || null,
        origen: incoming.linea || 'whatsapp',
        utm_source: incoming.utm_source || null,
        utm_campaign: incoming.utm_campaign || null,
      });

      console.log(`[Router] Contacto ${contactoNuevo ? 'creado' : 'existente'}: ${contacto.id}`);

      // 3. Obtener o crear conversación
      const { conversacion, esNueva: conversacionNueva } = await conversacionService.obtenerOCrear({
        telefono: telefonoNormalizado,
        contacto_id: contacto.id,
        origen: incoming.linea || 'whatsapp',
        linea_origen: incoming.linea || 'wsp4',
        es_lead_meta: incoming.es_lead_meta || false,
        router_estado: 'menu_principal',
        menu_actual: 'principal',
      });

      console.log(`[Router] Conversación ${conversacionNueva ? 'creada' : 'existente'}: ${conversacion.id}`);

      // 4. Verificar duplicado de mensaje
      if (incoming.messageId) {
        const existeMensaje = await mensajeService.existePorWhatsAppId(incoming.messageId);
        if (existeMensaje) {
          console.log(`[Router] Mensaje duplicado ignorado: ${incoming.messageId}`);
          return {
            success: true,
            action: 'mensaje',
            mensajeRespuesta: undefined,
            conversacionId: conversacion.id,
            contactoId: contacto.id,
          };
        }
      }

      // 5. FIX v3.3.1: Si está DERIVADO → solo guardar mensaje, NO responder
      // El agente verá el mensaje en el CRM
      if (conversacion.router_estado === 'derivado' && conversacion.estado === 'derivada') {
        // Solo permitir MENU para volver al menú principal
        const quiereMenu = incoming.mensaje?.trim().toUpperCase() === 'MENU';

        if (!quiereMenu) {
          console.log(`[Router] Conversación derivada - guardando mensaje para agente: ${conversacion.id}`);

          // Solo guardar mensaje entrante (sin responder) - INCLUYE CONTEXT
          await mensajeService.guardarEntrante({
            conversacion_id: conversacion.id,
            mensaje: incoming.mensaje,
            whatsapp_message_id: incoming.messageId,
            whatsapp_context_id: incoming.contextMessageId,
            media_url: incoming.mediaUrl,
            media_type: incoming.mediaType,
          });

          // Actualizar último mensaje en conversación
          await conversacionService.actualizarUltimoMensaje(conversacion.id, incoming.mensaje);

          // NO enviar respuesta - el agente verá el mensaje en el CRM
          return {
            success: true,
            action: 'mensaje',
            yaEnviado: false,
            conversacionId: conversacion.id,
            contactoId: contacto.id,
          };
        }

        // Si quiere MENU, reactivar conversación para mostrar menú
        console.log(`[Router] Usuario solicita MENU - reactivando conversación`);
        await conversacionService.actualizar(conversacion.id, {
          estado: 'activa',
          router_estado: 'menu_principal',
          menu_actual: 'principal',
        });
      }

      // 6. Guardar mensaje entrante - INCLUYE CONTEXT
      await mensajeService.guardarEntrante({
        conversacion_id: conversacion.id,
        mensaje: incoming.mensaje,
        whatsapp_message_id: incoming.messageId,
        whatsapp_context_id: incoming.contextMessageId,
        media_url: incoming.mediaUrl,
        media_type: incoming.mediaType,
      });

      // Actualizar último mensaje en conversación
      await conversacionService.actualizarUltimoMensaje(conversacion.id, incoming.mensaje);

      // 7. Si es conversación nueva, mostrar menú inicial
      if (conversacionNueva) {
        const menuInicial = menuProcessor.generarMenuInicial();

        // Llamar webhook para enviar menú
        await this.enviarMensajeWebhook({
          telefono: telefonoNormalizado,
          mensaje: menuInicial.textoRespuesta!,
          conversacion_id: conversacion.id,
          tipo: 'menu',
          area: 'wsp4',
          metadata: {
            router_estado: 'menu_principal',
            opcion_seleccionada: undefined,
          },
        });

        return {
          success: true,
          action: 'menu',
          yaEnviado: true,
          conversacionId: conversacion.id,
          contactoId: contacto.id,
        };
      }

      // 8. Procesar mensaje según menú actual
      const resultado = menuProcessor.procesar({
        mensaje: incoming.mensaje,
        conversacion,
      });

      // 9. Ejecutar acción según resultado
      switch (resultado.accion) {
        case 'mostrar_menu':
        case 'mostrar_submenu':
          // Actualizar estado del router
          await conversacionService.actualizarEstadoRouter(
            conversacion.id,
            resultado.nuevoRouterEstado as any,
            resultado.menuId!,
            resultado.opcionSeleccionada
          );

          // Llamar webhook para enviar menú/submenú
          await this.enviarMensajeWebhook({
            telefono: telefonoNormalizado,
            mensaje: resultado.textoRespuesta!,
            conversacion_id: conversacion.id,
            tipo: resultado.accion === 'mostrar_submenu' ? 'submenu' : 'menu',
            area: conversacion.area || 'wsp4',
            metadata: {
              router_estado: resultado.nuevoRouterEstado,
              opcion_seleccionada: resultado.opcionSeleccionada,
            },
          });

          return {
            success: true,
            action: resultado.accion === 'mostrar_submenu' ? 'submenu' : 'menu',
            yaEnviado: true,
            conversacionId: conversacion.id,
            contactoId: contacto.id,
          };

        case 'derivar':
          return await this.ejecutarDerivacion(
            conversacion.id,
            contacto.id,
            telefonoNormalizado,
            resultado.derivacion!,
            resultado.opcionSeleccionada
          );

        case 'invalido':
        default:
          // Llamar webhook para enviar mensaje de error
          await this.enviarMensajeWebhook({
            telefono: telefonoNormalizado,
            mensaje: resultado.textoRespuesta!,
            conversacion_id: conversacion.id,
            tipo: 'error',
            area: conversacion.area || 'wsp4',
          });

          return {
            success: true,
            action: 'mensaje',
            yaEnviado: true,
            conversacionId: conversacion.id,
            contactoId: contacto.id,
          };
      }

    } catch (error) {
      console.error('[Router] Error procesando mensaje:', error);

      return {
        success: false,
        action: 'error',
        error: error instanceof Error ? error.message : 'Error desconocido',
      };
    } finally {
      const elapsed = Date.now() - startTime;
      console.log(`[Router] Mensaje procesado en ${elapsed}ms`);
    }
  }

  /**
   * Ejecutar derivación a otra área
   * VERSIÓN 3.3 - Llama webhook específico por área
   */
  private async ejecutarDerivacion(
    conversacionId: string,
    contactoId: string,
    telefono: string,
    derivacion: {
      area: Area;
      subetiqueta?: string;
      requiere_proxy: boolean;
      mensaje_cierre: string;
    },
    opcionSeleccionada?: string
  ): Promise<RouterResponse> {

    console.log(`[Router] Derivando a ${derivacion.area} con subetiqueta ${derivacion.subetiqueta}`);

    // 1. Actualizar conversación en Supabase
    await conversacionService.derivar(
      conversacionId,
      derivacion.area,
      derivacion.subetiqueta
    );

    // 2. Crear registro de derivación en Supabase
    const derivacionRecord = await derivacionService.crearDesdeRouter({
      conversacion_id: conversacionId,
      telefono,
      area_destino: derivacion.area,
      subetiqueta: derivacion.subetiqueta,
      opcion_menu: opcionSeleccionada,
    });

    // 3. Crear ticket en Supabase
    const ticket = await ticketService.crear({
      conversacion_id: conversacionId,
      telefono,
      area: derivacion.area,
      metadata: {
        subetiqueta: derivacion.subetiqueta,
        requiere_proxy: derivacion.requiere_proxy,
        derivacion_id: derivacionRecord.id,
      },
    });

    // 4. Registrar en audit_log
    await auditLogService.registrarDerivacion({
      conversacion_id: conversacionId,
      area_origen: 'wsp4',
      area_destino: derivacion.area,
      motivo: `Opción ${opcionSeleccionada} - ${derivacion.subetiqueta}`,
    });

    // 5. Enviar confirmación directo via WSP4
    const nombresArea: Record<string, string> = {
      'admin': 'Administración',
      'administracion': 'Administración',
      'alumnos': 'Alumnos',
      'ventas': 'Inscripciones',
      'comunidad': 'Comunidad PSI',
      'revisar': 'Atención General'
    };

    const nombreAreaLegible = nombresArea[derivacion.area.toLowerCase()] || derivacion.area;

    const mensajeConfirmacion = `✅ Tu consulta fue derivada a ${nombreAreaLegible}.

Un miembro de nuestro equipo te responderá a la brevedad.

Si necesitás cambiar de área, escribí MENU.`;

    const envioResult = await webhookService.enviarMensajeWSP4({
      telefono,
      mensaje: mensajeConfirmacion,
      conversacion_id: conversacionId,
      tipo: 'text',
      remitente: 'sistema',
    });

    if (!envioResult.success) {
      console.warn(`[Router] Error enviando confirmación: ${envioResult.error}`);
    } else {
      console.log(`[Router] ✅ Confirmación enviada: ${derivacion.area}`);
    }

    return {
      success: true,
      action: 'derivacion',
      yaEnviado: true,
      derivacion: {
        area: derivacion.area,
        subetiqueta: derivacion.subetiqueta,
        requiere_proxy: derivacion.requiere_proxy,
      },
      conversacionId,
      contactoId,
    };
  }

  /**
   * Método auxiliar para enviar mensaje vía webhook genérico (legacy)
   */
  private async enviarMensajeWebhook(params: {
    telefono: string;
    mensaje: string;
    conversacion_id: string;
    tipo: 'menu' | 'submenu' | 'derivacion' | 'error' | 'mensaje';
    area?: string;
    metadata?: {
      router_estado?: string;
      opcion_seleccionada?: string;
      subetiqueta?: string;
      requiere_proxy?: boolean;
    };
  }): Promise<void> {
    try {
      await webhookService.enviarMensaje({
        telefono: params.telefono,
        mensaje: params.mensaje,
        conversacion_id: params.conversacion_id,
        tipo: params.tipo,
        area: params.area || null,
        metadata: params.metadata,
      });
    } catch (error) {
      // No bloquear el flujo si falla el webhook
      console.error('[Router] Error llamando webhook (no bloqueante):', error);
    }
  }

  /**
   * Obtener estado de salud del router
   */
  async health(): Promise<{
    status: string;
    timestamp: string;
    menus: string[];
    webhookConfigurado: boolean;
    webhooksDerivacionConfigurados: boolean;
    version: string;
  }> {
    return {
      status: 'ok',
      timestamp: new Date().toISOString(),
      menus: Object.keys(MENUS),
      webhookConfigurado: webhookService.estaConfigurado(),
      webhooksDerivacionConfigurados: webhookService.tieneWebhooksDerivacion(),
      version: '3.4.0',
    };
  }
}

export const routerController = new RouterController();
