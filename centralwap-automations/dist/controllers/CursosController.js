"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.cursosController = exports.CursosController = void 0;
const supabase_1 = require("../config/supabase");
class CursosController {
    async listar(req, res) {
        try {
            const { activo } = req.query;
            let query = supabase_1.supabase.from('cursos').select('*').order('nombre', { ascending: true });
            if (activo !== undefined)
                query = query.eq('activo', activo === 'true');
            const { data, error } = await query;
            if (error)
                throw error;
            res.json({ success: true, data: data || [] });
        }
        catch (error) {
            console.error('Error listando cursos:', error);
            res.status(500).json({ success: false, error: error.message });
        }
    }
    async obtener(req, res) {
        try {
            const { id } = req.params;
            const { data, error } = await supabase_1.supabase.from('cursos').select('*').eq('id', id).single();
            if (error) {
                if (error.code === 'PGRST116') {
                    res.status(404).json({ success: false, error: 'Curso no encontrado' });
                    return;
                }
                throw error;
            }
            res.json({ success: true, data });
        }
        catch (error) {
            console.error('Error obteniendo curso:', error);
            res.status(500).json({ success: false, error: error.message });
        }
    }
    async obtenerPorCodigo(req, res) {
        try {
            const { codigo } = req.params;
            const { data, error } = await supabase_1.supabase.from('cursos').select('*').eq('codigo', codigo.toUpperCase()).single();
            if (error) {
                if (error.code === 'PGRST116') {
                    res.status(404).json({ success: false, error: 'Curso no encontrado' });
                    return;
                }
                throw error;
            }
            res.json({ success: true, data });
        }
        catch (error) {
            console.error('Error obteniendo curso:', error);
            res.status(500).json({ success: false, error: error.message });
        }
    }
    async crear(req, res) {
        try {
            const body = req.body;
            if (!body.codigo) {
                res.status(400).json({ success: false, error: 'El código del curso es requerido' });
                return;
            }
            if (!body.nombre) {
                res.status(400).json({ success: false, error: 'El nombre del curso es requerido' });
                return;
            }
            const cursoData = { ...body, codigo: body.codigo.toUpperCase() };
            const { data, error } = await supabase_1.supabase.from('cursos').insert(cursoData).select().single();
            if (error) {
                if (error.code === '23505') {
                    res.status(400).json({ success: false, error: `Ya existe un curso con el código "${body.codigo}"` });
                    return;
                }
                throw error;
            }
            console.log(`✅ Curso creado: ${data.codigo} - ${data.nombre}`);
            res.status(201).json({ success: true, data, message: 'Curso creado exitosamente' });
        }
        catch (error) {
            console.error('Error creando curso:', error);
            res.status(500).json({ success: false, error: error.message });
        }
    }
    async actualizar(req, res) {
        try {
            const { id } = req.params;
            const body = req.body;
            // Eliminar campos que no pertenecen a la tabla cursos
            delete body.anuncios;
            delete body.opciones;
            delete body.id;
            if (body.codigo)
                body.codigo = body.codigo.toUpperCase();
            const { data, error } = await supabase_1.supabase.from('cursos').update(body).eq('id', id).select().single();
            if (error) {
                if (error.code === 'PGRST116') {
                    res.status(404).json({ success: false, error: 'Curso no encontrado' });
                    return;
                }
                if (error.code === '23505') {
                    res.status(400).json({ success: false, error: 'Ya existe un curso con ese código' });
                    return;
                }
                throw error;
            }
            console.log(`✅ Curso actualizado: ${data.codigo}`);
            res.json({ success: true, data, message: 'Curso actualizado exitosamente' });
        }
        catch (error) {
            console.error('Error actualizando curso:', error);
            res.status(500).json({ success: false, error: error.message });
        }
    }
    async eliminar(req, res) {
        try {
            const { id } = req.params;
            const { data: existing } = await supabase_1.supabase.from('cursos').select('id, codigo').eq('id', id).single();
            if (!existing) {
                res.status(404).json({ success: false, error: 'Curso no encontrado' });
                return;
            }
            const { error } = await supabase_1.supabase.from('cursos').delete().eq('id', id);
            if (error)
                throw error;
            console.log(`🗑️ Curso eliminado: ${existing.codigo}`);
            res.json({ success: true, message: 'Curso eliminado exitosamente' });
        }
        catch (error) {
            console.error('Error eliminando curso:', error);
            res.status(500).json({ success: false, error: error.message });
        }
    }
    async toggle(req, res) {
        try {
            const { id } = req.params;
            const { data: existing, error: fetchError } = await supabase_1.supabase.from('cursos').select('activo, codigo').eq('id', id).single();
            if (fetchError || !existing) {
                res.status(404).json({ success: false, error: 'Curso no encontrado' });
                return;
            }
            const { data, error } = await supabase_1.supabase.from('cursos').update({ activo: !existing.activo }).eq('id', id).select().single();
            if (error)
                throw error;
            console.log(`🔄 Curso ${existing.codigo}: ${data.activo ? 'ACTIVADO' : 'DESACTIVADO'}`);
            res.json({ success: true, data, message: `Curso ${data.activo ? 'activado' : 'desactivado'} exitosamente` });
        }
        catch (error) {
            console.error('Error toggling curso:', error);
            res.status(500).json({ success: false, error: error.message });
        }
    }
    async obtenerCompleto(req, res) {
        try {
            const { id } = req.params;
            const { data: curso, error: cursoError } = await supabase_1.supabase.from('cursos').select('*').eq('id', id).single();
            if (cursoError || !curso) {
                res.status(404).json({ success: false, error: 'Curso no encontrado' });
                return;
            }
            const { data: opciones } = await supabase_1.supabase.from('menu_opciones').select('*').eq('curso_id', id).order('orden', { ascending: true });
            const { data: anuncios } = await supabase_1.supabase.from('config_cursos_ctwa').select('*').eq('curso_id', id).order('created_at', { ascending: false });
            res.json({ success: true, data: { ...curso, opciones: opciones || [], anuncios: anuncios || [] } });
        }
        catch (error) {
            console.error('Error obteniendo curso completo:', error);
            res.status(500).json({ success: false, error: error.message });
        }
    }
}
exports.CursosController = CursosController;
exports.cursosController = new CursosController();
exports.default = exports.cursosController;
//# sourceMappingURL=CursosController.js.map