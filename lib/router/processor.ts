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
      console.log(`Estado del menú detectado:`, menuState);

      if (!menuState || menuState.currentMenu === 'main') {
        console.log(`Procesando como selección de menú principal: "${normalizedCommand}"`);
        // Procesar selección del menú principal
        return await this.processMainMenuSelection(
          conversation.id,
          phone,
          normalizedCommand
        );
      } else {
        console.log(`Procesando como selección de submenú: "${normalizedCommand}" en área "${menuState.currentMenu}"`);
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
    try {
      // Buscar conversación existente
      const { data: existing, error: existingError } = await this.supabase
        .from('conversaciones')
        .select('*')
        .eq('telefono', phone)
        .order('created_at', { ascending: false })
        .limit(1)
        .maybeSingle();

      if (existingError && existingError.code !== 'PGRST116') {
        console.error('Error buscando conversación existente:', existingError);
      }

      if (existing) {
        console.log(`Conversación existente encontrada: ${existing.id}`);
        return existing;
      }

      // Buscar contacto existente
      const { data: contact, error: contactError } = await this.supabase
        .from('contactos')
        .select('*')
        .eq('telefono', phone)
        .maybeSingle();

      if (contactError && contactError.code !== 'PGRST116') {
        console.error('Error buscando contacto:', contactError);
      }

      let finalContact = contact;

      // Crear contacto si no existe
      if (!finalContact) {
        console.log(`Creando nuevo contacto para ${phone}`);
        const { data: newContact, error: insertContactError } = await this.supabase
          .from('contactos')
          .insert({
            telefono: phone,
            nombre: phone, // Por defecto
          })
          .select()
          .single();

        if (insertContactError) {
          console.error('Error creando contacto:', insertContactError);
          throw insertContactError;
        }

        if (!newContact) {
          throw new Error('No se pudo crear el contacto');
        }

        finalContact = newContact;
        console.log(`Contacto creado: ${finalContact.id}`);
      }

      // Crear nueva conversación
      console.log(`Creando nueva conversación para contacto ${finalContact.id}`);
      const { data: conversation, error: insertConvError } = await this.supabase
        .from('conversaciones')
        .insert({
          contacto_id: finalContact.id,
          telefono: phone,
          area: 'PSI Principal',
          estado: 'nueva',
          ts_ultimo_mensaje: new Date().toISOString(),
        })
        .select()
        .single();

      if (insertConvError) {
        console.error('Error creando conversación:', insertConvError);
        throw insertConvError;
      }

      if (!conversation) {
        throw new Error('No se pudo crear la conversación');
      }

      console.log(`Conversación creada: ${conversation.id}`);
      return conversation;
    } catch (error) {
      console.error('Error en findOrCreateConversation:', error);
      throw error;
    }
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
    console.log(`Procesando selección de menú principal: "${selection}"`);
    const option = findMainMenuOption(selection);

    if (!option) {
      console.log(`Opción "${selection}" no encontrada en menú principal, mostrando menú principal`);
      // Opción inválida, mostrar menú principal
      return await this.showMainMenu(conversationId, phone);
    }

    console.log(`Opción encontrada: ${option.label} (${option.area}), mostrando submenú`);
    // Mostrar submenú
    const submenuText = getSubmenuText(option.area!);
    
    console.log(`Guardando mensaje del sistema con submenú`);
    await this.saveMessage(conversationId, 'system', submenuText);
    await this.updateMenuState(conversationId, option.area!);
    console.log(`Enviando submenú por WhatsApp`);
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
    console.log(`Procesando selección de submenú: "${selection}" en área "${area}"`);
    const option = findSubmenuOption(area, selection);

    if (!option) {
      console.log(`Opción "${selection}" no encontrada en submenú de "${area}"`);
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

    console.log(`Opción encontrada: ${option.area} - ${option.subarea}, derivando conversación ${conversationId}`);
    
    // Derivar conversación al área correspondiente
    await this.deriveConversation(conversationId, option.area, option.subarea);

    // Enviar mensaje de derivación
    const derivationMessage = `Te derivamos con ${option.area}${option.subarea ? ` - ${option.subarea}` : ''}. Un agente se comunicará contigo pronto. 👋`;
    
    console.log(`Enviando mensaje de derivación: ${derivationMessage}`);
    await this.saveMessage(conversationId, 'system', derivationMessage);
    await this.sendWhatsAppMessage(phone, derivationMessage);
    
    const webhookPayload = {
      conversationId,
      phone,
      area: option.area,
      subarea: option.subarea,
    };
    console.log(`Notificando webhook de área con payload:`, webhookPayload);
    await this.notifyAreaWebhook(option.area, webhookPayload);

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
    console.log(`Derivando conversación ${conversationId} de "PSI Principal" a "${conversationArea}"${subarea ? ` (${subarea})` : ''}`);

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
      console.log(`Subárea "${subarea}" detectada (sistema de etiquetas pendiente)`);
    }

    const { data, error } = await this.supabase
      .from('conversaciones')
      .update(updates)
      .eq('id', conversationId)
      .select();

    if (error) {
      console.error(`Error derivando conversación:`, error);
      throw error;
    }

    console.log(`Conversación derivada exitosamente. Actualizada:`, data?.[0]);
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
    console.log(`Guardando mensaje en conversación ${conversationId}, remitente: ${remitente}, mensaje (primeros 50 chars): ${mensaje.substring(0, 50)}`);
    
    const { data, error } = await this.supabase
      .from('mensajes')
      .insert({
        conversacion_id: conversationId,
        mensaje,
        remitente,
        timestamp: new Date().toISOString(),
        metadata,
      })
      .select();

    if (error) {
      console.error('Error guardando mensaje:', error);
      throw error;
    }

    console.log(`Mensaje guardado exitosamente:`, data?.[0]?.id);

    // Actualizar última actividad
    const { error: updateError } = await this.supabase
      .from('conversaciones')
      .update({
        ts_ultimo_mensaje: new Date().toISOString(),
        updated_at: new Date().toISOString(),
      })
      .eq('id', conversationId);

    if (updateError) {
      console.error('Error actualizando conversación:', updateError);
    }
  }

  private async getMenuState(conversationId: string): Promise<MenuState | null> {
    // Obtener últimos mensajes para determinar estado (sin filtrar por remitente ya que la columna puede no existir)
    const { data: lastMessages, error } = await this.supabase
      .from('mensajes')
      .select('*')
      .eq('conversacion_id', conversationId)
      .order('timestamp', { ascending: false })
      .limit(10); // Obtener últimos 10 mensajes para buscar el del sistema

    if (error && error.code !== 'PGRST116') {
      console.error('Error obteniendo estado del menú:', error);
    }

    console.log(`Buscando estado del menú en conversación ${conversationId}, encontré ${lastMessages?.length || 0} mensajes`);

    if (!lastMessages || lastMessages.length === 0) {
      console.log(`No hay mensajes, asumiendo menú principal`);
      return { conversationId, currentMenu: 'main', lastInteraction: new Date() };
    }

    console.log(`Últimos mensajes encontrados (primeros 3):`, lastMessages.slice(0, 3).map(m => ({
      id: m.id,
      mensaje: (m.mensaje || '').substring(0, 50),
      timestamp: m.timestamp
    })));

    // Buscar el último mensaje del sistema (que contiene texto de menú)
    // Los mensajes del sistema tienen texto que empieza con "¡Hola!" o nombres de áreas
    let lastSystemMessage = null;
    for (const msg of lastMessages) {
      const messageText = msg.mensaje || '';
      // Detectar si es mensaje del sistema por el contenido
      if (messageText.includes('¡Hola! 👋') || 
          messageText.startsWith('Administración:') ||
          messageText.startsWith('Alumnos:') ||
          messageText.startsWith('Inscripciones:') ||
          messageText.startsWith('Comunidad:') ||
          messageText.includes('Te derivamos con')) {
        lastSystemMessage = msg;
        break;
      }
    }

    if (!lastSystemMessage) {
      console.log(`No se encontró mensaje del sistema en los últimos mensajes, asumiendo menú principal`);
      return { conversationId, currentMenu: 'main', lastInteraction: new Date() };
    }

    // Determinar menú actual basado en el contenido del mensaje
    const messageText = lastSystemMessage.mensaje || '';
    console.log(`Último mensaje del sistema (primeros 100 chars): ${messageText.substring(0, 100)}`);
    
    if (messageText.includes('¡Hola! 👋')) {
      console.log(`Detectado menú principal por "¡Hola! 👋"`);
      return { conversationId, currentMenu: 'main', lastInteraction: new Date(lastSystemMessage.timestamp) };
    }

    if (messageText.includes('Te derivamos con')) {
      // Si ya se derivó, el menú vuelve al principal
      console.log(`Conversación ya derivada, asumiendo menú principal`);
      return { conversationId, currentMenu: 'main', lastInteraction: new Date(lastSystemMessage.timestamp) };
    }

    // Detectar área del submenú
    const areas: MenuArea[] = ['Administración', 'Alumnos', 'Inscripciones', 'Comunidad'];
    for (const area of areas) {
      if (messageText.startsWith(area + ':')) {
        console.log(`Detectado submenú de "${area}" porque el mensaje empieza con "${area}:"`);
        return { conversationId, currentMenu: area, lastInteraction: new Date(lastSystemMessage.timestamp) };
      }
    }

    console.log(`No se detectó área específica, asumiendo menú principal`);
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

