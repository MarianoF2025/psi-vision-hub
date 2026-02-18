import { createClient } from '@supabase/supabase-js';
import type {
  MetricasAlumnos, CursoRanking, TendenciaAlumnos, TendenciaPorCurso,
  CohorteResumen, CohorteDetalleResponse, CohorteVelocidad, CrossSellData,
} from '@/types/alumnos';

const supabase = createClient(
  process.env.NEXT_PUBLIC_SUPABASE_URL!,
  process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!
);

// ─── Helpers ───
function cursosParam(c?: string[] | null) {
  return c && c.length > 0 ? c : null;
}
function cohortesParam(c?: string[] | null): number[] | null {
  if (!c || c.length === 0) return null;
  const nums = c.map(s => parseInt(s, 10)).filter(n => !isNaN(n));
  return nums.length > 0 ? nums : null;
}

// ─── Inscripciones PSI ───

export async function fetchMetricasAlumnos(
  desde: string | null, hasta: string | null,
  cursosCodigos?: string[] | null, estado?: string | null
): Promise<MetricasAlumnos | null> {
  const { data, error } = await supabase.rpc('get_alumnos_metricas_v2', {
    p_fecha_desde: desde, p_fecha_hasta: hasta,
    p_cursos_codigos: cursosParam(cursosCodigos),
    p_estado: estado || null,
  });
  if (error) { console.error('Error metricas alumnos:', error); return null; }
  return data as MetricasAlumnos;
}

export async function fetchCursosRanking(
  desde: string | null, hasta: string | null,
  limite: number = 10, cursosCodigos?: string[] | null
): Promise<CursoRanking[]> {
  const { data, error } = await supabase.rpc('get_cursos_ranking', {
    p_fecha_desde: desde, p_fecha_hasta: hasta,
    p_limite: limite, p_cursos_codigos: cursosParam(cursosCodigos),
  });
  if (error) { console.error('Error cursos ranking:', error); return []; }
  return (data || []) as CursoRanking[];
}

export async function fetchTendenciasAlumnos(
  desde: string | null, hasta: string | null,
  cursosCodigos?: string[] | null, agrupacion: string = 'mes'
): Promise<TendenciaAlumnos[]> {
  const { data, error } = await supabase.rpc('get_alumnos_tendencias', {
    p_fecha_desde: desde, p_fecha_hasta: hasta,
    p_cursos_codigos: cursosParam(cursosCodigos),
    p_agrupar_por: agrupacion,
  });
  if (error) { console.error('Error tendencias:', error); return []; }
  return (data || []) as TendenciaAlumnos[];
}

export async function fetchTendenciasPorCurso(
  desde: string | null, hasta: string | null,
  cursosCodigos: string[], agrupacion: string = 'mes'
): Promise<TendenciaPorCurso[]> {
  const { data, error } = await supabase.rpc('get_alumnos_tendencias_por_curso', {
    p_fecha_desde: desde, p_fecha_hasta: hasta,
    p_cursos_codigos: cursosCodigos,
    p_agrupar_por: agrupacion,
  });
  if (error) { console.error('Error tendencias por curso:', error); return []; }
  return (data || []) as TendenciaPorCurso[];
}

export async function fetchCursosLista(): Promise<{ codigo: string; nombre: string }[]> {
  const { data, error } = await supabase.rpc('get_cursos_lista');
  if (error) { console.error('Error cursos lista:', error); return []; }
  return (data || []).map((c: any) => ({ codigo: c.curso_codigo, nombre: c.curso_nombre }));
}

// ─── Cursos con Cohortes ───

export interface CohorteInfo {
  educativa_codigo: string;
  nombre: string;
  alumnos: number;
  anio: number;
  mes: number;
}

export interface CursoConCohortes {
  curso_codigo: string;
  curso_nombre: string;
  total_cohortes: number;
  total_alumnos: number;
  cohortes: CohorteInfo[];
}

export async function fetchCursosConCohortes(): Promise<CursoConCohortes[]> {
  const { data, error } = await supabase.rpc('get_cursos_con_cohortes');
  if (error) { console.error('Error cursos con cohortes:', error); return []; }
  return (data || []).map((c: any) => ({
    curso_codigo: c.curso_codigo,
    curso_nombre: c.curso_nombre,
    total_cohortes: c.total_cohortes,
    total_alumnos: c.total_alumnos,
    cohortes: c.cohortes || [],
  }));
}

// ─── Educativa (Avance Académico) ───

export interface EducativaMetricas {
  total_alumnos: number;
  avance_promedio: number;
  completaron: number;
  sin_avance: number;
  en_progreso: number;
  inscriptos_cohorte: number | null;
  distribucion_avance: {
    rango_0: number;
    rango_1_25: number;
    rango_26_50: number;
    rango_51_75: number;
    rango_76_99: number;
    rango_100: number;
  };
}

export async function fetchEducativaMetricas(
  cursosCodigos?: string[] | null,
  cohortesSeleccionadas?: string[] | null,
  soloActivas: boolean = true
): Promise<EducativaMetricas | null> {
  const { data, error } = await supabase.rpc('get_educativa_metricas', {
    p_cursos_codigos: cursosParam(cursosCodigos),
    p_educativa_grupo_ids: cohortesParam(cohortesSeleccionadas),
    p_solo_activas: soloActivas,
  });
  if (error) { console.error('Error educativa metricas:', error); return null; }
  return data as EducativaMetricas;
}

// ─── Zoom (Asistencia) ───

export interface ZoomMetricas {
  periodo_actual: {
    clases_dictadas: number;
    participaciones_totales: number;
    asistentes_unicos: number;
    duracion_total_min: number;
    duracion_promedio_min: number;
    asistentes_promedio: number;
  };
  periodo_anterior: {
    clases_dictadas: number;
    participaciones_totales: number;
    duracion_promedio_min: number;
  };
}

export interface ZoomMeetingDetalle {
  zoom_uuid: string;
  topic: string;
  zoom_account: string;
  start_time: string;
  duration_minutes: number;
  participants_count: number;
  asistentes_email: number;
  curso_codigo: string | null;
}

export async function fetchZoomMetricas(
  desde?: string | null, hasta?: string | null,
  cursosCodigos?: string[] | null,
  cohortesSeleccionadas?: string[] | null
): Promise<ZoomMetricas | null> {
  const { data, error } = await supabase.rpc('get_zoom_metricas', {
    p_fecha_desde: desde || null,
    p_fecha_hasta: hasta || null,
    p_cursos_codigos: cursosParam(cursosCodigos),
    p_educativa_grupo_ids: cohortesParam(cohortesSeleccionadas),
  });
  if (error) { console.error('Error zoom metricas:', error); return null; }
  return data as ZoomMetricas;
}

export async function fetchZoomMeetings(
  desde?: string | null, hasta?: string | null,
  cursosCodigos?: string[] | null,
  cohortesSeleccionadas?: string[] | null,
  limite: number = 50
): Promise<ZoomMeetingDetalle[]> {
  const { data, error } = await supabase.rpc('get_zoom_meetings_detalle', {
    p_fecha_desde: desde || null,
    p_fecha_hasta: hasta || null,
    p_cursos_codigos: cursosParam(cursosCodigos),
    p_educativa_grupo_ids: cohortesParam(cohortesSeleccionadas),
    p_limite: limite,
  });
  if (error) { console.error('Error zoom meetings:', error); return []; }
  return (data || []) as ZoomMeetingDetalle[];
}

// ─── Vimeo (Videos) ───

export interface VimeoMetricas {
  total_videos: number;
  total_plays: number;
  total_horas_contenido: number;
  duracion_promedio_min: number;
  carpetas: number;
  top_videos: Array<{
    name: string;
    plays: number;
    duracion_min: number;
    carpeta: string;
    created_time: string;
  }> | null;
  top_carpetas: Array<{
    carpeta: string;
    total_videos: number;
    total_plays: number;
    horas_contenido: number;
  }> | null;
}

export async function fetchVimeoMetricas(
  cursosCodigos?: string[] | null
): Promise<VimeoMetricas | null> {
  const { data, error } = await supabase.rpc('get_vimeo_metricas', {
    p_cursos_codigos: cursosParam(cursosCodigos),
  });
  if (error) { console.error('Error vimeo metricas:', error); return null; }
  return data as VimeoMetricas;
}

// ─── Riesgo de Abandono (legacy) ───

export interface RiesgoResumen {
  por_nivel: Array<{
    riesgo_nivel: string;
    alumnos: number;
    brecha_promedio: number;
    orden: number;
  }>;
  por_curso: Array<{
    curso_codigo: string;
    total_en_riesgo: number;
    criticos: number;
    altos: number;
    medios: number;
    bajos: number;
    avance_promedio: number;
    brecha_promedio: number;
  }>;
  top_criticos: Array<{
    nombre: string;
    apellido: string;
    curso_codigo: string;
    avance_pct: number;
    dias_inscripto: number;
    brecha_avance: number;
    riesgo_score: number;
    motivos: string[];
  }>;
  total_en_riesgo: number;
  total_criticos: number;
}

export async function fetchRiesgoResumen(
  cursosCodigos?: string[] | null,
  cohortesSeleccionadas?: string[] | null
): Promise<RiesgoResumen | null> {
  const { data, error } = await supabase.rpc('get_riesgo_resumen', {
    p_cursos_codigos: cursosParam(cursosCodigos),
    p_educativa_grupo_ids: cohortesParam(cohortesSeleccionadas),
  });
  if (error) { console.error('Error riesgo resumen:', error); return null; }
  return data as RiesgoResumen;
}

// ─── Asistencia vs Avance ───

export interface AsistenciaAvanceData {
  resumen: Array<{
    bucket: string;
    bucket_order: number;
    alumnos: number;
    avance_promedio: number;
  }>;
  totales: {
    total_alumnos: number;
    con_asistencia: number;
    sin_asistencia: number;
    avance_promedio_con_asist: number | null;
    avance_promedio_sin_asist: number | null;
  };
}

export async function fetchAsistenciaVsAvance(
  cursosCodigos?: string[] | null,
  desde?: string | null, hasta?: string | null,
  cohortesSeleccionadas?: string[] | null
): Promise<AsistenciaAvanceData | null> {
  const { data, error } = await supabase.rpc('get_asistencia_vs_avance', {
    p_cursos_codigos: cursosParam(cursosCodigos),
    p_fecha_desde: desde || null,
    p_fecha_hasta: hasta || null,
    p_educativa_grupo_ids: cohortesParam(cohortesSeleccionadas),
  });
  if (error) { console.error('Error asistencia vs avance:', error); return null; }
  return data as AsistenciaAvanceData;
}

// ─── Riesgo Cruzado v3 ───

export async function fetchCohortesResumen(): Promise<CohorteResumen[]> {
  const { data, error } = await supabase.rpc('get_cohortes_resumen');
  if (error) { console.error('Error cohortes resumen:', error); return []; }
  return (data || []) as CohorteResumen[];
}

export async function fetchCohorteDetalle(educativaGrupoId: number): Promise<CohorteDetalleResponse | null> {
  const { data, error } = await supabase.rpc('get_cohorte_detalle', {
    p_educativa_grupo_id: educativaGrupoId,
  });
  if (error) { console.error('Error cohorte detalle:', error); return null; }
  return data as CohorteDetalleResponse;
}

export async function fetchCohorteVelocidad(educativaGrupoId: number): Promise<CohorteVelocidad | null> {
  const { data, error } = await supabase.rpc('get_cohorte_velocidad', {
    p_educativa_grupo_id: educativaGrupoId,
  });
  if (error) { console.error('Error cohorte velocidad:', error); return null; }
  if (data?.error) { console.warn('Velocidad:', data.error); return null; }
  return data as CohorteVelocidad;
}

export async function fetchMulticursoCrossSell(): Promise<CrossSellData | null> {
  const { data, error } = await supabase.rpc('get_multicurso_crosssell');
  if (error) { console.error('Error multicurso crosssell:', error); return null; }
  return data as CrossSellData;
}

export { supabase };

export async function fetchRiesgoCruzadoGlobal(
  cursosCodigos?: string[],
  fechaDesde?: string | null,
  fechaHasta?: string | null,
): Promise<import('@/types/alumnos').RiesgoCruzadoGlobal | null> {
  const params: Record<string, any> = {};
  if (cursosCodigos && cursosCodigos.length > 0) params.p_curso_codigos = cursosCodigos;
  if (fechaDesde) params.p_fecha_desde = fechaDesde;
  if (fechaHasta) params.p_fecha_hasta = fechaHasta;
  const { data, error } = await supabase.rpc('get_riesgo_cruzado_global', params);
  if (error) { console.error('Error riesgo cruzado:', error); return null; }
  return data as import('@/types/alumnos').RiesgoCruzadoGlobal;
}
