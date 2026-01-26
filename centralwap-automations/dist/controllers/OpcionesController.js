"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.opcionesController = exports.OpcionesController = void 0;
const supabase_1 = require("../config/supabase");
const AuditService_1 = require("../services/AuditService");
class OpcionesController {
    async listar(req, res) {
        try {
            const { cursoId } = req.params;
            const { activo } = req.query;
            let query = supabase_1.supabase.from('menu_opciones').select('*').eq('curso_id', cursoId).order('orden', { ascending: true });
            if (activo !== undefined)
                query = query.eq('activo', activo === 'true');
            const { data, error } = await query;
            if (error)
                throw error;
            res.json({ success: true, data: data || [] });
        }
        catch (error) {
            console.error('Error listando opciones:', error);
            res.status(500).json({ success: false, error: error.message });
        }
    }
    async obtener(req, res) {
        try {
            const { id } = req.params;
            const { data, error } = await supabase_1.supabase.from('menu_opciones').select('*').eq('id', id).single();
            if (error) {
                if (error.code === 'PGRST116') {
                    res.status(404).json({ success: false, error: 'Opción no encontrada' });
                    return;
                }
                throw error;
            }
            res.json({ success: true, data });
        }
        catch (error) {
            console.error('Error obteniendo opción:', error);
            res.status(500).json({ success: false, error: error.message });
        }
    }
    async crear(req, res) {
        try {
            const { cursoId } = req.params;
            const body = req.body;
            const userName = req.headers['x-user-name'];
            if (!body.titulo) {
                res.status(400).json({ success: false, error: 'El título de la opción es requerido' });
                return;
            }
            if (!body.tipo || !['info', 'derivar', 'inscribir'].includes(body.tipo)) {
                res.status(400).json({ success: false, error: 'El tipo debe ser: info, derivar o inscribir' });
                return;
            }
            if (body.tipo === 'info' && !body.campo_info && !body.respuesta_custom) {
                res.status(400).json({ success: false, error: 'Para tipo "info" debe especificar campo_info o respuesta_custom' });
                return;
            }
            let orden = body.orden;
            if (!orden) {
                const { data: lastOpcion } = await supabase_1.supabase.from('menu_opciones').select('orden').eq('curso_id', cursoId).order('orden', { ascending: false }).limit(1).single();
                orden = (lastOpcion?.orden || 0) + 1;
            }
            const opcionData = { ...body, curso_id: cursoId, orden };
            const { data, error } = await supabase_1.supabase.from('menu_opciones').insert(opcionData).select().single();
            if (error) {
                if (error.code === '23505') {
                    res.status(400).json({ success: false, error: 'Ya existe una opción con ese orden en este curso' });
                    return;
                }
                throw error;
            }
            await AuditService_1.auditService.logOpcionCreada(data.id, data, userName);
            console.log(`✅ Opción creada: ${data.emoji || ''} ${data.titulo} (por ${userName || 'Sistema'})`);
            res.status(201).json({ success: true, data, message: 'Opción creada exitosamente' });
        }
        catch (error) {
            console.error('Error creando opción:', error);
            res.status(500).json({ success: false, error: error.message });
        }
    }
    async actualizar(req, res) {
        try {
            const { id } = req.params;
            const body = req.body;
            const userName = req.headers['x-user-name'];
            if (body.tipo && !['info', 'derivar', 'inscribir'].includes(body.tipo)) {
                res.status(400).json({ success: false, error: 'El tipo debe ser: info, derivar o inscribir' });
                return;
            }
            const { data: anterior } = await supabase_1.supabase.from('menu_opciones').select('*').eq('id', id).single();
            if (!anterior) {
                res.status(404).json({ success: false, error: 'Opción no encontrada' });
                return;
            }
            const { data, error } = await supabase_1.supabase.from('menu_opciones').update(body).eq('id', id).select().single();
            if (error) {
                if (error.code === 'PGRST116') {
                    res.status(404).json({ success: false, error: 'Opción no encontrada' });
                    return;
                }
                throw error;
            }
            await AuditService_1.auditService.logOpcionActualizada(id, anterior, body, userName);
            console.log(`✅ Opción actualizada: ${data.emoji || ''} ${data.titulo} (por ${userName || 'Sistema'})`);
            res.json({ success: true, data, message: 'Opción actualizada exitosamente' });
        }
        catch (error) {
            console.error('Error actualizando opción:', error);
            res.status(500).json({ success: false, error: error.message });
        }
    }
    async eliminar(req, res) {
        try {
            const { id } = req.params;
            const userName = req.headers['x-user-name'];
            const { data: existing } = await supabase_1.supabase.from('menu_opciones').select('id, titulo, tipo').eq('id', id).single();
            if (!existing) {
                res.status(404).json({ success: false, error: 'Opción no encontrada' });
                return;
            }
            const { error } = await supabase_1.supabase.from('menu_opciones').delete().eq('id', id);
            if (error)
                throw error;
            await AuditService_1.auditService.logOpcionEliminada(id, existing, userName);
            console.log(`🗑️ Opción eliminada: ${existing.titulo} (por ${userName || 'Sistema'})`);
            res.json({ success: true, message: 'Opción eliminada exitosamente' });
        }
        catch (error) {
            console.error('Error eliminando opción:', error);
            res.status(500).json({ success: false, error: error.message });
        }
    }
    async reordenar(req, res) {
        try {
            const { cursoId } = req.params;
            const { opciones } = req.body;
            const userName = req.headers['x-user-name'];
            if (!opciones || !Array.isArray(opciones)) {
                res.status(400).json({ success: false, error: 'Debe enviar un array de opciones con id y orden' });
                return;
            }
            const updatePromises = opciones.map(({ id, orden }) => supabase_1.supabase.from('menu_opciones').update({ orden }).eq('id', id).eq('curso_id', cursoId));
            await Promise.all(updatePromises);
            const { data } = await supabase_1.supabase.from('menu_opciones').select('*').eq('curso_id', cursoId).order('orden', { ascending: true });
            await AuditService_1.auditService.log({
                accion: 'opciones_reordenadas',
                tabla_afectada: 'menu_opciones',
                registro_id: cursoId,
                valores_nuevos: { orden: opciones },
                user_name: userName,
                detalles: `Opciones reordenadas en curso`,
            });
            console.log(`🔄 Opciones reordenadas para curso ${cursoId} (por ${userName || 'Sistema'})`);
            res.json({ success: true, data, message: 'Opciones reordenadas exitosamente' });
        }
        catch (error) {
            console.error('Error reordenando opciones:', error);
            res.status(500).json({ success: false, error: error.message });
        }
    }
    async toggle(req, res) {
        try {
            const { id } = req.params;
            const userName = req.headers['x-user-name'];
            const { data: existing, error: fetchError } = await supabase_1.supabase.from('menu_opciones').select('activo, titulo').eq('id', id).single();
            if (fetchError || !existing) {
                res.status(404).json({ success: false, error: 'Opción no encontrada' });
                return;
            }
            const { data, error } = await supabase_1.supabase.from('menu_opciones').update({ activo: !existing.activo }).eq('id', id).select().single();
            if (error)
                throw error;
            await AuditService_1.auditService.logOpcionToggle(id, existing.titulo, data.activo, userName);
            console.log(`🔄 Opción ${existing.titulo}: ${data.activo ? 'ACTIVADA' : 'DESACTIVADA'} (por ${userName || 'Sistema'})`);
            res.json({ success: true, data, message: `Opción ${data.activo ? 'activada' : 'desactivada'} exitosamente` });
        }
        catch (error) {
            console.error('Error toggling opción:', error);
            res.status(500).json({ success: false, error: error.message });
        }
    }
}
exports.OpcionesController = OpcionesController;
exports.opcionesController = new OpcionesController();
exports.default = exports.opcionesController;
//# sourceMappingURL=OpcionesController.js.map