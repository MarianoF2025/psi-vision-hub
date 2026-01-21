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
  Users,
  Heart,
  MessageCircle,
  TrendingUp,
  TrendingDown,
  Calendar,
  Award,
  Filter,
  X,
  ChevronDown,
  Sparkles,
  AlertTriangle,
  Bot,
  ArrowUpRight,
  ArrowDownRight,
  Eye,
  BookOpen,
  Video,
  UserPlus
} from 'lucide-react';

// ============================================
// TIPOS
// ============================================

interface MetricasComunidad {
  miembros_totales: number;
  miembros_activos: number;
  miembros_nuevos: number;
  tasa_engagement: number;
  posts_mes: number;
  comentarios_mes: number;
  eventos_mes: number;
  conversion_psi: number;
}

interface ContenidoTop {
  titulo: string;
  tipo: string;
  vistas: number;
  likes: number;
  comentarios: number;
}

interface EventoLC {
  nombre: string;
  fecha: string;
  asistentes: number;
  capacidad: number;
}

interface TendenciaComunidad {
  periodo: string;
  miembros: number;
  activos: number;
  posts: number;
}

// ============================================
// DATOS MOCK
// ============================================

const metricasMock: MetricasComunidad = {
  miembros_totales: 4850,
  miembros_activos: 1245,
  miembros_nuevos: 156,
  tasa_engagement: 25.7,
  posts_mes: 89,
  comentarios_mes: 534,
  eventos_mes: 8,
  conversion_psi: 3.2,
};

const contenidoTopMock: ContenidoTop[] = [
  { titulo: 'Técnicas de regulación emocional', tipo: 'video', vistas: 1250, likes: 89, comentarios: 34 },
  { titulo: 'Caso clínico: TEA en adultos', tipo: 'post', vistas: 980, likes: 76, comentarios: 45 },
  { titulo: 'Herramientas para AT', tipo: 'documento', vistas: 856, likes: 62, comentarios: 23 },
  { titulo: 'Live: Preguntas y respuestas', tipo: 'video', vistas: 745, likes: 58, comentarios: 89 },
  { titulo: 'Recursos de autocuidado', tipo: 'post', vistas: 623, likes: 45, comentarios: 18 },
];

const eventosMock: EventoLC[] = [
  { nombre: 'Workshop: Mindfulness aplicado', fecha: '2025-01-25', asistentes: 45, capacidad: 50 },
  { nombre: 'Supervisión grupal AT', fecha: '2025-01-28', asistentes: 28, capacidad: 30 },
  { nombre: 'Charla: Trauma complejo', fecha: '2025-02-01', asistentes: 62, capacidad: 100 },
  { nombre: 'Networking profesional', fecha: '2025-02-05', asistentes: 35, capacidad: 40 },
];

const tendenciasMock: TendenciaComunidad[] = [
  { periodo: '2025-07', miembros: 3200, activos: 850, posts: 52 },
  { periodo: '2025-08', miembros: 3450, activos: 920, posts: 61 },
  { periodo: '2025-09', miembros: 3800, activos: 1050, posts: 78 },
  { periodo: '2025-10', miembros: 4100, activos: 1100, posts: 72 },
  { periodo: '2025-11', miembros: 4500, activos: 1180, posts: 85 },
  { periodo: '2025-12', miembros: 4850, activos: 1245, posts: 89 },
];

const tipoContenidoMock = [
  { tipo: 'Videos', cantidad: 35, color: '#e63946' },
  { tipo: 'Posts', cantidad: 42, color: '#3b82f6' },
  { tipo: 'Documentos', cantidad: 12, color: '#10b981' },
];

// ============================================
// UTILIDADES
// ============================================

const formatNumber = (value: number) => {
  return new Intl.NumberFormat('es-AR').format(value);
};

const getTipoIcon = (tipo: string) => {
  switch (tipo) {
    case 'video': return Video;
    case 'post': return MessageCircle;
    case 'documento': return BookOpen;
    default: return BookOpen;
  }
};

// ============================================
// COMPONENTE PRINCIPAL
// ============================================

export default function ComunidadPage() {
  const [periodo, setPeriodo] = useState('mes');
  const [isLoading, setIsLoading] = useState(true);
  const [showFilters, setShowFilters] = useState(false);

  // Filtros
  const [fechaDesde, setFechaDesde] = useState<string>('');
  const [fechaHasta, setFechaHasta] = useState<string>('');
  const [tipoContenido, setTipoContenido] = useState<string>('');

  // Data
  const [metricas, setMetricas] = useState<MetricasComunidad | null>(null);
  const [contenidoTop, setContenidoTop] = useState<ContenidoTop[]>([]);
  const [eventos, setEventos] = useState<EventoLC[]>([]);
  const [tendencias, setTendencias] = useState<TendenciaComunidad[]>([]);

  const loadData = useCallback(async () => {
    setIsLoading(true);
    await new Promise(resolve => setTimeout(resolve, 800));
    
    setMetricas(metricasMock);
    setContenidoTop(contenidoTopMock);
    setEventos(eventosMock);
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
    setTipoContenido('');
  };

  const hasActiveFilters = fechaDesde || fechaHasta || tipoContenido;

  const kpis = metricas ? [
    {
      label: 'Miembros Totales',
      value: formatNumber(metricas.miembros_totales),
      delta: 8,
      icon: Users,
      color: '#8b5cf6',
      bgColor: '#8b5cf615'
    },
    {
      label: 'Miembros Activos',
      value: formatNumber(metricas.miembros_activos),
      delta: 12,
      icon: UserPlus,
      color: '#10b981',
      bgColor: '#10b98115'
    },
    {
      label: 'Engagement',
      value: `${metricas.tasa_engagement}%`,
      delta: 5,
      icon: Heart,
      color: '#e63946',
      bgColor: '#e6394615'
    },
    {
      label: 'Posts del Mes',
      value: formatNumber(metricas.posts_mes),
      delta: 15,
      icon: MessageCircle,
      color: '#3b82f6',
      bgColor: '#3b82f615'
    },
    {
      label: 'Eventos del Mes',
      value: formatNumber(metricas.eventos_mes),
      delta: 3,
      icon: Calendar,
      color: '#f59e0b',
      bgColor: '#f59e0b15'
    },
    {
      label: 'Conversión a PSI',
      value: `${metricas.conversion_psi}%`,
      delta: 18,
      icon: TrendingUp,
      color: '#06b6d4',
      bgColor: '#06b6d415'
    }
  ] : [];

  return (
    <div className="min-h-screen bg-gray-50/50">
      <DashboardHeader
        titulo="Comunidad"
        subtitulo="Métricas de La Comunidad LC"
        icono={<Users className="w-5 h-5 text-white" />}
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
                  <label className="block text-[10px] font-medium text-gray-500 uppercase mb-1">Tipo Contenido</label>
                  <select value={tipoContenido} onChange={(e) => setTipoContenido(e.target.value)} className="w-full px-2 py-1.5 text-xs border border-gray-200 rounded-lg focus:ring-2 focus:ring-[#e63946] focus:border-transparent">
                    <option value="">Todos</option>
                    <option value="video">Videos</option>
                    <option value="post">Posts</option>
                    <option value="documento">Documentos</option>
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
          {/* Gráfico de crecimiento */}
          <div className="lg:col-span-2 bg-white rounded-xl shadow-sm border border-gray-100 p-4">
            <h3 className="text-sm font-semibold text-gray-900 mb-4">Crecimiento de la Comunidad</h3>
            {isLoading ? (
              <div className="h-64 bg-gray-100 rounded-lg animate-pulse"></div>
            ) : (
              <div className="h-64">
                <ResponsiveContainer width="100%" height="100%">
                  <AreaChart data={tendencias}>
                    <defs>
                      <linearGradient id="colorMiembros" x1="0" y1="0" x2="0" y2="1">
                        <stop offset="5%" stopColor="#8b5cf6" stopOpacity={0.3}/>
                        <stop offset="95%" stopColor="#8b5cf6" stopOpacity={0}/>
                      </linearGradient>
                      <linearGradient id="colorActivos" x1="0" y1="0" x2="0" y2="1">
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
                    <YAxis tick={{ fontSize: 10 }} />
                    <Tooltip contentStyle={{ fontSize: 12, borderRadius: 8 }} formatter={(value: number, name: string) => [formatNumber(value), name === 'miembros' ? 'Miembros' : 'Activos']} />
                    <Area type="monotone" dataKey="miembros" stroke="#8b5cf6" fillOpacity={1} fill="url(#colorMiembros)" strokeWidth={2} />
                    <Area type="monotone" dataKey="activos" stroke="#10b981" fillOpacity={1} fill="url(#colorActivos)" strokeWidth={2} />
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
                    <p className="text-xs font-medium text-amber-400">Engagement bajo</p>
                    <p className="text-[11px] text-gray-300 mt-1">
                      74% de miembros inactivos este mes. Considerar campaña de reactivación.
                    </p>
                  </div>
                </div>
              </div>

              <div className="p-3 bg-white/10 rounded-lg border border-white/10">
                <div className="flex items-start gap-2">
                  <TrendingUp className="w-4 h-4 text-emerald-400 mt-0.5 flex-shrink-0" />
                  <div>
                    <p className="text-xs font-medium text-emerald-400">Contenido estrella</p>
                    <p className="text-[11px] text-gray-300 mt-1">
                      Videos tienen 3x más engagement que posts. Priorizar formato audiovisual.
                    </p>
                  </div>
                </div>
              </div>

              <div className="p-3 bg-white/10 rounded-lg border border-white/10">
                <div className="flex items-start gap-2">
                  <Bot className="w-4 h-4 text-blue-400 mt-0.5 flex-shrink-0" />
                  <div>
                    <p className="text-xs font-medium text-blue-400">Oportunidad</p>
                    <p className="text-[11px] text-gray-300 mt-1">
                      156 miembros nuevos sin interacción. Email de bienvenida personalizado aumenta conversión 40%.
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

        {/* Contenido top y Eventos */}
        <div className="grid grid-cols-1 lg:grid-cols-2 gap-4">
          {/* Contenido más visto */}
          <div className="bg-white rounded-xl shadow-sm border border-gray-100 p-4">
            <div className="flex items-center justify-between mb-4">
              <h3 className="text-sm font-semibold text-gray-900">Contenido Más Visto</h3>
              <div className="flex gap-1">
                {tipoContenidoMock.map((t) => (
                  <span key={t.tipo} className="text-[9px] px-1.5 py-0.5 rounded" style={{ backgroundColor: `${t.color}15`, color: t.color }}>
                    {t.cantidad} {t.tipo.toLowerCase()}
                  </span>
                ))}
              </div>
            </div>
            {isLoading ? (
              <div className="space-y-2">
                {Array(5).fill(0).map((_, i) => (
                  <div key={i} className="h-14 bg-gray-100 rounded-lg animate-pulse"></div>
                ))}
              </div>
            ) : (
              <div className="space-y-2">
                {contenidoTop.map((item, index) => {
                  const TipoIcon = getTipoIcon(item.tipo);
                  return (
                    <div key={index} className="flex items-center gap-3 p-2 rounded-lg hover:bg-gray-50 transition-colors">
                      <span className="text-xs font-bold text-gray-400 w-5">{index + 1}</span>
                      <div className="w-8 h-8 rounded-lg bg-gray-100 flex items-center justify-center">
                        <TipoIcon className="w-4 h-4 text-gray-500" />
                      </div>
                      <div className="flex-1 min-w-0">
                        <p className="text-xs font-medium text-gray-900 truncate">{item.titulo}</p>
                        <div className="flex items-center gap-3 mt-0.5">
                          <span className="text-[10px] text-gray-500 flex items-center gap-1">
                            <Eye className="w-3 h-3" />{formatNumber(item.vistas)}
                          </span>
                          <span className="text-[10px] text-gray-500 flex items-center gap-1">
                            <Heart className="w-3 h-3" />{item.likes}
                          </span>
                          <span className="text-[10px] text-gray-500 flex items-center gap-1">
                            <MessageCircle className="w-3 h-3" />{item.comentarios}
                          </span>
                        </div>
                      </div>
                    </div>
                  );
                })}
              </div>
            )}
          </div>

          {/* Próximos eventos */}
          <div className="bg-white rounded-xl shadow-sm border border-gray-100 p-4">
            <div className="flex items-center justify-between mb-4">
              <h3 className="text-sm font-semibold text-gray-900">Próximos Eventos</h3>
              <span className="text-[10px] font-medium text-[#e63946] bg-red-50 px-2 py-0.5 rounded-full">
                {eventos.length} programados
              </span>
            </div>
            {isLoading ? (
              <div className="space-y-2">
                {Array(4).fill(0).map((_, i) => (
                  <div key={i} className="h-16 bg-gray-100 rounded-lg animate-pulse"></div>
                ))}
              </div>
            ) : (
              <div className="space-y-2">
                {eventos.map((evento, index) => {
                  const ocupacion = (evento.asistentes / evento.capacidad) * 100;
                  return (
                    <div key={index} className="p-3 rounded-lg border border-gray-100 hover:border-gray-200 transition-colors">
                      <div className="flex items-start justify-between">
                        <div className="flex-1 min-w-0">
                          <p className="text-xs font-medium text-gray-900">{evento.nombre}</p>
                          <p className="text-[10px] text-gray-500 mt-0.5 flex items-center gap-1">
                            <Calendar className="w-3 h-3" />
                            {evento.fecha}
                          </p>
                        </div>
                        <div className="text-right">
                          <p className="text-xs font-semibold text-gray-900">{evento.asistentes}/{evento.capacidad}</p>
                          <p className="text-[10px] text-gray-500">inscriptos</p>
                        </div>
                      </div>
                      <div className="mt-2">
                        <div className="h-1.5 bg-gray-100 rounded-full overflow-hidden">
                          <div 
                            className="h-full rounded-full transition-all" 
                            style={{ 
                              width: `${ocupacion}%`,
                              backgroundColor: ocupacion > 90 ? '#ef4444' : ocupacion > 70 ? '#f59e0b' : '#10b981'
                            }}
                          ></div>
                        </div>
                      </div>
                    </div>
                  );
                })}
              </div>
            )}
          </div>
        </div>
      </div>
    </div>
  );
}
