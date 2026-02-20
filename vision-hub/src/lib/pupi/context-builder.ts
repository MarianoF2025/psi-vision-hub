// ============================================
// PUPI — CONTEXT BUILDER
// Carga datos en paralelo de todas las fuentes
// PSI Vision Hub — Febrero 2026
// ============================================

import { createClient } from '@supabase/supabase-js';

const supabase = createClient(
  process.env.NEXT_PUBLIC_SUPABASE_URL!,
  process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!
);

// ============================================
// TIPOS
// ============================================

export interface PupiContexto {
  insightsAgentes: string;
  datosMarketing: string;
  datosVentas: string;
  datosAlumnos: string;
  memoriaConversaciones: string;
  aprendizajes: string;
  decisionesPendientes: string;
  knowledgeBase: string;
  actualizacionesExternas: string;
  resumenVentasApi: string;
  ultimaConversacion: string | null;
}

// ============================================
// HELPERS DE FECHA
// ============================================

function hace30dias(): string {
  const d = new Date();
  d.setDate(d.getDate() - 30);
  return d.toISOString().split('T')[0];
}

function hoy(): string {
  return new Date().toISOString().split('T')[0];
}

function hace7dias(): string {
  const d = new Date();
  d.setDate(d.getDate() - 7);
  return d.toISOString();
}

// ============================================
// CARGADORES INDIVIDUALES
// ============================================

async function cargarInsightsAgentes(): Promise<string> {
  try {
    const { data, error } = await supabase
      .from('agent_insights')
      .select('area, tipo, severidad, titulo, que_paso, por_que, que_hacer, created_at')
      .eq('vigente', true)
      .order('severidad')
      .order('created_at', { ascending: false })
      .limit(20);
    if (error) throw error;
    if (!data || data.length === 0) return 'No hay alertas activas de los agentes.';
    return data.map(i =>
      `[${i.severidad?.toUpperCase()}] ${i.area}: ${i.titulo}\n  Qué pasó: ${i.que_paso}\n  Por qué: ${i.por_que}\n  Qué hacer: ${i.que_hacer}`
    ).join('\n\n');
  } catch (e: any) {
    console.error('[Pupy Context] Error cargando insights agentes:', e.message);
    return 'No se pudieron cargar las alertas de los agentes.';
  }
}

async function cargarDatosMarketing(): Promise<string> {
  try {
    const desde = hace30dias();
    const hasta = hoy();
    const [kpisRes, campanasRes] = await Promise.all([
      supabase.rpc('get_marketing_kpis', { fecha_desde: desde, fecha_hasta: hasta }),
      supabase.rpc('get_marketing_campanas', { fecha_desde: desde, fecha_hasta: hasta }),
    ]);
    const partes: string[] = [];
    if (kpisRes.data) partes.push(`KPIs últimos 30 días:\n${JSON.stringify(kpisRes.data, null, 2)}`);
    if (campanasRes.data) partes.push(`Campañas:\n${JSON.stringify(campanasRes.data, null, 2)}`);
    return partes.length > 0 ? partes.join('\n\n') : 'No hay datos de Marketing disponibles.';
  } catch (e: any) {
    console.error('[Pupy Context] Error cargando marketing:', e.message);
    return 'No se pudieron cargar datos de Marketing.';
  }
}

async function cargarDatosVentas(): Promise<string> {
  try {
    const desde = hace30dias();
    const hasta = hoy();
    const [metricasRes, vendedorasRes, cursosRes] = await Promise.all([
      supabase.rpc('get_ventas_metricas', { fecha_desde: desde, fecha_hasta: hasta }),
      supabase.rpc('get_ventas_por_vendedora', { fecha_desde: desde, fecha_hasta: hasta }),
      supabase.rpc('get_ventas_por_curso', { fecha_desde: desde, fecha_hasta: hasta }),
    ]);
    const partes: string[] = [];
    if (metricasRes.data) partes.push(`Métricas de Ventas últimos 30 días:\n${JSON.stringify(metricasRes.data, null, 2)}`);
    if (vendedorasRes.data) partes.push(`Performance por vendedora:\n${JSON.stringify(vendedorasRes.data, null, 2)}`);
    if (cursosRes.data) partes.push(`Demanda por curso:\n${JSON.stringify(cursosRes.data, null, 2)}`);
    return partes.length > 0 ? partes.join('\n\n') : 'No hay datos de Ventas disponibles.';
  } catch (e: any) {
    console.error('[Pupy Context] Error cargando ventas:', e.message);
    return 'No se pudieron cargar datos de Ventas.';
  }
}

async function cargarDatosAlumnos(): Promise<string> {
  try {
    const desde = hace30dias();
    const hasta = hoy();
    const [metricasRes, cohortesRes, rankingRes] = await Promise.all([
      supabase.rpc('get_alumnos_metricas', { fecha_desde: desde, fecha_hasta: hasta }),
      supabase.rpc('get_cohortes_activas_periodo', { fecha_desde: desde, fecha_hasta: hasta }),
      supabase.rpc('get_cursos_ranking', { fecha_desde: desde, fecha_hasta: hasta }),
    ]);
    const partes: string[] = [];
    if (metricasRes.data) partes.push(`Métricas de Alumnos últimos 30 días:\n${JSON.stringify(metricasRes.data, null, 2)}`);
    if (cohortesRes.data) partes.push(`Cohortes activas:\n${JSON.stringify(cohortesRes.data, null, 2)}`);
    if (rankingRes.data) partes.push(`Ranking de cursos:\n${JSON.stringify(rankingRes.data, null, 2)}`);
    return partes.length > 0 ? partes.join('\n\n') : 'No hay datos de Alumnos disponibles.';
  } catch (e: any) {
    console.error('[Pupy Context] Error cargando alumnos:', e.message);
    return 'No se pudieron cargar datos de Alumnos.';
  }
}

async function cargarMemoriaConversaciones(usuario: string): Promise<{ texto: string; ultimaFecha: string | null }> {
  try {
    const hace7 = hace7dias();
    const [porCantidadRes, porFechaRes] = await Promise.all([
      supabase
        .from('pupi_conversaciones')
        .select('titulo, resumen, created_at')
        .eq('usuario', usuario)
        .order('created_at', { ascending: false })
        .limit(10),
      supabase
        .from('pupi_conversaciones')
        .select('titulo, resumen, created_at')
        .eq('usuario', usuario)
        .gte('created_at', hace7)
        .order('created_at', { ascending: false }),
    ]);
    const porCantidad = porCantidadRes.data || [];
    const porFecha = porFechaRes.data || [];
    const idsVistos = new Set(porFecha.map(c => c.created_at));
    const merged = [...porFecha];
    for (const c of porCantidad) {
      if (!idsVistos.has(c.created_at) && merged.length < 10) {
        merged.push(c);
      }
    }
    if (merged.length === 0) {
      return { texto: 'No hay conversaciones anteriores con este usuario.', ultimaFecha: null };
    }
    const ultimaFecha = merged[0].created_at;
    const texto = merged.map(c => {
      const fecha = new Date(c.created_at).toLocaleDateString('es-AR', {
        day: 'numeric', month: 'short', year: 'numeric', hour: '2-digit', minute: '2-digit'
      });
      return `[${fecha}] ${c.titulo || 'Sin título'}\n${c.resumen || 'Sin resumen'}`;
    }).join('\n\n');
    return { texto, ultimaFecha };
  } catch (e: any) {
    console.error('[Pupy Context] Error cargando memoria:', e.message);
    return { texto: 'No se pudo cargar la memoria de conversaciones.', ultimaFecha: null };
  }
}

async function cargarAprendizajes(): Promise<string> {
  try {
    const { data, error } = await supabase
      .from('pupi_aprendizajes')
      .select('tipo, contenido, contexto, created_at')
      .eq('activo', true)
      .order('created_at', { ascending: false })
      .limit(30);
    if (error) throw error;
    if (!data || data.length === 0) return 'No hay aprendizajes registrados todavía.';
    return data.map(a => `[${a.tipo}] ${a.contenido} (contexto: ${a.contexto || 'sin contexto'})`).join('\n');
  } catch (e: any) {
    console.error('[Pupy Context] Error cargando aprendizajes:', e.message);
    return 'No se pudieron cargar los aprendizajes.';
  }
}

async function cargarDecisionesPendientes(): Promise<string> {
  try {
    const { data, error } = await supabase
      .from('pupi_decisiones')
      .select('decision, contexto, resultado_esperado, estado, fecha_seguimiento, created_at')
      .in('estado', ['pendiente', 'en_curso'])
      .order('fecha_seguimiento', { ascending: true })
      .limit(10);
    if (error) throw error;
    if (!data || data.length === 0) return 'No hay decisiones pendientes de follow-up.';
    return data.map(d => {
      const fecha = d.fecha_seguimiento
        ? new Date(d.fecha_seguimiento).toLocaleDateString('es-AR', { day: 'numeric', month: 'short' })
        : 'sin fecha';
      const creada = new Date(d.created_at).toLocaleDateString('es-AR', { day: 'numeric', month: 'short' });
      return `[${d.estado}] "${d.decision}" (decidido el ${creada}, follow-up: ${fecha})\n  Esperado: ${d.resultado_esperado || 'no definido'}`;
    }).join('\n\n');
  } catch (e: any) {
    console.error('[Pupy Context] Error cargando decisiones:', e.message);
    return 'No se pudieron cargar las decisiones pendientes.';
  }
}

async function cargarKnowledgeBase(): Promise<string> {
  try {
    const { data, error } = await supabase
      .from('pupi_conocimiento')
      .select('categoria, titulo, contenido')
      .eq('activo', true)
      .order('categoria')
      .order('created_at', { ascending: false });
    if (error) throw error;
    if (!data || data.length === 0) return 'Knowledge base vacía.';
    const agrupado: Record<string, string[]> = {};
    for (const item of data) {
      if (!agrupado[item.categoria]) agrupado[item.categoria] = [];
      agrupado[item.categoria].push(`**${item.titulo}:** ${item.contenido}`);
    }
    return Object.entries(agrupado)
      .map(([cat, items]) => `[${cat.toUpperCase()}]\n${items.join('\n')}`)
      .join('\n\n');
  } catch (e: any) {
    console.error('[Pupy Context] Error cargando knowledge base:', e.message);
    return 'No se pudo cargar el knowledge base.';
  }
}

async function cargarActualizacionesExternas(): Promise<string> {
  try {
    const { data, error } = await supabase
      .from('pupi_actualizaciones')
      .select('tema, titulo, contenido, relevancia_psi, created_at')
      .eq('vigente', true)
      .order('created_at', { ascending: false })
      .limit(10);
    if (error) throw error;
    if (!data || data.length === 0) return 'No hay novedades externas recientes.';
    return data.map(a => {
      const fecha = new Date(a.created_at).toLocaleDateString('es-AR', { day: 'numeric', month: 'short' });
      return `[${a.tema}] ${a.titulo} (${fecha})\n${a.contenido}\nImpacto PSI: ${a.relevancia_psi || 'no evaluado'}`;
    }).join('\n\n');
  } catch (e: any) {
    console.error('[Pupy Context] Error cargando actualizaciones:', e.message);
    return 'No se pudieron cargar las actualizaciones externas.';
  }
}

async function cargarResumenVentasApi(): Promise<string> {
  try {
    const { data, error } = await supabase
      .from('pupi_conocimiento')
      .select('titulo, contenido, created_at')
      .eq('categoria', 'insights_ventas_dia')
      .eq('activo', true)
      .order('created_at', { ascending: false })
      .limit(3);
    if (error) throw error;
    if (!data || data.length === 0) return 'No hay resúmenes de conversaciones de ventas todavía.';
    return data.map(d => {
      const fecha = new Date(d.created_at).toLocaleDateString('es-AR', { day: 'numeric', month: 'short' });
      return `[${fecha}] ${d.titulo}\n${d.contenido}`;
    }).join('\n\n');
  } catch (e: any) {
    console.error('[Pupy Context] Error cargando resumen ventas API:', e.message);
    return 'No se pudieron cargar los resúmenes de ventas.';
  }
}

// ============================================
// CARGA COMPLETA EN PARALELO
// ============================================

export async function cargarContextoCompleto(usuario: string): Promise<PupiContexto> {
  console.log('[Pupy Context] Cargando contexto completo...');
  const inicio = Date.now();
  const [
    insights, marketing, ventas, alumnos, memoriaResult,
    aprendizajes, decisiones, knowledge, actualizaciones, resumenVentas,
  ] = await Promise.all([
    cargarInsightsAgentes(),
    cargarDatosMarketing(),
    cargarDatosVentas(),
    cargarDatosAlumnos(),
    cargarMemoriaConversaciones(usuario),
    cargarAprendizajes(),
    cargarDecisionesPendientes(),
    cargarKnowledgeBase(),
    cargarActualizacionesExternas(),
    cargarResumenVentasApi(),
  ]);
  const ms = Date.now() - inicio;
  console.log(`[Pupy Context] Contexto cargado en ${ms}ms`);
  return {
    insightsAgentes: insights,
    datosMarketing: marketing,
    datosVentas: ventas,
    datosAlumnos: alumnos,
    memoriaConversaciones: memoriaResult.texto,
    aprendizajes,
    decisionesPendientes: decisiones,
    knowledgeBase: knowledge,
    actualizacionesExternas: actualizaciones,
    resumenVentasApi: resumenVentas,
    ultimaConversacion: memoriaResult.ultimaFecha,
  };
}

// ============================================
// GUARDAR CONVERSACIÓN (INSERT nueva, retorna ID)
// ============================================

export async function guardarConversacion(
  usuario: string,
  mensajes: Array<{ rol: string; contenido: string; timestamp: string }>,
  titulo: string,
  resumen: string
): Promise<string | null> {
  try {
    const { data, error } = await supabase
      .from('pupi_conversaciones')
      .insert({ usuario, mensajes, titulo, resumen })
      .select('id')
      .single();
    if (error) throw error;
    console.log('[Pupy] Conversación creada:', data.id);
    return data.id;
  } catch (e: any) {
    console.error('[Pupy] Error guardando conversación:', e.message);
    return null;
  }
}

// ============================================
// ACTUALIZAR CONVERSACIÓN (UPDATE existente)
// ============================================

export async function actualizarConversacion(
  conversacionId: string,
  mensajes: Array<{ rol: string; contenido: string; timestamp: string }>,
  titulo: string,
  resumen: string
): Promise<boolean> {
  try {
    const { error } = await supabase
      .from('pupi_conversaciones')
      .update({ mensajes, titulo, resumen, updated_at: new Date().toISOString() })
      .eq('id', conversacionId);
    if (error) throw error;
    console.log('[Pupy] Conversación actualizada:', conversacionId);
    return true;
  } catch (e: any) {
    console.error('[Pupy] Error actualizando conversación:', e.message);
    return false;
  }
}

// ============================================
// GUARDAR DECISIÓN
// ============================================

export async function guardarDecision(
  decision: string,
  contexto: string,
  resultadoEsperado: string,
  fechaSeguimiento: string,
  conversacionId?: string
): Promise<void> {
  try {
    const { error } = await supabase
      .from('pupi_decisiones')
      .insert({
        decision, contexto,
        resultado_esperado: resultadoEsperado,
        fecha_seguimiento: fechaSeguimiento,
        conversacion_id: conversacionId || null,
      });
    if (error) throw error;
    console.log('[Pupy] Decisión guardada:', decision.substring(0, 50));
  } catch (e: any) {
    console.error('[Pupy] Error guardando decisión:', e.message);
  }
}

// ============================================
// GUARDAR APRENDIZAJE
// ============================================

export async function guardarAprendizaje(
  tipo: 'correccion' | 'preferencia' | 'regla_negocio' | 'feedback',
  contenido: string,
  contexto: string
): Promise<void> {
  try {
    const { error } = await supabase
      .from('pupi_aprendizajes')
      .insert({ tipo, contenido, contexto });
    if (error) throw error;
    console.log('[Pupy] Aprendizaje guardado:', contenido.substring(0, 50));
  } catch (e: any) {
    console.error('[Pupy] Error guardando aprendizaje:', e.message);
  }
}
