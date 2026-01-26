'use client';

import { useEffect, useState } from 'react';
import { usePermissions } from '@/hooks/usePermissions';
import { supabase } from '@/lib/supabase';
import { cn } from '@/lib/utils';
import {
  UserCheck, Users, Clock, Calendar, ChevronDown, RefreshCw,
  Circle, LogIn, LogOut, AlertTriangle, TrendingUp, Filter,
  History, FileEdit, Plus, Trash2, ToggleLeft, Settings
} from 'lucide-react';

interface AgenteConectado {
  usuario_id: string;
  usuario_email: string;
  usuario_nombre: string;
  ultimo_estado: string;
  ultimo_timestamp: string;
  conectado_ahora: boolean;
}

interface SesionAgente {
  id: string;
  usuario_id: string;
  usuario_email: string;
  usuario_nombre: string;
  tipo: 'conexion' | 'desconexion';
  timestamp: string;
  fecha: string;
  metadata: any;
}

interface ResumenAgente {
  usuario_id: string;
  usuario_email: string;
  usuario_nombre: string;
  fecha: string;
  horas_trabajadas: string;
  cantidad_sesiones: number;
  primera_conexion: string;
  ultima_actividad: string;
}

interface AuditLogEntry {
  id: string;
  accion: string;
  tabla_afectada: string;
  registro_id: string;
  valores_anteriores: any;
  valores_nuevos: any;
  user_name: string;
  origen: string;
  detalles: string;
  created_at: string;
}

export default function ControlAgentesPage() {
  const { esAdmin, cargando: cargandoPermisos } = usePermissions();
  const [agentesConectados, setAgentesConectados] = useState<AgenteConectado[]>([]);
  const [sesionesHoy, setSesionesHoy] = useState<SesionAgente[]>([]);
  const [resumenSemanal, setResumenSemanal] = useState<ResumenAgente[]>([]);
  const [auditLogs, setAuditLogs] = useState<AuditLogEntry[]>([]);
  const [loading, setLoading] = useState(true);
  const [tabActiva, setTabActiva] = useState<'tiempo-real' | 'historial' | 'resumen' | 'cambios'>('tiempo-real');

  // Filtros
  const [fechaDesde, setFechaDesde] = useState(() => {
    const hace7dias = new Date();
    hace7dias.setDate(hace7dias.getDate() - 7);
    return hace7dias.toISOString().split('T')[0];
  });
  const [fechaHasta, setFechaHasta] = useState(() => new Date().toISOString().split('T')[0]);
  const [agenteSeleccionado, setAgenteSeleccionado] = useState<string>('todos');
  
  // Filtros para audit log
  const [filtroAccion, setFiltroAccion] = useState<string>('todos');

  const cargarDatos = async () => {
    setLoading(true);

    // Cargar agentes conectados (vista)
    const { data: conectados } = await supabase
      .from('agentes_estado_actual')
      .select('*')
      .order('ultimo_timestamp', { ascending: false });

    if (conectados) setAgentesConectados(conectados);

    // Cargar sesiones de hoy
    const hoy = new Date().toISOString().split('T')[0];
    const { data: sesiones } = await supabase
      .from('agentes_sesiones')
      .select('*')
      .eq('fecha', hoy)
      .order('timestamp', { ascending: false })
      .limit(100);

    if (sesiones) setSesionesHoy(sesiones);

    // Cargar resumen semanal usando la función RPC
    const { data: resumen } = await supabase
      .rpc('get_resumen_horas_agentes', {
        p_fecha_desde: fechaDesde,
        p_fecha_hasta: fechaHasta
      });

    if (resumen) setResumenSemanal(resumen);

    // Cargar audit logs (cambios en automatizaciones)
    const { data: logs } = await supabase
      .from('audit_log')
      .select('*')
      .in('origen', ['crm-automatizaciones', 'router-wsp4', 'crm-respuestas'])
      .order('created_at', { ascending: false })
      .limit(200);

    if (logs) setAuditLogs(logs);

    setLoading(false);
  };

  useEffect(() => {
    if (!cargandoPermisos && esAdmin) {
      cargarDatos();

      // Actualizar cada 30 segundos
      const interval = setInterval(cargarDatos, 30000);
      return () => clearInterval(interval);
    }
  }, [cargandoPermisos, esAdmin, fechaDesde, fechaHasta]);

  // Suscripción realtime para actualizaciones
  useEffect(() => {
    if (!esAdmin) return;

    const channel = supabase
      .channel('control-agentes')
      .on('postgres_changes', { event: 'INSERT', schema: 'public', table: 'agentes_sesiones' }, () => {
        cargarDatos();
      })
      .on('postgres_changes', { event: 'INSERT', schema: 'public', table: 'audit_log' }, () => {
        cargarDatos();
      })
      .subscribe();

    return () => {
      supabase.removeChannel(channel);
    };
  }, [esAdmin]);

  const formatearHora = (timestamp: string) => {
    return new Date(timestamp).toLocaleTimeString('es-AR', {
      hour: '2-digit',
      minute: '2-digit'
    });
  };

  const formatearFechaHora = (timestamp: string) => {
    return new Date(timestamp).toLocaleString('es-AR', {
      day: '2-digit',
      month: '2-digit',
      hour: '2-digit',
      minute: '2-digit'
    });
  };

  const formatearDuracion = (intervalo: string) => {
    if (!intervalo) return '0h 0m';
    const match = intervalo.match(/(\d+):(\d+):(\d+)/);
    if (match) {
      const horas = parseInt(match[1]);
      const minutos = parseInt(match[2]);
      return `${horas}h ${minutos}m`;
    }
    return intervalo;
  };

  const tiempoDesdeUltimaActividad = (timestamp: string) => {
    const ahora = new Date();
    const ultima = new Date(timestamp);
    const diffMs = ahora.getTime() - ultima.getTime();
    const diffMin = Math.floor(diffMs / 60000);

    if (diffMin < 1) return 'Ahora';
    if (diffMin < 60) return `Hace ${diffMin}m`;
    const diffHoras = Math.floor(diffMin / 60);
    if (diffHoras < 24) return `Hace ${diffHoras}h`;
    return `Hace ${Math.floor(diffHoras / 24)}d`;
  };

  // Helper para obtener icono y color según la acción
  const getAccionStyle = (accion: string) => {
    if (accion.includes('creado') || accion.includes('creada') || accion.includes('vinculado')) {
      return { icon: Plus, bgColor: 'bg-green-100 dark:bg-green-500/20', textColor: 'text-green-600 dark:text-green-400' };
    }
    if (accion.includes('eliminado') || accion.includes('eliminada') || accion.includes('desvinculado')) {
      return { icon: Trash2, bgColor: 'bg-red-100 dark:bg-red-500/20', textColor: 'text-red-600 dark:text-red-400' };
    }
    if (accion.includes('activado') || accion.includes('activada') || accion.includes('desactivado') || accion.includes('desactivada')) {
      return { icon: ToggleLeft, bgColor: 'bg-amber-100 dark:bg-amber-500/20', textColor: 'text-amber-600 dark:text-amber-400' };
    }
    if (accion.includes('actualizado') || accion.includes('actualizada') || accion.includes('reordenadas')) {
      return { icon: FileEdit, bgColor: 'bg-blue-100 dark:bg-blue-500/20', textColor: 'text-blue-600 dark:text-blue-400' };
    }
    if (accion.includes('seleccion') || accion.includes('derivacion')) {
      return { icon: Settings, bgColor: 'bg-purple-100 dark:bg-purple-500/20', textColor: 'text-purple-600 dark:text-purple-400' };
    }
    return { icon: History, bgColor: 'bg-slate-100 dark:bg-slate-800', textColor: 'text-slate-600 dark:text-slate-400' };
  };

  // Formatear acción para mostrar
  const formatearAccion = (accion: string) => {
    const mapeo: Record<string, string> = {
      'curso_creado': 'Curso creado',
      'curso_actualizado': 'Curso actualizado',
      'curso_eliminado': 'Curso eliminado',
      'curso_activado': 'Curso activado',
      'curso_desactivado': 'Curso desactivado',
      'opcion_menu_creada': 'Opción de menú creada',
      'opcion_menu_actualizada': 'Opción de menú actualizada',
      'opcion_menu_eliminada': 'Opción de menú eliminada',
      'opcion_menu_activada': 'Opción de menú activada',
      'opcion_menu_desactivada': 'Opción de menú desactivada',
      'opciones_reordenadas': 'Opciones reordenadas',
      'anuncio_vinculado': 'Anuncio vinculado',
      'anuncio_desvinculado': 'Anuncio desvinculado',
      'seleccion_curso_wsp4': 'Selección de curso (WSP4)',
      'derivacion_menu_interactivo': 'Derivación desde menú',
      'respuesta_creada': 'Respuesta rápida creada',
      'respuesta_actualizada': 'Respuesta rápida actualizada',
      'respuesta_eliminada': 'Respuesta rápida eliminada',
    };
    return mapeo[accion] || accion;
  };

  // Obtener lista única de agentes para el filtro
  const agentesUnicos = [...new Map(
    [...sesionesHoy, ...resumenSemanal].map(s => [s.usuario_id, { id: s.usuario_id, nombre: s.usuario_nombre, email: s.usuario_email }])
  ).values()];

  // Obtener acciones únicas para filtro
  const accionesUnicas = [...new Set(auditLogs.map(l => l.accion))];

  // Filtrar logs
  const logsFiltrados = auditLogs.filter(log => {
    if (filtroAccion !== 'todos' && log.accion !== filtroAccion) return false;
    return true;
  });

  if (cargandoPermisos) {
    return (
      <div className="flex-1 flex items-center justify-center">
        <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-indigo-500"></div>
      </div>
    );
  }

  if (!esAdmin) {
    return (
      <div className="flex-1 flex items-center justify-center">
        <div className="text-center">
          <AlertTriangle size={48} className="mx-auto text-amber-500 mb-4" />
          <h2 className="text-xl font-semibold text-slate-800 dark:text-white mb-2">Acceso Restringido</h2>
          <p className="text-slate-500">Solo los administradores pueden ver esta sección.</p>
        </div>
      </div>
    );
  }

  const conectadosAhora = agentesConectados.filter(a => a.conectado_ahora);
  const desconectados = agentesConectados.filter(a => !a.conectado_ahora);

  return (
    <div className="flex-1 flex flex-col overflow-hidden bg-slate-50 dark:bg-slate-950">
      {/* Header */}
      <div className="flex-shrink-0 bg-white dark:bg-slate-900 border-b border-slate-200 dark:border-slate-800 p-4">
        <div className="flex items-center justify-between">
          <div className="flex items-center gap-3">
            <div className="w-10 h-10 rounded-xl bg-gradient-to-br from-amber-500 to-orange-500 flex items-center justify-center text-white">
              <UserCheck size={20} />
            </div>
            <div>
              <h1 className="text-lg font-semibold text-slate-800 dark:text-white">Control de Agentes</h1>
              <p className="text-xs text-slate-500">Monitoreo de conexiones, horas y cambios</p>
            </div>
          </div>
          <button
            onClick={cargarDatos}
            disabled={loading}
            className="flex items-center gap-2 px-3 py-1.5 text-sm bg-slate-100 dark:bg-slate-800 hover:bg-slate-200 dark:hover:bg-slate-700 rounded-lg transition-colors"
          >
            <RefreshCw size={14} className={cn(loading && 'animate-spin')} />
            Actualizar
          </button>
        </div>

        {/* Tabs */}
        <div className="flex gap-1 mt-4">
          {[
            { id: 'tiempo-real', label: 'Tiempo Real', icon: Circle },
            { id: 'historial', label: 'Historial Hoy', icon: Clock },
            { id: 'resumen', label: 'Resumen Horas', icon: TrendingUp },
            { id: 'cambios', label: 'Historial Cambios', icon: History },
          ].map((tab) => (
            <button
              key={tab.id}
              onClick={() => setTabActiva(tab.id as any)}
              className={cn(
                'flex items-center gap-1.5 px-3 py-1.5 text-xs font-medium rounded-lg transition-colors',
                tabActiva === tab.id
                  ? 'bg-amber-100 dark:bg-amber-500/20 text-amber-700 dark:text-amber-400'
                  : 'text-slate-500 hover:bg-slate-100 dark:hover:bg-slate-800'
              )}
            >
              <tab.icon size={14} />
              {tab.label}
            </button>
          ))}
        </div>
      </div>

      {/* Contenido */}
      <div className="flex-1 overflow-y-auto p-4">
        {/* Tab: Tiempo Real */}
        {tabActiva === 'tiempo-real' && (
          <div className="space-y-4">
            {/* Cards de resumen */}
            <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
              <div className="bg-white dark:bg-slate-900 rounded-xl p-4 border border-slate-200 dark:border-slate-800">
                <div className="flex items-center gap-3">
                  <div className="w-10 h-10 rounded-lg bg-green-100 dark:bg-green-500/20 flex items-center justify-center">
                    <Circle size={20} className="text-green-500 fill-green-500" />
                  </div>
                  <div>
                    <p className="text-2xl font-bold text-slate-800 dark:text-white">{conectadosAhora.length}</p>
                    <p className="text-xs text-slate-500">Conectados ahora</p>
                  </div>
                </div>
              </div>

              <div className="bg-white dark:bg-slate-900 rounded-xl p-4 border border-slate-200 dark:border-slate-800">
                <div className="flex items-center gap-3">
                  <div className="w-10 h-10 rounded-lg bg-slate-100 dark:bg-slate-800 flex items-center justify-center">
                    <Circle size={20} className="text-slate-400" />
                  </div>
                  <div>
                    <p className="text-2xl font-bold text-slate-800 dark:text-white">{desconectados.length}</p>
                    <p className="text-xs text-slate-500">Desconectados</p>
                  </div>
                </div>
              </div>

              <div className="bg-white dark:bg-slate-900 rounded-xl p-4 border border-slate-200 dark:border-slate-800">
                <div className="flex items-center gap-3">
                  <div className="w-10 h-10 rounded-lg bg-amber-100 dark:bg-amber-500/20 flex items-center justify-center">
                    <LogIn size={20} className="text-amber-500" />
                  </div>
                  <div>
                    <p className="text-2xl font-bold text-slate-800 dark:text-white">
                      {sesionesHoy.filter(s => s.tipo === 'conexion' && !s.metadata?.heartbeat).length}
                    </p>
                    <p className="text-xs text-slate-500">Conexiones hoy</p>
                  </div>
                </div>
              </div>
            </div>

            {/* Lista de agentes */}
            <div className="bg-white dark:bg-slate-900 rounded-xl border border-slate-200 dark:border-slate-800">
              <div className="p-3 border-b border-slate-200 dark:border-slate-800">
                <h3 className="font-medium text-sm text-slate-800 dark:text-white">Estado de Agentes</h3>
              </div>
              <div className="divide-y divide-slate-100 dark:divide-slate-800">
                {agentesConectados.length === 0 ? (
                  <div className="p-8 text-center text-slate-400 text-sm">
                    No hay datos de agentes aún
                  </div>
                ) : (
                  agentesConectados.map((agente) => (
                    <div key={agente.usuario_id} className="p-3 flex items-center justify-between">
                      <div className="flex items-center gap-3">
                        <div className="relative">
                          <div className="w-9 h-9 rounded-full bg-gradient-to-br from-indigo-400 to-purple-400 flex items-center justify-center text-white text-xs font-medium">
                            {agente.usuario_nombre?.substring(0, 2).toUpperCase() || '??'}
                          </div>
                          <div className={cn(
                            'absolute -bottom-0.5 -right-0.5 w-3 h-3 rounded-full border-2 border-white dark:border-slate-900',
                            agente.conectado_ahora ? 'bg-green-500' : 'bg-slate-400'
                          )} />
                        </div>
                        <div>
                          <p className="text-sm font-medium text-slate-800 dark:text-white">
                            {agente.usuario_nombre || agente.usuario_email}
                          </p>
                          <p className="text-[10px] text-slate-500">{agente.usuario_email}</p>
                        </div>
                      </div>
                      <div className="text-right">
                        <span className={cn(
                          'inline-flex items-center gap-1 px-2 py-0.5 rounded-full text-[10px] font-medium',
                          agente.conectado_ahora
                            ? 'bg-green-100 dark:bg-green-500/20 text-green-700 dark:text-green-400'
                            : 'bg-slate-100 dark:bg-slate-800 text-slate-600 dark:text-slate-400'
                        )}>
                          <Circle size={6} className={agente.conectado_ahora ? 'fill-current' : ''} />
                          {agente.conectado_ahora ? 'Conectado' : 'Desconectado'}
                        </span>
                        <p className="text-[10px] text-slate-400 mt-0.5">
                          {tiempoDesdeUltimaActividad(agente.ultimo_timestamp)}
                        </p>
                      </div>
                    </div>
                  ))
                )}
              </div>
            </div>
          </div>
        )}

        {/* Tab: Historial Hoy */}
        {tabActiva === 'historial' && (
          <div className="bg-white dark:bg-slate-900 rounded-xl border border-slate-200 dark:border-slate-800">
            <div className="p-3 border-b border-slate-200 dark:border-slate-800 flex items-center justify-between">
              <h3 className="font-medium text-sm text-slate-800 dark:text-white">
                Actividad de Hoy ({new Date().toLocaleDateString('es-AR')})
              </h3>
              <span className="text-xs text-slate-400">{sesionesHoy.filter(s => !s.metadata?.heartbeat).length} eventos</span>
            </div>
            <div className="divide-y divide-slate-100 dark:divide-slate-800 max-h-[600px] overflow-y-auto">
              {sesionesHoy.filter(s => !s.metadata?.heartbeat).length === 0 ? (
                <div className="p-8 text-center text-slate-400 text-sm">
                  No hay actividad registrada hoy
                </div>
              ) : (
                sesionesHoy
                  .filter(s => !s.metadata?.heartbeat)
                  .map((sesion) => (
                    <div key={sesion.id} className="p-3 flex items-center gap-3">
                      <div className={cn(
                        'w-8 h-8 rounded-lg flex items-center justify-center',
                        sesion.tipo === 'conexion'
                          ? 'bg-green-100 dark:bg-green-500/20'
                          : 'bg-red-100 dark:bg-red-500/20'
                      )}>
                        {sesion.tipo === 'conexion' ? (
                          <LogIn size={16} className="text-green-600 dark:text-green-400" />
                        ) : (
                          <LogOut size={16} className="text-red-600 dark:text-red-400" />
                        )}
                      </div>
                      <div className="flex-1">
                        <p className="text-sm font-medium text-slate-800 dark:text-white">
                          {sesion.usuario_nombre || sesion.usuario_email}
                        </p>
                        <p className="text-[10px] text-slate-500">
                          {sesion.tipo === 'conexion' ? 'Se conectó' : 'Se desconectó'}
                        </p>
                      </div>
                      <div className="text-right">
                        <p className="text-sm font-medium text-slate-800 dark:text-white">
                          {formatearHora(sesion.timestamp)}
                        </p>
                      </div>
                    </div>
                  ))
              )}
            </div>
          </div>
        )}

        {/* Tab: Resumen Horas */}
        {tabActiva === 'resumen' && (
          <div className="space-y-4">
            {/* Filtros */}
            <div className="bg-white dark:bg-slate-900 rounded-xl border border-slate-200 dark:border-slate-800 p-4">
              <div className="flex flex-wrap items-center gap-4">
                <div className="flex items-center gap-2">
                  <Filter size={14} className="text-slate-400" />
                  <span className="text-xs font-medium text-slate-600 dark:text-slate-400">Filtros:</span>
                </div>
                <div className="flex items-center gap-2">
                  <label className="text-xs text-slate-500">Desde:</label>
                  <input
                    type="date"
                    value={fechaDesde}
                    onChange={(e) => setFechaDesde(e.target.value)}
                    className="px-2 py-1 text-xs bg-slate-100 dark:bg-slate-800 border-0 rounded-md"
                  />
                </div>
                <div className="flex items-center gap-2">
                  <label className="text-xs text-slate-500">Hasta:</label>
                  <input
                    type="date"
                    value={fechaHasta}
                    onChange={(e) => setFechaHasta(e.target.value)}
                    className="px-2 py-1 text-xs bg-slate-100 dark:bg-slate-800 border-0 rounded-md"
                  />
                </div>
                <select
                  value={agenteSeleccionado}
                  onChange={(e) => setAgenteSeleccionado(e.target.value)}
                  className="px-2 py-1 text-xs bg-slate-100 dark:bg-slate-800 border-0 rounded-md"
                >
                  <option value="todos">Todos los agentes</option>
                  {agentesUnicos.map((agente) => (
                    <option key={agente.id} value={agente.id}>
                      {agente.nombre || agente.email}
                    </option>
                  ))}
                </select>
              </div>
            </div>

            {/* Tabla de resumen */}
            <div className="bg-white dark:bg-slate-900 rounded-xl border border-slate-200 dark:border-slate-800 overflow-hidden">
              <div className="overflow-x-auto">
                <table className="w-full">
                  <thead className="bg-slate-50 dark:bg-slate-800/50">
                    <tr>
                      <th className="px-4 py-3 text-left text-[10px] font-semibold text-slate-500 uppercase tracking-wider">Agente</th>
                      <th className="px-4 py-3 text-left text-[10px] font-semibold text-slate-500 uppercase tracking-wider">Fecha</th>
                      <th className="px-4 py-3 text-center text-[10px] font-semibold text-slate-500 uppercase tracking-wider">Primera Conexión</th>
                      <th className="px-4 py-3 text-center text-[10px] font-semibold text-slate-500 uppercase tracking-wider">Última Actividad</th>
                      <th className="px-4 py-3 text-center text-[10px] font-semibold text-slate-500 uppercase tracking-wider">Sesiones</th>
                      <th className="px-4 py-3 text-center text-[10px] font-semibold text-slate-500 uppercase tracking-wider">Horas Trabajadas</th>
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-slate-100 dark:divide-slate-800">
                    {resumenSemanal.length === 0 ? (
                      <tr>
                        <td colSpan={6} className="px-4 py-8 text-center text-slate-400 text-sm">
                          No hay datos para el período seleccionado
                        </td>
                      </tr>
                    ) : (
                      resumenSemanal
                        .filter(r => agenteSeleccionado === 'todos' || r.usuario_id === agenteSeleccionado)
                        .map((registro, idx) => (
                          <tr key={`${registro.usuario_id}-${registro.fecha}-${idx}`} className="hover:bg-slate-50 dark:hover:bg-slate-800/50">
                            <td className="px-4 py-3">
                              <div>
                                <p className="text-sm font-medium text-slate-800 dark:text-white">
                                  {registro.usuario_nombre || registro.usuario_email?.split('@')[0]}
                                </p>
                                <p className="text-[10px] text-slate-500">{registro.usuario_email}</p>
                              </div>
                            </td>
                            <td className="px-4 py-3 text-sm text-slate-600 dark:text-slate-400">
                              {new Date(registro.fecha).toLocaleDateString('es-AR', { weekday: 'short', day: '2-digit', month: '2-digit' })}
                            </td>
                            <td className="px-4 py-3 text-center text-sm text-slate-600 dark:text-slate-400">
                              {registro.primera_conexion ? formatearHora(registro.primera_conexion) : '-'}
                            </td>
                            <td className="px-4 py-3 text-center text-sm text-slate-600 dark:text-slate-400">
                              {registro.ultima_actividad ? formatearHora(registro.ultima_actividad) : '-'}
                            </td>
                            <td className="px-4 py-3 text-center">
                              <span className="inline-flex items-center justify-center min-w-[24px] h-6 px-2 bg-indigo-100 dark:bg-indigo-500/20 text-indigo-700 dark:text-indigo-400 text-xs font-medium rounded-full">
                                {registro.cantidad_sesiones}
                              </span>
                            </td>
                            <td className="px-4 py-3 text-center">
                              <span className="inline-flex items-center gap-1 px-2 py-1 bg-green-100 dark:bg-green-500/20 text-green-700 dark:text-green-400 text-xs font-medium rounded-lg">
                                <Clock size={12} />
                                {formatearDuracion(registro.horas_trabajadas)}
                              </span>
                            </td>
                          </tr>
                        ))
                    )}
                  </tbody>
                </table>
              </div>
            </div>
          </div>
        )}

        {/* Tab: Historial de Cambios */}
        {tabActiva === 'cambios' && (
          <div className="space-y-4">
            {/* Filtros */}
            <div className="bg-white dark:bg-slate-900 rounded-xl border border-slate-200 dark:border-slate-800 p-4">
              <div className="flex flex-wrap items-center gap-4">
                <div className="flex items-center gap-2">
                  <Filter size={14} className="text-slate-400" />
                  <span className="text-xs font-medium text-slate-600 dark:text-slate-400">Filtrar por acción:</span>
                </div>
                <select
                  value={filtroAccion}
                  onChange={(e) => setFiltroAccion(e.target.value)}
                  className="px-2 py-1 text-xs bg-slate-100 dark:bg-slate-800 border-0 rounded-md"
                >
                  <option value="todos">Todas las acciones</option>
                  {accionesUnicas.map((accion) => (
                    <option key={accion} value={accion}>
                      {formatearAccion(accion)}
                    </option>
                  ))}
                </select>
                <span className="text-xs text-slate-400 ml-auto">
                  {logsFiltrados.length} registros
                </span>
              </div>
            </div>

            {/* Lista de cambios */}
            <div className="bg-white dark:bg-slate-900 rounded-xl border border-slate-200 dark:border-slate-800">
              <div className="p-3 border-b border-slate-200 dark:border-slate-800">
                <h3 className="font-medium text-sm text-slate-800 dark:text-white">
                  Historial de Cambios en Automatizaciones
                </h3>
              </div>
              <div className="divide-y divide-slate-100 dark:divide-slate-800 max-h-[600px] overflow-y-auto">
                {logsFiltrados.length === 0 ? (
                  <div className="p-8 text-center text-slate-400 text-sm">
                    No hay cambios registrados
                  </div>
                ) : (
                  logsFiltrados.map((log) => {
                    const style = getAccionStyle(log.accion);
                    const IconComponent = style.icon;
                    return (
                      <div key={log.id} className="p-3 hover:bg-slate-50 dark:hover:bg-slate-800/50">
                        <div className="flex items-start gap-3">
                          <div className={cn('w-8 h-8 rounded-lg flex items-center justify-center flex-shrink-0', style.bgColor)}>
                            <IconComponent size={16} className={style.textColor} />
                          </div>
                          <div className="flex-1 min-w-0">
                            <div className="flex items-center gap-2 flex-wrap">
                              <span className="text-sm font-medium text-slate-800 dark:text-white">
                                {formatearAccion(log.accion)}
                              </span>
                              <span className="text-[10px] px-1.5 py-0.5 rounded bg-slate-100 dark:bg-slate-800 text-slate-500">
                                {log.tabla_afectada}
                              </span>
                            </div>
                            <p className="text-xs text-slate-600 dark:text-slate-400 mt-0.5">
                              {log.detalles || 'Sin detalles'}
                            </p>
                            {log.valores_nuevos && Object.keys(log.valores_nuevos).length > 0 && (
                              <div className="mt-1.5 text-[10px] text-slate-500 bg-slate-50 dark:bg-slate-800/50 rounded px-2 py-1">
                                {Object.entries(log.valores_nuevos).slice(0, 3).map(([key, value]) => (
                                  <span key={key} className="mr-2">
                                    <span className="text-slate-400">{key}:</span> {String(value).substring(0, 30)}{String(value).length > 30 ? '...' : ''}
                                  </span>
                                ))}
                              </div>
                            )}
                            <div className="flex items-center gap-3 mt-1.5">
                              <span className="text-[10px] text-slate-400">
                                {formatearFechaHora(log.created_at)}
                              </span>
                              {log.user_name && log.user_name !== 'Sistema' && (
                                <span className="text-[10px] text-indigo-600 dark:text-indigo-400 font-medium">
                                  por {log.user_name}
                                </span>
                              )}
                              <span className="text-[10px] text-slate-400">
                                {log.origen}
                              </span>
                            </div>
                          </div>
                        </div>
                      </div>
                    );
                  })
                )}
              </div>
            </div>
          </div>
        )}
      </div>
    </div>
  );
}
