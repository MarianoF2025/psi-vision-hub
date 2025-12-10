// ===========================================
// MENSAJE SERVICE - Esquema Real Supabase
// Versión 2.1.0 - Agregado whatsapp_context_id para citas
// ===========================================
import { supabase } from '../config/supabase';
import { Mensaje, MensajeInsert } from '../types/database';

export class MensajeService {

  /**
   * Guardar mensaje entrante
   */
  async guardarEntrante(datos: {
    conversacion_id: string;
    mensaje: string;
    whatsapp_message_id?: string;
    whatsapp_context_id?: string;
    media_url?: string;
    media_type?: string;
    menu_mostrado?: string;
    opcion_seleccionada?: string;
  }): Promise<Mensaje> {
    // Si hay context_id, buscar el mensaje original para obtener su UUID
    let mensaje_citado_id: string | null = null;
    if (datos.whatsapp_context_id) {
      const { data: mensajeOriginal } = await supabase
        .from('mensajes')
        .select('id')
        .eq('whatsapp_message_id', datos.whatsapp_context_id)
        .single();
      
      if (mensajeOriginal) {
        mensaje_citado_id = mensajeOriginal.id;
        console.log(`[MensajeService] Mensaje cita encontrado: ${mensaje_citado_id}`);
      }
    }

    const mensajeData: MensajeInsert = {
      conversacion_id: datos.conversacion_id,
      mensaje: datos.mensaje,
      tipo: datos.media_type || 'texto',
      direccion: 'entrante',
      remitente_tipo: 'user',
      whatsapp_message_id: datos.whatsapp_message_id || null,
      whatsapp_context_id: datos.whatsapp_context_id || null,
      mensaje_citado_id: mensaje_citado_id,
      media_url: datos.media_url || null,
      media_type: datos.media_type || null,
      menu_mostrado: datos.menu_mostrado || null,
      opcion_seleccionada: datos.opcion_seleccionada || null,
      metadata: {},
    };

    const { data, error } = await supabase
      .from('mensajes')
      .insert(mensajeData)
      .select()
      .single();

    if (error) {
      console.error('[MensajeService] Error guardando mensaje entrante:', error);
      throw error;
    }

    console.log(`[MensajeService] Mensaje entrante guardado: ${data.id}${mensaje_citado_id ? ' (cita a ' + mensaje_citado_id + ')' : ''}`);
    return data;
  }

  /**
   * Guardar mensaje saliente (respuesta del router o agente)
   */
  async guardarSaliente(datos: {
    conversacion_id: string;
    mensaje: string;
    remitente_tipo?: 'agent' | 'system';
    remitente_id?: string;
    whatsapp_message_id?: string;
    menu_mostrado?: string;
    via_proxy?: boolean;
    area_proxy?: string;
  }): Promise<Mensaje> {
    const mensajeData: MensajeInsert = {
      conversacion_id: datos.conversacion_id,
      mensaje: datos.mensaje,
      tipo: 'texto',
      direccion: 'saliente',
      remitente_tipo: datos.remitente_tipo || 'system',
      remitente_id: datos.remitente_id || null,
      whatsapp_message_id: datos.whatsapp_message_id || null,
      menu_mostrado: datos.menu_mostrado || null,
      via_proxy: datos.via_proxy || false,
      area_proxy: datos.area_proxy || null,
      metadata: {},
    };

    const { data, error } = await supabase
      .from('mensajes')
      .insert(mensajeData)
      .select()
      .single();

    if (error) {
      console.error('[MensajeService] Error guardando mensaje saliente:', error);
      throw error;
    }

    console.log(`[MensajeService] Mensaje saliente guardado: ${data.id}`);
    return data;
  }

  /**
   * Obtener mensajes de una conversación
   */
  async obtenerPorConversacion(
    conversacion_id: string,
    limite: number = 50
  ): Promise<Mensaje[]> {
    const { data, error } = await supabase
      .from('mensajes')
      .select('*')
      .eq('conversacion_id', conversacion_id)
      .order('created_at', { ascending: true })
      .limit(limite);

    if (error) {
      console.error('[MensajeService] Error obteniendo mensajes:', error);
      throw error;
    }

    return data || [];
  }

  /**
   * Obtener último mensaje de una conversación
   */
  async obtenerUltimo(conversacion_id: string): Promise<Mensaje | null> {
    const { data, error } = await supabase
      .from('mensajes')
      .select('*')
      .eq('conversacion_id', conversacion_id)
      .order('created_at', { ascending: false })
      .limit(1)
      .single();

    if (error && error.code !== 'PGRST116') {
      console.error('[MensajeService] Error obteniendo último mensaje:', error);
      throw error;
    }

    return data;
  }

  /**
   * Verificar si mensaje ya existe (por whatsapp_message_id)
   */
  async existePorWhatsAppId(whatsapp_message_id: string): Promise<boolean> {
    if (!whatsapp_message_id) return false;

    const { data, error } = await supabase
      .from('mensajes')
      .select('id')
      .eq('whatsapp_message_id', whatsapp_message_id)
      .single();

    if (error && error.code !== 'PGRST116') {
      console.error('[MensajeService] Error verificando duplicado:', error);
      throw error;
    }

    return !!data;
  }

  /**
   * Marcar mensaje como leído
   */
  async marcarLeido(id: string): Promise<Mensaje> {
    const { data, error } = await supabase
      .from('mensajes')
      .update({ leido: true })
      .eq('id', id)
      .select()
      .single();

    if (error) {
      console.error('[MensajeService] Error marcando como leído:', error);
      throw error;
    }

    return data;
  }

  /**
   * Guardar mensaje de menú mostrado
   */
  async guardarMenuMostrado(datos: {
    conversacion_id: string;
    menu_mostrado: string;
    texto_menu: string;
  }): Promise<Mensaje> {
    return this.guardarSaliente({
      conversacion_id: datos.conversacion_id,
      mensaje: datos.texto_menu,
      remitente_tipo: 'system',
      menu_mostrado: datos.menu_mostrado,
    });
  }

  /**
   * Contar mensajes por conversación
   */
  async contarPorConversacion(conversacion_id: string): Promise<number> {
    const { count, error } = await supabase
      .from('mensajes')
      .select('*', { count: 'exact', head: true })
      .eq('conversacion_id', conversacion_id);

    if (error) {
      console.error('[MensajeService] Error contando mensajes:', error);
      throw error;
    }

    return count || 0;
  }

  /**
   * Obtener historial de opciones seleccionadas en una conversación
   */
  async obtenerHistorialOpciones(conversacion_id: string): Promise<string[]> {
    const { data, error } = await supabase
      .from('mensajes')
      .select('opcion_seleccionada')
      .eq('conversacion_id', conversacion_id)
      .not('opcion_seleccionada', 'is', null)
      .order('created_at', { ascending: true });

    if (error) {
      console.error('[MensajeService] Error obteniendo historial:', error);
      throw error;
    }

    return (data || []).map(m => m.opcion_seleccionada).filter(Boolean) as string[];
  }
}

export const mensajeService = new MensajeService();
