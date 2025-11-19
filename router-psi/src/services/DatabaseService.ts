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
    area: Area = Area.ADMINISTRACION
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
        router_estado: 'menu_principal',
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
    const { data, error } = await supabaseAdmin
      .from('mensajes')
      .insert({
        ...message,
        created_at: message.timestamp || new Date().toISOString(),
      })
      .select()
      .single();

    if (error) {
      Logger.error('Error guardando mensaje', { error, message });
      throw error;
    }

    Logger.info('Mensaje guardado en Supabase', {
      mensajeId: data?.id,
      conversacionId: message.conversacion_id,
      remitente: message.remitente,
      tipo: message.tipo,
    });

    await supabaseAdmin
      .from('conversaciones')
      .update({
        ts_ultimo_mensaje: new Date().toISOString(),
        updated_at: new Date().toISOString(),
        ultimo_mensaje: message.mensaje,
      })
      .eq('id', message.conversacion_id);

    return data;
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
    ];

    // Campos que son timestamps y deben ser strings ISO válidos
    const timestampFields = ['ventana_24h_inicio', 'ventana_72h_inicio'];

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
}

export const databaseService = new DatabaseService();
