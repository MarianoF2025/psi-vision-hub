'use client';

import { useState, useEffect, useCallback } from 'react';
import DashboardHeader from '@/components/dashboard/DashboardHeader';
import {
  AreaChart,
  Area,
  XAxis,
  YAxis,
  CartesianGrid,
  Tooltip,
  ResponsiveContainer,
  BarChart,
  Bar,
  Cell,
} from 'recharts';
import {
  ShoppingCart,
  Users,
  Clock,
  TrendingUp,
  TrendingDown,
  Target,
  UserCheck,
  Filter,
  X,
  ChevronDown,
  Sparkles,
  AlertTriangle,
  Bot,
  CheckCircle,
  XCircle,
  DollarSign,
  ArrowUpRight,
  ArrowDownRight
} from 'lucide-react';

// ============================================
// TIPOS
// ============================================

interface MetricasVentas {
  leads_totales: number;
  leads_nuevos: number;
  leads_contactados: number;
  leads_ganados: number;
  leads_perdidos: number;
  tasa_conversion: number;
  ttf_promedio: number;
  ticket_promedio: number;
  ingresos_totales: number;
}

interface VendedoraStats {
  nombre: string;
  leads_asignados: number;
  leads_ganados: number;
  tasa_conversion: number;
  ttf_promedio: number;
  ingresos: number;
}

interface LeadsPorEtapa {
  etapa: string;
  cantidad: number;
  color: string;
}

interface TendenciaVentas {
  periodo: string;
  leads: number;
  conversiones: number;
  ingresos: number;
}

// ============================================
// DATOS MOCK
// ============================================

const metricasMock: MetricasVentas = {
  leads_totales: 456,
  leads_nuevos: 89,
  leads_contactados: 234,
  leads_ganados: 67,
  leads_perdidos: 45,
  tasa_conversion: 14.7,
  ttf_promedio: 12,
  ticket_promedio: 85000,
  ingresos_totales: 5695000,
};

const vendedorasMock: VendedoraStats[] = [
  { nombre: 'Sofía García', leads_asignados: 156, leads_ganados: 28, tasa_conversion: 17.9, ttf_promedio: 8, ingresos: 2380000 },
  { nombre: 'María López', leads_asignados: 142, leads_ganados: 22, tasa_conversion: 15.5, ttf_promedio: 15, ingresos: 1870000 },
  { nombre: 'Ana Martínez', leads_asignados: 98, leads_ganados: 12, tasa_conversion: 12.2, ttf_promedio: 22, ingresos: 1020000 },
  { nombre: 'Laura Pérez', leads_asignados: 60, leads_ganados: 5, tasa_conversion: 8.3, ttf_promedio: 35, ingresos: 425000 },
];

const embudoMock: LeadsPorEtapa[] = [
  { etapa: 'Nuevos', cantidad: 89, color: '#3b82f6' },
  { etapa: 'Contactados', cantidad: 234, color: '#f59e0b' },
  { etapa: 'Interesados', cantidad: 156, color: '#8b5cf6' },
  { etapa: 'Negociando', cantidad: 78, color: '#06b6d4' },
  { etapa: 'Ganados', cantidad: 67, color: '#10b981' },
  { etapa: 'Perdidos', cantidad: 45, color: '#ef4444' },
];

const tendenciasMock: TendenciaVentas[] = [
  { periodo: '2025-07', leads: 52, conversiones: 8, ingresos: 680000 },
  { periodo: '2025-08', leads: 61, conversiones: 9, ingresos: 765000 },
  { periodo: '2025-09', leads: 78, conversiones: 12, ingresos: 1020000 },
  { periodo: '2025-10', leads: 85, conversiones: 11, ingresos: 935000 },
  { periodo: '2025-11', leads: 91, conversiones: 14, ingresos: 1190000 },
  { periodo: '2025-12', leads: 89, conversiones: 13, ingresos: 1105000 },
];

const cursosMock = [
  { codigo: 'AT', nombre: 'Acompañante Terapéutico' },
  { codigo: 'TEA', nombre: 'Trastorno Espectro Autista' },
  { codigo: 'APA', nombre: 'Apego y Parentalidad' },
  { codigo: 'TRA', nombre: 'Trauma y Disociación' },
];

// ============================================
// UTILIDADES
// ============================================

const formatCurrency = (value: number) => {
  if (value >= 1000000) return `$${(value / 1000000).toFixed(1)}M`;
  if (value >= 1000) return `$${(value / 1000).toFixed(0)}K`;
  return `$${value.toFixed(0)}`;
};

const formatNumber = (value: number) => {
  return new Intl.NumberFormat('es-AR').format(value);
};

const formatTTF = (minutos: number) => {
  if (minutos < 60) return `${minutos} min`;
  const horas = Math.floor(minutos / 60);
  const mins = minutos % 60;
  return mins > 0 ? `${horas}h ${mins}m` : `${horas}h`;
};

// ============================================
// COMPONENTE PRINCIPAL
// ============================================

export default function VentasPage() {
  const [periodo, setPeriodo] = useState('mes');
  const [isLoading, setIsLoading] = useState(true);
  const [showFilters, setShowFilters] = useState(false);

  // Filtros
  const [fechaDesde, setFechaDesde] = useState<string>('');
  const [fechaHasta, setFechaHasta] = useState<string>('');
  const [cursoSeleccionado, setCursoSeleccionado] = useState<string>('');
  const [vendedoraSeleccionada, setVendedoraSeleccionada] = useState<string>('');

  // Data (mock por ahora)
  const [metricas, setMetricas] = useState<MetricasVentas | null>(null);
  const [vendedoras, setVendedoras] = useState<VendedoraStats[]>([]);
  const [embudo, setEmbudo] = useState<LeadsPorEtapa[]>([]);
  const [tendencias, setTendencias] = useState<TendenciaVentas[]>([]);

  // Simular carga de datos
  const loadData = useCallback(async () => {
    setIsLoading(true);
    // Simular delay de API
    await new Promise(resolve => setTimeout(resolve, 800));
    
    setMetricas(metricasMock);
    setVendedoras(vendedorasMock);
    setEmbudo(embudoMock);
    setTendencias(tendenciasMock);
    
    setIsLoading(false);
  }, []);

  useEffect(() => {
    loadData();
  }, [loadData]);

  const handleExport = (formato: 'excel' | 'csv' | 'pdf') => {
    console.log('Exportar:', formato);
  };

  const handleRefresh = () => {
    loadData();
  };

  const clearFilters = () => {
    setFechaDesde('');
    setFechaHasta('');
    setCursoSeleccionado('');
    setVendedoraSeleccionada('');
  };

  const hasActiveFilters = fechaDesde || fechaHasta || cursoSeleccionado || vendedoraSeleccionada;

  // KPIs config
  const kpis = metricas ? [
    {
      label: 'Leads Totales',
      value: formatNumber(metricas.leads_totales),
      delta: 12,
      icon: Users,
      color: '#3b82f6',
      bgColor: '#3b82f615'
    },
    {
      label: 'Nuevos',
      value: formatNumber(metricas.leads_nuevos),
      delta: 8,
      icon: UserCheck,
      color: '#8b5cf6',
      bgColor: '#8b5cf615'
    },
    {
      label: 'Conversión',
      value: `${metricas.tasa_conversion}%`,
      delta: 5,
      icon: Target,
      color: '#10b981',
      bgColor: '#10b98115'
    },
    {
      label: 'TTF Promedio',
      value: formatTTF(metricas.ttf_promedio),
      delta: -15,
      icon: Clock,
      color: '#f59e0b',
      bgColor: '#f59e0b15'
    },
    {
      label: 'Ticket Promedio',
      value: formatCurrency(metricas.ticket_promedio),
      delta: 3,
      icon: DollarSign,
      color: '#06b6d4',
      bgColor: '#06b6d415'
    },
    {
      label: 'Ingresos',
      value: formatCurrency(metricas.ingresos_totales),
      delta: 18,
      icon: TrendingUp,
      color: '#10b981',
      bgColor: '#10b98115'
    }
  ] : [];

  return (
    <div className="min-h-screen bg-gray-50/50">
      <DashboardHeader
        titulo="Ventas"
        subtitulo="Gestión de leads y conversiones"
        icono={<ShoppingCart className="w-5 h-5 text-white" />}
        periodo={periodo}
        onPeriodoChange={setPeriodo}
        onExport={handleExport}
        onRefresh={handleRefresh}
        isLoading={isLoading}
      >
        {/* Filtros expandibles */}
        <div className="mt-2">
          <button
            onClick={() => setShowFilters(!showFilters)}
            className={`flex items-center gap-2 px-3 py-1.5 text-xs font-medium rounded-lg transition-all ${
              hasActiveFilters
                ? 'bg-[#e63946] text-white'
                : 'bg-gray-100 text-gray-600 hover:bg-gray-200'
            }`}
          >
            <Filter className="w-3.5 h-3.5" />
            Filtros
            {hasActiveFilters && (
              <span className="bg-white/20 px-1.5 py-0.5 rounded text-[10px]">Activos</span>
            )}
            <ChevronDown className={`w-3 h-3 transition-transform ${showFilters ? 'rotate-180' : ''}`} />
          </button>

          {showFilters && (
            <div className="mt-3 p-3 bg-gray-50 rounded-xl border border-gray-200">
              <div className="grid grid-cols-2 lg:grid-cols-5 gap-3">
                <div>
                  <label className="block text-[10px] font-medium text-gray-500 uppercase mb-1">Desde</label>
                  <input
                    type="date"
                    value={fechaDesde}
                    onChange={(e) => setFechaDesde(e.target.value)}
                    className="w-full px-2 py-1.5 text-xs border border-gray-200 rounded-lg focus:ring-2 focus:ring-[#e63946] focus:border-transparent"
                  />
                </div>
                <div>
                  <label className="block text-[10px] font-medium text-gray-500 uppercase mb-1">Hasta</label>
                  <input
                    type="date"
                    value={fechaHasta}
                    onChange={(e) => setFechaHasta(e.target.value)}
                    className="w-full px-2 py-1.5 text-xs border border-gray-200 rounded-lg focus:ring-2 focus:ring-[#e63946] focus:border-transparent"
                  />
                </div>
                <div>
                  <label className="block text-[10px] font-medium text-gray-500 uppercase mb-1">Curso</label>
                  <select
                    value={cursoSeleccionado}
                    onChange={(e) => setCursoSeleccionado(e.target.value)}
                    className="w-full px-2 py-1.5 text-xs border border-gray-200 rounded-lg focus:ring-2 focus:ring-[#e63946] focus:border-transparent"
                  >
                    <option value="">Todos</option>
                    {cursosMock.map((curso) => (
                      <option key={curso.codigo} value={curso.codigo}>{curso.codigo}</option>
                    ))}
                  </select>
                </div>
                <div>
                  <label className="block text-[10px] font-medium text-gray-500 uppercase mb-1">Vendedora</label>
                  <select
                    value={vendedoraSeleccionada}
                    onChange={(e) => setVendedoraSeleccionada(e.target.value)}
                    className="w-full px-2 py-1.5 text-xs border border-gray-200 rounded-lg focus:ring-2 focus:ring-[#e63946] focus:border-transparent"
                  >
                    <option value="">Todas</option>
                    {vendedorasMock.map((v) => (
                      <option key={v.nombre} value={v.nombre}>{v.nombre}</option>
                    ))}
                  </select>
                </div>
                <div className="flex items-end">
                  {hasActiveFilters && (
                    <button
                      onClick={clearFilters}
                      className="flex items-center gap-1 px-3 py-1.5 text-xs text-gray-600 hover:text-[#e63946] transition-colors"
                    >
                      <X className="w-3 h-3" />
                      Limpiar
                    </button>
                  )}
                </div>
              </div>
            </div>
          )}
        </div>
      </DashboardHeader>

      <div className="p-3 sm:p-4 lg:p-6 space-y-4">
        {/* KPIs */}
        <div className="grid grid-cols-2 lg:grid-cols-6 gap-2 sm:gap-3">
          {isLoading ? (
            Array(6).fill(0).map((_, i) => (
              <div key={i} className="bg-white rounded-xl p-3 sm:p-4 animate-pulse">
                <div className="h-8 bg-gray-200 rounded mb-2"></div>
                <div className="h-4 bg-gray-200 rounded w-2/3"></div>
              </div>
            ))
          ) : (
            kpis.map((kpi, index) => (
              <div key={index} className="bg-white rounded-xl p-3 sm:p-4 shadow-sm border border-gray-100">
                <div className="flex items-center justify-between mb-2">
                  <div
                    className="w-8 h-8 sm:w-10 sm:h-10 rounded-lg flex items-center justify-center"
                    style={{ backgroundColor: kpi.bgColor }}
                  >
                    <kpi.icon className="w-4 h-4 sm:w-5 sm:h-5" style={{ color: kpi.color }} />
                  </div>
                  <div className={`flex items-center gap-0.5 text-[10px] font-semibold ${kpi.delta >= 0 ? 'text-emerald-600' : 'text-red-500'}`}>
                    {kpi.delta >= 0 ? <ArrowUpRight className="w-3 h-3" /> : <ArrowDownRight className="w-3 h-3" />}
                    {Math.abs(kpi.delta)}%
                  </div>
                </div>
                <p className="text-[10px] sm:text-xs text-gray-500 uppercase tracking-wider">{kpi.label}</p>
                <p className="text-lg sm:text-2xl font-bold text-gray-900 mt-0.5">{kpi.value}</p>
              </div>
            ))
          )}
        </div>

        {/* Grid principal */}
        <div className="grid grid-cols-1 lg:grid-cols-3 gap-4">
          {/* Gráfico de tendencias */}
          <div className="lg:col-span-2 bg-white rounded-xl shadow-sm border border-gray-100 p-4">
            <h3 className="text-sm font-semibold text-gray-900 mb-4">Evolución de Leads y Conversiones</h3>
            {isLoading ? (
              <div className="h-64 bg-gray-100 rounded-lg animate-pulse"></div>
            ) : (
              <div className="h-64">
                <ResponsiveContainer width="100%" height="100%">
                  <AreaChart data={tendencias}>
                    <defs>
                      <linearGradient id="colorLeads" x1="0" y1="0" x2="0" y2="1">
                        <stop offset="5%" stopColor="#3b82f6" stopOpacity={0.3}/>
                        <stop offset="95%" stopColor="#3b82f6" stopOpacity={0}/>
                      </linearGradient>
                      <linearGradient id="colorConversiones" x1="0" y1="0" x2="0" y2="1">
                        <stop offset="5%" stopColor="#10b981" stopOpacity={0.3}/>
                        <stop offset="95%" stopColor="#10b981" stopOpacity={0}/>
                      </linearGradient>
                    </defs>
                    <CartesianGrid strokeDasharray="3 3" stroke="#f0f0f0" />
                    <XAxis
                      dataKey="periodo"
                      tick={{ fontSize: 10 }}
                      tickFormatter={(value) => {
                        if (value && value.includes('-')) {
                          const [, mes] = value.split('-');
                          const meses = ['Ene','Feb','Mar','Abr','May','Jun','Jul','Ago','Sep','Oct','Nov','Dic'];
                          return meses[parseInt(mes) - 1] || value;
                        }
                        return value;
                      }}
                    />
                    <YAxis tick={{ fontSize: 10 }} />
                    <Tooltip
                      contentStyle={{ fontSize: 12, borderRadius: 8 }}
                      formatter={(value: number, name: string) => [
                        formatNumber(value),
                        name === 'leads' ? 'Leads' : 'Conversiones'
                      ]}
                    />
                    <Area type="monotone" dataKey="leads" stroke="#3b82f6" fillOpacity={1} fill="url(#colorLeads)" strokeWidth={2} />
                    <Area type="monotone" dataKey="conversiones" stroke="#10b981" fillOpacity={1} fill="url(#colorConversiones)" strokeWidth={2} />
                  </AreaChart>
                </ResponsiveContainer>
              </div>
            )}
          </div>

          {/* Panel Agente IA */}
          <div className="bg-gradient-to-br from-slate-900 to-slate-800 rounded-xl shadow-sm p-4 text-white">
            <div className="flex items-center gap-2 mb-4">
              <div className="p-2 bg-gradient-to-br from-[#e63946] to-[#c1121f] rounded-lg">
                <Sparkles className="w-4 h-4 text-white" />
              </div>
              <div>
                <h3 className="text-sm font-semibold">Agente IA</h3>
                <p className="text-[10px] text-gray-400">Análisis inteligente</p>
              </div>
            </div>

            <div className="space-y-3">
              <div className="p-3 bg-white/10 rounded-lg border border-white/10">
                <div className="flex items-start gap-2">
                  <AlertTriangle className="w-4 h-4 text-amber-400 mt-0.5 flex-shrink-0" />
                  <div>
                    <p className="text-xs font-medium text-amber-400">Leads sin contactar</p>
                    <p className="text-[11px] text-gray-300 mt-1">
                      12 leads llevan más de 24hs sin respuesta. TTF ideal: menos de 15 min.
                    </p>
                  </div>
                </div>
              </div>

              <div className="p-3 bg-white/10 rounded-lg border border-white/10">
                <div className="flex items-start gap-2">
                  <TrendingUp className="w-4 h-4 text-emerald-400 mt-0.5 flex-shrink-0" />
                  <div>
                    <p className="text-xs font-medium text-emerald-400">Top Performer</p>
                    <p className="text-[11px] text-gray-300 mt-1">
                      Sofía tiene 17.9% de conversión y TTF de 8 min. Modelo a replicar.
                    </p>
                  </div>
                </div>
              </div>

              <div className="p-3 bg-white/10 rounded-lg border border-white/10">
                <div className="flex items-start gap-2">
                  <Bot className="w-4 h-4 text-blue-400 mt-0.5 flex-shrink-0" />
                  <div>
                    <p className="text-xs font-medium text-blue-400">Recomendación</p>
                    <p className="text-[11px] text-gray-300 mt-1">
                      AT tiene mejor conversión. Aumentar pauta en este curso 20%.
                    </p>
                  </div>
                </div>
              </div>
            </div>

            <button className="w-full mt-4 py-2 px-3 bg-white/10 hover:bg-white/20 border border-white/20 rounded-lg text-xs font-medium transition-colors flex items-center justify-center gap-2">
              <Sparkles className="w-3.5 h-3.5" />
              Generar análisis completo
            </button>
          </div>
        </div>

        {/* Embudo y Vendedoras */}
        <div className="grid grid-cols-1 lg:grid-cols-2 gap-4">
          {/* Embudo de ventas */}
          <div className="bg-white rounded-xl shadow-sm border border-gray-100 p-4">
            <h3 className="text-sm font-semibold text-gray-900 mb-4">Embudo de Ventas</h3>
            {isLoading ? (
              <div className="h-64 bg-gray-100 rounded-lg animate-pulse"></div>
            ) : (
              <div className="h-64">
                <ResponsiveContainer width="100%" height="100%">
                  <BarChart data={embudo} layout="vertical">
                    <XAxis type="number" tick={{ fontSize: 10 }} />
                    <YAxis dataKey="etapa" type="category" tick={{ fontSize: 10 }} width={80} />
                    <Tooltip
                      contentStyle={{ fontSize: 12, borderRadius: 8 }}
                      formatter={(value: number) => [formatNumber(value), 'Leads']}
                    />
                    <Bar dataKey="cantidad" radius={[0, 4, 4, 0]}>
                      {embudo.map((entry, index) => (
                        <Cell key={`cell-${index}`} fill={entry.color} />
                      ))}
                    </Bar>
                  </BarChart>
                </ResponsiveContainer>
              </div>
            )}
          </div>

          {/* Rendimiento vendedoras */}
          <div className="bg-white rounded-xl shadow-sm border border-gray-100 p-4">
            <h3 className="text-sm font-semibold text-gray-900 mb-4">Rendimiento por Vendedora</h3>
            {isLoading ? (
              <div className="space-y-2">
                {Array(4).fill(0).map((_, i) => (
                  <div key={i} className="h-14 bg-gray-100 rounded-lg animate-pulse"></div>
                ))}
              </div>
            ) : (
              <div className="space-y-2">
                {vendedoras.map((v, index) => (
                  <div key={v.nombre} className="flex items-center gap-3 p-2 rounded-lg hover:bg-gray-50 transition-colors">
                    <span className="text-xs font-bold text-gray-400 w-5">{index + 1}</span>
                    <div className="flex-1 min-w-0">
                      <p className="text-xs font-medium text-gray-900 truncate">{v.nombre}</p>
                      <div className="flex items-center gap-3 mt-0.5">
                        <span className="text-[10px] text-gray-500">{v.leads_asignados} leads</span>
                        <span className="text-[10px] text-emerald-600 font-medium">{v.tasa_conversion}% conv</span>
                        <span className="text-[10px] text-amber-600">{formatTTF(v.ttf_promedio)} TTF</span>
                      </div>
                    </div>
                    <div className="text-right">
                      <p className="text-xs font-semibold text-gray-900">{formatCurrency(v.ingresos)}</p>
                      <div className="flex items-center justify-end gap-1 mt-0.5">
                        <CheckCircle className="w-3 h-3 text-emerald-500" />
                        <span className="text-[10px] text-gray-500">{v.leads_ganados}</span>
                      </div>
                    </div>
                  </div>
                ))}
              </div>
            )}
          </div>
        </div>
      </div>
    </div>
  );
}
