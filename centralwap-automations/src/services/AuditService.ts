import { supabase } from '../config/supabase';

interface AuditLogEntry {
  accion: string;
  tabla_afectada: string;
  registro_id?: string;
  valores_anteriores?: any;
  valores_nuevos?: any;
  user_name?: string;
  user_id?: string;
  origen?: string;
  motivo?: string;
  detalles?: string;
}

export class AuditService {
  
  async log(entry: AuditLogEntry): Promise<void> {
    try {
      const { error } = await supabase.from('audit_log').insert({
        accion: entry.accion,
        tabla_afectada: entry.tabla_afectada,
        registro_id: entry.registro_id,
        valores_anteriores: entry.valores_anteriores,
        valores_nuevos: entry.valores_nuevos,
        user_name: entry.user_name || 'Sistema',
        user_id: entry.user_id,
        origen: entry.origen || 'crm-automatizaciones',
        motivo: entry.motivo,
        detalles: entry.detalles,
      });
      
      if (error) {
        console.error('Error guardando audit log:', error);
      }
    } catch (err) {
      console.error('Error en AuditService.log:', err);
    }
  }

  async logCursoCreado(cursoId: string, cursoData: any, userName?: string): Promise<void> {
    await this.log({
      accion: 'curso_creado',
      tabla_afectada: 'cursos',
      registro_id: cursoId,
      valores_nuevos: { codigo: cursoData.codigo, nombre: cursoData.nombre },
      user_name: userName,
      detalles: `Curso creado: ${cursoData.codigo} - ${cursoData.nombre}`,
    });
  }

  async logCursoActualizado(cursoId: string, antes: any, despues: any, userName?: string): Promise<void> {
    const cambios: any = {};
    const anterior: any = {};
    
    for (const key of Object.keys(despues)) {
      if (antes[key] !== despues[key]) {
        cambios[key] = despues[key];
        anterior[key] = antes[key];
      }
    }
    
    if (Object.keys(cambios).length === 0) return;

    await this.log({
      accion: 'curso_actualizado',
      tabla_afectada: 'cursos',
      registro_id: cursoId,
      valores_anteriores: anterior,
      valores_nuevos: cambios,
      user_name: userName,
      detalles: `Curso actualizado: ${antes.codigo || despues.codigo}`,
    });
  }

  async logCursoEliminado(cursoId: string, cursoData: any, userName?: string): Promise<void> {
    await this.log({
      accion: 'curso_eliminado',
      tabla_afectada: 'cursos',
      registro_id: cursoId,
      valores_anteriores: { codigo: cursoData.codigo, nombre: cursoData.nombre },
      user_name: userName,
      detalles: `Curso eliminado: ${cursoData.codigo}`,
    });
  }

  async logCursoToggle(cursoId: string, codigo: string, nuevoEstado: boolean, userName?: string): Promise<void> {
    await this.log({
      accion: nuevoEstado ? 'curso_activado' : 'curso_desactivado',
      tabla_afectada: 'cursos',
      registro_id: cursoId,
      valores_anteriores: { activo: !nuevoEstado },
      valores_nuevos: { activo: nuevoEstado },
      user_name: userName,
      detalles: `Curso ${codigo}: ${nuevoEstado ? 'ACTIVADO' : 'DESACTIVADO'}`,
    });
  }

  async logOpcionCreada(opcionId: string, opcionData: any, userName?: string): Promise<void> {
    await this.log({
      accion: 'opcion_menu_creada',
      tabla_afectada: 'menu_opciones',
      registro_id: opcionId,
      valores_nuevos: { titulo: opcionData.titulo, tipo: opcionData.tipo, curso_id: opcionData.curso_id },
      user_name: userName,
      detalles: `Opción creada: ${opcionData.emoji || ''} ${opcionData.titulo}`,
    });
  }

  async logOpcionActualizada(opcionId: string, antes: any, despues: any, userName?: string): Promise<void> {
    const cambios: any = {};
    const anterior: any = {};
    
    for (const key of Object.keys(despues)) {
      if (antes[key] !== despues[key]) {
        cambios[key] = despues[key];
        anterior[key] = antes[key];
      }
    }
    
    if (Object.keys(cambios).length === 0) return;

    await this.log({
      accion: 'opcion_menu_actualizada',
      tabla_afectada: 'menu_opciones',
      registro_id: opcionId,
      valores_anteriores: anterior,
      valores_nuevos: cambios,
      user_name: userName,
      detalles: `Opción actualizada: ${antes.titulo || despues.titulo}`,
    });
  }

  async logOpcionEliminada(opcionId: string, opcionData: any, userName?: string): Promise<void> {
    await this.log({
      accion: 'opcion_menu_eliminada',
      tabla_afectada: 'menu_opciones',
      registro_id: opcionId,
      valores_anteriores: { titulo: opcionData.titulo, tipo: opcionData.tipo },
      user_name: userName,
      detalles: `Opción eliminada: ${opcionData.titulo}`,
    });
  }

  async logOpcionToggle(opcionId: string, titulo: string, nuevoEstado: boolean, userName?: string): Promise<void> {
    await this.log({
      accion: nuevoEstado ? 'opcion_menu_activada' : 'opcion_menu_desactivada',
      tabla_afectada: 'menu_opciones',
      registro_id: opcionId,
      valores_anteriores: { activo: !nuevoEstado },
      valores_nuevos: { activo: nuevoEstado },
      user_name: userName,
      detalles: `Opción ${titulo}: ${nuevoEstado ? 'ACTIVADA' : 'DESACTIVADA'}`,
    });
  }

  async logAnuncioVinculado(anuncioId: string, anuncioData: any, userName?: string): Promise<void> {
    await this.log({
      accion: 'anuncio_vinculado',
      tabla_afectada: 'config_cursos_ctwa',
      registro_id: anuncioId,
      valores_nuevos: { ad_id: anuncioData.ad_id, curso_id: anuncioData.curso_id, nombre: anuncioData.nombre },
      user_name: userName,
      detalles: `Anuncio vinculado: ${anuncioData.nombre || anuncioData.ad_id}`,
    });
  }

  async logAnuncioDesvinculado(anuncioId: string, anuncioData: any, userName?: string): Promise<void> {
    await this.log({
      accion: 'anuncio_desvinculado',
      tabla_afectada: 'config_cursos_ctwa',
      registro_id: anuncioId,
      valores_anteriores: { ad_id: anuncioData.ad_id, nombre: anuncioData.nombre },
      user_name: userName,
      detalles: `Anuncio desvinculado: ${anuncioData.nombre || anuncioData.ad_id}`,
    });
  }
}

export const auditService = new AuditService();
export default auditService;
