'use client';

import { useState, useEffect, useCallback } from 'react';
import { createClient } from '@supabase/supabase-js';
import DashboardHeader from '@/components/dashboard/DashboardHeader';
import AgenteIAPanel from '@/components/dashboard/AgenteIAPanel';
import { parsePeriodo, getAgrupacion, PERIODO_DEFAULT } from '@/lib/periodo';
import {
  AreaChart, Area, LineChart, Line, XAxis, YAxis, CartesianGrid, Tooltip,
  ResponsiveContainer, BarChart, Bar, PieChart as RechartsPie, Pie, Cell,
} from 'recharts';
import {
  Megaphone, DollarSign, MessageCircle, Target, MousePointer, Eye,
  ArrowUpRight, ArrowDownRight, ChevronDown, ChevronRight, RefreshCw,
  AlertTriangle, CheckCircle, Clock, Zap, TrendingUp, TrendingDown,
  Activity, Layers, BarChart3,
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
const SLATE_500 = '#64748b';

// ─── Colores para pie charts ───
const PIE_COLORS = [PSI_RED, SLATE_700, SLATE_600, SLATE_800, SLATE_500, '#94a3b8', '#cbd5e1'];

// ─── Helpers ───
const formatUSD = (v: number | null | undefined) => {
  if (v === null || v === undefined) return '—';
  if (v >= 1e6) return `$${(v / 1e6).toFixed(1)}M`;
  if (v >= 1e3) return `$${(v / 1e3).toFixed(1)}K`;
  return `$${v.toFixed(2)}`;
};
const formatNumber = (v: number | null | undefined) => (v !== null && v !== undefined) ? new Intl.NumberFormat('es-AR').format(v) : '—';
const formatPct = (v: number | null | undefined) => (v !== null && v !== undefined) ? `${v.toFixed(2)}%` : '—';
const calcDelta = (actual: number, anterior: number): number | null => {
  if (!anterior || anterior === 0) return actual > 0 ? 100 : null;
  return Math.round(((actual - anterior) / anterior) * 100);
};

const MESES = ['Ene','Feb','Mar','Abr','May','Jun','Jul','Ago','Sep','Oct','Nov','Dic'];

// ─── Semáforo creative health ───
const HEALTH_CONFIG: Record<string, { label: string; color: string; bg: string; border: string }> = {
  winner:   { label: 'Winner',   color: 'text-emerald-600', bg: 'bg-emerald-50',  border: 'border-emerald-200' },
  testing:  { label: 'Testing',  color: 'text-amber-600',   bg: 'bg-amber-50',    border: 'border-amber-200' },
  fatigued: { label: 'Fatigado', color: 'text-orange-600',  bg: 'bg-orange-50',   border: 'border-orange-200' },
  dead:     { label: 'Pausar',   color: 'text-red-600',     bg: 'bg-red-50',      border: 'border-red-200' },
};

// ══════════════════════════════════════════════
// TIPOS
// ══════════════════════════════════════════════

interface KPIData {
  actual: {
    spend: number; impressions: number; reach: number; clicks: number;
    conversaciones_wa: number; cpl: number | null; ctr: number; cpc: number;
    cpm: number; frequency: number; dias: number;
  };
  anterior: {
    spend: number; impressions: number; clicks: number;
    conversaciones_wa: number; cpl: number | null; ctr: number; cpc: number; cpm: number;
  };
  deltas: Record<string, number | null>;
}

interface Campana {
  campaign_id: string; nombre: string; status: string; objective: string;
  buying_type: string; daily_budget: number | null; lifetime_budget: number | null;
  spend: number; impressions: number; reach: number; clicks: number;
  conversaciones_wa: number; cpl: number | null; ctr: number; cpc: number;
  cpm: number; frequency: number; dias_activos: number;
  adsets_count: number; ads_count: number;
}

interface AdSet {
  adset_id: string; nombre: string; status: string;
  daily_budget: number | null; lifetime_budget: number | null;
  targeting: any; learning_phase_info: string | null;
  spend: number; impressions: number; clicks: number;
  conversaciones_wa: number; cpl: number | null; ctr: number; cpc: number;
  frequency: number; ads_count: number;
}

interface AdPerformance {
  ad_id: string; ad_name: string; status: string;
  campaign_id: string; campaign_name: string; adset_id: string;
  creative_body: string | null; creative_title: string | null;
  creative_image_url: string | null; creative_video_url: string | null;
  spend: number; impressions: number; reach: number; clicks: number;
  conversaciones_wa: number; cpl: number | null; ctr: number; cpc: number;
  frequency: number; quality_ranking: string | null;
  engagement_ranking: string | null; conversion_ranking: string | null;
  dias_activos: number; primer_dia: string; ultimo_dia: string;
}

interface AdTrend {
  ad_id: string; ad_name: string; campaign_name: string;
  dias: number; fatigue_score: 'alto' | 'medio' | 'bajo';
  tendencia: {
    ctr_inicio: number; ctr_fin: number; ctr_cambio_pct: number | null;
    cpc_inicio: number; cpc_fin: number; cpc_cambio_pct: number | null;
    frequency_inicio: number; frequency_fin: number; frequency_cambio_pct: number | null;
  };
}

interface Estructura {
  resumen: {
    campanas_total: number; campanas_activas: number;
    adsets_total: number; adsets_activos: number;
    ads_total: number; ads_activos: number;
  };
}

interface Embudo {
  periodo: { desde: string; hasta: string };
  embudo: {
    impresiones: number; clicks: number; conversaciones_wa: number;
    leads_ctwa: number; inscriptos: number; revenue_total: number;
  };
  conversiones: {
    click_to_conv_wa: number; conv_wa_to_lead: number;
    lead_to_inscripto: number; click_to_inscripto: number;
  };
  tiene_datos_cruce: boolean;
}

interface Distribucion {
  campaign_id: string; nombre: string; status: string;
  spend: number; spend_pct: number;
  conversaciones_wa: number; conversaciones_pct: number;
}

interface EvolucionPoint {
  periodo: string; spend: number; impressions: number; clicks: number;
  conversaciones_wa: number; cpl: number | null; ctr: number; cpc: number;
}


// ─── Tooltip de sección ───
function SectionTooltip({ text }: { text: string }) {
  const [show, setShow] = useState(false);
  return (
    <span className="relative inline-block ml-1.5">
      <span
        className="inline-flex items-center justify-center w-4 h-4 rounded-full bg-slate-100 text-slate-400 text-[9px] font-bold cursor-help hover:bg-slate-200 transition-colors"
        onMouseEnter={() => setShow(true)}
        onMouseLeave={() => setShow(false)}
      >i</span>
      {show && (
        <span className="absolute bottom-full left-1/2 -translate-x-1/2 mb-2 px-3 py-2 bg-slate-800 text-white text-[10px] rounded-lg shadow-lg whitespace-normal w-56 z-50 leading-relaxed">
          {text}
          <span className="absolute top-full left-1/2 -translate-x-1/2 border-4 border-transparent border-t-slate-800" />
        </span>
      )}
    </span>
  );
}

// ══════════════════════════════════════════════
// COMPONENTE PRINCIPAL
// ══════════════════════════════════════════════

export default function MarketingPage() {
  const [periodo, setPeriodo] = useState(PERIODO_DEFAULT);
  const [isLoading, setIsLoading] = useState(true);

  // Data states
  const [kpis, setKpis] = useState<KPIData | null>(null);
  const [evolucion, setEvolucion] = useState<EvolucionPoint[]>([]);
  const [campanas, setCampanas] = useState<Campana[]>([]);
  const [estructura, setEstructura] = useState<Estructura | null>(null);
  const [distribucion, setDistribucion] = useState<Distribucion[]>([]);
  const [adsPerformance, setAdsPerformance] = useState<AdPerformance[]>([]);
  const [adsTrends, setAdsTrends] = useState<AdTrend[]>([]);
  const [embudo, setEmbudo] = useState<Embudo | null>(null);

  // UI states
  const [expandedCampaign, setExpandedCampaign] = useState<string | null>(null);
  const [adsets, setAdsets] = useState<Record<string, AdSet[]>>({});
  const [loadingAdsets, setLoadingAdsets] = useState<string | null>(null);
  const [lastSync, setLastSync] = useState<string | null>(null);

  const getFechas = useCallback(() => {
    return parsePeriodo(periodo);
  }, [periodo]);

  const loadData = useCallback(async () => {
    setIsLoading(true);
    const { desde, hasta } = getFechas();

    try {
      const [kpisRes, evoRes, campRes, estrRes, distRes, adsRes, trendsRes, syncRes, embudoRes] = await Promise.all([
        supabase.rpc('get_marketing_kpis', { fecha_desde: desde, fecha_hasta: hasta }),
        supabase.rpc('get_marketing_evolucion', { fecha_desde: desde, fecha_hasta: hasta, granularidad: getAgrupacion(periodo) }),
        supabase.rpc('get_marketing_campanas', { fecha_desde: desde, fecha_hasta: hasta }),
        supabase.rpc('get_marketing_estructura'),
        supabase.rpc('get_marketing_distribucion', { fecha_desde: desde, fecha_hasta: hasta }),
        supabase.rpc('get_marketing_ads_performance', { fecha_desde: desde, fecha_hasta: hasta, limite: 20 }),
        supabase.rpc('get_marketing_ads_trends'),
        supabase.from('meta_sync_log').select('finished_at').order('finished_at', { ascending: false }).limit(1),
        supabase.rpc('get_marketing_embudo', { fecha_desde: desde, fecha_hasta: hasta }),
      ]);

      if (kpisRes.data) setKpis(kpisRes.data);
      if (evoRes.data?.serie) setEvolucion(evoRes.data.serie);
      if (campRes.data?.campanas) setCampanas(campRes.data.campanas);
      if (estrRes.data) setEstructura(estrRes.data);
      if (distRes.data?.distribucion) setDistribucion(distRes.data.distribucion);
      if (adsRes.data?.ads) setAdsPerformance(adsRes.data.ads);
      if (trendsRes.data?.ads) setAdsTrends(trendsRes.data.ads);
      if (syncRes.data?.[0]) setLastSync(syncRes.data[0].finished_at);
      if (embudoRes.data) setEmbudo(embudoRes.data);
    } catch (error) {
      console.error('Error cargando datos de marketing:', error);
    } finally {
      setIsLoading(false);
    }
  }, [getFechas, periodo]);

  useEffect(() => { loadData(); }, [loadData]);

  // Cargar ad sets al expandir campaña
  const toggleCampaign = async (campaignId: string) => {
    if (expandedCampaign === campaignId) {
      setExpandedCampaign(null);
      return;
    }
    setExpandedCampaign(campaignId);
    if (!adsets[campaignId]) {
      setLoadingAdsets(campaignId);
      const { desde, hasta } = getFechas();
      const res = await supabase.rpc('get_marketing_adsets', {
        p_campaign_id: campaignId, fecha_desde: desde, fecha_hasta: hasta,
      });
      if (res.data?.adsets) {
        setAdsets(prev => ({ ...prev, [campaignId]: res.data.adsets }));
      }
      setLoadingAdsets(null);
    }
  };

  const handleExport = (formato: 'excel' | 'csv' | 'pdf') => {
    console.log('Exportar marketing:', formato);
  };

  // ─── Calcular health de un ad basado en trends ───
  const getAdHealth = (ad: AdPerformance): string => {
    const trend = adsTrends.find(t => t.ad_id === ad.ad_id);
    if (!trend) {
      if (ad.conversaciones_wa >= 10 && ad.cpl !== null && ad.cpl <= 0.50) return 'winner';
      if (ad.spend > 1.0 && ad.conversaciones_wa === 0) return 'dead';
      return 'testing';
    }
    if (trend.fatigue_score === 'alto') return 'fatigued';
    if (ad.spend > 1.0 && ad.conversaciones_wa === 0) return 'dead';
    if (ad.conversaciones_wa >= 10 && ad.cpl !== null && ad.cpl <= 0.50) return 'winner';
    return 'testing';
  };

  // ─── KPI cards config ───
  const kpiCards = kpis ? [
    { label: 'Inversión', value: formatUSD(kpis.actual.spend), delta: kpis.deltas.spend_pct, icon: DollarSign, color: PSI_RED, invertDelta: true },
    { label: 'Consultas WA', value: formatNumber(kpis.actual.conversaciones_wa), delta: kpis.deltas.conversaciones_wa_pct, icon: MessageCircle, color: SLATE_700 },
    { label: 'Costo por Consulta', value: kpis.actual.cpl !== null ? formatUSD(kpis.actual.cpl) : '—', delta: kpis.deltas.cpl_pct, icon: Target, color: SLATE_600, invertDelta: true },
    { label: 'CTR', value: formatPct(kpis.actual.ctr), delta: kpis.deltas.ctr_pct, icon: MousePointer, color: SLATE_700 },
    { label: 'CPC', value: formatUSD(kpis.actual.cpc), delta: kpis.deltas.cpc_pct, icon: MousePointer, color: SLATE_800, invertDelta: true },
    { label: 'Impresiones', value: formatNumber(kpis.actual.impressions), delta: kpis.deltas.impressions_pct, icon: Eye, color: SLATE_500 },
  ] : [];

  // ─── Learning phase helpers ───
  const isLearning = (info: string | null) => info && info !== 'LEARNING_PHASE_OVER';

  return (
    <div className="min-h-screen bg-gray-50/50">
      <DashboardHeader
        titulo="Marketing"
        subtitulo="Meta Ads Performance · Andromeda"
        icono={<Megaphone className="w-5 h-5 text-white" />}
        periodo={periodo}
        onPeriodoChange={setPeriodo}
        onExport={handleExport}
        onRefresh={() => loadData()}
        isLoading={isLoading}
      >
        {/* Badge de estructura + frescura */}
        {estructura && (
          <div className="mt-2 flex items-center gap-3 flex-wrap">
            <div className="flex items-center gap-1.5 text-[10px] text-slate-500">
              <Layers className="w-3 h-3" />
              <span>{estructura.resumen.campanas_activas} campañas · {estructura.resumen.adsets_activos} grupos · {estructura.resumen.ads_activos} anuncios activos</span>
            </div>
            {lastSync && (
              <div className="flex items-center gap-1 text-[10px] text-slate-400">
                <Clock className="w-3 h-3" />
                <span>Sync: {new Date(lastSync).toLocaleString('es-AR', { day: '2-digit', month: '2-digit', hour: '2-digit', minute: '2-digit' })}</span>
                <div className="w-1.5 h-1.5 rounded-full bg-emerald-400 ml-0.5" />
              </div>
            )}
          </div>
        )}
      </DashboardHeader>

      <div className="p-3 sm:p-4 lg:p-6 space-y-4">

        {/* ═══ SECCIÓN 1: KPIs ═══ */}
        <div className="grid grid-cols-2 lg:grid-cols-6 gap-2 sm:gap-3">
          {isLoading ? (
            Array(6).fill(0).map((_, i) => (
              <div key={i} className="bg-white rounded-xl p-3 sm:p-4 animate-pulse">
                <div className="h-8 bg-gray-200 rounded mb-2" />
                <div className="h-4 bg-gray-200 rounded w-2/3" />
              </div>
            ))
          ) : (
            kpiCards.map((kpi, i) => {
              const delta = kpi.delta;
              const hasDelta = delta !== null && delta !== undefined;
              // Para spend, CPL, CPC: subir es malo (invertDelta)
              const isGood = hasDelta ? (kpi.invertDelta ? delta < 0 : delta > 0) : false;
              const isBad = hasDelta ? (kpi.invertDelta ? delta > 0 : delta < 0) : false;

              return (
                <div key={i} className="bg-white rounded-xl p-3 sm:p-4 shadow-sm border border-slate-100">
                  <div className="flex items-center justify-between mb-2">
                    <div className="w-9 h-9 rounded-lg flex items-center justify-center" style={{ backgroundColor: `${kpi.color}15` }}>
                      <kpi.icon className="w-[18px] h-[18px]" style={{ color: kpi.color }} />
                    </div>
                    {hasDelta && (
                      <div className={`flex items-center gap-0.5 text-[10px] font-semibold ${isGood ? 'text-green-600' : isBad ? 'text-red-500' : 'text-slate-400'}`}>
                        {delta > 0 ? <ArrowUpRight className="w-3 h-3" /> : delta < 0 ? <ArrowDownRight className="w-3 h-3" /> : null}
                        {delta !== null ? `${Math.abs(delta)}%` : ''}
                      </div>
                    )}
                  </div>
                  <p className="text-[10px] text-slate-500 uppercase tracking-wider font-medium">{kpi.label}</p>
                  <p className="text-xl sm:text-2xl font-bold text-slate-900 mt-0.5">{kpi.value}</p>
                </div>
              );
            })
          )}
        </div>

        {/* ═══ SECCIÓN 2: Evolución + Agente IA ═══ */}
        <div className="grid grid-cols-1 lg:grid-cols-3 gap-4">
          <div className="lg:col-span-2 bg-white rounded-xl shadow-sm border border-slate-100 p-4">
            <h3 className="text-sm font-semibold text-slate-900 mb-4">Evolución · Inversión vs Consultas WA<SectionTooltip text="Muestra la inversión en dólares y las consultas de WhatsApp generadas por día, semana o mes según el período seleccionado." /></h3>
            {isLoading ? (
              <div className="h-52 bg-gray-100 rounded-lg animate-pulse" />
            ) : evolucion.length === 0 ? (
              <div className="h-52 flex items-center justify-center text-xs text-slate-400">Sin datos para el período seleccionado</div>
            ) : (
              <div className="h-52">
                <ResponsiveContainer width="100%" height="100%">
                  <BarChart data={evolucion} barGap={1}>
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
                    <YAxis yAxisId="left" tick={{ fontSize: 10 }} />
                    <YAxis yAxisId="right" orientation="right" tick={{ fontSize: 10 }} />
                    <Tooltip
                      contentStyle={{ fontSize: 11, borderRadius: 8 }}
                      formatter={(value: number, name: string) => {
                        if (name === 'spend') return [formatUSD(value), 'Inversión'];
                        if (name === 'conversaciones_wa') return [formatNumber(value), 'Consultas WA'];
                        return [value, name];
                      }}
                      labelFormatter={(v) => {
                        if (v && String(v).includes('-')) {
                          const p = String(v).split('-');
                          if (p.length === 3) return `${p[2]}/${p[1]}/${p[0]}`;
                          return `${MESES[parseInt(p[1]) - 1]} ${p[0]}`;
                        }
                        return v;
                      }}
                    />
                    <Bar yAxisId="left" dataKey="spend" fill={SLATE_700} radius={[3, 3, 0, 0]} opacity={0.85} name="spend" />
                    <Bar yAxisId="right" dataKey="conversaciones_wa" fill={PSI_RED} radius={[3, 3, 0, 0]} opacity={0.7} name="conversaciones_wa" />
                  </BarChart>
                </ResponsiveContainer>
              </div>
            )}
            <div className="flex items-center justify-center gap-6 mt-2">
              <div className="flex items-center gap-1.5">
                <div className="w-3 h-3 rounded-sm" style={{ backgroundColor: SLATE_700 }} />
                <span className="text-[10px] text-slate-500">Inversión (USD)</span>
              </div>
              <div className="flex items-center gap-1.5">
                <div className="w-3 h-3 rounded-sm" style={{ backgroundColor: PSI_RED }} />
                <span className="text-[10px] text-slate-500">Consultas WA</span>
              </div>
            </div>
          </div>

          {/* Agente IA */}
          <AgenteIAPanel endpoint="/tableros/api/marketing-agent" />
        </div>

        {/* ═══ SECCIÓN 3: Campañas ═══ */}
        <div className="bg-white rounded-xl shadow-sm border border-slate-100 p-4">
          <h3 className="text-sm font-semibold text-slate-900 mb-4">
            Rendimiento por Campaña
            <SectionTooltip text="Campañas activas con inversión en el período. Hacé clic en una campaña para ver sus grupos de anuncios. Las campañas sin inversión se ocultan." />
          </h3>
          {isLoading ? (
            <div className="h-48 bg-gray-100 rounded-lg animate-pulse" />
          ) : (() => {
            const campanasConSpend = campanas.filter(c => c.spend > 0);
            const campanasResto = campanas.filter(c => c.spend === 0);
            if (campanasConSpend.length === 0) return <p className="text-xs text-slate-400 text-center py-8">Sin campañas con inversión en el período</p>;
            return (
              <div className="space-y-4">
                {/* Gráfico de barras horizontales */}
                <div className="h-[200px]">
                  <ResponsiveContainer width="100%" height="100%">
                    <BarChart data={campanasConSpend.slice(0, 8)} layout="vertical" barGap={2} margin={{ left: 10, right: 10 }}>
                      <CartesianGrid strokeDasharray="3 3" stroke="#f0f0f0" horizontal={false} />
                      <XAxis type="number" tick={{ fontSize: 10 }} />
                      <YAxis type="category" dataKey="nombre" tick={{ fontSize: 10 }} width={180}
                        tickFormatter={(v: string) => v.length > 28 ? v.substring(0, 28) + '...' : v} />
                      <Tooltip contentStyle={{ fontSize: 11, borderRadius: 8 }}
                        formatter={(value: number, name: string) => {
                          if (name === 'spend') return [formatUSD(value), 'Inversión'];
                          if (name === 'conversaciones_wa') return [formatNumber(value), 'Consultas WA'];
                          return [value, name];
                        }} />
                      <Bar dataKey="spend" fill={SLATE_700} radius={[0, 3, 3, 0]} barSize={14} name="spend" />
                      <Bar dataKey="conversaciones_wa" fill={PSI_RED} radius={[0, 3, 3, 0]} barSize={14} name="conversaciones_wa" />
                    </BarChart>
                  </ResponsiveContainer>
                </div>
                <div className="flex items-center justify-center gap-6">
                  <div className="flex items-center gap-1.5">
                    <div className="w-3 h-3 rounded-sm" style={{ backgroundColor: SLATE_700 }} />
                    <span className="text-[10px] text-slate-500">Inversión (USD)</span>
                  </div>
                  <div className="flex items-center gap-1.5">
                    <div className="w-3 h-3 rounded-sm" style={{ backgroundColor: PSI_RED }} />
                    <span className="text-[10px] text-slate-500">Consultas WA</span>
                  </div>
                </div>

                {/* Tabla compacta */}
                <div className="space-y-0.5">
                  <div className="grid grid-cols-8 gap-2 px-3 py-2 text-[9px] font-semibold text-slate-400 uppercase tracking-wider">
                    <div className="col-span-3">Campaña</div>
                    <div className="text-right">Inversión</div>
                    <div className="text-right">Consultas</div>
                    <div className="text-right">CPL</div>
                    <div className="text-right">CTR</div>
                    <div className="text-right">Estructura</div>
                  </div>
                  {campanasConSpend.map((camp) => {
                    const isExpanded = expandedCampaign === camp.campaign_id;
                    const campAdsets = adsets[camp.campaign_id] || [];
                    return (
                      <div key={camp.campaign_id}>
                        <div onClick={() => toggleCampaign(camp.campaign_id)}
                          className={`grid grid-cols-8 gap-2 px-3 py-2 rounded-lg cursor-pointer transition-all text-xs ${isExpanded ? 'bg-slate-50 border border-slate-200' : 'hover:bg-slate-50'}`}>
                          <div className="col-span-3 flex items-center gap-2 min-w-0">
                            {isExpanded ? <ChevronDown className="w-3 h-3 text-slate-400 flex-shrink-0" /> : <ChevronRight className="w-3 h-3 text-slate-400 flex-shrink-0" />}
                            <div className={`w-1.5 h-1.5 rounded-full flex-shrink-0 ${camp.status === 'ACTIVE' ? 'bg-emerald-400' : 'bg-slate-300'}`} />
                            <span className="truncate font-medium text-slate-900">{camp.nombre}</span>
                          </div>
                          <div className="text-right font-medium text-slate-900">{formatUSD(camp.spend)}</div>
                          <div className="text-right font-medium" style={{ color: camp.conversaciones_wa > 0 ? PSI_RED : SLATE_500 }}>{formatNumber(camp.conversaciones_wa)}</div>
                          <div className="text-right text-slate-700">{camp.cpl !== null ? formatUSD(camp.cpl) : '—'}</div>
                          <div className="text-right text-slate-700">{formatPct(camp.ctr)}</div>
                          <div className="text-right text-slate-400 text-[10px]">{camp.adsets_count}g · {camp.ads_count}a</div>
                        </div>
                        {isExpanded && (
                          <div className="ml-8 mt-1 mb-2 space-y-1">
                            {loadingAdsets === camp.campaign_id ? (
                              <div className="py-3 text-center text-[10px] text-slate-400">Cargando grupos...</div>
                            ) : campAdsets.length === 0 ? (
                              <div className="py-3 text-center text-[10px] text-slate-400">Sin ad sets en este período</div>
                            ) : (
                              <>
                                <div className="grid grid-cols-7 gap-2 px-3 py-1 text-[9px] font-semibold text-slate-400 uppercase">
                                  <div className="col-span-3">Grupo de Anuncios</div>
                                  <div className="text-right">Inversión</div>
                                  <div className="text-right">Consultas</div>
                                  <div className="text-right">CPL</div>
                                  <div className="text-right">Estado</div>
                                </div>
                                {campAdsets.map((as) => (
                                  <div key={as.adset_id} className="grid grid-cols-7 gap-2 px-3 py-2 rounded-md hover:bg-slate-50 text-[11px]">
                                    <div className="col-span-3 flex items-center gap-1.5 min-w-0">
                                      <div className={`w-1.5 h-1.5 rounded-full flex-shrink-0 ${as.status === 'ACTIVE' ? 'bg-emerald-400' : 'bg-slate-300'}`} />
                                      <span className="truncate text-slate-800">{as.nombre}</span>
                                    </div>
                                    <div className="text-right text-slate-700">{formatUSD(as.spend)}</div>
                                    <div className="text-right font-medium" style={{ color: as.conversaciones_wa > 0 ? PSI_RED : SLATE_500 }}>{formatNumber(as.conversaciones_wa)}</div>
                                    <div className="text-right text-slate-700">{as.cpl !== null ? formatUSD(as.cpl) : '—'}</div>
                                    <div className="text-right">
                                      {isLearning(as.learning_phase_info) ? (
                                        <span className="text-[9px] px-1.5 py-0.5 rounded-full bg-amber-50 text-amber-600 font-medium">Learning</span>
                                      ) : (
                                        <span className={`text-[9px] ${as.status === 'ACTIVE' ? 'text-emerald-600' : 'text-slate-400'}`}>{as.status === 'ACTIVE' ? 'Activo' : 'Pausado'}</span>
                                      )}
                                    </div>
                                  </div>
                                ))}
                              </>
                            )}
                          </div>
                        )}
                      </div>
                    );
                  })}
                  {campanasResto.length > 0 && (
                    <p className="text-[10px] text-slate-400 text-center pt-2">{campanasResto.length} campañas sin inversión en el período</p>
                  )}
                </div>
              </div>
            );
          })()}
        </div>


        {/* ═══ SECCIÓN 3.5: Embudo de Conversión ═══ */}
        <div className="bg-white rounded-xl shadow-sm border border-slate-100 p-4">
          <h3 className="text-sm font-semibold text-slate-900 mb-4">
            Embudo de Conversión
            <SectionTooltip text="Muestra el recorrido completo: desde que alguien ve el anuncio hasta que se inscribe y paga. Los datos de inscripción y revenue vienen del cruce con la API de PSI." />
          </h3>
          {isLoading || !embudo ? (
            <div className="h-48 bg-gray-100 rounded-lg animate-pulse" />
          ) : (() => {
            const e = embudo.embudo;
            const steps = [
              { label: 'Impresiones', value: e.impresiones, color: SLATE_500 },
              { label: 'Clicks', value: e.clicks, color: SLATE_600 },
              { label: 'Consultas WA', value: e.conversaciones_wa, color: PSI_RED },
              { label: 'Leads CTWA', value: e.leads_ctwa, color: '#d97706' },
              { label: 'Inscriptos', value: e.inscriptos, color: '#16a34a' },
            ];
            const maxVal = steps[0].value || 1;

            // Calcular ROAS y métricas derivadas
            const spend = kpis?.actual.spend || 0;
            const roas = spend > 0 ? (e.revenue_total / spend) : 0;
            const cpa = e.inscriptos > 0 ? (spend / e.inscriptos) : null;

            return (
              <div className="space-y-4">
                {/* Funnel visual */}
                <div className="space-y-1.5">
                  {steps.map((step, i) => {
                    const widthPct = Math.max((step.value / maxVal) * 100, 4);
                    const prevValue = i > 0 ? steps[i - 1].value : null;
                    const convRate = prevValue && prevValue > 0 ? ((step.value / prevValue) * 100).toFixed(1) : null;
                    return (
                      <div key={i} className="flex items-center gap-3">
                        <div className="w-24 text-right">
                          <p className="text-[10px] text-slate-500">{step.label}</p>
                        </div>
                        <div className="flex-1 relative">
                          <div className="h-7 bg-slate-50 rounded-md overflow-hidden">
                            <div
                              className="h-full rounded-md flex items-center px-2 transition-all duration-700"
                              style={{ width: `${widthPct}%`, backgroundColor: step.color, opacity: 0.85 }}
                            >
                              <span className="text-[11px] font-bold text-white whitespace-nowrap">
                                {formatNumber(step.value)}
                              </span>
                            </div>
                          </div>
                        </div>
                        <div className="w-14 text-right">
                          {convRate && (
                            <span className="text-[10px] text-slate-400">{convRate}%</span>
                          )}
                        </div>
                      </div>
                    );
                  })}
                </div>

                {/* KPIs del embudo */}
                <div className="grid grid-cols-2 lg:grid-cols-4 gap-3 pt-3 border-t border-slate-100">
                  <div className="text-center p-2 rounded-lg bg-emerald-50">
                    <p className="text-[9px] text-emerald-600 font-medium uppercase">Revenue Atribuido</p>
                    <p className="text-lg font-bold text-emerald-700">{formatUSD(e.revenue_total)}</p>
                  </div>
                  <div className="text-center p-2 rounded-lg bg-slate-50">
                    <p className="text-[9px] text-slate-500 font-medium uppercase">ROAS</p>
                    <p className={`text-lg font-bold ${roas >= 1 ? 'text-emerald-700' : 'text-red-600'}`}>
                      {roas > 0 ? `${roas.toFixed(1)}x` : '—'}
                    </p>
                  </div>
                  <div className="text-center p-2 rounded-lg bg-slate-50">
                    <p className="text-[9px] text-slate-500 font-medium uppercase">CPA Real</p>
                    <p className="text-lg font-bold text-slate-900">{cpa !== null ? formatUSD(cpa) : '—'}</p>
                  </div>
                  <div className="text-center p-2 rounded-lg bg-slate-50">
                    <p className="text-[9px] text-slate-500 font-medium uppercase">Click → Inscripción</p>
                    <p className="text-lg font-bold text-slate-900">
                      {e.inscriptos > 0 && e.clicks > 0 ? `${((e.inscriptos / e.clicks) * 100).toFixed(3)}%` : '—'}
                    </p>
                  </div>
                </div>

                {!embudo.tiene_datos_cruce && (
                  <div className="flex items-center gap-2 px-3 py-2 bg-amber-50 rounded-lg border border-amber-200">
                    <AlertTriangle className="w-3.5 h-3.5 text-amber-500 flex-shrink-0" />
                    <p className="text-[10px] text-amber-700">Los datos de leads CTWA, inscriptos y revenue requieren el cruce con la API de PSI. Verificá que la sincronización esté activa.</p>
                  </div>
                )}
              </div>
            );
          })()}
        </div>

        {/* ═══ SECCIÓN 4: Salud de Creatividades ═══ */}
        <div className="bg-white rounded-xl shadow-sm border border-slate-100 p-4">
          <h3 className="text-sm font-semibold text-slate-900 mb-4">
            Salud de Creatividades
            <SectionTooltip text="Cada anuncio se clasifica según su rendimiento: Winner (10+ consultas al CPL objetivo), Testing (sin datos suficientes), Fatigado (frecuencia alta + CTR cayendo) o Pausar (gasta sin generar consultas)." />
          </h3>
          {isLoading ? (
            <div className="h-48 bg-gray-100 rounded-lg animate-pulse" />
          ) : adsPerformance.length === 0 ? (
            <p className="text-xs text-slate-400 text-center py-8">Sin anuncios con datos en el período</p>
          ) : (() => {
            const adsWithHealth = adsPerformance.map(ad => ({ ...ad, health: getAdHealth(ad) }));
            const counts = { winner: 0, testing: 0, fatigued: 0, dead: 0 };
            adsWithHealth.forEach(a => { counts[a.health as keyof typeof counts]++; });
            const total = adsWithHealth.length;
            const top5 = adsWithHealth.slice(0, 5);

            const donutData = Object.entries(counts)
              .filter(([_, v]) => v > 0)
              .map(([key, value]) => ({ name: HEALTH_CONFIG[key].label, value, key }));

            const HEALTH_COLORS: Record<string, string> = { winner: '#16a34a', testing: '#d97706', fatigued: '#ea580c', dead: '#dc2626' };

            return (
              <div className="space-y-4">
                {/* Resumen visual: donut + conteos */}
                <div className="flex items-center gap-6">
                  <div className="w-32 h-32 flex-shrink-0">
                    <ResponsiveContainer width="100%" height="100%">
                      <RechartsPie>
                        <Pie data={donutData} dataKey="value" nameKey="name" cx="50%" cy="50%" innerRadius={28} outerRadius={50} paddingAngle={3}>
                          {donutData.map((d, i) => <Cell key={i} fill={HEALTH_COLORS[d.key]} />)}
                        </Pie>
                        <Tooltip contentStyle={{ fontSize: 11, borderRadius: 8 }} />
                      </RechartsPie>
                    </ResponsiveContainer>
                  </div>
                  <div className="flex-1 grid grid-cols-2 gap-3">
                    {Object.entries(counts).map(([key, value]) => {
                      const cfg = HEALTH_CONFIG[key];
                      const pct = total > 0 ? Math.round((value / total) * 100) : 0;
                      return (
                        <div key={key} className={`p-3 rounded-lg border ${cfg.border} ${cfg.bg}`}>
                          <div className="flex items-center justify-between">
                            <span className={`text-[11px] font-semibold ${cfg.color}`}>{cfg.label}</span>
                            <span className="text-lg font-bold text-slate-900">{value}</span>
                          </div>
                          <div className="mt-1 h-1 bg-slate-100 rounded-full overflow-hidden">
                            <div className="h-full rounded-full transition-all" style={{ width: `${pct}%`, backgroundColor: HEALTH_COLORS[key] }} />
                          </div>
                          <p className="text-[9px] text-slate-400 mt-1">{pct}% del total</p>
                        </div>
                      );
                    })}
                  </div>
                </div>

                {/* Top 5 anuncios */}
                <div>
                  <p className="text-[10px] font-semibold text-slate-400 uppercase tracking-wider mb-2">Top 5 por inversión</p>
                  <div className="space-y-1">
                    {top5.map((ad) => {
                      const cfg = HEALTH_CONFIG[ad.health];
                      const trend = adsTrends.find(t => t.ad_id === ad.ad_id);
                      return (
                        <div key={ad.ad_id} className="flex items-center gap-3 px-3 py-2 rounded-lg hover:bg-slate-50 transition-colors">
                          <span className={`text-[9px] px-1.5 py-0.5 rounded-full font-semibold ${cfg.color} ${cfg.bg} border ${cfg.border} flex-shrink-0`}>{cfg.label}</span>
                          <div className="flex-1 min-w-0">
                            <p className="text-xs font-medium text-slate-900 truncate">{ad.ad_name}</p>
                            <p className="text-[10px] text-slate-500 truncate">{ad.campaign_name}</p>
                          </div>
                          <div className="flex items-center gap-4 flex-shrink-0 text-[11px]">
                            <div className="text-right w-14">
                              <p className="text-[9px] text-slate-400">Inv.</p>
                              <p className="font-semibold text-slate-800">{formatUSD(ad.spend)}</p>
                            </div>
                            <div className="text-right w-12">
                              <p className="text-[9px] text-slate-400">Cons.</p>
                              <p className="font-semibold" style={{ color: ad.conversaciones_wa > 0 ? PSI_RED : SLATE_500 }}>{ad.conversaciones_wa}</p>
                            </div>
                            <div className="text-right w-12">
                              <p className="text-[9px] text-slate-400">CPL</p>
                              <p className="font-semibold text-slate-800">{ad.cpl !== null ? formatUSD(ad.cpl) : '—'}</p>
                            </div>
                            <div className="text-right w-10">
                              <p className="text-[9px] text-slate-400">Freq.</p>
                              <p className={`font-semibold ${ad.frequency > 3.5 ? 'text-orange-600' : 'text-slate-800'}`}>{ad.frequency?.toFixed(1) || '—'}</p>
                            </div>
                            {trend && trend.fatigue_score !== 'bajo' && (
                              <div className="flex items-center gap-1">
                                <Activity className="w-3 h-3 text-orange-500" />
                                <span className="text-[9px] text-orange-500">Fatigue</span>
                              </div>
                            )}
                          </div>
                        </div>
                      );
                    })}
                  </div>
                  {adsPerformance.length > 5 && (
                    <p className="text-[10px] text-slate-400 text-center pt-2">+{adsPerformance.length - 5} anuncios más</p>
                  )}
                </div>
              </div>
            );
          })()}
        </div>

        {/* ═══ SECCIÓN 5: Comparativa y Distribución ═══ */}
        <div className="grid grid-cols-1 lg:grid-cols-2 gap-4">
          {/* Distribución de Spend */}
          <div className="bg-white rounded-xl shadow-sm border border-slate-100 p-4">
            <h3 className="text-sm font-semibold text-slate-900 mb-4">Distribución de Inversión<SectionTooltip text="Porcentaje de la inversión total que se destina a cada campaña. Permite detectar si la plata está concentrada o dispersa." /></h3>
            {isLoading ? (
              <div className="h-48 bg-gray-100 rounded-lg animate-pulse" />
            ) : distribucion.filter(d => d.spend > 0).length === 0 ? (
              <div className="h-48 flex items-center justify-center text-xs text-slate-400">Sin datos</div>
            ) : (
              <div className="flex items-center gap-4">
                <div className="w-40 h-40">
                  <ResponsiveContainer width="100%" height="100%">
                    <RechartsPie>
                      <Pie
                        data={distribucion.filter(d => d.spend > 0)}
                        dataKey="spend"
                        nameKey="nombre"
                        cx="50%" cy="50%"
                        innerRadius={30} outerRadius={60}
                        paddingAngle={2}
                      >
                        {distribucion.filter(d => d.spend > 0).map((_, i) => (
                          <Cell key={i} fill={PIE_COLORS[i % PIE_COLORS.length]} />
                        ))}
                      </Pie>
                      <Tooltip formatter={(v: number) => formatUSD(v)} contentStyle={{ fontSize: 11, borderRadius: 8 }} />
                    </RechartsPie>
                  </ResponsiveContainer>
                </div>
                <div className="flex-1 space-y-1.5">
                  {distribucion.filter(d => d.spend > 0).map((d, i) => (
                    <div key={d.campaign_id} className="flex items-center gap-2">
                      <div className="w-2.5 h-2.5 rounded-sm flex-shrink-0" style={{ backgroundColor: PIE_COLORS[i % PIE_COLORS.length] }} />
                      <span className="text-[11px] text-slate-700 flex-1 truncate">{d.nombre}</span>
                      <span className="text-[11px] font-semibold text-slate-900">{d.spend_pct}%</span>
                    </div>
                  ))}
                </div>
              </div>
            )}
          </div>

          {/* Distribución de Conversaciones */}
          <div className="bg-white rounded-xl shadow-sm border border-slate-100 p-4">
            <h3 className="text-sm font-semibold text-slate-900 mb-4">Distribución de Consultas WA<SectionTooltip text="Porcentaje de consultas de WhatsApp que genera cada campaña. Si una campaña gasta mucho pero genera pocas consultas, hay desbalance." /></h3>
            {isLoading ? (
              <div className="h-48 bg-gray-100 rounded-lg animate-pulse" />
            ) : distribucion.filter(d => d.conversaciones_wa > 0).length === 0 ? (
              <div className="h-48 flex items-center justify-center text-xs text-slate-400">Sin conversaciones en el período</div>
            ) : (
              <div className="flex items-center gap-4">
                <div className="w-40 h-40">
                  <ResponsiveContainer width="100%" height="100%">
                    <RechartsPie>
                      <Pie
                        data={distribucion.filter(d => d.conversaciones_wa > 0)}
                        dataKey="conversaciones_wa"
                        nameKey="nombre"
                        cx="50%" cy="50%"
                        innerRadius={30} outerRadius={60}
                        paddingAngle={2}
                      >
                        {distribucion.filter(d => d.conversaciones_wa > 0).map((_, i) => (
                          <Cell key={i} fill={PIE_COLORS[i % PIE_COLORS.length]} />
                        ))}
                      </Pie>
                      <Tooltip formatter={(v: number) => formatNumber(v)} contentStyle={{ fontSize: 11, borderRadius: 8 }} />
                    </RechartsPie>
                  </ResponsiveContainer>
                </div>
                <div className="flex-1 space-y-1.5">
                  {distribucion.filter(d => d.conversaciones_wa > 0).map((d, i) => (
                    <div key={d.campaign_id} className="flex items-center gap-2">
                      <div className="w-2.5 h-2.5 rounded-sm flex-shrink-0" style={{ backgroundColor: PIE_COLORS[i % PIE_COLORS.length] }} />
                      <span className="text-[11px] text-slate-700 flex-1 truncate">{d.nombre}</span>
                      <span className="text-[11px] font-semibold" style={{ color: PSI_RED }}>{d.conversaciones_pct}%</span>
                    </div>
                  ))}
                </div>
              </div>
            )}
          </div>
        </div>

      </div>
    </div>
  );
}
