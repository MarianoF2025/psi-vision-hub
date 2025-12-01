import axios, { AxiosInstance } from 'axios';
import { config } from '../config/environment';
import { logger, logWithRequestId } from '../utils/logger';

/**
 * Interface para servicio de WhatsApp
 */
export interface IWhatsAppService {
  enviarMensaje(params: {
    telefono: string;
    mensaje: string;
    conversacion_id: string;
    request_id: string;
    metadata?: Record<string, any>;
  }): Promise<{
    success: boolean;
    message_id?: string;
    error?: string;
  }>;
}

/**
 * IMPLEMENTACIÓN ADAPTADOR EVOLUTION API (PRIMARIO PARA PSI)
 */
export class EvolutionWhatsAppService implements IWhatsAppService {
  private client: AxiosInstance;

  constructor(
    private evolutionConfig = config.whatsapp.evolution,
    private appLogger = logger
  ) {
    // Configurar cliente HTTP para Evolution API
    this.client = axios.create({
      baseURL: this.evolutionConfig.api_url,
      timeout: 10000, // 10 segundos timeout
      headers: {
        'Content-Type': 'application/json',
        apikey: this.evolutionConfig.api_key,
      },
    });
  }

  async enviarMensaje(params: {
    telefono: string;
    mensaje: string;
    conversacion_id: string;
    request_id: string;
    metadata?: Record<string, any>;
  }): Promise<{ success: boolean; message_id?: string; error?: string }> {
    const startTime = Date.now();

    try {
      logWithRequestId(params.request_id, 'debug', 'Enviando mensaje vía Evolution API', {
        conversacionId: params.conversacion_id,
        telefono: params.telefono,
        mensajeLength: params.mensaje.length,
      });

      // Formatear teléfono para Evolution API (remover +)
      const telefonoFormateado = params.telefono.replace(/^\+/, '');

      // Llamar a Evolution API
      const response = await this.client.post(
        `/message/sendText/${this.evolutionConfig.instance_name}`,
        {
          number: telefonoFormateado,
          text: params.mensaje,
        }
      );

      // Extraer message ID de la respuesta
      const messageId = response.data?.key?.id || response.data?.messageId || undefined;

      const processingTime = Date.now() - startTime;
      logWithRequestId(params.request_id, 'info', 'Mensaje enviado exitosamente vía Evolution API', {
        conversacionId: params.conversacion_id,
        messageId,
        processingTimeMs: processingTime,
      });

      return {
        success: true,
        message_id: messageId,
      };
    } catch (error: any) {
      const processingTime = Date.now() - startTime;
      const errorMessage =
        error.response?.data?.message ||
        error.message ||
        'Error desconocido al enviar mensaje';

      logWithRequestId(params.request_id, 'error', 'Error enviando mensaje Evolution API', {
        conversacionId: params.conversacion_id,
        telefono: params.telefono,
        error: errorMessage,
        status: error.response?.status,
        processingTimeMs: processingTime,
      });

      return {
        success: false,
        error: errorMessage,
      };
    }
  }
}









