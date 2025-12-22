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

  async enviarMenuInteractivo(telefono: string, curso: Curso, opciones: MenuOpcion[], omitirSaludo: boolean = false, omitirDescripcion: boolean = false): Promise<{ success: boolean; messageId?: string; error?: string }> {
    try {
      const telefonoLimpio = this.normalizarTelefono(telefono);
      const DELAY_ENTRE_MENSAJES = 2000;

      // PASO 1: Si hay mensaje_saludo y no se omite, enviarlo primero
      if (curso.mensaje_saludo && !omitirSaludo) {
        const saludoResult = await this.enviarTexto(telefono, curso.mensaje_saludo);
        if (saludoResult.success) {
          console.log(`✅ Saludo enviado a ${telefonoLimpio}`);
          await new Promise(resolve => setTimeout(resolve, DELAY_ENTRE_MENSAJES));
        }
      }

      // PASO 2: Si hay mensaje_bienvenida (descripcion) y no se omite, enviarlo como segundo mensaje
      if (curso.mensaje_bienvenida && !omitirDescripcion) {
        const bienvenidaResult = await this.enviarTexto(telefono, curso.mensaje_bienvenida);
        if (bienvenidaResult.success) {
          console.log(`✅ Descripcion enviada a ${telefonoLimpio}`);
          await new Promise(resolve => setTimeout(resolve, DELAY_ENTRE_MENSAJES));
        }
      }

      // PASO 3: Enviar el menu interactivo con body corto
      const sections = this.construirSecciones(opciones);
      const bodyText = (curso as any).mensaje_menu_body || 'Selecciona que informacion necesitas:';

      const payload: WhatsAppListMessage = {
        messaging_product: 'whatsapp',
        recipient_type: 'individual',
        to: telefonoLimpio,
        type: 'interactive',
        interactive: {
          type: 'list',
          header: { type: 'text', text: `🎓 ${curso.nombre}` },
          body: { text: bodyText },
          footer: { text: 'PSI Asociacion' },
          action: { button: 'Ver opciones', sections: sections }
        }
      };

      const response = await axios.post(whatsappConfig.messagesUrl, payload, { headers: whatsappConfig.headers });
      console.log(`✅ Menu interactivo enviado a ${telefonoLimpio} - Curso: ${curso.codigo}`);
      return { success: true, messageId: response.data?.messages?.[0]?.id };
    } catch (error: any) {
      console.error('❌ Error enviando menu:', error.response?.data || error.message);
      return { success: false, error: error.response?.data?.error?.message || error.message };
    }
  }

  async enviarMenuGenerico(
    telefono: string,
    bodyText: string,
    sections: WhatsAppListSection[],
    headerText: string = '🎓 PSI Asociacion'
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
          footer: { text: 'Educacion en Salud Mental' },
          action: { button: 'Ver opciones', sections: sections }
        }
      };

      const response = await axios.post(whatsappConfig.messagesUrl, payload, { headers: whatsappConfig.headers });
      console.log(`✅ Menu generico enviado a ${telefonoLimpio}`);
      return { success: true, messageId: response.data?.messages?.[0]?.id };
    } catch (error: any) {
      console.error('❌ Error enviando menu generico:', error.response?.data || error.message);
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
          footer: { text: 'PSI Asociacion' },
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
        title: 'Informacion',
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
