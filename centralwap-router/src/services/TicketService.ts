// ===========================================
// TICKET SERVICE - Esquema Real Supabase
// ===========================================
import { supabase } from '../config/supabase';
import { Ticket, TicketInsert, Area } from '../types/database';

export class TicketService {
  
  /**
   * Generar ID de ticket único
   * Formato: YYYYMMDD-HHMMSS-XXXX
   */
  private generarTicketId(): string {
    const ahora = new Date();
    const fecha = ahora.toISOString().slice(0, 10).replace(/-/g, '');
    const hora = ahora.toISOString().slice(11, 19).replace(/:/g, '');
    const random = Math.random().toString(36).substring(2, 6).toUpperCase();
    return `${fecha}-${hora}-${random}`;
  }

  /**
   * Crear nuevo ticket
   */
  async crear(datos: {
    conversacion_id: string;
    telefono: string;
    area: Area;
    prioridad?: string;
    metadata?: Record<string, any>;
  }): Promise<Ticket> {
    const ticketData: TicketInsert = {
      ticket_id: this.generarTicketId(),
      conversacion_id: datos.conversacion_id,
      telefono: datos.telefono,
      area: datos.area,
      estado: 'abierto',
      prioridad: datos.prioridad || 'normal',
      metadata: datos.metadata || null,
    };

    const { data, error } = await supabase
      .from('tickets')
      .insert(ticketData)
      .select()
      .single();

    if (error) {
      console.error('[TicketService] Error creando ticket:', error);
      throw error;
    }

    console.log(`[TicketService] Ticket creado: ${data.ticket_id} para área ${datos.area}`);
    return data;
  }

  /**
   * Obtener ticket por ID
   */
  async obtenerPorId(id: string): Promise<Ticket | null> {
    const { data, error } = await supabase
      .from('tickets')
      .select('*')
      .eq('id', id)
      .single();

    if (error && error.code !== 'PGRST116') {
      console.error('[TicketService] Error obteniendo ticket:', error);
      throw error;
    }

    return data;
  }

  /**
   * Obtener ticket por ticket_id (código legible)
   */
  async obtenerPorTicketId(ticket_id: string): Promise<Ticket | null> {
    const { data, error } = await supabase
      .from('tickets')
      .select('*')
      .eq('ticket_id', ticket_id)
      .single();

    if (error && error.code !== 'PGRST116') {
      console.error('[TicketService] Error obteniendo por ticket_id:', error);
      throw error;
    }

    return data;
  }

  /**
   * Obtener tickets de una conversación
   */
  async obtenerPorConversacion(conversacion_id: string): Promise<Ticket[]> {
    const { data, error } = await supabase
      .from('tickets')
      .select('*')
      .eq('conversacion_id', conversacion_id)
      .order('created_at', { ascending: false });

    if (error) {
      console.error('[TicketService] Error obteniendo tickets:', error);
      throw error;
    }

    return data || [];
  }

  /**
   * Actualizar estado de ticket
   */
  async actualizarEstado(id: string, estado: string, notas?: string): Promise<Ticket> {
    const updateData: Record<string, any> = {
      estado,
      updated_at: new Date().toISOString(),
    };

    if (notas) {
      updateData.notas_resolucion = notas;
    }

    const { data, error } = await supabase
      .from('tickets')
      .update(updateData)
      .eq('id', id)
      .select()
      .single();

    if (error) {
      console.error('[TicketService] Error actualizando estado:', error);
      throw error;
    }

    return data;
  }

  /**
   * Asignar ticket a agente
   */
  async asignar(id: string, agente_id: number): Promise<Ticket> {
    const { data, error } = await supabase
      .from('tickets')
      .update({
        asignado_a: agente_id,
        estado: 'asignado',
        updated_at: new Date().toISOString(),
      })
      .eq('id', id)
      .select()
      .single();

    if (error) {
      console.error('[TicketService] Error asignando ticket:', error);
      throw error;
    }

    return data;
  }

  /**
   * Cerrar ticket
   */
  async cerrar(id: string, notas?: string): Promise<Ticket> {
    return this.actualizarEstado(id, 'cerrado', notas);
  }

  /**
   * Obtener tickets abiertos por área
   */
  async obtenerAbiertosPorArea(area: Area): Promise<Ticket[]> {
    const { data, error } = await supabase
      .from('tickets')
      .select('*')
      .eq('area', area)
      .in('estado', ['abierto', 'asignado'])
      .order('created_at', { ascending: true });

    if (error) {
      console.error('[TicketService] Error obteniendo abiertos:', error);
      throw error;
    }

    return data || [];
  }

  /**
   * Contar tickets abiertos
   */
  async contarAbiertos(): Promise<{ total: number; porArea: Record<string, number> }> {
    const { data, error } = await supabase
      .from('tickets')
      .select('area')
      .in('estado', ['abierto', 'asignado']);

    if (error) {
      console.error('[TicketService] Error contando:', error);
      throw error;
    }

    const porArea: Record<string, number> = {};
    (data || []).forEach(t => {
      porArea[t.area] = (porArea[t.area] || 0) + 1;
    });

    return {
      total: data?.length || 0,
      porArea,
    };
  }

  /**
   * Obtener tiempo promedio de resolución por área
   */
  async tiempoPromedioResolucion(area: Area): Promise<number | null> {
    // Esta consulta requiere cálculo en el backend
    // Retornamos null por ahora, se puede implementar con una función RPC
    console.log('[TicketService] tiempoPromedioResolucion no implementado aún');
    return null;
  }
}

export const ticketService = new TicketService();


