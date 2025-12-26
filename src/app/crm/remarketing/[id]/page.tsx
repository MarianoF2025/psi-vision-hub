'use client';

import { useState, useEffect } from 'react';
import { supabase } from '@/lib/supabase';
import { useRouter, useParams } from 'next/navigation';
import { ArrowLeft, Send, Clock, Users, Pause, Play, Copy, Trash2, Edit3, Check, X, Save, RefreshCw } from 'lucide-react';
import Link from 'next/link';

interface Campana {
  id: string;
  nombre: string;
  descripcion: string;
  curso_codigo: string;
  curso_nombre: string;
  template_nombre: string;
  template_id: string;
  audiencia_filtros: { etiquetas: string[] };
  estado: string;
  programada_para: string;
  total_audiencia: number;
  total_excluidos: number;
  total_elegibles: number;
  total_enviados: number;
  total_entregados: number;
  total_leidos: number;
  total_respondidos: number;
  total_fallidos: number;
  created_at: string;
  updated_at: string;
}

interface Envio {
  id: string;
  telefono: string;
  excluido: boolean;
  motivo_exclusion: string;
  estado: string;
  error_mensaje: string;
  enviado_at: string;
  entregado_at: string;
  leido_at: string;
  respondido_at: string;
}

interface Etiqueta {
  id: string;
  nombre: string;
  color: string;
}

interface Template {
  id: string;
  nombre: string;
  categoria: string;
  variables: number;
}

const cursosDisponibles = [
  { codigo: 'AT', nombre: 'Acompañante Terapéutico' },
  { codigo: 'APA', nombre: 'Aprendizaje y Psicología del Adulto' },
  { codigo: 'PNIE', nombre: 'Psiconeuroinmunoendocrinología' },
  { codigo: 'COACHING', nombre: 'Coaching Ontológico' },
  { codigo: 'MINDFULNESS', nombre: 'Mindfulness' },
];

export default function DetalleCampanaPage() {
  const router = useRouter();
  const params = useParams();
  const id = params.id as string;

  const [campana, setCampana] = useState<Campana | null>(null);
  const [envios, setEnvios] = useState<Envio[]>([]);
  const [etiquetas, setEtiquetas] = useState<Etiqueta[]>([]);
  const [templates, setTemplates] = useState<Template[]>([]);
  const [cargando, setCargando] = useState(true);
  const [tabActiva, setTabActiva] = useState<'resumen' | 'envios'>('resumen');
  const [accionando, setAccionando] = useState(false);
  
  // Estados para edición
  const [modoEdicion, setModoEdicion] = useState(false);
  const [editNombre, setEditNombre] = useState('');
  const [editDescripcion, setEditDescripcion] = useState('');
  const [editTemplateId, setEditTemplateId] = useState('');
  const [editCursoExcluir, setEditCursoExcluir] = useState('');
  const [editEtiquetas, setEditEtiquetas] = useState<string[]>([]);
  const [editTipoEnvio, setEditTipoEnvio] = useState<'manual' | 'programado'>('manual');
  const [editFechaProgramada, setEditFechaProgramada] = useState('');
  const [editHoraProgramada, setEditHoraProgramada] = useState('09:00');
  const [guardando, setGuardando] = useState(false);

  useEffect(() => {
    if (id) {
      cargarCampana();
      cargarEtiquetas();
      cargarTemplates();
    }
  }, [id]);

  const cargarCampana = async () => {
    setCargando(true);
    try {
      const { data, error } = await supabase
        .from('remarketing_campanas')
        .select('*')
        .eq('id', id)
        .single();

      if (error) throw error;
      setCampana(data);

      if (data.estado !== 'borrador') {
        const { data: enviosData } = await supabase
          .from('remarketing_envios')
          .select('*')
          .eq('campana_id', id)
          .order('created_at', { ascending: false })
          .limit(100);
        if (enviosData) setEnvios(enviosData);
      }
    } catch (error) {
      console.error('Error cargando campaña:', error);
      alert('Error al cargar la campaña');
      router.push('/crm/remarketing');
    } finally {
      setCargando(false);
    }
  };

  const cargarEtiquetas = async () => {
    const { data } = await supabase.from('etiquetas').select('*').order('nombre');
    if (data) setEtiquetas(data);
  };

  const cargarTemplates = async () => {
    const { data } = await supabase
      .from('remarketing_templates')
      .select('*')
      .eq('estado', 'activo')
      .order('nombre');
    if (data) setTemplates(data);
  };

  const iniciarEdicion = () => {
    if (!campana) return;
    setEditNombre(campana.nombre || '');
    setEditDescripcion(campana.descripcion || '');
    setEditTemplateId(campana.template_id || '');
    setEditCursoExcluir(campana.curso_codigo || '');
    setEditEtiquetas(campana.audiencia_filtros?.etiquetas || []);
    setEditTipoEnvio(campana.programada_para ? 'programado' : 'manual');
    if (campana.programada_para) {
      const fecha = new Date(campana.programada_para);
      setEditFechaProgramada(fecha.toISOString().split('T')[0]);
      setEditHoraProgramada(fecha.toTimeString().slice(0, 5));
    }
    setModoEdicion(true);
  };

  const cancelarEdicion = () => {
    setModoEdicion(false);
  };

  const toggleEtiqueta = (etiquetaId: string) => {
    setEditEtiquetas(prev =>
      prev.includes(etiquetaId) ? prev.filter(e => e !== etiquetaId) : [...prev, etiquetaId]
    );
  };

  const guardarEdicion = async () => {
    if (!campana) return;
    if (!editNombre.trim()) {
      alert('El nombre es obligatorio');
      return;
    }
    if (editEtiquetas.length === 0) {
      alert('Seleccioná al menos una etiqueta');
      return;
    }

    setGuardando(true);
    try {
      const cursoData = cursosDisponibles.find(c => c.codigo === editCursoExcluir);
      const templateData = templates.find(t => t.id === editTemplateId);
      
      let programadaPara = null;
      let nuevoEstado = campana.estado;
      
      if (editTipoEnvio === 'programado' && editFechaProgramada) {
        programadaPara = `${editFechaProgramada}T${editHoraProgramada}:00`;
        if (campana.estado === 'borrador') {
          nuevoEstado = 'programada';
        }
      } else if (editTipoEnvio === 'manual' && campana.estado === 'programada') {
        nuevoEstado = 'borrador';
      }

      const { error } = await supabase
        .from('remarketing_campanas')
        .update({
          nombre: editNombre.trim(),
          descripcion: editDescripcion.trim(),
          curso_codigo: editCursoExcluir || null,
          curso_nombre: cursoData?.nombre || null,
          template_nombre: templateData?.nombre || null,
          template_id: editTemplateId || null,
          audiencia_filtros: { etiquetas: editEtiquetas },
          programada_para: programadaPara,
          estado: nuevoEstado,
          updated_at: new Date().toISOString(),
        })
        .eq('id', id);

      if (error) throw error;
      
      setModoEdicion(false);
      cargarCampana();
    } catch (error) {
      console.error('Error guardando:', error);
      alert('Error al guardar los cambios');
    } finally {
      setGuardando(false);
    }
  };

  const getNombreEtiqueta = (etiquetaId: string) => {
    return etiquetas.find(e => e.id === etiquetaId)?.nombre || etiquetaId;
  };

  const getEstadoBadge = (estado: string) => {
    const estilos: Record<string, string> = {
      borrador: 'bg-slate-100 text-slate-700 dark:bg-slate-800 dark:text-slate-300',
      programada: 'bg-blue-100 text-blue-700 dark:bg-blue-500/20 dark:text-blue-400',
      enviando: 'bg-amber-100 text-amber-700 dark:bg-amber-500/20 dark:text-amber-400',
      pausada: 'bg-orange-100 text-orange-700 dark:bg-orange-500/20 dark:text-orange-400',
      finalizada: 'bg-green-100 text-green-700 dark:bg-green-500/20 dark:text-green-400',
    };
    return estilos[estado] || estilos.borrador;
  };

  const getEstadoEnvioBadge = (estado: string) => {
    const estilos: Record<string, string> = {
      pendiente: 'bg-slate-100 text-slate-600',
      enviado: 'bg-blue-100 text-blue-600',
      entregado: 'bg-green-100 text-green-600',
      leido: 'bg-emerald-100 text-emerald-600',
      respondido: 'bg-indigo-100 text-indigo-600',
      fallido: 'bg-red-100 text-red-600',
    };
    return estilos[estado] || estilos.pendiente;
  };

  const enviarAhora = async () => {
    if (!campana) return;
    if (!confirm(`¿Enviar campaña "${campana.nombre}" a ${campana.total_elegibles} contactos?`)) return;
    
    setAccionando(true);
    try {
      const { error } = await supabase
        .from('remarketing_campanas')
        .update({ estado: 'enviando', updated_at: new Date().toISOString() })
        .eq('id', id);
      if (error) throw error;
      
      alert('Campaña iniciada. Los mensajes se enviarán en segundo plano.');
      cargarCampana();
    } catch (error) {
      console.error('Error:', error);
      alert('Error al iniciar el envío');
    } finally {
      setAccionando(false);
    }
  };

  const pausarCampana = async () => {
    if (!campana) return;
    setAccionando(true);
    try {
      const { error } = await supabase
        .from('remarketing_campanas')
        .update({ estado: 'pausada', updated_at: new Date().toISOString() })
        .eq('id', id);
      if (error) throw error;
      cargarCampana();
    } catch (error) {
      console.error('Error:', error);
      alert('Error al pausar');
    } finally {
      setAccionando(false);
    }
  };

  const reanudarCampana = async () => {
    if (!campana) return;
    setAccionando(true);
    try {
      const { error } = await supabase
        .from('remarketing_campanas')
        .update({ estado: 'enviando', updated_at: new Date().toISOString() })
        .eq('id', id);
      if (error) throw error;
      cargarCampana();
    } catch (error) {
      console.error('Error:', error);
      alert('Error al reanudar');
    } finally {
      setAccionando(false);
    }
  };

  const duplicarCampana = async () => {
    if (!campana) return;
    setAccionando(true);
    try {
      const { error } = await supabase
        .from('remarketing_campanas')
        .insert({
          nombre: `${campana.nombre} (copia)`,
          descripcion: campana.descripcion,
          curso_codigo: campana.curso_codigo,
          curso_nombre: campana.curso_nombre,
          template_nombre: campana.template_nombre,
          template_id: campana.template_id,
          audiencia_filtros: campana.audiencia_filtros,
          estado: 'borrador',
          total_audiencia: 0,
          total_excluidos: 0,
          total_elegibles: 0,
        });
      if (error) throw error;
      alert('Campaña duplicada');
      router.push('/crm/remarketing');
    } catch (error) {
      console.error('Error:', error);
      alert('Error al duplicar');
    } finally {
      setAccionando(false);
    }
  };

  const eliminarCampana = async () => {
    if (!campana) return;
    if (!confirm(`¿Eliminar campaña "${campana.nombre}"? Esta acción no se puede deshacer.`)) return;
    
    setAccionando(true);
    try {
      const { error } = await supabase
        .from('remarketing_campanas')
        .delete()
        .eq('id', id);
      if (error) throw error;
      router.push('/crm/remarketing');
    } catch (error) {
      console.error('Error:', error);
      alert('Error al eliminar');
    } finally {
      setAccionando(false);
    }
  };

  const puedeEditar = campana?.estado === 'borrador' || campana?.estado === 'programada';

  if (cargando) {
    return (
      <div className="flex-1 flex items-center justify-center bg-slate-50 dark:bg-slate-950">
        <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-indigo-600"></div>
      </div>
    );
  }

  if (!campana) return null;

  const tasaEntrega = campana.total_enviados > 0 
    ? ((campana.total_entregados / campana.total_enviados) * 100).toFixed(1) 
    : '0';
  const tasaLectura = campana.total_entregados > 0 
    ? ((campana.total_leidos / campana.total_entregados) * 100).toFixed(1) 
    : '0';
  const tasaRespuesta = campana.total_leidos > 0 
    ? ((campana.total_respondidos / campana.total_leidos) * 100).toFixed(1) 
    : '0';

  return (
    <div className="flex-1 flex flex-col h-full bg-slate-50 dark:bg-slate-950">
      {/* Header */}
      <div className="h-14 border-b border-slate-200 dark:border-slate-800 bg-white dark:bg-slate-900 flex items-center justify-between px-6">
        <div className="flex items-center gap-4">
          <Link href="/crm/remarketing" className="p-2 hover:bg-slate-100 dark:hover:bg-slate-800 rounded-lg">
            <ArrowLeft size={20} className="text-slate-600 dark:text-slate-400" />
          </Link>
          <div>
            <div className="flex items-center gap-2">
              <h1 className="text-lg font-semibold text-slate-800 dark:text-white">{campana.nombre}</h1>
              <span className={`px-2 py-0.5 rounded-full text-xs font-medium capitalize ${getEstadoBadge(campana.estado)}`}>
                {campana.estado}
              </span>
            </div>
            <p className="text-xs text-slate-500">
              Creada {new Date(campana.created_at).toLocaleDateString('es-AR')}
            </p>
          </div>
        </div>
        <div className="flex items-center gap-2">
          {modoEdicion ? (
            <>
              <button
                onClick={cancelarEdicion}
                disabled={guardando}
                className="flex items-center gap-2 px-4 py-2 border border-slate-200 dark:border-slate-700 text-slate-700 dark:text-slate-300 text-sm font-medium rounded-lg hover:bg-slate-100 dark:hover:bg-slate-800"
              >
                <X size={16} />
                Cancelar
              </button>
              <button
                onClick={guardarEdicion}
                disabled={guardando}
                className="flex items-center gap-2 px-4 py-2 bg-indigo-600 hover:bg-indigo-700 text-white text-sm font-medium rounded-lg disabled:opacity-50"
              >
                <Save size={16} />
                {guardando ? 'Guardando...' : 'Guardar cambios'}
              </button>
            </>
          ) : (
            <>
              {puedeEditar && (
                <button
                  onClick={iniciarEdicion}
                  className="flex items-center gap-2 px-4 py-2 border border-slate-200 dark:border-slate-700 text-slate-700 dark:text-slate-300 text-sm font-medium rounded-lg hover:bg-slate-100 dark:hover:bg-slate-800"
                >
                  <Edit3 size={16} />
                  Editar
                </button>
              )}
              {campana.estado === 'borrador' && (
                <button
                  onClick={enviarAhora}
                  disabled={accionando || campana.total_elegibles === 0}
                  className="flex items-center gap-2 px-4 py-2 bg-green-600 hover:bg-green-700 text-white text-sm font-medium rounded-lg disabled:opacity-50"
                >
                  <Send size={16} />
                  Enviar ahora
                </button>
              )}
              {campana.estado === 'enviando' && (
                <button
                  onClick={pausarCampana}
                  disabled={accionando}
                  className="flex items-center gap-2 px-4 py-2 bg-amber-600 hover:bg-amber-700 text-white text-sm font-medium rounded-lg disabled:opacity-50"
                >
                  <Pause size={16} />
                  Pausar
                </button>
              )}
              {campana.estado === 'pausada' && (
                <button
                  onClick={reanudarCampana}
                  disabled={accionando}
                  className="flex items-center gap-2 px-4 py-2 bg-green-600 hover:bg-green-700 text-white text-sm font-medium rounded-lg disabled:opacity-50"
                >
                  <Play size={16} />
                  Reanudar
                </button>
              )}
              <button
                onClick={duplicarCampana}
                disabled={accionando}
                className="p-2 hover:bg-slate-100 dark:hover:bg-slate-800 rounded-lg text-slate-600 dark:text-slate-400"
                title="Duplicar"
              >
                <Copy size={18} />
              </button>
              {puedeEditar && (
                <button
                  onClick={eliminarCampana}
                  disabled={accionando}
                  className="p-2 hover:bg-red-100 dark:hover:bg-red-500/20 rounded-lg text-red-600"
                  title="Eliminar"
                >
                  <Trash2 size={18} />
                </button>
              )}
            </>
          )}
        </div>
      </div>

      {/* Tabs */}
      {!modoEdicion && (
        <div className="border-b border-slate-200 dark:border-slate-800 bg-white dark:bg-slate-900 px-6">
          <div className="flex gap-6">
            <button
              onClick={() => setTabActiva('resumen')}
              className={`py-3 text-sm font-medium border-b-2 transition-colors ${
                tabActiva === 'resumen'
                  ? 'border-indigo-600 text-indigo-600'
                  : 'border-transparent text-slate-600 dark:text-slate-400 hover:text-slate-800 dark:hover:text-white'
              }`}
            >
              Resumen
            </button>
            <button
              onClick={() => setTabActiva('envios')}
              className={`py-3 text-sm font-medium border-b-2 transition-colors ${
                tabActiva === 'envios'
                  ? 'border-indigo-600 text-indigo-600'
                  : 'border-transparent text-slate-600 dark:text-slate-400 hover:text-slate-800 dark:hover:text-white'
              }`}
            >
              Envíos ({envios.length})
            </button>
          </div>
        </div>
      )}

      {/* Content */}
      <div className="flex-1 overflow-auto p-6">
        {modoEdicion ? (
          /* MODO EDICIÓN */
          <div className="max-w-4xl mx-auto space-y-6">
            {/* Información básica */}
            <div className="bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 rounded-xl p-6">
              <h2 className="text-sm font-semibold text-slate-800 dark:text-white mb-4">Información básica</h2>
              <div className="space-y-4">
                <div>
                  <label className="block text-sm font-medium text-slate-700 dark:text-slate-300 mb-1">Nombre *</label>
                  <input
                    type="text"
                    value={editNombre}
                    onChange={(e) => setEditNombre(e.target.value)}
                    className="w-full px-4 py-2 text-sm border border-slate-200 dark:border-slate-700 rounded-lg bg-white dark:bg-slate-800 text-slate-800 dark:text-white focus:outline-none focus:ring-2 focus:ring-indigo-500"
                  />
                </div>
                <div>
                  <label className="block text-sm font-medium text-slate-700 dark:text-slate-300 mb-1">Descripción</label>
                  <textarea
                    value={editDescripcion}
                    onChange={(e) => setEditDescripcion(e.target.value)}
                    rows={2}
                    className="w-full px-4 py-2 text-sm border border-slate-200 dark:border-slate-700 rounded-lg bg-white dark:bg-slate-800 text-slate-800 dark:text-white focus:outline-none focus:ring-2 focus:ring-indigo-500 resize-none"
                  />
                </div>
              </div>
            </div>

            {/* Audiencia */}
            <div className="bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 rounded-xl p-6">
              <h2 className="text-sm font-semibold text-slate-800 dark:text-white mb-4 flex items-center gap-2">
                <Users size={16} />
                Audiencia
              </h2>
              <div className="space-y-4">
                <div>
                  <label className="block text-sm font-medium text-slate-700 dark:text-slate-300 mb-2">Etiquetas *</label>
                  <div className="flex flex-wrap gap-2">
                    {etiquetas.map((etiqueta) => (
                      <button
                        key={etiqueta.id}
                        onClick={() => toggleEtiqueta(etiqueta.id)}
                        className={`px-3 py-1.5 rounded-full text-sm font-medium transition-colors ${
                          editEtiquetas.includes(etiqueta.id)
                            ? 'bg-indigo-600 text-white'
                            : 'bg-slate-100 dark:bg-slate-800 text-slate-700 dark:text-slate-300 hover:bg-slate-200 dark:hover:bg-slate-700'
                        }`}
                      >
                        {etiqueta.nombre}
                      </button>
                    ))}
                  </div>
                </div>
                <div>
                  <label className="block text-sm font-medium text-slate-700 dark:text-slate-300 mb-1">Excluir inscriptos en curso</label>
                  <select
                    value={editCursoExcluir}
                    onChange={(e) => setEditCursoExcluir(e.target.value)}
                    className="w-full px-4 py-2 text-sm border border-slate-200 dark:border-slate-700 rounded-lg bg-white dark:bg-slate-800 text-slate-800 dark:text-white focus:outline-none focus:ring-2 focus:ring-indigo-500"
                  >
                    <option value="">No excluir ningún curso</option>
                    {cursosDisponibles.map((curso) => (
                      <option key={curso.codigo} value={curso.codigo}>{curso.nombre}</option>
                    ))}
                  </select>
                </div>
              </div>
            </div>

            {/* Template */}
            <div className="bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 rounded-xl p-6">
              <h2 className="text-sm font-semibold text-slate-800 dark:text-white mb-4">Template de WhatsApp</h2>
              <select
                value={editTemplateId}
                onChange={(e) => setEditTemplateId(e.target.value)}
                className="w-full px-4 py-2 text-sm border border-slate-200 dark:border-slate-700 rounded-lg bg-white dark:bg-slate-800 text-slate-800 dark:text-white focus:outline-none focus:ring-2 focus:ring-indigo-500"
              >
                <option value="">Seleccionar template...</option>
                {templates.map((template) => (
                  <option key={template.id} value={template.id}>{template.nombre}</option>
                ))}
              </select>
            </div>

            {/* Tipo de envío */}
            <div className="bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 rounded-xl p-6">
              <h2 className="text-sm font-semibold text-slate-800 dark:text-white mb-4">Tipo de envío</h2>
              <div className="grid grid-cols-2 gap-4 mb-4">
                <button
                  onClick={() => setEditTipoEnvio('manual')}
                  className={`p-4 rounded-lg border-2 transition-colors ${
                    editTipoEnvio === 'manual' ? 'border-indigo-600 bg-indigo-50 dark:bg-indigo-500/10' : 'border-slate-200 dark:border-slate-700'
                  }`}
                >
                  <Send size={24} className={editTipoEnvio === 'manual' ? 'text-indigo-600 mb-2' : 'text-slate-400 mb-2'} />
                  <p className={`font-medium ${editTipoEnvio === 'manual' ? 'text-indigo-600' : 'text-slate-700 dark:text-slate-300'}`}>Envío manual</p>
                  <p className="text-xs text-slate-500 mt-1">Enviás cuando quieras</p>
                </button>
                <button
                  onClick={() => setEditTipoEnvio('programado')}
                  className={`p-4 rounded-lg border-2 transition-colors ${
                    editTipoEnvio === 'programado' ? 'border-indigo-600 bg-indigo-50 dark:bg-indigo-500/10' : 'border-slate-200 dark:border-slate-700'
                  }`}
                >
                  <Clock size={24} className={editTipoEnvio === 'programado' ? 'text-indigo-600 mb-2' : 'text-slate-400 mb-2'} />
                  <p className={`font-medium ${editTipoEnvio === 'programado' ? 'text-indigo-600' : 'text-slate-700 dark:text-slate-300'}`}>Programar envío</p>
                  <p className="text-xs text-slate-500 mt-1">Se envía automáticamente</p>
                </button>
              </div>
              {editTipoEnvio === 'programado' && (
                <div className="grid grid-cols-2 gap-4 p-4 bg-slate-50 dark:bg-slate-800 rounded-lg">
                  <div>
                    <label className="block text-sm font-medium text-slate-700 dark:text-slate-300 mb-1">Fecha</label>
                    <input
                      type="date"
                      value={editFechaProgramada}
                      onChange={(e) => setEditFechaProgramada(e.target.value)}
                      min={new Date().toISOString().split('T')[0]}
                      className="w-full px-4 py-2 text-sm border border-slate-200 dark:border-slate-700 rounded-lg bg-white dark:bg-slate-900 text-slate-800 dark:text-white focus:outline-none focus:ring-2 focus:ring-indigo-500"
                    />
                  </div>
                  <div>
                    <label className="block text-sm font-medium text-slate-700 dark:text-slate-300 mb-1">Hora</label>
                    <input
                      type="time"
                      value={editHoraProgramada}
                      onChange={(e) => setEditHoraProgramada(e.target.value)}
                      className="w-full px-4 py-2 text-sm border border-slate-200 dark:border-slate-700 rounded-lg bg-white dark:bg-slate-900 text-slate-800 dark:text-white focus:outline-none focus:ring-2 focus:ring-indigo-500"
                    />
                  </div>
                </div>
              )}
            </div>
          </div>
        ) : tabActiva === 'resumen' ? (
          /* TAB RESUMEN */
          <div className="max-w-4xl mx-auto space-y-6">
            {/* Métricas principales */}
            <div className="grid grid-cols-4 gap-4">
              <div className="bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 rounded-xl p-4">
                <p className="text-2xl font-bold text-slate-800 dark:text-white">{campana.total_elegibles.toLocaleString()}</p>
                <p className="text-sm text-slate-500">Elegibles</p>
              </div>
              <div className="bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 rounded-xl p-4">
                <p className="text-2xl font-bold text-blue-600">{campana.total_enviados.toLocaleString()}</p>
                <p className="text-sm text-slate-500">Enviados</p>
              </div>
              <div className="bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 rounded-xl p-4">
                <p className="text-2xl font-bold text-green-600">{tasaEntrega}%</p>
                <p className="text-sm text-slate-500">Entregados</p>
              </div>
              <div className="bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 rounded-xl p-4">
                <p className="text-2xl font-bold text-emerald-600">{tasaLectura}%</p>
                <p className="text-sm text-slate-500">Leídos</p>
              </div>
            </div>

            {/* Detalles */}
            <div className="grid grid-cols-2 gap-6">
              {/* Configuración */}
              <div className="bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 rounded-xl p-6">
                <h3 className="text-sm font-semibold text-slate-800 dark:text-white mb-4">Configuración</h3>
                <div className="space-y-3 text-sm">
                  {campana.descripcion && (
                    <div>
                      <span className="text-slate-500">Descripción:</span>
                      <p className="text-slate-800 dark:text-white">{campana.descripcion}</p>
                    </div>
                  )}
                  <div className="flex justify-between">
                    <span className="text-slate-500">Template:</span>
                    <span className="text-slate-800 dark:text-white">{campana.template_nombre || 'No seleccionado'}</span>
                  </div>
                  <div className="flex justify-between">
                    <span className="text-slate-500">Curso excluido:</span>
                    <span className="text-slate-800 dark:text-white">{campana.curso_nombre || 'Ninguno'}</span>
                  </div>
                  {campana.programada_para && (
                    <div className="flex justify-between">
                      <span className="text-slate-500">Programada para:</span>
                      <span className="text-slate-800 dark:text-white">
                        {new Date(campana.programada_para).toLocaleString('es-AR')}
                      </span>
                    </div>
                  )}
                </div>
              </div>

              {/* Audiencia */}
              <div className="bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 rounded-xl p-6">
                <h3 className="text-sm font-semibold text-slate-800 dark:text-white mb-4">Audiencia</h3>
                <div className="space-y-3">
                  <div>
                    <span className="text-sm text-slate-500">Etiquetas seleccionadas:</span>
                    <div className="flex flex-wrap gap-2 mt-2">
                      {campana.audiencia_filtros?.etiquetas?.map((etId) => (
                        <span
                          key={etId}
                          className="px-2 py-1 bg-indigo-100 dark:bg-indigo-500/20 text-indigo-700 dark:text-indigo-400 text-xs rounded-full"
                        >
                          {getNombreEtiqueta(etId)}
                        </span>
                      ))}
                    </div>
                  </div>
                  <div className="grid grid-cols-3 gap-2 pt-3 border-t border-slate-100 dark:border-slate-800">
                    <div className="text-center">
                      <p className="text-lg font-semibold text-slate-800 dark:text-white">{campana.total_audiencia}</p>
                      <p className="text-xs text-slate-500">Total</p>
                    </div>
                    <div className="text-center">
                      <p className="text-lg font-semibold text-red-600">-{campana.total_excluidos}</p>
                      <p className="text-xs text-slate-500">Excluidos</p>
                    </div>
                    <div className="text-center">
                      <p className="text-lg font-semibold text-green-600">{campana.total_elegibles}</p>
                      <p className="text-xs text-slate-500">Elegibles</p>
                    </div>
                  </div>
                </div>
              </div>
            </div>

            {/* Métricas detalladas */}
            {campana.estado !== 'borrador' && (
              <div className="bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 rounded-xl p-6">
                <div className="flex items-center justify-between mb-4">
                  <h3 className="text-sm font-semibold text-slate-800 dark:text-white">Métricas de envío</h3>
                  <button
                    onClick={cargarCampana}
                    className="p-2 hover:bg-slate-100 dark:hover:bg-slate-800 rounded-lg text-slate-500"
                    title="Actualizar"
                  >
                    <RefreshCw size={16} />
                  </button>
                </div>
                <div className="grid grid-cols-6 gap-4 text-center">
                  <div>
                    <p className="text-xl font-bold text-slate-800 dark:text-white">{campana.total_enviados}</p>
                    <p className="text-xs text-slate-500">Enviados</p>
                  </div>
                  <div>
                    <p className="text-xl font-bold text-green-600">{campana.total_entregados}</p>
                    <p className="text-xs text-slate-500">Entregados</p>
                  </div>
                  <div>
                    <p className="text-xl font-bold text-emerald-600">{campana.total_leidos}</p>
                    <p className="text-xs text-slate-500">Leídos</p>
                  </div>
                  <div>
                    <p className="text-xl font-bold text-indigo-600">{campana.total_respondidos}</p>
                    <p className="text-xs text-slate-500">Respondidos</p>
                  </div>
                  <div>
                    <p className="text-xl font-bold text-red-600">{campana.total_fallidos}</p>
                    <p className="text-xs text-slate-500">Fallidos</p>
                  </div>
                  <div>
                    <p className="text-xl font-bold text-slate-600">{tasaRespuesta}%</p>
                    <p className="text-xs text-slate-500">Tasa respuesta</p>
                  </div>
                </div>
              </div>
            )}
          </div>
        ) : (
          /* TAB ENVÍOS */
          <div className="max-w-6xl mx-auto">
            <div className="bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 rounded-xl overflow-hidden">
              <table className="w-full">
                <thead className="bg-slate-50 dark:bg-slate-800">
                  <tr>
                    <th className="px-4 py-3 text-left text-xs font-medium text-slate-500 uppercase">Teléfono</th>
                    <th className="px-4 py-3 text-left text-xs font-medium text-slate-500 uppercase">Estado</th>
                    <th className="px-4 py-3 text-left text-xs font-medium text-slate-500 uppercase">Enviado</th>
                    <th className="px-4 py-3 text-left text-xs font-medium text-slate-500 uppercase">Entregado</th>
                    <th className="px-4 py-3 text-left text-xs font-medium text-slate-500 uppercase">Leído</th>
                    <th className="px-4 py-3 text-left text-xs font-medium text-slate-500 uppercase">Error</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-slate-100 dark:divide-slate-800">
                  {envios.length === 0 ? (
                    <tr>
                      <td colSpan={6} className="px-4 py-8 text-center text-slate-500">
                        No hay envíos registrados
                      </td>
                    </tr>
                  ) : (
                    envios.map((envio) => (
                      <tr key={envio.id} className="hover:bg-slate-50 dark:hover:bg-slate-800/50">
                        <td className="px-4 py-3 text-sm text-slate-800 dark:text-white font-mono">
                          {envio.telefono}
                        </td>
                        <td className="px-4 py-3">
                          <span className={`px-2 py-0.5 rounded-full text-xs font-medium capitalize ${getEstadoEnvioBadge(envio.estado)}`}>
                            {envio.estado}
                          </span>
                        </td>
                        <td className="px-4 py-3 text-sm text-slate-500">
                          {envio.enviado_at ? new Date(envio.enviado_at).toLocaleString('es-AR') : '-'}
                        </td>
                        <td className="px-4 py-3 text-sm text-slate-500">
                          {envio.entregado_at ? new Date(envio.entregado_at).toLocaleString('es-AR') : '-'}
                        </td>
                        <td className="px-4 py-3 text-sm text-slate-500">
                          {envio.leido_at ? new Date(envio.leido_at).toLocaleString('es-AR') : '-'}
                        </td>
                        <td className="px-4 py-3 text-sm text-red-500 max-w-[200px] truncate">
                          {envio.error_mensaje || '-'}
                        </td>
                      </tr>
                    ))
                  )}
                </tbody>
              </table>
            </div>
          </div>
        )}
      </div>
    </div>
  );
}
