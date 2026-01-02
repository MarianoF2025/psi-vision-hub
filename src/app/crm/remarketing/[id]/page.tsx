'use client';

import { useState, useEffect } from 'react';
import { supabase } from '@/lib/supabase';
import { useRouter, useParams } from 'next/navigation';
import { ArrowLeft, Save, Send, Clock, Users, Filter, Target, Trash2, Play, Pause, RefreshCw } from 'lucide-react';
import Link from 'next/link';

interface Curso {
  id: string;
  codigo: string;
  nombre: string;
}

interface Template {
  id: string;
  nombre: string;
  categoria: string;
}

interface Campana {
  id: string;
  nombre: string;
  descripcion: string | null;
  curso_codigo: string | null;
  curso_nombre: string | null;
  template_nombre: string | null;
  template_id: string | null;
  audiencia_filtros: {
    curso_id?: string | null;
    segmentos?: string[];
    dias_antiguedad?: number | null;
    excluir_inscriptos?: boolean;
  } | null;
  estado: string;
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

type Segmento = 'abandono_menu' | 'derivado_sin_cierre' | 'no_responde' | 'perdido_recuperable' | 'multi_interes';

const SEGMENTOS: { id: Segmento; nombre: string; descripcion: string; icono: string }[] = [
  { id: 'abandono_menu', nombre: 'Abandonó menú', descripcion: 'Consultó el curso pero no pidió hablar con vendedora', icono: '🔴' },
  { id: 'derivado_sin_cierre', nombre: 'Derivado sin cierre', descripcion: 'Habló con vendedora pero no se inscribió', icono: '🟡' },
  { id: 'no_responde', nombre: 'No responde', descripcion: 'Intentamos contactar pero no contesta', icono: '⚫' },
  { id: 'perdido_recuperable', nombre: 'Perdido recuperable', descripcion: 'Dijo que no, hace más de 30 días', icono: '🔵' },
  { id: 'multi_interes', nombre: 'Multi-interés', descripcion: 'Consultó 2 o más cursos (indeciso)', icono: '🟣' },
];

const ESTADO_CONFIG: Record<string, { color: string; bg: string; label: string }> = {
  borrador: { color: 'text-slate-600', bg: 'bg-slate-100', label: 'Borrador' },
  programada: { color: 'text-blue-600', bg: 'bg-blue-100', label: 'Programada' },
  enviando: { color: 'text-amber-600', bg: 'bg-amber-100', label: 'Enviando' },
  pausada: { color: 'text-orange-600', bg: 'bg-orange-100', label: 'Pausada' },
  finalizada: { color: 'text-green-600', bg: 'bg-green-100', label: 'Finalizada' },
};

export default function EditarCampanaPage() {
  const router = useRouter();
  const params = useParams();
  const id = params.id as string;

  const [cargando, setCargando] = useState(true);
  const [guardando, setGuardando] = useState(false);
  const [cursos, setCursos] = useState<Curso[]>([]);
  const [templates, setTemplates] = useState<Template[]>([]);
  const [calculando, setCalculando] = useState(false);

  const [campana, setCampana] = useState<Campana | null>(null);
  const [nombre, setNombre] = useState('');
  const [descripcion, setDescripcion] = useState('');
  const [cursoId, setCursoId] = useState('');
  const [segmentosSeleccionados, setSegmentosSeleccionados] = useState<Segmento[]>([]);
  const [templateSeleccionado, setTemplateSeleccionado] = useState('');
  const [diasAntiguedad, setDiasAntiguedad] = useState<number | null>(null);
  const [excluirInscriptos, setExcluirInscriptos] = useState(true);
  const [tipoEnvio, setTipoEnvio] = useState<'manual' | 'programado'>('manual');
  const [fechaProgramada, setFechaProgramada] = useState('');
  const [horaProgramada, setHoraProgramada] = useState('09:00');

  const [totalAudiencia, setTotalAudiencia] = useState(0);
  const [totalExcluidos, setTotalExcluidos] = useState(0);
  const [totalElegibles, setTotalElegibles] = useState(0);
  const [previewCalculado, setPreviewCalculado] = useState(false);
  const [contactosElegibles, setContactosElegibles] = useState<string[]>([]);

  useEffect(() => {
    if (id) cargarDatos();
  }, [id]);

  const cargarDatos = async () => {
    setCargando(true);

    const { data: campanaData } = await supabase
      .from('remarketing_campanas')
      .select('*')
      .eq('id', id)
      .single();

    if (campanaData) {
      setCampana(campanaData);
      setNombre(campanaData.nombre);
      setDescripcion(campanaData.descripcion || '');
      setTemplateSeleccionado(campanaData.template_id || '');
      setTotalAudiencia(campanaData.total_audiencia || 0);
      setTotalExcluidos(campanaData.total_excluidos || 0);
      setTotalElegibles(campanaData.total_elegibles || 0);

      if (campanaData.audiencia_filtros) {
        setCursoId(campanaData.audiencia_filtros.curso_id || '');
        setSegmentosSeleccionados(campanaData.audiencia_filtros.segmentos || []);
        setDiasAntiguedad(campanaData.audiencia_filtros.dias_antiguedad || null);
        setExcluirInscriptos(campanaData.audiencia_filtros.excluir_inscriptos !== false);
      }

      if (campanaData.programada_para) {
        setTipoEnvio('programado');
        const fecha = new Date(campanaData.programada_para);
        setFechaProgramada(fecha.toISOString().split('T')[0]);
        setHoraProgramada(fecha.toTimeString().slice(0, 5));
      }

      if (campanaData.total_elegibles > 0) setPreviewCalculado(true);
    }

    const { data: cursosData } = await supabase
      .from('cursos')
      .select('id, codigo, nombre')
      .eq('activo', true)
      .order('nombre');
    if (cursosData) setCursos(cursosData);

    const { data: templatesData } = await supabase
      .from('remarketing_templates')
      .select('*')
      .eq('estado', 'activo')
      .order('nombre');
    if (templatesData) setTemplates(templatesData);

    setCargando(false);
  };

  const toggleSegmento = (seg: Segmento) => {
    setSegmentosSeleccionados(prev =>
      prev.includes(seg)
        ? prev.filter(s => s !== seg)
        : [...prev, seg]
    );
  };

  const obtenerTelefonosSegmento = async (seg: Segmento): Promise<string[]> => {
    switch (seg) {
      case 'abandono_menu': {
        const { data } = await supabase
          .from('menu_interacciones')
          .select('telefono')
          .eq('curso_id', cursoId)
          .eq('derivado', false);
        return [...new Set(data?.map(d => d.telefono) || [])];
      }
      case 'derivado_sin_cierre': {
        const { data: derivados } = await supabase
          .from('menu_interacciones')
          .select('telefono')
          .eq('curso_id', cursoId)
          .eq('derivado', true);
        const telefonosDerivados = [...new Set(derivados?.map(d => d.telefono) || [])];
        if (telefonosDerivados.length === 0) return [];
        const { data: contactos } = await supabase
          .from('contactos')
          .select('telefono, resultado')
          .in('telefono', telefonosDerivados);
        return contactos?.filter(c => c.resultado !== 'INS').map(c => c.telefono) || [];
      }
      case 'no_responde': {
        const { data: interacciones } = await supabase
          .from('menu_interacciones')
          .select('telefono')
          .eq('curso_id', cursoId);
        const telefonosInteraccion = [...new Set(interacciones?.map(d => d.telefono) || [])];
        if (telefonosInteraccion.length === 0) return [];
        const { data: contactos } = await supabase
          .from('contactos')
          .select('telefono')
          .in('telefono', telefonosInteraccion)
          .eq('estado_lead', 'no_responde');
        return contactos?.map(c => c.telefono) || [];
      }
      case 'perdido_recuperable': {
        const hace30Dias = new Date();
        hace30Dias.setDate(hace30Dias.getDate() - 30);
        const { data: interacciones } = await supabase
          .from('menu_interacciones')
          .select('telefono')
          .eq('curso_id', cursoId);
        const telefonosInteraccion = [...new Set(interacciones?.map(d => d.telefono) || [])];
        if (telefonosInteraccion.length === 0) return [];
        const { data: contactos } = await supabase
          .from('contactos')
          .select('telefono')
          .in('telefono', telefonosInteraccion)
          .or('estado_lead.eq.perdido,resultado.eq.perdido')
          .lt('resultado_ts', hace30Dias.toISOString());
        return contactos?.map(c => c.telefono) || [];
      }
      case 'multi_interes': {
        const { data } = await supabase
          .from('menu_interacciones')
          .select('telefono, curso_id');
        const porTelefono: Record<string, Set<string>> = {};
        data?.forEach(d => {
          if (!porTelefono[d.telefono]) porTelefono[d.telefono] = new Set();
          porTelefono[d.telefono].add(d.curso_id);
        });
        return Object.entries(porTelefono)
          .filter(([_, cursos]) => cursos.size > 1)
          .map(([telefono]) => telefono);
      }
      default:
        return [];
    }
  };

  const calcularElegibles = async () => {
    const necesitaCurso = segmentosSeleccionados.some(s => s !== 'multi_interes');
    if (necesitaCurso && !cursoId) {
      alert('Seleccioná un curso objetivo');
      return;
    }
    if (segmentosSeleccionados.length === 0) {
      alert('Seleccioná al menos un segmento de audiencia');
      return;
    }

    setCalculando(true);
    setPreviewCalculado(false);

    try {
      const telefonosPorSegmento = await Promise.all(
        segmentosSeleccionados.map(seg => obtenerTelefonosSegmento(seg))
      );

      let telefonosAudiencia = [...new Set(telefonosPorSegmento.flat())];
      let telefonosExcluir: string[] = [];

      if (diasAntiguedad && telefonosAudiencia.length > 0) {
        const fechaLimite = new Date();
        fechaLimite.setDate(fechaLimite.getDate() - diasAntiguedad);
        const { data: recientes } = await supabase
          .from('menu_interacciones')
          .select('telefono')
          .in('telefono', telefonosAudiencia)
          .gte('created_at', fechaLimite.toISOString());
        telefonosAudiencia = [...new Set(recientes?.map(d => d.telefono) || [])];
      }

      if (excluirInscriptos && telefonosAudiencia.length > 0) {
        const { data: inscriptos } = await supabase
          .from('contactos')
          .select('telefono')
          .in('telefono', telefonosAudiencia)
          .eq('resultado', 'INS');
        telefonosExcluir = inscriptos?.map(c => c.telefono) || [];
      }

      const elegibles = telefonosAudiencia.filter(t => !telefonosExcluir.includes(t));
      setTotalAudiencia(telefonosAudiencia.length);
      setTotalExcluidos(telefonosExcluir.length);
      setTotalElegibles(elegibles.length);
      setContactosElegibles(elegibles);
      setPreviewCalculado(true);
    } catch (error) {
      console.error('Error calculando elegibles:', error);
      alert('Error al calcular audiencia');
    } finally {
      setCalculando(false);
    }
  };

  const guardarCampana = async () => {
    if (!nombre.trim()) {
      alert('Ingresá un nombre para la campaña');
      return;
    }
    if (segmentosSeleccionados.length === 0) {
      alert('Seleccioná al menos un segmento');
      return;
    }

    setGuardando(true);
    try {
      const cursoData = cursos.find(c => c.id === cursoId);
      const templateData = templates.find(t => t.id === templateSeleccionado);

      let programadaPara = null;
      if (tipoEnvio === 'programado' && fechaProgramada) {
        programadaPara = `${fechaProgramada}T${horaProgramada}:00`;
      }

      const { error } = await supabase
        .from('remarketing_campanas')
        .update({
          nombre: nombre.trim(),
          descripcion: descripcion.trim() || null,
          curso_codigo: cursoData?.codigo || null,
          curso_nombre: cursoData?.nombre || null,
          template_nombre: templateData?.nombre || null,
          template_id: templateSeleccionado || null,
          audiencia_filtros: {
            curso_id: cursoId || null,
            segmentos: segmentosSeleccionados,
            dias_antiguedad: diasAntiguedad,
            excluir_inscriptos: excluirInscriptos
          },
          programada_para: programadaPara,
          total_audiencia: totalAudiencia,
          total_excluidos: totalExcluidos,
          total_elegibles: totalElegibles,
          updated_at: new Date().toISOString()
        })
        .eq('id', id);

      if (error) throw error;
      alert('Campaña guardada');
      cargarDatos();
    } catch (error) {
      console.error('Error guardando campaña:', error);
      alert('Error al guardar la campaña');
    } finally {
      setGuardando(false);
    }
  };

  const enviarCampana = async () => {
    if (!previewCalculado || totalElegibles === 0) {
      alert('Calculá los elegibles antes de enviar');
      return;
    }
    if (!confirm(`¿Enviar campaña "${nombre}" a ${totalElegibles} contactos?`)) return;

    setGuardando(true);
    try {
      await guardarCampana();

      if (contactosElegibles.length > 0) {
        const { data: contactosData } = await supabase
          .from('contactos')
          .select('id, telefono')
          .in('telefono', contactosElegibles);

        const envios = contactosData?.map(c => ({
          campana_id: id,
          contacto_id: c.id,
          telefono: c.telefono,
          estado: 'pendiente'
        })) || [];

        if (envios.length > 0) {
          await supabase.from('remarketing_envios').insert(envios);
        }
      }

      await supabase
        .from('remarketing_campanas')
        .update({ estado: 'enviando' })
        .eq('id', id);

      alert(`Campaña enviándose a ${totalElegibles} contactos`);
      router.push('/crm/remarketing');
    } catch (error) {
      console.error('Error enviando:', error);
      alert('Error al enviar campaña');
    } finally {
      setGuardando(false);
    }
  };

  const eliminarCampana = async () => {
    if (!confirm('¿Eliminar esta campaña? Esta acción no se puede deshacer.')) return;
    try {
      await supabase.from('remarketing_envios').delete().eq('campana_id', id);
      await supabase.from('remarketing_campanas').delete().eq('id', id);
      router.push('/crm/remarketing');
    } catch (error) {
      console.error('Error eliminando:', error);
      alert('Error al eliminar campaña');
    }
  };

  const pausarReanudar = async () => {
    if (!campana) return;
    const nuevoEstado = campana.estado === 'pausada' ? 'enviando' : 'pausada';
    await supabase.from('remarketing_campanas').update({ estado: nuevoEstado }).eq('id', id);
    cargarDatos();
  };

  useEffect(() => {
    setPreviewCalculado(false);
  }, [cursoId, segmentosSeleccionados, diasAntiguedad, excluirInscriptos]);

  if (cargando) {
    return (
      <div className="flex-1 flex items-center justify-center bg-slate-50 dark:bg-slate-950">
        <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-purple-600"></div>
      </div>
    );
  }

  if (!campana) {
    return (
      <div className="flex-1 flex items-center justify-center bg-slate-50 dark:bg-slate-950">
        <p className="text-slate-500">Campaña no encontrada</p>
      </div>
    );
  }

  const estadoConfig = ESTADO_CONFIG[campana.estado] || ESTADO_CONFIG.borrador;
  const puedeEditar = ['borrador', 'pausada', 'programada'].includes(campana.estado);

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
              <span className={`px-2 py-0.5 rounded-full text-xs font-medium ${estadoConfig.bg} ${estadoConfig.color}`}>
                {estadoConfig.label}
              </span>
            </div>
            <p className="text-xs text-slate-500">Editar campaña</p>
          </div>
        </div>
        <div className="flex items-center gap-2">
          {puedeEditar && (
            <button onClick={eliminarCampana} className="flex items-center gap-2 px-3 py-2 text-red-600 hover:bg-red-50 dark:hover:bg-red-500/10 text-sm font-medium rounded-lg">
              <Trash2 size={16} />
              Eliminar
            </button>
          )}
          {campana.estado === 'enviando' && (
            <button onClick={pausarReanudar} className="flex items-center gap-2 px-4 py-2 bg-orange-600 hover:bg-orange-700 text-white text-sm font-medium rounded-lg">
              <Pause size={16} />
              Pausar
            </button>
          )}
          {campana.estado === 'pausada' && (
            <button onClick={pausarReanudar} className="flex items-center gap-2 px-4 py-2 bg-green-600 hover:bg-green-700 text-white text-sm font-medium rounded-lg">
              <Play size={16} />
              Reanudar
            </button>
          )}
          {puedeEditar && (
            <button onClick={guardarCampana} disabled={guardando} className="flex items-center gap-2 px-4 py-2 border border-slate-200 dark:border-slate-700 text-slate-700 dark:text-slate-300 text-sm font-medium rounded-lg hover:bg-slate-100 dark:hover:bg-slate-800 disabled:opacity-50">
              <Save size={16} />
              Guardar
            </button>
          )}
        </div>
      </div>

      {/* Content */}
      <div className="flex-1 overflow-auto p-6">
        <div className="max-w-4xl mx-auto space-y-6">

          {/* Métricas */}
          {campana.total_enviados > 0 && (
            <div className="bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 rounded-xl p-6">
              <h2 className="text-sm font-semibold text-slate-800 dark:text-white mb-4">Métricas de envío</h2>
              <div className="grid grid-cols-5 gap-4">
                <div className="text-center">
                  <p className="text-2xl font-bold text-slate-800 dark:text-white">{campana.total_enviados}</p>
                  <p className="text-xs text-slate-500">Enviados</p>
                </div>
                <div className="text-center">
                  <p className="text-2xl font-bold text-green-600">{campana.total_entregados}</p>
                  <p className="text-xs text-slate-500">Entregados</p>
                </div>
                <div className="text-center">
                  <p className="text-2xl font-bold text-blue-600">{campana.total_leidos}</p>
                  <p className="text-xs text-slate-500">Leídos</p>
                </div>
                <div className="text-center">
                  <p className="text-2xl font-bold text-purple-600">{campana.total_respondidos}</p>
                  <p className="text-xs text-slate-500">Respondidos</p>
                </div>
                <div className="text-center">
                  <p className="text-2xl font-bold text-red-600">{campana.total_fallidos}</p>
                  <p className="text-xs text-slate-500">Fallidos</p>
                </div>
              </div>
            </div>
          )}

          {/* Información básica */}
          <div className="bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 rounded-xl p-6">
            <h2 className="text-sm font-semibold text-slate-800 dark:text-white mb-4">Información básica</h2>
            <div className="space-y-4">
              <div>
                <label className="block text-sm font-medium text-slate-700 dark:text-slate-300 mb-1">Nombre *</label>
                <input
                  type="text"
                  value={nombre}
                  onChange={(e) => setNombre(e.target.value)}
                  disabled={!puedeEditar}
                  className="w-full px-4 py-2 text-sm border border-slate-200 dark:border-slate-700 rounded-lg bg-white dark:bg-slate-800 text-slate-800 dark:text-white disabled:opacity-50"
                />
              </div>
              <div>
                <label className="block text-sm font-medium text-slate-700 dark:text-slate-300 mb-1">Descripción</label>
                <textarea
                  value={descripcion}
                  onChange={(e) => setDescripcion(e.target.value)}
                  disabled={!puedeEditar}
                  rows={2}
                  className="w-full px-4 py-2 text-sm border border-slate-200 dark:border-slate-700 rounded-lg bg-white dark:bg-slate-800 text-slate-800 dark:text-white resize-none disabled:opacity-50"
                />
              </div>
            </div>
          </div>

          {/* Curso objetivo */}
          <div className="bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 rounded-xl p-6">
            <h2 className="text-sm font-semibold text-slate-800 dark:text-white mb-4 flex items-center gap-2">
              <Target size={16} />
              Curso objetivo
            </h2>
            <select
              value={cursoId}
              onChange={(e) => setCursoId(e.target.value)}
              disabled={!puedeEditar}
              className="w-full px-4 py-2 text-sm border border-slate-200 dark:border-slate-700 rounded-lg bg-white dark:bg-slate-800 text-slate-800 dark:text-white disabled:opacity-50"
            >
              <option value="">Seleccionar curso...</option>
              {cursos.map((curso) => (
                <option key={curso.id} value={curso.id}>{curso.nombre} ({curso.codigo})</option>
              ))}
            </select>
            <p className="text-xs text-slate-500 mt-2">No requerido si solo usás "Multi-interés"</p>
          </div>

          {/* Segmentos - MÚLTIPLE */}
          <div className="bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 rounded-xl p-6">
            <h2 className="text-sm font-semibold text-slate-800 dark:text-white mb-4 flex items-center gap-2">
              <Users size={16} />
              Segmentos de audiencia *
              <span className="text-xs font-normal text-slate-500">(podés seleccionar varios)</span>
            </h2>
            <div className="grid gap-3">
              {SEGMENTOS.map((seg) => {
                const isSelected = segmentosSeleccionados.includes(seg.id);
                return (
                  <button
                    key={seg.id}
                    onClick={() => puedeEditar && toggleSegmento(seg.id)}
                    disabled={!puedeEditar}
                    className={`w-full p-4 rounded-lg border-2 text-left transition-all disabled:cursor-not-allowed ${
                      isSelected
                        ? 'border-purple-500 bg-purple-50 dark:bg-purple-500/10'
                        : 'border-slate-200 dark:border-slate-700 hover:border-slate-300'
                    }`}
                  >
                    <div className="flex items-start gap-3">
                      <span className="text-xl">{seg.icono}</span>
                      <div className="flex-1">
                        <p className={`font-medium ${isSelected ? 'text-purple-700 dark:text-purple-300' : 'text-slate-700 dark:text-slate-300'}`}>
                          {seg.nombre}
                        </p>
                        <p className="text-xs text-slate-500 mt-0.5">{seg.descripcion}</p>
                      </div>
                      <div className={`w-5 h-5 rounded border-2 flex items-center justify-center transition-colors ${
                        isSelected ? 'bg-purple-500 border-purple-500' : 'border-slate-300 dark:border-slate-600'
                      }`}>
                        {isSelected && (
                          <svg className="w-3 h-3 text-white" fill="currentColor" viewBox="0 0 20 20">
                            <path fillRule="evenodd" d="M16.707 5.293a1 1 0 010 1.414l-8 8a1 1 0 01-1.414 0l-4-4a1 1 0 011.414-1.414L8 12.586l7.293-7.293a1 1 0 011.414 0z" clipRule="evenodd" />
                          </svg>
                        )}
                      </div>
                    </div>
                  </button>
                );
              })}
            </div>
            {segmentosSeleccionados.length > 1 && (
              <p className="text-xs text-purple-600 dark:text-purple-400 mt-3">
                ✓ Se unirán los contactos de {segmentosSeleccionados.length} segmentos (sin duplicados)
              </p>
            )}
          </div>

          {/* Filtros */}
          <div className="bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 rounded-xl p-6">
            <h2 className="text-sm font-semibold text-slate-800 dark:text-white mb-4 flex items-center gap-2">
              <Filter size={16} />
              Filtros adicionales
            </h2>
            <div className="space-y-4">
              <label className="flex items-center gap-3 cursor-pointer">
                <input
                  type="checkbox"
                  checked={excluirInscriptos}
                  onChange={(e) => setExcluirInscriptos(e.target.checked)}
                  disabled={!puedeEditar}
                  className="w-4 h-4 rounded border-slate-300 text-purple-600 focus:ring-purple-500"
                />
                <div>
                  <span className="text-sm font-medium text-slate-700 dark:text-slate-300">Excluir ya inscriptos</span>
                  <p className="text-xs text-slate-500">No enviar a quienes ya tienen resultado = INS</p>
                </div>
              </label>
              <div>
                <label className="block text-sm font-medium text-slate-700 dark:text-slate-300 mb-1">Solo últimos X días</label>
                <div className="flex items-center gap-2">
                  <input
                    type="number"
                    value={diasAntiguedad || ''}
                    onChange={(e) => setDiasAntiguedad(e.target.value ? parseInt(e.target.value) : null)}
                    disabled={!puedeEditar}
                    placeholder="Sin límite"
                    min={1}
                    className="w-32 px-4 py-2 text-sm border border-slate-200 dark:border-slate-700 rounded-lg bg-white dark:bg-slate-800 text-slate-800 dark:text-white disabled:opacity-50"
                  />
                  <span className="text-sm text-slate-500">días</span>
                </div>
              </div>
            </div>

            {puedeEditar && (
              <div className="mt-6 pt-4 border-t border-slate-100 dark:border-slate-800">
                <button
                  onClick={calcularElegibles}
                  disabled={calculando || segmentosSeleccionados.length === 0}
                  className="flex items-center gap-2 px-4 py-2 bg-purple-600 hover:bg-purple-700 text-white text-sm font-medium rounded-lg disabled:opacity-50"
                >
                  <RefreshCw size={16} className={calculando ? 'animate-spin' : ''} />
                  {calculando ? 'Calculando...' : 'Recalcular audiencia'}
                </button>
              </div>
            )}

            {previewCalculado && (
              <div className="mt-4 grid grid-cols-3 gap-4">
                <div className="bg-slate-50 dark:bg-slate-800 rounded-lg p-4 text-center">
                  <p className="text-2xl font-bold text-slate-800 dark:text-white">{totalAudiencia}</p>
                  <p className="text-xs text-slate-500">Audiencia base</p>
                </div>
                <div className="bg-red-50 dark:bg-red-500/10 rounded-lg p-4 text-center">
                  <p className="text-2xl font-bold text-red-600">-{totalExcluidos}</p>
                  <p className="text-xs text-slate-500">Excluidos</p>
                </div>
                <div className="bg-green-50 dark:bg-green-500/10 rounded-lg p-4 text-center">
                  <p className="text-2xl font-bold text-green-600">{totalElegibles}</p>
                  <p className="text-xs text-slate-500">Elegibles</p>
                </div>
              </div>
            )}
          </div>

          {/* Template */}
          <div className="bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 rounded-xl p-6">
            <h2 className="text-sm font-semibold text-slate-800 dark:text-white mb-4">Template de WhatsApp</h2>
            <select
              value={templateSeleccionado}
              onChange={(e) => setTemplateSeleccionado(e.target.value)}
              disabled={!puedeEditar}
              className="w-full px-4 py-2 text-sm border border-slate-200 dark:border-slate-700 rounded-lg bg-white dark:bg-slate-800 text-slate-800 dark:text-white disabled:opacity-50"
            >
              <option value="">Seleccionar template...</option>
              {templates.map((template) => (
                <option key={template.id} value={template.id}>{template.nombre}</option>
              ))}
            </select>
          </div>

          {/* Tipo envío */}
          <div className="bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 rounded-xl p-6">
            <h2 className="text-sm font-semibold text-slate-800 dark:text-white mb-4">Tipo de envío</h2>
            <div className="grid grid-cols-2 gap-4 mb-4">
              <button
                onClick={() => puedeEditar && setTipoEnvio('manual')}
                disabled={!puedeEditar}
                className={`p-4 rounded-lg border-2 transition-colors disabled:cursor-not-allowed ${
                  tipoEnvio === 'manual' ? 'border-purple-600 bg-purple-50 dark:bg-purple-500/10' : 'border-slate-200 dark:border-slate-700'
                }`}
              >
                <Send size={24} className={tipoEnvio === 'manual' ? 'text-purple-600 mb-2' : 'text-slate-400 mb-2'} />
                <p className={`font-medium ${tipoEnvio === 'manual' ? 'text-purple-600' : 'text-slate-700 dark:text-slate-300'}`}>Envío manual</p>
              </button>
              <button
                onClick={() => puedeEditar && setTipoEnvio('programado')}
                disabled={!puedeEditar}
                className={`p-4 rounded-lg border-2 transition-colors disabled:cursor-not-allowed ${
                  tipoEnvio === 'programado' ? 'border-purple-600 bg-purple-50 dark:bg-purple-500/10' : 'border-slate-200 dark:border-slate-700'
                }`}
              >
                <Clock size={24} className={tipoEnvio === 'programado' ? 'text-purple-600 mb-2' : 'text-slate-400 mb-2'} />
                <p className={`font-medium ${tipoEnvio === 'programado' ? 'text-purple-600' : 'text-slate-700 dark:text-slate-300'}`}>Programar</p>
              </button>
            </div>
            {tipoEnvio === 'programado' && (
              <div className="grid grid-cols-2 gap-4 p-4 bg-slate-50 dark:bg-slate-800 rounded-lg">
                <div>
                  <label className="block text-sm font-medium text-slate-700 dark:text-slate-300 mb-1">Fecha</label>
                  <input
                    type="date"
                    value={fechaProgramada}
                    onChange={(e) => setFechaProgramada(e.target.value)}
                    disabled={!puedeEditar}
                    className="w-full px-4 py-2 text-sm border border-slate-200 dark:border-slate-700 rounded-lg bg-white dark:bg-slate-900 disabled:opacity-50"
                  />
                </div>
                <div>
                  <label className="block text-sm font-medium text-slate-700 dark:text-slate-300 mb-1">Hora</label>
                  <input
                    type="time"
                    value={horaProgramada}
                    onChange={(e) => setHoraProgramada(e.target.value)}
                    disabled={!puedeEditar}
                    className="w-full px-4 py-2 text-sm border border-slate-200 dark:border-slate-700 rounded-lg bg-white dark:bg-slate-900 disabled:opacity-50"
                  />
                </div>
              </div>
            )}
          </div>

          {/* Botón enviar */}
          {puedeEditar && campana.estado === 'borrador' && (
            <div className="flex justify-end pb-6">
              <button
                onClick={enviarCampana}
                disabled={guardando || !previewCalculado || totalElegibles === 0}
                className="flex items-center gap-2 px-6 py-2.5 bg-green-600 hover:bg-green-700 text-white text-sm font-medium rounded-lg disabled:opacity-50"
              >
                <Send size={16} />
                {guardando ? 'Enviando...' : `Enviar a ${totalElegibles} contactos`}
              </button>
            </div>
          )}

        </div>
      </div>
    </div>
  );
}
