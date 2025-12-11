// ===========================================
// WEBHOOK SERVICE - Llamadas a n8n
// Versión 3.4 - Con webhooks envío por línea secundaria
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
  private webhooksEnvio: Record<string, string | null>;

  constructor() {
    // Legacy webhook
    this.webhookUrl = environment.WEBHOOK_ENVIO_MENSAJE;

    // Webhooks v3.3 por área (derivación)
    this.webhooksDerivacion = {
      administracion: environment.N8N_WEBHOOK_DERIVACION_ADMIN,
      admin: environment.N8N_WEBHOOK_DERIVACION_ADMIN,
      alumnos: environment.N8N_WEBHOOK_DERIVACION_ALUMNOS,
      ventas: environment.N8N_WEBHOOK_DERIVACION_VENTAS,
      comunidad: environment.N8N_WEBHOOK_DERIVACION_COMUNIDAD,
    };

    this.webhookEnvioWSP4 = environment.N8N_WEBHOOK_ENVIO_WSP4;

    // Webhooks v3.4 envío por línea
    this.webhooksEnvio = {
      administracion: environment.N8N_WEBHOOK_ENVIO_ADMIN,
      admin: environment.N8N_WEBHOOK_ENVIO_ADMIN,
      alumnos: environment.N8N_WEBHOOK_ENVIO_ALUMNOS,
      comunidad: environment.N8N_WEBHOOK_ENVIO_COMUNIDAD,
      ventas: environment.N8N_WEBHOOK_ENVIO_VENTAS,
      wsp4: environment.N8N_WEBHOOK_ENVIO_WSP4,
    };

    console.log('[WebhookService] ✅ Inicializado v3.4');
    console.log(`[WebhookService] - Derivación Admin: ${this.webhooksDerivacion.administracion ? 'OK' : 'NO'}`);
    console.log(`[WebhookService] - Derivación Alumnos: ${this.webhooksDerivacion.alumnos ? 'OK' : 'NO'}`);
    console.log(`[WebhookService] - Derivación Ventas: ${this.webhooksDerivacion.ventas ? 'OK' : 'NO'}`);
    console.log(`[WebhookService] - Derivación Comunidad: ${this.webhooksDerivacion.comunidad ? 'OK' : 'NO'}`);
    console.log(`[WebhookService] - Envío WSP4: ${this.webhookEnvioWSP4 ? 'OK' : 'NO'}`);
    console.log(`[WebhookService] - Envío Admin: ${this.webhooksEnvio.administracion ? 'OK' : 'NO'}`);
    console.log(`[WebhookService] - Envío Alumnos: ${this.webhooksEnvio.alumnos ? 'OK' : 'NO'}`);
    console.log(`[WebhookService] - Envío Comunidad: ${this.webhooksEnvio.comunidad ? 'OK' : 'NO'}`);
    console.log(`[WebhookService] - Envío Ventas: ${this.webhooksEnvio.ventas ? 'OK' : 'NO'}`);
  }

  /**
   * Llamar webhook de derivación específico por área
   */
  async llamarWebhookDerivacion(payload: WebhookDerivacionPayload): Promise<WebhookResponse> {
    const webhookUrl = this.webhooksDerivacion[payload.area];

    if (!webhookUrl) {
      console.error(`[WebhookService] No hay webhook derivación para: ${payload.area}`);
      return { success: false, error: `Webhook no configurado para área: ${payload.area}` };
    }

    try {
      console.log(`[WebhookService] Llamando webhook derivación: ${payload.area}`, {
        telefono: payload.telefono,
        conversacion_id: payload.conversacion_id,
      });

      const response = await fetch(webhookUrl, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          telefono: payload.telefono,
          conversacion_id: payload.conversacion_id,
          area: payload.area,
          subetiqueta: payload.subetiqueta || null,
          origen_inbox: payload.origen_inbox,
          opcion_menu: payload.opcion_menu || null,
          timestamp: payload.timestamp,
        }),
        signal: AbortSignal.timeout(15000),
      });

      if (!response.ok) {
        const errorText = await response.text();
        console.error(`[WebhookService] Error derivación (${response.status}):`, errorText);
        return { success: false, error: `HTTP ${response.status}` };
      }

      let responseData: any = {};
      try { responseData = await response.json(); } catch {}

      console.log(`[WebhookService] ✅ Derivación exitosa: ${payload.area}`);
      return { success: true, ticket_id: responseData.ticket_id };

    } catch (error) {
      const msg = error instanceof Error ? error.message : 'Error desconocido';
      console.error('[WebhookService] Error derivación:', msg);
      return { success: false, error: msg };
    }
  }

  /**
   * Enviar mensaje via webhook específico de línea
   * Usado para mensaje educativo en líneas secundarias
   */
  async enviarMensajeViaWebhook(params: {
    linea: string;
    telefono: string;
    mensaje: string;
    conversacion_id: string;
    tipo?: string;
    remitente?: string;
  }): Promise<WebhookResponse> {
    const webhookUrl = this.webhooksEnvio[params.linea];

    if (!webhookUrl) {
      console.error(`[WebhookService] No hay webhook envío para: ${params.linea}`);
      return { success: false, error: `Webhook no configurado para línea: ${params.linea}` };
    }

    try {
      console.log(`[WebhookService] Enviando mensaje via ${params.linea}`, {
        telefono: params.telefono,
        conversacion_id: params.conversacion_id,
      });

      const response = await fetch(webhookUrl, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          telefono: params.telefono,
          mensaje: params.mensaje,
          conversacion_id: params.conversacion_id,
          tipo: params.tipo || 'text',
          remitente: params.remitente || 'sistema',
          from_router: true,
          yaGuardado: false,
          timestamp: new Date().toISOString(),
        }),
        signal: AbortSignal.timeout(10000),
      });

      if (!response.ok) {
        const errorText = await response.text();
        console.error(`[WebhookService] Error envío (${response.status}):`, errorText);
        return { success: false, error: `HTTP ${response.status}` };
      }

      let responseData: any = {};
      try { responseData = await response.json(); } catch {}

      console.log(`[WebhookService] ✅ Mensaje enviado via ${params.linea}`);
      return { success: true, messageId: responseData.messageId };

    } catch (error) {
      const msg = error instanceof Error ? error.message : 'Error';
      console.error('[WebhookService] Error envío:', msg);
      return { success: false, error: msg };
    }
  }

  /**
   * Enviar mensaje legacy (genérico)
   */
  async enviarMensaje(payload: WebhookEnvioPayload): Promise<WebhookResponse> {
    if (!this.webhookUrl) {
      console.warn('[WebhookService] Webhook legacy no configurado');
      return { success: false, error: 'Webhook no configurado' };
    }

    if (!payload.mensaje || payload.mensaje.trim() === '') {
      return { success: true, error: 'Mensaje vacío' };
    }

    try {
      const response = await fetch(this.webhookUrl, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
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
        console.error(`[WebhookService] Error legacy (${response.status}):`, errorText);
        return { success: false, error: `HTTP ${response.status}` };
      }

      let responseData: any = {};
      try { responseData = await response.json(); } catch {}

      console.log(`[WebhookService] ✅ Mensaje enviado (legacy)`);
      return { success: true, messageId: responseData.messageId || responseData.id };

    } catch (error) {
      const msg = error instanceof Error ? error.message : 'Error';
      console.error('[WebhookService] Error legacy:', msg);
      return { success: false, error: msg };
    }
  }

  /**
   * Enviar mensaje via WSP4
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

      console.log('[WebhookService] ✅ Mensaje enviado via WSP4');
      return { success: true };

    } catch (error) {
      const msg = error instanceof Error ? error.message : 'Error';
      console.error('[WebhookService] Error WSP4:', msg);
      return { success: false, error: msg };
    }
  }

  /**
   * Obtener webhook de envío por línea
   */
  getWebhookEnvioByLinea(linea: string): string | null {
    return this.webhooksEnvio[linea] || null;
  }

  estaConfigurado(): boolean {
    return this.webhookUrl !== null && this.webhookUrl.trim() !== '';
  }

  tieneWebhooksDerivacion(): boolean {
    return Object.values(this.webhooksDerivacion).some(url => url !== null);
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
