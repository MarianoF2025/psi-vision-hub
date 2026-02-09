'use client';

import { useState, useEffect, useCallback } from 'react';
import { createClient } from '@supabase/supabase-js';
import DashboardHeader from '@/components/dashboard/DashboardHeader';
import CursosDetalle from '@/components/dashboard/CursosDetalle';
import AgenteIAPanel from '@/components/dashboard/AgenteIAPanel';
import { parsePeriodo, getAgrupacion, PERIODO_DEFAULT } from '@/lib/periodo';
import {
  AreaChart, Area, XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer,
  BarChart, Bar,
} from 'recharts';
import {
  ShoppingCart, Users, Target, Filter, X, ChevronDown,
  Sparkles, AlertTriangle, TrendingUp, DollarSign, ArrowUpRight,
  ArrowDownRight, Percent, UserCheck, CheckCircle,
} from 'lucide-react';

const supabase = createClient(
  process.env.NEXT_PUBLIC_SUPABASE_URL!,
  process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!
);

// ─── Paleta PSI ───
const PSI_RED = '#e63946';
const SLATE_700 = '#334155';
const SLATE_600 = '#475569';
const SLATE_800 = '#1e293b';

interface MetricasVentas {
  periodo_actual: {
    inscripciones: number;
    monto_vendido: number;
    monto_cobrado: number;
    ticket_promedio: number;
    activos: number;
    bajas: number;
    finalizados: number;
    tasa_cobro: number;
    cursos_unicos: number;
  };
  periodo_anterior: {
    inscripciones: number;
    monto_vendido: number;
    monto_cobrado: number;
    ticket_promedio: number;
  };
}

interface TendenciaVentas {
  periodo: string;
  inscripciones: number;
  bajas: number;
  monto_vendido: number;
  monto_cobrado: number;
}

interface VendedoraStats {
  vendedora: string;
  leads_asignados: number;
  tasa_conversion: number;
  horas_trabajadas: number;
  ventas_confirmadas: number;
  monto_vendido: number;
}

const formatCurrency = (value: number) => {
  if (value >= 1e9) return `$${(value / 1e9).toFixed(1)}B`;
  if (value >= 1e6) return `$${(value / 1e6).toFixed(1)}M`;
  if (value >= 1e3) return `$${(value / 1e3).toFixed(0)}K`;
  return `$${value.toFixed(0)}`;
};

const formatNumber = (value: number) => new Intl.NumberFormat('es-AR').format(value);

const calcDelta = (actual: number, anterior: number): number => {
  if (anterior === 0) return actual > 0 ? 100 : 0;
  return Math.round(((actual - anterior) / anterior) * 100);
};

const MESES = ['Ene','Feb','Mar','Abr','May','Jun','Jul','Ago','Sep','Oct','Nov','Dic'];

const EMBUDO_ETAPAS = [
  'Leads CTWA',
  'Interacción menú',
  'Derivado a vendedora',
  'Contactado',
  'Inscripto',
];

export default function VentasPage() {
  const [periodo, setPeriodo] = useState(PERIODO_DEFAULT);
  const [isLoading, setIsLoading] = useState(true);
  const [showFilters, setShowFilters] = useState(false);
  const [fechaDesde, setFechaDesde] = useState('');
  const [fechaHasta, setFechaHasta] = useState('');
  const [cursoSeleccionado, setCursoSeleccionado] = useState('');

  const [metricas, setMetricas] = useState<MetricasVentas | null>(null);
  const [tendencias, setTendencias] = useState<TendenciaVentas[]>([]);
  const [vendedoras, setVendedoras] = useState<VendedoraStats[]>([]);
  const [cursosList, setCursosList] = useState<{codigo: string, nombre: string}[]>([]);

  useEffect(() => {
    const loadCursos = async () => {
      const { data, error } = await supabase.rpc('get_cursos_lista');
      if (data && !error) {
        setCursosList(data.map((c: any) => ({ codigo: c.curso_codigo, nombre: c.curso_nombre })));
      }
    };
    loadCursos();
  }, []);

  const getFechasPeriodo = useCallback(() => {
    return parsePeriodo(periodo, fechaDesde, fechaHasta);
  }, [periodo, fechaDesde, fechaHasta]);

  const loadData = useCallback(async () => {
    setIsLoading(true);
    const { desde, hasta } = getFechasPeriodo();
    try {
      const [metRes, tendRes, vendRes] = await Promise.all([
        supabase.rpc('get_ventas_metricas', {
          p_fecha_desde: desde, p_fecha_hasta: hasta,
          p_curso_codigo: cursoSeleccionado || null,
        }),
        supabase.rpc('get_ventas_tendencias', {
          p_fecha_desde: desde, p_fecha_hasta: hasta,
          p_curso_codigo: cursoSeleccionado || null,
          p_agrupacion: getAgrupacion(periodo),
        }),
        supabase.rpc('get_ventas_por_vendedora', {
          p_fecha_desde: desde, p_fecha_hasta: hasta,
        }),
      ]);
      if (metRes.data) setMetricas(metRes.data);
      if (tendRes.data) setTendencias(tendRes.data);
      if (vendRes.data) setVendedoras(vendRes.data);
    } catch (error) {
      console.error('Error cargando datos de ventas:', error);
    } finally {
      setIsLoading(false);
    }
  }, [getFechasPeriodo, cursoSeleccionado, periodo]);

  useEffect(() => { loadData(); }, [loadData]);

  const handleExport = (formato: 'excel' | 'csv' | 'pdf') => {
    console.log('Exportar:', formato);
  };

  const clearFilters = () => {
    setFechaDesde(''); setFechaHasta(''); setCursoSeleccionado('');
  };

  const hasActiveFilters = fechaDesde || fechaHasta || cursoSeleccionado;

  const kpis = metricas ? [
    { label: 'Inscripciones', value: formatNumber(metricas.periodo_actual.inscripciones), delta: calcDelta(metricas.periodo_actual.inscripciones, metricas.periodo_anterior.inscripciones), icon: Users, color: PSI_RED },
    { label: 'Vendido', value: formatCurrency(metricas.periodo_actual.monto_vendido), delta: calcDelta(metricas.periodo_actual.monto_vendido, metricas.periodo_anterior.monto_vendido), icon: DollarSign, color: SLATE_700 },
    { label: 'Cobrado', value: formatCurrency(metricas.periodo_actual.monto_cobrado), delta: calcDelta(metricas.periodo_actual.monto_cobrado, metricas.periodo_anterior.monto_cobrado), icon: CheckCircle, color: SLATE_600 },
    { label: 'Tasa de Cobro', value: `${metricas.periodo_actual.tasa_cobro}%`, delta: 0, icon: Percent, color: metricas.periodo_actual.tasa_cobro >= 50 ? SLATE_600 : PSI_RED },
    { label: 'Ticket Promedio', value: formatCurrency(metricas.periodo_actual.ticket_promedio), delta: calcDelta(metricas.periodo_actual.ticket_promedio, metricas.periodo_anterior.ticket_promedio), icon: Target, color: SLATE_800 },
  ] : [];

  return (
    <div className="min-h-screen bg-gray-50/50">
      <DashboardHeader
        titulo="Ventas"
        subtitulo="Inscripciones, conversiones y facturación"
        icono={<ShoppingCart className="w-5 h-5 text-white" />}
        periodo={periodo}
        onPeriodoChange={setPeriodo}
        onExport={handleExport}
        onRefresh={() => loadData()}
        isLoading={isLoading}
      >
        <div className="mt-2">
          <button
            onClick={() => setShowFilters(!showFilters)}
            className={`flex items-center gap-2 px-3 py-1.5 text-xs font-medium rounded-lg transition-all ${
              hasActiveFilters ? 'bg-[#e63946] text-white' : 'bg-gray-100 text-gray-600 hover:bg-gray-200'
            }`}
          >
            <Filter className="w-3.5 h-3.5" />
            Filtros
            {hasActiveFilters && <span className="bg-white/20 px-1.5 py-0.5 rounded text-[10px]">Activos</span>}
            <ChevronDown className={`w-3 h-3 transition-transform ${showFilters ? 'rotate-180' : ''}`} />
          </button>
          {showFilters && (
            <div className="mt-3 p-3 bg-gray-50 rounded-xl border border-gray-200">
              <div className="grid grid-cols-2 lg:grid-cols-4 gap-3">
                <div>
                  <label className="block text-[10px] font-medium text-gray-500 uppercase mb-1">Desde</label>
                  <input type="date" value={fechaDesde} onChange={(e) => setFechaDesde(e.target.value)}
                    className="w-full px-2 py-1.5 text-xs border border-gray-200 rounded-lg focus:ring-2 focus:ring-[#e63946] focus:border-transparent" />
                </div>
                <div>
                  <label className="block text-[10px] font-medium text-gray-500 uppercase mb-1">Hasta</label>
                  <input type="date" value={fechaHasta} onChange={(e) => setFechaHasta(e.target.value)}
                    className="w-full px-2 py-1.5 text-xs border border-gray-200 rounded-lg focus:ring-2 focus:ring-[#e63946] focus:border-transparent" />
                </div>
                <div>
                  <label className="block text-[10px] font-medium text-gray-500 uppercase mb-1">Curso</label>
                  <select value={cursoSeleccionado} onChange={(e) => setCursoSeleccionado(e.target.value)}
                    className="w-full px-2 py-1.5 text-xs border border-gray-200 rounded-lg focus:ring-2 focus:ring-[#e63946] focus:border-transparent">
                    <option value="">Todos</option>
                    {cursosList.map(c => <option key={c.codigo} value={c.codigo}>{c.nombre}</option>)}
                  </select>
                </div>
                <div className="flex items-end">
                  {hasActiveFilters && (
                    <button onClick={clearFilters} className="flex items-center gap-1 px-3 py-1.5 text-xs text-gray-600 hover:text-[#e63946] transition-colors">
                      <X className="w-3 h-3" /> Limpiar
                    </button>
                  )}
                </div>
              </div>
            </div>
          )}
        </div>
      </DashboardHeader>

      <div className="p-3 sm:p-4 lg:p-6 space-y-4">
        {/* ═══ SECCIÓN 1: KPIs ═══ */}
        <div className="grid grid-cols-2 lg:grid-cols-5 gap-2 sm:gap-3">
          {isLoading ? (
            Array(5).fill(0).map((_, i) => (
              <div key={i} className="bg-white rounded-xl p-3 sm:p-4 animate-pulse">
                <div className="h-8 bg-gray-200 rounded mb-2" />
                <div className="h-4 bg-gray-200 rounded w-2/3" />
              </div>
            ))
          ) : (
            kpis.map((kpi, i) => (
              <div key={i} className="bg-white rounded-xl p-3 sm:p-4 shadow-sm border border-slate-100">
                <div className="flex items-center justify-between mb-2">
                  <div className="w-9 h-9 rounded-lg flex items-center justify-center" style={{ backgroundColor: `${kpi.color}15` }}>
                    <kpi.icon className="w-[18px] h-[18px]" style={{ color: kpi.color }} />
                  </div>
                  {kpi.delta !== 0 && (
                    <div className={`flex items-center gap-0.5 text-[10px] font-semibold ${kpi.delta > 0 ? 'text-green-600' : 'text-red-500'}`}>
                      {kpi.delta > 0 ? <ArrowUpRight className="w-3 h-3" /> : <ArrowDownRight className="w-3 h-3" />}
                      {Math.abs(kpi.delta)}%
                    </div>
                  )}
                </div>
                <p className="text-[10px] text-slate-500 uppercase tracking-wider font-medium">{kpi.label}</p>
                <p className="text-xl sm:text-2xl font-bold text-slate-900 mt-0.5">{kpi.value}</p>
              </div>
            ))
          )}
        </div>

        {/* ═══ SECCIÓN 2: Evolución + Agente IA ═══ */}
        <div className="grid grid-cols-1 lg:grid-cols-3 gap-4">
          <div className="lg:col-span-2 bg-white rounded-xl shadow-sm border border-slate-100 p-4">
            <h3 className="text-sm font-semibold text-slate-900 mb-4">Evolución de Inscripciones</h3>
            {isLoading ? (
              <div className="h-52 bg-gray-100 rounded-lg animate-pulse" />
            ) : (
              <div className="h-52">
                <ResponsiveContainer width="100%" height="100%">
                  <BarChart data={tendencias} barGap={1}>
                    <CartesianGrid strokeDasharray="3 3" stroke="#f0f0f0" />
                    <XAxis dataKey="periodo" tick={{ fontSize: 10 }}
                      tickFormatter={(v) => {
                        if (v?.includes('-')) {
                          const p = v.split('-');
                          if (p.length === 3) return `${p[2]}/${p[1]}`;
                          return MESES[parseInt(p[1]) - 1] || v;
                        }
                        return v;
                      }}
                    />
                    <YAxis tick={{ fontSize: 10 }} />
                    <Tooltip contentStyle={{ fontSize: 12, borderRadius: 8 }}
                      formatter={(value: number, name: string) => [
                        formatNumber(value),
                        name === 'inscripciones' ? 'Inscripciones' : 'Bajas'
                      ]}
                      labelFormatter={(v) => {
                        if (v && String(v).includes('-')) {
                          const p = String(v).split('-');
                          if (p.length === 3) return `${p[2]}/${p[1]}/${p[0]}`;
                          return `${MESES[parseInt(p[1]) - 1]} ${p[0]}`;
                        }
                        return v;
                      }}
                    />
                    <Bar dataKey="inscripciones" fill={SLATE_700} radius={[3, 3, 0, 0]} opacity={0.85} name="inscripciones" />
                    <Bar dataKey="bajas" fill={PSI_RED} radius={[3, 3, 0, 0]} opacity={0.7} name="bajas" />
                  </BarChart>
                </ResponsiveContainer>
              </div>
            )}
            <div className="flex items-center justify-center gap-6 mt-2">
              <div className="flex items-center gap-1.5">
                <div className="w-3 h-3 rounded-sm" style={{ backgroundColor: SLATE_700 }} />
                <span className="text-[10px] text-slate-500">Inscripciones</span>
              </div>
              <div className="flex items-center gap-1.5">
                <div className="w-3 h-3 rounded-sm" style={{ backgroundColor: PSI_RED }} />
                <span className="text-[10px] text-slate-500">Bajas</span>
              </div>
            </div>
          </div>

          {/* Agente IA */}
          <AgenteIAPanel />
        </div>

        {/* ═══ SECCIÓN 3 + 4: Embudo + Vendedoras ═══ */}
        <div className="grid grid-cols-1 lg:grid-cols-2 gap-4">
          {/* Embudo placeholder */}
          <div className="bg-white rounded-xl shadow-sm border border-slate-100 p-4">
            <div className="flex items-center justify-between mb-4">
              <h3 className="text-sm font-semibold text-slate-900">Embudo de Conversión</h3>
              <span className="text-[10px] px-2 py-1 rounded-full bg-amber-50 text-amber-600 font-medium">Pendiente Centralwap</span>
            </div>
            <div className="space-y-2">
              {EMBUDO_ETAPAS.map((etapa, i) => (
                <div key={i} className="flex items-center gap-3">
                  <span className="text-[10px] text-slate-500 w-36 text-right">{etapa}</span>
                  <div className="flex-1 h-7 bg-slate-50 rounded-lg border border-dashed border-slate-200 overflow-hidden">
                    <div className="h-full rounded-lg bg-slate-200/50" style={{ width: `${100 - i * 18}%` }} />
                  </div>
                </div>
              ))}
            </div>
            <p className="text-[10px] text-slate-400 text-center mt-3">Se completará con datos de Centralwap en producción</p>
          </div>

          {/* Vendedoras placeholder */}
          <div className="bg-white rounded-xl shadow-sm border border-slate-100 p-4">
            <div className="flex items-center justify-between mb-4">
              <h3 className="text-sm font-semibold text-slate-900">Rendimiento por Vendedora</h3>
              <span className="text-[10px] px-2 py-1 rounded-full bg-amber-50 text-amber-600 font-medium">Pendiente Centralwap</span>
            </div>
            {vendedoras.length === 0 ? (
              <>
                <div className="h-36 flex items-center justify-center border-2 border-dashed border-slate-200 rounded-xl bg-slate-50/50">
                  <div className="text-center">
                    <UserCheck className="w-8 h-8 mx-auto mb-2 text-slate-300" />
                    <p className="text-xs text-slate-400">Métricas por vendedora</p>
                    <p className="text-[10px] text-slate-400 mt-1">Leads · Conversión · Monto · Tiempo resp.</p>
                  </div>
                </div>
                <div className="grid grid-cols-4 gap-2 mt-3">
                  {['Leads asignados', '% Conversión', 'Monto vendido', 'Tiempo resp.'].map(m => (
                    <div key={m} className="text-center p-2 bg-slate-50 rounded-lg">
                      <p className="text-[10px] text-slate-400">{m}</p>
                      <p className="text-xs font-semibold text-slate-300 mt-1">—</p>
                    </div>
                  ))}
                </div>
              </>
            ) : (
              <div className="space-y-2">
                {vendedoras.map((v, i) => (
                  <div key={v.vendedora} className="flex items-center gap-3 p-3 rounded-lg border border-slate-100 hover:bg-slate-50 transition-colors">
                    <span className="text-xs font-bold text-slate-400 w-5">{i + 1}</span>
                    <div className="flex-1 min-w-0">
                      <p className="text-xs font-medium text-slate-900 truncate">{v.vendedora}</p>
                      <div className="flex items-center gap-3 mt-0.5">
                        <span className="text-[10px] text-slate-500">{v.leads_asignados} leads</span>
                        <span className="text-[10px] text-slate-600 font-medium">{v.tasa_conversion}% conv</span>
                      </div>
                    </div>
                    <p className="text-xs font-semibold text-slate-900">{formatCurrency(v.monto_vendido)}</p>
                  </div>
                ))}
              </div>
            )}
          </div>
        </div>

        {/* ═══ SECCIÓN 5: Análisis por Curso (independiente del header) ═══ */}
        <CursosDetalle />
      </div>
    </div>
  );
}
