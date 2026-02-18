'use client';

import { useState, useEffect, useMemo, useCallback } from 'react';
import {
  GraduationCap, Users, AlertTriangle, TrendingUp, Repeat2,
  Download, RefreshCw, FileSpreadsheet, FileText, File, ChevronDown,
} from 'lucide-react';
import AlumnosFiltros, { type FiltrosState } from '@/components/dashboard/alumnos/AlumnosFiltros';
import StickyHeader from '@/components/dashboard/alumnos/StickyHeader';
import AlumnosEvolucion from '@/components/dashboard/alumnos/AlumnosEvolucion';
import AlumnosRetencion from '@/components/dashboard/alumnos/AlumnosRetencion';
import AlumnosAsistenciaAvance from '@/components/dashboard/alumnos/AlumnosAsistenciaAvance';
import AlumnosSemaforoCohortes from '@/components/dashboard/alumnos/AlumnosSemaforoCohortes';
import AlumnosRiesgoCruzado from '@/components/dashboard/alumnos/AlumnosRiesgoCruzado';
import AlumnosContenido from '@/components/dashboard/alumnos/AlumnosContenido';
import AlumnosCrossSell from '@/components/dashboard/alumnos/AlumnosCrossSell';
import AlumnosCursosTable from '@/components/dashboard/alumnos/AlumnosCursosTable';
import {
  fetchMetricasAlumnos,
  fetchCursosRanking,
  fetchTendenciasAlumnos,
  fetchTendenciasPorCurso,
  fetchCursosConCohortes,
  fetchCohortesResumen,
  fetchMulticursoCrossSell,
  type CursoConCohortes,
  fetchRiesgoCruzadoGlobal,
} from '@/lib/supabase-alumnos';
import type {
  MetricasAlumnos, CursoRanking, TendenciaAlumnos,
  TendenciaPorCurso, CohorteResumen, CrossSellData,
  RiesgoCruzadoGlobal,
} from '@/types/alumnos';

export default function AlumnosPage() {
  // ─── State ───
  const [filtros, setFiltros] = useState<FiltrosState>({
    cursosSeleccionados: [], cohorteMode: 'todas', cohortesSeleccionadas: [],
    estadoSeleccionado: '', fechaDesdeManual: '', fechaHastaManual: '',
  });

  const [metricas, setMetricas] = useState<MetricasAlumnos | null>(null);
  const [cursos, setCursos] = useState<CursoRanking[]>([]);
  const [tendencias, setTendencias] = useState<TendenciaAlumnos[]>([]);
  const [tendenciasCurso, setTendenciasCurso] = useState<TendenciaPorCurso[]>([]);
  const [cursosData, setCursosData] = useState<CursoConCohortes[]>([]);
  const [cohortes, setCohortes] = useState<CohorteResumen[]>([]);
  const [crossSell, setCrossSell] = useState<CrossSellData | null>(null);
  const [isLoading, setIsLoading] = useState(true);
  const [riesgoCruzado, setRiesgoCruzado] = useState<RiesgoCruzadoGlobal | null>(null);
  const [showExport, setShowExport] = useState(false);
  const [headerCollapsed, setHeaderCollapsed] = useState(false);

  // ─── Fechas: desde AlumnosFiltros o null ───
  const fechasEfectivas = useMemo(() => ({
    desde: filtros.fechaDesdeManual || null,
    hasta: filtros.fechaHastaManual || null,
  }), [filtros.fechaDesdeManual, filtros.fechaHastaManual]);

  // ─── Nivel de filtro ───
  const nivel = useMemo((): 'global' | 'curso' | 'cohorte' => {
    if (filtros.cohortesSeleccionadas.length > 0) return 'cohorte';
    if (filtros.cursosSeleccionados.length > 0) return 'curso';
    return 'global';
  }, [filtros]);

  // ─── Parámetros para RPCs ───
  const cursosCodigos = filtros.cursosSeleccionados.length > 0 ? filtros.cursosSeleccionados : null;
  const cohortesIds = filtros.cohortesSeleccionadas.length > 0 ? filtros.cohortesSeleccionadas : null;

  // ─── Load data ───
  const loadData = useCallback(async () => {
    setIsLoading(true);
    try {
      const { desde, hasta } = fechasEfectivas;

      // Evolución: 0-1 cursos → tendencias normales; 2+ cursos → por curso (comparación)
      const fetchTendencia = filtros.cursosSeleccionados.length <= 1
        ? fetchTendenciasAlumnos(desde, hasta, cursosCodigos, 'mes')
        : fetchTendenciasPorCurso(desde, hasta, filtros.cursosSeleccionados, 'mes');

      const [met, cur, tend, cursData, coh, cs, rc] = await Promise.all([
        fetchMetricasAlumnos(desde, hasta, cursosCodigos, filtros.estadoSeleccionado || null),
        fetchCursosRanking(desde, hasta, 10, cursosCodigos),
        fetchTendencia,
        fetchCursosConCohortes(),
        fetchCohortesResumen(),
        fetchMulticursoCrossSell(),
        fetchRiesgoCruzadoGlobal(
          cursosCodigos || undefined,
          fechasEfectivas.desde || undefined,
          fechasEfectivas.hasta || undefined,
        ),
      ]);

      setMetricas(met);
      setCursos(cur);

      if (filtros.cursosSeleccionados.length <= 1) {
        setTendencias(tend as TendenciaAlumnos[]);
        setTendenciasCurso([]);
      } else {
        setTendencias([]);
        setTendenciasCurso(tend as TendenciaPorCurso[]);
      }

      setCursosData(cursData);
      setCohortes(coh);
      setCrossSell(cs);
      setRiesgoCruzado(rc);
    } catch (e) {
      console.error('Error cargando datos alumnos:', e);
    } finally {
      setIsLoading(false);
    }
  }, [fechasEfectivas, cursosCodigos, filtros.estadoSeleccionado, filtros.cursosSeleccionados]);

  useEffect(() => { loadData(); }, [loadData]);

  // Auto-collapse header on scroll
  useEffect(() => {
    let lastY = 0;
    const onScroll = () => {
      const y = window.scrollY;
      if (y > 120 && y > lastY) setHeaderCollapsed(true);
      if (y < 50) setHeaderCollapsed(false);
      lastY = y;
    };
    window.addEventListener('scroll', onScroll, { passive: true });
    return () => window.removeEventListener('scroll', onScroll);
  }, []);

  // ─── Filtrado client-side de cohortes ───
  const cohortesFiltradas = useMemo(() => {
    if (!cursosCodigos || cursosCodigos.length === 0) return cohortes;
    return cohortes.filter(c => cursosCodigos.includes(c.curso_codigo));
  }, [cohortes, cursosCodigos]);

  // ─── Filtrado client-side de cross-sell ───
  const crossSellFiltrado = useMemo((): CrossSellData | null => {
    if (!crossSell) return null;
    if (!cursosCodigos || cursosCodigos.length === 0) return crossSell;
    return {
      ...crossSell,
      flujos_top: crossSell.flujos_top.filter(
        f => cursosCodigos.includes(f.curso_origen) || cursosCodigos.includes(f.curso_destino)
      ),
      egresados_sin_siguiente: crossSell.egresados_sin_siguiente.filter(
        e => cursosCodigos.includes(e.curso_codigo)
      ),
    };
  }, [crossSell, cursosCodigos]);

  // ─── KPIs ───
  const kpis = useMemo(() => {
    const cohActivas = cohortesFiltradas.filter(c => c.alumnos_activos > 0);
    const totalActivos = cohActivas.reduce((s, c) => s + c.alumnos_activos, 0);
    const cohEnRiesgo = cohActivas.filter(c => (c.pct_riesgo_alto ?? 0) > 10).length;
    const totalEdu = cohActivas.reduce((s, c) => s + c.alumnos_educativa, 0);
    const avProm = totalEdu > 0
      ? Math.round(cohActivas.reduce((s, c) => s + c.avance_promedio * c.alumnos_educativa, 0) / totalEdu)
      : 0;
    const oportunidades = crossSellFiltrado?.egresados_sin_siguiente?.reduce((s: number, e: any) => s + (e.cant ?? e.egresados ?? 0), 0) ?? 0;
    return { totalActivos, cohortesActivas: cohActivas.length, cohEnRiesgo, avProm, oportunidades };
  }, [cohortesFiltradas, crossSellFiltrado]);

  const handleExport = (formato: string) => {
    console.log(`Export ${formato} — pendiente`);
  };

  return (
    <div className="min-h-screen bg-gray-50/50">

      {/* Header colapsable */}
      <StickyHeader
        isCollapsed={headerCollapsed}
        onToggle={() => setHeaderCollapsed(!headerCollapsed)}
        filtros={filtros}
        isLoading={isLoading}
        onRefresh={loadData}
        showExport={showExport}
        onToggleExport={() => setShowExport(!showExport)}
        onExport={(fmt) => { handleExport(fmt); setShowExport(false); }}
      >
        <AlumnosFiltros
          cursosData={cursosData}
          filtros={filtros}
          onFiltrosChange={setFiltros}
          fechasEfectivas={{ desde: fechasEfectivas.desde || '', hasta: fechasEfectivas.hasta || '' }}
          nivel={nivel}
        />
      </StickyHeader>

      {/* Contenido */}
      <div className="p-3 sm:p-4 lg:p-6 space-y-4">

        {/* KPIs */}
        <div className="grid grid-cols-2 lg:grid-cols-4 gap-3">
          {[
            { label: 'Alumnos activos', value: kpis.totalActivos, icon: Users,
              sub: `${kpis.cohortesActivas} cohortes activas`, alert: false },
            { label: 'Cohortes en riesgo', value: kpis.cohEnRiesgo, icon: AlertTriangle,
              sub: kpis.cohortesActivas > 0 ? `de ${kpis.cohortesActivas} activas` : '—',
              alert: kpis.cohEnRiesgo > 0 },
            { label: 'Avance promedio', value: `${kpis.avProm}%`, icon: TrendingUp,
              sub: 'ponderado por alumnos', alert: false },
            { label: 'Oportunidades cross-sell', value: kpis.oportunidades.toLocaleString('es-AR'), icon: Repeat2,
              sub: 'egresados sin siguiente', alert: false },
          ].map((kpi, i) => (
            <div key={i} className={`bg-white rounded-xl border p-3 sm:p-4 ${
              kpi.alert ? 'border-red-200 bg-red-50/30' : 'border-gray-200'}`}>
              <div className="flex items-center justify-between mb-1">
                <span className="text-[10px] sm:text-xs text-gray-500 font-medium">{kpi.label}</span>
                <kpi.icon className={`w-3.5 h-3.5 ${kpi.alert ? 'text-red-500' : 'text-gray-400'}`} />
              </div>
              <p className={`text-xl sm:text-2xl font-bold ${kpi.alert ? 'text-red-700' : 'text-gray-900'}`}>
                {isLoading ? '—' : typeof kpi.value === 'number' ? kpi.value.toLocaleString('es-AR') : kpi.value}
              </p>
              <p className="text-[10px] text-gray-400 mt-0.5">{kpi.sub}</p>
            </div>
          ))}
        </div>

        {/* Evolución */}
        <AlumnosEvolucion
          tendencias={tendencias}
          tendenciasPorCurso={tendenciasCurso}
          cursosSeleccionados={filtros.cursosSeleccionados}
          isLoading={isLoading}
        />

        {/* Avance + Asistencia vs Avance */}
        <div className="grid grid-cols-1 lg:grid-cols-2 gap-4">
          <AlumnosRetencion
            metricas={metricas}
            isLoading={isLoading}
            cursosCodigos={cursosCodigos}
            cohortesSeleccionadas={cohortesIds}
          />
          <AlumnosAsistenciaAvance
            cursosCodigos={cursosCodigos}
            desde={fechasEfectivas.desde}
            hasta={fechasEfectivas.hasta}
            cohortesSeleccionadas={cohortesIds}
          />
        </div>

        {/* Semáforo */}
        <AlumnosSemaforoCohortes
          cohortes={cohortesFiltradas}
          isLoading={isLoading}
        />

        {/* Riesgo Cruzado */}
        <AlumnosRiesgoCruzado
          data={riesgoCruzado}
          isLoading={isLoading}
        />

        {/* Zoom */}
        <AlumnosContenido
          cursosCodigos={cursosCodigos}
          cohortesSeleccionadas={cohortesIds}
        />

        {/* Cross-Sell */}
        <AlumnosCrossSell
          data={crossSellFiltrado}
          isLoading={isLoading}
        />

        {/* Ranking */}
        <AlumnosCursosTable
          cursos={cursos}
          isLoading={isLoading}
        />

        {/* Agente IA */}
      </div>
    </div>
  );
}
