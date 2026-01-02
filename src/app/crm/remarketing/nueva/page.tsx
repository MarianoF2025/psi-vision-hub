'use client';

import { useState, useEffect } from 'react';
import { supabase } from '@/lib/supabase';
import { useRouter } from 'next/navigation';
import { ArrowLeft, Save, Send, Clock, Users, Filter, Target, RefreshCw } from 'lucide-react';
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

type Segmento = 'abandono_menu' | 'derivado_sin_cierre' | 'no_responde' | 'perdido_recuperable' | 'multi_interes';

const SEGMENTOS: { id: Segmento; nombre: string; descripcion: string; icono: string }[] = [
  { id: 'abandono_menu', nombre: 'Abandonó menú', descripcion: 'Consultó el curso pero no pidió hablar con vendedora', icono: '🔴' },
  { id: 'derivado_sin_cierre', nombre: 'Derivado sin cierre', descripcion: 'Habló con vendedora pero no se inscribió', icono: '🟡' },
  { id: 'no_responde', nombre: 'No responde', descripcion: 'Intentamos contactar pero no contesta', icono: '⚫' },
  { id: 'perdido_recuperable', nombre: 'Perdido recuperable', descripcion: 'Dijo que no, hace más de 30 días', icono: '🔵' },
  { id: 'multi_interes', nombre: 'Multi-interés', descripcion: 'Consultó 2 o más cursos (indeciso)', icono: '🟣' },
];

export default function NuevaCampanaPage() {
  const router = useRouter();
  const [guardando, setGuardando] = useState(false);
  const [cursos, setCursos] = useState<Curso[]>([]);
  const [templates, setTemplates] = useState<Template[]>([]);
  const [calculando, setCalculando] = useState(false);

  // Form state
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

  // Resultados
  const [totalAudiencia, setTotalAudiencia] = useState(0);
  const [totalExcluidos, setTotalExcluidos] = useState(0);
  const [totalElegibles, setTotalElegibles] = useState(0);
  const [previewCalculado, setPreviewCalculado] = useState(false);
  const [contactosElegibles, setContactosElegibles] = useState<string[]>([]);

  useEffect(() => {
    cargarDatos();
  }, []);

  const cargarDatos = async () => {
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

      if (excluirInscriptos && telefonosAudiencia.length > 0 && cursoId) {
        const { data: inscriptos } = await supabase
          .from('inscripciones_psi')
          .select('telefono')
          .eq('curso_id', cursoId)
          .in('telefono', telefonosAudiencia);
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

  const crearCampana = async (enviar: boolean = false) => {
    if (!nombre.trim()) {
      alert('Ingresá un nombre para la campaña');
      return;
    }
    if (segmentosSeleccionados.length === 0) {
      alert('Seleccioná al menos un segmento de audiencia');
      return;
    }
    if (enviar && (!previewCalculado || totalElegibles === 0)) {
      alert('Calculá los elegibles antes de enviar');
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

      const { data: campana, error } = await supabase
        .from('remarketing_campanas')
        .insert({
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
          estado: enviar ? 'enviando' : 'borrador',
          programada_para: programadaPara,
          total_audiencia: totalAudiencia,
          total_excluidos: totalExcluidos,
          total_elegibles: totalElegibles
        })
        .select()
        .single();

      if (error) throw error;

      if (enviar && campana && contactosElegibles.length > 0) {
        const { data: contactosData } = await supabase
          .from('contactos')
          .select('id, telefono')
          .in('telefono', contactosElegibles);

        const envios = contactosData?.map(c => ({
          campana_id: campana.id,
          contacto_id: c.id,
          telefono: c.telefono,
          estado: 'pendiente'
        })) || [];

        if (envios.length > 0) {
          await supabase.from('remarketing_envios').insert(envios);
          
          // Disparar workflow n8n para enviar mensajes
          try {
            await fetch('https://webhookn8n.psivisionhub.com/webhook/remarketing/enviar', {
              method: 'POST',
              headers: { 'Content-Type': 'application/json' },
              body: JSON.stringify({ campana_id: campana.id })
            });
          } catch (webhookError) {
            console.error('Error llamando webhook n8n:', webhookError);
          }
        }
      }

      router.push('/crm/remarketing');
    } catch (error) {
      console.error('Error creando campaña:', error);
      alert('Error al crear la campaña');
    } finally {
      setGuardando(false);
    }
  };

  useEffect(() => {
    setPreviewCalculado(false);
  }, [cursoId, segmentosSeleccionados, diasAntiguedad, excluirInscriptos]);

  return (
    <div className="flex-1 flex flex-col h-full bg-slate-50 dark:bg-slate-950">
      {/* Header */}
      <div className="h-14 border-b border-slate-200 dark:border-slate-800 bg-white dark:bg-slate-900 flex items-center justify-between px-6">
        <div className="flex items-center gap-4">
          <Link href="/crm/remarketing" className="p-2 hover:bg-slate-100 dark:hover:bg-slate-800 rounded-lg">
            <ArrowLeft size={20} className="text-slate-600 dark:text-slate-400" />
          </Link>
          <div>
            <h1 className="text-lg font-semibold text-slate-800 dark:text-white">Nueva Campaña</h1>
            <p className="text-xs text-slate-500">Remarketing inteligente</p>
          </div>
        </div>
        <div className="flex items-center gap-2">
          <button
            onClick={() => crearCampana(false)}
            disabled={guardando}
            className="flex items-center gap-2 px-4 py-2 border border-slate-200 dark:border-slate-700 text-slate-700 dark:text-slate-300 text-sm font-medium rounded-lg hover:bg-slate-100 dark:hover:bg-slate-800 disabled:opacity-50"
          >
            <Save size={16} />
            Guardar borrador
          </button>
        </div>
      </div>

      {/* Content */}
      <div className="flex-1 overflow-auto p-6">
        <div className="max-w-4xl mx-auto space-y-6">

          {/* Información básica */}
          <div className="bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 rounded-xl p-6">
            <h2 className="text-sm font-semibold text-slate-800 dark:text-white mb-4">Información básica</h2>
            <div className="space-y-4">
              <div>
                <label className="block text-sm font-medium text-slate-700 dark:text-slate-300 mb-1">Nombre de la campaña *</label>
                <input
                  type="text"
                  value={nombre}
                  onChange={(e) => setNombre(e.target.value)}
                  placeholder="Ej: Recuperación AT Enero 2026"
                  className="w-full px-4 py-2 text-sm border border-slate-200 dark:border-slate-700 rounded-lg bg-white dark:bg-slate-800 text-slate-800 dark:text-white placeholder:text-slate-400 focus:outline-none focus:ring-2 focus:ring-purple-500"
                />
              </div>
              <div>
                <label className="block text-sm font-medium text-slate-700 dark:text-slate-300 mb-1">Descripción</label>
                <textarea
                  value={descripcion}
                  onChange={(e) => setDescripcion(e.target.value)}
                  placeholder="Descripción opcional..."
                  rows={2}
                  className="w-full px-4 py-2 text-sm border border-slate-200 dark:border-slate-700 rounded-lg bg-white dark:bg-slate-800 text-slate-800 dark:text-white placeholder:text-slate-400 focus:outline-none focus:ring-2 focus:ring-purple-500 resize-none"
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
              className="w-full px-4 py-2 text-sm border border-slate-200 dark:border-slate-700 rounded-lg bg-white dark:bg-slate-800 text-slate-800 dark:text-white focus:outline-none focus:ring-2 focus:ring-purple-500"
            >
              <option value="">Seleccionar curso...</option>
              {cursos.map((curso) => (
                <option key={curso.id} value={curso.id}>
                  {curso.nombre} ({curso.codigo})
                </option>
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
                    onClick={() => toggleSegmento(seg.id)}
                    className={`w-full p-4 rounded-lg border-2 text-left transition-all ${
                      isSelected
                        ? 'border-purple-500 bg-purple-50 dark:bg-purple-500/10'
                        : 'border-slate-200 dark:border-slate-700 hover:border-slate-300 dark:hover:border-slate-600'
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
                        isSelected
                          ? 'bg-purple-500 border-purple-500'
                          : 'border-slate-300 dark:border-slate-600'
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

          {/* Filtros adicionales */}
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
                  className="w-4 h-4 rounded border-slate-300 text-purple-600 focus:ring-purple-500"
                />
                <div>
                  <span className="text-sm font-medium text-slate-700 dark:text-slate-300">Excluir ya inscriptos</span>
                  <p className="text-xs text-slate-500">No enviar a quienes ya están inscriptos en este curso</p>
                </div>
              </label>

              <div>
                <label className="block text-sm font-medium text-slate-700 dark:text-slate-300 mb-1">
                  Solo contactos de los últimos X días
                </label>
                <div className="flex items-center gap-2">
                  <input
                    type="number"
                    value={diasAntiguedad || ''}
                    onChange={(e) => setDiasAntiguedad(e.target.value ? parseInt(e.target.value) : null)}
                    placeholder="Sin límite"
                    min={1}
                    className="w-32 px-4 py-2 text-sm border border-slate-200 dark:border-slate-700 rounded-lg bg-white dark:bg-slate-800 text-slate-800 dark:text-white"
                  />
                  <span className="text-sm text-slate-500">días</span>
                </div>
              </div>
            </div>

            <div className="mt-6 pt-4 border-t border-slate-100 dark:border-slate-800">
              <button
                onClick={calcularElegibles}
                disabled={calculando || segmentosSeleccionados.length === 0}
                className="flex items-center gap-2 px-4 py-2 bg-purple-600 hover:bg-purple-700 text-white text-sm font-medium rounded-lg disabled:opacity-50 disabled:cursor-not-allowed"
              >
                <RefreshCw size={16} className={calculando ? 'animate-spin' : ''} />
                {calculando ? 'Calculando...' : 'Calcular audiencia'}
              </button>
            </div>

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
              className="w-full px-4 py-2 text-sm border border-slate-200 dark:border-slate-700 rounded-lg bg-white dark:bg-slate-800 text-slate-800 dark:text-white focus:outline-none focus:ring-2 focus:ring-purple-500"
            >
              <option value="">Seleccionar template...</option>
              {templates.map((template) => (
                <option key={template.id} value={template.id}>
                  {template.nombre}
                </option>
              ))}
            </select>
          </div>

          {/* Tipo de envío */}
          <div className="bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 rounded-xl p-6">
            <h2 className="text-sm font-semibold text-slate-800 dark:text-white mb-4">Tipo de envío</h2>
            <div className="grid grid-cols-2 gap-4 mb-4">
              <button
                onClick={() => setTipoEnvio('manual')}
                className={`p-4 rounded-lg border-2 transition-colors ${
                  tipoEnvio === 'manual'
                    ? 'border-purple-600 bg-purple-50 dark:bg-purple-500/10'
                    : 'border-slate-200 dark:border-slate-700'
                }`}
              >
                <Send size={24} className={tipoEnvio === 'manual' ? 'text-purple-600 mb-2' : 'text-slate-400 mb-2'} />
                <p className={`font-medium ${tipoEnvio === 'manual' ? 'text-purple-600' : 'text-slate-700 dark:text-slate-300'}`}>
                  Envío manual
                </p>
                <p className="text-xs text-slate-500 mt-1">Enviar ahora al crear</p>
              </button>
              <button
                onClick={() => setTipoEnvio('programado')}
                className={`p-4 rounded-lg border-2 transition-colors ${
                  tipoEnvio === 'programado'
                    ? 'border-purple-600 bg-purple-50 dark:bg-purple-500/10'
                    : 'border-slate-200 dark:border-slate-700'
                }`}
              >
                <Clock size={24} className={tipoEnvio === 'programado' ? 'text-purple-600 mb-2' : 'text-slate-400 mb-2'} />
                <p className={`font-medium ${tipoEnvio === 'programado' ? 'text-purple-600' : 'text-slate-700 dark:text-slate-300'}`}>
                  Programar envío
                </p>
                <p className="text-xs text-slate-500 mt-1">Elegir fecha y hora</p>
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
                    className="w-full px-4 py-2 text-sm border border-slate-200 dark:border-slate-700 rounded-lg bg-white dark:bg-slate-900"
                  />
                </div>
                <div>
                  <label className="block text-sm font-medium text-slate-700 dark:text-slate-300 mb-1">Hora</label>
                  <input
                    type="time"
                    value={horaProgramada}
                    onChange={(e) => setHoraProgramada(e.target.value)}
                    className="w-full px-4 py-2 text-sm border border-slate-200 dark:border-slate-700 rounded-lg bg-white dark:bg-slate-900"
                  />
                </div>
              </div>
            )}
          </div>

          {/* Botón enviar */}
          <div className="flex justify-end pb-6">
            <button
              onClick={() => crearCampana(true)}
              disabled={guardando || !previewCalculado || totalElegibles === 0}
              className="flex items-center gap-2 px-6 py-2.5 bg-green-600 hover:bg-green-700 text-white text-sm font-medium rounded-lg disabled:opacity-50 disabled:cursor-not-allowed"
            >
              <Send size={16} />
              {guardando ? 'Creando...' : `Crear y enviar a ${totalElegibles} contactos`}
            </button>
          </div>

        </div>
      </div>
    </div>
  );
}
