"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.statsController = exports.StatsController = void 0;
const supabase_1 = require("../config/supabase");
// Helper para obtener rangos de fecha
function getDateRange(desde, hasta, periodo) {
    const ahora = new Date();
    let inicio;
    let fin = hasta ? new Date(hasta + 'T23:59:59') : new Date(ahora.getFullYear(), ahora.getMonth(), ahora.getDate(), 23, 59, 59);
    if (desde) {
        inicio = new Date(desde + 'T00:00:00');
    }
    else if (periodo) {
        switch (periodo) {
            case 'hoy':
                inicio = new Date(ahora.getFullYear(), ahora.getMonth(), ahora.getDate(), 0, 0, 0);
                break;
            case 'ayer':
                inicio = new Date(ahora.getFullYear(), ahora.getMonth(), ahora.getDate() - 1, 0, 0, 0);
                fin = new Date(ahora.getFullYear(), ahora.getMonth(), ahora.getDate() - 1, 23, 59, 59);
                break;
            case 'semana':
                const dayOfWeek = ahora.getDay();
                const diffToMonday = dayOfWeek === 0 ? 6 : dayOfWeek - 1;
                inicio = new Date(ahora.getFullYear(), ahora.getMonth(), ahora.getDate() - diffToMonday, 0, 0, 0);
                break;
            case 'mes':
                inicio = new Date(ahora.getFullYear(), ahora.getMonth(), 1, 0, 0, 0);
                break;
            case 'mes_anterior':
                inicio = new Date(ahora.getFullYear(), ahora.getMonth() - 1, 1, 0, 0, 0);
                fin = new Date(ahora.getFullYear(), ahora.getMonth(), 0, 23, 59, 59);
                break;
            case 'trimestre':
                inicio = new Date(ahora.getFullYear(), ahora.getMonth() - 2, 1, 0, 0, 0);
                break;
            case 'año':
                inicio = new Date(ahora.getFullYear(), 0, 1, 0, 0, 0);
                break;
            case 'todo':
                inicio = new Date(2020, 0, 1, 0, 0, 0);
                break;
            default:
                inicio = new Date(ahora.getFullYear(), ahora.getMonth(), 1, 0, 0, 0);
        }
    }
    else {
        inicio = new Date(ahora.getFullYear(), ahora.getMonth(), 1, 0, 0, 0);
    }
    return { inicio, fin };
}
class StatsController {
    async dashboard(req, res) {
        try {
            const { desde, hasta, periodo } = req.query;
            const { inicio, fin } = getDateRange(desde, hasta, periodo);
            // Total leads en período
            const { count: leadsPeriodo } = await supabase_1.supabase.from('menu_sesiones')
                .select('*', { count: 'exact', head: true })
                .gte('created_at', inicio.toISOString())
                .lte('created_at', fin.toISOString());
            // Leads por origen
            const { count: leadsCTWA } = await supabase_1.supabase.from('menu_sesiones')
                .select('*', { count: 'exact', head: true })
                .gte('created_at', inicio.toISOString())
                .lte('created_at', fin.toISOString())
                .eq('origen', 'ctwa');
            const { count: leadsDirectos } = await supabase_1.supabase.from('menu_sesiones')
                .select('*', { count: 'exact', head: true })
                .gte('created_at', inicio.toISOString())
                .lte('created_at', fin.toISOString())
                .eq('origen', 'directo');
            // Interacciones
            const { count: interaccionesPeriodo } = await supabase_1.supabase.from('menu_interacciones')
                .select('*', { count: 'exact', head: true })
                .gte('created_at', inicio.toISOString())
                .lte('created_at', fin.toISOString());
            // Leads con interacción
            const { data: sesionesEngaged } = await supabase_1.supabase.from('menu_sesiones')
                .select('id')
                .gte('created_at', inicio.toISOString())
                .lte('created_at', fin.toISOString())
                .gt('interacciones', 0);
            const leadsEngaged = sesionesEngaged?.length || 0;
            const engagementRate = leadsPeriodo && leadsPeriodo > 0
                ? Math.round((leadsEngaged / leadsPeriodo) * 100 * 10) / 10
                : 0;
            const { count: cursosActivos } = await supabase_1.supabase.from('cursos')
                .select('*', { count: 'exact', head: true })
                .eq('activo', true);
            const { count: anunciosActivos } = await supabase_1.supabase.from('config_cursos_ctwa')
                .select('*', { count: 'exact', head: true })
                .eq('activo', true);
            res.json({
                success: true,
                data: {
                    leads_este_mes: leadsPeriodo || 0,
                    leads_ctwa: leadsCTWA || 0,
                    leads_directos: leadsDirectos || 0,
                    interacciones_este_mes: interaccionesPeriodo || 0,
                    ctr_promedio: engagementRate,
                    cursos_activos: cursosActivos || 0,
                    anuncios_activos: anunciosActivos || 0,
                    periodo: {
                        desde: inicio.toISOString(),
                        hasta: fin.toISOString()
                    }
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
            const { desde, hasta, periodo } = req.query;
            const { inicio, fin } = getDateRange(desde, hasta, periodo);
            const { data: cursos } = await supabase_1.supabase.from('cursos').select('id, codigo, nombre, activo');
            const stats = await Promise.all((cursos || []).map(async (curso) => {
                // Leads en período
                const { count: leadsPeriodo } = await supabase_1.supabase.from('menu_sesiones')
                    .select('*', { count: 'exact', head: true })
                    .eq('curso_id', curso.id)
                    .gte('created_at', inicio.toISOString())
                    .lte('created_at', fin.toISOString());
                const { count: leadsCTWA } = await supabase_1.supabase.from('menu_sesiones')
                    .select('*', { count: 'exact', head: true })
                    .eq('curso_id', curso.id)
                    .eq('origen', 'ctwa')
                    .gte('created_at', inicio.toISOString())
                    .lte('created_at', fin.toISOString());
                const { count: leadsDirectos } = await supabase_1.supabase.from('menu_sesiones')
                    .select('*', { count: 'exact', head: true })
                    .eq('curso_id', curso.id)
                    .eq('origen', 'directo')
                    .gte('created_at', inicio.toISOString())
                    .lte('created_at', fin.toISOString());
                // Leads con interacción en período
                const { data: sesionesEngaged } = await supabase_1.supabase.from('menu_sesiones')
                    .select('id')
                    .eq('curso_id', curso.id)
                    .gt('interacciones', 0)
                    .gte('created_at', inicio.toISOString())
                    .lte('created_at', fin.toISOString());
                const leadsEngaged = sesionesEngaged?.length || 0;
                const ctr = leadsPeriodo && leadsPeriodo > 0
                    ? Math.round((leadsEngaged / leadsPeriodo) * 100 * 10) / 10
                    : 0;
                return {
                    id: curso.id,
                    codigo: curso.codigo,
                    nombre: curso.nombre,
                    activo: curso.activo,
                    total_leads: leadsPeriodo || 0,
                    leads_ctwa: leadsCTWA || 0,
                    leads_directos: leadsDirectos || 0,
                    total_interacciones: leadsEngaged,
                    ctr_promedio: ctr,
                    leads_este_mes: leadsPeriodo || 0
                };
            }));
            res.json({
                success: true,
                data: stats.sort((a, b) => b.total_leads - a.total_leads)
            });
        }
        catch (error) {
            console.error('Error obteniendo CTR por curso:', error);
            res.status(500).json({ success: false, error: error.message });
        }
    }
    async ctrPorOpcion(req, res) {
        try {
            const { cursoId } = req.params;
            const { desde, hasta, periodo } = req.query;
            const { inicio, fin } = getDateRange(desde, hasta, periodo);
            const { data: opciones } = await supabase_1.supabase.from('menu_opciones')
                .select('*')
                .eq('curso_id', cursoId)
                .order('orden', { ascending: true });
            const { count: totalSesiones } = await supabase_1.supabase.from('menu_sesiones')
                .select('*', { count: 'exact', head: true })
                .eq('curso_id', cursoId)
                .gte('created_at', inicio.toISOString())
                .lte('created_at', fin.toISOString());
            const stats = await Promise.all((opciones || []).map(async (opcion) => {
                const { count: veces } = await supabase_1.supabase.from('menu_interacciones')
                    .select('*', { count: 'exact', head: true })
                    .eq('opcion_id', opcion.id)
                    .gte('created_at', inicio.toISOString())
                    .lte('created_at', fin.toISOString());
                return {
                    opcion_id: opcion.id,
                    curso_id: opcion.curso_id,
                    orden: opcion.orden,
                    emoji: opcion.emoji,
                    titulo: opcion.titulo,
                    tipo: opcion.tipo,
                    activo: opcion.activo,
                    veces_elegida: veces || 0,
                    ctr_opcion: totalSesiones && totalSesiones > 0
                        ? Math.round(((veces || 0) / totalSesiones) * 100 * 10) / 10
                        : 0
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
            const { desde, hasta, periodo } = req.query;
            const { inicio, fin } = getDateRange(desde, hasta, periodo);
            const { data: configs } = await supabase_1.supabase.from('config_cursos_ctwa')
                .select('*, curso:cursos(id, codigo, nombre)')
                .order('ejecuciones', { ascending: false });
            const stats = await Promise.all((configs || []).map(async (config) => {
                const { count: leads } = await supabase_1.supabase.from('menu_sesiones')
                    .select('*', { count: 'exact', head: true })
                    .eq('config_ctwa_id', config.id)
                    .gte('created_at', inicio.toISOString())
                    .lte('created_at', fin.toISOString());
                const { data: sesionesEngaged } = await supabase_1.supabase.from('menu_sesiones')
                    .select('id')
                    .eq('config_ctwa_id', config.id)
                    .gt('interacciones', 0)
                    .gte('created_at', inicio.toISOString())
                    .lte('created_at', fin.toISOString());
                const leadsEngaged = sesionesEngaged?.length || 0;
                const { count: opcionesActivas } = await supabase_1.supabase.from('menu_opciones')
                    .select('*', { count: 'exact', head: true })
                    .eq('curso_id', config.curso_id)
                    .eq('activo', true);
                const curso = config.curso;
                const ctr = leads && leads > 0
                    ? Math.round((leadsEngaged / leads) * 100 * 10) / 10
                    : 0;
                return {
                    id: config.id,
                    ad_id: config.ad_id,
                    nombre: config.nombre,
                    activo: config.activo,
                    ejecuciones: config.ejecuciones,
                    created_at: config.created_at,
                    curso_id: curso?.id,
                    curso_codigo: curso?.codigo,
                    curso_nombre: curso?.nombre,
                    opciones_activas: opcionesActivas || 0,
                    leads_generados: leads || 0,
                    ctr_anuncio: ctr
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
            let query = supabase_1.supabase.from('menu_interacciones')
                .select('*')
                .order('created_at', { ascending: false })
                .limit(parseInt(limit));
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
            const { desde, hasta, periodo } = req.query;
            const { inicio, fin } = getDateRange(desde, hasta, periodo);
            // Período de comparación (mismo rango antes del período seleccionado)
            const duracionMs = fin.getTime() - inicio.getTime();
            const inicioPeriodoAnterior = new Date(inicio.getTime() - duracionMs);
            const finPeriodoAnterior = new Date(inicio.getTime() - 1);
            // Leads en período actual
            const { count: leadsPeriodoActual } = await supabase_1.supabase.from('menu_sesiones')
                .select('*', { count: 'exact', head: true })
                .eq('curso_id', cursoId)
                .gte('created_at', inicio.toISOString())
                .lte('created_at', fin.toISOString());
            // Leads en período anterior (para comparación)
            const { count: leadsPeriodoAnterior } = await supabase_1.supabase.from('menu_sesiones')
                .select('*', { count: 'exact', head: true })
                .eq('curso_id', cursoId)
                .gte('created_at', inicioPeriodoAnterior.toISOString())
                .lte('created_at', finPeriodoAnterior.toISOString());
            // Leads totales históricos
            const { count: leadsTotal } = await supabase_1.supabase.from('menu_sesiones')
                .select('*', { count: 'exact', head: true })
                .eq('curso_id', cursoId);
            // Por origen en período
            const { count: leadsCTWA } = await supabase_1.supabase.from('menu_sesiones')
                .select('*', { count: 'exact', head: true })
                .eq('curso_id', cursoId)
                .eq('origen', 'ctwa')
                .gte('created_at', inicio.toISOString())
                .lte('created_at', fin.toISOString());
            const { count: leadsDirectos } = await supabase_1.supabase.from('menu_sesiones')
                .select('*', { count: 'exact', head: true })
                .eq('curso_id', cursoId)
                .eq('origen', 'directo')
                .gte('created_at', inicio.toISOString())
                .lte('created_at', fin.toISOString());
            // Sesiones con interacción en período
            const { data: sesionesConInteraccion } = await supabase_1.supabase.from('menu_sesiones')
                .select('id')
                .eq('curso_id', cursoId)
                .gt('interacciones', 0)
                .gte('created_at', inicio.toISOString())
                .lte('created_at', fin.toISOString());
            const sesionesEngaged = sesionesConInteraccion?.length || 0;
            const tasaEngagement = leadsPeriodoActual && leadsPeriodoActual > 0
                ? Math.round((sesionesEngaged / leadsPeriodoActual) * 100)
                : 0;
            // Opciones del menú
            const { data: opciones } = await supabase_1.supabase.from('menu_opciones')
                .select('id, orden, emoji, titulo, tipo, activo')
                .eq('curso_id', cursoId)
                .order('orden', { ascending: true });
            let inscripciones = 0, derivaciones = 0, infoRequests = 0;
            const opcionesConVeces = await Promise.all((opciones || []).map(async (opcion) => {
                const { count: vecesElegida } = await supabase_1.supabase.from('menu_interacciones')
                    .select('*', { count: 'exact', head: true })
                    .eq('opcion_id', opcion.id)
                    .gte('created_at', inicio.toISOString())
                    .lte('created_at', fin.toISOString());
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
                ctr: totalInteracciones > 0
                    ? Math.round((opcion.veces_elegida / totalInteracciones) * 100 * 10) / 10
                    : 0
            }));
            // Anuncios con stats en período
            const { data: anuncios } = await supabase_1.supabase.from('config_cursos_ctwa')
                .select('id, ad_id, nombre, activo, ejecuciones')
                .eq('curso_id', cursoId);
            const anunciosConStats = await Promise.all((anuncios || []).map(async (anuncio) => {
                const { count: leadsAnuncio } = await supabase_1.supabase.from('menu_sesiones')
                    .select('*', { count: 'exact', head: true })
                    .eq('config_ctwa_id', anuncio.id)
                    .gte('created_at', inicio.toISOString())
                    .lte('created_at', fin.toISOString());
                const { data: sesionesAnuncio } = await supabase_1.supabase.from('menu_sesiones')
                    .select('id')
                    .eq('config_ctwa_id', anuncio.id)
                    .gt('interacciones', 0)
                    .gte('created_at', inicio.toISOString())
                    .lte('created_at', fin.toISOString());
                const engageAnuncio = sesionesAnuncio?.length || 0;
                const { data: interaccionesAnuncio } = await supabase_1.supabase.from('menu_interacciones')
                    .select('opcion_id')
                    .eq('config_ctwa_id', anuncio.id)
                    .gte('created_at', inicio.toISOString())
                    .lte('created_at', fin.toISOString());
                const opcionesInscribir = (opciones || []).filter(o => o.tipo === 'inscribir').map(o => o.id);
                const inscripcionesAnuncio = (interaccionesAnuncio || []).filter(i => opcionesInscribir.includes(i.opcion_id)).length;
                return {
                    ...anuncio,
                    leads: leadsAnuncio || 0,
                    engagement: leadsAnuncio && leadsAnuncio > 0
                        ? Math.round((engageAnuncio / leadsAnuncio) * 100)
                        : 0,
                    inscripciones: inscripcionesAnuncio,
                    tasa_inscripcion: leadsAnuncio && leadsAnuncio > 0
                        ? Math.round((inscripcionesAnuncio / leadsAnuncio) * 100 * 10) / 10
                        : 0
                };
            }));
            const variacionLeads = leadsPeriodoAnterior && leadsPeriodoAnterior > 0
                ? Math.round(((leadsPeriodoActual || 0) - leadsPeriodoAnterior) / leadsPeriodoAnterior * 100)
                : (leadsPeriodoActual || 0) > 0 ? 100 : 0;
            const abandono = leadsPeriodoActual && leadsPeriodoActual > 0
                ? Math.round(((leadsPeriodoActual - sesionesEngaged) / leadsPeriodoActual) * 100)
                : 0;
            res.json({
                success: true,
                data: {
                    resumen: {
                        leads_mes_actual: leadsPeriodoActual || 0,
                        leads_mes_anterior: leadsPeriodoAnterior || 0,
                        variacion_leads: variacionLeads,
                        leads_total: leadsTotal || 0,
                        leads_ctwa: leadsCTWA || 0,
                        leads_directos: leadsDirectos || 0,
                        tasa_engagement: tasaEngagement,
                        tasa_abandono: abandono,
                        total_interacciones: totalInteracciones,
                        inscripciones,
                        derivaciones,
                        info_requests: infoRequests,
                        tasa_inscripcion: totalInteracciones > 0
                            ? Math.round((inscripciones / totalInteracciones) * 100 * 10) / 10
                            : 0,
                        tasa_derivacion: totalInteracciones > 0
                            ? Math.round((derivaciones / totalInteracciones) * 100 * 10) / 10
                            : 0
                    },
                    opciones: opcionesConCTR,
                    anuncios: anunciosConStats,
                    periodo: {
                        desde: inicio.toISOString(),
                        hasta: fin.toISOString(),
                        periodo_anterior_desde: inicioPeriodoAnterior.toISOString(),
                        periodo_anterior_hasta: finPeriodoAnterior.toISOString()
                    }
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