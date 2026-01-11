'use client';

import { useState, useEffect, useMemo } from 'react';
import { useRouter } from 'next/navigation';
import { Plus, Settings, BarChart3, BookOpen, RefreshCw, Calendar, ChevronDown, Search, Filter } from 'lucide-react';

interface Curso {
  id: string;
  codigo: string;
  nombre: string;
  activo: boolean;
  total_leads?: number;
  ctr_promedio?: number;
  leads_este_mes?: number;
}

interface DashboardStats {
  leads_este_mes: number;
  leads_ctwa: number;
  leads_directos: number;
  interacciones_este_mes: number;
  ctr_promedio: number;
  cursos_activos: number;
  anuncios_activos: number;
}

const PERIODOS = [
  { value: 'hoy', label: 'Hoy' },
  { value: 'ayer', label: 'Ayer' },
  { value: 'semana', label: 'Esta semana' },
  { value: 'mes', label: 'Este mes' },
  { value: 'mes_anterior', label: 'Mes anterior' },
  { value: 'trimestre', label: 'Últimos 3 meses' },
  { value: 'todo', label: 'Todo el tiempo' },
  { value: 'custom', label: 'Personalizado' },
];

const FILTROS_ESTADO = [
  { value: 'todos', label: 'Todos' },
  { value: 'activos', label: 'Solo activos' },
  { value: 'inactivos', label: 'Solo inactivos' },
];

export default function AutomatizacionesPage() {
  const router = useRouter();
  const [cursos, setCursos] = useState<Curso[]>([]);
  const [stats, setStats] = useState<DashboardStats | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  // Filtros de fecha
  const [periodo, setPeriodo] = useState('mes');
  const [fechaDesde, setFechaDesde] = useState('');
  const [fechaHasta, setFechaHasta] = useState('');
  const [showPeriodoDropdown, setShowPeriodoDropdown] = useState(false);

  // Filtros de búsqueda y estado
  const [busqueda, setBusqueda] = useState('');
  const [filtroEstado, setFiltroEstado] = useState('todos');

  const API_URL = '/api/automatizaciones';

  useEffect(() => {
    cargarDatos();
  }, [periodo, fechaDesde, fechaHasta]);

  // Filtrar cursos según búsqueda y estado
  const cursosFiltrados = useMemo(() => {
    return cursos.filter(curso => {
      // Filtro por búsqueda (código o nombre)
      const matchBusqueda = busqueda === '' || 
        curso.codigo.toLowerCase().includes(busqueda.toLowerCase()) ||
        curso.nombre.toLowerCase().includes(busqueda.toLowerCase());
      
      // Filtro por estado
      const matchEstado = filtroEstado === 'todos' ||
        (filtroEstado === 'activos' && curso.activo) ||
        (filtroEstado === 'inactivos' && !curso.activo);
      
      return matchBusqueda && matchEstado;
    });
  }, [cursos, busqueda, filtroEstado]);

  function buildQueryParams(): string {
    if (periodo === 'custom' && fechaDesde) {
      let params = `desde=${fechaDesde}`;
      if (fechaHasta) params += `&hasta=${fechaHasta}`;
      return params;
    }
    return `periodo=${periodo}`;
  }

  async function cargarDatos() {
    setLoading(true);
    setError(null);
    try {
      const queryParams = buildQueryParams();

      const statsRes = await fetch(`${API_URL}?path=stats/dashboard&${queryParams}`);
      const statsData = await statsRes.json();
      if (statsData.success) setStats(statsData.data);

      const cursosRes = await fetch(`${API_URL}?path=stats/cursos&${queryParams}`);
      const cursosData = await cursosRes.json();
      if (cursosData.success) setCursos(cursosData.data);
    } catch (err) {
      setError('Error conectando con el servicio de automatizaciones');
      console.error(err);
    } finally {
      setLoading(false);
    }
  }

  async function toggleCurso(id: string, e: React.MouseEvent) {
    e.stopPropagation();
    try {
      const res = await fetch(`${API_URL}?path=cursos/${id}/toggle`, { method: 'PATCH' });
      const data = await res.json();
      if (data.success) {
        setCursos(cursos.map(c => c.id === id ? { ...c, activo: data.data.activo } : c));
      }
    } catch (err) {
      console.error('Error toggling curso:', err);
    }
  }

  const periodoActual = PERIODOS.find(p => p.value === periodo);
  const periodoLabel = periodo === 'custom' && fechaDesde
    ? `${fechaDesde}${fechaHasta ? ` - ${fechaHasta}` : ''}`
    : periodoActual?.label || 'Este mes';

  return (
    <div className="p-6 max-w-7xl mx-auto h-full overflow-y-auto">
      {/* Header */}
      <div className="flex items-center justify-between mb-6">
        <div>
          <h1 className="text-2xl font-bold text-gray-900">Automatizaciones CTWA</h1>
          <p className="text-gray-500">Menús interactivos para leads de Meta Ads y entrada directa</p>
        </div>
        <button
          onClick={() => router.push('/crm/automatizaciones/cursos/nuevo')}
          className="flex items-center gap-2 bg-blue-600 text-white px-4 py-2 rounded-lg hover:bg-blue-700 transition"
        >
          <Plus className="w-5 h-5" />
          Nuevo Curso
        </button>
      </div>

      {error && (
        <div className="bg-red-50 border border-red-200 text-red-700 px-4 py-3 rounded-lg mb-6">
          {error}
        </div>
      )}

      {/* Filtro de período */}
      <div className="bg-white rounded-xl shadow-sm border p-4 mb-6">
        <div className="flex items-center gap-4 flex-wrap">
          <div className="flex items-center gap-2 text-gray-600">
            <Calendar className="w-5 h-5" />
            <span className="font-medium">Período:</span>
          </div>

          <div className="relative">
            <button
              onClick={() => setShowPeriodoDropdown(!showPeriodoDropdown)}
              className="flex items-center gap-2 px-4 py-2 border rounded-lg hover:bg-gray-50 min-w-[180px] justify-between"
            >
              <span>{periodoLabel}</span>
              <ChevronDown className={`w-4 h-4 transition-transform ${showPeriodoDropdown ? 'rotate-180' : ''}`} />
            </button>

            {showPeriodoDropdown && (
              <div className="absolute top-full left-0 mt-1 bg-white border rounded-lg shadow-lg z-20 min-w-[180px]">
                {PERIODOS.map(p => (
                  <button
                    key={p.value}
                    onClick={() => {
                      setPeriodo(p.value);
                      if (p.value !== 'custom') {
                        setFechaDesde('');
                        setFechaHasta('');
                      }
                      setShowPeriodoDropdown(false);
                    }}
                    className={`w-full text-left px-4 py-2 hover:bg-gray-50 first:rounded-t-lg last:rounded-b-lg ${
                      periodo === p.value ? 'bg-blue-50 text-blue-600' : ''
                    }`}
                  >
                    {p.label}
                  </button>
                ))}
              </div>
            )}
          </div>

          {periodo === 'custom' && (
            <>
              <input
                type="date"
                value={fechaDesde}
                onChange={(e) => setFechaDesde(e.target.value)}
                className="px-3 py-2 border rounded-lg"
              />
              <span className="text-gray-400">hasta</span>
              <input
                type="date"
                value={fechaHasta}
                onChange={(e) => setFechaHasta(e.target.value)}
                className="px-3 py-2 border rounded-lg"
              />
            </>
          )}

          <button
            onClick={cargarDatos}
            disabled={loading}
            className="flex items-center gap-2 px-3 py-2 text-gray-600 hover:text-gray-900 hover:bg-gray-100 rounded-lg"
          >
            <RefreshCw className={`w-4 h-4 ${loading ? 'animate-spin' : ''}`} />
          </button>
        </div>
      </div>

      {/* Stats Cards */}
      {loading ? (
        <div className="flex items-center justify-center py-12">
          <RefreshCw className="w-8 h-8 animate-spin text-blue-500" />
        </div>
      ) : (
        <>
          {stats && (
            <div className="grid grid-cols-2 md:grid-cols-4 lg:grid-cols-7 gap-3 mb-8">
              <div className="bg-white rounded-xl shadow-sm border p-4">
                <div className="text-3xl font-bold text-blue-600">{stats.leads_este_mes}</div>
                <div className="text-sm text-gray-500">Leads</div>
              </div>
              <div className="bg-gradient-to-br from-orange-50 to-white rounded-xl shadow-sm border p-4">
                <div className="text-3xl font-bold text-orange-600">{stats.leads_ctwa || 0}</div>
                <div className="text-sm text-gray-500">📢 CTWA (Ads)</div>
              </div>
              <div className="bg-gradient-to-br from-teal-50 to-white rounded-xl shadow-sm border p-4">
                <div className="text-3xl font-bold text-teal-600">{stats.leads_directos || 0}</div>
                <div className="text-sm text-gray-500">🌐 Directos</div>
              </div>
              <div className="bg-white rounded-xl shadow-sm border p-4">
                <div className="text-3xl font-bold text-green-600">{stats.ctr_promedio}%</div>
                <div className="text-sm text-gray-500">Engagement</div>
              </div>
              <div className="bg-white rounded-xl shadow-sm border p-4">
                <div className="text-3xl font-bold text-purple-600">{stats.interacciones_este_mes}</div>
                <div className="text-sm text-gray-500">Interacciones</div>
              </div>
              <div className="bg-white rounded-xl shadow-sm border p-4">
                <div className="text-3xl font-bold text-indigo-600">{stats.cursos_activos}</div>
                <div className="text-sm text-gray-500">Cursos</div>
              </div>
              <div className="bg-white rounded-xl shadow-sm border p-4">
                <div className="text-3xl font-bold text-pink-600">{stats.anuncios_activos}</div>
                <div className="text-sm text-gray-500">Anuncios</div>
              </div>
            </div>
          )}

          {/* Cursos Section */}
          <div className="bg-white rounded-xl shadow-sm border">
            {/* Header con buscador y filtros */}
            <div className="px-6 py-4 border-b">
              <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
                <h2 className="text-lg font-semibold flex items-center gap-2">
                  <BookOpen className="w-5 h-5" />
                  Cursos
                  <span className="text-sm font-normal text-gray-500">
                    ({cursosFiltrados.length} de {cursos.length})
                  </span>
                </h2>
                
                <div className="flex items-center gap-3 flex-wrap">
                  {/* Buscador */}
                  <div className="relative">
                    <Search className="w-4 h-4 absolute left-3 top-1/2 -translate-y-1/2 text-gray-400" />
                    <input
                      type="text"
                      placeholder="Buscar curso..."
                      value={busqueda}
                      onChange={(e) => setBusqueda(e.target.value)}
                      className="pl-9 pr-4 py-2 border rounded-lg text-sm w-48 focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-transparent"
                    />
                    {busqueda && (
                      <button
                        onClick={() => setBusqueda('')}
                        className="absolute right-3 top-1/2 -translate-y-1/2 text-gray-400 hover:text-gray-600"
                      >
                        ×
                      </button>
                    )}
                  </div>

                  {/* Filtro de estado */}
                  <div className="flex items-center gap-1 bg-gray-100 rounded-lg p-1">
                    {FILTROS_ESTADO.map(f => (
                      <button
                        key={f.value}
                        onClick={() => setFiltroEstado(f.value)}
                        className={`px-3 py-1.5 text-sm rounded-md transition ${
                          filtroEstado === f.value 
                            ? 'bg-white text-blue-600 shadow-sm' 
                            : 'text-gray-600 hover:text-gray-900'
                        }`}
                      >
                        {f.label}
                      </button>
                    ))}
                  </div>

                  <button onClick={cargarDatos} className="text-gray-500 hover:text-gray-700 p-2">
                    <RefreshCw className="w-5 h-5" />
                  </button>
                </div>
              </div>
            </div>

            {/* Grid de Cursos */}
            {cursos.length === 0 ? (
              <div className="p-8 text-center text-gray-500">
                No hay cursos configurados. Creá uno nuevo para empezar.
              </div>
            ) : cursosFiltrados.length === 0 ? (
              <div className="p-8 text-center text-gray-500">
                <Search className="w-12 h-12 mx-auto mb-3 text-gray-300" />
                <p>No se encontraron cursos con ese criterio</p>
                <button 
                  onClick={() => { setBusqueda(''); setFiltroEstado('todos'); }}
                  className="text-blue-600 hover:underline mt-2"
                >
                  Limpiar filtros
                </button>
              </div>
            ) : (
              <div className="p-4 grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4">
                {cursosFiltrados.map(curso => (
                  <div 
                    key={curso.id} 
                    onClick={() => router.push(`/crm/automatizaciones/cursos/${curso.id}`)}
                    className={`p-4 rounded-xl border-2 transition cursor-pointer hover:shadow-md ${
                      curso.activo 
                        ? 'border-gray-200 hover:border-blue-300 bg-white' 
                        : 'border-gray-100 bg-gray-50 opacity-75'
                    }`}
                  >
                    {/* Header card */}
                    <div className="flex items-start justify-between mb-3">
                      <div className={`px-3 py-1.5 rounded-lg text-white font-bold text-sm ${
                        curso.activo ? 'bg-blue-500' : 'bg-gray-400'
                      }`}>
                        {curso.codigo}
                      </div>
                      <button
                        onClick={(e) => toggleCurso(curso.id, e)}
                        className={`relative inline-flex h-6 w-11 items-center rounded-full transition-colors ${
                          curso.activo ? 'bg-green-500' : 'bg-gray-300'
                        }`}
                      >
                        <span className={`inline-block h-4 w-4 transform rounded-full bg-white transition-transform ${
                          curso.activo ? 'translate-x-6' : 'translate-x-1'
                        }`} />
                      </button>
                    </div>

                    {/* Nombre */}
                    <h3 className="font-medium text-gray-900 mb-3 line-clamp-2 min-h-[48px]">
                      {curso.nombre}
                    </h3>

                    {/* Stats */}
                    <div className="flex items-center justify-between text-sm">
                      <div className="flex items-center gap-4">
                        <span className="text-gray-600">
                          <span className="font-semibold text-blue-600">{curso.leads_este_mes || 0}</span> leads
                        </span>
                        <span className="text-gray-600">
                          <span className="font-semibold text-green-600">{curso.ctr_promedio || 0}%</span> CTR
                        </span>
                      </div>
                    </div>

                    {/* Actions */}
                    <div className="flex items-center gap-2 mt-4 pt-3 border-t">
                      <button
                        onClick={(e) => {
                          e.stopPropagation();
                          router.push(`/crm/automatizaciones/cursos/${curso.id}`);
                        }}
                        className="flex-1 flex items-center justify-center gap-1 px-3 py-2 text-sm text-gray-600 hover:text-blue-600 hover:bg-blue-50 rounded-lg transition"
                      >
                        <Settings className="w-4 h-4" />
                        Configurar
                      </button>
                      <button
                        onClick={(e) => {
                          e.stopPropagation();
                          router.push(`/crm/automatizaciones/cursos/${curso.id}?tab=stats`);
                        }}
                        className="flex-1 flex items-center justify-center gap-1 px-3 py-2 text-sm text-gray-600 hover:text-green-600 hover:bg-green-50 rounded-lg transition"
                      >
                        <BarChart3 className="w-4 h-4" />
                        Stats
                      </button>
                    </div>
                  </div>
                ))}
              </div>
            )}
          </div>
        </>
      )}
    </div>
  );
}
