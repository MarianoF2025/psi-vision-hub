import { supabaseAdmin } from '../config/supabase';
import { Logger } from '../utils/logger';
import { Area } from '../models/enums';
import { Contacto, Conversacion, Mensaje } from '../models/types';

class DatabaseService {
  async buscarOCrearContacto(telefono: string, datos?: Partial<Contacto>): Promise<Contacto> {
    const { data, error } = await supabaseAdmin
      .from('contactos')
      .select('*')
      .eq('telefono', telefono)
      .maybeSingle();

    if (error) {
      Logger.error('Error buscando contacto', { error });
      throw error;
    }

    if (data) return data as Contacto;

    const nuevo = {
      telefono,
      nombre: datos?.nombre || telefono,
      ...datos,
    } as Contacto;

    const { data: insertData, error: insertError } = await supabaseAdmin
      .from('contactos')
      .insert(nuevo)
      .select()
      .single();

    if (insertError) {
      Logger.error('Error creando contacto', { insertError });
      throw insertError;
    }

    return insertData as Contacto;
  }

  async buscarOCrearConversacion(
    telefono: string,
    numeroOrigen: string,
    area: Area = Area.PSI_PRINCIPAL
  ): Promise<Conversacion> {
    const { data, error } = await supabaseAdmin
      .from('conversaciones')
      .select('*')
      .eq('telefono', telefono)
      .order('ts_ultimo_mensaje', { ascending: false })
      .limit(1)
      .maybeSingle();

    if (error) {
      Logger.error('Error buscando conversaci�n', { error });
      throw error;
    }

    if (data) return data as Conversacion;

    const contacto = await this.buscarOCrearContacto(telefono, {});

    // Mapear área a inbox_id
    // WSP4 (ADMINISTRACION) usa inbox_id 79828
    // VENTAS1 usa inbox_id 81935
    const inboxIdMap: Partial<Record<Area, number | null>> = {
      [Area.PSI_PRINCIPAL]: null,
      [Area.ADMINISTRACION]: 79828, // WSP4 inbox_id
      [Area.VENTAS1]: 81935,
    };
    const inbox_id = inboxIdMap[area] || null;
    const inbox_destino = area === Area.PSI_PRINCIPAL ? 'psi_principal' : area;

    const { data: convData, error: convError } = await supabaseAdmin
      .from('conversaciones')
      .insert({
        contacto_id: contacto.id,
        telefono,
        area,
        numero_origen: numeroOrigen,
        numero_activo: numeroOrigen,
        ts_ultimo_mensaje: new Date().toISOString(),
        estado: 'nueva',
        router_estado: 'PSI Principal',
        inbox_id: inbox_id,
        inbox_destino,
        derivado_a: area === Area.PSI_PRINCIPAL ? null : area,
      })
      .select()
      .single();

    if (convError) {
      Logger.error('Error creando conversaci�n', { convError });
      throw convError;
    }

    return convData as Conversacion;
  }

  async saveMessage(message: Mensaje) {
    // Determinar si es mensaje del usuario o del sistema
    const isSystem = message.remitente === 'system';
    const direccion = isSystem ? 'outbound' : 'inbound';
    const remitente_tipo = isSystem ? 'system' : 'user';
    
    // Obtener el teléfono: del mensaje o de la conversación
    let telefono = message.telefono;
    if (!telefono) {
      // Si no viene en el mensaje, obtenerlo de la conversación
      const { data: conv } = await supabaseAdmin
        .from('conversaciones')
        .select('telefono')
        .eq('id', message.conversacion_id)
        .single();
      telefono = conv?.telefono || message.remitente;
    }

    // Timestamp: usar el del mensaje o el actual
    const timestamp = message.timestamp || new Date().toISOString();

    const mensajeData = {
      conversacion_id: message.conversacion_id,
      remitente: message.remitente,
      tipo: message.tipo,
      mensaje: message.mensaje || '',
      telefono: telefono,
      direccion: direccion,
      remitente_tipo: remitente_tipo,
      timestamp: timestamp,
      whatsapp_message_id: message.whatsapp_message_id,
      metadata: message.metadata || {},
      created_at: timestamp,
    };

    const { data, error } = await supabaseAdmin
      .from('mensajes')
      .insert(mensajeData)
      .select()
      .single();

    if (error) {
      Logger.error('Error guardando mensaje', { error, message: mensajeData });
      throw error;
    }

    Logger.info('Mensaje guardado en Supabase', {
      mensajeId: data?.id,
      conversacionId: message.conversacion_id,
      remitente: message.remitente,
      remitente_tipo,
      direccion,
      telefono,
      tipo: message.tipo,
    });

    await supabaseAdmin
      .from('conversaciones')
      .update({
        ts_ultimo_mensaje: timestamp,
        updated_at: new Date().toISOString(),
        ultimo_mensaje: message.mensaje || '',
      })
      .eq('id', message.conversacion_id);

    return data;
  }

  async saveReactionFromWebhook(params: {
    conversacionId: string;
    contactoId?: string | null;
    telefono: string;
    whatsappMessageId: string;
    emoji: string;
    action?: string;
    timestamp?: string;
  }) {
    try {
      const { data: targetMessage, error: targetError } = await supabaseAdmin
        .from('mensajes')
        .select('id')
        .eq('whatsapp_message_id', params.whatsappMessageId)
        .maybeSingle();

      if (targetError) {
        Logger.error('Error buscando mensaje para reacción', { error: targetError });
        return;
      }

      if (!targetMessage) {
        Logger.warn('No se encontró mensaje para asociar reacción entrante', {
          whatsapp_message_id: params.whatsappMessageId,
          conversacionId: params.conversacionId,
        });
        return;
      }

      const isRemoval = (params.action || '').toLowerCase() === 'remove' || (params.action || '').toLowerCase() === 'removed';

      if (isRemoval) {
        await supabaseAdmin
          .from('mensaje_reacciones')
          .delete()
          .eq('mensaje_id', targetMessage.id)
          .eq('autor_telefono', params.telefono)
          .eq('emoji', params.emoji);
        return;
      }

      await supabaseAdmin
        .from('mensaje_reacciones')
        .upsert(
          {
            mensaje_id: targetMessage.id,
            emoji: params.emoji,
            autor_tipo: 'contacto',
            autor_telefono: params.telefono,
            contacto_id: params.contactoId || null,
            created_at: params.timestamp || new Date().toISOString(),
          },
          {
            onConflict: 'mensaje_id,autor_telefono,emoji',
          }
        );
    } catch (error) {
      Logger.error('Error guardando reacción entrante', {
        error,
        conversacionId: params.conversacionId,
        whatsapp_message_id: params.whatsappMessageId,
      });
    }
  }

  async updateConversacion(id: string, updates: Partial<Conversacion>) {
    // Filtrar solo campos válidos de Conversacion para evitar errores de tipo
    const validFields: (keyof Conversacion)[] = [
      'area',
      'estado',
      'router_estado',
      'submenu_actual',
      'bypass_wsp4',
      'numero_origen',
      'numero_activo',
      'ventana_24h_activa',
      'ventana_24h_inicio',
      'ventana_72h_activa',
      'ventana_72h_inicio',
      'es_lead_meta',
      'metadata',
      'ultimo_menu_enviado',
      'ticket_id',
      'countdown_24h',
      'ts_derivacion',
      'derivado_a',
      'inbox_destino',
      'inbox_id',
    ];

    // Campos que son timestamps y deben ser strings ISO válidos
    const timestampFields = ['ventana_24h_inicio', 'ventana_72h_inicio', 'countdown_24h', 'ts_derivacion'];

    const filteredUpdates: Record<string, any> = {
      updated_at: new Date().toISOString(),
    };

    // Solo incluir campos válidos del tipo Conversacion
    for (const key of validFields) {
      if (key in updates && updates[key] !== undefined) {
        const value = updates[key];
        
        // Validar que los campos timestamp sean strings ISO válidos
        if (timestampFields.includes(key)) {
          if (typeof value === 'string' && value !== '') {
            // Verificar que sea una fecha válida
            const date = new Date(value);
            if (isNaN(date.getTime())) {
              Logger.warn(`Campo timestamp inválido ignorado: ${key} = ${value}`, { id, updates });
              continue; // Saltar este campo
            }
            filteredUpdates[key] = value;
          } else if (value === null) {
            filteredUpdates[key] = null;
          } else {
            Logger.warn(`Valor no válido para timestamp ${key}: ${value}`, { id, updates });
            continue; // Saltar este campo
          }
        } else {
          // Para campos no-timestamp, validar que no sean strings asignados a campos timestamp
          // Esto previene asignar 'principal' a campos como ts_principal si existieran
          filteredUpdates[key] = value;
        }
      }
    }

    // Log detallado antes del update para debugging
    Logger.info('Actualizando conversación', { 
      id, 
      camposActualizados: Object.keys(filteredUpdates),
      valores: Object.fromEntries(
        Object.entries(filteredUpdates).map(([k, v]) => [
          k, 
          typeof v === 'string' && v.length > 50 ? v.substring(0, 50) + '...' : v
        ])
      )
    });

    const { data, error } = await supabaseAdmin
      .from('conversaciones')
      .update(filteredUpdates)
      .eq('id', id)
      .select()
      .single();

    if (error) {
      Logger.error('Error actualizando conversaci�n', { error });
      throw error;
    }

    return data as Conversacion;
  }

  async checkAntiLoop(conversacionId: string, windowMinutes: number): Promise<boolean> {
    const { data, error } = await supabaseAdmin
      .from('mensajes')
      .select('created_at')
      .eq('conversacion_id', conversacionId)
      .order('created_at', { ascending: false })
      .limit(1);

    if (error) {
      Logger.error('Error verificando anti-loop', { error });
      return false;
    }

    if (!data || !data.length) return false;

    const last = new Date(data[0].created_at);
    const diffMinutes = (Date.now() - last.getTime()) / 60000;
    return diffMinutes < windowMinutes;
  }

  async registrarAuditLog(entry: {
    conversacion_id: string;
    accion: string;
    area_destino?: string;
    ticket_id?: string;
    metadata?: Record<string, any>;
  }) {
    const payload = {
      ...entry,
      metadata: entry.metadata || {},
      created_at: new Date().toISOString(),
    };

    const { error } = await supabaseAdmin.from('audit_log').insert(payload);

    if (error) {
      Logger.error('Error registrando audit log', { error, payload });
      throw error;
    }

    return payload;
  }
}

export const databaseService = new DatabaseService();
