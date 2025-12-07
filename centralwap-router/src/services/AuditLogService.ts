// ===========================================
// AUDIT LOG SERVICE - Esquema Real Supabase
// ===========================================
import { supabase } from '../config/supabase';
import { AuditLog, AuditLogInsert } from '../types/database';

export class AuditLogService {
  
  /**
   * Registrar acción en audit_log
   */
  async registrar(datos: AuditLogInsert): Promise<AuditLog> {
    const logData: AuditLogInsert = {
      accion: datos.accion,
      tabla_afectada: datos.tabla_afectada || null,
      registro_id: datos.registro_id || null,
      valores_anteriores: datos.valores_anteriores || null,
      valores_nuevos: datos.valores_nuevos || null,
      ip_address: datos.ip_address || null,
      motivo: datos.motivo || null,
      user_id: datos.user_id || null,
    };

    const { data, error } = await supabase
      .from('audit_log')
      .insert(logData)
      .select()
      .single();

    if (error) {
      console.error('[AuditLogService] Error registrando:', error);
      // No lanzamos error para no bloquear operaciones principales
      return {} as AuditLog;
    }

    return data;
  }

  /**
   * Registrar derivación
   */
  async registrarDerivacion(datos: {
    conversacion_id: string;
    area_origen: string;
    area_destino: string;
    motivo?: string;
  }): Promise<AuditLog> {
    return this.registrar({
      accion: 'derivacion',
      tabla_afectada: 'conversaciones',
      registro_id: datos.conversacion_id,
      valores_anteriores: { area: datos.area_origen },
      valores_nuevos: { area: datos.area_destino },
      motivo: datos.motivo || 'Derivación desde Router WSP4',
    });
  }

  /**
   * Registrar creación de ticket
   */
  async registrarTicketCreado(datos: {
    ticket_id: string;
    conversacion_id: string;
    area: string;
  }): Promise<AuditLog> {
    return this.registrar({
      accion: 'ticket_creado',
      tabla_afectada: 'tickets',
      registro_id: datos.ticket_id,
      valores_nuevos: {
        conversacion_id: datos.conversacion_id,
        area: datos.area,
      },
    });
  }

  /**
   * Registrar cambio de estado
   */
  async registrarCambioEstado(datos: {
    tabla: string;
    registro_id: string;
    estado_anterior: string;
    estado_nuevo: string;
    motivo?: string;
  }): Promise<AuditLog> {
    return this.registrar({
      accion: 'cambio_estado',
      tabla_afectada: datos.tabla,
      registro_id: datos.registro_id,
      valores_anteriores: { estado: datos.estado_anterior },
      valores_nuevos: { estado: datos.estado_nuevo },
      motivo: datos.motivo,
    });
  }

  /**
   * Registrar mensaje procesado
   */
  async registrarMensajeProcesado(datos: {
    conversacion_id: string;
    accion_tomada: string;
    detalles?: Record<string, any>;
  }): Promise<AuditLog> {
    return this.registrar({
      accion: 'mensaje_procesado',
      tabla_afectada: 'mensajes',
      registro_id: datos.conversacion_id,
      valores_nuevos: {
        accion: datos.accion_tomada,
        ...datos.detalles,
      },
    });
  }

  /**
   * Obtener logs por registro
   */
  async obtenerPorRegistro(tabla: string, registro_id: string): Promise<AuditLog[]> {
    const { data, error } = await supabase
      .from('audit_log')
      .select('*')
      .eq('tabla_afectada', tabla)
      .eq('registro_id', registro_id)
      .order('created_at', { ascending: false });

    if (error) {
      console.error('[AuditLogService] Error obteniendo logs:', error);
      throw error;
    }

    return data || [];
  }

  /**
   * Obtener logs por acción
   */
  async obtenerPorAccion(accion: string, limite: number = 100): Promise<AuditLog[]> {
    const { data, error } = await supabase
      .from('audit_log')
      .select('*')
      .eq('accion', accion)
      .order('created_at', { ascending: false })
      .limit(limite);

    if (error) {
      console.error('[AuditLogService] Error obteniendo por acción:', error);
      throw error;
    }

    return data || [];
  }

  /**
   * Obtener logs recientes
   */
  async obtenerRecientes(limite: number = 50): Promise<AuditLog[]> {
    const { data, error } = await supabase
      .from('audit_log')
      .select('*')
      .order('created_at', { ascending: false })
      .limit(limite);

    if (error) {
      console.error('[AuditLogService] Error obteniendo recientes:', error);
      throw error;
    }

    return data || [];
  }
}

export const auditLogService = new AuditLogService();


