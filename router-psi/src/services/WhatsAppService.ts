import axios from 'axios';
import { Logger } from '../utils/logger';
import { Env } from '../config/environment';
import { getPhoneId, whatsappClient } from '../config/whatsapp';

export interface SendMessageParams {
  to: string;
  body: string;
  fromContext: 'wsp4' | 'ventas1' | 'administracion' | 'alumnos' | 'comunidad';
  metadata?: Record<string, any>;
}

class WhatsAppService {
  async sendTextMessage(params: SendMessageParams) {
    const { to, body, fromContext } = params;
    const phoneId = getPhoneId(fromContext);

    try {
      const response = await whatsappClient.post(`/${phoneId}/messages`, {
        messaging_product: 'whatsapp',
        to,
        type: 'text',
        text: { body },
      });

      Logger.info('Mensaje enviado via WhatsApp', {
        phoneId,
        to,
        context: fromContext,
      });

      return response.data;
    } catch (error: any) {
      Logger.error('Error enviando mensaje WhatsApp', {
        error: error?.response?.data || error.message,
      });
      throw error;
    }
  }

  async markAsRead(messageId: string, fromContext: 'wsp4' | 'ventas1') {
    const phoneId = getPhoneId(fromContext);

    try {
      await whatsappClient.post(`/${phoneId}/messages`, {
        messaging_product: 'whatsapp',
        status: 'read',
        message_id: messageId,
      });
    } catch (error: any) {
      Logger.warn('No se pudo marcar mensaje como leído', {
        error: error?.response?.data || error.message,
      });
    }
  }

  async fetchMedia(mediaId: string) {
    try {
      const { data } = await whatsappClient.get(`/${mediaId}`);
      const download = await axios.get(data.url, {
        responseType: 'arraybuffer',
        headers: {
          Authorization: `Bearer ${Env.whatsapp.token}`,
        },
      });

      return {
        buffer: Buffer.from(download.data, 'binary'),
        mimeType: download.headers['content-type'],
      };
    } catch (error: any) {
      Logger.error('Error descargando media', {
        mediaId,
        error: error?.response?.data || error.message,
      });
      throw error;
    }
  }
}

export const whatsappService = new WhatsAppService();






