// ===========================================
// CONVERSACION SERVICE - Esquema Real Supabase
// Versión 2.6.0 - Agregado buscarDesconectadaPorTelefonoEInbox
// ===========================================
import { supabase } from '../config/supabase';
import { contactoService } from './ContactoService';
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
      .gt('ventana_24h_fin', ahora)
      .order('created_at', { ascending: false })
      .limit(1)
      .single();

    if (derivada) {
      console.log(`[ConversacionService] Encontrada conversación derivada dentro de 24h: ${derivada.id}`);
      return derivada;
    }

    if (errorActiva?.code !== 'PGRST116' && errorActiva) {
      console.error('[ConversacionService] Error buscando conversación activa:', errorActiva);
    }
    if (errorDerivada?.code !== 'PGRST116' && errorDerivada) {
      console.error('[ConversacionService] Error buscando conversación derivada:', errorDerivada);
    }

    return null;
  }

  /**
   * Buscar cualquier conversación previa por teléfono (para reactivar)
   */
  async buscarPreviaPorTelefono(telefono: string): Promise<Conversacion | null> {
    const { data, error } = await supabase
      .from('conversaciones')
      .select('*')
      .eq('telefono', telefono)
      .in('estado', ['derivada', 'cerrada', 'nueva'])
      .order('created_at', { ascending: false })
      .limit(1)
      .single();

    if (error && error.code !== 'PGRST116') {
      console.error('[ConversacionService] Error buscando conversación previa:', error);
    }

    return data || null;
  }

  /**
   * Buscar conversación por teléfono y línea específica
   * Usado para líneas secundarias (Admin/Alumnos/Comunidad/Ventas)
   */
  async buscarPorTelefonoYLinea(
    telefono: string,
    linea: string
  ): Promise<Conversacion | null> {
    try {
      const { data, error } = await supabase
        .from('conversaciones')
        .select('*')
        .eq('telefono', telefono)
        .eq('linea_origen', linea)
        .order('updated_at', { ascending: false })
        .limit(1)
        .single();

      if (error && error.code !== 'PGRST116') {
        console.error('[ConversacionService] Error buscando por teléfono y línea:', error);
      }

      return data || null;
    } catch (error) {
      console.error('[ConversacionService] Error en buscarPorTelefonoYLinea:', error);
      return null;
    }
  }

  /**
   * Buscar conversación desconectada por teléfono e inbox_fijo
   * Usado para detectar conversaciones que fueron desconectadas del Router WSP4
   */
  async buscarDesconectadaPorTelefonoEInbox(
    telefono: string,
    inbox: string
  ): Promise<Conversacion | null> {
    try {
      const { data, error } = await supabase
        .from('conversaciones')
        .select('*')
        .eq('telefono', telefono)
        .eq('inbox_fijo', inbox)
        .neq('estado', 'cerrada')
        .or('desconectado_wsp4.eq.true,desconectado_ventas_api.eq.true')
        .order('updated_at', { ascending: false })
        .limit(1)
        .single();

      if (error && error.code !== 'PGRST116') {
        console.error('[ConversacionService] Error buscando desconectada:', error);
      }

      return data || null;
    } catch (error) {
      console.error('[ConversacionService] Error en buscarDesconectadaPorTelefonoEInbox:', error);
      return null;
    }
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
      iniciado_por: datos.iniciado_por || 'usuario',
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
    if (datos.iniciado_por !== undefined) updateData.iniciado_por = datos.iniciado_por;

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
   * Reactivar una conversación existente (cuando expira ventana 24h)
   */
  async reactivar(id: string): Promise<Conversacion> {
    const ahora = new Date().toISOString();
    const fin24h = new Date(Date.now() + 24 * 60 * 60 * 1000).toISOString();

    console.log(`[ConversacionService] Reactivando conversación ${id}`);

    return this.actualizar(id, {
      estado: 'activa',
      router_estado: 'menu_principal',
      menu_actual: 'principal',
      router_opcion_actual: null,
      ventana_24h_activa: true,
      ventana_24h_inicio: ahora,
      ventana_24h_fin: fin24h,
      leida: false,
    });
  }

  /**
   * Obtener o crear conversación (upsert manual)
   */
  async obtenerOCrear(datos: ConversacionInsert & { nombre?: string }): Promise<{ conversacion: Conversacion; esNueva: boolean }> {
    // 0. Buscar o crear contacto
    const { contacto } = await contactoService.obtenerOCrear({
      telefono: datos.telefono,
      nombre: datos.nombre || null,
      origen: 'whatsapp',
    });

    // 1. Buscar conversación activa existente
    const existente = await this.buscarActivaPorTelefono(datos.telefono);

    if (existente) {
      // Vincular contacto si no está vinculado
      const updateData: Record<string, any> = {
        ultimo_mensaje_at: new Date().toISOString(),
        leida: false,
      };

      if (!existente.contacto_id && contacto) {
        updateData.contacto_id = contacto.id;
        updateData.nombre = contacto.nombre;
        console.log(`[ConversacionService] Vinculando contacto ${contacto.id} a conversación ${existente.id}`);
      }

      const actualizada = await this.actualizar(existente.id, updateData);
      return { conversacion: actualizada, esNueva: false };
    }

    // 2. Buscar conversación previa para reactivar
    const previa = await this.buscarPreviaPorTelefono(datos.telefono);

    if (previa) {
      console.log(`[ConversacionService] Reactivando conversación expirada ${previa.id} para ${datos.telefono}`);

      // Vincular contacto si no está vinculado
      if (!previa.contacto_id && contacto) {
        await supabase
          .from('conversaciones')
          .update({ contacto_id: contacto.id, nombre: contacto.nombre })
          .eq('id', previa.id);
      }

      const reactivada = await this.reactivar(previa.id);
      return { conversacion: reactivada, esNueva: false };
    }

    // 3. Crear nueva con contacto vinculado
    console.log(`[ConversacionService] Creando nueva conversación para ${datos.telefono}`);
    const nueva = await this.crear({
      ...datos,
      contacto_id: contacto?.id || null,
    });

    // Actualizar nombre en conversación
    if (contacto?.nombre) {
      await supabase
        .from('conversaciones')
        .update({ nombre: contacto.nombre })
        .eq('id', nueva.id);
    }

    return { conversacion: nueva, esNueva: true };
  }

  async actualizarEstadoRouter(
    id: string,
    routerEstado: RouterEstado,
    menuActual: string,
    opcionSeleccionada?: string
  ): Promise<Conversacion> {
    const conv = await this.buscarPorId(id);
    const historialActual = conv?.router_historial || [];

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
   */
  async derivar(
    id: string,
    areaDestino: Area,
    subetiqueta?: string
  ): Promise<Conversacion> {
    const ahora = new Date().toISOString();
    const fin24h = new Date(Date.now() + 24 * 60 * 60 * 1000).toISOString();

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
      ultimo_mensaje: mensaje.substring(0, 500),
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
   * Renovar ventana de 24 horas
   * Se llama cuando el usuario responde a un agente en línea secundaria
   */
  async renovarVentana24h(conversacionId: string): Promise<void> {
    try {
      const ahora = new Date();
      const fin24h = new Date(ahora.getTime() + 24 * 60 * 60 * 1000);

      await supabase
        .from('conversaciones')
        .update({
          ventana_24h_activa: true,
          ventana_24h_inicio: ahora.toISOString(),
          ventana_24h_fin: fin24h.toISOString(),
          updated_at: ahora.toISOString(),
        })
        .eq('id', conversacionId);

      console.log(`[ConversacionService] Ventana 24h renovada para ${conversacionId}`);
    } catch (error) {
      console.error('[ConversacionService] Error renovando ventana 24h:', error);
    }
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
