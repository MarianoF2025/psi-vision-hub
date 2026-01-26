"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.auditService = exports.AuditService = void 0;
const supabase_1 = require("../config/supabase");
class AuditService {
    async log(entry) {
        try {
            const { error } = await supabase_1.supabase.from('audit_log').insert({
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
        }
        catch (err) {
            console.error('Error en AuditService.log:', err);
        }
    }
    async logCursoCreado(cursoId, cursoData, userName) {
        await this.log({
            accion: 'curso_creado',
            tabla_afectada: 'cursos',
            registro_id: cursoId,
            valores_nuevos: { codigo: cursoData.codigo, nombre: cursoData.nombre },
            user_name: userName,
            detalles: `Curso creado: ${cursoData.codigo} - ${cursoData.nombre}`,
        });
    }
    async logCursoActualizado(cursoId, antes, despues, userName) {
        const cambios = {};
        const anterior = {};
        for (const key of Object.keys(despues)) {
            if (antes[key] !== despues[key]) {
                cambios[key] = despues[key];
                anterior[key] = antes[key];
            }
        }
        if (Object.keys(cambios).length === 0)
            return;
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
    async logCursoEliminado(cursoId, cursoData, userName) {
        await this.log({
            accion: 'curso_eliminado',
            tabla_afectada: 'cursos',
            registro_id: cursoId,
            valores_anteriores: { codigo: cursoData.codigo, nombre: cursoData.nombre },
            user_name: userName,
            detalles: `Curso eliminado: ${cursoData.codigo}`,
        });
    }
    async logCursoToggle(cursoId, codigo, nuevoEstado, userName) {
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
    async logOpcionCreada(opcionId, opcionData, userName) {
        await this.log({
            accion: 'opcion_menu_creada',
            tabla_afectada: 'menu_opciones',
            registro_id: opcionId,
            valores_nuevos: { titulo: opcionData.titulo, tipo: opcionData.tipo, curso_id: opcionData.curso_id },
            user_name: userName,
            detalles: `Opción creada: ${opcionData.emoji || ''} ${opcionData.titulo}`,
        });
    }
    async logOpcionActualizada(opcionId, antes, despues, userName) {
        const cambios = {};
        const anterior = {};
        for (const key of Object.keys(despues)) {
            if (antes[key] !== despues[key]) {
                cambios[key] = despues[key];
                anterior[key] = antes[key];
            }
        }
        if (Object.keys(cambios).length === 0)
            return;
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
    async logOpcionEliminada(opcionId, opcionData, userName) {
        await this.log({
            accion: 'opcion_menu_eliminada',
            tabla_afectada: 'menu_opciones',
            registro_id: opcionId,
            valores_anteriores: { titulo: opcionData.titulo, tipo: opcionData.tipo },
            user_name: userName,
            detalles: `Opción eliminada: ${opcionData.titulo}`,
        });
    }
    async logOpcionToggle(opcionId, titulo, nuevoEstado, userName) {
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
    async logAnuncioVinculado(anuncioId, anuncioData, userName) {
        await this.log({
            accion: 'anuncio_vinculado',
            tabla_afectada: 'config_cursos_ctwa',
            registro_id: anuncioId,
            valores_nuevos: { ad_id: anuncioData.ad_id, curso_id: anuncioData.curso_id, nombre: anuncioData.nombre },
            user_name: userName,
            detalles: `Anuncio vinculado: ${anuncioData.nombre || anuncioData.ad_id}`,
        });
    }
    async logAnuncioDesvinculado(anuncioId, anuncioData, userName) {
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
exports.AuditService = AuditService;
exports.auditService = new AuditService();
exports.default = exports.auditService;
//# sourceMappingURL=AuditService.js.map