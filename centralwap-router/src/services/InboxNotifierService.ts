import axios from 'axios';
import { logger } from '../utils/logger';
import { config } from '../config/environment';
import { mapearAreaABD } from '../utils/areaMapper';
import { AreaType } from '../types';

/**
 * Servicio para notificar mensajes a los inboxs via webhooks de N8N
 * Envía mensajes a las bandejas correspondientes cuando hay derivaciones
 */
export class InboxNotifierService {
  private webhooks: Record<string, string>;

  constructor() {
    // Configurar webhooks desde configuración
    this.webhooks = config.webhooks || {
      administracion: '',
      alumnos: '',
      ventas: '',
      comunidad: '',
      crm: '',
    };
  }

  /**
   * Notificar mensaje entrante a inbox correspondiente
   * Se usa cuando proxy está activo o cuando hay una derivación
   */
  async notificarMensajeInbox(params: {
    conversacion_id: string;
    telefono: string;
    mensaje: string;
    area_destino: AreaType;
    tipo: 'derivacion' | 'mensaje_proxy' | 'mensaje_normal';
    ticket_id?: string;
    derivacion_id?: string;
  }): Promise<{ success: boolean; error?: string }> {
    try {
      // Mapear área interna a formato BD para webhook
      const areaBD = mapearAreaABD(params.area_destino as any);

      // Obtener URL del webhook correspondiente
      const webhookUrl = this.webhooks[areaBD];

      if (!webhookUrl) {
        logger.warn('No hay webhook configurado para área', {
          area: params.area_destino,
          areaBD,
          conversacionId: params.conversacion_id,
        });
        return {
          success: false,
          error: `No hay webhook configurado para área: ${areaBD}`,
        };
      }

      // Preparar payload para N8N
      const payload = {
        conversacion_id: params.conversacion_id,
        telefono: params.telefono,
        mensaje: params.mensaje,
        area: areaBD,
        tipo: params.tipo,
        timestamp: new Date().toISOString(),
        ticket_id: params.ticket_id,
        derivacion_id: params.derivacion_id,
        metadata: {
          source: 'centralwap-router',
          proxy_activo: params.tipo === 'mensaje_proxy',
        },
      };

      logger.info('Enviando notificación a inbox via webhook', {
        area: areaBD,
        webhookUrl: webhookUrl.substring(0, 50) + '...',
        conversacionId: params.conversacion_id,
        tipo: params.tipo,
      });

      // Enviar a webhook de N8N
      const response = await axios.post(webhookUrl, payload, {
        timeout: 10000, // 10 segundos timeout
        headers: {
          'Content-Type': 'application/json',
        },
      });

      logger.info('Notificación enviada exitosamente a inbox', {
        area: areaBD,
        conversacionId: params.conversacion_id,
        status: response.status,
      });

      return { success: true };
    } catch (error: any) {
      const errorMessage = error.response?.data?.message || error.message || 'Error desconocido';
      
      logger.error('Error enviando notificación a inbox', {
        area: params.area_destino,
        conversacionId: params.conversacion_id,
        error: errorMessage,
        status: error.response?.status,
      });

      return {
        success: false,
        error: errorMessage,
      };
    }
  }

  /**
   * Verificar si un área tiene webhook configurado
   */
  tieneWebhookConfigurado(area: AreaType): boolean {
    const areaBD = mapearAreaABD(area as any);
    return !!this.webhooks[areaBD] && this.webhooks[areaBD] !== '';
  }

  /**
   * Obtener lista de áreas con webhooks configurados
   */
  getAreasConWebhooks(): string[] {
    return Object.entries(this.webhooks)
      .filter(([_, url]) => url && url !== '')
      .map(([area, _]) => area);
  }
}
