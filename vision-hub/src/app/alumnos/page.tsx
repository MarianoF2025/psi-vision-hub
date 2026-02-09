'use client';

import { useState, useEffect, useCallback } from 'react';
import { createClient } from '@supabase/supabase-js';
import DashboardHeader from '@/components/dashboard/DashboardHeader';
import { parsePeriodo, getAgrupacion, PERIODO_DEFAULT } from '@/lib/periodo';
import {
  AreaChart,
  Area,
  XAxis,
  YAxis,
  CartesianGrid,
  Tooltip,
  ResponsiveContainer,
} from 'recharts';
import {
  GraduationCap,
  Users,
  UserCheck,
  UserX,
  TrendingUp,
  TrendingDown,
  DollarSign,
  AlertTriangle,
  BookOpen,
  Filter,
  X,
  ChevronDown,
  Sparkles,
  Bot
} from 'lucide-react';

const supabase = createClient(
  process.env.NEXT_PUBLIC_SUPABASE_URL!,
  process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!
);

interface Metricas {
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
  activos: number;
  finalizados: number;
  bajas: number;
  tasa_abandono: number;
  tasa_finalizacion: number;
  ingresos: number;
  ticket_promedio: number;
}

interface Tendencia {
  periodo: string;
  inscripciones: number;
  activos: number;
  finalizados: number;
  bajas: number;
  ingresos: number;
}

const formatCurrency = (value: number) => {
  if (value >= 1000000) return `$${(value / 1000000).toFixed(1)}M`;
  if (value >= 1000) return `$${(value / 1000).toFixed(0)}K`;
  return `$${value.toFixed(0)}`;
};

const formatNumber = (value: number) => {
  return new Intl.NumberFormat('es-AR').format(value);
};

export default function AlumnosPage() {
  const [periodo, setPeriodo] = useState(PERIODO_DEFAULT);
  const [isLoading, setIsLoading] = useState(true);
  const [showFilters, setShowFilters] = useState(false);

  const [fechaDesde, setFechaDesde] = useState<string>('');
  const [fechaHasta, setFechaHasta] = useState<string>('');
  const [cursoSeleccionado, setCursoSeleccionado] = useState<string>('');
  const [estadoSeleccionado, setEstadoSeleccionado] = useState<string>('');

  const [metricas, setMetricas] = useState<Metricas | null>(null);
  const [cursosRanking, setCursosRanking] = useState<CursoRanking[]>([]);
  const [tendencias, setTendencias] = useState<Tendencia[]>([]);
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
      const { data: metricasData } = await supabase.rpc('get_alumnos_metricas', {
        p_fecha_desde: desde,
        p_fecha_hasta: hasta,
        p_curso_codigo: cursoSeleccionado || null,
        p_estado: estadoSeleccionado || null
      });
      if (metricasData) setMetricas(metricasData);

      const { data: rankingData } = await supabase.rpc('get_cursos_ranking', {
        p_fecha_desde: desde,
        p_fecha_hasta: hasta,
        p_limite: 10
      });
      if (rankingData) setCursosRanking(rankingData);

      const { data: tendenciasData } = await supabase.rpc('get_alumnos_tendencias', {
        p_fecha_desde: desde,
        p_fecha_hasta: hasta,
        p_curso_codigo: cursoSeleccionado || null,
        p_agrupar_por: getAgrupacion(periodo)
      });
      if (tendenciasData) setTendencias(tendenciasData);

    } catch (error) {
      console.error('Error cargando datos:', error);
    } finally {
      setIsLoading(false);
    }
  }, [getFechasPeriodo, cursoSeleccionado, estadoSeleccionado, periodo]);

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
    setEstadoSeleccionado('');
  };

  const hasActiveFilters = fechaDesde || fechaHasta || cursoSeleccionado || estadoSeleccionado;

  const kpis = metricas ? [
    {
      label: 'Alumnos Activos',
      value: formatNumber(metricas.activos),
      icon: Users,
      color: '#10b981',
      bgColor: '#10b98115'
    },
    {
      label: 'Egresados',
      value: formatNumber(metricas.finalizados),
      icon: UserCheck,
      color: '#3b82f6',
      bgColor: '#3b82f615'
    },
    {
      label: 'Bajas',
      value: formatNumber(metricas.bajas),
      icon: UserX,
      color: '#ef4444',
      bgColor: '#ef444415'
    },
    {
      label: 'Tasa Finalización',
      value: `${metricas.tasa_finalizacion}%`,
      icon: metricas.tasa_finalizacion >= 50 ? TrendingUp : TrendingDown,
      color: metricas.tasa_finalizacion >= 50 ? '#10b981' : '#f59e0b',
      bgColor: metricas.tasa_finalizacion >= 50 ? '#10b98115' : '#f59e0b15'
    },
    {
      label: 'Ingresos',
      value: formatCurrency(metricas.ingresos_totales),
      icon: DollarSign,
      color: '#8b5cf6',
      bgColor: '#8b5cf615'
    },
    {
      label: 'Ticket Promedio',
      value: formatCurrency(metricas.ticket_promedio),
      icon: BookOpen,
      color: '#06b6d4',
      bgColor: '#06b6d415'
    }
  ] : [];

  const getBarColor = (tasa: number) => {
    if (tasa >= 55) return '#10b981';
    if (tasa >= 45) return '#f59e0b';
    return '#ef4444';
  };

  return (
    <div className="min-h-screen bg-gray-50/50">
      <DashboardHeader
        titulo="Alumnos"
        subtitulo="Seguimiento académico y retención"
        icono={<GraduationCap className="w-5 h-5 text-white" />}
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
                    {cursosList.map((curso) => (
                      <option key={curso.codigo} value={curso.codigo}>{curso.codigo}</option>
                    ))}
                  </select>
                </div>
                <div>
                  <label className="block text-[10px] font-medium text-gray-500 uppercase mb-1">Estado</label>
                  <select
                    value={estadoSeleccionado}
                    onChange={(e) => setEstadoSeleccionado(e.target.value)}
                    className="w-full px-2 py-1.5 text-xs border border-gray-200 rounded-lg focus:ring-2 focus:ring-[#e63946] focus:border-transparent"
                  >
                    <option value="">Todos</option>
                    <option value="activo">Activos</option>
                    <option value="finalizado">Finalizados</option>
                    <option value="baja">Bajas</option>
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
                <div className="flex items-center gap-2 mb-2">
                  <div
                    className="w-8 h-8 sm:w-10 sm:h-10 rounded-lg flex items-center justify-center"
                    style={{ backgroundColor: kpi.bgColor }}
                  >
                    <kpi.icon className="w-4 h-4 sm:w-5 sm:h-5" style={{ color: kpi.color }} />
                  </div>
                </div>
                <p className="text-[10px] sm:text-xs text-gray-500 uppercase tracking-wider">{kpi.label}</p>
                <p className="text-lg sm:text-2xl font-bold text-gray-900 mt-0.5">{kpi.value}</p>
              </div>
            ))
          )}
        </div>

        <div className="grid grid-cols-1 lg:grid-cols-3 gap-4">
          <div className="lg:col-span-2 bg-white rounded-xl shadow-sm border border-gray-100 p-4">
            <h3 className="text-sm font-semibold text-gray-900 mb-4">Tendencia de Inscripciones</h3>
            {isLoading ? (
              <div className="h-64 bg-gray-100 rounded-lg animate-pulse"></div>
            ) : (
              <div className="h-64">
                <ResponsiveContainer width="100%" height="100%">
                  <AreaChart data={tendencias}>
                    <defs>
                      <linearGradient id="colorInscripciones" x1="0" y1="0" x2="0" y2="1">
                        <stop offset="5%" stopColor="#e63946" stopOpacity={0.3}/>
                        <stop offset="95%" stopColor="#e63946" stopOpacity={0}/>
                      </linearGradient>
                      <linearGradient id="colorBajas" x1="0" y1="0" x2="0" y2="1">
                        <stop offset="5%" stopColor="#64748b" stopOpacity={0.3}/>
                        <stop offset="95%" stopColor="#64748b" stopOpacity={0}/>
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
                        name === 'inscripciones' ? 'Inscripciones' :
                        name === 'bajas' ? 'Bajas' :
                        name === 'finalizados' ? 'Finalizados' : name
                      ]}
                      labelFormatter={(label) => {
                        if (label && String(label).includes('-')) {
                          const [año, mes] = String(label).split('-');
                          const meses = ['Enero','Febrero','Marzo','Abril','Mayo','Junio','Julio','Agosto','Septiembre','Octubre','Noviembre','Diciembre'];
                          return `${meses[parseInt(mes) - 1]} ${año}`;
                        }
                        return label;
                      }}
                    />
                    <Area
                      type="monotone"
                      dataKey="inscripciones"
                      stroke="#e63946"
                      fillOpacity={1}
                      fill="url(#colorInscripciones)"
                      strokeWidth={2}
                    />
                    <Area
                      type="monotone"
                      dataKey="bajas"
                      stroke="#64748b"
                      fillOpacity={1}
                      fill="url(#colorBajas)"
                      strokeWidth={2}
                    />
                  </AreaChart>
                </ResponsiveContainer>
              </div>
            )}
          </div>

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
                    <p className="text-xs font-medium text-amber-400">Alerta de Abandono</p>
                    <p className="text-[11px] text-gray-300 mt-1">
                      Biodescodificación tiene 61% de abandono, muy por encima del promedio (54%).
                    </p>
                  </div>
                </div>
              </div>

              <div className="p-3 bg-white/10 rounded-lg border border-white/10">
                <div className="flex items-start gap-2">
                  <TrendingUp className="w-4 h-4 text-emerald-400 mt-0.5 flex-shrink-0" />
                  <div>
                    <p className="text-xs font-medium text-emerald-400">Tendencia Positiva</p>
                    <p className="text-[11px] text-gray-300 mt-1">
                      Los ingresos crecieron 73% vs 2024 mientras las bajas bajaron de 51% a 40%.
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
                      Implementar seguimiento proactivo en las primeras 3 cuotas reduce abandono 25%.
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

        <div className="bg-white rounded-xl shadow-sm border border-gray-100 p-4">
          <h3 className="text-sm font-semibold text-gray-900 mb-4">Ranking de Cursos por Inscripciones</h3>
          {isLoading ? (
            <div className="space-y-2">
              {Array(5).fill(0).map((_, i) => (
                <div key={i} className="h-12 bg-gray-100 rounded-lg animate-pulse"></div>
              ))}
            </div>
          ) : (
            <div className="overflow-x-auto">
              <table className="w-full">
                <thead>
                  <tr className="border-b border-gray-100">
                    <th className="text-left py-2 px-3 text-[10px] font-semibold text-gray-500 uppercase">Curso</th>
                    <th className="text-right py-2 px-3 text-[10px] font-semibold text-gray-500 uppercase">Inscripciones</th>
                    <th className="text-right py-2 px-3 text-[10px] font-semibold text-gray-500 uppercase hidden sm:table-cell">Activos</th>
                    <th className="text-right py-2 px-3 text-[10px] font-semibold text-gray-500 uppercase hidden sm:table-cell">Egresados</th>
                    <th className="text-right py-2 px-3 text-[10px] font-semibold text-gray-500 uppercase">Finalización</th>
                    <th className="text-right py-2 px-3 text-[10px] font-semibold text-gray-500 uppercase hidden lg:table-cell">Ingresos</th>
                  </tr>
                </thead>
                <tbody>
                  {cursosRanking.map((curso, index) => (
                    <tr key={curso.curso_codigo} className="border-b border-gray-50 hover:bg-gray-50/50">
                      <td className="py-2.5 px-3">
                        <div className="flex items-center gap-2">
                          <span className="text-xs font-bold text-gray-400 w-5">{index + 1}</span>
                          <div>
                            <p className="text-xs font-medium text-gray-900">{curso.curso_codigo}</p>
                            <p className="text-[10px] text-gray-500 truncate max-w-[150px] sm:max-w-[200px]">
                              {curso.curso_nombre}
                            </p>
                          </div>
                        </div>
                      </td>
                      <td className="text-right py-2.5 px-3 text-xs font-semibold text-gray-900">
                        {formatNumber(curso.total_inscripciones)}
                      </td>
                      <td className="text-right py-2.5 px-3 text-xs text-gray-600 hidden sm:table-cell">
                        {formatNumber(curso.activos)}
                      </td>
                      <td className="text-right py-2.5 px-3 text-xs text-gray-600 hidden sm:table-cell">
                        {formatNumber(curso.finalizados)}
                      </td>
                      <td className="text-right py-2.5 px-3">
                        <span
                          className="inline-flex items-center px-2 py-0.5 rounded-full text-[10px] font-semibold"
                          style={{
                            backgroundColor: `${getBarColor(curso.tasa_finalizacion)}15`,
                            color: getBarColor(curso.tasa_finalizacion)
                          }}
                        >
                          {curso.tasa_finalizacion}%
                        </span>
                      </td>
                      <td className="text-right py-2.5 px-3 text-xs font-medium text-gray-900 hidden lg:table-cell">
                        {formatCurrency(curso.ingresos)}
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          )}
        </div>
      </div>
    </div>
  );
}
