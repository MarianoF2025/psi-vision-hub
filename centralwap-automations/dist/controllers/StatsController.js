"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.statsController = exports.StatsController = void 0;
const supabase_1 = require("../config/supabase");
class StatsController {
    async dashboard(req, res) {
        try {
            const inicioMes = new Date();
            inicioMes.setDate(1);
            inicioMes.setHours(0, 0, 0, 0);
            // Total leads este mes
            const { count: leadsEsteMes } = await supabase_1.supabase.from('menu_sesiones').select('*', { count: 'exact', head: true }).gte('created_at', inicioMes.toISOString());
            // Leads por origen
            const { count: leadsCTWA } = await supabase_1.supabase.from('menu_sesiones').select('*', { count: 'exact', head: true }).gte('created_at', inicioMes.toISOString()).eq('origen', 'ctwa');
            const { count: leadsDirectos } = await supabase_1.supabase.from('menu_sesiones').select('*', { count: 'exact', head: true }).gte('created_at', inicioMes.toISOString()).eq('origen', 'directo');
            // Interacciones
            const { count: interaccionesEsteMes } = await supabase_1.supabase.from('menu_interacciones').select('*', { count: 'exact', head: true }).gte('created_at', inicioMes.toISOString());
            // Leads que tuvieron al menos 1 interacción
            const { data: sesionesEngaged } = await supabase_1.supabase.from('menu_sesiones').select('id').gte('created_at', inicioMes.toISOString()).gt('interacciones', 0);
            const leadsEngaged = sesionesEngaged?.length || 0;
            // Engagement rate
            const engagementRate = leadsEsteMes && leadsEsteMes > 0 ? Math.round((leadsEngaged / leadsEsteMes) * 100 * 10) / 10 : 0;
            const { count: cursosActivos } = await supabase_1.supabase.from('cursos').select('*', { count: 'exact', head: true }).eq('activo', true);
            const { count: anunciosActivos } = await supabase_1.supabase.from('config_cursos_ctwa').select('*', { count: 'exact', head: true }).eq('activo', true);
            res.json({
                success: true,
                data: {
                    leads_este_mes: leadsEsteMes || 0,
                    leads_ctwa: leadsCTWA || 0,
                    leads_directos: leadsDirectos || 0,
                    interacciones_este_mes: interaccionesEsteMes || 0,
                    ctr_promedio: engagementRate,
                    cursos_activos: cursosActivos || 0,
                    anuncios_activos: anunciosActivos || 0
                }
            });
        }
        catch (error) {
            console.error('Error obteniendo dashboard:', error);
            res.status(500).json({ success: false, error: error.message });
        }
    }
    async ctrPorCurso(req, res) {
        try {
            const { data: cursos } = await supabase_1.supabase.from('cursos').select('id, codigo, nombre, activo');
            const stats = await Promise.all((cursos || []).map(async (curso) => {
                const { count: leads } = await supabase_1.supabase.from('menu_sesiones').select('*', { count: 'exact', head: true }).eq('curso_id', curso.id);
                const { count: leadsCTWA } = await supabase_1.supabase.from('menu_sesiones').select('*', { count: 'exact', head: true }).eq('curso_id', curso.id).eq('origen', 'ctwa');
                const { count: leadsDirectos } = await supabase_1.supabase.from('menu_sesiones').select('*', { count: 'exact', head: true }).eq('curso_id', curso.id).eq('origen', 'directo');
                // Leads con interacción
                const { data: sesionesEngaged } = await supabase_1.supabase.from('menu_sesiones').select('id').eq('curso_id', curso.id).gt('interacciones', 0);
                const leadsEngaged = sesionesEngaged?.length || 0;
                const inicioMes = new Date();
                inicioMes.setDate(1);
                const { count: leadsMes } = await supabase_1.supabase.from('menu_sesiones').select('*', { count: 'exact', head: true }).eq('curso_id', curso.id).gte('created_at', inicioMes.toISOString());
                // CTR corregido
                const ctr = leads && leads > 0 ? Math.round((leadsEngaged / leads) * 100 * 10) / 10 : 0;
                return {
                    id: curso.id, codigo: curso.codigo, nombre: curso.nombre, activo: curso.activo,
                    total_leads: leads || 0,
                    leads_ctwa: leadsCTWA || 0,
                    leads_directos: leadsDirectos || 0,
                    total_interacciones: leadsEngaged,
                    ctr_promedio: ctr, leads_este_mes: leadsMes || 0
                };
            }));
            res.json({ success: true, data: stats.sort((a, b) => b.total_leads - a.total_leads) });
        }
        catch (error) {
            console.error('Error obteniendo CTR por curso:', error);
            res.status(500).json({ success: false, error: error.message });
        }
    }
    async ctrPorOpcion(req, res) {
        try {
            const { cursoId } = req.params;
            const { data: opciones } = await supabase_1.supabase.from('menu_opciones').select('*').eq('curso_id', cursoId).order('orden', { ascending: true });
            const { count: totalSesiones } = await supabase_1.supabase.from('menu_sesiones').select('*', { count: 'exact', head: true }).eq('curso_id', cursoId);
            const stats = await Promise.all((opciones || []).map(async (opcion) => {
                const { count: veces } = await supabase_1.supabase.from('menu_interacciones').select('*', { count: 'exact', head: true }).eq('opcion_id', opcion.id);
                return {
                    opcion_id: opcion.id, curso_id: opcion.curso_id, orden: opcion.orden, emoji: opcion.emoji,
                    titulo: opcion.titulo, tipo: opcion.tipo, activo: opcion.activo, veces_elegida: veces || 0,
                    ctr_opcion: totalSesiones && totalSesiones > 0 ? Math.round(((veces || 0) / totalSesiones) * 100 * 10) / 10 : 0
                };
            }));
            res.json({ success: true, data: stats });
        }
        catch (error) {
            console.error('Error obteniendo CTR por opción:', error);
            res.status(500).json({ success: false, error: error.message });
        }
    }
    async automatizaciones(req, res) {
        try {
            const { data: configs } = await supabase_1.supabase.from('config_cursos_ctwa').select('*, curso:cursos(id, codigo, nombre)').order('ejecuciones', { ascending: false });
            const stats = await Promise.all((configs || []).map(async (config) => {
                const { count: leads } = await supabase_1.supabase.from('menu_sesiones').select('*', { count: 'exact', head: true }).eq('config_ctwa_id', config.id);
                // Leads con interacción
                const { data: sesionesEngaged } = await supabase_1.supabase.from('menu_sesiones').select('id').eq('config_ctwa_id', config.id).gt('interacciones', 0);
                const leadsEngaged = sesionesEngaged?.length || 0;
                const { count: opcionesActivas } = await supabase_1.supabase.from('menu_opciones').select('*', { count: 'exact', head: true }).eq('curso_id', config.curso_id).eq('activo', true);
                const curso = config.curso;
                // CTR corregido
                const ctr = config.ejecuciones && config.ejecuciones > 0 ? Math.round((leadsEngaged / config.ejecuciones) * 100 * 10) / 10 : 0;
                return {
                    id: config.id, ad_id: config.ad_id, nombre: config.nombre, activo: config.activo,
                    ejecuciones: config.ejecuciones, created_at: config.created_at,
                    curso_id: curso?.id, curso_codigo: curso?.codigo, curso_nombre: curso?.nombre,
                    opciones_activas: opcionesActivas || 0, leads_generados: leads || 0, ctr_anuncio: ctr
                };
            }));
            res.json({ success: true, data: stats });
        }
        catch (error) {
            console.error('Error obteniendo automatizaciones:', error);
            res.status(500).json({ success: false, error: error.message });
        }
    }
    async interaccionesRecientes(req, res) {
        try {
            const { limit = '50', curso_id, desde, hasta } = req.query;
            let query = supabase_1.supabase.from('menu_interacciones').select('*').order('created_at', { ascending: false }).limit(parseInt(limit));
            if (curso_id)
                query = query.eq('curso_id', curso_id);
            if (desde)
                query = query.gte('created_at', desde);
            if (hasta)
                query = query.lte('created_at', hasta);
            const { data, error } = await query;
            if (error)
                throw error;
            res.json({ success: true, data: data || [] });
        }
        catch (error) {
            console.error('Error obteniendo interacciones:', error);
            res.status(500).json({ success: false, error: error.message });
        }
    }
    async detalleCurso(req, res) {
        try {
            const { cursoId } = req.params;
            const ahora = new Date();
            const inicioMesActual = new Date(ahora.getFullYear(), ahora.getMonth(), 1);
            const inicioMesAnterior = new Date(ahora.getFullYear(), ahora.getMonth() - 1, 1);
            const finMesAnterior = new Date(ahora.getFullYear(), ahora.getMonth(), 0, 23, 59, 59);
            const { count: leadsMesActual } = await supabase_1.supabase.from('menu_sesiones').select('*', { count: 'exact', head: true }).eq('curso_id', cursoId).gte('created_at', inicioMesActual.toISOString());
            const { count: leadsMesAnterior } = await supabase_1.supabase.from('menu_sesiones').select('*', { count: 'exact', head: true }).eq('curso_id', cursoId).gte('created_at', inicioMesAnterior.toISOString()).lte('created_at', finMesAnterior.toISOString());
            const { count: leadsTotal } = await supabase_1.supabase.from('menu_sesiones').select('*', { count: 'exact', head: true }).eq('curso_id', cursoId);
            // Por origen
            const { count: leadsCTWA } = await supabase_1.supabase.from('menu_sesiones').select('*', { count: 'exact', head: true }).eq('curso_id', cursoId).eq('origen', 'ctwa');
            const { count: leadsDirectos } = await supabase_1.supabase.from('menu_sesiones').select('*', { count: 'exact', head: true }).eq('curso_id', cursoId).eq('origen', 'directo');
            const { data: sesionesConInteraccion } = await supabase_1.supabase.from('menu_sesiones').select('id').eq('curso_id', cursoId).gt('interacciones', 0);
            const sesionesEngaged = sesionesConInteraccion?.length || 0;
            const tasaEngagement = leadsTotal && leadsTotal > 0 ? Math.round((sesionesEngaged / leadsTotal) * 100) : 0;
            const { data: opciones } = await supabase_1.supabase.from('menu_opciones').select('id, orden, emoji, titulo, tipo, activo').eq('curso_id', cursoId).order('orden', { ascending: true });
            let inscripciones = 0, derivaciones = 0, infoRequests = 0;
            const opcionesConVeces = await Promise.all((opciones || []).map(async (opcion) => {
                const { count: vecesElegida } = await supabase_1.supabase.from('menu_interacciones').select('*', { count: 'exact', head: true }).eq('opcion_id', opcion.id);
                const veces = vecesElegida || 0;
                if (opcion.tipo === 'inscribir')
                    inscripciones += veces;
                else if (opcion.tipo === 'derivar')
                    derivaciones += veces;
                else if (opcion.tipo === 'info')
                    infoRequests += veces;
                return { ...opcion, veces_elegida: veces };
            }));
            const totalInteracciones = inscripciones + derivaciones + infoRequests;
            const opcionesConCTR = opcionesConVeces.map(opcion => ({
                ...opcion,
                ctr: totalInteracciones > 0 ? Math.round((opcion.veces_elegida / totalInteracciones) * 100 * 10) / 10 : 0
            }));
            const { data: anuncios } = await supabase_1.supabase.from('config_cursos_ctwa').select('id, ad_id, nombre, activo, ejecuciones').eq('curso_id', cursoId);
            const anunciosConStats = await Promise.all((anuncios || []).map(async (anuncio) => {
                const { count: leadsAnuncio } = await supabase_1.supabase.from('menu_sesiones').select('*', { count: 'exact', head: true }).eq('config_ctwa_id', anuncio.id);
                const { data: sesionesAnuncio } = await supabase_1.supabase.from('menu_sesiones').select('id').eq('config_ctwa_id', anuncio.id).gt('interacciones', 0);
                const engageAnuncio = sesionesAnuncio?.length || 0;
                const { data: interaccionesAnuncio } = await supabase_1.supabase.from('menu_interacciones').select('opcion_id').eq('config_ctwa_id', anuncio.id);
                const opcionesInscribir = (opciones || []).filter(o => o.tipo === 'inscribir').map(o => o.id);
                const inscripcionesAnuncio = (interaccionesAnuncio || []).filter(i => opcionesInscribir.includes(i.opcion_id)).length;
                return {
                    ...anuncio,
                    leads: leadsAnuncio || 0,
                    engagement: leadsAnuncio && leadsAnuncio > 0 ? Math.round((engageAnuncio / leadsAnuncio) * 100) : 0,
                    inscripciones: inscripcionesAnuncio,
                    tasa_inscripcion: leadsAnuncio && leadsAnuncio > 0 ? Math.round((inscripcionesAnuncio / leadsAnuncio) * 100 * 10) / 10 : 0
                };
            }));
            const variacionLeads = leadsMesAnterior && leadsMesAnterior > 0
                ? Math.round(((leadsMesActual || 0) - leadsMesAnterior) / leadsMesAnterior * 100)
                : (leadsMesActual || 0) > 0 ? 100 : 0;
            const abandono = leadsTotal && leadsTotal > 0 ? Math.round(((leadsTotal - sesionesEngaged) / leadsTotal) * 100) : 0;
            res.json({
                success: true,
                data: {
                    resumen: {
                        leads_mes_actual: leadsMesActual || 0, leads_mes_anterior: leadsMesAnterior || 0, variacion_leads: variacionLeads,
                        leads_total: leadsTotal || 0, leads_ctwa: leadsCTWA || 0, leads_directos: leadsDirectos || 0,
                        tasa_engagement: tasaEngagement, tasa_abandono: abandono,
                        total_interacciones: totalInteracciones, inscripciones, derivaciones, info_requests: infoRequests,
                        tasa_inscripcion: totalInteracciones > 0 ? Math.round((inscripciones / totalInteracciones) * 100 * 10) / 10 : 0,
                        tasa_derivacion: totalInteracciones > 0 ? Math.round((derivaciones / totalInteracciones) * 100 * 10) / 10 : 0
                    },
                    opciones: opcionesConCTR,
                    anuncios: anunciosConStats,
                    periodo: { mes_actual: inicioMesActual.toISOString(), mes_anterior_inicio: inicioMesAnterior.toISOString(), mes_anterior_fin: finMesAnterior.toISOString() }
                }
            });
        }
        catch (error) {
            console.error('Error obteniendo detalle de curso:', error);
            res.status(500).json({ success: false, error: error.message });
        }
    }
}
exports.StatsController = StatsController;
exports.statsController = new StatsController();
exports.default = exports.statsController;
//# sourceMappingURL=StatsController.js.map