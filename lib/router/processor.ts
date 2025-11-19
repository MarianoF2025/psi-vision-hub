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

// Anti-loop: Solo bloquear mensajes si la última interacción fue hace menos de 30 segundos
// Esto previene procesar el mismo mensaje múltiples veces sin bloquear interacciones normales
const ANTI_LOOP_SECONDS = 30;

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
  private supabase: any; // Usar any temporalmente para evitar errores de tipo con Supabase

  constructor() {
    console.log(`🔧 RouterProcessor.constructor INICIADO`);
    
    // Validar configuración ANTES de crear cliente
    const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL;
    const supabaseKey = process.env.SUPABASE_SERVICE_ROLE_KEY || process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY;
    
    console.log(`🔍 Validando configuración de Supabase...`);
    console.log(`   - URL presente: ${!!supabaseUrl}`);
    console.log(`   - URL valor: ${supabaseUrl ? supabaseUrl.substring(0, 30) + '...' : 'N/A'}`);
    console.log(`   - Key presente: ${!!supabaseKey}`);
    console.log(`   - Key tipo: ${process.env.SUPABASE_SERVICE_ROLE_KEY ? 'SERVICE_ROLE_KEY' : 'ANON_KEY'}`);
    
    if (!supabaseUrl || supabaseUrl === 'https://placeholder.supabase.co') {
      console.error('❌ ERROR CRÍTICO: NEXT_PUBLIC_SUPABASE_URL no configurado');
      throw new Error('NEXT_PUBLIC_SUPABASE_URL no está configurado');
    }
    
    if (!supabaseKey) {
      console.error('❌ ERROR CRÍTICO: SUPABASE_SERVICE_ROLE_KEY o NEXT_PUBLIC_SUPABASE_ANON_KEY no configurado');
      throw new Error('Clave de Supabase no está configurada');
    }
    
    console.log(`✅ Configuración validada, creando cliente Supabase...`);
    // Crear cliente DESPUÉS de validar
    this.supabase = createClient(supabaseUrl, supabaseKey);
    
    console.log(`✅ RouterProcessor inicializado correctamente`);
    console.log(`   - Supabase URL: ${supabaseUrl.substring(0, 30)}...`);
    console.log(`   - Usando clave: ${process.env.SUPABASE_SERVICE_ROLE_KEY ? 'SERVICE_ROLE_KEY' : 'ANON_KEY'}`);
  }

  async processMessage(message: WhatsAppMessage): Promise<RouterResponse> {
    const startTime = Date.now();
    try {
      console.log(`🚀🚀🚀 RouterProcessor.processMessage INICIADO 🚀🚀🚀`);
      console.log(`   - Timestamp: ${new Date().toISOString()}`);
      console.log(`   - From: ${message.from}`);
      console.log(`   - Message: ${message.message?.substring(0, 100)}`);
      console.log(`   - Type: ${message.type}`);
      console.log(`   - MessageId: ${message.messageId || 'N/A'}`);
      
      // VALIDACIÓN TEMPRANA DE ENTRADA
      console.log(`🔍 VALIDANDO ENTRADA...`);
      if (!message.from) {
        console.error(`❌ ERROR: Mensaje sin campo 'from'`);
        return { success: false, message: 'Mensaje sin remitente' };
      }
      
      if (!this.isValidPhone(message.from)) {
        console.error(`❌ ERROR: Número de teléfono inválido: ${message.from}`);
        return { success: false, message: 'Número de teléfono inválido' };
      }
      
      console.log(`✅ Validación de entrada exitosa`);
      
      const phone = message.from;
      const originalText = message.message || '';
      const normalizedCommand = originalText.trim().toUpperCase();
      
      console.log(`   - Comando normalizado: "${normalizedCommand}"`);
      console.log(`   - Longitud del mensaje: ${originalText.length} caracteres`);

      // Buscar o crear conversación
      console.log(`🔍 Buscando o creando conversación para ${phone}`);
      const conversation = await this.findOrCreateConversation(phone);

      if (!conversation) {
        console.error(`❌ No se pudo obtener o crear conversación para ${phone}`);
        return { success: false, message: 'Error al procesar conversación' };
      }
      
      console.log(`✅ Conversación encontrada/creada: ${conversation.id} (área: ${conversation.area})`);

      // Verificar anti-loop
      console.log(`🔄 Verificando anti-loop para conversación ${conversation.id}...`);
      const lastInteraction = await this.getLastInteraction(conversation.id);
      console.log(`📅 Última interacción:`, lastInteraction ? lastInteraction.toISOString() : 'N/A');
      if (lastInteraction && this.isWithinAntiLoopWindow(lastInteraction)) {
        // Ignorar mensaje si está dentro de la ventana anti-loop
        console.log(`⏸️ Anti-loop activo, ignorando mensaje`);
        return { 
          success: true, 
          message: 'Mensaje procesado (anti-loop activo)',
          conversationId: conversation.id 
        };
      }
      console.log(`✅ Anti-loop no activo, continuando con procesamiento`);

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

      // Verificar si es la primera interacción ANTES de guardar el mensaje
      // Esto evita que el mensaje del usuario interfiera con la detección
      console.log(`🔍 Verificando si hay mensajes del sistema ANTES de guardar mensaje del usuario...`);
      const hasSystemMessages = await this.hasSystemMessages(conversation.id);
      console.log(`📊 Resultado hasSystemMessages: ${hasSystemMessages}`);
      
      // Guardar mensaje del usuario en la base de datos
      console.log(`💾 Guardando mensaje del usuario en base de datos...`);
      await this.saveMessage(conversation.id, phone, originalText, metadata);
      console.log(`✅ Mensaje del usuario guardado`);
      
      console.log(`📤 Notificando webhook de ingesta...`);
      try {
        const ingestionKey = this.getIngestionKey(conversation.area);
        console.log(`🔑 Clave de ingesta: ${ingestionKey}`);
        await this.notifyIngestionWebhook(ingestionKey, {
          conversationId: conversation.id,
          phone,
          message: originalText,
          media: metadata.media,
        });
        console.log(`✅ Webhook de ingesta notificado`);
      } catch (error: any) {
        console.error(`⚠️ Error notificando webhook de ingesta (no crítico):`, error);
        // Continuar con el procesamiento aunque falle el webhook
      }

      // Procesar comando o selección
      console.log(`🔄🔄🔄 INICIANDO PROCESAMIENTO DE COMANDO/SELECCIÓN`);
      console.log(`   - Comando normalizado: "${normalizedCommand}"`);
      console.log(`   - hasSystemMessages: ${hasSystemMessages}`);
      
      try {
        if (normalizedCommand === 'MENU') {
          console.log(`📋 Comando MENU detectado, mostrando menú principal`);
          return await this.showMainMenu(conversation.id, phone);
        }

        if (normalizedCommand === 'VOLVER') {
          console.log(`↩️ Comando VOLVER detectado, mostrando menú principal`);
          return await this.showMainMenu(conversation.id, phone);
        }

        // Si es la primera interacción (no hay mensajes del sistema previos), mostrar menú automáticamente
        console.log(`🔍 Evaluando si es primera interacción...`);
        console.log(`   - hasSystemMessages: ${hasSystemMessages}`);
        console.log(`   - !hasSystemMessages: ${!hasSystemMessages}`);
        
        if (!hasSystemMessages) {
          // Primera interacción: mostrar menú principal automáticamente
          console.log(`🎯🎯🎯 PRIMERA INTERACCIÓN DETECTADA 🎯🎯🎯`);
          console.log(`   - Sin mensajes del sistema previos`);
          console.log(`   - Ejecutando showMainMenu()...`);
          const result = await this.showMainMenu(conversation.id, phone);
          console.log(`✅ showMainMenu() completado, retornando resultado`);
          return result;
        }
        
        console.log(`➡️ NO es primera interacción, continuando con procesamiento de selección`);

        // Obtener estado del menú
        console.log(`🔍🔍🔍 Obteniendo estado del menú para conversación ${conversation.id}...`);
        let menuState: MenuState | null = null;
        const menuStateStartTime = Date.now();
        
        try {
          console.log(`   - Llamando a getMenuState()...`);
          menuState = await this.getMenuState(conversation.id);
          const menuStateTime = Date.now() - menuStateStartTime;
          console.log(`   - getMenuState() completado en ${menuStateTime}ms`);
          console.log(`📊 Estado del menú detectado:`, JSON.stringify(menuState, null, 2));
          
          if (menuState) {
            console.log(`   - currentMenu: ${menuState.currentMenu}`);
            console.log(`   - lastInteraction: ${menuState.lastInteraction.toISOString()}`);
          } else {
            console.log(`   - menuState es null`);
          }
        } catch (error: any) {
          const menuStateTime = Date.now() - menuStateStartTime;
          console.error(`❌❌❌ ERROR obteniendo estado del menú:`, error);
          console.error(`   - Stack:`, error.stack);
          console.error(`   - Tiempo hasta error: ${menuStateTime}ms`);
          console.log(`⚠️ Continuando con procesamiento asumiendo menú principal`);
        }

        if (!menuState) {
          console.log(`⚠️⚠️⚠️ menuState es NULL - Asumiendo menú principal`);
          console.log(`🔄 Procesando como selección de menú principal: "${normalizedCommand}"`);
          console.log(`   - Llamando a processMainMenuSelection()...`);
          const result = await this.processMainMenuSelection(
            conversation.id,
            phone,
            normalizedCommand
          );
          console.log(`✅ processMainMenuSelection() completado`);
          return result;
        }

        console.log(`📊 Evaluando estado del menú para determinar flujo...`);
        console.log(`   - menuState.currentMenu: "${menuState.currentMenu}"`);
        console.log(`   - Es 'main'?: ${menuState.currentMenu === 'main'}`);

        if (menuState.currentMenu === 'main') {
          console.log(`🔄🔄🔄 Procesando como selección de menú principal: "${normalizedCommand}"`);
          console.log(`   - Llamando a processMainMenuSelection()...`);
          // Procesar selección del menú principal
          const result = await this.processMainMenuSelection(
            conversation.id,
            phone,
            normalizedCommand
          );
          console.log(`✅ processMainMenuSelection() completado`);
          return result;
        } else {
          console.log(`🔄🔄🔄 Procesando como selección de submenú: "${normalizedCommand}" en área "${menuState.currentMenu}"`);
          console.log(`   - Llamando a processSubmenuSelection()...`);
          // Procesar selección del submenú
          const result = await this.processSubmenuSelection(
            conversation.id, 
            phone, 
            normalizedCommand, 
            menuState.currentMenu as MenuArea
          );
          console.log(`✅ processSubmenuSelection() completado`);
          return result;
        }
      } catch (error: any) {
        const totalTime = Date.now() - startTime;
        console.error(`❌❌❌ ERROR CRÍTICO en procesamiento de comando/selección ❌❌❌`);
        console.error(`   - Tiempo hasta error: ${totalTime}ms`);
        console.error(`   - Error:`, error);
        console.error(`   - Mensaje: ${error.message}`);
        console.error(`   - Stack:`, error.stack);
        console.error(`   - Comando: "${normalizedCommand}"`);
        console.error(`   - Conversación: ${conversation.id}`);
        console.error(`   - Teléfono: ${phone}`);
        // Retornar error pero no lanzar excepción para no romper el webhook
        return {
          success: false,
          message: `Error procesando comando: ${error.message}`,
          conversationId: conversation.id,
        };
      }
      
      const totalTime = Date.now() - startTime;
      console.log(`✅✅✅ RouterProcessor.processMessage COMPLETADO exitosamente en ${totalTime}ms ✅✅✅`);
      // Este return nunca debería ejecutarse, pero lo dejamos por seguridad
      return {
        success: false,
        message: 'Flujo completado sin retorno explícito',
        conversationId: conversation.id,
      };
    } catch (error: any) {
      const totalTime = Date.now() - startTime;
      console.error(`❌❌❌ ERROR GENERAL en processMessage ❌❌❌`);
      console.error(`   - Tiempo hasta error: ${totalTime}ms`);
      console.error(`   - Error:`, error);
      console.error(`   - Mensaje: ${error.message}`);
      console.error(`   - Stack:`, error.stack);
      return { success: false, message: `Error al procesar mensaje: ${error.message}` };
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
        // Actualizar conversación existente con nueva actividad
        const { data: updated, error: updateError } = await this.supabase
          .from('conversaciones')
          .update({
            ts_ultimo_mensaje: new Date().toISOString(),
            updated_at: new Date().toISOString(),
            estado: existing.estado === 'nueva' ? 'activa' : existing.estado, // Activar si estaba nueva
          })
          .eq('id', existing.id)
          .select()
          .single();
        
        if (updateError) {
          console.error('⚠️ Error actualizando conversación existente (no crítico):', updateError);
          // Retornar la conversación existente aunque falle la actualización
          return existing;
        }
        
        console.log(`✅ Conversación existente actualizada: ${updated?.id}`);
        return updated || existing;
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
      console.log(`📱 Enviando a teléfono: ${phone}`);
      console.log(`📝 Texto del menú (primeros 100 chars): ${menuText.substring(0, 100)}...`);
      
      // Guardar mensaje del sistema ANTES de enviarlo
      console.log(`💾 Guardando mensaje del sistema en base de datos...`);
      await this.saveMessage(conversationId, 'system', menuText, { type: 'text' });
      // Pequeño delay para asegurar que se guardó
      await new Promise(resolve => setTimeout(resolve, 100));
      console.log(`✅ Mensaje del sistema guardado`);
      
      // Actualizar estado del menú
      console.log(`🔄 Actualizando estado del menú a 'main'...`);
      await this.updateMenuState(conversationId, 'main');
      console.log(`✅ Estado del menú actualizado`);

      // Enviar mensaje por WhatsApp
      console.log(`📤 Enviando mensaje por WhatsApp API...`);
      await this.sendWhatsAppMessage(phone, menuText);
      console.log(`✅ Mensaje enviado por WhatsApp API`);

      console.log(`✅✅✅ Menú principal mostrado exitosamente ✅✅✅`);
      return {
        success: true,
        message: menuText,
        conversationId,
      };
    } catch (error: any) {
      console.error('❌❌❌ Error mostrando menú principal:', error);
      console.error('   - Stack:', error.stack);
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
    console.log(`🔄🔄🔄 processMainMenuSelection INICIADO para selección: "${selection}"`);
    console.log(`   - Conversación: ${conversationId}`);
    console.log(`   - Teléfono: ${phone}`);
    
    const option = findMainMenuOption(selection);
    console.log(`🔍 Opción buscada: "${selection}", resultado:`, option ? `${option.label} (${option.area})` : 'NO ENCONTRADA');

    if (!option) {
      console.log(`⚠️ Opción "${selection}" no encontrada en menú principal, mostrando menú principal`);
      // Opción inválida, mostrar menú principal
      return await this.showMainMenu(conversationId, phone);
    }

    console.log(`✅ Opción encontrada: ${option.label} (${option.area}), mostrando submenú`);
    // Mostrar submenú
    const submenuText = getSubmenuText(option.area!);
    
    console.log(`Guardando mensaje del sistema con submenú`);
    // Guardar mensaje ANTES de enviarlo
    await this.saveMessage(conversationId, 'system', submenuText, { type: 'text' });
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
    await this.saveMessage(conversationId, 'system', derivationMessage, { type: 'text' });
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
    
    // Obtener último número del año desde tabla tickets (ticket_id es TEXT y NO NULL)
    const { data: ultimo } = await this.supabase
      .from('tickets')
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
      
      // Verificar si ya existe un ticket abierto para esta conversación
      const { data: ticketExistente } = await this.supabase
        .from('tickets')
        .select('id, ticket_id, estado')
        .eq('conversacion_id', conversationId)
        .in('estado', ['abierto', 'en_progreso'])
        .order('created_at', { ascending: false })
        .limit(1)
        .maybeSingle();
      
      if (ticketExistente) {
        console.log(`⚠️ Ya existe un ticket abierto para esta conversación: ${ticketExistente.ticket_id}`);
        // Reutilizar ticket existente o crear uno nuevo según lógica de negocio
        // Por ahora, creamos uno nuevo
      }

      // 4. Crear motivo de derivación
      const motivo = subarea 
        ? `${area} - ${subarea}`
        : `${area}`;

      // 5. Crear ticket en tabla tickets (estructura correcta)
      const { data: ticket, error: ticketError } = await this.supabase
        .from('tickets')
        .insert({
          ticket_id: ticketNumero, // ticket_id es TEXT y NO NULL
          conversacion_id: conversationId,
          telefono: conversacion.telefono,
          area: conversationArea,
          origen: 'Router Automático', // default es 'n8n', pero usamos 'Router Automático'
          estado: 'abierto', // default es 'abierto'
          prioridad: this.determinarPrioridad(motivo, historialCompleto),
          metadata: {
            // Guardar toda la información de auditoría en metadata (JSONB)
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
              submenu_recorrido: conversacion.subetiqueta || conversacion.submenu_actual,
              timestamp_inicio: conversacion.created_at,
              opciones_seleccionadas: this.extraerOpcionesSeleccionadas(historialCompleto),
            },
            derivado_por: 'Router Automático',
          },
          ts_abierto: new Date().toISOString(),
        })
        .select()
        .single();

      if (ticketError || !ticket) {
        console.error('❌ Error creando ticket:', ticketError);
        throw new Error(`No se pudo crear ticket: ${ticketError?.message}`);
      }

      console.log(`✅ Ticket creado exitosamente en tabla tickets: ${ticket.id} (${ticket.ticket_id})`);

      // 6. Crear registro en derivaciones para tracking
      const { data: derivacion, error: derivacionError } = await this.supabase
        .from('derivaciones')
        .insert({
          ticket_id: ticketNumero, // Referencia al ticket
          conversacion_id: conversationId,
          telefono: conversacion.telefono,
          area: conversationArea,
          inbox_destino: conversationArea,
          api_destino: this.getApiDestino(conversationArea),
          subetiqueta: subarea || null,
          status: 'enviada', // default es 'enviada'
          payload: {
            ticket_id: ticketNumero,
            motivo: motivo,
            area_origen: conversacion.area || 'PSI Principal',
            area_destino: conversationArea,
          },
          ts_derivacion: new Date().toISOString(),
        })
        .select()
        .single();

      if (derivacionError) {
        console.error('⚠️ Error creando derivación (no crítico):', derivacionError);
      } else {
        console.log(`✅ Derivación creada para tracking: ${derivacion.id}`);
      }

      // 7. Registrar evento en audit_log (si existe)
      try {
        await this.supabase.from('audit_log').insert({
          conversacion_id: conversationId,
          telefono: conversacion.telefono,
          actor: 'Sistema Router',
          accion: 'ticket_creado',
          datos: {
            ticket_id: ticketNumero,
            area_origen: conversacion.area,
            area_destino: conversationArea,
            motivo: motivo,
            subarea,
          },
        });
      } catch (error: any) {
        console.log('⚠️ Error registrando en audit_log (no crítico):', error);
      }

      // 8. Actualizar conversación usando campos reales
      const metadataActual = (conversacion.metadata as any) || {};
      const { error: updateError } = await this.supabase
        .from('conversaciones')
        .update({
          area: conversationArea,
          estado: 'activa', // Mantener 'activa' en lugar de 'Derivada'
          router_estado: 'derivada',
          subetiqueta: subarea || null, // Usar subetiqueta directamente
          submenu_actual: subarea || null, // También actualizar submenu_actual (existe)
          ts_ultimo_mensaje: new Date().toISOString(),
          last_message_at: new Date().toISOString(),
          ultimo_mensaje_at: new Date().toISOString(),
          ts_ultima_derivacion: new Date().toISOString(),
          ultima_derivacion: ticketNumero, // Guardar número de ticket
          updated_at: new Date().toISOString(),
          metadata: {
            ...metadataActual,
            // Guardar información adicional en metadata
            ticket_activo: ticket.id,
            ticket_numero: ticketNumero,
            menu_actual: 'derivada',
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
      if (msg.remitente_tipo === 'contact' && msg.mensaje) {
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
      remitente_tipo = 'contact'; // Consistente con n8n
      remitente_nombre = remitente;
    } else {
      // Asumir que es un agente o email
      remitente_tipo = 'agent';
      remitente_nombre = remitente;
    }
    
    // Mapear tipo desde metadata (WhatsApp Cloud API usa: 'text', 'image', 'audio', 'video', 'document', etc.)
    // El constraint mensajes_tipo_check probablemente acepta estos valores en inglés
    const tipoFromMetadata = metadata?.type || 'text';
    // Asegurar que el tipo sea válido (si viene 'texto' del default, cambiarlo a 'text')
    const tipo = tipoFromMetadata === 'texto' ? 'text' : tipoFromMetadata;
    
    console.log(`💾 Guardando mensaje en conversación ${conversationId}, remitente_tipo: ${remitente_tipo}, remitente_nombre: ${remitente_nombre}, tipo: ${tipo}, mensaje (primeros 50 chars): ${mensaje.substring(0, 50)}`);
    
    try {
      const { data, error } = await this.supabase
        .from('mensajes')
        .insert({
          conversacion_id: conversationId,
          mensaje,
          tipo: tipo, // Agregar campo tipo con valor correcto para el constraint
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

    console.log(`Últimos mensajes encontrados (primeros 3):`, lastMessages.slice(0, 3).map((m: any) => ({
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
    console.log(`🔍🔍🔍 hasSystemMessages INICIADO para conversación ${conversationId}`);
    const startTime = Date.now();
    
    try {
      // Verificar si hay mensajes del sistema previos (antes del mensaje actual)
      console.log(`   - Ejecutando query en Supabase...`);
      const { data: systemMessages, error } = await this.supabase
        .from('mensajes')
        .select('id, remitente_tipo, mensaje, timestamp')
        .eq('conversacion_id', conversationId)
        .eq('remitente_tipo', 'system')
        .order('timestamp', { ascending: false })
        .limit(5);

      const queryTime = Date.now() - startTime;
      console.log(`   - Query completada en ${queryTime}ms`);

      if (error) {
        if (error.code === 'PGRST116') {
          console.log(`   - No hay mensajes del sistema (código PGRST116 - no encontrado)`);
          console.log(`✅ hasSystemMessages COMPLETADO: false (sin mensajes)`);
          return false;
        }
        console.error(`❌ ERROR verificando mensajes del sistema:`, error);
        console.error(`   - Código: ${error.code}`);
        console.error(`   - Mensaje: ${error.message}`);
        console.error(`   - Detalles: ${JSON.stringify(error.details)}`);
        // En caso de error, asumir que no hay mensajes del sistema para mostrar el menú
        console.log(`⚠️ Asumiendo false debido a error`);
        console.log(`✅ hasSystemMessages COMPLETADO: false (error)`);
        return false;
      }

      const hasMessages = (systemMessages && systemMessages.length > 0) || false;
      const totalTime = Date.now() - startTime;
      
      console.log(`📊 Resultado de query:`);
      console.log(`   - Mensajes encontrados: ${systemMessages?.length || 0}`);
      if (systemMessages && systemMessages.length > 0) {
        console.log(`   - Detalles de mensajes:`);
        systemMessages.forEach((m: any, idx: number) => {
          console.log(`     ${idx + 1}. ID: ${m.id}, Preview: ${m.mensaje?.substring(0, 50)}..., Timestamp: ${m.timestamp}`);
        });
      }
      console.log(`   - Tiempo total: ${totalTime}ms`);
      console.log(`✅ hasSystemMessages COMPLETADO: ${hasMessages}`);
      
      return hasMessages;
    } catch (error: any) {
      const totalTime = Date.now() - startTime;
      console.error(`❌❌❌ EXCEPCIÓN en hasSystemMessages:`, error);
      console.error(`   - Stack:`, error.stack);
      console.error(`   - Tiempo hasta error: ${totalTime}ms`);
      console.log(`⚠️ Asumiendo false debido a excepción`);
      console.log(`✅ hasSystemMessages COMPLETADO: false (excepción)`);
      return false;
    }
  }
  
  private isValidPhone(phone: string): boolean {
    // Validar formato básico de teléfono (debe empezar con 549 y tener al menos 10 dígitos)
    return /^549\d{8,}$/.test(phone);
  }

  private async getLastInteraction(conversationId: string): Promise<Date | null> {
    console.log(`🔍 getLastInteraction INICIADO para conversación ${conversationId}`);
    try {
      // CRÍTICO: Solo verificar mensajes del USUARIO (contact), no del sistema
      // El anti-loop debe prevenir spam del usuario, no bloquear respuestas rápidas al menú
      const { data: lastMessage, error } = await this.supabase
        .from('mensajes')
        .select('timestamp, remitente_tipo')
        .eq('conversacion_id', conversationId)
        .neq('remitente_tipo', 'system') // Excluir mensajes del sistema
        .order('timestamp', { ascending: false })
        .limit(1)
        .maybeSingle();

      if (error && error.code !== 'PGRST116') {
        console.error(`❌ Error obteniendo última interacción:`, error);
        console.log(`✅ getLastInteraction COMPLETADO: null (error)`);
        return null;
      }

      const result = lastMessage ? new Date(lastMessage.timestamp) : null;
      console.log(`   - Última interacción del USUARIO: ${result ? result.toISOString() : 'N/A'}`);
      console.log(`   - Tipo del último mensaje: ${lastMessage?.remitente_tipo || 'N/A'}`);
      console.log(`✅ getLastInteraction COMPLETADO: ${result ? result.toISOString() : 'null'}`);
      return result;
    } catch (error: any) {
      console.error(`❌ Excepción en getLastInteraction:`, error);
      console.log(`✅ getLastInteraction COMPLETADO: null (excepción)`);
      return null;
    }
  }

  private isWithinAntiLoopWindow(lastInteraction: Date): boolean {
    const now = new Date();
    const diffSeconds = (now.getTime() - lastInteraction.getTime()) / 1000;
    const isWithin = diffSeconds < ANTI_LOOP_SECONDS;
    
    console.log(`   - Diferencia: ${diffSeconds.toFixed(1)} segundos`);
    console.log(`   - Ventana anti-loop: ${ANTI_LOOP_SECONDS} segundos`);
    console.log(`   - Está dentro de la ventana?: ${isWithin}`);
    
    return isWithin;
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

