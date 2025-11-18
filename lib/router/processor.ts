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
      console.log(`🚀 RouterProcessor.processMessage iniciado`);
      console.log(`   - From: ${message.from}`);
      console.log(`   - Message: ${message.message?.substring(0, 100)}`);
      console.log(`   - Type: ${message.type}`);
      
      const phone = message.from;
      const originalText = message.message || '';
      const normalizedCommand = originalText.trim().toUpperCase();
      
      console.log(`   - Comando normalizado: "${normalizedCommand}"`);

      // Buscar o crear conversación
      console.log(`🔍 Buscando o creando conversación para ${phone}`);
      const conversation = await this.findOrCreateConversation(phone);

      if (!conversation) {
        console.error(`❌ No se pudo obtener o crear conversación para ${phone}`);
        return { success: false, message: 'Error al procesar conversación' };
      }
      
      console.log(`✅ Conversación encontrada/creada: ${conversation.id} (área: ${conversation.area})`);

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

      // Verificar si es la primera interacción (no hay mensajes del sistema previos)
      const hasSystemMessages = await this.hasSystemMessages(conversation.id);
      
      if (!hasSystemMessages) {
        // Primera interacción: mostrar menú principal automáticamente
        console.log(`Primera interacción detectada, mostrando menú principal`);
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
    try {
      const menuText = getMainMenuText();
      console.log(`📋 Mostrando menú principal para conversación ${conversationId}`);
      
      // Guardar mensaje del sistema ANTES de enviarlo
      await this.saveMessage(conversationId, 'system', menuText);
      // Pequeño delay para asegurar que se guardó
      await new Promise(resolve => setTimeout(resolve, 100));
      
      // Actualizar estado del menú
      await this.updateMenuState(conversationId, 'main');

      // Enviar mensaje
      await this.sendWhatsAppMessage(phone, menuText);

      console.log(`✅ Menú principal mostrado exitosamente`);
      return {
        success: true,
        message: menuText,
        conversationId,
      };
    } catch (error: any) {
      console.error('❌ Error mostrando menú principal:', error);
      return {
        success: false,
        message: `Error al mostrar menú: ${error.message}`,
        conversationId,
      };
    }
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
    // Guardar mensaje ANTES de enviarlo
    await this.saveMessage(conversationId, 'system', submenuText);
    // Pequeño delay para asegurar que se guardó
    await new Promise(resolve => setTimeout(resolve, 100));
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
    
    // Derivar conversación al área correspondiente (crea ticket)
    const ticket = await this.deriveConversation(conversationId, option.area, option.subarea);
    const ticketNumero = ticket?.ticket_numero || 'PSI-XXXXXX';
    const tiempoRespuesta = this.obtenerTiempoRespuesta(this.mapMenuAreaToConversationArea(option.area));

    // Enviar mensaje de derivación con número de ticket
    const derivationMessage = `✅ Te derivamos con *${option.area}*${option.subarea ? ` - ${option.subarea}` : ''}



📋 *Número de ticket:* ${ticketNumero}

🕐 *Tiempo estimado de respuesta:* ${tiempoRespuesta}



En breve se pondrán en contacto contigo. 👋`;
    
    console.log(`Enviando mensaje de derivación con ticket ${ticketNumero}`);
    // Guardar mensaje de derivación ANTES de enviarlo
    await this.saveMessage(conversationId, 'system', derivationMessage);
    // Pequeño delay para asegurar que se guardó
    await new Promise(resolve => setTimeout(resolve, 100));
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

  private async generateTicketNumber(): Promise<string> {
    const año = new Date().getFullYear();
    
    // Obtener último número del año desde ticket_id (que es TEXT en la tabla real)
    const { data: ultimo } = await this.supabase
      .from('derivaciones')
      .select('ticket_id')
      .ilike('ticket_id', `PSI-${año}-%`)
      .order('created_at', { ascending: false })
      .limit(1)
      .maybeSingle();
      
    let siguiente = 1;
    if (ultimo?.ticket_id) {
      const partes = ultimo.ticket_id.split('-');
      if (partes.length === 3) {
        siguiente = parseInt(partes[2]) + 1;
      }
    }
    
    return `PSI-${año}-${siguiente.toString().padStart(6, '0')}`;
  }

  private async obtenerHistorialCompleto(conversationId: string): Promise<any[]> {
    const { data: mensajes, error } = await this.supabase
      .from('mensajes')
      .select('*')
      .eq('conversacion_id', conversationId)
      .order('timestamp', { ascending: true });

    if (error) {
      console.error('Error obteniendo historial:', error);
      return [];
    }

    return mensajes || [];
  }

  private determinarPrioridad(motivo: string, historial: any[]): string {
    // Lógica simple: si hay muchas interacciones o palabras clave, alta prioridad
    const palabrasUrgentes = ['urgente', 'problema', 'error', 'no funciona', 'no puedo'];
    const motivoLower = motivo.toLowerCase();
    
    if (palabrasUrgentes.some(p => motivoLower.includes(p)) || historial.length > 10) {
      return 'Alta';
    }
    
    return 'Normal';
  }

  private obtenerTiempoRespuesta(area: string): string {
    const tiempos: Record<string, string> = {
      'Administración': '2-4 horas',
      'Alumnos': '1-2 horas',
      'Ventas': '30 minutos - 1 hora',
      'Comunidad': '1-2 horas',
    };
    
    return tiempos[area] || '2-4 horas';
  }

  private getApiDestino(area: string): string {
    // Mapear área a API destino (webhook n8n)
    const apiDestinos: Record<string, string> = {
      'Administración': process.env.N8N_WEBHOOK_ENVIOS_ROUTER_ADMINISTRACION || '',
      'Alumnos': process.env.N8N_WEBHOOK_ENVIOS_ROUTER_ALUMNOS || '',
      'Ventas': process.env.N8N_WEBHOOK_ENVIOS_ROUTER_VENTAS_1 || '',
      'Comunidad': process.env.N8N_WEBHOOK_ENVIOS_ROUTER_COMUNIDAD || '',
    };
    
    return apiDestinos[area] || '';
  }

  private async deriveConversation(
    conversationId: string,
    area: MenuArea,
    subarea?: string
  ) {
    // Mapear área del menú a área de conversación
    const conversationArea = this.mapMenuAreaToConversationArea(area);
    console.log(`🎫 Derivando conversación ${conversationId} de "PSI Principal" a "${conversationArea}"${subarea ? ` (${subarea})` : ''}`);

    try {
      // 1. Obtener conversación actual
      const { data: conversacion, error: convError } = await this.supabase
        .from('conversaciones')
        .select('*')
        .eq('id', conversationId)
        .single();

      if (convError || !conversacion) {
        throw new Error(`No se pudo obtener conversación: ${convError?.message}`);
      }

      // 2. Obtener historial completo
      const historialCompleto = await this.obtenerHistorialCompleto(conversationId);
      
      // 3. Generar número de ticket
      const ticketNumero = await this.generateTicketNumber();
      console.log(`🎫 Ticket generado: ${ticketNumero}`);
      
      // Verificar si ya existe un ticket para esta conversación
      const { data: ticketExistente } = await this.supabase
        .from('derivaciones')
        .select('id, ticket_id')
        .eq('conversacion_id', conversationId)
        .eq('status', 'Pendiente')
        .order('created_at', { ascending: false })
        .limit(1)
        .maybeSingle();
      
      if (ticketExistente) {
        console.log(`⚠️ Ya existe un ticket pendiente para esta conversación: ${ticketExistente.ticket_id}`);
        // Reutilizar ticket existente o crear uno nuevo según lógica de negocio
      }

      // 4. Crear motivo de derivación
      const motivo = subarea 
        ? `${area} - ${subarea}`
        : `${area}`;

      // 5. Crear ticket usando la estructura real de derivaciones
      // La tabla real tiene: ticket_id (text), area (text), inbox_destino, api_destino, payload (jsonb), status
      const { data: ticket, error: ticketError } = await this.supabase
        .from('derivaciones')
        .insert({
          ticket_id: ticketNumero, // ticket_id es TEXT en la tabla real
          conversacion_id: conversationId,
          telefono: conversacion.telefono,
          area: conversationArea, // Usar 'area' en lugar de 'area_destino'
          inbox_destino: conversationArea, // Mapear área a inbox
          api_destino: this.getApiDestino(conversationArea),
          subetiqueta: subarea || null,
          status: 'Pendiente', // Usar 'status' en lugar de 'estado'
          payload: {
            // Guardar toda la información de auditoría en payload (JSONB)
            ticket_numero: ticketNumero,
            nombre_contacto: conversacion.nombre || conversacion.telefono,
            area_origen: conversacion.area || 'PSI Principal',
            area_destino: conversationArea,
            motivo: motivo,
            contexto_completo: {
              mensajes: historialCompleto.map(m => ({
                id: m.id,
                mensaje: m.mensaje?.substring(0, 200),
                remitente_tipo: m.remitente_tipo,
                remitente_nombre: m.remitente_nombre,
                timestamp: m.timestamp,
              })),
            menu_recorrido: conversacion.router_estado || (conversacion.metadata as any)?.menu_actual || 'principal',
            submenu_recorrido: conversacion.subetiqueta || (conversacion.metadata as any)?.submenu_actual,
              timestamp_inicio: conversacion.created_at,
              opciones_seleccionadas: this.extraerOpcionesSeleccionadas(historialCompleto),
            },
            prioridad: this.determinarPrioridad(motivo, historialCompleto),
            derivado_por: 'Router Automático',
          },
          ts_derivacion: new Date().toISOString(),
        })
        .select()
        .single();

      if (ticketError || !ticket) {
        console.error('❌ Error creando ticket:', ticketError);
        throw new Error(`No se pudo crear ticket: ${ticketError?.message}`);
      }

      console.log(`✅ Ticket creado exitosamente: ${ticket.id}`);

      // 6. Registrar evento de creación (si la tabla ticket_eventos existe)
      // Si no existe, guardar en metadata de derivaciones
      try {
        await this.supabase.from('ticket_eventos').insert({
          ticket_id: ticket.id,
          evento_tipo: 'creado',
          descripcion: `Ticket creado por derivación automática: ${motivo}`,
          usuario: 'Sistema Router',
          metadata: {
            area_origen: conversacion.area,
            area_destino: conversationArea,
            subarea,
          },
        });
      } catch (error: any) {
        // Si la tabla no existe, guardar evento en payload de derivaciones
        console.log('⚠️ Tabla ticket_eventos no existe, guardando evento en payload');
        await this.supabase
          .from('derivaciones')
          .update({
            payload: {
              ...ticket.payload,
              eventos: [
                ...(ticket.payload?.eventos || []),
                {
                  evento_tipo: 'creado',
                  descripcion: `Ticket creado por derivación automática: ${motivo}`,
                  usuario: 'Sistema Router',
                  timestamp: new Date().toISOString(),
                },
              ],
            },
          })
          .eq('id', ticket.id);
      }

      // 7. Actualizar conversación usando campos reales
      // Usar metadata JSONB para campos que no existen en la tabla
      const metadataActual = conversacion.metadata || {};
      const { error: updateError } = await this.supabase
        .from('conversaciones')
        .update({
          area: conversationArea,
          estado: 'Derivada',
          router_estado: 'derivada', // Usar router_estado en lugar de menu_actual
          subetiqueta: subarea || null, // Usar subetiqueta en lugar de submenu_actual
          ts_ultimo_mensaje: new Date().toISOString(),
          last_message_at: new Date().toISOString(), // Usar last_message_at
          ts_ultima_derivacion: new Date().toISOString(), // Campo real para última derivación
          updated_at: new Date().toISOString(),
          metadata: {
            ...metadataActual,
            // Guardar información de ticket en metadata
            ticket_activo: ticket.id,
            ticket_numero: ticketNumero,
            menu_actual: 'derivada',
            submenu_actual: subarea || null,
            ultima_interaccion: new Date().toISOString(),
          },
        })
        .eq('id', conversationId);

      if (updateError) {
        console.error('⚠️ Error actualizando conversación:', updateError);
      }

      console.log(`✅ Conversación derivada exitosamente con ticket ${ticketNumero}`);
      return ticket;
    } catch (error: any) {
      console.error('❌ Error en deriveConversation:', error);
      throw error;
    }
  }

  private extraerOpcionesSeleccionadas(historial: any[]): string[] {
    // Extraer opciones seleccionadas del historial (números como "1", "2", "22", etc.)
    const opciones: string[] = [];
    for (const msg of historial) {
      if (msg.remitente_tipo === 'user' && msg.mensaje) {
        const texto = msg.mensaje.trim();
        // Si es un número simple (1-9) o doble (11-99), es una opción
        if (/^[1-9]$|^[1-9][0-9]$/.test(texto)) {
          opciones.push(texto);
        }
      }
    }
    return opciones;
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
    // Determinar remitente_tipo y remitente_nombre basado en el valor de remitente
    let remitente_tipo: string;
    let remitente_nombre: string;
    
    if (remitente === 'system') {
      remitente_tipo = 'system';
      remitente_nombre = 'Router PSI';
    } else if (remitente.match(/^549\d+$/)) {
      // Es un número de teléfono (usuario)
      remitente_tipo = 'user';
      remitente_nombre = remitente;
    } else {
      // Asumir que es un agente o email
      remitente_tipo = 'agent';
      remitente_nombre = remitente;
    }
    
    console.log(`💾 Guardando mensaje en conversación ${conversationId}, remitente_tipo: ${remitente_tipo}, remitente_nombre: ${remitente_nombre}, mensaje (primeros 50 chars): ${mensaje.substring(0, 50)}`);
    
    try {
      const { data, error } = await this.supabase
        .from('mensajes')
        .insert({
          conversacion_id: conversationId,
          mensaje,
          remitente_tipo,
          remitente_nombre,
          // Mantener remitente para compatibilidad si existe la columna
          ...(remitente && { remitente }),
          timestamp: new Date().toISOString(),
          metadata,
        })
        .select();

      if (error) {
        console.error('❌ Error guardando mensaje en Supabase:', error);
        console.error('   - Código:', error.code);
        console.error('   - Mensaje:', error.message);
        console.error('   - Detalles:', error.details);
        console.error('   - Hint:', error.hint);
        throw error;
      }

      if (!data || data.length === 0) {
        console.error('❌ No se retornó data después de insertar mensaje');
        throw new Error('No se pudo guardar el mensaje - sin data retornada');
      }

      console.log(`✅ Mensaje guardado exitosamente en Supabase. ID: ${data[0]?.id}`);

      // Actualizar última actividad
      const { error: updateError } = await this.supabase
        .from('conversaciones')
        .update({
          ts_ultimo_mensaje: new Date().toISOString(),
          updated_at: new Date().toISOString(),
        })
        .eq('id', conversationId);

      if (updateError) {
        console.error('⚠️ Error actualizando conversación (no crítico):', updateError);
      } else {
        console.log(`✅ Conversación actualizada con ts_ultimo_mensaje`);
      }
    } catch (error: any) {
      console.error('❌ Error crítico en saveMessage:', error);
      throw error; // Re-lanzar para que el caller sepa que falló
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
      console.log(`Revisando mensaje: remitente_tipo=${msg.remitente_tipo || 'N/A'}, remitente_nombre=${msg.remitente_nombre || 'N/A'}, texto="${messageText.substring(0, 50)}"`);
      
      // Detectar si es mensaje del sistema por el tipo o por contenido
      const isSystemMessage = 
        msg.remitente_tipo === 'system' ||
        messageText.includes('¡Hola! 👋') || 
        messageText.startsWith('Administración:') ||
        messageText.startsWith('Alumnos:') ||
        messageText.startsWith('Inscripciones:') ||
        messageText.startsWith('Comunidad:') ||
        messageText.includes('Te derivamos con') ||
        messageText.includes('Número de ticket:');
      
      if (isSystemMessage) {
        console.log(`Mensaje del sistema encontrado: ${messageText.substring(0, 50)}`);
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
    // Actualizar router_estado en conversaciones usando campos reales
    const estado = menu === 'main' ? 'principal' : menu;
    
    // Obtener metadata actual
    const { data: conv } = await this.supabase
      .from('conversaciones')
      .select('metadata')
      .eq('id', conversationId)
      .single();
    
    const metadataActual = (conv?.metadata as any) || {};
    
    const { error } = await this.supabase
      .from('conversaciones')
      .update({
        router_estado: estado,
        metadata: {
          ...metadataActual,
          menu_actual: estado,
        },
      })
      .eq('id', conversationId);
    
    if (error) {
      console.error('⚠️ Error actualizando estado del menú:', error);
    }
  }

  private async hasSystemMessages(conversationId: string): Promise<boolean> {
    // Verificar si hay mensajes del sistema previos (antes del mensaje actual)
    const { data: systemMessages, error } = await this.supabase
      .from('mensajes')
      .select('id')
      .eq('conversacion_id', conversationId)
      .eq('remitente_tipo', 'system')
      .limit(1);

    if (error && error.code !== 'PGRST116') {
      console.error('Error verificando mensajes del sistema:', error);
      // En caso de error, asumir que no hay mensajes del sistema para mostrar el menú
      return false;
    }

    return (systemMessages && systemMessages.length > 0) || false;
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
      console.error('❌ WhatsApp Cloud API no configurada - CLOUD_API_TOKEN o CLOUD_API_PHONE_NUMBER_ID faltantes');
      return;
    }

    const sanitizedNumber = to.replace(/[^0-9]/g, '');
    const url = `${CLOUD_API_BASE_URL}/${CLOUD_API_PHONE_NUMBER_ID}/messages`;

    console.log(`📤 Enviando mensaje WhatsApp a ${sanitizedNumber} (primeros 50 chars): ${message.substring(0, 50)}...`);

    try {
      const response = await fetch(url, {
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

      const responseData = await response.json();

      if (!response.ok) {
        console.error(`❌ Error enviando mensaje WhatsApp (${response.status}):`, responseData);
        throw new Error(`WhatsApp API error: ${JSON.stringify(responseData)}`);
      }

      console.log(`✅ Mensaje WhatsApp enviado exitosamente:`, responseData);
      return responseData;
    } catch (error: any) {
      console.error('❌ Error sending WhatsApp message:', error);
      throw error; // Re-lanzar para que el caller sepa que falló
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

