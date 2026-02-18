// ─── Types para Dashboard Alumnos v2 ───

export interface MetricasAlumnos {
  periodo_actual: {
    total_inscripciones: number;
    activos: number;
    finalizados: number;
    bajas: number;
    alumnos_unicos: number;
    cursos_unicos: number;
    tasa_finalizacion: number;
    cohortes: number;
  };
  periodo_anterior: {
    total_inscripciones: number;
    activos: number;
    finalizados: number;
    bajas: number;
    tasa_finalizacion: number;
    cohortes: number;
  };
}

export interface CursoRanking {
  curso_codigo: string;
  curso_nombre: string;
  total_inscripciones: number;
  activos: number;
  finalizados: number;
  bajas: number;
  tasa_abandono: number;
  tasa_finalizacion: number;
}

export interface TendenciaAlumnos {
  periodo: string;
  inscripciones: number;
  activos: number;
  finalizados: number;
  bajas: number;
}

export interface TendenciaPorCurso {
  periodo: string;
  curso_codigo: string;
  curso_nombre: string;
  inscripciones: number;
  activos: number;
  finalizados: number;
  bajas: number;
}

export interface AvanceAlumno {
  id_usuario: string;
  id_grupo: number;
  avance_total: number;
  unidades_completadas: number;
  unidades_total: number;
  ultima_actividad: string;
}

export interface AvanceUnidad {
  id_unidad: number;
  nombre_unidad: string;
  avance: number;
  alumnos_completaron: number;
  alumnos_total: number;
}

export interface VideoStats {
  video_id: string;
  nombre: string;
  curso_codigo: string;
  duracion_segundos: number;
  reproducciones: number;
}

export interface AsistenciaClase {
  meeting_id: string;
  curso_codigo: string;
  fecha: string;
  asistentes: number;
  total_esperado: number;
  duracion_minutos: number;
}

// ─── Types para Dashboard Alumnos v3 (Riesgo Cruzado) ───

export interface CohorteResumen {
  educativa_grupo_id: number;
  curso_codigo: string;
  nombre: string;
  cohorte_anio: number;
  cohorte_mes: number;
  alumnos_educativa: number;
  alumnos_activos: number;
  zoom_clases: number;
  zoom_topic: string | null;
  cuotas_esperadas: number;
  avance_promedio: number;
  pct_nunca_campus: number | null;
  pct_morosos: number | null;
  pct_riesgo_alto: number | null;
  diagnostico: 'problema_curso' | 'atencion' | 'saludable' | 'sin_alumnos';
}

export interface CohorteDetalleResponse {
  cohorte: {
    educativa_grupo_id: string;
    curso_codigo: string;
    nombre: string;
    cohorte_anio: number;
    cohorte_mes: number;
    alumnos_educativa: number;
    cuotas_esperadas: number;
    zoom_topic: string | null;
  };
  alumnos: CohorteAlumnoDetalle[];
  zoom_clases: CohorteZoomClase[];
}

export interface CohorteAlumnoDetalle {
  dni: string;
  nombre: string;
  email_psi: string;
  email_educativa: string;
  estado_psi: string;
  avance_pct: number;
  estado_campus: string;
  tiempo_estimado_uso: string;
  cantidad_interacciones: number;
  fecha_ultima_interaccion: string | null;
  cuotas_total: number;
  cuotas_pagadas: number;
  cuotas_esperadas: number;
  estado_cuota: string;
  monto_total: number;
  monto_pagado: number;
  clases_asistidas: number;
  clases_totales: number;
  otros_cursos: number;
  finalizados_previos: number;
  bajas_previas: number;
  pts_cuotas: number;
  pts_campus: number;
  pts_zoom: number;
  pts_historial: number;
  riesgo_score: number;
}

export interface CohorteZoomClase {
  fecha: string;
  zoom_uuid: string;
  participantes: number;
}

export interface CohorteVelocidadAlumno {
  id_usuario: string;
  nombre: string;
  avance_actual: number;
  avance_anterior: number | null;
  delta: number | null;
  velocidad: 'avanzando' | 'estancado' | 'sin_datos';
}

export interface CohorteVelocidad {
  fecha_actual: string;
  fecha_comparacion: string;
  dias_entre: number;
  resumen: {
    total_alumnos: number;
    avanzando: number;
    estancados: number;
    sin_comparacion: number;
    pct_avanzando: number;
    pct_estancados: number;
    avance_promedio_actual: number;
    delta_promedio: number;
  };
  alumnos: CohorteVelocidadAlumno[];
}

export interface CrossSellData {
  resumen: {
    total_multicurso: number;
    pct_multicurso: number;
    total_alumnos: number;
  };
  distribucion: Array<{
    cursos: number;
    alumnos: number;
  }>;
  flujos_top: Array<{
    curso_origen: string;
    curso_destino: string;
    alumnos: number;
  }>;
  egresados_sin_siguiente: Array<{
    curso_codigo: string;
    egresados: number;
  }>;
  ventana_oportunidad: {
    promedio_dias: number;
    mediana_dias: number;
    p25_dias: number;
    p75_dias: number;
  };
}

// ─── Riesgo Cruzado Global ───
export interface RiesgoCruzadoGlobal {
  distribucion: {
    criticos: number;
    altos: number;
    medios: number;
    bajos: number;
    total: number;
    en_riesgo: number;
  };
  ejes: {
    cuotas_critico: number;
    cuotas_medio: number;
    campus_critico: number;
    campus_medio: number;
    zoom_critico: number;
    zoom_medio: number;
    historial_critico: number;
  };
  top_cursos: {
    curso_codigo: string;
    en_riesgo: number;
    total: number;
    pct_riesgo: number;
  }[];
  top_alumnos: {
    nombre: string;
    dni: string;
    curso_codigo: string;
    educativa_codigo: string;
    cohorte_nombre: string;
    cohorte_anio: number;
    cohorte_mes: number;
    pts_cuotas: number;
    pts_campus: number;
    pts_zoom: number;
    pts_historial: number;
    riesgo_score: number;
  }[];
}
