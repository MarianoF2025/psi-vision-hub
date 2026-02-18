'use client';

import { useState, useEffect, useMemo } from 'react';
import { useParams, useRouter } from 'next/navigation';
import AgenteIAPanel from '@/components/dashboard/AgenteIAPanel';
import { fetchCohorteDetalle, fetchCohorteVelocidad } from '@/lib/supabase-alumnos';
import type { CohorteDetalleResponse, CohorteVelocidad, CohorteAlumnoDetalle } from '@/types/alumnos';
import {
  ArrowLeft, Users, AlertTriangle, TrendingUp, CreditCard,
  ChevronDown, ChevronUp, RefreshCw, Video, BookOpen, Activity,
} from 'lucide-react';
import InfoTooltip from '@/components/dashboard/alumnos/InfoTooltip';

const PSI_RED = '#e63946';

const RIESGO_CONFIG: Record<string, { label: string; color: string; bg: string; border: string; textColor: string }> = {
  critico: { label: 'Crítico', color: '#b91c1c', bg: 'bg-red-50', border: 'border-red-200', textColor: 'text-red-700' },
  alto:    { label: 'Alto', color: '#c2410c', bg: 'bg-orange-50', border: 'border-orange-200', textColor: 'text-orange-700' },
  medio:   { label: 'Medio', color: '#b45309', bg: 'bg-amber-50', border: 'border-amber-200', textColor: 'text-amber-700' },
  bajo:    { label: 'Bajo', color: '#047857', bg: 'bg-emerald-50', border: 'border-emerald-200', textColor: 'text-emerald-700' },
};

function riesgoNivel(score: number): string {
  if (score >= 80) return 'critico';
  if (score >= 60) return 'alto';
  if (score >= 40) return 'medio';
  return 'bajo';
}

function estadoCuotaLabel(estado: string): { label: string; color: string } {
  if (estado === 'moroso') return { label: 'Moroso', color: 'text-red-600' };
  if (estado.startsWith('debe_')) return { label: `Debe ${estado.replace('debe_', '')}`, color: 'text-amber-600' };
  if (estado === 'al_dia') return { label: 'Al día', color: 'text-emerald-600' };
  return { label: estado, color: 'text-gray-600' };
}

function estadoCampusLabel(estado: string): { label: string; color: string } {
  if (estado === 'nunca_entro') return { label: 'Nunca entró', color: 'text-red-600' };
  if (estado === 'inactivo') return { label: 'Inactivo', color: 'text-amber-600' };
  if (estado === 'semi_activo') return { label: 'Semi-activo', color: 'text-blue-600' };
  if (estado === 'activo') return { label: 'Activo', color: 'text-emerald-600' };
  return { label: estado, color: 'text-gray-600' };
}

// ─── Score Tooltip con desglose ───
function ScoreBadge({ alumno }: { alumno: CohorteAlumnoDetalle }) {
  const [show, setShow] = useState(false);
  const nivel = riesgoNivel(alumno.riesgo_score);
  const cfg = RIESGO_CONFIG[nivel];

  const ejes = [
    { label: 'Cuotas', pts: alumno.pts_cuotas, max: 30, desc: 'Morosos o deudores de cuotas' },
    { label: 'Campus', pts: alumno.pts_campus, max: 30, desc: 'Actividad en plataforma Educativa' },
    { label: 'Zoom', pts: alumno.pts_zoom, max: 25, desc: 'Asistencia a clases en vivo' },
    { label: 'Historial', pts: alumno.pts_historial, max: 15, desc: 'Bajas previas en otros cursos' },
  ];

  return (
    <span className="relative inline-flex">
      <button
        onMouseEnter={() => setShow(true)}
        onMouseLeave={() => setShow(false)}
        className={`inline-flex items-center justify-center w-9 h-9 rounded-full text-xs font-bold ${cfg.bg} ${cfg.textColor} ${cfg.border} border cursor-help transition-transform hover:scale-110`}
      >
        {alumno.riesgo_score}
      </button>
      {show && (
        <div className="absolute left-full ml-2 top-1/2 -translate-y-1/2 w-56 p-3 bg-gray-900 text-white text-[11px] rounded-lg shadow-xl z-50">
          <div className="absolute -left-1 top-1/2 -translate-y-1/2 w-2 h-2 bg-gray-900 rotate-45" />
          <p className="font-semibold mb-2">Desglose de riesgo: {alumno.riesgo_score}/100</p>
          <div className="space-y-1.5">
            {ejes.map(e => (
              <div key={e.label} className="flex items-center justify-between">
                <span className="text-gray-300">{e.label}</span>
                <div className="flex items-center gap-1.5">
                  <div className="w-14 h-1.5 bg-gray-700 rounded-full overflow-hidden">
                    <div className="h-full rounded-full" style={{
                      width: `${(e.pts / e.max) * 100}%`,
                      backgroundColor: e.pts >= e.max * 0.8 ? '#ef4444' : e.pts >= e.max * 0.5 ? '#f59e0b' : '#10b981',
                    }} />
                  </div>
                  <span className="font-mono w-10 text-right">{e.pts}/{e.max}</span>
                </div>
              </div>
            ))}
          </div>
          <p className="text-[10px] text-gray-400 mt-2 border-t border-gray-700 pt-1.5">
            {cfg.label}: {nivel === 'critico' ? '≥80' : nivel === 'alto' ? '60-79' : nivel === 'medio' ? '40-59' : '<40'} pts
          </p>
        </div>
      )}
    </span>
  );
}

type SortKey = 'riesgo_score' | 'nombre' | 'avance_pct' | 'estado_cuota' | 'estado_campus' | 'clases_asistidas';
type SortDir = 'asc' | 'desc';

export default function CohorteDetallePage() {
  const params = useParams();
  const router = useRouter();
  const cohorteId = Number(params.cohorteId);

  const [detalle, setDetalle] = useState<CohorteDetalleResponse | null>(null);
  const [velocidad, setVelocidad] = useState<CohorteVelocidad | null>(null);
  const [isLoading, setIsLoading] = useState(true);
  const [sortKey, setSortKey] = useState<SortKey>('riesgo_score');
  const [sortDir, setSortDir] = useState<SortDir>('desc');

  const loadData = async () => {
    if (!cohorteId || isNaN(cohorteId)) return;
    setIsLoading(true);
    try {
      const [det, vel] = await Promise.all([
        fetchCohorteDetalle(cohorteId),
        fetchCohorteVelocidad(cohorteId),
      ]);
      setDetalle(det);
      setVelocidad(vel);
    } catch (e) {
      console.error('Error cargando cohorte:', e);
    } finally {
      setIsLoading(false);
    }
  };

  useEffect(() => { loadData(); }, [cohorteId]);

  // ─── Velocidad map ───
  const velocidadMap = useMemo(() => {
    if (!velocidad?.alumnos) return new Map<string, number | null>();
    const map = new Map<string, number | null>();
    velocidad.alumnos.forEach(a => map.set(a.id_usuario, a.delta));
    return map;
  }, [velocidad]);

  // ─── KPIs ───
  const kpis = useMemo(() => {
    if (!detalle) return null;
    const alumnos = detalle.alumnos;
    const total = alumnos.length;
    const riesgoAlto = alumnos.filter(a => a.riesgo_score >= 60).length;
    const morosos = alumnos.filter(a => a.estado_cuota === 'moroso').length;
    const avanceProm = total > 0 ? alumnos.reduce((s, a) => s + a.avance_pct, 0) / total : 0;
    const pctAvanzando = velocidad?.resumen?.pct_avanzando ?? null;
    return { total, riesgoAlto, morosos, avanceProm, pctAvanzando };
  }, [detalle, velocidad]);

  // ─── Sort ───
  const alumnosOrdenados = useMemo(() => {
    if (!detalle?.alumnos) return [];
    const lista = [...detalle.alumnos];
    lista.sort((a, b) => {
      const va = (a as any)[sortKey] ?? 0;
      const vb = (b as any)[sortKey] ?? 0;
      if (typeof va === 'string' && typeof vb === 'string') {
        return sortDir === 'asc' ? va.localeCompare(vb) : vb.localeCompare(va);
      }
      return sortDir === 'asc' ? va - vb : vb - va;
    });
    return lista;
  }, [detalle, sortKey, sortDir]);

  const toggleSort = (key: SortKey) => {
    if (sortKey === key) setSortDir(d => d === 'asc' ? 'desc' : 'asc');
    else { setSortKey(key); setSortDir(key === 'nombre' ? 'asc' : 'desc'); }
  };

  const SortIcon = ({ col }: { col: SortKey }) => {
    if (sortKey !== col) return <ChevronDown className="w-3 h-3 text-gray-300" />;
    return sortDir === 'asc'
      ? <ChevronUp className="w-3 h-3 text-gray-700" />
      : <ChevronDown className="w-3 h-3 text-gray-700" />;
  };

  const nombreCohorte = detalle?.cohorte?.nombre || `Cohorte #${cohorteId}`;

  return (
    <div className="min-h-screen bg-gray-50/50">
      {/* Header */}
      <div className="bg-white border-b border-gray-200 sticky top-12 lg:top-0 z-20">
        <div className="px-3 sm:px-4 py-2 sm:py-3">
          <div className="flex items-center justify-between">
            <div className="flex items-center gap-2 sm:gap-3">
              <button onClick={() => router.push('/alumnos')}
                className="p-1.5 rounded-lg text-gray-500 hover:text-gray-700 hover:bg-gray-100 transition-all">
                <ArrowLeft className="w-4 h-4" />
              </button>
              <div className="p-1.5 sm:p-2 bg-gradient-to-br from-[#e63946] to-[#c1121f] rounded-lg sm:rounded-xl">
                <BookOpen className="w-5 h-5 text-white" />
              </div>
              <div>
                <h1 className="text-base sm:text-lg font-bold text-gray-900 line-clamp-1">{nombreCohorte}</h1>
                <p className="text-[10px] sm:text-xs text-gray-500">
                  {detalle?.cohorte?.curso_codigo} · {detalle?.alumnos?.length ?? 0} alumnos activos · {detalle?.cohorte?.alumnos_educativa ?? 0} en campus
                </p>
              </div>
            </div>
            <button onClick={loadData} disabled={isLoading}
              className={`p-1.5 sm:p-2 rounded-lg transition-all ${
                isLoading ? 'bg-[#e63946] text-white' : 'text-gray-500 hover:text-white hover:bg-[#e63946]'}`}>
              <RefreshCw className={`w-3.5 h-3.5 sm:w-4 sm:h-4 ${isLoading ? 'animate-spin' : ''}`} />
            </button>
          </div>
        </div>
      </div>

      <div className="p-3 sm:p-4 lg:p-6 space-y-4">

        {/* KPIs */}
        {kpis && (
          <div className="grid grid-cols-2 lg:grid-cols-5 gap-3">
            {[
              { label: 'Alumnos activos', value: kpis.total, icon: Users, alert: false, sub: undefined },
              { label: 'Riesgo alto/crítico', value: kpis.riesgoAlto, icon: AlertTriangle,
                alert: kpis.riesgoAlto > 0, sub: kpis.total > 0 ? `${Math.round(kpis.riesgoAlto / kpis.total * 100)}%` : '0%' },
              { label: 'Avance promedio', value: `${Math.round(kpis.avanceProm)}%`, icon: TrendingUp, alert: false, sub: undefined },
              { label: 'Morosos', value: kpis.morosos, icon: CreditCard,
                alert: kpis.morosos > kpis.total * 0.5, sub: kpis.total > 0 ? `${Math.round(kpis.morosos / kpis.total * 100)}%` : '0%' },
              { label: 'Avanzando', value: kpis.pctAvanzando !== null ? `${Math.round(kpis.pctAvanzando)}%` : '—', icon: Activity,
                alert: false, sub: velocidad ? `últimos ${velocidad.dias_entre} días` : 'sin datos' },
            ].map((kpi, i) => (
              <div key={i} className={`bg-white rounded-xl border p-3 ${
                kpi.alert ? 'border-red-200 bg-red-50/30' : 'border-gray-200'}`}>
                <div className="flex items-center justify-between mb-1">
                  <span className="text-[10px] text-gray-500 font-medium">{kpi.label}</span>
                  <kpi.icon className={`w-3.5 h-3.5 ${kpi.alert ? 'text-red-500' : 'text-gray-400'}`} />
                </div>
                <p className={`text-xl font-bold ${kpi.alert ? 'text-red-700' : 'text-gray-900'}`}>
                  {isLoading ? '—' : kpi.value}
                </p>
                {kpi.sub && <p className="text-[10px] text-gray-400 mt-0.5">{kpi.sub}</p>}
              </div>
            ))}
          </div>
        )}

        {/* Tabla de alumnos — simplificada */}
        <div className="bg-white rounded-xl border border-gray-200 overflow-hidden">
          <div className="px-4 py-3 border-b border-gray-100 flex items-center gap-2">
            <h3 className="text-sm font-semibold text-gray-900">Alumnos por nivel de riesgo</h3>
            <InfoTooltip text="Cada alumno tiene un Score de riesgo de 0 a 100 que combina: Cuotas (máx 30pts) por estado de pago, Campus (máx 30pts) por actividad en plataforma, Zoom (máx 25pts) por asistencia a clases en vivo, e Historial (máx 15pts) por bajas previas en otros cursos. Pasá el mouse sobre el Score para ver el desglose. Crítico ≥80 · Alto 60-79 · Medio 40-59 · Bajo <40." />
          </div>
          <div className="overflow-x-auto">
            <table className="w-full text-xs">
              <thead>
                <tr className="border-b border-gray-100 bg-gray-50/50">
                  {([
                    { key: 'riesgo_score' as SortKey, label: 'Score', w: 'w-16 text-center' },
                    { key: 'nombre' as SortKey, label: 'Alumno', w: '' },
                    { key: 'estado_cuota' as SortKey, label: 'Estado de pago', w: 'w-28' },
                    { key: 'avance_pct' as SortKey, label: 'Avance campus', w: 'w-32' },
                    { key: 'estado_campus' as SortKey, label: 'Actividad campus', w: 'w-28' },
                    { key: 'clases_asistidas' as SortKey, label: 'Clases Zoom', w: 'w-24 text-center' },
                  ]).map(col => (
                    <th key={col.key}
                      onClick={() => toggleSort(col.key)}
                      className={`px-3 py-2.5 font-medium text-gray-500 cursor-pointer hover:text-gray-700 select-none whitespace-nowrap ${col.w}`}>
                      <div className={`flex items-center gap-0.5 ${col.w.includes('text-center') ? 'justify-center' : ''}`}>
                        {col.label}
                        <SortIcon col={col.key} />
                      </div>
                    </th>
                  ))}
                  <th className="w-14 px-3 py-2.5 font-medium text-gray-500 text-center">Vel.</th>
                </tr>
              </thead>
              <tbody>
                {isLoading ? (
                  <tr><td colSpan={7} className="text-center py-12 text-gray-400">Cargando alumnos...</td></tr>
                ) : alumnosOrdenados.length === 0 ? (
                  <tr><td colSpan={7} className="text-center py-12 text-gray-400">Sin alumnos activos</td></tr>
                ) : alumnosOrdenados.map((a, i) => {
                  const nivel = riesgoNivel(a.riesgo_score);
                  const cfg = RIESGO_CONFIG[nivel];
                  const cuota = estadoCuotaLabel(a.estado_cuota);
                  const campus = estadoCampusLabel(a.estado_campus);
                  const delta = velocidadMap.get(a.dni) ?? null;

                  return (
                    <tr key={a.dni || i} className={`border-b border-gray-50 hover:bg-gray-50/50 transition-colors`}>
                      {/* Score con tooltip desglose */}
                      <td className="px-3 py-2.5 text-center">
                        <ScoreBadge alumno={a} />
                      </td>
                      {/* Nombre */}
                      <td className="px-3 py-2.5">
                        <div className="font-medium text-gray-900 text-xs">{a.nombre}</div>
                        <div className="text-[10px] text-gray-400">DNI {a.dni}</div>
                      </td>
                      {/* Estado de pago */}
                      <td className="px-3 py-2.5">
                        <span className={`text-xs font-medium ${cuota.color}`}>{cuota.label}</span>
                        <div className="text-[10px] text-gray-400 mt-0.5">
                          {a.cuotas_pagadas} de {a.cuotas_total} cuotas
                        </div>
                      </td>
                      {/* Avance campus */}
                      <td className="px-3 py-2.5">
                        <div className="flex items-center gap-2">
                          <div className="flex-1 h-2 bg-gray-100 rounded-full overflow-hidden">
                            <div className="h-full rounded-full transition-all" style={{
                              width: `${Math.min(100, a.avance_pct)}%`,
                              backgroundColor: a.avance_pct >= 80 ? '#10b981' : a.avance_pct >= 50 ? '#f59e0b' : PSI_RED,
                            }} />
                          </div>
                          <span className="text-xs font-medium text-gray-700 w-10 text-right">{Math.round(a.avance_pct)}%</span>
                        </div>
                      </td>
                      {/* Actividad campus */}
                      <td className="px-3 py-2.5">
                        <span className={`text-xs font-medium ${campus.color}`}>{campus.label}</span>
                      </td>
                      {/* Clases Zoom */}
                      <td className="px-3 py-2.5 text-center">
                        <span className="text-xs font-medium text-gray-700">{a.clases_asistidas}</span>
                        <span className="text-[10px] text-gray-400"> / {a.clases_totales}</span>
                      </td>
                      {/* Velocidad */}
                      <td className="px-3 py-2.5 text-center">
                        {delta === null ? (
                          <span className="text-gray-300">—</span>
                        ) : delta > 0 ? (
                          <span className="text-emerald-600 font-medium text-xs">+{Math.round(delta)}%</span>
                        ) : (
                          <span className="text-gray-400 text-xs">0</span>
                        )}
                      </td>
                    </tr>
                  );
                })}
              </tbody>
            </table>
          </div>
        </div>

        {/* Zoom clases */}
        {detalle?.zoom_clases && detalle.zoom_clases.length > 0 && (
          <div className="bg-white rounded-xl border border-gray-200 p-4">
            <div className="flex items-center gap-2 mb-3">
              <h3 className="text-sm font-semibold text-gray-900">
                Clases Zoom ({detalle.zoom_clases.length})
              </h3>
              <InfoTooltip text="Listado de clases en vivo por Zoom de esta cohorte. El número indica participantes registrados en cada clase. Fuente: API Zoom." />
            </div>
            <div className="flex flex-wrap gap-2">
              {detalle.zoom_clases.map((c, i) => (
                <div key={i} className="flex items-center gap-1.5 bg-gray-50 rounded-lg px-2.5 py-1.5 text-[10px]">
                  <Video className="w-3 h-3 text-gray-400" />
                  <span className="text-gray-600">
                    {new Date(c.fecha).toLocaleDateString('es-AR', { day: '2-digit', month: 'short' })}
                  </span>
                  <span className={`font-medium ${c.participantes < 3 ? 'text-red-500' : 'text-gray-700'}`}>
                    {c.participantes}p
                  </span>
                </div>
              ))}
            </div>
          </div>
        )}

        {/* Agente IA */}
        <AgenteIAPanel endpoint="/tableros/api/alumnos-agent" />
      </div>
    </div>
  );
}
