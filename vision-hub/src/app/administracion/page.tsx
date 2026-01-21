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
  PieChart,
  Pie,
  Cell,
} from 'recharts';
import {
  Building2,
  DollarSign,
  CreditCard,
  TrendingUp,
  TrendingDown,
  AlertTriangle,
  Receipt,
  PiggyBank,
  Filter,
  X,
  ChevronDown,
  Sparkles,
  Bot,
  ArrowUpRight,
  ArrowDownRight,
  Wallet,
  BadgeDollarSign,
  Clock
} from 'lucide-react';

// ============================================
// TIPOS
// ============================================

interface MetricasAdmin {
  facturacion_total: number;
  facturacion_ars: number;
  facturacion_usd: number;
  cobros_pendientes: number;
  cobros_vencidos: number;
  ltv_promedio: number;
  margen_neto: number;
  morosidad: number;
}

interface CobroPendiente {
  alumno: string;
  curso: string;
  monto: number;
  vencimiento: string;
  dias_vencido: number;
}

interface FacturacionMensual {
  periodo: string;
  ars: number;
  usd: number;
  total: number;
}

interface DistribucionIngresos {
  nombre: string;
  valor: number;
  color: string;
}

// ============================================
// DATOS MOCK
// ============================================

const metricasMock: MetricasAdmin = {
  facturacion_total: 18500000,
  facturacion_ars: 12800000,
  facturacion_usd: 5700000,
  cobros_pendientes: 3200000,
  cobros_vencidos: 890000,
  ltv_promedio: 245000,
  margen_neto: 42,
  morosidad: 8.5,
};

const cobrosPendientesMock: CobroPendiente[] = [
  { alumno: 'Juan Pérez', curso: 'AT', monto: 45000, vencimiento: '2025-01-10', dias_vencido: 10 },
  { alumno: 'María García', curso: 'TEA', monto: 52000, vencimiento: '2025-01-08', dias_vencido: 12 },
  { alumno: 'Carlos López', curso: 'APA', monto: 38000, vencimiento: '2025-01-15', dias_vencido: 5 },
  { alumno: 'Ana Martínez', curso: 'AT', monto: 45000, vencimiento: '2025-01-05', dias_vencido: 15 },
  { alumno: 'Luis Rodríguez', curso: 'TRA', monto: 62000, vencimiento: '2025-01-12', dias_vencido: 8 },
];

const facturacionMensualMock: FacturacionMensual[] = [
  { periodo: '2025-07', ars: 1800000, usd: 720000, total: 2520000 },
  { periodo: '2025-08', ars: 2100000, usd: 850000, total: 2950000 },
  { periodo: '2025-09', ars: 2400000, usd: 920000, total: 3320000 },
  { periodo: '2025-10', ars: 2200000, usd: 880000, total: 3080000 },
  { periodo: '2025-11', ars: 2600000, usd: 1050000, total: 3650000 },
  { periodo: '2025-12', ars: 2500000, usd: 980000, total: 3480000 },
];

const distribucionIngresosMock: DistribucionIngresos[] = [
  { nombre: 'Cursos', valor: 65, color: '#e63946' },
  { nombre: 'Especializaciones', valor: 25, color: '#3b82f6' },
  { nombre: 'Workshops', valor: 7, color: '#10b981' },
  { nombre: 'Otros', valor: 3, color: '#9ca3af' },
];

const pasarelasMock = [
  { nombre: 'MercadoPago', monto: 8500000, porcentaje: 46 },
  { nombre: 'SIRO', monto: 6200000, porcentaje: 33 },
  { nombre: 'Dlocal (USD)', monto: 3800000, porcentaje: 21 },
];

// ============================================
// UTILIDADES
// ============================================

const formatCurrency = (value: number, moneda: 'ARS' | 'USD' = 'ARS') => {
  const prefix = moneda === 'USD' ? 'US$' : '$';
  if (value >= 1000000) return `${prefix}${(value / 1000000).toFixed(1)}M`;
  if (value >= 1000) return `${prefix}${(value / 1000).toFixed(0)}K`;
  return `${prefix}${value.toFixed(0)}`;
};

const formatNumber = (value: number) => {
  return new Intl.NumberFormat('es-AR').format(value);
};

// ============================================
// COMPONENTE PRINCIPAL
// ============================================

export default function AdministracionPage() {
  const [periodo, setPeriodo] = useState('mes');
  const [isLoading, setIsLoading] = useState(true);
  const [showFilters, setShowFilters] = useState(false);

  // Filtros
  const [fechaDesde, setFechaDesde] = useState<string>('');
  const [fechaHasta, setFechaHasta] = useState<string>('');
  const [pasarelaSeleccionada, setPasarelaSeleccionada] = useState<string>('');

  // Data
  const [metricas, setMetricas] = useState<MetricasAdmin | null>(null);
  const [cobrosPendientes, setCobrosPendientes] = useState<CobroPendiente[]>([]);
  const [facturacion, setFacturacion] = useState<FacturacionMensual[]>([]);
  const [distribucion, setDistribucion] = useState<DistribucionIngresos[]>([]);

  const loadData = useCallback(async () => {
    setIsLoading(true);
    await new Promise(resolve => setTimeout(resolve, 800));
    
    setMetricas(metricasMock);
    setCobrosPendientes(cobrosPendientesMock);
    setFacturacion(facturacionMensualMock);
    setDistribucion(distribucionIngresosMock);
    
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
    setPasarelaSeleccionada('');
  };

  const hasActiveFilters = fechaDesde || fechaHasta || pasarelaSeleccionada;

  const kpis = metricas ? [
    {
      label: 'Facturación Total',
      value: formatCurrency(metricas.facturacion_total),
      delta: 15,
      icon: DollarSign,
      color: '#10b981',
      bgColor: '#10b98115'
    },
    {
      label: 'Facturación ARS',
      value: formatCurrency(metricas.facturacion_ars),
      delta: 12,
      icon: Wallet,
      color: '#3b82f6',
      bgColor: '#3b82f615'
    },
    {
      label: 'Facturación USD',
      value: formatCurrency(metricas.facturacion_usd, 'USD'),
      delta: 22,
      icon: BadgeDollarSign,
      color: '#8b5cf6',
      bgColor: '#8b5cf615'
    },
    {
      label: 'Cobros Pendientes',
      value: formatCurrency(metricas.cobros_pendientes),
      delta: -8,
      icon: Clock,
      color: '#f59e0b',
      bgColor: '#f59e0b15'
    },
    {
      label: 'LTV Promedio',
      value: formatCurrency(metricas.ltv_promedio),
      delta: 5,
      icon: TrendingUp,
      color: '#06b6d4',
      bgColor: '#06b6d415'
    },
    {
      label: 'Morosidad',
      value: `${metricas.morosidad}%`,
      delta: -12,
      icon: metricas.morosidad > 10 ? TrendingUp : TrendingDown,
      color: metricas.morosidad > 10 ? '#ef4444' : '#10b981',
      bgColor: metricas.morosidad > 10 ? '#ef444415' : '#10b98115'
    }
  ] : [];

  return (
    <div className="min-h-screen bg-gray-50/50">
      <DashboardHeader
        titulo="Administración"
        subtitulo="Finanzas y facturación"
        icono={<Building2 className="w-5 h-5 text-white" />}
        periodo={periodo}
        onPeriodoChange={setPeriodo}
        onExport={handleExport}
        onRefresh={handleRefresh}
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
                  <input type="date" value={fechaDesde} onChange={(e) => setFechaDesde(e.target.value)} className="w-full px-2 py-1.5 text-xs border border-gray-200 rounded-lg focus:ring-2 focus:ring-[#e63946] focus:border-transparent" />
                </div>
                <div>
                  <label className="block text-[10px] font-medium text-gray-500 uppercase mb-1">Hasta</label>
                  <input type="date" value={fechaHasta} onChange={(e) => setFechaHasta(e.target.value)} className="w-full px-2 py-1.5 text-xs border border-gray-200 rounded-lg focus:ring-2 focus:ring-[#e63946] focus:border-transparent" />
                </div>
                <div>
                  <label className="block text-[10px] font-medium text-gray-500 uppercase mb-1">Pasarela</label>
                  <select value={pasarelaSeleccionada} onChange={(e) => setPasarelaSeleccionada(e.target.value)} className="w-full px-2 py-1.5 text-xs border border-gray-200 rounded-lg focus:ring-2 focus:ring-[#e63946] focus:border-transparent">
                    <option value="">Todas</option>
                    <option value="mercadopago">MercadoPago</option>
                    <option value="siro">SIRO</option>
                    <option value="dlocal">Dlocal</option>
                  </select>
                </div>
                <div className="flex items-end">
                  {hasActiveFilters && (
                    <button onClick={clearFilters} className="flex items-center gap-1 px-3 py-1.5 text-xs text-gray-600 hover:text-[#e63946] transition-colors">
                      <X className="w-3 h-3" />Limpiar
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
                  <div className="w-8 h-8 sm:w-10 sm:h-10 rounded-lg flex items-center justify-center" style={{ backgroundColor: kpi.bgColor }}>
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
          {/* Gráfico de facturación */}
          <div className="lg:col-span-2 bg-white rounded-xl shadow-sm border border-gray-100 p-4">
            <h3 className="text-sm font-semibold text-gray-900 mb-4">Evolución de Facturación</h3>
            {isLoading ? (
              <div className="h-64 bg-gray-100 rounded-lg animate-pulse"></div>
            ) : (
              <div className="h-64">
                <ResponsiveContainer width="100%" height="100%">
                  <AreaChart data={facturacion}>
                    <defs>
                      <linearGradient id="colorARS" x1="0" y1="0" x2="0" y2="1">
                        <stop offset="5%" stopColor="#3b82f6" stopOpacity={0.3}/>
                        <stop offset="95%" stopColor="#3b82f6" stopOpacity={0}/>
                      </linearGradient>
                      <linearGradient id="colorUSD" x1="0" y1="0" x2="0" y2="1">
                        <stop offset="5%" stopColor="#10b981" stopOpacity={0.3}/>
                        <stop offset="95%" stopColor="#10b981" stopOpacity={0}/>
                      </linearGradient>
                    </defs>
                    <CartesianGrid strokeDasharray="3 3" stroke="#f0f0f0" />
                    <XAxis dataKey="periodo" tick={{ fontSize: 10 }} tickFormatter={(value) => {
                      if (value && value.includes('-')) {
                        const [, mes] = value.split('-');
                        const meses = ['Ene','Feb','Mar','Abr','May','Jun','Jul','Ago','Sep','Oct','Nov','Dic'];
                        return meses[parseInt(mes) - 1] || value;
                      }
                      return value;
                    }} />
                    <YAxis tick={{ fontSize: 10 }} tickFormatter={(v) => `$${(v/1000000).toFixed(1)}M`} />
                    <Tooltip contentStyle={{ fontSize: 12, borderRadius: 8 }} formatter={(value: number, name: string) => [formatCurrency(value), name === 'ars' ? 'ARS' : 'USD']} />
                    <Area type="monotone" dataKey="ars" stroke="#3b82f6" fillOpacity={1} fill="url(#colorARS)" strokeWidth={2} />
                    <Area type="monotone" dataKey="usd" stroke="#10b981" fillOpacity={1} fill="url(#colorUSD)" strokeWidth={2} />
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
                    <p className="text-xs font-medium text-amber-400">Cobros vencidos</p>
                    <p className="text-[11px] text-gray-300 mt-1">
                      $890K en cobros vencidos (+15 días). Priorizar contacto con 5 cuentas críticas.
                    </p>
                  </div>
                </div>
              </div>

              <div className="p-3 bg-white/10 rounded-lg border border-white/10">
                <div className="flex items-start gap-2">
                  <TrendingUp className="w-4 h-4 text-emerald-400 mt-0.5 flex-shrink-0" />
                  <div>
                    <p className="text-xs font-medium text-emerald-400">Tendencia positiva</p>
                    <p className="text-[11px] text-gray-300 mt-1">
                      USD creció 22% este mes. Dlocal procesa más rápido que las alternativas.
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
                      Implementar recordatorio automático 3 días antes del vencimiento reduce morosidad 35%.
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

        {/* Distribución y Cobros pendientes */}
        <div className="grid grid-cols-1 lg:grid-cols-2 gap-4">
          {/* Distribución de ingresos */}
          <div className="bg-white rounded-xl shadow-sm border border-gray-100 p-4">
            <h3 className="text-sm font-semibold text-gray-900 mb-4">Distribución de Ingresos</h3>
            {isLoading ? (
              <div className="h-48 bg-gray-100 rounded-lg animate-pulse"></div>
            ) : (
              <div className="flex items-center gap-6">
                <div className="w-40 h-40">
                  <ResponsiveContainer width="100%" height="100%">
                    <PieChart>
                      <Pie data={distribucion} cx="50%" cy="50%" innerRadius={35} outerRadius={60} paddingAngle={2} dataKey="valor">
                        {distribucion.map((entry, index) => (
                          <Cell key={`cell-${index}`} fill={entry.color} />
                        ))}
                      </Pie>
                      <Tooltip formatter={(value: number) => `${value}%`} />
                    </PieChart>
                  </ResponsiveContainer>
                </div>
                <div className="flex-1 space-y-2">
                  {distribucion.map((item) => (
                    <div key={item.nombre} className="flex items-center justify-between">
                      <div className="flex items-center gap-2">
                        <div className="w-3 h-3 rounded-full" style={{ backgroundColor: item.color }}></div>
                        <span className="text-xs text-gray-600">{item.nombre}</span>
                      </div>
                      <span className="text-xs font-semibold text-gray-900">{item.valor}%</span>
                    </div>
                  ))}
                </div>
              </div>
            )}
            
            {/* Pasarelas */}
            <div className="mt-4 pt-4 border-t border-gray-100">
              <p className="text-[10px] font-semibold text-gray-500 uppercase mb-2">Por Pasarela</p>
              <div className="space-y-2">
                {pasarelasMock.map((p) => (
                  <div key={p.nombre} className="flex items-center gap-2">
                    <div className="flex-1">
                      <div className="flex items-center justify-between mb-1">
                        <span className="text-xs text-gray-700">{p.nombre}</span>
                        <span className="text-xs font-medium text-gray-900">{formatCurrency(p.monto)}</span>
                      </div>
                      <div className="h-1.5 bg-gray-100 rounded-full overflow-hidden">
                        <div className="h-full bg-[#e63946] rounded-full" style={{ width: `${p.porcentaje}%` }}></div>
                      </div>
                    </div>
                  </div>
                ))}
              </div>
            </div>
          </div>

          {/* Cobros pendientes */}
          <div className="bg-white rounded-xl shadow-sm border border-gray-100 p-4">
            <div className="flex items-center justify-between mb-4">
              <h3 className="text-sm font-semibold text-gray-900">Cobros Vencidos</h3>
              <span className="text-[10px] font-medium text-red-500 bg-red-50 px-2 py-0.5 rounded-full">
                {cobrosPendientes.length} pendientes
              </span>
            </div>
            {isLoading ? (
              <div className="space-y-2">
                {Array(5).fill(0).map((_, i) => (
                  <div key={i} className="h-12 bg-gray-100 rounded-lg animate-pulse"></div>
                ))}
              </div>
            ) : (
              <div className="space-y-2">
                {cobrosPendientes.map((cobro, index) => (
                  <div key={index} className="flex items-center justify-between p-2 rounded-lg hover:bg-gray-50 transition-colors">
                    <div className="flex-1 min-w-0">
                      <p className="text-xs font-medium text-gray-900 truncate">{cobro.alumno}</p>
                      <p className="text-[10px] text-gray-500">{cobro.curso} · Venc. {cobro.vencimiento}</p>
                    </div>
                    <div className="text-right">
                      <p className="text-xs font-semibold text-gray-900">{formatCurrency(cobro.monto)}</p>
                      <p className="text-[10px] text-red-500 font-medium">+{cobro.dias_vencido} días</p>
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
