// ===========================================
// SERVICIO DE MENSAJES INTERACTIVOS - Cloud API
// Versión 1.0.0
// ===========================================

import { InteractiveList } from '../config/interactive-menus';

const WHATSAPP_API_URL = 'https://graph.facebook.com/v21.0';
const PHONE_NUMBER_ID = process.env.WHATSAPP_PHONE_NUMBER_ID || '809951985523815';
const ACCESS_TOKEN = process.env.WHATSAPP_ACCESS_TOKEN;

export interface EnvioResult {
  success: boolean;
  messageId?: string;
  error?: string;
}

interface WhatsAppAPIResponse {
  messages?: Array<{ id: string }>;
  error?: { message: string };
}

export class InteractiveService {

  /**
   * Enviar lista interactiva
   */
  async enviarListaInteractiva(
    telefono: string,
    lista: InteractiveList
  ): Promise<EnvioResult> {
    try {
      const telefonoLimpio = telefono.replace(/^\+/, '');

      const payload = {
        messaging_product: 'whatsapp',
        recipient_type: 'individual',
        to: telefonoLimpio,
        type: 'interactive',
        interactive: {
          type: 'list',
          header: lista.header ? {
            type: 'text',
            text: lista.header
          } : undefined,
          body: {
            text: lista.body
          },
          footer: lista.footer ? {
            text: lista.footer
          } : undefined,
          action: {
            button: lista.buttonText,
            sections: lista.sections.map(section => ({
              title: section.title,
              rows: section.rows.map(row => ({
                id: row.id,
                title: row.title.substring(0, 24),
                description: row.description?.substring(0, 72)
              }))
            }))
          }
        }
      };

      console.log('[InteractiveService] Payload:', JSON.stringify(payload).substring(0, 800));
      console.log(`[InteractiveService] Enviando lista a ${telefonoLimpio}`);

      const response = await fetch(
        `${WHATSAPP_API_URL}/${PHONE_NUMBER_ID}/messages`,
        {
          method: 'POST',
          headers: {
            'Authorization': `Bearer ${ACCESS_TOKEN}`,
            'Content-Type': 'application/json',
          },
          body: JSON.stringify(payload),
        }
      );

      const data = await response.json() as WhatsAppAPIResponse;

      if (!response.ok) {
        console.error('[InteractiveService] Error:', data);
        return {
          success: false,
          error: data.error?.message || `HTTP ${response.status}`
        };
      }

      console.log('[InteractiveService] ✅ Lista enviada:', data.messages?.[0]?.id);

      return {
        success: true,
        messageId: data.messages?.[0]?.id
      };

    } catch (error) {
      const msg = error instanceof Error ? error.message : 'Error desconocido';
      console.error('[InteractiveService] Error:', msg);
      return { success: false, error: msg };
    }
  }

  /**
   * Enviar mensaje de texto simple
   */
  async enviarTexto(telefono: string, mensaje: string): Promise<EnvioResult> {
    console.log(`[InteractiveService] enviarTexto llamado - tel: ${telefono}, msg: ${mensaje.substring(0, 50)}...`);
    try {
      const telefonoLimpio = telefono.replace(/^\+/, '');

      const payload = {
        messaging_product: 'whatsapp',
        recipient_type: 'individual',
        to: telefonoLimpio,
        type: 'text',
        text: {
          preview_url: false,
          body: mensaje
        }
      };

      const response = await fetch(
        `${WHATSAPP_API_URL}/${PHONE_NUMBER_ID}/messages`,
        {
          method: 'POST',
          headers: {
            'Authorization': `Bearer ${ACCESS_TOKEN}`,
            'Content-Type': 'application/json',
          },
          body: JSON.stringify(payload),
        }
      );

      const data = await response.json() as WhatsAppAPIResponse;

      if (!response.ok) {
        console.error('[InteractiveService] Error texto:', data);
        return {
          success: false,
          error: data.error?.message || `HTTP ${response.status}`
        };
      }

      return {
        success: true,
        messageId: data.messages?.[0]?.id
      };

    } catch (error) {
      const msg = error instanceof Error ? error.message : 'Error desconocido';
      console.error('[InteractiveService] Error texto:', msg);
      return { success: false, error: msg };
    }
  }
}

export const interactiveService = new InteractiveService();
