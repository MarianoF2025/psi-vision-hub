import axios, { AxiosInstance } from 'axios';
import { MensajeEntrante } from '../types';
import { logger } from '../utils/logger';

/**
 * Adaptador para comunicarse con Router PSI existente
 * Permite llamar al sistema anterior durante la migración
 */
export class RouterPsiAdapter {
  private client: AxiosInstance;

  constructor(
    private routerPsiUrl: string = process.env.ROUTER_PSI_URL || 'http://localhost:3002',
    private appLogger = logger
  ) {
    this.client = axios.create({
      baseURL: this.routerPsiUrl,
      timeout: 10000, // 10 segundos timeout
      headers: {
        'Content-Type': 'application/json',
      },
    });
  }

  /**
   * Procesar mensaje con Router PSI actual
   */
  async processMessage(mensaje: MensajeEntrante): Promise<{
    success: boolean;
    request_id?: string;
    processing_time_ms?: number;
    accion_ejecutada?: string;
    area_destino?: string;
    error?: string;
  }> {
    const startTime = Date.now();

    try {
      this.appLogger.debug('Enviando mensaje a Router PSI', {
        telefono: mensaje.telefono,
        contenido: mensaje.contenido.substring(0, 100),
      });

      // Adaptar formato de mensaje para Router PSI
      const routerPsiMessage = this.adaptMessageToRouterPsi(mensaje);

      // Llamar al endpoint de Router PSI
      const response = await this.client.post('/api/router-psi/message', routerPsiMessage);

      const processingTime = Date.now() - startTime;

      // Adaptar respuesta de Router PSI
      return this.adaptResponseFromRouterPsi(response.data, processingTime);
    } catch (error: any) {
      const processingTime = Date.now() - startTime;

      this.appLogger.error('Error procesando mensaje con Router PSI', {
        telefono: mensaje.telefono,
        error: error.message || 'Error desconocido',
        status: error.response?.status,
        processingTimeMs: processingTime,
      });

      return {
        success: false,
        processing_time_ms: processingTime,
        error: error.response?.data?.error || error.message || 'Error procesando con Router PSI',
      };
    }
  }

  /**
   * Adaptar mensaje Centralwap a formato Router PSI
   */
  private adaptMessageToRouterPsi(mensaje: MensajeEntrante): any {
    return {
      telefono: mensaje.telefono,
      contenido: mensaje.contenido,
      whatsapp_message_id: mensaje.whatsapp_message_id,
      timestamp: mensaje.timestamp.toISOString(),
      origen: mensaje.metadata?.webhook_source || 'manual',
      utm_data: {
        utm_campaign: mensaje.metadata?.utm_campaign,
        utm_source: mensaje.metadata?.utm_source,
        utm_medium: mensaje.metadata?.utm_medium,
        utm_content: mensaje.metadata?.utm_content,
        utm_term: mensaje.metadata?.utm_term,
      },
      multimedia: mensaje.multimedia,
    };
  }

  /**
   * Adaptar respuesta Router PSI a formato Centralwap
   */
  private adaptResponseFromRouterPsi(routerPsiResponse: any, processingTime: number): {
    success: boolean;
    request_id?: string;
    processing_time_ms: number;
    accion_ejecutada?: string;
    area_destino?: string;
    error?: string;
  } {
    return {
      success: routerPsiResponse.success !== false,
      request_id: routerPsiResponse.request_id,
      processing_time_ms: processingTime,
      accion_ejecutada: routerPsiResponse.accion_ejecutada || routerPsiResponse.accion,
      area_destino: routerPsiResponse.area_destino,
      error: routerPsiResponse.error,
    };
  }

  /**
   * Health check de Router PSI
   */
  async healthCheck(): Promise<{ healthy: boolean; error?: string }> {
    try {
      const response = await this.client.get('/health');
      return {
        healthy: response.status === 200,
      };
    } catch (error: any) {
      return {
        healthy: false,
        error: error.message || 'Error conectando con Router PSI',
      };
    }
  }
}




