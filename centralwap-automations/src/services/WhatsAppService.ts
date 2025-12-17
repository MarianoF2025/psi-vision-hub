import axios from 'axios';
import { whatsappConfig } from '../config/whatsapp';
import { WhatsAppListMessage, WhatsAppTextMessage, WhatsAppListSection, MenuOpcion, Curso } from '../types';

export class WhatsAppService {

  async enviarTexto(telefono: string, mensaje: string): Promise<{ success: boolean; messageId?: string; error?: string }> {
    try {
      const telefonoLimpio = this.normalizarTelefono(telefono);

      const payload: WhatsAppTextMessage = {
        messaging_product: 'whatsapp',
        recipient_type: 'individual',
        to: telefonoLimpio,
        type: 'text',
        text: { preview_url: false, body: mensaje }
      };

      const response = await axios.post(whatsappConfig.messagesUrl, payload, { headers: whatsappConfig.headers });
      console.log(`✅ Mensaje enviado a ${telefonoLimpio}`);
      return { success: true, messageId: response.data?.messages?.[0]?.id };
    } catch (error: any) {
      console.error('❌ Error enviando mensaje:', error.response?.data || error.message);
      return { success: false, error: error.response?.data?.error?.message || error.message };
    }
  }

  async enviarMenuInteractivo(telefono: string, curso: Curso, opciones: MenuOpcion[]): Promise<{ success: boolean; messageId?: string; error?: string }> {
    try {
      const telefonoLimpio = this.normalizarTelefono(telefono);

      // PASO 1: Si hay mensaje_saludo, enviarlo primero como mensaje separado
      if (curso.mensaje_saludo) {
        const saludoResult = await this.enviarTexto(telefono, curso.mensaje_saludo);
        if (!saludoResult.success) {
          console.warn(`⚠️ Error enviando saludo previo: ${saludoResult.error}`);
          // Continuamos igual con el menú
        } else {
          console.log(`✅ Saludo previo enviado a ${telefonoLimpio}`);
          // Pequeña pausa para que lleguen en orden
          await new Promise(resolve => setTimeout(resolve, 500));
        }
      }

      // PASO 2: Enviar el menú interactivo
      const sections = this.construirSecciones(opciones);
      // Si no hay mensaje_bienvenida, usar texto simple
      const bodyText = curso.mensaje_bienvenida || `Seleccioná qué información necesitás:`;

      const payload: WhatsAppListMessage = {
        messaging_product: 'whatsapp',
        recipient_type: 'individual',
        to: telefonoLimpio,
        type: 'interactive',
        interactive: {
          type: 'list',
          header: { type: 'text', text: `🎓 ${curso.nombre}` },
          body: { text: bodyText },
          footer: { text: 'PSI Asociación' },
          action: { button: 'Ver opciones', sections: sections }
        }
      };

      const response = await axios.post(whatsappConfig.messagesUrl, payload, { headers: whatsappConfig.headers });
      console.log(`✅ Menú interactivo enviado a ${telefonoLimpio} - Curso: ${curso.codigo}`);
      return { success: true, messageId: response.data?.messages?.[0]?.id };
    } catch (error: any) {
      console.error('❌ Error enviando menú:', error.response?.data || error.message);
      return { success: false, error: error.response?.data?.error?.message || error.message };
    }
  }

  async enviarMenuGenerico(
    telefono: string,
    bodyText: string,
    sections: WhatsAppListSection[],
    headerText: string = '🎓 PSI Asociación'
  ): Promise<{ success: boolean; messageId?: string; error?: string }> {
    try {
      const telefonoLimpio = this.normalizarTelefono(telefono);

      const payload: WhatsAppListMessage = {
        messaging_product: 'whatsapp',
        recipient_type: 'individual',
        to: telefonoLimpio,
        type: 'interactive',
        interactive: {
          type: 'list',
          header: { type: 'text', text: headerText },
          body: { text: bodyText },
          footer: { text: 'Educación en Salud Mental' },
          action: { button: 'Ver opciones', sections: sections }
        }
      };

      const response = await axios.post(whatsappConfig.messagesUrl, payload, { headers: whatsappConfig.headers });
      console.log(`✅ Menú genérico enviado a ${telefonoLimpio}`);
      return { success: true, messageId: response.data?.messages?.[0]?.id };
    } catch (error: any) {
      console.error('❌ Error enviando menú genérico:', error.response?.data || error.message);
      return { success: false, error: error.response?.data?.error?.message || error.message };
    }
  }

  async enviarBotones(
    telefono: string,
    bodyText: string,
    botones: Array<{ id: string; titulo: string }>,
    headerText?: string
  ): Promise<{ success: boolean; messageId?: string; error?: string }> {
    try {
      const telefonoLimpio = this.normalizarTelefono(telefono);

      const payload = {
        messaging_product: 'whatsapp',
        recipient_type: 'individual',
        to: telefonoLimpio,
        type: 'interactive',
        interactive: {
          type: 'button',
          header: headerText ? { type: 'text', text: headerText } : undefined,
          body: { text: bodyText },
          footer: { text: 'PSI Asociación' },
          action: {
            buttons: botones.map(b => ({
              type: 'reply',
              reply: { id: b.id, title: b.titulo.substring(0, 20) }
            }))
          }
        }
      };

      const response = await axios.post(whatsappConfig.messagesUrl, payload, { headers: whatsappConfig.headers });
      console.log(`✅ Botones enviados a ${telefonoLimpio}`);
      return { success: true, messageId: response.data?.messages?.[0]?.id };
    } catch (error: any) {
      console.error('❌ Error enviando botones:', error.response?.data || error.message);
      return { success: false, error: error.response?.data?.error?.message || error.message };
    }
  }

  private construirSecciones(opciones: MenuOpcion[]): WhatsAppListSection[] {
    const opcionesInfo = opciones.filter(o => o.tipo === 'info' && o.activo);
    const opcionesContacto = opciones.filter(o => (o.tipo === 'derivar' || o.tipo === 'inscribir') && o.activo);
    const sections: WhatsAppListSection[] = [];

    if (opcionesInfo.length > 0) {
      sections.push({
        title: 'Información',
        rows: opcionesInfo.map(op => ({
          id: op.id,
          title: `${op.emoji || ''} ${op.titulo}`.trim().substring(0, 24),
          description: op.subtitulo?.substring(0, 72)
        }))
      });
    }

    if (opcionesContacto.length > 0) {
      sections.push({
        title: 'Contacto',
        rows: opcionesContacto.map(op => ({
          id: op.id,
          title: `${op.emoji || ''} ${op.titulo}`.trim().substring(0, 24),
          description: op.subtitulo?.substring(0, 72)
        }))
      });
    }

    return sections;
  }

  private normalizarTelefono(telefono: string): string {
    let limpio = telefono.replace(/[\s\-\+\(\)]/g, '');
    if (limpio.startsWith('0')) limpio = '54' + limpio.substring(1);
    if (!limpio.startsWith('54') && limpio.length === 10) limpio = '54' + limpio;
    return limpio;
  }
}

export const whatsAppService = new WhatsAppService();
export default whatsAppService;
