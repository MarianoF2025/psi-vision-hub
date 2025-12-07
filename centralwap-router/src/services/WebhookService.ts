// ===========================================
// WEBHOOK SERVICE - Llamadas a n8n
// Versión 3.3 - Con webhooks específicos por área
// ===========================================
import { environment } from '../config/environment';
import { Area } from '../types/database';

export interface WebhookEnvioPayload {
  telefono: string;
  mensaje: string;
  conversacion_id: string;
  tipo: 'menu' | 'submenu' | 'derivacion' | 'error' | 'mensaje';
  area?: string | null;
  metadata?: {
    router_estado?: string;
    opcion_seleccionada?: string;
    subetiqueta?: string;
    requiere_proxy?: boolean;
  };
}

export interface WebhookDerivacionPayload {
  telefono: string;
  conversacion_id: string;
  area: Area;
  subetiqueta?: string;
  origen_inbox: string;
  opcion_menu?: string;
  timestamp: string;
}

export interface WebhookResponse {
  success: boolean;
  error?: string;
  messageId?: string;
  ticket_id?: string;
}

export class WebhookService {
  private webhookUrl: string | null;
  private webhooksDerivacion: Record<string, string | null>;
  private webhookEnvioWSP4: string | null;

  constructor() {
    // Legacy webhook
    this.webhookUrl = environment.WEBHOOK_ENVIO_MENSAJE;

    // Webhooks v3.3 por área
    this.webhooksDerivacion = {
      administracion: environment.N8N_WEBHOOK_DERIVACION_ADMIN,
      admin: environment.N8N_WEBHOOK_DERIVACION_ADMIN, // alias
      alumnos: environment.N8N_WEBHOOK_DERIVACION_ALUMNOS,
      ventas: environment.N8N_WEBHOOK_DERIVACION_VENTAS,
      comunidad: environment.N8N_WEBHOOK_DERIVACION_COMUNIDAD,
    };

    this.webhookEnvioWSP4 = environment.N8N_WEBHOOK_ENVIO_WSP4;

    // Log de configuración
    console.log('[WebhookService] ✅ Inicializado v3.3');
    console.log(`[WebhookService] - Legacy webhook: ${this.webhookUrl ? 'configurado' : 'no configurado'}`);
    console.log(`[WebhookService] - Derivación Admin: ${this.webhooksDerivacion.administracion ? 'configurado' : 'no configurado'}`);
    console.log(`[WebhookService] - Derivación Alumnos: ${this.webhooksDerivacion.alumnos ? 'configurado' : 'no configurado'}`);
    console.log(`[WebhookService] - Derivación Ventas: ${this.webhooksDerivacion.ventas ? 'configurado' : 'no configurado'}`);
    console.log(`[WebhookService] - Derivación Comunidad: ${this.webhooksDerivacion.comunidad ? 'configurado' : 'no configurado'}`);
    console.log(`[WebhookService] - Envío WSP4: ${this.webhookEnvioWSP4 ? 'configurado' : 'no configurado'}`);
  }

  /**
   * NUEVO v3.3: Llamar webhook de derivación específico por área
   * Router → n8n (derivacion/{area})
   */
  async llamarWebhookDerivacion(payload: WebhookDerivacionPayload): Promise<WebhookResponse> {
    const webhookUrl = this.webhooksDerivacion[payload.area];

    if (!webhookUrl) {
      console.error(`[WebhookService] ❌ No hay webhook configurado para área: ${payload.area}`);
      return {
        success: false,
        error: `Webhook no configurado para área: ${payload.area}`,
      };
    }

    try {
      console.log(`[WebhookService] 📤 Llamando webhook derivación: ${payload.area}`, {
        telefono: payload.telefono,
        conversacion_id: payload.conversacion_id,
        subetiqueta: payload.subetiqueta,
      });

      const response = await fetch(webhookUrl, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          telefono: payload.telefono,
          conversacion_id: payload.conversacion_id,
          area: payload.area,
          subetiqueta: payload.subetiqueta || null,
          origen_inbox: payload.origen_inbox,
          opcion_menu: payload.opcion_menu || null,
          timestamp: payload.timestamp,
        }),
        signal: AbortSignal.timeout(15000), // 15 segundos para derivaciones
      });

      if (!response.ok) {
        const errorText = await response.text();
        console.error(`[WebhookService] ❌ Error webhook derivación (${response.status}):`, errorText);
        return {
          success: false,
          error: `HTTP ${response.status}: ${errorText.substring(0, 100)}`,
        };
      }

      let responseData: any = {};
      try {
        responseData = await response.json();
      } catch {
        // Respuesta no es JSON
      }

      console.log(`[WebhookService] ✅ Derivación exitosa: ${payload.area}`);

      return {
        success: true,
        ticket_id: responseData.ticket_id || undefined,
      };

    } catch (error) {
      const errorMessage = error instanceof Error ? error.message : 'Error desconocido';
      
      if (error instanceof Error && error.name === 'AbortError') {
        console.error('[WebhookService] ⏱️ Timeout webhook derivación (15s)');
      } else {
        console.error('[WebhookService] ❌ Error webhook derivación:', errorMessage);
      }

      return {
        success: false,
        error: errorMessage,
      };
    }
  }

  /**
   * Enviar mensaje a través del webhook genérico (legacy)
   */
  async enviarMensaje(payload: WebhookEnvioPayload): Promise<WebhookResponse> {
    if (!this.webhookUrl) {
      console.warn('[WebhookService] Webhook legacy no configurado, omitiendo envío');
      return {
        success: false,
        error: 'Webhook no configurado',
      };
    }

    if (!payload.mensaje || payload.mensaje.trim() === '') {
      console.log('[WebhookService] Mensaje vacío, omitiendo envío');
      return {
        success: true,
        error: 'Mensaje vacío',
      };
    }

    try {
      console.log(`[WebhookService] Enviando mensaje (legacy): ${payload.tipo}`, {
        telefono: payload.telefono,
        conversacion_id: payload.conversacion_id,
        area: payload.area,
      });

      const response = await fetch(this.webhookUrl, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          telefono: payload.telefono,
          mensaje: payload.mensaje,
          conversacion_id: payload.conversacion_id,
          area: payload.area || 'wsp4',
          timestamp: new Date().toISOString(),
          from_router: true,
          yaGuardado: false,
          ...payload.metadata,
        }),
        signal: AbortSignal.timeout(10000),
      });

      if (!response.ok) {
        const errorText = await response.text();
        console.error(`[WebhookService] Error webhook (${response.status}):`, errorText);
        return {
          success: false,
          error: `HTTP ${response.status}: ${errorText.substring(0, 100)}`,
        };
      }

      let responseData: any = {};
      try {
        responseData = await response.json();
      } catch {
        // Respuesta no es JSON
      }

      console.log(`[WebhookService] ✅ Mensaje enviado: ${payload.tipo}`);

      return {
        success: true,
        messageId: responseData.messageId || responseData.id || undefined,
      };

    } catch (error) {
      const errorMessage = error instanceof Error ? error.message : 'Error desconocido';
      console.error('[WebhookService] ❌ Error envío:', errorMessage);
      return {
        success: false,
        error: errorMessage,
      };
    }
  }

  /**
   * Verificar si el webhook está configurado
   */
  estaConfigurado(): boolean {
    return this.webhookUrl !== null && this.webhookUrl.trim() !== '';
  }

  /**
   * Verificar si los webhooks v3.3 están configurados
   */
  tieneWebhooksDerivacion(): boolean {
    return Object.values(this.webhooksDerivacion).some(url => url !== null);
  }

  /**
   * Obtener la URL del webhook (sin exponer completamente)
   */
  
/**
   * NUEVO v3.3.1: Enviar mensaje directo via WSP4
   */
  async enviarMensajeWSP4(payload: {
    telefono: string;
    mensaje: string;
    conversacion_id: string;
    tipo?: string;
    remitente?: string;
  }): Promise<WebhookResponse> {
    if (!this.webhookEnvioWSP4) {
      console.warn('[WebhookService] Webhook WSP4 no configurado');
      return { success: false, error: 'Webhook WSP4 no configurado' };
    }

    try {
      console.log('[WebhookService] Enviando mensaje via WSP4', {
        telefono: payload.telefono,
        conversacion_id: payload.conversacion_id,
      });

      const response = await fetch(this.webhookEnvioWSP4, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          telefono: payload.telefono,
          mensaje: payload.mensaje,
          conversacion_id: payload.conversacion_id,
          tipo: payload.tipo || 'texto',
          remitente: payload.remitente || 'sistema',
          from_router: true,
          yaGuardado: false,
        }),
        signal: AbortSignal.timeout(10000),
      });

      if (!response.ok) {
        const errorText = await response.text();
        console.error('[WebhookService] Error WSP4:', response.status, errorText);
        return { success: false, error: 'HTTP ' + response.status };
      }

      console.log('[WebhookService] Mensaje enviado via WSP4');
      return { success: true };

    } catch (error) {
      const errorMessage = error instanceof Error ? error.message : 'Error';
      console.error('[WebhookService] Error WSP4:', errorMessage);
      return { success: false, error: errorMessage };
    }
  }

   getWebhookUrl(): string | null {
    if (!this.webhookUrl) return null;
    try {
      const url = new URL(this.webhookUrl);
      return `${url.protocol}//${url.host}${url.pathname.substring(0, 20)}...`;
    } catch {
      return 'url-invalida';
    }
  }
}

export const webhookService = new WebhookService();
