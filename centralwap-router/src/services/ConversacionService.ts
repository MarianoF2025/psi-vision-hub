// ===========================================
// CONVERSACION SERVICE - Esquema Real Supabase
// CORREGIDO: Incluye lógica de 24h para derivaciones
// ===========================================
import { supabase } from '../config/supabase';
import {
  Conversacion,
  ConversacionInsert,
  ConversacionUpdate,
  RouterEstado,
  Area
} from '../types/database';

export class ConversacionService {

  /**
   * Buscar conversación activa por teléfono
   * Incluye 'derivada' si está dentro de la ventana de 24h
   */
  async buscarActivaPorTelefono(telefono: string): Promise<Conversacion | null> {
    const ahora = new Date().toISOString();
    
    // Primero buscar conversaciones activas/en_menu/esperando
    const { data: activa, error: errorActiva } = await supabase
      .from('conversaciones')
      .select('*')
      .eq('telefono', telefono)
      .in('estado', ['activa', 'en_menu', 'esperando'])
      .order('created_at', { ascending: false })
      .limit(1)
      .single();

    if (activa) {
      return activa;
    }

    // Si no hay activa, buscar derivada dentro de ventana 24h
    const { data: derivada, error: errorDerivada } = await supabase
      .from('conversaciones')
      .select('*')
      .eq('telefono', telefono)
      .eq('estado', 'derivada')
      .gt('ventana_24h_fin', ahora)  // Ventana 24h aún activa
      .order('created_at', { ascending: false })
      .limit(1)
      .single();

    if (derivada) {
      console.log(`[ConversacionService] Encontrada conversación derivada dentro de 24h: ${derivada.id}`);
      return derivada;
    }

    // No hay conversación activa ni derivada válida
    if (errorActiva?.code !== 'PGRST116' && errorActiva) {
      console.error('[ConversacionService] Error buscando conversación activa:', errorActiva);
    }
    if (errorDerivada?.code !== 'PGRST116' && errorDerivada) {
      console.error('[ConversacionService] Error buscando conversación derivada:', errorDerivada);
    }

    return null;
  }

  /**
   * Buscar conversación por ID
   */
  async buscarPorId(id: string): Promise<Conversacion | null> {
    const { data, error } = await supabase
      .from('conversaciones')
      .select('*')
      .eq('id', id)
      .single();

    if (error && error.code !== 'PGRST116') {
      console.error('[ConversacionService] Error buscando por ID:', error);
      throw error;
    }

    return data;
  }

  /**
   * Crear nueva conversación
   */
  async crear(datos: ConversacionInsert): Promise<Conversacion> {
    const ahora = new Date().toISOString();

    const conversacionData: ConversacionInsert = {
      telefono: datos.telefono,
      contacto_id: datos.contacto_id || null,
      estado: datos.estado || 'activa',
      prioridad: datos.prioridad || 'media',
      canal: datos.canal || 'whatsapp',
      area: datos.area || 'wsp4',
      etiqueta: datos.etiqueta || null,
      origen: datos.origen || 'whatsapp',
      router_estado: datos.router_estado || 'menu_principal',
      menu_actual: datos.menu_actual || 'principal',
      router_opcion_actual: null,
      router_historial: [],
      linea_origen: datos.linea_origen || 'wsp4',
      es_lead_meta: datos.es_lead_meta || false,
      ventana_24h_activa: true,
      ventana_24h_inicio: ahora,
      ventana_24h_fin: new Date(Date.now() + 24 * 60 * 60 * 1000).toISOString(),
      ventana_72h_activa: datos.ventana_72h_activa || false,
      ventana_72h_inicio: datos.ventana_72h_inicio || null,
      ventana_72h_fin: datos.ventana_72h_fin || null,
      etiquetas: datos.etiquetas || [],
      metadata: datos.metadata || {},
    };

    // Si es lead de Meta, activar ventana 72h
    if (datos.es_lead_meta) {
      conversacionData.ventana_72h_activa = true;
      conversacionData.ventana_72h_inicio = ahora;
      conversacionData.ventana_72h_fin = new Date(Date.now() + 72 * 60 * 60 * 1000).toISOString();
    }

    const { data, error } = await supabase
      .from('conversaciones')
      .insert(conversacionData)
      .select()
      .single();

    if (error) {
      console.error('[ConversacionService] Error creando conversación:', error);
      throw error;
    }

    console.log(`[ConversacionService] Conversación creada: ${data.id}`);
    return data;
  }

  /**
   * Actualizar conversación
   */
  async actualizar(id: string, datos: ConversacionUpdate): Promise<Conversacion> {
    const updateData: Record<string, any> = {
      updated_at: new Date().toISOString(),
    };

    // Mapear solo campos que vienen en datos
    if (datos.estado !== undefined) updateData.estado = datos.estado;
    if (datos.area !== undefined) updateData.area = datos.area;
    if (datos.etiqueta !== undefined) updateData.etiqueta = datos.etiqueta;
    if (datos.router_estado !== undefined) updateData.router_estado = datos.router_estado;
    if (datos.menu_actual !== undefined) updateData.menu_actual = datos.menu_actual;
    if (datos.router_opcion_actual !== undefined) updateData.router_opcion_actual = datos.router_opcion_actual;
    if (datos.router_historial !== undefined) updateData.router_historial = datos.router_historial;
    if (datos.ultimo_mensaje !== undefined) updateData.ultimo_mensaje = datos.ultimo_mensaje;
    if (datos.ultimo_mensaje_at !== undefined) updateData.ultimo_mensaje_at = datos.ultimo_mensaje_at;
    if (datos.ventana_24h_activa !== undefined) updateData.ventana_24h_activa = datos.ventana_24h_activa;
    if (datos.ventana_24h_inicio !== undefined) updateData.ventana_24h_inicio = datos.ventana_24h_inicio;
    if (datos.ventana_24h_fin !== undefined) updateData.ventana_24h_fin = datos.ventana_24h_fin;
    if (datos.ventana_72h_activa !== undefined) updateData.ventana_72h_activa = datos.ventana_72h_activa;
    if (datos.proxy_activo !== undefined) updateData.proxy_activo = datos.proxy_activo;
    if (datos.area_proxy !== undefined) updateData.area_proxy = datos.area_proxy;
    if (datos.leida !== undefined) updateData.leida = datos.leida;
    if (datos.etiquetas !== undefined) updateData.etiquetas = datos.etiquetas;
    if (datos.metadata !== undefined) updateData.metadata = datos.metadata;

    const { data, error } = await supabase
      .from('conversaciones')
      .update(updateData)
      .eq('id', id)
      .select()
      .single();

    if (error) {
      console.error('[ConversacionService] Error actualizando:', error);
      throw error;
    }

    return data;
  }

  /**
   * Obtener o crear conversación (upsert manual)
   */
  async obtenerOCrear(datos: ConversacionInsert): Promise<{ conversacion: Conversacion; esNueva: boolean }> {
    // 1. Buscar conversación activa existente (incluye derivadas dentro de 24h)
    const existente = await this.buscarActivaPorTelefono(datos.telefono);

    if (existente) {
      // 2a. Si existe, actualizar timestamp y devolver
      const actualizada = await this.actualizar(existente.id, {
        ultimo_mensaje_at: new Date().toISOString(),
        leida: false,
      });
      return { conversacion: actualizada, esNueva: false };
    }

    // 2b. Si no existe, crear nueva
    const nueva = await this.crear(datos);
    return { conversacion: nueva, esNueva: true };
  }

  /**
   * Actualizar estado del router
   */
  async actualizarEstadoRouter(
    id: string,
    routerEstado: RouterEstado,
    menuActual: string,
    opcionSeleccionada?: string
  ): Promise<Conversacion> {
    // Obtener historial actual
    const conv = await this.buscarPorId(id);
    const historialActual = conv?.router_historial || [];

    // Agregar opción al historial si existe
    if (opcionSeleccionada) {
      historialActual.push(`${menuActual}:${opcionSeleccionada}`);
    }

    return this.actualizar(id, {
      router_estado: routerEstado,
      menu_actual: menuActual,
      router_opcion_actual: opcionSeleccionada || null,
      router_historial: historialActual,
    });
  }

  /**
   * Derivar conversación a otra área
   * IMPORTANTE: Resetea la ventana de 24h desde el momento de derivación
   */
  async derivar(
    id: string,
    areaDestino: Area,
    subetiqueta?: string
  ): Promise<Conversacion> {
    const ahora = new Date().toISOString();
    const fin24h = new Date(Date.now() + 24 * 60 * 60 * 1000).toISOString();

    // Agregar subetiqueta al array de etiquetas si viene
    const conv = await this.buscarPorId(id);
    const etiquetasActuales = conv?.etiquetas || [];

    if (subetiqueta && !etiquetasActuales.includes(subetiqueta)) {
      etiquetasActuales.push(subetiqueta);
    }

    console.log(`[ConversacionService] Derivando ${id} a ${areaDestino}, ventana 24h hasta ${fin24h}`);

    return this.actualizar(id, {
      estado: 'derivada',
      area: areaDestino,
      etiqueta: subetiqueta || null,
      etiquetas: etiquetasActuales,
      router_estado: 'derivado',
      ultimo_mensaje_at: ahora,
      // Resetear ventana 24h desde ahora
      ventana_24h_activa: true,
      ventana_24h_inicio: ahora,
      ventana_24h_fin: fin24h,
    });
  }

  /**
   * Cerrar conversación
   */
  async cerrar(id: string, motivo?: string): Promise<Conversacion> {
    const metadata = motivo ? { motivo_cierre: motivo } : {};

    return this.actualizar(id, {
      estado: 'cerrada',
      router_estado: 'derivado',
      metadata,
    });
  }

  /**
   * Actualizar último mensaje
   */
  async actualizarUltimoMensaje(id: string, mensaje: string): Promise<Conversacion> {
    return this.actualizar(id, {
      ultimo_mensaje: mensaje.substring(0, 500), // Limitar a 500 chars
      ultimo_mensaje_at: new Date().toISOString(),
      leida: false,
    });
  }

  /**
   * Verificar si ventana 24h está activa
   */
  async verificarVentana24h(id: string): Promise<boolean> {
    const conv = await this.buscarPorId(id);
    if (!conv) return false;

    if (!conv.ventana_24h_activa) return false;
    if (!conv.ventana_24h_fin) return false;

    return new Date(conv.ventana_24h_fin) > new Date();
  }

  /**
   * Verificar si ventana 72h está activa
   */
  async verificarVentana72h(id: string): Promise<boolean> {
    const conv = await this.buscarPorId(id);
    if (!conv) return false;

    if (!conv.ventana_72h_activa) return false;
    if (!conv.ventana_72h_fin) return false;

    return new Date(conv.ventana_72h_fin) > new Date();
  }

  /**
   * Obtener conversaciones activas por área
   */
  async obtenerPorArea(area: Area): Promise<Conversacion[]> {
    const { data, error } = await supabase
      .from('conversaciones')
      .select('*')
      .eq('area', area)
      .in('estado', ['activa', 'derivada', 'en_menu'])
      .order('ultimo_mensaje_at', { ascending: false });

    if (error) {
      console.error('[ConversacionService] Error obteniendo por área:', error);
      throw error;
    }

    return data || [];
  }
}

export const conversacionService = new ConversacionService();
