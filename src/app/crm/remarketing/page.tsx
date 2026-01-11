'use client';

import { useState, useEffect } from 'react';
import { supabase } from '@/lib/supabase';
import { Plus, Search, Send, Clock, Pause, CheckCircle, Edit, Copy, Trash2, MoreVertical, Users, Mail, Eye, MessageSquare, Calendar, PlayCircle, AlertCircle, GraduationCap, Target } from 'lucide-react';
import Link from 'next/link';

interface Campana {
  id: string;
  nombre: string;
  descripcion: string;
  tipo: 'leads' | 'alumnos';
  curso_codigo: string;
  curso_nombre: string;
  template_nombre: string;
  estado: 'borrador' | 'programada' | 'enviando' | 'pausada' | 'finalizada';
  fecha_inicio: string;
  fecha_fin: string;
  programada_para: string | null;
  total_audiencia: number;
  total_excluidos: number;
  total_elegibles: number;
  created_at: string;
}

interface CampanaStats {
  campana_id: string;
  total_enviados: number;
  total_entregados: number;
  total_leidos: number;
  total_respondidos: number;
  total_fallidos: number;
}

interface CampanaConStats extends Campana {
  stats: CampanaStats | null;
}

const ESTADO_CONFIG: Record<string, { color: string; bg: string; icon: React.ReactNode; label: string }> = {
  borrador: { color: 'text-slate-600', bg: 'bg-slate-100', icon: <Edit size={14} />, label: 'Borrador' },
  programada: { color: 'text-blue-600', bg: 'bg-blue-100', icon: <Clock size={14} />, label: 'Programada' },
  enviando: { color: 'text-amber-600', bg: 'bg-amber-100', icon: <Send size={14} />, label: 'Enviando' },
  pausada: { color: 'text-orange-600', bg: 'bg-orange-100', icon: <Pause size={14} />, label: 'Pausada' },
  finalizada: { color: 'text-green-600', bg: 'bg-green-100', icon: <CheckCircle size={14} />, label: 'Finalizada' },
};

type TabTipo = 'leads' | 'alumnos';

export default function RemarketingPage() {
  const [campanas, setCampanas] = useState<CampanaConStats[]>([]);
  const [loading, setLoading] = useState(true);
  const [busqueda, setBusqueda] = useState('');
  const [menuAbierto, setMenuAbierto] = useState<string | null>(null);
  const [tabActivo, setTabActivo] = useState<TabTipo>('leads');

  useEffect(() => {
    cargarCampanas();
  }, []);

  const cargarCampanas = async () => {
    const { data: campanasData, error: campanasError } = await supabase
      .from('remarketing_campanas')
      .select('*')
      .order('created_at', { ascending: false });

    if (campanasError) {
      console.error('Error cargando campañas:', campanasError);
      setLoading(false);
      return;
    }

    const { data: statsData, error: statsError } = await supabase
      .rpc('get_remarketing_stats');

    if (statsError) {
      console.error('Error cargando stats:', statsError);
    }

    const campanasConStats: CampanaConStats[] = (campanasData || []).map(campana => ({
      ...campana,
      tipo: campana.tipo || 'leads',
      stats: statsData?.find((s: CampanaStats) => s.campana_id === campana.id) || null
    }));

    setCampanas(campanasConStats);
    setLoading(false);
  };

  const duplicarCampana = async (campana: CampanaConStats) => {
    const { data, error } = await supabase
      .from('remarketing_campanas')
      .insert({
        nombre: `${campana.nombre} (copia)`,
        descripcion: campana.descripcion,
        tipo: campana.tipo,
        curso_codigo: campana.curso_codigo,
        curso_nombre: campana.curso_nombre,
        template_nombre: campana.template_nombre,
        audiencia_filtros: null,
        estado: 'borrador',
        fecha_inicio: null,
        fecha_fin: null,
      })
      .select()
      .single();

    if (!error && data) {
      setCampanas([{ ...data, stats: null }, ...campanas]);
    }
    setMenuAbierto(null);
  };

  const eliminarCampana = async (id: string) => {
    if (!confirm('¿Eliminar esta campaña?')) return;

    const { error } = await supabase
      .from('remarketing_campanas')
      .delete()
      .eq('id', id);

    if (!error) {
      setCampanas(campanas.filter(c => c.id !== id));
    }
    setMenuAbierto(null);
  };

  const campanasFiltradas = campanas.filter(c =>
    c.tipo === tabActivo &&
    (c.nombre.toLowerCase().includes(busqueda.toLowerCase()) ||
    c.curso_nombre?.toLowerCase().includes(busqueda.toLowerCase()))
  );

  const contadorLeads = campanas.filter(c => c.tipo === 'leads').length;
  const contadorAlumnos = campanas.filter(c => c.tipo === 'alumnos').length;

  const formatFecha = (fecha: string) => {
    if (!fecha) return '-';
    return new Date(fecha).toLocaleDateString('es-AR', { day: '2-digit', month: 'short', year: 'numeric' });
  };

  const formatDateTime = (fecha: string) => {
    if (!fecha) return '-';
    return new Date(fecha).toLocaleString('es-AR', { day: '2-digit', month: 'short', hour: '2-digit', minute: '2-digit' });
  };

  const getNuevaCampanaLink = () => {
    return tabActivo === 'leads' ? '/crm/remarketing/nueva' : '/crm/remarketing/alumnos/nueva';
  };

  return (
    <div className="flex-1 flex flex-col h-full bg-slate-50 dark:bg-slate-950">
      {/* Header */}
      <div className="h-14 border-b border-slate-200 dark:border-slate-800 bg-white dark:bg-slate-900 flex items-center justify-between px-6">
        <div>
          <h1 className="text-lg font-semibold text-slate-800 dark:text-white">Remarketing</h1>
          <p className="text-xs text-slate-500">Campañas de WhatsApp</p>
        </div>
        <Link
          href={getNuevaCampanaLink()}
          className="flex items-center gap-2 px-4 py-2 bg-purple-600 hover:bg-purple-700 text-white text-sm font-medium rounded-lg transition-colors"
        >
          <Plus size={16} />
          Nueva Campaña
        </Link>
      </div>

      {/* Tabs */}
      <div className="border-b border-slate-200 dark:border-slate-800 bg-white dark:bg-slate-900 px-6">
        <div className="flex gap-1">
          <button
            onClick={() => setTabActivo('leads')}
            className={`flex items-center gap-2 px-4 py-3 text-sm font-medium border-b-2 transition-colors ${
              tabActivo === 'leads'
                ? 'border-purple-600 text-purple-600'
                : 'border-transparent text-slate-500 hover:text-slate-700'
            }`}
          >
            <Target size={16} />
            Leads
            <span className={`px-2 py-0.5 rounded-full text-xs ${
              tabActivo === 'leads' ? 'bg-purple-100 text-purple-600' : 'bg-slate-100 text-slate-500'
            }`}>
              {contadorLeads}
            </span>
          </button>
          <button
            onClick={() => setTabActivo('alumnos')}
            className={`flex items-center gap-2 px-4 py-3 text-sm font-medium border-b-2 transition-colors ${
              tabActivo === 'alumnos'
                ? 'border-purple-600 text-purple-600'
                : 'border-transparent text-slate-500 hover:text-slate-700'
            }`}
          >
            <GraduationCap size={16} />
            Alumnos
            <span className={`px-2 py-0.5 rounded-full text-xs ${
              tabActivo === 'alumnos' ? 'bg-purple-100 text-purple-600' : 'bg-slate-100 text-slate-500'
            }`}>
              {contadorAlumnos}
            </span>
          </button>
        </div>
      </div>

      {/* Descripción del tab */}
      <div className="px-6 py-3 bg-slate-100 dark:bg-slate-900 border-b border-slate-200 dark:border-slate-800">
        {tabActivo === 'leads' ? (
          <p className="text-xs text-slate-600 dark:text-slate-400">
            <Target size={12} className="inline mr-1" />
            Campañas para <strong>leads que consultaron</strong> por cursos (CTWA, Ventas API, WSP4) pero no se inscribieron
          </p>
        ) : (
          <p className="text-xs text-slate-600 dark:text-slate-400">
            <GraduationCap size={12} className="inline mr-1" />
            Campañas para <strong>alumnos de PSI</strong>: egresados, activos, bajas — datos de API PSI
          </p>
        )}
      </div>

      {/* Barra de búsqueda */}
      <div className="p-4 border-b border-slate-200 dark:border-slate-800 bg-white dark:bg-slate-900">
        <div className="relative max-w-md">
          <Search size={16} className="absolute left-3 top-1/2 -translate-y-1/2 text-slate-400" />
          <input
            type="text"
            placeholder="Buscar campañas..."
            value={busqueda}
            onChange={(e) => setBusqueda(e.target.value)}
            className="w-full pl-9 pr-4 py-2 text-sm border border-slate-200 dark:border-slate-700 rounded-lg bg-white dark:bg-slate-800 text-slate-800 dark:text-white focus:outline-none focus:ring-2 focus:ring-purple-500"
          />
        </div>
      </div>

      {/* Lista de campañas */}
      <div className="flex-1 overflow-auto p-4">
        {loading ? (
          <div className="flex items-center justify-center h-64">
            <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-purple-600"></div>
          </div>
        ) : campanasFiltradas.length === 0 ? (
          <div className="flex flex-col items-center justify-center h-64 text-slate-500">
            {tabActivo === 'leads' ? <Target size={48} className="mb-4 opacity-50" /> : <GraduationCap size={48} className="mb-4 opacity-50" />}
            <p className="text-lg font-medium">No hay campañas de {tabActivo === 'leads' ? 'leads' : 'alumnos'}</p>
            <p className="text-sm">Creá tu primera campaña de remarketing</p>
            <Link
              href={getNuevaCampanaLink()}
              className="mt-4 flex items-center gap-2 px-4 py-2 bg-purple-600 hover:bg-purple-700 text-white text-sm font-medium rounded-lg"
            >
              <Plus size={16} />
              Nueva Campaña
            </Link>
          </div>
        ) : (
          <div className="grid gap-4">
            {campanasFiltradas.map((campana) => {
              const estadoConfig = ESTADO_CONFIG[campana.estado] || ESTADO_CONFIG.borrador;
              const stats = campana.stats;
              const totalEnviados = stats?.total_enviados || 0;
              const totalEntregados = stats?.total_entregados || 0;
              const totalLeidos = stats?.total_leidos || 0;
              const totalRespondidos = stats?.total_respondidos || 0;
              const totalFallidos = stats?.total_fallidos || 0;

              const tasaEntrega = totalEnviados > 0 ? Math.round((totalEntregados / totalEnviados) * 100) : 0;
              const tasaLectura = totalEntregados > 0 ? Math.round((totalLeidos / totalEntregados) * 100) : 0;
              const tasaRespuesta = totalLeidos > 0 ? Math.round((totalRespondidos / totalLeidos) * 100) : 0;

              return (
                <div
                  key={campana.id}
                  className="bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 rounded-xl p-4 hover:shadow-md transition-shadow"
                >
                  <div className="flex items-start justify-between mb-3">
                    <div className="flex-1">
                      <div className="flex items-center gap-2 mb-1">
                        <Link
                          href={`/crm/remarketing/${campana.id}`}
                          className="text-base font-semibold text-slate-800 dark:text-white hover:text-purple-600 dark:hover:text-purple-400"
                        >
                          {campana.nombre}
                        </Link>
                        <span className={`inline-flex items-center gap-1 px-2 py-0.5 rounded-full text-xs font-medium ${estadoConfig.bg} ${estadoConfig.color}`}>
                          {estadoConfig.icon}
                          {estadoConfig.label}
                        </span>
                      </div>
                      {campana.descripcion && (
                        <p className="text-sm text-slate-500 dark:text-slate-400 mb-2">{campana.descripcion}</p>
                      )}
                      <div className="flex flex-wrap items-center gap-4 text-xs text-slate-500">
                        {campana.curso_nombre && (
                          <span className="flex items-center gap-1">
                            <span className="w-2 h-2 bg-purple-500 rounded-full"></span>
                            {campana.tipo === 'leads' ? 'Excluye' : 'Curso'}: {campana.curso_nombre}
                          </span>
                        )}
                        {campana.template_nombre && (
                          <span className="flex items-center gap-1">
                            <Mail size={12} />
                            {campana.template_nombre}
                          </span>
                        )}
                        {campana.programada_para && (
                          <span className="flex items-center gap-1">
                            <Calendar size={12} />
                            Programada: {formatDateTime(campana.programada_para)}
                          </span>
                        )}
                        <span className="flex items-center gap-1">
                          <Clock size={12} />
                          {formatFecha(campana.created_at)}
                        </span>
                      </div>
                    </div>

                    {/* Menú de acciones */}
                    <div className="relative">
                      <button
                        onClick={() => setMenuAbierto(menuAbierto === campana.id ? null : campana.id)}
                        className="p-2 hover:bg-slate-100 dark:hover:bg-slate-800 rounded-lg transition-colors"
                      >
                        <MoreVertical size={16} className="text-slate-400" />
                      </button>
                      {menuAbierto === campana.id && (
                        <div className="absolute right-0 top-full mt-1 w-40 bg-white dark:bg-slate-800 border border-slate-200 dark:border-slate-700 rounded-lg shadow-lg z-10 py-1">
                          <Link
                            href={`/crm/remarketing/${campana.id}`}
                            className="flex items-center gap-2 px-3 py-2 text-sm text-slate-700 dark:text-slate-300 hover:bg-slate-100 dark:hover:bg-slate-700"
                          >
                            <Edit size={14} />
                            Editar
                          </Link>
                          <button
                            onClick={() => duplicarCampana(campana)}
                            className="w-full flex items-center gap-2 px-3 py-2 text-sm text-slate-700 dark:text-slate-300 hover:bg-slate-100 dark:hover:bg-slate-700"
                          >
                            <Copy size={14} />
                            Duplicar
                          </button>
                          {['borrador', 'pausada', 'programada'].includes(campana.estado) && (
                            <button
                              onClick={() => eliminarCampana(campana.id)}
                              className="w-full flex items-center gap-2 px-3 py-2 text-sm text-red-600 hover:bg-red-50 dark:hover:bg-red-500/10"
                            >
                              <Trash2 size={14} />
                              Eliminar
                            </button>
                          )}
                        </div>
                      )}
                    </div>
                  </div>

                  {/* Métricas */}
                  {totalEnviados > 0 && (
                    <div className="grid grid-cols-5 gap-3 pt-3 border-t border-slate-100 dark:border-slate-800">
                      <div className="text-center p-2 bg-slate-50 dark:bg-slate-800 rounded-lg">
                        <div className="flex items-center justify-center gap-1 text-slate-400 mb-1">
                          <Send size={12} />
                          <span className="text-[10px] uppercase">Enviados</span>
                        </div>
                        <p className="text-lg font-semibold text-slate-800 dark:text-white">{totalEnviados}</p>
                      </div>
                      <div className="text-center p-2 bg-green-50 dark:bg-green-900/20 rounded-lg">
                        <div className="flex items-center justify-center gap-1 text-green-600 mb-1">
                          <CheckCircle size={12} />
                          <span className="text-[10px] uppercase">Entregados</span>
                        </div>
                        <p className="text-lg font-semibold text-green-600">{totalEntregados}</p>
                        <p className="text-[10px] text-green-500">{tasaEntrega}%</p>
                      </div>
                      <div className="text-center p-2 bg-blue-50 dark:bg-blue-900/20 rounded-lg">
                        <div className="flex items-center justify-center gap-1 text-blue-600 mb-1">
                          <Eye size={12} />
                          <span className="text-[10px] uppercase">Leídos</span>
                        </div>
                        <p className="text-lg font-semibold text-blue-600">{totalLeidos}</p>
                        <p className="text-[10px] text-blue-500">{tasaLectura}%</p>
                      </div>
                      <div className="text-center p-2 bg-purple-50 dark:bg-purple-900/20 rounded-lg">
                        <div className="flex items-center justify-center gap-1 text-purple-600 mb-1">
                          <MessageSquare size={12} />
                          <span className="text-[10px] uppercase">Respuestas</span>
                        </div>
                        <p className="text-lg font-semibold text-purple-600">{totalRespondidos}</p>
                        <p className="text-[10px] text-purple-500">{tasaRespuesta}%</p>
                      </div>
                      {totalFallidos > 0 && (
                        <div className="text-center p-2 bg-red-50 dark:bg-red-900/20 rounded-lg">
                          <div className="flex items-center justify-center gap-1 text-red-600 mb-1">
                            <AlertCircle size={12} />
                            <span className="text-[10px] uppercase">Fallidos</span>
                          </div>
                          <p className="text-lg font-semibold text-red-600">{totalFallidos}</p>
                        </div>
                      )}
                    </div>
                  )}

                  {/* Audiencia si no hay envíos */}
                  {totalEnviados === 0 && campana.total_elegibles > 0 && (
                    <div className="pt-3 border-t border-slate-100 dark:border-slate-800">
                      <div className="inline-flex items-center gap-2 px-3 py-1.5 bg-slate-100 dark:bg-slate-800 rounded-lg">
                        <Users size={14} className="text-slate-500" />
                        <span className="text-sm text-slate-600 dark:text-slate-400">
                          {campana.total_elegibles.toLocaleString()} elegibles
                        </span>
                      </div>
                    </div>
                  )}

                  {/* Botones de acción rápida */}
                  {['borrador', 'pausada', 'programada'].includes(campana.estado) && (
                    <div className="flex gap-2 mt-3 pt-3 border-t border-slate-100 dark:border-slate-800">
                      <Link
                        href={`/crm/remarketing/${campana.id}`}
                        className="flex-1 flex items-center justify-center gap-2 px-3 py-2 bg-purple-600 hover:bg-purple-700 text-white text-sm font-medium rounded-lg transition-colors"
                      >
                        <PlayCircle size={16} />
                        Configurar y Enviar
                      </Link>
                    </div>
                  )}
                </div>
              );
            })}
          </div>
        )}
      </div>
    </div>
  );
}
