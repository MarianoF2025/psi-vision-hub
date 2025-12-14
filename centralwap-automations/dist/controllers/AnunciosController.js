"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.anunciosController = exports.AnunciosController = void 0;
const supabase_1 = require("../config/supabase");
class AnunciosController {
    async listar(req, res) {
        try {
            const { activo, curso_id } = req.query;
            let query = supabase_1.supabase.from('config_cursos_ctwa').select('*, curso:cursos(id, codigo, nombre)').order('created_at', { ascending: false });
            if (activo !== undefined)
                query = query.eq('activo', activo === 'true');
            if (curso_id)
                query = query.eq('curso_id', curso_id);
            const { data, error } = await query;
            if (error)
                throw error;
            res.json({ success: true, data: data || [] });
        }
        catch (error) {
            console.error('Error listando anuncios:', error);
            res.status(500).json({ success: false, error: error.message });
        }
    }
    async obtener(req, res) {
        try {
            const { id } = req.params;
            const { data, error } = await supabase_1.supabase.from('config_cursos_ctwa').select('*, curso:cursos(id, codigo, nombre)').eq('id', id).single();
            if (error) {
                if (error.code === 'PGRST116') {
                    res.status(404).json({ success: false, error: 'Anuncio no encontrado' });
                    return;
                }
                throw error;
            }
            res.json({ success: true, data });
        }
        catch (error) {
            console.error('Error obteniendo anuncio:', error);
            res.status(500).json({ success: false, error: error.message });
        }
    }
    async buscarPorAdId(req, res) {
        try {
            const { adId } = req.params;
            const { data, error } = await supabase_1.supabase.from('config_cursos_ctwa').select('*, curso:cursos(*)').eq('ad_id', adId).eq('activo', true).single();
            if (error) {
                if (error.code === 'PGRST116') {
                    res.status(404).json({ success: false, error: 'Anuncio no encontrado o inactivo' });
                    return;
                }
                throw error;
            }
            res.json({ success: true, data });
        }
        catch (error) {
            console.error('Error buscando anuncio por ad_id:', error);
            res.status(500).json({ success: false, error: error.message });
        }
    }
    async crear(req, res) {
        try {
            const body = req.body;
            if (!body.ad_id) {
                res.status(400).json({ success: false, error: 'El ad_id es requerido' });
                return;
            }
            if (!body.curso_id) {
                res.status(400).json({ success: false, error: 'El curso_id es requerido' });
                return;
            }
            const { data: curso, error: cursoError } = await supabase_1.supabase.from('cursos').select('id, codigo, nombre').eq('id', body.curso_id).single();
            if (cursoError || !curso) {
                res.status(400).json({ success: false, error: 'El curso especificado no existe' });
                return;
            }
            const { data, error } = await supabase_1.supabase.from('config_cursos_ctwa').insert(body).select().single();
            if (error) {
                if (error.code === '23505') {
                    res.status(400).json({ success: false, error: `Ya existe un anuncio con el ad_id "${body.ad_id}"` });
                    return;
                }
                throw error;
            }
            console.log(`✅ Anuncio vinculado: ${body.ad_id} → ${curso.codigo}`);
            res.status(201).json({ success: true, data: { ...data, curso }, message: `Anuncio vinculado al curso ${curso.nombre}` });
        }
        catch (error) {
            console.error('Error creando anuncio:', error);
            res.status(500).json({ success: false, error: error.message });
        }
    }
    async actualizar(req, res) {
        try {
            const { id } = req.params;
            const { nombre, activo, meta_campaign_id, meta_adset_id, meta_headline } = req.body;
            const updateData = {};
            if (nombre !== undefined)
                updateData.nombre = nombre;
            if (activo !== undefined)
                updateData.activo = activo;
            if (meta_campaign_id !== undefined)
                updateData.meta_campaign_id = meta_campaign_id;
            if (meta_adset_id !== undefined)
                updateData.meta_adset_id = meta_adset_id;
            if (meta_headline !== undefined)
                updateData.meta_headline = meta_headline;
            const { data, error } = await supabase_1.supabase.from('config_cursos_ctwa').update(updateData).eq('id', id).select().single();
            if (error) {
                if (error.code === 'PGRST116') {
                    res.status(404).json({ success: false, error: 'Anuncio no encontrado' });
                    return;
                }
                throw error;
            }
            console.log(`✅ Anuncio actualizado: ${data.ad_id}`);
            res.json({ success: true, data, message: 'Anuncio actualizado exitosamente' });
        }
        catch (error) {
            console.error('Error actualizando anuncio:', error);
            res.status(500).json({ success: false, error: error.message });
        }
    }
    async eliminar(req, res) {
        try {
            const { id } = req.params;
            const { data: existing } = await supabase_1.supabase.from('config_cursos_ctwa').select('id, ad_id, nombre').eq('id', id).single();
            if (!existing) {
                res.status(404).json({ success: false, error: 'Anuncio no encontrado' });
                return;
            }
            const { error } = await supabase_1.supabase.from('config_cursos_ctwa').delete().eq('id', id);
            if (error)
                throw error;
            console.log(`🗑️ Anuncio eliminado: ${existing.ad_id}`);
            res.json({ success: true, message: 'Anuncio desvinculado exitosamente' });
        }
        catch (error) {
            console.error('Error eliminando anuncio:', error);
            res.status(500).json({ success: false, error: error.message });
        }
    }
    async toggle(req, res) {
        try {
            const { id } = req.params;
            const { data: existing, error: fetchError } = await supabase_1.supabase.from('config_cursos_ctwa').select('activo, ad_id').eq('id', id).single();
            if (fetchError || !existing) {
                res.status(404).json({ success: false, error: 'Anuncio no encontrado' });
                return;
            }
            const { data, error } = await supabase_1.supabase.from('config_cursos_ctwa').update({ activo: !existing.activo }).eq('id', id).select().single();
            if (error)
                throw error;
            console.log(`🔄 Anuncio ${existing.ad_id}: ${data.activo ? 'ACTIVADO' : 'DESACTIVADO'}`);
            res.json({ success: true, data, message: `Anuncio ${data.activo ? 'activado' : 'desactivado'} exitosamente` });
        }
        catch (error) {
            console.error('Error toggling anuncio:', error);
            res.status(500).json({ success: false, error: error.message });
        }
    }
}
exports.AnunciosController = AnunciosController;
exports.anunciosController = new AnunciosController();
exports.default = exports.anunciosController;
//# sourceMappingURL=AnunciosController.js.map