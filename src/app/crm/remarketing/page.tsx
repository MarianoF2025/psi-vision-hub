'use client';

import { useState, useEffect } from 'react';
import { supabase } from '@/lib/supabase';
import { Plus, Search, Send, Clock, Pause, CheckCircle, Edit, Copy, Trash2, MoreVertical, Users, Mail, Eye, MessageSquare, Calendar, PlayCircle } from 'lucide-react';
import Link from 'next/link';

interface Campana {
  id: string;
  nombre: string;
  descripcion: string;
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
  total_enviados: number;
  total_entregados: number;
  total_leidos: number;
  total_respondidos: number;
  total_fallidos: number;
  created_at: string;
}

const ESTADO_CONFIG: Record<string, { color: string; bg: string; icon: React.ReactNode; label: string }> = {
  borrador: { color: 'text-slate-600', bg: 'bg-slate-100', icon: <Edit size={14} />, label: 'Borrador' },
  programada: { color: 'text-blue-600', bg: 'bg-blue-100', icon: <Clock size={14} />, label: 'Programada' },
  enviando: { color: 'text-amber-600', bg: 'bg-amber-100', icon: <Send size={14} />, label: 'Enviando' },
  pausada: { color: 'text-orange-600', bg: 'bg-orange-100', icon: <Pause size={14} />, label: 'Pausada' },
  finalizada: { color: 'text-green-600', bg: 'bg-green-100', icon: <CheckCircle size={14} />, label: 'Finalizada' },
};

export default function RemarketingPage() {
  const [campanas, setCampanas] = useState<Campana[]>([]);
  const [loading, setLoading] = useState(true);
  const [busqueda, setBusqueda] = useState('');
  const [menuAbierto, setMenuAbierto] = useState<string | null>(null);
  

  useEffect(() => {
    cargarCampanas();
  }, []);

  const cargarCampanas = async () => {
    const { data, error } = await supabase
      .from('remarketing_campanas')
      .select('*')
      .order('created_at', { ascending: false });

    if (!error && data) {
      setCampanas(data);
    }
    setLoading(false);
  };

  const duplicarCampana = async (campana: Campana) => {
    const { data, error } = await supabase
      .from('remarketing_campanas')
      .insert({
        nombre: `${campana.nombre} (copia)`,
        descripcion: campana.descripcion,
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
      setCampanas([data, ...campanas]);
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
    c.nombre.toLowerCase().includes(busqueda.toLowerCase()) ||
    c.curso_nombre?.toLowerCase().includes(busqueda.toLowerCase())
  );

  const formatFecha = (fecha: string) => {
    if (!fecha) return '-';
    return new Date(fecha).toLocaleDateString('es-AR', { day: '2-digit', month: 'short', year: 'numeric' });
  };

  const formatDateTime = (fecha: string) => {
    if (!fecha) return '-';
    return new Date(fecha).toLocaleString('es-AR', { day: '2-digit', month: 'short', hour: '2-digit', minute: '2-digit' });
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
          href="/crm/remarketing/nueva"
          className="flex items-center gap-2 px-4 py-2 bg-indigo-600 hover:bg-indigo-700 text-white text-sm font-medium rounded-lg transition-colors"
        >
          <Plus size={16} />
          Nueva Campaña
        </Link>
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
            className="w-full pl-9 pr-4 py-2 text-sm border border-slate-200 dark:border-slate-700 rounded-lg bg-white dark:bg-slate-800 text-slate-800 dark:text-white focus:outline-none focus:ring-2 focus:ring-indigo-500"
          />
        </div>
      </div>

      {/* Lista de campañas */}
      <div className="flex-1 overflow-auto p-4">
        {loading ? (
          <div className="flex items-center justify-center h-64">
            <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-indigo-600"></div>
          </div>
        ) : campanasFiltradas.length === 0 ? (
          <div className="flex flex-col items-center justify-center h-64 text-slate-500">
            <Send size={48} className="mb-4 opacity-50" />
            <p className="text-lg font-medium">No hay campañas</p>
            <p className="text-sm">Creá tu primera campaña de remarketing</p>
          </div>
        ) : (
          <div className="grid gap-4">
            {campanasFiltradas.map((campana) => {
              const estadoConfig = ESTADO_CONFIG[campana.estado] || ESTADO_CONFIG.borrador;
              const tasaEntrega = campana.total_enviados > 0 ? Math.round((campana.total_entregados / campana.total_enviados) * 100) : 0;
              const tasaLectura = campana.total_entregados > 0 ? Math.round((campana.total_leidos / campana.total_entregados) * 100) : 0;
              const tasaRespuesta = campana.total_leidos > 0 ? Math.round((campana.total_respondidos / campana.total_leidos) * 100) : 0;

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
                          className="text-base font-semibold text-slate-800 dark:text-white hover:text-indigo-600 dark:hover:text-indigo-400"
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
                            <span className="w-2 h-2 bg-indigo-500 rounded-full"></span>
                            Excluye: {campana.curso_nombre}
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
                          {campana.estado === 'borrador' && (
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
                  {campana.total_enviados > 0 && (
                    <div className="grid grid-cols-4 gap-4 pt-3 border-t border-slate-100 dark:border-slate-800">
                      <div className="text-center">
                        <div className="flex items-center justify-center gap-1 text-slate-400 mb-1">
                          <Users size={12} />
                          <span className="text-[10px] uppercase">Audiencia</span>
                        </div>
                        <p className="text-lg font-semibold text-slate-800 dark:text-white">{campana.total_elegibles.toLocaleString()}</p>
                      </div>
                      <div className="text-center">
                        <div className="flex items-center justify-center gap-1 text-slate-400 mb-1">
                          <Send size={12} />
                          <span className="text-[10px] uppercase">Entregados</span>
                        </div>
                        <p className="text-lg font-semibold text-green-600">{tasaEntrega}%</p>
                      </div>
                      <div className="text-center">
                        <div className="flex items-center justify-center gap-1 text-slate-400 mb-1">
                          <Eye size={12} />
                          <span className="text-[10px] uppercase">Leídos</span>
                        </div>
                        <p className="text-lg font-semibold text-blue-600">{tasaLectura}%</p>
                      </div>
                      <div className="text-center">
                        <div className="flex items-center justify-center gap-1 text-slate-400 mb-1">
                          <MessageSquare size={12} />
                          <span className="text-[10px] uppercase">Respuestas</span>
                        </div>
                        <p className="text-lg font-semibold text-purple-600">{tasaRespuesta}%</p>
                      </div>
                    </div>
                  )}

                  {/* Botones de acción rápida */}
                  {campana.estado === 'borrador' && (
                    <div className="flex gap-2 mt-3 pt-3 border-t border-slate-100 dark:border-slate-800">
                      <Link
                        href={`/crm/remarketing/${campana.id}`}
                        className="flex-1 flex items-center justify-center gap-2 px-3 py-2 bg-indigo-600 hover:bg-indigo-700 text-white text-sm font-medium rounded-lg transition-colors"
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
