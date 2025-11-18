// Procesador de mensajes del Router WSP4

import { createClient } from '@supabase/supabase-js';
import {
  WhatsAppMessage,
  RouterResponse,
  MenuState,
  MenuArea,
  WhatsAppMedia,
} from './types';
import {
  getMainMenuText,
  getSubmenuText,
  findMainMenuOption,
  findSubmenuOption,
} from './menus';
import {
  downloadWhatsAppMedia,
  uploadMediaToSupabase,
  generateThumbnail,
  transcribeAudio,
} from './media';
import {
  extractLinks,
  saveAttributionData,
} from './meta';

const ANTI_LOOP_MINUTES = 15;

const CLOUD_API_BASE_URL =
  process.env.CLOUD_API_BASE_URL || 'https://graph.facebook.com/v18.0';
const CLOUD_API_TOKEN = process.env.CLOUD_API_TOKEN;
const CLOUD_API_PHONE_NUMBER_ID = process.env.CLOUD_API_PHONE_NUMBER_ID;

const AREA_WEBHOOKS: Record<MenuArea, string | undefined> = {
  Administración:
    process.env.N8N_WEBHOOK_ENVIOS_ROUTER_ADMINISTRACION ||
    process.env.N8N_WEBHOOK_ENVIOS_ROUTER_CRM,
  Alumnos:
    process.env.N8N_WEBHOOK_ENVIOS_ROUTER_ALUMNOS ||
    process.env.N8N_WEBHOOK_ENVIOS_ROUTER_CRM,
  Inscripciones:
    process.env.N8N_WEBHOOK_ENVIOS_ROUTER_VENTAS_1 ||
    process.env.N8N_WEBHOOK_ENVIOS_ROUTER_CRM,
  Comunidad:
    process.env.N8N_WEBHOOK_ENVIOS_ROUTER_COMUNIDAD ||
    process.env.N8N_WEBHOOK_ENVIOS_ROUTER_CRM,
  'Otra consulta':
    process.env.N8N_WEBHOOK_ENVIOS_ROUTER_CRM ||
    process.env.N8N_WEBHOOK_ENVIOS_ROUTER_VENTAS_1,
};

const INGESTA_WEBHOOKS: Record<string, string | undefined> = {
  default: process.env.N8N_WEBHOOK_INGESTA_ROUTER_WSP4,
  Administración: process.env.N8N_WEBHOOK_INGESTA_ROUTER_ADMINISTRACION,
  Alumnos: process.env.N8N_WEBHOOK_INGESTA_ROUTER_ALUMNOS,
  Comunidad: process.env.N8N_WEBHOOK_INGESTA_ROUTER_COMUNIDAD,
  Ventas1: process.env.N8N_WEBHOOK_INGESTA_ROUTER_VENTAS_1,
  Ventas2: process.env.N8N_WEBHOOK_INGESTA_ROUTER_VENTAS_2,
  Ventas3: process.env.N8N_WEBHOOK_INGESTA_ROUTER_VENTAS_3,
  'Directa Administracion':
    process.env.N8N_WEBHOOK_INGESTA_DIRECTA_ADMINISTRACION,
  'Directa Alumnos': process.env.N8N_WEBHOOK_INGESTA_DIRECTA_ALUMNOS,
  'Directa Comunidad': process.env.N8N_WEBHOOK_INGESTA_DIRECTA_COMUNIDAD,
};

export class RouterProcessor {
  private supabase = createClient(
    process.env.NEXT_PUBLIC_SUPABASE_URL!,
    process.env.SUPABASE_SERVICE_ROLE_KEY || process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!
  );

  async processMessage(message: WhatsAppMessage): Promise<RouterResponse> {
    try {
      const phone = message.from;
      const originalText = message.message || '';
      const normalizedCommand = originalText.trim().toUpperCase();

      // Buscar o crear conversación
      const conversation = await this.findOrCreateConversation(phone);

      if (!conversation) {
        return { success: false, message: 'Error al procesar conversación' };
      }

      // Verificar anti-loop
      const lastInteraction = await this.getLastInteraction(conversation.id);
      if (lastInteraction && this.isWithinAntiLoopWindow(lastInteraction)) {
        // Ignorar mensaje si está dentro de la ventana anti-loop
        return { 
          success: true, 
          message: 'Mensaje procesado (anti-loop activo)',
          conversationId: conversation.id 
        };
      }

      // Guardar mensaje en la base de datos y notificar ingesta
      const metadata: Record<string, any> = {
        type: message.type,
      };

      if (message.media) {
        const mediaMeta = await this.processMedia(
          conversation.id,
          message.media,
          message.type
        );
        if (mediaMeta) {
          metadata.media = mediaMeta;
        }
      }

      const links = extractLinks(originalText);
      if (links.length > 0) {
        metadata.links = links;
      }

      if (message.attribution) {
        metadata.attribution = message.attribution;
        await saveAttributionData(conversation.id, message.attribution);
      }

      await this.saveMessage(conversation.id, phone, originalText, metadata);
      const ingestionKey = this.getIngestionKey(conversation.area);
      await this.notifyIngestionWebhook(ingestionKey, {
        conversationId: conversation.id,
        phone,
        message: originalText,
        media: metadata.media,
      });

      // Procesar comando o selección
      if (normalizedCommand === 'MENU') {
        return await this.showMainMenu(conversation.id, phone);
      }

      if (normalizedCommand === 'VOLVER') {
        return await this.showMainMenu(conversation.id, phone);
      }

      // Obtener estado del menú
      const menuState = await this.getMenuState(conversation.id);

      if (!menuState || menuState.currentMenu === 'main') {
        // Procesar selección del menú principal
        return await this.processMainMenuSelection(
          conversation.id,
          phone,
          normalizedCommand
        );
      } else {
        // Procesar selección del submenú
        return await this.processSubmenuSelection(
          conversation.id, 
          phone, 
          normalizedCommand, 
          menuState.currentMenu as MenuArea
        );
      }
    } catch (error) {
      console.error('Error processing message:', error);
      return { success: false, message: 'Error al procesar mensaje' };
    }
  }

  private async findOrCreateConversation(phone: string) {
    // Buscar conversación existente
    const { data: existing } = await this.supabase
      .from('conversaciones')
      .select('*')
      .eq('telefono', phone)
      .order('created_at', { ascending: false })
      .limit(1)
      .single();

    if (existing) {
      return existing;
    }

    // Buscar contacto existente
    let { data: contact } = await this.supabase
      .from('contactos')
      .select('*')
      .eq('telefono', phone)
      .single();

    // Crear contacto si no existe
    if (!contact) {
      const { data: newContact } = await this.supabase
        .from('contactos')
        .insert({
          telefono: phone,
          nombre: phone, // Por defecto
        })
        .select()
        .single();

      contact = newContact;
    }

    // Crear nueva conversación
    const { data: conversation } = await this.supabase
      .from('conversaciones')
      .insert({
        contacto_id: contact!.id,
        telefono: phone,
        area: 'PSI Principal',
        estado: 'nueva',
        ts_ultimo_mensaje: new Date().toISOString(),
      })
      .select()
      .single();

    return conversation;
  }

  private async showMainMenu(conversationId: string, phone: string): Promise<RouterResponse> {
    const menuText = getMainMenuText();
    
    // Guardar mensaje del sistema
    await this.saveMessage(conversationId, 'system', menuText);
    
    // Actualizar estado del menú
    await this.updateMenuState(conversationId, 'main');

    // Enviar mensaje
    await this.sendWhatsAppMessage(phone, menuText);

    return {
      success: true,
      message: menuText,
      conversationId,
    };
  }

  private async processMainMenuSelection(
    conversationId: string,
    phone: string,
    selection: string
  ): Promise<RouterResponse> {
    const option = findMainMenuOption(selection);

    if (!option) {
      // Opción inválida, mostrar menú principal
      return await this.showMainMenu(conversationId, phone);
    }

    // Mostrar submenú
    const submenuText = getSubmenuText(option.area!);
    
    await this.saveMessage(conversationId, 'system', submenuText);
    await this.updateMenuState(conversationId, option.area!);
    await this.sendWhatsAppMessage(phone, submenuText);

    return {
      success: true,
      message: submenuText,
      conversationId,
      area: option.area,
    };
  }

  private async processSubmenuSelection(
    conversationId: string,
    phone: string,
    selection: string,
    area: MenuArea
  ): Promise<RouterResponse> {
    const option = findSubmenuOption(area, selection);

    if (!option) {
      // Opción inválida, mostrar submenú actual
      const submenuText = getSubmenuText(area);
      await this.sendWhatsAppMessage(phone, submenuText);
      return {
        success: true,
        message: submenuText,
        conversationId,
        area,
      };
    }

    // Derivar conversación al área correspondiente
    await this.deriveConversation(conversationId, option.area, option.subarea);

    // Enviar mensaje de derivación
    const derivationMessage = `Te derivamos con ${option.area}${option.subarea ? ` - ${option.subarea}` : ''}. Un agente se comunicará contigo pronto. 👋`;
    
    await this.saveMessage(conversationId, 'system', derivationMessage);
    await this.sendWhatsAppMessage(phone, derivationMessage);
    await this.notifyAreaWebhook(option.area, {
      conversationId,
      phone,
      area: option.area,
      subarea: option.subarea,
    });

    return {
      success: true,
      message: derivationMessage,
      conversationId,
      area: option.area,
      subarea: option.subarea,
    };
  }

  private async deriveConversation(
    conversationId: string,
    area: MenuArea,
    subarea?: string
  ) {
    // Mapear área del menú a área de conversación
    const conversationArea = this.mapMenuAreaToConversationArea(area);

    // Actualizar conversación
    const updates: any = {
      area: conversationArea,
      estado: 'activa',
      ts_ultimo_mensaje: new Date().toISOString(),
      updated_at: new Date().toISOString(),
    };

    // Agregar etiqueta/subarea si existe
    if (subarea) {
      // TODO: Implementar sistema de etiquetas
    }

    await this.supabase
      .from('conversaciones')
      .update(updates)
      .eq('id', conversationId);
  }

  private mapMenuAreaToConversationArea(menuArea: MenuArea): string {
    const mapping: Record<MenuArea, string> = {
      'Administración': 'Administración',
      'Alumnos': 'Alumnos',
      'Inscripciones': 'Ventas', // Inscripciones va a Ventas
      'Comunidad': 'Comunidad',
      'Otra consulta': 'Ventas', // Otra consulta va a Ventas
    };

    return mapping[menuArea] || 'Ventas';
  }

  private async saveMessage(
    conversationId: string,
    remitente: string,
    mensaje: string,
    metadata?: Record<string, any>
  ) {
    await this.supabase
      .from('mensajes')
      .insert({
        conversacion_id: conversationId,
        mensaje,
        remitente,
        timestamp: new Date().toISOString(),
        metadata,
      });

    // Actualizar última actividad
    await this.supabase
      .from('conversaciones')
      .update({
        ts_ultimo_mensaje: new Date().toISOString(),
        updated_at: new Date().toISOString(),
      })
      .eq('id', conversationId);
  }

  private async getMenuState(conversationId: string): Promise<MenuState | null> {
    // Obtener último mensaje del sistema para determinar estado
    const { data: lastSystemMessage } = await this.supabase
      .from('mensajes')
      .select('*')
      .eq('conversacion_id', conversationId)
      .eq('remitente', 'system')
      .order('timestamp', { ascending: false })
      .limit(1)
      .single();

    if (!lastSystemMessage) {
      return { conversationId, currentMenu: 'main', lastInteraction: new Date() };
    }

    // Determinar menú actual basado en el contenido del mensaje
    const messageText = lastSystemMessage.mensaje || '';
    
    if (messageText.includes('¡Hola! 👋')) {
      return { conversationId, currentMenu: 'main', lastInteraction: new Date(lastSystemMessage.timestamp) };
    }

    // Detectar área del submenú
    const areas: MenuArea[] = ['Administración', 'Alumnos', 'Inscripciones', 'Comunidad'];
    for (const area of areas) {
      if (messageText.startsWith(area)) {
        return { conversationId, currentMenu: area, lastInteraction: new Date(lastSystemMessage.timestamp) };
      }
    }

    return { conversationId, currentMenu: 'main', lastInteraction: new Date() };
  }

  private async updateMenuState(conversationId: string, menu: 'main' | MenuArea) {
    // El estado se guarda implícitamente en los mensajes del sistema
    // Podríamos crear una tabla de estados si es necesario
  }

  private async getLastInteraction(conversationId: string): Promise<Date | null> {
    const { data: lastMessage } = await this.supabase
      .from('mensajes')
      .select('timestamp')
      .eq('conversacion_id', conversationId)
      .order('timestamp', { ascending: false })
      .limit(1)
      .single();

    return lastMessage ? new Date(lastMessage.timestamp) : null;
  }

  private isWithinAntiLoopWindow(lastInteraction: Date): boolean {
    const now = new Date();
    const diffMinutes = (now.getTime() - lastInteraction.getTime()) / (1000 * 60);
    return diffMinutes < ANTI_LOOP_MINUTES;
  }

  private async sendWhatsAppMessage(to: string, message: string) {
    if (!CLOUD_API_TOKEN || !CLOUD_API_PHONE_NUMBER_ID) {
      console.warn('WhatsApp Cloud API no configurada');
      return;
    }

    const sanitizedNumber = to.replace(/[^0-9]/g, '');
    const url = `${CLOUD_API_BASE_URL}/${CLOUD_API_PHONE_NUMBER_ID}/messages`;

    try {
      await fetch(url, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          Authorization: `Bearer ${CLOUD_API_TOKEN}`,
        },
        body: JSON.stringify({
          messaging_product: 'whatsapp',
          to: sanitizedNumber,
          type: 'text',
          text: { body: message },
        }),
      });
    } catch (error) {
      console.error('Error sending WhatsApp message:', error);
    }
  }

  private async notifyAreaWebhook(area: MenuArea, payload: any) {
    const webhook = AREA_WEBHOOKS[area];
    if (!webhook) return;

    try {
      await fetch(webhook, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(payload),
      });
    } catch (error) {
      console.error(`Error notifying webhook for ${area}:`, error);
    }
  }

  private async notifyIngestionWebhook(key: string, payload: any) {
    const webhook = INGESTA_WEBHOOKS[key] || INGESTA_WEBHOOKS.default;
    if (!webhook) return;

    try {
      await fetch(webhook, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(payload),
      });
    } catch (error) {
      console.error(`Error notifying ingestion webhook ${key}:`, error);
    }
  }

  private getIngestionKey(area?: string) {
    switch (area) {
      case 'Administración':
        return 'Administración';
      case 'Alumnos':
        return 'Alumnos';
      case 'Comunidad':
        return 'Comunidad';
      case 'Ventas':
        return 'Ventas1';
      default:
        return 'default';
    }
  }

  private async processMedia(
    conversationId: string,
    media: WhatsAppMedia,
    messageType?: string
  ) {
    try {
      const downloaded = media.id
        ? await downloadWhatsAppMedia(media.id)
        : null;

      if (!downloaded) return;

      const uploaded = await uploadMediaToSupabase(
        conversationId,
        media.id,
        downloaded
      );

      const metadata: Record<string, any> = {
        bucket: uploaded.bucket,
        path: uploaded.path,
        url: uploaded.publicUrl,
        mimeType: downloaded.mimeType,
        size: downloaded.fileSize,
        caption: media.caption,
        type: messageType,
      };

      if (downloaded.mimeType?.startsWith('image')) {
        const thumbnail = await generateThumbnail(downloaded.buffer, downloaded.mimeType);
        if (thumbnail) {
          metadata.thumbnail = thumbnail;
        }
      }

      if (downloaded.mimeType?.startsWith('audio')) {
        const transcription = await transcribeAudio(uploaded.publicUrl);
        if (transcription) {
          metadata.transcription = transcription;
        }
      }

      return metadata;
    } catch (error) {
      console.error('Error processing media', error);
      return;
    }
  }
}

