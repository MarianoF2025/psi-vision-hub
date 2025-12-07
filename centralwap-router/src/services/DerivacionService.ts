// ===========================================
// DERIVACION SERVICE - Esquema Real Supabase
// ===========================================
import { supabase } from '../config/supabase';
import { Derivacion, DerivacionInsert, Area } from '../types/database';

export class DerivacionService {
  
  /**
   * Crear nueva derivación
   */
  async crear(datos: DerivacionInsert): Promise<Derivacion> {
    const derivacionData: DerivacionInsert = {
      telefono: datos.telefono,
      conversacion_id: datos.conversacion_id || null,
      area_origen: datos.area_origen || 'wsp4',
      area_destino: datos.area_destino || 'revisar',
      motivo: datos.motivo || 'menu_selection',
      menu_option_selected: datos.menu_option_selected || null,
      requiere_proxy: datos.requiere_proxy ?? false,
      status: datos.status || 'enviada',
    };

    const { data, error } = await supabase
      .from('derivaciones')
      .insert(derivacionData)
      .select()
      .single();

    if (error) {
      console.error('[DerivacionService] Error creando derivación:', error);
      throw error;
    }

    console.log(`[DerivacionService] Derivación creada: ${data.id} -> ${datos.area_destino}`);
    return data;
  }

  /**
   * Crear derivación desde Router WSP4
   */
  async crearDesdeRouter(datos: {
    conversacion_id: string;
    telefono: string;
    area_destino: Area;
    subetiqueta?: string;
    opcion_menu?: string;
  }): Promise<Derivacion> {
    return this.crear({
      conversacion_id: datos.conversacion_id,
      telefono: datos.telefono,
      area_origen: 'wsp4',
      area_destino: datos.area_destino,
      motivo: 'menu_selection',
      menu_option_selected: datos.opcion_menu || null,
      requiere_proxy: datos.area_destino !== 'wsp4',
      status: 'enviada',
    });
  }

  /**
   * Obtener derivaciones por conversación
   */
  async obtenerPorConversacion(conversacion_id: string): Promise<Derivacion[]> {
    const { data, error } = await supabase
      .from('derivaciones')
      .select('*')
      .eq('conversacion_id', conversacion_id)
      .order('created_at', { ascending: false });

    if (error) {
      console.error('[DerivacionService] Error obteniendo derivaciones:', error);
      throw error;
    }

    return data || [];
  }

  /**
   * Obtener última derivación de una conversación
   */
  async obtenerUltima(conversacion_id: string): Promise<Derivacion | null> {
    const { data, error } = await supabase
      .from('derivaciones')
      .select('*')
      .eq('conversacion_id', conversacion_id)
      .order('created_at', { ascending: false })
      .limit(1)
      .single();

    if (error && error.code !== 'PGRST116') {
      console.error('[DerivacionService] Error obteniendo última:', error);
      throw error;
    }

    return data;
  }

  /**
   * Actualizar estado de derivación
   */
  async actualizarEstado(id: string, status: string): Promise<Derivacion> {
    const { data, error } = await supabase
      .from('derivaciones')
      .update({ status })
      .eq('id', id)
      .select()
      .single();

    if (error) {
      console.error('[DerivacionService] Error actualizando estado:', error);
      throw error;
    }

    return data;
  }

  /**
   * Obtener derivaciones pendientes por área
   */
  async obtenerPendientesPorArea(area: Area): Promise<Derivacion[]> {
    const { data, error } = await supabase
      .from('derivaciones')
      .select('*')
      .eq('area_destino', area)
      .eq('status', 'enviada')
      .order('created_at', { ascending: true });

    if (error) {
      console.error('[DerivacionService] Error obteniendo pendientes:', error);
      throw error;
    }

    return data || [];
  }

  /**
   * Contar derivaciones del día
   */
  async contarHoy(): Promise<{ total: number; porArea: Record<string, number> }> {
    const hoy = new Date();
    hoy.setHours(0, 0, 0, 0);

    const { data, error } = await supabase
      .from('derivaciones')
      .select('area_destino')
      .gte('created_at', hoy.toISOString());

    if (error) {
      console.error('[DerivacionService] Error contando:', error);
      throw error;
    }

    const porArea: Record<string, number> = {};
    (data || []).forEach(d => {
      const area = d.area_destino || 'sin_area';
      porArea[area] = (porArea[area] || 0) + 1;
    });

    return {
      total: data?.length || 0,
      porArea,
    };
  }

  /**
   * Verificar si hubo derivación reciente (anti-loop)
   */
  async huboDerivacionReciente(
    conversacion_id: string, 
    minutosAtras: number = 15
  ): Promise<boolean> {
    const tiempoLimite = new Date(Date.now() - minutosAtras * 60 * 1000);

    const { data, error } = await supabase
      .from('derivaciones')
      .select('id')
      .eq('conversacion_id', conversacion_id)
      .gte('created_at', tiempoLimite.toISOString())
      .limit(1);

    if (error) {
      console.error('[DerivacionService] Error verificando anti-loop:', error);
      return false;
    }

    return (data?.length || 0) > 0;
  }
}

export const derivacionService = new DerivacionService();


