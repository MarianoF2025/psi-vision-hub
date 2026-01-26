import { Request, Response } from 'express';
import { supabase } from '../config/supabase';
import { MenuOpcion, MenuOpcionCreate, MenuOpcionUpdate, ApiResponse, ReordenarOpcionesRequest } from '../types';
import { auditService } from '../services/AuditService';

export class OpcionesController {

  async listar(req: Request, res: Response): Promise<void> {
    try {
      const { cursoId } = req.params;
      const { activo } = req.query;
      let query = supabase.from('menu_opciones').select('*').eq('curso_id', cursoId).order('orden', { ascending: true });
      if (activo !== undefined) query = query.eq('activo', activo === 'true');
      const { data, error } = await query;
      if (error) throw error;
      res.json({ success: true, data: data || [] } as ApiResponse<MenuOpcion[]>);
    } catch (error: any) {
      console.error('Error listando opciones:', error);
      res.status(500).json({ success: false, error: error.message } as ApiResponse);
    }
  }

  async obtener(req: Request, res: Response): Promise<void> {
    try {
      const { id } = req.params;
      const { data, error } = await supabase.from('menu_opciones').select('*').eq('id', id).single();
      if (error) {
        if (error.code === 'PGRST116') { res.status(404).json({ success: false, error: 'Opción no encontrada' }); return; }
        throw error;
      }
      res.json({ success: true, data } as ApiResponse<MenuOpcion>);
    } catch (error: any) {
      console.error('Error obteniendo opción:', error);
      res.status(500).json({ success: false, error: error.message } as ApiResponse);
    }
  }

  async crear(req: Request, res: Response): Promise<void> {
    try {
      const { cursoId } = req.params;
      const body: MenuOpcionCreate = req.body;
      const userName = req.headers['x-user-name'] as string;
      
      if (!body.titulo) { res.status(400).json({ success: false, error: 'El título de la opción es requerido' }); return; }
      if (!body.tipo || !['info', 'derivar', 'inscribir'].includes(body.tipo)) {
        res.status(400).json({ success: false, error: 'El tipo debe ser: info, derivar o inscribir' }); return;
      }
      if (body.tipo === 'info' && !body.campo_info && !body.respuesta_custom) {
        res.status(400).json({ success: false, error: 'Para tipo "info" debe especificar campo_info o respuesta_custom' }); return;
      }
      
      let orden = body.orden;
      if (!orden) {
        const { data: lastOpcion } = await supabase.from('menu_opciones').select('orden').eq('curso_id', cursoId).order('orden', { ascending: false }).limit(1).single();
        orden = (lastOpcion?.orden || 0) + 1;
      }
      
      const opcionData = { ...body, curso_id: cursoId, orden };
      const { data, error } = await supabase.from('menu_opciones').insert(opcionData).select().single();
      
      if (error) {
        if (error.code === '23505') { res.status(400).json({ success: false, error: 'Ya existe una opción con ese orden en este curso' }); return; }
        throw error;
      }
      
      await auditService.logOpcionCreada(data.id, data, userName);
      
      console.log(`✅ Opción creada: ${data.emoji || ''} ${data.titulo} (por ${userName || 'Sistema'})`);
      res.status(201).json({ success: true, data, message: 'Opción creada exitosamente' } as ApiResponse<MenuOpcion>);
    } catch (error: any) {
      console.error('Error creando opción:', error);
      res.status(500).json({ success: false, error: error.message } as ApiResponse);
    }
  }

  async actualizar(req: Request, res: Response): Promise<void> {
    try {
      const { id } = req.params;
      const body: MenuOpcionUpdate = req.body;
      const userName = req.headers['x-user-name'] as string;
      
      if (body.tipo && !['info', 'derivar', 'inscribir'].includes(body.tipo)) {
        res.status(400).json({ success: false, error: 'El tipo debe ser: info, derivar o inscribir' }); return;
      }
      
      const { data: anterior } = await supabase.from('menu_opciones').select('*').eq('id', id).single();
      if (!anterior) { res.status(404).json({ success: false, error: 'Opción no encontrada' }); return; }
      
      const { data, error } = await supabase.from('menu_opciones').update(body).eq('id', id).select().single();
      if (error) {
        if (error.code === 'PGRST116') { res.status(404).json({ success: false, error: 'Opción no encontrada' }); return; }
        throw error;
      }
      
      await auditService.logOpcionActualizada(id, anterior, body, userName);
      
      console.log(`✅ Opción actualizada: ${data.emoji || ''} ${data.titulo} (por ${userName || 'Sistema'})`);
      res.json({ success: true, data, message: 'Opción actualizada exitosamente' } as ApiResponse<MenuOpcion>);
    } catch (error: any) {
      console.error('Error actualizando opción:', error);
      res.status(500).json({ success: false, error: error.message } as ApiResponse);
    }
  }

  async eliminar(req: Request, res: Response): Promise<void> {
    try {
      const { id } = req.params;
      const userName = req.headers['x-user-name'] as string;
      
      const { data: existing } = await supabase.from('menu_opciones').select('id, titulo, tipo').eq('id', id).single();
      if (!existing) { res.status(404).json({ success: false, error: 'Opción no encontrada' }); return; }
      
      const { error } = await supabase.from('menu_opciones').delete().eq('id', id);
      if (error) throw error;
      
      await auditService.logOpcionEliminada(id, existing, userName);
      
      console.log(`🗑️ Opción eliminada: ${existing.titulo} (por ${userName || 'Sistema'})`);
      res.json({ success: true, message: 'Opción eliminada exitosamente' } as ApiResponse);
    } catch (error: any) {
      console.error('Error eliminando opción:', error);
      res.status(500).json({ success: false, error: error.message } as ApiResponse);
    }
  }

  async reordenar(req: Request, res: Response): Promise<void> {
    try {
      const { cursoId } = req.params;
      const { opciones }: ReordenarOpcionesRequest = req.body;
      const userName = req.headers['x-user-name'] as string;
      
      if (!opciones || !Array.isArray(opciones)) {
        res.status(400).json({ success: false, error: 'Debe enviar un array de opciones con id y orden' }); return;
      }
      
      const updatePromises = opciones.map(({ id, orden }) =>
        supabase.from('menu_opciones').update({ orden }).eq('id', id).eq('curso_id', cursoId)
      );
      await Promise.all(updatePromises);
      
      const { data } = await supabase.from('menu_opciones').select('*').eq('curso_id', cursoId).order('orden', { ascending: true });
      
      await auditService.log({
        accion: 'opciones_reordenadas',
        tabla_afectada: 'menu_opciones',
        registro_id: cursoId,
        valores_nuevos: { orden: opciones },
        user_name: userName,
        detalles: `Opciones reordenadas en curso`,
      });
      
      console.log(`🔄 Opciones reordenadas para curso ${cursoId} (por ${userName || 'Sistema'})`);
      res.json({ success: true, data, message: 'Opciones reordenadas exitosamente' } as ApiResponse<MenuOpcion[]>);
    } catch (error: any) {
      console.error('Error reordenando opciones:', error);
      res.status(500).json({ success: false, error: error.message } as ApiResponse);
    }
  }

  async toggle(req: Request, res: Response): Promise<void> {
    try {
      const { id } = req.params;
      const userName = req.headers['x-user-name'] as string;
      
      const { data: existing, error: fetchError } = await supabase.from('menu_opciones').select('activo, titulo').eq('id', id).single();
      if (fetchError || !existing) { res.status(404).json({ success: false, error: 'Opción no encontrada' }); return; }
      
      const { data, error } = await supabase.from('menu_opciones').update({ activo: !existing.activo }).eq('id', id).select().single();
      if (error) throw error;
      
      await auditService.logOpcionToggle(id, existing.titulo, data.activo, userName);
      
      console.log(`🔄 Opción ${existing.titulo}: ${data.activo ? 'ACTIVADA' : 'DESACTIVADA'} (por ${userName || 'Sistema'})`);
      res.json({ success: true, data, message: `Opción ${data.activo ? 'activada' : 'desactivada'} exitosamente` } as ApiResponse<MenuOpcion>);
    } catch (error: any) {
      console.error('Error toggling opción:', error);
      res.status(500).json({ success: false, error: error.message } as ApiResponse);
    }
  }
}

export const opcionesController = new OpcionesController();
export default opcionesController;
