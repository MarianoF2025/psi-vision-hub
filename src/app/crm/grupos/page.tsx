'use client';

import { useEffect, useState } from 'react';
import { supabase } from '@/lib/supabase';
import { cn } from '@/lib/utils';
import {
  Search, RefreshCw, Send, Users,
  CheckSquare, Square, Radio, Clock, AlertTriangle, Check,
  X, Calendar, Pause, Play, Eye, RotateCcw, Plus, Image,
  Pencil, Trash2
} from 'lucide-react';

interface GrupoWhatsApp {
  id: string;
  chat_id: string;
  group_jid: string;
  nombre: string;
  descripcion?: string;
  categoria: string;
  estado: string;
  puede_enviar: boolean;
  participantes_count: number;
  ts_ultimo_envio?: string;
  created_at: string;
}

interface EnvioProgramado {
  id: string;
  nombre?: string;
  mensaje: string;
  total_grupos: number;
  enviados: number;
  fallidos: number;
  estado: string;
  inicio_programado?: string;
  proximo_envio?: string;
  created_at: string;
}

const CATEGORIAS = [
  { value: 'todos', label: 'Todas las categorías' },
  { value: 'curso', label: 'Cursos' },
  { value: 'especializacion', label: 'Especializaciones' },
  { value: 'comunidad', label: 'Comunidad' },
  { value: 'otro', label: 'Otros' },
];

type TabType = 'grupos' | 'nuevo' | 'historial';

export default function GruposPage() {
  const [activeTab, setActiveTab] = useState<TabType>('grupos');
  const [grupos, setGrupos] = useState<GrupoWhatsApp[]>([]);
  const [envios, setEnvios] = useState<EnvioProgramado[]>([]);
  const [loading, setLoading] = useState(true);
  const [sincronizando, setSincronizando] = useState(false);
  const [mensaje, setMensaje] = useState<{ tipo: 'success' | 'error'; texto: string } | null>(null);

  // Tab Grupos
  const [busquedaGrupos, setBusquedaGrupos] = useState('');
  const [categoriaGrupos, setCategoriaGrupos] = useState('todos');

  // Tab Nuevo Envío
  const [nuevoEnvio, setNuevoEnvio] = useState({
    nombre: '',
    mensaje: '',
    mediaUrl: '',
    gruposSeleccionados: new Set<string>(),
    programarPara: 'ahora' as 'ahora' | 'fecha',
    fechaProgramada: '',
    horaProgramada: '',
    distribuirEnHoras: 48,
  });
  const [busquedaNuevo, setBusquedaNuevo] = useState('');
  const [categoriaNuevo, setCategoriaNuevo] = useState('todos');
  const [enviandoNuevo, setEnviandoNuevo] = useState(false);

  // Modal editar
  const [editando, setEditando] = useState<EnvioProgramado | null>(null);
  const [editForm, setEditForm] = useState({ nombre: '', mensaje: '' });

  useEffect(() => {
    cargarDatos();
  }, []);

  useEffect(() => {
    if (mensaje) {
      const timer = setTimeout(() => setMensaje(null), 4000);
      return () => clearTimeout(timer);
    }
  }, [mensaje]);

  const cargarDatos = async () => {
    setLoading(true);

    const { data: gruposData } = await supabase
      .from('grupos_whatsapp')
      .select('*')
      .eq('estado', 'activo')
      .order('nombre', { ascending: true });

    if (gruposData) setGrupos(gruposData);

    const { data: enviosData } = await supabase
      .from('envios_programados')
      .select('*')
      .order('created_at', { ascending: false })
      .limit(50);

    if (enviosData) setEnvios(enviosData);

    setLoading(false);
  };

  const sincronizarGrupos = async () => {
    setSincronizando(true);
    try {
      const response = await fetch('https://webhookn8n.psivisionhub.com/webhook/grupos/sync', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ trigger: 'manual' }),
      });

      if (response.ok) {
        setMensaje({ tipo: 'success', texto: 'Sincronización completada' });
        await new Promise(resolve => setTimeout(resolve, 2000));
        await cargarDatos();
      } else {
        throw new Error('Error en sincronización');
      }
    } catch (err) {
      console.error(err);
      setMensaje({ tipo: 'error', texto: 'Error al sincronizar grupos' });
    }
    setSincronizando(false);
  };

  // Filtros Tab Grupos
  const gruposFiltrados = grupos.filter(g => {
    const matchBusqueda = g.nombre?.toLowerCase().includes(busquedaGrupos.toLowerCase());
    const matchCategoria = categoriaGrupos === 'todos' || g.categoria === categoriaGrupos;
    return matchBusqueda && matchCategoria;
  });

  // Filtros Tab Nuevo Envío
  const gruposNuevoFiltrados = grupos.filter(g => {
    const matchBusqueda = g.nombre?.toLowerCase().includes(busquedaNuevo.toLowerCase());
    const matchCategoria = categoriaNuevo === 'todos' || g.categoria === categoriaNuevo;
    return matchBusqueda && matchCategoria;
  });

  const toggleGrupoNuevo = (id: string) => {
    const nuevaSeleccion = new Set(nuevoEnvio.gruposSeleccionados);
    if (nuevaSeleccion.has(id)) {
      nuevaSeleccion.delete(id);
    } else {
      nuevaSeleccion.add(id);
    }
    setNuevoEnvio({ ...nuevoEnvio, gruposSeleccionados: nuevaSeleccion });
  };

  const seleccionarTodosNuevo = () => {
    if (nuevoEnvio.gruposSeleccionados.size === gruposNuevoFiltrados.length) {
      setNuevoEnvio({ ...nuevoEnvio, gruposSeleccionados: new Set() });
    } else {
      setNuevoEnvio({
        ...nuevoEnvio,
        gruposSeleccionados: new Set(gruposNuevoFiltrados.map(g => g.id))
      });
    }
  };

  const calcularTiempoEstimado = () => {
    const cantGrupos = nuevoEnvio.gruposSeleccionados.size;
    const horas = nuevoEnvio.distribuirEnHoras;
    if (cantGrupos === 0) return '';
    const minutosEntreEnvios = Math.floor((horas * 60) / cantGrupos);
    if (minutosEntreEnvios >= 60) {
      const hrs = Math.floor(minutosEntreEnvios / 60);
      const mins = minutosEntreEnvios % 60;
      return `≈ 1 mensaje cada ${hrs}h ${mins}m`;
    }
    return `≈ 1 mensaje cada ${minutosEntreEnvios} minutos`;
  };

  const programarEnvio = async () => {
    if (!nuevoEnvio.mensaje.trim()) {
      setMensaje({ tipo: 'error', texto: 'El mensaje es requerido' });
      return;
    }
    if (nuevoEnvio.gruposSeleccionados.size === 0) {
      setMensaje({ tipo: 'error', texto: 'Seleccioná al menos un grupo' });
      return;
    }

    setEnviandoNuevo(true);

    try {
      const gruposArray = Array.from(nuevoEnvio.gruposSeleccionados);
      const delayCalculado = Math.floor((nuevoEnvio.distribuirEnHoras * 3600) / gruposArray.length);

      let inicioProgramado: string;
      if (nuevoEnvio.programarPara === 'ahora') {
        inicioProgramado = new Date().toISOString();
      } else {
        const fechaHora = new Date(`${nuevoEnvio.fechaProgramada}T${nuevoEnvio.horaProgramada || '09:00'}`);
        inicioProgramado = fechaHora.toISOString();
      }

      const { error } = await supabase
        .from('envios_programados')
        .insert({
          nombre: nuevoEnvio.nombre || `Envío ${new Date().toLocaleDateString('es-AR')}`,
          mensaje: nuevoEnvio.mensaje,
          media_url: nuevoEnvio.mediaUrl || null,
          grupos_destino: gruposArray,
          total_grupos: gruposArray.length,
          enviados: 0,
          fallidos: 0,
          estado: 'programado',
          distribuir_en_horas: nuevoEnvio.distribuirEnHoras,
          delay_entre_envios: delayCalculado,
          inicio_programado: inicioProgramado,
          proximo_envio: inicioProgramado,
        });

      if (error) throw error;

      setMensaje({ tipo: 'success', texto: `Envío programado para ${gruposArray.length} grupos` });

      // Reset form
      setNuevoEnvio({
        nombre: '',
        mensaje: '',
        mediaUrl: '',
        gruposSeleccionados: new Set(),
        programarPara: 'ahora',
        fechaProgramada: '',
        horaProgramada: '',
        distribuirEnHoras: 48,
      });

      setActiveTab('historial');
      cargarDatos();
    } catch (err) {
      console.error(err);
      setMensaje({ tipo: 'error', texto: 'Error al programar el envío' });
    }

    setEnviandoNuevo(false);
  };

  const pausarEnvio = async (envioId: string) => {
    await supabase
      .from('envios_programados')
      .update({ estado: 'pausado' })
      .eq('id', envioId);
    cargarDatos();
    setMensaje({ tipo: 'success', texto: 'Envío pausado' });
  };

  const reanudarEnvio = async (envioId: string) => {
    await supabase
      .from('envios_programados')
      .update({ estado: 'en_curso', proximo_envio: new Date().toISOString() })
      .eq('id', envioId);
    cargarDatos();
    setMensaje({ tipo: 'success', texto: 'Envío reanudado' });
  };

  const abrirEditar = (envio: EnvioProgramado) => {
    setEditForm({
      nombre: envio.nombre || '',
      mensaje: envio.mensaje,
    });
    setEditando(envio);
  };

  const guardarEdicion = async () => {
    if (!editando) return;
    
    const { error } = await supabase
      .from('envios_programados')
      .update({
        nombre: editForm.nombre,
        mensaje: editForm.mensaje,
      })
      .eq('id', editando.id);

    if (error) {
      setMensaje({ tipo: 'error', texto: 'Error al guardar cambios' });
    } else {
      setMensaje({ tipo: 'success', texto: 'Envío actualizado' });
      setEditando(null);
      cargarDatos();
    }
  };

  const eliminarEnvio = async (envioId: string) => {
    if (!confirm('¿Eliminar este envío? Esta acción no se puede deshacer.')) return;
    
    const { error } = await supabase
      .from('envios_programados')
      .delete()
      .eq('id', envioId);

    if (error) {
      setMensaje({ tipo: 'error', texto: 'Error al eliminar' });
    } else {
      setMensaje({ tipo: 'success', texto: 'Envío eliminado' });
      cargarDatos();
    }
  };

  const getEstadoBadge = (estado: string) => {
    switch (estado) {
      case 'programado':
        return <span className="px-2 py-1 text-xs font-medium rounded-full bg-blue-100 text-blue-600 dark:bg-blue-500/20 dark:text-blue-400">Programado</span>;
      case 'en_curso':
        return <span className="px-2 py-1 text-xs font-medium rounded-full bg-amber-100 text-amber-600 dark:bg-amber-500/20 dark:text-amber-400">En curso</span>;
      case 'completado':
        return <span className="px-2 py-1 text-xs font-medium rounded-full bg-green-100 text-green-600 dark:bg-green-500/20 dark:text-green-400">Completado</span>;
      case 'pausado':
        return <span className="px-2 py-1 text-xs font-medium rounded-full bg-slate-100 text-slate-600 dark:bg-slate-500/20 dark:text-slate-400">Pausado</span>;
      case 'cancelado':
        return <span className="px-2 py-1 text-xs font-medium rounded-full bg-red-100 text-red-600 dark:bg-red-500/20 dark:text-red-400">Cancelado</span>;
      default:
        return <span className="px-2 py-1 text-xs font-medium rounded-full bg-slate-100 text-slate-600">{estado}</span>;
    }
  };

  return (
    <div className="flex-1 flex flex-col bg-slate-50 dark:bg-slate-950 overflow-hidden">
      {/* Toast */}
      {mensaje && (
        <div className={cn(
          "fixed top-4 right-4 z-50 px-4 py-3 rounded-lg shadow-lg flex items-center gap-2",
          mensaje.tipo === 'success' ? "bg-green-500 text-white" : "bg-red-500 text-white"
        )}>
          {mensaje.tipo === 'success' ? <Check size={18} /> : <AlertTriangle size={18} />}
          {mensaje.texto}
        </div>
      )}

      {/* Modal Editar */}
      {editando && (
        <div className="fixed inset-0 bg-black/50 flex items-center justify-center z-50">
          <div className="bg-white dark:bg-slate-900 rounded-xl p-6 w-full max-w-lg mx-4 shadow-xl">
            <div className="flex items-center justify-between mb-4">
              <h2 className="text-lg font-semibold text-slate-800 dark:text-white">Editar envío</h2>
              <button
                onClick={() => setEditando(null)}
                className="p-1 text-slate-400 hover:text-slate-600"
              >
                <X size={20} />
              </button>
            </div>
            
            <div className="space-y-4">
              <div>
                <label className="block text-sm text-slate-600 dark:text-slate-400 mb-1">Nombre</label>
                <input
                  type="text"
                  value={editForm.nombre}
                  onChange={(e) => setEditForm({ ...editForm, nombre: e.target.value })}
                  className="w-full px-4 py-2 bg-slate-50 dark:bg-slate-800 border border-slate-200 dark:border-slate-700 rounded-lg text-sm"
                />
              </div>
              
              <div>
                <label className="block text-sm text-slate-600 dark:text-slate-400 mb-1">Mensaje</label>
                <textarea
                  value={editForm.mensaje}
                  onChange={(e) => setEditForm({ ...editForm, mensaje: e.target.value })}
                  rows={4}
                  className="w-full px-4 py-2 bg-slate-50 dark:bg-slate-800 border border-slate-200 dark:border-slate-700 rounded-lg text-sm resize-none"
                />
              </div>

              <div className="bg-amber-50 dark:bg-amber-500/10 p-3 rounded-lg">
                <p className="text-xs text-amber-700 dark:text-amber-400">
                  ⚠️ Los cambios solo afectan a mensajes pendientes de enviar.
                </p>
              </div>
            </div>

            <div className="flex justify-end gap-3 mt-6">
              <button
                onClick={() => setEditando(null)}
                className="px-4 py-2 text-slate-600 dark:text-slate-400 hover:bg-slate-100 dark:hover:bg-slate-800 rounded-lg"
              >
                Cancelar
              </button>
              <button
                onClick={guardarEdicion}
                className="px-4 py-2 bg-indigo-500 text-white rounded-lg hover:bg-indigo-600"
              >
                Guardar cambios
              </button>
            </div>
          </div>
        </div>
      )}

      {/* Header */}
      <div className="bg-white dark:bg-slate-900 border-b border-slate-200 dark:border-slate-800 p-4">
        <div className="flex items-center justify-between mb-4">
          <div>
            <h1 className="text-xl font-bold text-slate-800 dark:text-white">Grupos WhatsApp</h1>
            <p className="text-sm text-slate-500">{grupos.length} grupos sincronizados</p>
          </div>
          <button
            onClick={sincronizarGrupos}
            disabled={sincronizando}
            className="px-4 py-2 bg-slate-100 dark:bg-slate-800 text-slate-600 dark:text-slate-300 rounded-lg text-sm font-medium flex items-center gap-2 hover:bg-slate-200 dark:hover:bg-slate-700 disabled:opacity-50"
          >
            <RefreshCw size={16} className={sincronizando ? 'animate-spin' : ''} />
            {sincronizando ? 'Sincronizando...' : 'Sincronizar'}
          </button>
        </div>

        {/* Tabs */}
        <div className="flex gap-1 bg-slate-100 dark:bg-slate-800 p-1 rounded-lg w-fit">
          <button
            onClick={() => setActiveTab('grupos')}
            className={cn(
              "px-4 py-2 text-sm font-medium rounded-md transition-colors",
              activeTab === 'grupos'
                ? "bg-white dark:bg-slate-700 text-slate-800 dark:text-white shadow-sm"
                : "text-slate-600 dark:text-slate-400 hover:text-slate-800 dark:hover:text-white"
            )}
          >
            <Users size={16} className="inline mr-2" />
            Grupos
          </button>
          <button
            onClick={() => setActiveTab('nuevo')}
            className={cn(
              "px-4 py-2 text-sm font-medium rounded-md transition-colors",
              activeTab === 'nuevo'
                ? "bg-white dark:bg-slate-700 text-slate-800 dark:text-white shadow-sm"
                : "text-slate-600 dark:text-slate-400 hover:text-slate-800 dark:hover:text-white"
            )}
          >
            <Plus size={16} className="inline mr-2" />
            Nuevo Envío
          </button>
          <button
            onClick={() => setActiveTab('historial')}
            className={cn(
              "px-4 py-2 text-sm font-medium rounded-md transition-colors",
              activeTab === 'historial'
                ? "bg-white dark:bg-slate-700 text-slate-800 dark:text-white shadow-sm"
                : "text-slate-600 dark:text-slate-400 hover:text-slate-800 dark:hover:text-white"
            )}
          >
            <Clock size={16} className="inline mr-2" />
            Historial
            {envios.filter(e => e.estado === 'en_curso').length > 0 && (
              <span className="ml-2 px-1.5 py-0.5 text-xs bg-amber-500 text-white rounded-full">
                {envios.filter(e => e.estado === 'en_curso').length}
              </span>
            )}
          </button>
        </div>
      </div>

      {/* Tab Content */}
      <div className="flex-1 overflow-auto p-4">

        {/* TAB: GRUPOS */}
        {activeTab === 'grupos' && (
          <div>
            <div className="flex gap-3 mb-4">
              <div className="relative flex-1 max-w-md">
                <Search size={16} className="absolute left-3 top-1/2 -translate-y-1/2 text-slate-400" />
                <input
                  type="text"
                  placeholder="Buscar grupos..."
                  value={busquedaGrupos}
                  onChange={(e) => setBusquedaGrupos(e.target.value)}
                  className="w-full pl-9 pr-4 py-2 bg-white dark:bg-slate-800 border border-slate-200 dark:border-slate-700 rounded-lg text-sm"
                />
              </div>
              <select
                value={categoriaGrupos}
                onChange={(e) => setCategoriaGrupos(e.target.value)}
                className="px-4 py-2 bg-white dark:bg-slate-800 border border-slate-200 dark:border-slate-700 rounded-lg text-sm"
              >
                {CATEGORIAS.map(cat => (
                  <option key={cat.value} value={cat.value}>{cat.label}</option>
                ))}
              </select>
            </div>

            <div className="bg-white dark:bg-slate-900 rounded-xl border border-slate-200 dark:border-slate-800 overflow-hidden">
              <table className="w-full">
                <thead className="bg-slate-50 dark:bg-slate-800/50">
                  <tr>
                    <th className="text-left px-4 py-3 text-xs font-medium text-slate-500 uppercase">Grupo</th>
                    <th className="text-left px-4 py-3 text-xs font-medium text-slate-500 uppercase">Categoría</th>
                    <th className="text-left px-4 py-3 text-xs font-medium text-slate-500 uppercase">Participantes</th>
                    <th className="text-left px-4 py-3 text-xs font-medium text-slate-500 uppercase">Estado</th>
                    <th className="text-left px-4 py-3 text-xs font-medium text-slate-500 uppercase">Último envío</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-slate-100 dark:divide-slate-800">
                  {loading ? (
                    <tr>
                      <td colSpan={5} className="px-4 py-8 text-center text-slate-400">Cargando grupos...</td>
                    </tr>
                  ) : gruposFiltrados.length === 0 ? (
                    <tr>
                      <td colSpan={5} className="px-4 py-8 text-center text-slate-400">
                        {grupos.length === 0 ? 'No hay grupos. Hacé clic en "Sincronizar".' : 'No se encontraron grupos'}
                      </td>
                    </tr>
                  ) : gruposFiltrados.map((grupo) => (
                    <tr key={grupo.id} className="hover:bg-slate-50 dark:hover:bg-slate-800/50">
                      <td className="px-4 py-3">
                        <div className="flex items-center gap-3">
                          <div className="w-9 h-9 rounded-full bg-gradient-to-br from-green-400 to-emerald-500 flex items-center justify-center text-white">
                            <Users size={16} />
                          </div>
                          <p className="font-medium text-slate-800 dark:text-white">{grupo.nombre}</p>
                        </div>
                      </td>
                      <td className="px-4 py-3">
                        <span className={cn(
                          "px-2 py-1 text-xs font-medium rounded-full",
                          grupo.categoria === 'curso' && "bg-blue-100 text-blue-600 dark:bg-blue-500/20 dark:text-blue-400",
                          grupo.categoria === 'especializacion' && "bg-purple-100 text-purple-600 dark:bg-purple-500/20 dark:text-purple-400",
                          grupo.categoria === 'comunidad' && "bg-green-100 text-green-600 dark:bg-green-500/20 dark:text-green-400",
                          grupo.categoria === 'otro' && "bg-slate-100 text-slate-600 dark:bg-slate-500/20 dark:text-slate-400"
                        )}>
                          {grupo.categoria}
                        </span>
                      </td>
                      <td className="px-4 py-3 text-sm text-slate-600 dark:text-slate-300">
                        👥 {grupo.participantes_count || '?'}
                      </td>
                      <td className="px-4 py-3">
                        {grupo.puede_enviar ? (
                          <span className="flex items-center gap-1 text-xs text-green-600 dark:text-green-400">
                            <Radio size={12} /> Activo
                          </span>
                        ) : (
                          <span className="text-xs text-slate-400">No admin</span>
                        )}
                      </td>
                      <td className="px-4 py-3 text-sm text-slate-500">
                        {grupo.ts_ultimo_envio ? new Date(grupo.ts_ultimo_envio).toLocaleDateString() : '-'}
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
            <p className="mt-4 text-sm text-slate-500">Mostrando {gruposFiltrados.length} de {grupos.length} grupos</p>
          </div>
        )}

        {/* TAB: NUEVO ENVÍO */}
        {activeTab === 'nuevo' && (
          <div className="max-w-4xl">
            {/* Paso 1: Mensaje */}
            <div className="bg-white dark:bg-slate-900 rounded-xl border border-slate-200 dark:border-slate-800 p-4 mb-4">
              <h2 className="text-sm font-semibold text-slate-800 dark:text-white mb-3 flex items-center gap-2">
                <span className="w-6 h-6 rounded-full bg-indigo-500 text-white text-xs flex items-center justify-center">1</span>
                Mensaje
              </h2>
              <div className="space-y-3">
                <div>
                  <label className="block text-sm text-slate-600 dark:text-slate-400 mb-1">Nombre del envío (opcional)</label>
                  <input
                    type="text"
                    value={nuevoEnvio.nombre}
                    onChange={(e) => setNuevoEnvio({ ...nuevoEnvio, nombre: e.target.value })}
                    placeholder="Ej: Promo AT Enero 2026"
                    className="w-full px-4 py-2 bg-slate-50 dark:bg-slate-800 border border-slate-200 dark:border-slate-700 rounded-lg text-sm"
                  />
                </div>
                <div>
                  <label className="block text-sm text-slate-600 dark:text-slate-400 mb-1">Mensaje <span className="text-red-500">*</span></label>
                  <textarea
                    value={nuevoEnvio.mensaje}
                    onChange={(e) => setNuevoEnvio({ ...nuevoEnvio, mensaje: e.target.value })}
                    placeholder="Escribí el mensaje que se enviará a los grupos..."
                    rows={4}
                    className="w-full px-4 py-2 bg-slate-50 dark:bg-slate-800 border border-slate-200 dark:border-slate-700 rounded-lg text-sm resize-none"
                  />
                </div>
                <div>
                  <label className="block text-sm text-slate-600 dark:text-slate-400 mb-1">URL de imagen (opcional)</label>
                  <div className="flex gap-2">
                    <input
                      type="text"
                      value={nuevoEnvio.mediaUrl}
                      onChange={(e) => setNuevoEnvio({ ...nuevoEnvio, mediaUrl: e.target.value })}
                      placeholder="https://..."
                      className="flex-1 px-4 py-2 bg-slate-50 dark:bg-slate-800 border border-slate-200 dark:border-slate-700 rounded-lg text-sm"
                    />
                    <button className="px-3 py-2 bg-slate-100 dark:bg-slate-800 text-slate-600 dark:text-slate-400 rounded-lg hover:bg-slate-200">
                      <Image size={18} />
                    </button>
                  </div>
                </div>
              </div>
            </div>

            {/* Paso 2: Grupos */}
            <div className="bg-white dark:bg-slate-900 rounded-xl border border-slate-200 dark:border-slate-800 p-4 mb-4">
              <div className="flex items-center justify-between mb-3">
                <h2 className="text-sm font-semibold text-slate-800 dark:text-white flex items-center gap-2">
                  <span className="w-6 h-6 rounded-full bg-indigo-500 text-white text-xs flex items-center justify-center">2</span>
                  Grupos destino
                  {nuevoEnvio.gruposSeleccionados.size > 0 && (
                    <span className="ml-2 px-2 py-0.5 bg-indigo-100 dark:bg-indigo-500/20 text-indigo-600 dark:text-indigo-400 text-xs rounded-full">
                      {nuevoEnvio.gruposSeleccionados.size} seleccionados
                    </span>
                  )}
                </h2>
                <button
                  onClick={seleccionarTodosNuevo}
                  className="text-xs text-indigo-600 dark:text-indigo-400 hover:underline"
                >
                  {nuevoEnvio.gruposSeleccionados.size === gruposNuevoFiltrados.length ? 'Deseleccionar todos' : 'Seleccionar todos'}
                </button>
              </div>

              <div className="flex gap-3 mb-3">
                <div className="relative flex-1">
                  <Search size={16} className="absolute left-3 top-1/2 -translate-y-1/2 text-slate-400" />
                  <input
                    type="text"
                    placeholder="Buscar grupos..."
                    value={busquedaNuevo}
                    onChange={(e) => setBusquedaNuevo(e.target.value)}
                    className="w-full pl-9 pr-4 py-2 bg-slate-50 dark:bg-slate-800 border border-slate-200 dark:border-slate-700 rounded-lg text-sm"
                  />
                </div>
                <select
                  value={categoriaNuevo}
                  onChange={(e) => setCategoriaNuevo(e.target.value)}
                  className="px-3 py-2 bg-slate-50 dark:bg-slate-800 border border-slate-200 dark:border-slate-700 rounded-lg text-sm"
                >
                  {CATEGORIAS.map(cat => (
                    <option key={cat.value} value={cat.value}>{cat.label}</option>
                  ))}
                </select>
              </div>

              <div className="max-h-64 overflow-y-auto border border-slate-200 dark:border-slate-700 rounded-lg">
                {gruposNuevoFiltrados.length === 0 ? (
                  <p className="p-4 text-center text-slate-400 text-sm">No hay grupos</p>
                ) : gruposNuevoFiltrados.map((grupo) => (
                  <div
                    key={grupo.id}
                    onClick={() => toggleGrupoNuevo(grupo.id)}
                    className={cn(
                      "flex items-center gap-3 px-3 py-2 cursor-pointer border-b border-slate-100 dark:border-slate-800 last:border-0",
                      nuevoEnvio.gruposSeleccionados.has(grupo.id)
                        ? "bg-indigo-50 dark:bg-indigo-500/10"
                        : "hover:bg-slate-50 dark:hover:bg-slate-800/50"
                    )}
                  >
                    {nuevoEnvio.gruposSeleccionados.has(grupo.id) ? (
                      <CheckSquare size={18} className="text-indigo-500 flex-shrink-0" />
                    ) : (
                      <Square size={18} className="text-slate-300 flex-shrink-0" />
                    )}
                    <span className="text-sm text-slate-800 dark:text-white flex-1">{grupo.nombre}</span>
                    <span className="text-xs text-slate-400">{grupo.participantes_count} 👥</span>
                  </div>
                ))}
              </div>
            </div>

            {/* Paso 3: Programación */}
            <div className="bg-white dark:bg-slate-900 rounded-xl border border-slate-200 dark:border-slate-800 p-4 mb-4">
              <h2 className="text-sm font-semibold text-slate-800 dark:text-white mb-3 flex items-center gap-2">
                <span className="w-6 h-6 rounded-full bg-indigo-500 text-white text-xs flex items-center justify-center">3</span>
                Programación
              </h2>
              <div className="space-y-3">
                <div className="flex gap-4">
                  <label className="flex items-center gap-2 cursor-pointer">
                    <input
                      type="radio"
                      name="programar"
                      checked={nuevoEnvio.programarPara === 'ahora'}
                      onChange={() => setNuevoEnvio({ ...nuevoEnvio, programarPara: 'ahora' })}
                      className="text-indigo-500"
                    />
                    <span className="text-sm text-slate-700 dark:text-slate-300">Enviar ahora</span>
                  </label>
                  <label className="flex items-center gap-2 cursor-pointer">
                    <input
                      type="radio"
                      name="programar"
                      checked={nuevoEnvio.programarPara === 'fecha'}
                      onChange={() => setNuevoEnvio({ ...nuevoEnvio, programarPara: 'fecha' })}
                      className="text-indigo-500"
                    />
                    <span className="text-sm text-slate-700 dark:text-slate-300">Programar para</span>
                  </label>
                </div>

                {nuevoEnvio.programarPara === 'fecha' && (
                  <div className="flex gap-3">
                    <input
                      type="date"
                      value={nuevoEnvio.fechaProgramada}
                      onChange={(e) => setNuevoEnvio({ ...nuevoEnvio, fechaProgramada: e.target.value })}
                      className="px-3 py-2 bg-slate-50 dark:bg-slate-800 border border-slate-200 dark:border-slate-700 rounded-lg text-sm"
                    />
                    <input
                      type="time"
                      value={nuevoEnvio.horaProgramada}
                      onChange={(e) => setNuevoEnvio({ ...nuevoEnvio, horaProgramada: e.target.value })}
                      className="px-3 py-2 bg-slate-50 dark:bg-slate-800 border border-slate-200 dark:border-slate-700 rounded-lg text-sm"
                    />
                  </div>
                )}

                <div>
                  <label className="block text-sm text-slate-600 dark:text-slate-400 mb-1">Distribuir en</label>
                  <select
                    value={nuevoEnvio.distribuirEnHoras}
                    onChange={(e) => setNuevoEnvio({ ...nuevoEnvio, distribuirEnHoras: Number(e.target.value) })}
                    className="w-full px-3 py-2 bg-slate-50 dark:bg-slate-800 border border-slate-200 dark:border-slate-700 rounded-lg text-sm"
                  >
                    <option value={24}>1 día</option>
                    <option value={48}>2 días</option>
                    <option value={72}>3 días</option>
                    <option value={168}>1 semana</option>
                  </select>
                  <p className="text-xs text-slate-500 mt-1">{calcularTiempoEstimado()}</p>
                </div>

                <div className="bg-amber-50 dark:bg-amber-500/10 p-3 rounded-lg">
                  <p className="text-xs text-amber-700 dark:text-amber-400">
                    ⚠️ Los mensajes se enviarán de forma gradual para evitar bloqueos de WhatsApp.
                  </p>
                </div>
              </div>
            </div>

            {/* Botón Programar */}
            <div className="flex justify-end gap-3">
              <button
                onClick={() => {
                  setNuevoEnvio({
                    nombre: '',
                    mensaje: '',
                    mediaUrl: '',
                    gruposSeleccionados: new Set(),
                    programarPara: 'ahora',
                    fechaProgramada: '',
                    horaProgramada: '',
                    distribuirEnHoras: 48,
                  });
                }}
                className="px-4 py-2 text-slate-600 dark:text-slate-400 hover:bg-slate-100 dark:hover:bg-slate-800 rounded-lg"
              >
                Cancelar
              </button>
              <button
                onClick={programarEnvio}
                disabled={enviandoNuevo || !nuevoEnvio.mensaje.trim() || nuevoEnvio.gruposSeleccionados.size === 0}
                className="px-6 py-2 bg-indigo-500 text-white rounded-lg hover:bg-indigo-600 disabled:opacity-50 flex items-center gap-2"
              >
                {enviandoNuevo ? (
                  <>
                    <RefreshCw size={16} className="animate-spin" />
                    Programando...
                  </>
                ) : (
                  <>
                    <Send size={16} />
                    Programar envío
                  </>
                )}
              </button>
            </div>
          </div>
        )}

        {/* TAB: HISTORIAL */}
        {activeTab === 'historial' && (
          <div>
            <div className="bg-white dark:bg-slate-900 rounded-xl border border-slate-200 dark:border-slate-800 overflow-hidden">
              <table className="w-full">
                <thead className="bg-slate-50 dark:bg-slate-800/50">
                  <tr>
                    <th className="text-left px-4 py-3 text-xs font-medium text-slate-500 uppercase">Envío</th>
                    <th className="text-left px-4 py-3 text-xs font-medium text-slate-500 uppercase">Grupos</th>
                    <th className="text-left px-4 py-3 text-xs font-medium text-slate-500 uppercase">Progreso</th>
                    <th className="text-left px-4 py-3 text-xs font-medium text-slate-500 uppercase">Estado</th>
                    <th className="text-left px-4 py-3 text-xs font-medium text-slate-500 uppercase">Programado</th>
                    <th className="text-left px-4 py-3 text-xs font-medium text-slate-500 uppercase">Acciones</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-slate-100 dark:divide-slate-800">
                  {envios.length === 0 ? (
                    <tr>
                      <td colSpan={6} className="px-4 py-8 text-center text-slate-400">No hay envíos programados</td>
                    </tr>
                  ) : envios.map((envio) => (
                    <tr key={envio.id} className="hover:bg-slate-50 dark:hover:bg-slate-800/50">
                      <td className="px-4 py-3">
                        <p className="font-medium text-slate-800 dark:text-white">{envio.nombre || 'Sin nombre'}</p>
                        <p className="text-xs text-slate-500 truncate max-w-xs">{envio.mensaje.substring(0, 50)}...</p>
                      </td>
                      <td className="px-4 py-3 text-sm text-slate-600 dark:text-slate-300">
                        {envio.total_grupos}
                      </td>
                      <td className="px-4 py-3">
                        <div className="flex items-center gap-2">
                          <div className="w-24 h-2 bg-slate-200 dark:bg-slate-700 rounded-full overflow-hidden">
                            <div
                              className="h-full bg-green-500 rounded-full"
                              style={{ width: `${(envio.enviados / envio.total_grupos) * 100}%` }}
                            />
                          </div>
                          <span className="text-xs text-slate-500">
                            {envio.enviados}/{envio.total_grupos}
                          </span>
                        </div>
                        {envio.fallidos > 0 && (
                          <p className="text-xs text-red-500 mt-0.5">{envio.fallidos} fallidos</p>
                        )}
                      </td>
                      <td className="px-4 py-3">{getEstadoBadge(envio.estado)}</td>
                      <td className="px-4 py-3 text-sm text-slate-500">
                        {envio.inicio_programado
                          ? new Date(envio.inicio_programado).toLocaleString('es-AR', {
                              day: '2-digit', month: '2-digit', hour: '2-digit', minute: '2-digit'
                            })
                          : '-'
                        }
                      </td>
                      <td className="px-4 py-3">
                        <div className="flex gap-1">
                          {(envio.estado === 'programado' || envio.estado === 'en_curso') && (
                            <button
                              onClick={() => pausarEnvio(envio.id)}
                              className="p-1.5 text-slate-400 hover:text-amber-500 hover:bg-amber-50 dark:hover:bg-amber-500/10 rounded"
                              title="Pausar"
                            >
                              <Pause size={16} />
                            </button>
                          )}
                          {envio.estado === 'pausado' && (
                            <button
                              onClick={() => reanudarEnvio(envio.id)}
                              className="p-1.5 text-slate-400 hover:text-green-500 hover:bg-green-50 dark:hover:bg-green-500/10 rounded"
                              title="Reanudar"
                            >
                              <Play size={16} />
                            </button>
                          )}
                          {envio.estado !== 'completado' && (
                            <button
                              onClick={() => abrirEditar(envio)}
                              className="p-1.5 text-slate-400 hover:text-indigo-500 hover:bg-indigo-50 dark:hover:bg-indigo-500/10 rounded"
                              title="Editar"
                            >
                              <Pencil size={16} />
                            </button>
                          )}
                          <button
                            className="p-1.5 text-slate-400 hover:text-indigo-500 hover:bg-indigo-50 dark:hover:bg-indigo-500/10 rounded"
                            title="Ver detalles"
                          >
                            <Eye size={16} />
                          </button>
                          <button
                            onClick={() => eliminarEnvio(envio.id)}
                            className="p-1.5 text-slate-400 hover:text-red-500 hover:bg-red-50 dark:hover:bg-red-500/10 rounded"
                            title="Eliminar"
                          >
                            <Trash2 size={16} />
                          </button>
                        </div>
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          </div>
        )}
      </div>
    </div>
  );
}
