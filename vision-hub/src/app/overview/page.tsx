'use client';

import { useState, useEffect, useCallback } from 'react';
import { createClient } from '@supabase/supabase-js';
import { AreaChart, DonutChart } from '@tremor/react';
import {
  Users,
  TrendingUp,
  DollarSign,
  Target,
  ArrowUpRight,
  ArrowDownRight,
  Megaphone,
  GraduationCap,
  Building2,
  Heart,
  LayoutDashboard,
  UserCheck
} from 'lucide-react';
import DashboardHeader from '@/components/dashboard/DashboardHeader';

const supabase = createClient(
  process.env.NEXT_PUBLIC_SUPABASE_URL!,
  process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!
);

// Utilidad para calcular fechas según período
function calcularFechas(periodo: string): { desde: string | null; hasta: string | null } {
  const hoy = new Date();
  const año = hoy.getFullYear();
  const mes = hoy.getMonth();
  const dia = hoy.getDate();

  switch (periodo) {
    case 'hoy':
      const hoyStr = hoy.toISOString().split('T')[0];
      return { desde: hoyStr, hasta: hoyStr };
    case 'semana':
      const inicioSemana = new Date(hoy);
      inicioSemana.setDate(dia - hoy.getDay());
      return { desde: inicioSemana.toISOString().split('T')[0], hasta: hoy.toISOString().split('T')[0] };
    case 'mes':
      const inicioMes = new Date(año, mes, 1);
      return { desde: inicioMes.toISOString().split('T')[0], hasta: hoy.toISOString().split('T')[0] };
    case 'año':
      const inicioAño = new Date(año, 0, 1);
      return { desde: inicioAño.toISOString().split('T')[0], hasta: hoy.toISOString().split('T')[0] };
    case 'todo':
    default:
      return { desde: null, hasta: null };
  }
}

// Formateo
const formatCurrency = (value: number) => {
  if (value >= 1000000000) return `$${(value / 1000000000).toFixed(1)}B`;
  if (value >= 1000000) return `$${(value / 1000000).toFixed(1)}M`;
  if (value >= 1000) return `$${(value / 1000).toFixed(0)}K`;
  return `$${value.toFixed(0)}`;
};

const formatNumber = (value: number) => {
  return new Intl.NumberFormat('es-AR').format(value);
};

// Sparkline Component
function Sparkline({ data, color = '#10b981', height = 24 }: { data: number[], color?: string, height?: number }) {
  const max = Math.max(...data);
  const min = Math.min(...data);
  const range = max - min || 1;
  const points = data.map((value, index) => {
    const x = (index / (data.length - 1)) * 100;
    const y = height - ((value - min) / range) * height;
    return `${x},${y}`;
  }).join(' ');

  return (
    <svg viewBox={`0 0 100 ${height}`} className="w-16 sm:w-20 h-5 sm:h-6" preserveAspectRatio="none">
      <defs>
        <linearGradient id={`spark-${color.replace('#', '')}`} x1="0%" y1="0%" x2="0%" y2="100%">
          <stop offset="0%" stopColor={color} stopOpacity="0.3" />
          <stop offset="100%" stopColor={color} stopOpacity="0" />
        </linearGradient>
      </defs>
      <polyline points={points} fill="none" stroke={color} strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" />
      <polygon points={`0,${height} ${points} 100,${height}`} fill={`url(#spark-${color.replace('#', '')})`} />
    </svg>
  );
}

// KPI Card
function KPICardPremium({ title, value, change, positive, icon: Icon, color, sparkData, isLoading }: {
  title: string; value: string; change: number; positive: boolean; icon: any; color: string; sparkData: number[]; isLoading?: boolean;
}) {
  return (
    <div className="group relative bg-white rounded-xl p-3 sm:p-4 shadow-sm border border-gray-100 hover:shadow-lg transition-all duration-300 cursor-pointer overflow-hidden">
      <div className="relative">
        <div className="flex items-start justify-between mb-2 sm:mb-3">
          <div className="w-8 h-8 sm:w-10 sm:h-10 rounded-lg sm:rounded-xl flex items-center justify-center shadow-sm" style={{ backgroundColor: `${color}15` }}>
            <Icon className="w-4 h-4 sm:w-5 sm:h-5" style={{ color }} />
          </div>
          <Sparkline data={sparkData} color={color} />
        </div>
        <p className="text-[10px] sm:text-[11px] font-medium text-gray-500 uppercase tracking-wider mb-0.5 sm:mb-1 truncate">{title}</p>
        <p className="text-xl sm:text-2xl font-bold text-gray-900">{isLoading ? '...' : value}</p>
        <div className={`flex items-center gap-1 mt-1.5 sm:mt-2 ${positive ? 'text-emerald-600' : 'text-red-500'}`}>
          {positive ? <ArrowUpRight className="w-3 h-3" /> : <ArrowDownRight className="w-3 h-3" />}
          <span className="text-[10px] sm:text-xs font-semibold">{positive ? '+' : ''}{change}%</span>
          <span className="text-[9px] sm:text-[10px] text-gray-400 ml-1 hidden sm:inline">vs período ant.</span>
        </div>
      </div>
    </div>
  );
}

interface MetricasAlumnos {
  total_inscripciones: number;
  activos: number;
  finalizados: number;
  bajas: number;
  alumnos_unicos: number;
  cursos_unicos: number;
  ingresos_totales: number;
  ticket_promedio: number;
  tasa_finalizacion: number;
  morosidad: number;
}

interface CursoRanking {
  curso_codigo: string;
  curso_nombre: string;
  total_inscripciones: number;
  ingresos: number;
}

export default function OverviewPage() {
  const [mounted, setMounted] = useState(false);
  const [periodo, setPeriodo] = useState('año');
  const [isLoading, setIsLoading] = useState(true);
  const [metricas, setMetricas] = useState<MetricasAlumnos | null>(null);
  const [metricasAnteriores, setMetricasAnteriores] = useState<MetricasAlumnos | null>(null);
  const [cursosRanking, setCursosRanking] = useState<CursoRanking[]>([]);

  const loadData = useCallback(async () => {
    setIsLoading(true);
    try {
      const { desde, hasta } = calcularFechas(periodo);
      
      // Cargar métricas del período actual
      const { data: metricasData } = await supabase.rpc('get_alumnos_metricas', {
        p_fecha_desde: desde,
        p_fecha_hasta: hasta,
        p_curso_codigo: null,
        p_estado: null
      });
      if (metricasData) setMetricas(metricasData);

      // Cargar ranking de cursos del período
      const { data: rankingData } = await supabase.rpc('get_cursos_ranking', {
        p_fecha_desde: desde,
        p_fecha_hasta: hasta,
        p_limite: 5
      });
      if (rankingData) setCursosRanking(rankingData);

      // Calcular período anterior para comparación
      if (desde && hasta) {
        const desdeDate = new Date(desde);
        const hastaDate = new Date(hasta);
        const diffDays = Math.ceil((hastaDate.getTime() - desdeDate.getTime()) / (1000 * 60 * 60 * 24));
        
        const desdeAnterior = new Date(desdeDate);
        desdeAnterior.setDate(desdeAnterior.getDate() - diffDays - 1);
        const hastaAnterior = new Date(desdeDate);
        hastaAnterior.setDate(hastaAnterior.getDate() - 1);

        const { data: metricasAnt } = await supabase.rpc('get_alumnos_metricas', {
          p_fecha_desde: desdeAnterior.toISOString().split('T')[0],
          p_fecha_hasta: hastaAnterior.toISOString().split('T')[0],
          p_curso_codigo: null,
          p_estado: null
        });
        if (metricasAnt) setMetricasAnteriores(metricasAnt);
      }
    } catch (error) {
      console.error('Error cargando datos:', error);
    } finally {
      setIsLoading(false);
    }
  }, [periodo]);

  useEffect(() => { 
    setMounted(true); 
  }, []);

  useEffect(() => {
    if (mounted) {
      loadData();
    }
  }, [mounted, loadData]);

  // Calcular cambio porcentual
  const calcularCambio = (actual: number, anterior: number): { valor: number; positivo: boolean } => {
    if (!anterior || anterior === 0) return { valor: 0, positivo: true };
    const cambio = ((actual - anterior) / anterior) * 100;
    return { valor: Math.round(Math.abs(cambio)), positivo: cambio >= 0 };
  };

  // Datos para gráficos (mock para evolución mensual)
  const chartData = [
    { mes: 'Jul', inscripciones: 1200, egresados: 580 },
    { mes: 'Ago', inscripciones: 1350, egresados: 620 },
    { mes: 'Sep', inscripciones: 1280, egresados: 590 },
    { mes: 'Oct', inscripciones: 1420, egresados: 650 },
    { mes: 'Nov', inscripciones: 1500, egresados: 680 },
    { mes: 'Dic', inscripciones: 1380, egresados: 640 },
  ];

  // Donut con datos reales de cursos
  const coloresDonut = ['#e63946', '#3b82f6', '#10b981', '#f59e0b', '#8b5cf6'];
  const donutData = cursosRanking.length > 0 
    ? cursosRanking.slice(0, 4).map((curso, i) => ({
        name: curso.curso_codigo,
        value: curso.total_inscripciones,
        color: coloresDonut[i]
      }))
    : [
        { name: 'AT', value: 35, color: '#e63946' },
        { name: 'APA', value: 28, color: '#3b82f6' },
        { name: 'TEA', value: 22, color: '#10b981' },
        { name: 'Otros', value: 15, color: '#f59e0b' },
      ];

  // Canales (mock - sin datos reales)
  const canalesData = [
    { name: 'Meta Ads', value: 156, icon: Megaphone, color: '#e63946' },
    { name: 'Google Ads', value: 89, icon: Target, color: '#3b82f6' },
    { name: 'Orgánico', value: 67, icon: Users, color: '#10b981' },
    { name: 'Referidos', value: 34, icon: Heart, color: '#f59e0b' },
  ];

  // Áreas con datos reales de alumnos
  const areasData = [
    { area: 'Marketing', metrica: '156 leads', detalle: '18% conv.', trend: 12, color: '#e63946', icon: Megaphone },
    { area: 'Ventas', metrica: '89 leads', detalle: '24% conv.', trend: 8, color: '#3b82f6', icon: TrendingUp },
    { area: 'Alumnos', metrica: metricas ? formatNumber(metricas.activos) + ' activos' : '-', detalle: `${metricas?.tasa_finalizacion || 0}% finaliz.`, trend: 5, color: '#10b981', icon: GraduationCap },
    { area: 'Admin', metrica: metricas ? formatCurrency(metricas.ingresos_totales) : '-', detalle: `${metricas?.cursos_unicos || 0} cursos`, trend: 3, color: '#f59e0b', icon: Building2 },
  ];

  // KPIs con datos reales y cambios calculados
  const cambioInscripciones = calcularCambio(metricas?.total_inscripciones || 0, metricasAnteriores?.total_inscripciones || 0);
  const cambioActivos = calcularCambio(metricas?.activos || 0, metricasAnteriores?.activos || 0);
  const cambioIngresos = calcularCambio(metricas?.ingresos_totales || 0, metricasAnteriores?.ingresos_totales || 0);
  const cambioFinalizacion = calcularCambio(metricas?.tasa_finalizacion || 0, metricasAnteriores?.tasa_finalizacion || 0);

  const kpisData = [
    { title: 'Inscripciones', value: metricas ? formatNumber(metricas.total_inscripciones) : '-', change: cambioInscripciones.valor, positive: cambioInscripciones.positivo, icon: Users, color: '#10b981', sparkData: [5000, 5500, 6000, 6500, 7000, 7500, metricas?.total_inscripciones || 7782] },
    { title: 'Alumnos Activos', value: metricas ? formatNumber(metricas.activos) : '-', change: cambioActivos.valor, positive: cambioActivos.positivo, icon: UserCheck, color: '#3b82f6', sparkData: [800, 850, 900, 950, 980, 1000, metricas?.activos || 1029] },
    { title: 'Ingresos Totales', value: metricas ? formatCurrency(metricas.ingresos_totales) : '-', change: cambioIngresos.valor, positive: cambioIngresos.positivo, icon: DollarSign, color: '#f59e0b', sparkData: [400, 450, 480, 500, 520, 540, (metricas?.ingresos_totales || 560000000) / 1000000] },
    { title: 'Tasa Finalización', value: metricas ? `${metricas.tasa_finalizacion}%` : '-', change: cambioFinalizacion.valor, positive: cambioFinalizacion.positivo, icon: Target, color: '#8b5cf6', sparkData: [48, 50, 51, 52, 53, 54, metricas?.tasa_finalizacion || 54] },
  ];

  const handleExport = (formato: 'excel' | 'csv' | 'pdf') => {
    console.log('Exportar:', formato);
  };

  const handleRefresh = () => {
    loadData();
  };

  const handlePeriodoChange = (nuevoPeriodo: string) => {
    setPeriodo(nuevoPeriodo);
  };

  if (!mounted) {
    return (
      <div className="p-3 sm:p-6 space-y-3 animate-pulse">
        <div className="grid grid-cols-2 lg:grid-cols-4 gap-2 sm:gap-4">
          {[...Array(4)].map((_, i) => <div key={i} className="h-24 sm:h-32 bg-gray-200 rounded-xl"></div>)}
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-gray-50/50">
      <DashboardHeader
        titulo="Overview"
        subtitulo={`Vista general - ${periodo === 'año' ? 'Año ' + new Date().getFullYear() : periodo === 'mes' ? 'Este mes' : periodo === 'semana' ? 'Esta semana' : periodo === 'hoy' ? 'Hoy' : 'Todo el tiempo'}`}
        icono={<LayoutDashboard className="w-5 h-5 text-white" />}
        periodo={periodo}
        onPeriodoChange={handlePeriodoChange}
        onExport={handleExport}
        onRefresh={handleRefresh}
        isLoading={isLoading}
      />

      <div className="p-3 sm:p-4 lg:p-6 space-y-3 sm:space-y-4">
        {/* KPIs */}
        <div className="grid grid-cols-2 lg:grid-cols-4 gap-2 sm:gap-3">
          {kpisData.map((kpi, index) => (
            <KPICardPremium key={index} {...kpi} isLoading={isLoading} />
          ))}
        </div>

        {/* Gráficos */}
        <div className="grid grid-cols-1 lg:grid-cols-2 gap-3 sm:gap-4">
          <div className="bg-white rounded-xl shadow-sm border border-gray-100 p-3 sm:p-4">
            <div className="flex items-center justify-between mb-3">
              <div>
                <h3 className="text-xs sm:text-sm font-bold text-gray-900">Evolución Mensual</h3>
                <p className="text-[9px] sm:text-[10px] text-gray-500">Inscripciones y egresados (últimos 6 meses)</p>
              </div>
              <div className="flex items-center gap-2 text-[9px]">
                <div className="flex items-center gap-1"><div className="w-2 h-2 rounded-full bg-[#e63946]"></div><span className="hidden sm:inline text-gray-600">Inscr.</span></div>
                <div className="flex items-center gap-1"><div className="w-2 h-2 rounded-full bg-[#10b981]"></div><span className="hidden sm:inline text-gray-600">Egres.</span></div>
              </div>
            </div>
            <AreaChart className="h-36 sm:h-44" data={chartData} index="mes" categories={['inscripciones', 'egresados']} colors={['rose', 'emerald']} showLegend={false} showGridLines={false} curveType="monotone" />
          </div>

          <div className="bg-white rounded-xl shadow-sm border border-gray-100 p-3 sm:p-4">
            <div className="mb-3">
              <h3 className="text-xs sm:text-sm font-bold text-gray-900">Top Cursos por Inscripciones</h3>
              <p className="text-[9px] sm:text-[10px] text-gray-500">Período seleccionado</p>
            </div>
            <div className="flex flex-col sm:flex-row items-center justify-center gap-3">
              <DonutChart className="h-32 w-32 sm:h-40 sm:w-40" data={donutData} category="value" index="name" colors={['rose', 'blue', 'emerald', 'amber']} showLabel={true} showAnimation={true} />
              <div className="grid grid-cols-2 sm:grid-cols-1 gap-1.5 w-full sm:w-auto">
                {donutData.map((item, i) => (
                  <div key={i} className="flex items-center gap-1.5">
                    <div className="w-2 h-2 rounded-full flex-shrink-0" style={{ backgroundColor: item.color }}></div>
                    <span className="text-[9px] sm:text-[10px] text-gray-600 truncate">{item.name}</span>
                    <span className="text-[9px] sm:text-[10px] font-semibold text-gray-900 ml-auto">{formatNumber(item.value)}</span>
                  </div>
                ))}
              </div>
            </div>
          </div>
        </div>

        {/* Canales y Áreas */}
        <div className="grid grid-cols-1 lg:grid-cols-2 gap-3 sm:gap-4">
          <div className="bg-white rounded-xl shadow-sm border border-gray-100 p-3 sm:p-4">
            <div className="mb-3">
              <h3 className="text-xs sm:text-sm font-bold text-gray-900">Top Canales</h3>
              <p className="text-[9px] sm:text-[10px] text-gray-500">Leads por fuente (datos de muestra)</p>
            </div>
            <div className="space-y-2.5">
              {canalesData.map((canal, index) => {
                const maxValue = Math.max(...canalesData.map(c => c.value));
                const percentage = (canal.value / maxValue) * 100;
                return (
                  <div key={index}>
                    <div className="flex items-center justify-between mb-1">
                      <div className="flex items-center gap-1.5">
                        <div className="w-5 h-5 sm:w-6 sm:h-6 rounded-md flex items-center justify-center" style={{ backgroundColor: `${canal.color}15` }}>
                          <canal.icon className="w-2.5 h-2.5 sm:w-3 sm:h-3" style={{ color: canal.color }} />
                        </div>
                        <span className="text-[10px] sm:text-xs font-medium text-gray-700">{canal.name}</span>
                      </div>
                      <span className="text-[10px] sm:text-xs font-bold text-gray-900">{canal.value}</span>
                    </div>
                    <div className="h-1.5 sm:h-2 bg-gray-100 rounded-full overflow-hidden">
                      <div className="h-full rounded-full transition-all duration-500" style={{ width: `${percentage}%`, backgroundColor: canal.color }}></div>
                    </div>
                  </div>
                );
              })}
            </div>
          </div>

          <div className="bg-white rounded-xl shadow-sm border border-gray-100 p-3 sm:p-4">
            <div className="mb-3">
              <h3 className="text-xs sm:text-sm font-bold text-gray-900">Rendimiento por Área</h3>
              <p className="text-[9px] sm:text-[10px] text-gray-500">Métricas por departamento</p>
            </div>
            <div className="space-y-2">
              {areasData.map((area, index) => (
                <div key={index} className="flex items-center gap-2 sm:gap-3 p-1.5 sm:p-2 rounded-lg hover:bg-gray-50 transition-colors cursor-pointer">
                  <div className="w-7 h-7 sm:w-9 sm:h-9 rounded-lg flex items-center justify-center shadow-sm flex-shrink-0" style={{ backgroundColor: `${area.color}15` }}>
                    <area.icon className="w-3.5 h-3.5 sm:w-4 sm:h-4" style={{ color: area.color }} />
                  </div>
                  <div className="flex-1 min-w-0">
                    <p className="text-[10px] sm:text-xs font-semibold text-gray-900">{area.area}</p>
                    <p className="text-[9px] sm:text-[10px] text-gray-500 truncate">{area.metrica} · {area.detalle}</p>
                  </div>
                  <div className={`flex items-center gap-0.5 flex-shrink-0 ${area.trend >= 0 ? 'text-emerald-600' : 'text-red-500'}`}>
                    {area.trend >= 0 ? <ArrowUpRight className="w-2.5 h-2.5 sm:w-3 sm:h-3" /> : <ArrowDownRight className="w-2.5 h-2.5 sm:w-3 sm:h-3" />}
                    <span className="text-[9px] sm:text-[10px] font-semibold">{area.trend >= 0 ? '+' : ''}{area.trend}%</span>
                  </div>
                </div>
              ))}
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}
