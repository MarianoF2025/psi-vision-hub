'use client';

import { useState, useEffect } from 'react';
import Link from 'next/link';
import { createClient } from '@supabase/supabase-js';
import {
  Users, TrendingUp, DollarSign, Target, ArrowUpRight, ArrowDownRight,
  Sparkles, ChevronRight, AlertTriangle, AlertCircle, Info, Zap, Clock,
  GraduationCap, UserCheck, BookOpen, Megaphone, MessageCircle, MousePointer,
  ShoppingCart, CreditCard, BarChart3, Activity
} from 'lucide-react';
import {
  BarChart, Bar, XAxis, YAxis, CartesianGrid, Tooltip as RechartsTooltip,
  ResponsiveContainer, PieChart, Pie, Cell,
} from 'recharts';

const supabase = createClient(
  process.env.NEXT_PUBLIC_SUPABASE_URL!,
  process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!
);

const PSI_RED = '#e63946';
const SLATE_700 = '#334155';
const SLATE_600 = '#475569';

const formatCurrency = (value: number | null | undefined) => {
  if (value === null || value === undefined) return '—';
  if (value >= 1e9) return `$${(value / 1e9).toFixed(1)}B`;
  if (value >= 1e6) return `$${(value / 1e6).toFixed(1)}M`;
  if (value >= 1e3) return `$${(value / 1e3).toFixed(0)}K`;
  return `$${value.toFixed(0)}`;
};
const formatUSD = (v: number | null | undefined) => {
  if (v === null || v === undefined) return '—';
  if (v >= 1e6) return `$${(v / 1e6).toFixed(1)}M`;
  if (v >= 1e3) return `$${(v / 1e3).toFixed(1)}K`;
  return `$${v.toFixed(2)}`;
};
const formatNumber = (value: number | null | undefined) => (value !== null && value !== undefined) ? new Intl.NumberFormat('es-AR').format(value) : '—';
const formatPct = (v: number | null | undefined) => (v !== null && v !== undefined) ? `${v.toFixed(1)}%` : '—';

const calcCambio = (a: number, b: number) => {
  if (!b || b === 0) return { valor: 0, positivo: true };
  const c = ((a - b) / b) * 100;
  return { valor: Math.round(Math.abs(c)), positivo: c >= 0 };
};

function ProgressRing({ progress, size = 36, strokeWidth = 3, color = '#e63946' }: { progress: number; size?: number; strokeWidth?: number; color?: string }) {
  const radius = (size - strokeWidth) / 2;
  const circumference = radius * 2 * Math.PI;
  const offset = circumference - (progress / 100) * circumference;
  return (
    <svg width={size} height={size} className="transform -rotate-90">
      <circle cx={size / 2} cy={size / 2} r={radius} fill="none" stroke="currentColor" strokeWidth={strokeWidth} className="text-white/30" />
      <circle cx={size / 2} cy={size / 2} r={radius} fill="none" stroke={color} strokeWidth={strokeWidth} strokeDasharray={circumference} strokeDashoffset={offset} strokeLinecap="round" className="transition-all duration-1000 ease-out" />
    </svg>
  );
}

interface Insight {
  id: string; severidad: string; titulo: string; descripcion: string;
  area: string; tipo: string; created_at: string;
}

const MESES = ['', 'Ene', 'Feb', 'Mar', 'Abr', 'May', 'Jun', 'Jul', 'Ago', 'Sep', 'Oct', 'Nov', 'Dic'];

export default function MorningBriefing() {
  const [mounted, setMounted] = useState(false);
  const [fechaActual, setFechaActual] = useState('');
  const [saludo, setSaludo] = useState('');
  const [horaActual, setHoraActual] = useState('');
  const [isLoading, setIsLoading] = useState(true);

  // Alumnos
  const [metricas, setMetricas] = useState<any>(null);
  const [metricasAnt, setMetricasAnt] = useState<any>(null);
  const [cohortes, setCohortes] = useState<any>(null);
  const [cursosTop, setCursosTop] = useState<any[]>([]);
  const [tendencias, setTendencias] = useState<any[]>([]);

  // Marketing
  const [mktKpis, setMktKpis] = useState<any>(null);

  // Ventas
  const [ventasKpis, setVentasKpis] = useState<any>(null);

  // Insights
  const [insights, setInsights] = useState<Insight[]>([]);

  const nombreUsuario = 'Nina';
  const anio = new Date().getFullYear();

  useEffect(() => {
    setMounted(true);
    const ahora = new Date();
    const hora = ahora.getHours();
    setFechaActual(ahora.toLocaleDateString('es-AR', { weekday: 'long', day: 'numeric', month: 'long', year: 'numeric' }));
    setHoraActual(ahora.toLocaleTimeString('es-AR', { hour: '2-digit', minute: '2-digit' }));
    if (hora >= 5 && hora < 12) setSaludo('Buenos días');
    else if (hora >= 12 && hora < 19) setSaludo('Buenas tardes');
    else setSaludo('Buenas noches');

    const hoy = ahora.toISOString().split('T')[0];
    const inicioAnio = `${anio}-01-01`;
    const inicioAnioAnt = `${anio - 1}-01-01`;
    const mismaFechaAnt = `${anio - 1}-${String(ahora.getMonth() + 1).padStart(2, '0')}-${String(ahora.getDate()).padStart(2, '0')}`;
    const inicioTendencias = `${anio - 1}-01-01`;
    const inicioMes = `${anio}-${String(ahora.getMonth() + 1).padStart(2, '0')}-01`;

    Promise.all([
      // Alumnos
      supabase.rpc('get_alumnos_metricas', { p_fecha_desde: inicioAnio, p_fecha_hasta: hoy, p_curso_codigo: null, p_estado: null }),
      supabase.rpc('get_alumnos_metricas', { p_fecha_desde: inicioAnioAnt, p_fecha_hasta: mismaFechaAnt, p_curso_codigo: null, p_estado: null }),
      supabase.rpc('get_alumnos_tendencias', { p_fecha_desde: inicioTendencias, p_fecha_hasta: hoy, p_cursos_codigos: null, p_agrupar_por: 'mes' }),
      supabase.rpc('get_cursos_ranking', { p_fecha_desde: inicioMes, p_fecha_hasta: hoy, p_limite: 5, p_cursos_codigos: null }),
      supabase.rpc('get_cohortes_activas_periodo', { p_fecha_desde: hoy, p_fecha_hasta: hoy }),
      // Marketing
      supabase.rpc('get_marketing_kpis', { fecha_desde: inicioAnio, fecha_hasta: hoy }),
      // Ventas
      supabase.rpc('get_ventas_metricas', { fecha_desde: inicioAnio, fecha_hasta: hoy, curso_codigo: null }),
      // Insights (todas las áreas)
      supabase.from('agent_insights').select('*').eq('vigente', true).order('severidad').order('created_at', { ascending: false }).limit(6),
    ]).then(([met, metA, tend, cursos, coh, mkt, ventas, ins]) => {
      if (met.data) setMetricas(met.data);
      if (metA.data) setMetricasAnt(metA.data);
      if (tend.data) setTendencias(tend.data);
      if (cursos.data) setCursosTop(cursos.data);
      if (coh.data) setCohortes(coh.data);
      if (mkt.data) setMktKpis(mkt.data);
      if (ventas.data) setVentasKpis(ventas.data);
      if (ins.data) setInsights(ins.data as Insight[]);
      setIsLoading(false);
    });
  }, [anio]);

  if (!mounted) {
    return <div className="space-y-3 animate-pulse"><div className="h-48 bg-gradient-to-br from-gray-200 to-gray-300 rounded-xl" /><div className="h-32 bg-gray-200 rounded-xl" /></div>;
  }

  const cambioInsc = calcCambio(metricas?.total_inscripciones || 0, metricasAnt?.total_inscripciones || 0);
  const cambioIng = calcCambio(metricas?.ingresos_totales || 0, metricasAnt?.ingresos_totales || 0);

  const sevConfig: Record<string, { icon: any; bg: string; border: string; text: string }> = {
    critica: { icon: AlertTriangle, bg: 'bg-rose-50', border: 'border-l-rose-500', text: 'text-rose-700' },
    alta: { icon: AlertTriangle, bg: 'bg-rose-50', border: 'border-l-rose-500', text: 'text-rose-700' },
    media: { icon: AlertCircle, bg: 'bg-amber-50', border: 'border-l-amber-500', text: 'text-amber-700' },
    info: { icon: Info, bg: 'bg-blue-50', border: 'border-l-blue-500', text: 'text-blue-700' },
    baja: { icon: Info, bg: 'bg-slate-50', border: 'border-l-slate-400', text: 'text-slate-600' },
  };

  const chartData = tendencias.map((t: any) => ({
    mes: t.periodo?.slice(5) || '',
    Inscripciones: t.inscripciones,
    Bajas: t.bajas,
  }));

  return (
    <div className="space-y-3">
      {/* ─── Hero ─── */}
      <div className="relative overflow-hidden rounded-xl bg-gradient-to-br from-[#e63946] via-[#d62839] to-[#c1121f] shadow-lg shadow-red-500/20">
        <div className="absolute inset-0 overflow-hidden">
          <div className="absolute -top-20 -right-20 w-48 h-48 bg-white/10 rounded-full blur-3xl" />
          <div className="absolute -bottom-24 -left-24 w-56 h-56 bg-black/10 rounded-full blur-3xl" />
        </div>
        <div className="relative p-4 lg:p-5">
          <div className="flex items-center justify-between mb-2">
            <div className="flex items-center gap-2">
              <div className="flex items-center gap-1.5 px-2 py-1 bg-white/15 backdrop-blur-sm rounded-full">
                <div className="w-1.5 h-1.5 bg-emerald-400 rounded-full animate-pulse" />
                <span className="text-[10px] font-medium text-white/90">Año {anio}</span>
              </div>
              <span className="text-[10px] text-white/70">{horaActual}</span>
            </div>
            <div className="text-[10px] text-white/60 capitalize">{fechaActual}</div>
          </div>
          <div className="mb-3">
            <h1 className="text-xl lg:text-2xl font-bold text-white mb-1 tracking-tight">
              {saludo}, {nombreUsuario}
            </h1>
            <p className="text-xs lg:text-sm text-white/80 max-w-2xl leading-relaxed">
              {metricas && mktKpis ? (
                <>
                  En <span className="font-semibold text-white">{anio}</span>: 
                  <span className="font-semibold text-white"> {formatNumber(metricas.total_inscripciones)} inscripciones</span>,
                  <span className="text-amber-300 font-semibold"> {formatCurrency(metricas.ingresos_totales)}</span> en ingresos,
                  <span className="text-emerald-300 font-semibold"> {formatNumber(mktKpis.actual.conversaciones_wa)} consultas WA</span> desde Meta Ads.
                  {cohortes && <> Hoy hay <span className="font-semibold text-white">{cohortes.total_cohortes} cohortes activas</span>.</>}
                </>
              ) : 'Cargando datos del año...'}
            </p>
          </div>

          {/* KPIs Hero — 2 de Alumnos + 2 de Marketing */}
          <div className="grid grid-cols-2 lg:grid-cols-4 gap-2">
            {[
              { label: 'Inscripciones', value: metricas ? formatNumber(metricas.total_inscripciones) : '-', ...cambioInsc, icon: Users, color: '#10b981' },
              { label: 'Ingresos', value: metricas ? formatCurrency(metricas.ingresos_totales) : '-', ...cambioIng, icon: DollarSign, color: '#f59e0b' },
              { label: 'Consultas WA', value: mktKpis ? formatNumber(mktKpis.actual.conversaciones_wa) : '-', valor: mktKpis?.deltas?.conversaciones_wa_pct ? Math.abs(mktKpis.deltas.conversaciones_wa_pct) : 0, positivo: mktKpis?.deltas?.conversaciones_wa_pct >= 0, icon: MessageCircle, color: '#e63946' },
              { label: 'CPL', value: mktKpis ? formatUSD(mktKpis.actual.cpl) : '-', valor: mktKpis?.deltas?.cpl_pct ? Math.abs(mktKpis.deltas.cpl_pct) : 0, positivo: mktKpis?.deltas?.cpl_pct <= 0, icon: Target, color: '#8b5cf6' },
            ].map((kpi, i) => (
              <div key={i} className="bg-white/95 backdrop-blur-xl rounded-lg p-2.5 shadow-md hover:shadow-lg transition-all duration-300 hover:-translate-y-0.5 cursor-pointer">
                <div className="flex items-center justify-between mb-1.5">
                  <span className="text-[9px] font-medium text-gray-500 uppercase tracking-wider">{kpi.label}</span>
                  <div className="w-6 h-6 rounded-lg flex items-center justify-center" style={{ backgroundColor: `${kpi.color}15` }}>
                    <kpi.icon className="w-3 h-3" style={{ color: kpi.color }} />
                  </div>
                </div>
                <p className="text-lg lg:text-xl font-bold text-gray-900 tracking-tight">{isLoading ? '...' : kpi.value}</p>
                <div className={`flex items-center gap-0.5 ${kpi.positivo ? 'text-emerald-600' : 'text-red-500'}`}>
                  {kpi.positivo ? <ArrowUpRight className="w-2.5 h-2.5" /> : <ArrowDownRight className="w-2.5 h-2.5" />}
                  <span className="text-[10px] font-semibold">{kpi.positivo ? '+' : '-'}{kpi.valor}%</span>
                  <span className="text-[9px] text-gray-400 ml-0.5">vs período ant.</span>
                </div>
              </div>
            ))}
          </div>
        </div>
      </div>

      {/* ─── Resumen por Área: Marketing + Ventas + Alumnos ─── */}
      <div className="grid grid-cols-1 lg:grid-cols-3 gap-3">

        {/* Marketing */}
        <Link href="/marketing" className="block">
          <div className="bg-white rounded-xl shadow-sm border border-slate-100 p-4 hover:shadow-md transition-all hover:border-slate-200">
            <div className="flex items-center justify-between mb-3">
              <div className="flex items-center gap-2">
                <div className="w-7 h-7 rounded-lg bg-red-50 flex items-center justify-center">
                  <Megaphone className="w-3.5 h-3.5 text-[#e63946]" />
                </div>
                <h3 className="text-xs font-bold text-gray-900">Marketing</h3>
              </div>
              <ChevronRight className="w-4 h-4 text-slate-300" />
            </div>
            {mktKpis ? (
              <div className="space-y-2">
                <div className="grid grid-cols-3 gap-2">
                  <div>
                    <p className="text-[9px] text-slate-400 uppercase">Inversión</p>
                    <p className="text-sm font-bold text-slate-900">{formatUSD(mktKpis.actual.spend)}</p>
                  </div>
                  <div>
                    <p className="text-[9px] text-slate-400 uppercase">Consultas</p>
                    <p className="text-sm font-bold" style={{ color: PSI_RED }}>{formatNumber(mktKpis.actual.conversaciones_wa)}</p>
                  </div>
                  <div>
                    <p className="text-[9px] text-slate-400 uppercase">CPL</p>
                    <p className="text-sm font-bold text-slate-900">{formatUSD(mktKpis.actual.cpl)}</p>
                  </div>
                </div>
                <div className="flex items-center gap-2 pt-1 border-t border-slate-50">
                  <span className="text-[9px] text-slate-400">CTR {formatPct(mktKpis.actual.ctr)}</span>
                  <span className="text-[9px] text-slate-300">·</span>
                  <span className="text-[9px] text-slate-400">CPC {formatUSD(mktKpis.actual.cpc)}</span>
                  <span className="text-[9px] text-slate-300">·</span>
                  <span className="text-[9px] text-slate-400">{formatNumber(mktKpis.actual.impressions)} impr.</span>
                </div>
              </div>
            ) : (
              <div className="h-16 bg-gray-50 rounded-lg animate-pulse" />
            )}
          </div>
        </Link>

        {/* Ventas */}
        <Link href="/ventas" className="block">
          <div className="bg-white rounded-xl shadow-sm border border-slate-100 p-4 hover:shadow-md transition-all hover:border-slate-200">
            <div className="flex items-center justify-between mb-3">
              <div className="flex items-center gap-2">
                <div className="w-7 h-7 rounded-lg bg-slate-100 flex items-center justify-center">
                  <ShoppingCart className="w-3.5 h-3.5 text-slate-600" />
                </div>
                <h3 className="text-xs font-bold text-gray-900">Ventas</h3>
              </div>
              <ChevronRight className="w-4 h-4 text-slate-300" />
            </div>
            {ventasKpis ? (
              <div className="space-y-2">
                <div className="grid grid-cols-3 gap-2">
                  <div>
                    <p className="text-[9px] text-slate-400 uppercase">Vendido</p>
                    <p className="text-sm font-bold text-slate-900">{formatCurrency(ventasKpis.periodo_actual.monto_vendido)}</p>
                  </div>
                  <div>
                    <p className="text-[9px] text-slate-400 uppercase">Cobrado</p>
                    <p className="text-sm font-bold text-emerald-600">{formatCurrency(ventasKpis.periodo_actual.monto_cobrado)}</p>
                  </div>
                  <div>
                    <p className="text-[9px] text-slate-400 uppercase">Tasa Cobro</p>
                    <p className="text-sm font-bold text-slate-900">{formatPct(ventasKpis.periodo_actual.tasa_cobro)}</p>
                  </div>
                </div>
                <div className="flex items-center gap-2 pt-1 border-t border-slate-50">
                  <span className="text-[9px] text-slate-400">{formatNumber(ventasKpis.periodo_actual.inscripciones)} inscripciones</span>
                  <span className="text-[9px] text-slate-300">·</span>
                  <span className="text-[9px] text-slate-400">{ventasKpis.periodo_actual.cursos_unicos} cursos</span>
                  <span className="text-[9px] text-slate-300">·</span>
                  <span className="text-[9px] text-slate-400">Ticket {formatCurrency(ventasKpis.periodo_actual.ticket_promedio)}</span>
                </div>
              </div>
            ) : (
              <div className="h-16 bg-gray-50 rounded-lg animate-pulse" />
            )}
          </div>
        </Link>

        {/* Alumnos */}
        <Link href="/alumnos" className="block">
          <div className="bg-white rounded-xl shadow-sm border border-slate-100 p-4 hover:shadow-md transition-all hover:border-slate-200">
            <div className="flex items-center justify-between mb-3">
              <div className="flex items-center gap-2">
                <div className="w-7 h-7 rounded-lg bg-emerald-50 flex items-center justify-center">
                  <GraduationCap className="w-3.5 h-3.5 text-emerald-600" />
                </div>
                <h3 className="text-xs font-bold text-gray-900">Alumnos</h3>
              </div>
              <ChevronRight className="w-4 h-4 text-slate-300" />
            </div>
            {metricas ? (
              <div className="space-y-2">
                <div className="grid grid-cols-3 gap-2">
                  <div>
                    <p className="text-[9px] text-slate-400 uppercase">Activos</p>
                    <p className="text-sm font-bold text-slate-900">{formatNumber(metricas.activos)}</p>
                  </div>
                  <div>
                    <p className="text-[9px] text-slate-400 uppercase">Egresados</p>
                    <p className="text-sm font-bold text-emerald-600">{formatNumber(metricas.finalizados)}</p>
                  </div>
                  <div>
                    <p className="text-[9px] text-slate-400 uppercase">Bajas</p>
                    <p className="text-sm font-bold text-red-500">{formatNumber(metricas.bajas)}</p>
                  </div>
                </div>
                <div className="flex items-center gap-2 pt-1 border-t border-slate-50">
                  <span className="text-[9px] text-slate-400">Finalización {metricas.tasa_finalizacion}%</span>
                  <span className="text-[9px] text-slate-300">·</span>
                  <span className="text-[9px] text-slate-400">{metricas.cursos_unicos} cursos</span>
                  <span className="text-[9px] text-slate-300">·</span>
                  <span className="text-[9px] text-slate-400">{formatNumber(metricas.alumnos_unicos)} únicos</span>
                </div>
              </div>
            ) : (
              <div className="h-16 bg-gray-50 rounded-lg animate-pulse" />
            )}
          </div>
        </Link>
      </div>

      {/* ─── Cohortes + Quick Stats ─── */}
      <div className="grid grid-cols-1 lg:grid-cols-3 gap-3">
        <div className="lg:col-span-2 bg-white rounded-xl shadow-sm border border-gray-100 p-4">
          <div className="flex items-center justify-between mb-3">
            <div className="flex items-center gap-2">
              <BookOpen className="w-4 h-4 text-slate-400" />
              <h3 className="text-xs font-bold text-gray-900">Cohortes Activas Hoy</h3>
              {cohortes && <span className="text-[10px] text-slate-400">{cohortes.total_cohortes} cohortes · {formatNumber(cohortes.total_alumnos)} alumnos</span>}
            </div>
            <Link href="/alumnos" className="text-[10px] text-slate-400 hover:text-[#e63946] flex items-center gap-0.5">
              Ver detalle <ChevronRight className="w-3 h-3" />
            </Link>
          </div>
          {cohortes && cohortes.cohortes?.length > 0 ? (
            <div className="grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-4 gap-2">
              {cohortes.cohortes.slice(0, 8).map((c: any, i: number) => (
                <div key={i} className="bg-slate-50 rounded-lg p-2">
                  <p className="text-[10px] font-semibold text-slate-700 truncate">{c.curso_codigo}</p>
                  <p className="text-sm font-bold text-slate-900">{c.alumnos}</p>
                  <p className="text-[9px] text-slate-400">{MESES[c.cohorte_mes]} {c.cohorte_anio}</p>
                </div>
              ))}
              {cohortes.cohortes.length > 8 && (
                <div className="bg-slate-50 rounded-lg p-2 flex items-center justify-center">
                  <span className="text-[10px] text-slate-400">+{cohortes.cohortes.length - 8} más</span>
                </div>
              )}
            </div>
          ) : (
            <p className="text-xs text-slate-400">Cargando cohortes...</p>
          )}
        </div>

        <div className="space-y-3">
          <div className="bg-gradient-to-br from-emerald-500 to-emerald-600 rounded-lg p-3 text-white shadow-md">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-emerald-100 text-[10px] font-medium">Tasa Finalización</p>
                <p className="text-xl font-bold">{metricas ? `${metricas.tasa_finalizacion}%` : '-'}</p>
              </div>
              <ProgressRing progress={metricas?.tasa_finalizacion || 0} color="#fff" size={36} strokeWidth={3} />
            </div>
          </div>
          <div className="bg-gradient-to-br from-blue-500 to-blue-600 rounded-lg p-3 text-white shadow-md">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-blue-100 text-[10px] font-medium">Morosidad</p>
                <p className="text-xl font-bold">{metricas ? `${metricas.morosidad}%` : '-'}</p>
              </div>
              <CreditCard className="w-8 h-8 text-white/30" />
            </div>
          </div>
          <div className="bg-gradient-to-br from-purple-500 to-purple-600 rounded-lg p-3 text-white shadow-md">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-purple-100 text-[10px] font-medium">Ticket Promedio</p>
                <p className="text-xl font-bold">{metricas ? formatCurrency(metricas.ticket_promedio) : '-'}</p>
              </div>
              <DollarSign className="w-8 h-8 text-white/30" />
            </div>
          </div>
        </div>
      </div>

      {/* ─── Evolución + Top Cursos ─── */}
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-3">
        <div className="bg-white rounded-xl shadow-sm border border-gray-100 p-4">
          <div className="mb-3">
            <h3 className="text-xs font-bold text-gray-900">Evolución Mensual</h3>
            <p className="text-[10px] text-gray-500">Inscripciones y bajas (últimos 14 meses)</p>
          </div>
          <div className="h-44">
            <ResponsiveContainer width="100%" height="100%">
              <BarChart data={chartData} barGap={1}>
                <CartesianGrid strokeDasharray="3 3" stroke="#f0f0f0" />
                <XAxis dataKey="mes" tick={{ fontSize: 10 }} />
                <YAxis tick={{ fontSize: 10 }} />
                <RechartsTooltip contentStyle={{ fontSize: 11, borderRadius: 8 }} />
                <Bar dataKey="Inscripciones" fill={PSI_RED} radius={[3, 3, 0, 0]} opacity={0.85} />
                <Bar dataKey="Bajas" fill={SLATE_700} radius={[3, 3, 0, 0]} opacity={0.5} />
              </BarChart>
            </ResponsiveContainer>
          </div>
          <div className="flex items-center justify-center gap-6 mt-1">
            <div className="flex items-center gap-1.5">
              <div className="w-3 h-3 rounded-sm" style={{ backgroundColor: PSI_RED }} />
              <span className="text-[10px] text-slate-500">Inscripciones</span>
            </div>
            <div className="flex items-center gap-1.5">
              <div className="w-3 h-3 rounded-sm" style={{ backgroundColor: SLATE_700, opacity: 0.5 }} />
              <span className="text-[10px] text-slate-500">Bajas</span>
            </div>
          </div>
        </div>

        <div className="bg-white rounded-xl shadow-sm border border-gray-100 p-4">
          <div className="mb-3">
            <h3 className="text-xs font-bold text-gray-900">Top Cursos del Mes</h3>
            <p className="text-[10px] text-gray-500">Por inscripciones en el mes actual</p>
          </div>
          {cursosTop.length > 0 ? (
            <div className="space-y-2.5">
              {cursosTop.map((c: any, i: number) => {
                const maxVal = cursosTop[0]?.total_inscripciones || 1;
                const pct = (c.total_inscripciones / maxVal) * 100;
                return (
                  <div key={i}>
                    <div className="flex items-center justify-between mb-1">
                      <div className="flex items-center gap-2">
                        <span className="text-[10px] font-bold text-slate-400 w-4">{i + 1}</span>
                        <span className="text-xs font-medium text-gray-700">{c.curso_codigo}</span>
                      </div>
                      <span className="text-xs font-bold text-gray-900">{c.total_inscripciones}</span>
                    </div>
                    <div className="h-1.5 bg-gray-100 rounded-full overflow-hidden">
                      <div className="h-full rounded-full transition-all duration-500" style={{ width: `${pct}%`, backgroundColor: PSI_RED }} />
                    </div>
                  </div>
                );
              })}
            </div>
          ) : (
            <p className="text-xs text-slate-400 text-center py-8">Sin inscripciones este mes</p>
          )}
        </div>
      </div>

      {/* ─── Alertas del Agente IA ─── */}
      <div className="bg-white rounded-xl shadow-sm border border-gray-100 overflow-hidden">
        <div className="px-4 py-2.5 border-b border-gray-100 bg-gradient-to-r from-gray-50 to-white">
          <div className="flex items-center justify-between">
            <div className="flex items-center gap-2">
              <div className="w-7 h-7 rounded-lg bg-gradient-to-br from-amber-400 to-orange-500 flex items-center justify-center shadow-md">
                <Zap className="w-3.5 h-3.5 text-white" />
              </div>
              <div>
                <h2 className="text-xs font-bold text-gray-900">Insights del Agente IA</h2>
                <p className="text-[10px] text-gray-500">Alertas activas de todas las áreas</p>
              </div>
            </div>
            <Link href="/alertas" className="text-[10px] text-slate-400 hover:text-[#e63946] flex items-center gap-0.5">
              Ver todas <ChevronRight className="w-3 h-3" />
            </Link>
          </div>
        </div>
        <div className="divide-y divide-gray-50">
          {insights.length > 0 ? insights.map((ins, i) => {
            const cfg = sevConfig[ins.severidad] || sevConfig.info;
            const Icono = cfg.icon;
            return (
              <div key={i} className={`px-4 py-2.5 ${cfg.bg} border-l-4 ${cfg.border}`}>
                <div className="flex items-start gap-2.5">
                  <Icono className={`w-4 h-4 mt-0.5 flex-shrink-0 ${cfg.text}`} />
                  <div className="flex-1 min-w-0">
                    <p className={`text-xs font-semibold ${cfg.text}`}>{ins.titulo}</p>
                    {ins.descripcion && <p className="text-[10px] text-gray-600 mt-0.5 line-clamp-2">{ins.descripcion}</p>}
                    <div className="flex items-center gap-2 mt-1">
                      <span className="text-[9px] px-1.5 py-0.5 bg-white/60 rounded font-medium text-gray-500">{ins.area}</span>
                      <span className="text-[9px] text-gray-400">{new Date(ins.created_at).toLocaleDateString('es-AR')}</span>
                    </div>
                  </div>
                </div>
              </div>
            );
          }) : (
            <div className="px-4 py-6 text-center">
              <p className="text-xs text-slate-400">Sin insights activos</p>
            </div>
          )}
        </div>
        <div className="px-4 py-2.5 bg-gradient-to-r from-gray-50 to-white border-t border-gray-100">
          <div className="flex items-center justify-between">
            <div className="flex items-center gap-1.5 text-[10px] text-gray-500">
              <Sparkles className="w-3 h-3 text-[#e63946]" />
              <span>Pupy puede ayudarte a priorizar</span>
            </div>
            <Link href="/pupi">
              <button className="flex items-center gap-1.5 px-3 py-1.5 bg-gradient-to-r from-[#e63946] to-[#d62839] text-white text-xs font-semibold rounded-lg hover:shadow-md transition-all">
                <Sparkles className="w-3 h-3" /> Preguntale a Pupy <ChevronRight className="w-3 h-3" />
              </button>
            </Link>
          </div>
        </div>
      </div>
    </div>
  );
}
