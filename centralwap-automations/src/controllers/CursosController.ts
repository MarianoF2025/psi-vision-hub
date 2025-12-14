import { Request, Response } from 'express';
import { supabase } from '../config/supabase';
import { Curso, CursoCreate, CursoUpdate, ApiResponse } from '../types';

export class CursosController {
  
  async listar(req: Request, res: Response): Promise<void> {
    try {
      const { activo } = req.query;
      let query = supabase.from('cursos').select('*').order('nombre', { ascending: true });
      if (activo !== undefined) query = query.eq('activo', activo === 'true');
      const { data, error } = await query;
      if (error) throw error;
      res.json({ success: true, data: data || [] } as ApiResponse<Curso[]>);
    } catch (error: any) {
      console.error('Error listando cursos:', error);
      res.status(500).json({ success: false, error: error.message } as ApiResponse);
    }
  }
  
  async obtener(req: Request, res: Response): Promise<void> {
    try {
      const { id } = req.params;
      const { data, error } = await supabase.from('cursos').select('*').eq('id', id).single();
      if (error) {
        if (error.code === 'PGRST116') { res.status(404).json({ success: false, error: 'Curso no encontrado' }); return; }
        throw error;
      }
      res.json({ success: true, data } as ApiResponse<Curso>);
    } catch (error: any) {
      console.error('Error obteniendo curso:', error);
      res.status(500).json({ success: false, error: error.message } as ApiResponse);
    }
  }
  
  async obtenerPorCodigo(req: Request, res: Response): Promise<void> {
    try {
      const { codigo } = req.params;
      const { data, error } = await supabase.from('cursos').select('*').eq('codigo', codigo.toUpperCase()).single();
      if (error) {
        if (error.code === 'PGRST116') { res.status(404).json({ success: false, error: 'Curso no encontrado' }); return; }
        throw error;
      }
      res.json({ success: true, data } as ApiResponse<Curso>);
    } catch (error: any) {
      console.error('Error obteniendo curso:', error);
      res.status(500).json({ success: false, error: error.message } as ApiResponse);
    }
  }
  
  async crear(req: Request, res: Response): Promise<void> {
    try {
      const body: CursoCreate = req.body;
      if (!body.codigo) { res.status(400).json({ success: false, error: 'El código del curso es requerido' }); return; }
      if (!body.nombre) { res.status(400).json({ success: false, error: 'El nombre del curso es requerido' }); return; }
      const cursoData = { ...body, codigo: body.codigo.toUpperCase() };
      const { data, error } = await supabase.from('cursos').insert(cursoData).select().single();
      if (error) {
        if (error.code === '23505') { res.status(400).json({ success: false, error: `Ya existe un curso con el código "${body.codigo}"` }); return; }
        throw error;
      }
      console.log(`✅ Curso creado: ${data.codigo} - ${data.nombre}`);
      res.status(201).json({ success: true, data, message: 'Curso creado exitosamente' } as ApiResponse<Curso>);
    } catch (error: any) {
      console.error('Error creando curso:', error);
      res.status(500).json({ success: false, error: error.message } as ApiResponse);
    }
  }
  
  async actualizar(req: Request, res: Response): Promise<void> {
    try {
      const { id } = req.params;
      const body: CursoUpdate = req.body;
      // Eliminar campos que no pertenecen a la tabla cursos
      delete (body as any).anuncios;
      delete (body as any).opciones;
      delete (body as any).id;
      if (body.codigo) body.codigo = body.codigo.toUpperCase();
      const { data, error } = await supabase.from('cursos').update(body).eq('id', id).select().single();
      if (error) {
        if (error.code === 'PGRST116') { res.status(404).json({ success: false, error: 'Curso no encontrado' }); return; }
        if (error.code === '23505') { res.status(400).json({ success: false, error: 'Ya existe un curso con ese código' }); return; }
        throw error;
      }
      console.log(`✅ Curso actualizado: ${data.codigo}`);
      res.json({ success: true, data, message: 'Curso actualizado exitosamente' } as ApiResponse<Curso>);
    } catch (error: any) {
      console.error('Error actualizando curso:', error);
      res.status(500).json({ success: false, error: error.message } as ApiResponse);
    }
  }
  
  async eliminar(req: Request, res: Response): Promise<void> {
    try {
      const { id } = req.params;
      const { data: existing } = await supabase.from('cursos').select('id, codigo').eq('id', id).single();
      if (!existing) { res.status(404).json({ success: false, error: 'Curso no encontrado' }); return; }
      const { error } = await supabase.from('cursos').delete().eq('id', id);
      if (error) throw error;
      console.log(`🗑️ Curso eliminado: ${existing.codigo}`);
      res.json({ success: true, message: 'Curso eliminado exitosamente' } as ApiResponse);
    } catch (error: any) {
      console.error('Error eliminando curso:', error);
      res.status(500).json({ success: false, error: error.message } as ApiResponse);
    }
  }
  
  async toggle(req: Request, res: Response): Promise<void> {
    try {
      const { id } = req.params;
      const { data: existing, error: fetchError } = await supabase.from('cursos').select('activo, codigo').eq('id', id).single();
      if (fetchError || !existing) { res.status(404).json({ success: false, error: 'Curso no encontrado' }); return; }
      const { data, error } = await supabase.from('cursos').update({ activo: !existing.activo }).eq('id', id).select().single();
      if (error) throw error;
      console.log(`🔄 Curso ${existing.codigo}: ${data.activo ? 'ACTIVADO' : 'DESACTIVADO'}`);
      res.json({ success: true, data, message: `Curso ${data.activo ? 'activado' : 'desactivado'} exitosamente` } as ApiResponse<Curso>);
    } catch (error: any) {
      console.error('Error toggling curso:', error);
      res.status(500).json({ success: false, error: error.message } as ApiResponse);
    }
  }
  
  async obtenerCompleto(req: Request, res: Response): Promise<void> {
    try {
      const { id } = req.params;
      const { data: curso, error: cursoError } = await supabase.from('cursos').select('*').eq('id', id).single();
      if (cursoError || !curso) { res.status(404).json({ success: false, error: 'Curso no encontrado' }); return; }
      const { data: opciones } = await supabase.from('menu_opciones').select('*').eq('curso_id', id).order('orden', { ascending: true });
      const { data: anuncios } = await supabase.from('config_cursos_ctwa').select('*').eq('curso_id', id).order('created_at', { ascending: false });
      res.json({ success: true, data: { ...curso, opciones: opciones || [], anuncios: anuncios || [] } } as ApiResponse);
    } catch (error: any) {
      console.error('Error obteniendo curso completo:', error);
      res.status(500).json({ success: false, error: error.message } as ApiResponse);
    }
  }
}

export const cursosController = new CursosController();
export default cursosController;
