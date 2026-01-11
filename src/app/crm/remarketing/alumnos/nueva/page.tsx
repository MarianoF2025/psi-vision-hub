'use client';

import { useState, useEffect } from 'react';
import { supabase } from '@/lib/supabase';
import { useRouter } from 'next/navigation';
import { ArrowLeft, Save, Send, Clock, Users, Filter, GraduationCap, RefreshCw, Calendar } from 'lucide-react';
import Link from 'next/link';

interface CursoAlumno {
  curso_codigo: string;
  curso_nombre: string;
  total: number;
}

interface Template {
  id: string;
  nombre: string;
  categoria: string;
}

type EstadoAlumno = 'activo' | 'finalizado' | 'baja';

const ESTADOS_ALUMNO: { id: EstadoAlumno; nombre: string; descripcion: string; icono: string; color: string }[] = [
  { id: 'finalizado', nombre: 'Egresados', descripcion: 'Completaron el curso (estado: finalizado)', icono: '🎓', color: 'green' },
  { id: 'activo', nombre: 'Cursando', descripcion: 'Actualmente cursando (estado: activo)', icono: '📚', color: 'blue' },
  { id: 'baja', nombre: 'Bajas', descripcion: 'Abandonaron o se dieron de baja', icono: '⚠️', color: 'amber' },
];

export default function NuevaCampanaAlumnosPage() {
  const router = useRouter();
  const [guardando, setGuardando] = useState(false);
  const [cursosAlumnos, setCursosAlumnos] = useState<CursoAlumno[]>([]);
  const [templates, setTemplates] = useState<Template[]>([]);
  const [calculando, setCalculando] = useState(false);

  // Form state
  const [nombre, setNombre] = useState('');
  const [descripcion, setDescripcion] = useState('');
  const [cursoCodigo, setCursoCodigo] = useState('');
  const [estadosSeleccionados, setEstadosSeleccionados] = useState<EstadoAlumno[]>([]);
  const [templateSeleccionado, setTemplateSeleccionado] = useState('');
  const [fechaInscripcionDesde, setFechaInscripcionDesde] = useState('');
  const [fechaInscripcionHasta, setFechaInscripcionHasta] = useState('');
  const [cuotasMinPagadas, setCuotasMinPagadas] = useState<number | null>(null);
  const [cuotasMaxPagadas, setCuotasMaxPagadas] = useState<number | null>(null);
  const [soloMorosos, setSoloMorosos] = useState(false);
  const [tipoEnvio, setTipoEnvio] = useState<'manual' | 'programado'>('manual');
  const [fechaProgramada, setFechaProgramada] = useState('');
  const [horaProgramada, setHoraProgramada] = useState('09:00');

  // Resultados
  const [totalAudiencia, setTotalAudiencia] = useState(0);
  const [totalElegibles, setTotalElegibles] = useState(0);
  const [previewCalculado, setPreviewCalculado] = useState(false);
  const [telefonosElegibles, setTelefonosElegibles] = useState<string[]>([]);

  useEffect(() => {
    cargarDatos();
  }, []);

  const cargarDatos = async () => {
    // Cargar cursos usando función RPC (GROUP BY en SQL, más eficiente)
    const { data: cursosData } = await supabase.rpc('get_cursos_inscripciones');
    if (cursosData) {
      setCursosAlumnos(cursosData);
    }

    // Cargar templates
    const { data: templatesData } = await supabase
      .from('remarketing_templates')
      .select('*')
      .eq('estado', 'activo')
      .order('nombre');
    if (templatesData) setTemplates(templatesData);
  };

  const toggleEstado = (estado: EstadoAlumno) => {
    setEstadosSeleccionados(prev =>
      prev.includes(estado)
        ? prev.filter(e => e !== estado)
        : [...prev, estado]
    );
  };

  const calcularElegibles = async () => {
    if (estadosSeleccionados.length === 0) {
      alert('Seleccioná al menos un estado de alumno');
      return;
    }

    setCalculando(true);
    setPreviewCalculado(false);

    try {
      let query = supabase
        .from('inscripciones_psi')
        .select('telefono, estado, cuotas_total, cuotas_pagadas')
        .range(0, 50000);

      // Filtrar por estados seleccionados
      query = query.in('estado', estadosSeleccionados);

      // Filtrar por curso si se seleccionó
      if (cursoCodigo) {
        query = query.eq('curso_codigo', cursoCodigo);
      }

      // Filtrar por fecha de inscripción
      if (fechaInscripcionDesde) {
        query = query.gte('fecha_inscripcion', fechaInscripcionDesde);
      }
      if (fechaInscripcionHasta) {
        query = query.lte('fecha_inscripcion', fechaInscripcionHasta);
      }

      const { data: inscripciones, error } = await query;

      if (error) {
        console.error('Error consultando inscripciones:', error);
        alert('Error al calcular audiencia');
        return;
      }

      let resultados = inscripciones || [];

      // Filtrar por cuotas pagadas (porcentaje)
      if (cuotasMinPagadas !== null || cuotasMaxPagadas !== null || soloMorosos) {
        resultados = resultados.filter(row => {
          if (!row.cuotas_total || row.cuotas_total === 0) return false;
          const porcentaje = Math.round((row.cuotas_pagadas / row.cuotas_total) * 100);

          if (soloMorosos) {
            return row.cuotas_pagadas > 0 && row.cuotas_pagadas < row.cuotas_total;
          }

          if (cuotasMinPagadas !== null && porcentaje < cuotasMinPagadas) return false;
          if (cuotasMaxPagadas !== null && porcentaje > cuotasMaxPagadas) return false;
          return true;
        });
      }

      const telefonosUnicos = [...new Set(resultados.map(r => r.telefono).filter(Boolean))];

      setTotalAudiencia(resultados.length);
      setTotalElegibles(telefonosUnicos.length);
      setTelefonosElegibles(telefonosUnicos);
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
    if (estadosSeleccionados.length === 0) {
      alert('Seleccioná al menos un estado de alumno');
      return;
    }
    if (enviar && (!previewCalculado || totalElegibles === 0)) {
      alert('Calculá los elegibles antes de enviar');
      return;
    }

    setGuardando(true);
    try {
      const cursoData = cursosAlumnos.find(c => c.curso_codigo === cursoCodigo);

      let programadaPara = null;
      if (tipoEnvio === 'programado' && fechaProgramada) {
        programadaPara = `${fechaProgramada}T${horaProgramada}:00`;
      }

      const { data: campana, error } = await supabase
        .from('remarketing_campanas')
        .insert({
          nombre: nombre.trim(),
          descripcion: descripcion.trim() || null,
          tipo: 'alumnos',
          curso_codigo: cursoData?.curso_codigo || null,
          curso_nombre: cursoData?.curso_nombre || null,
          template_nombre: templates.find(t => t.id === templateSeleccionado)?.nombre || null,
          template_id: templateSeleccionado || null,
          audiencia_filtros: {
            estados: estadosSeleccionados,
            curso_codigo: cursoCodigo || null,
            fecha_inscripcion_desde: fechaInscripcionDesde || null,
            fecha_inscripcion_hasta: fechaInscripcionHasta || null,
            cuotas_min_pagadas: cuotasMinPagadas,
            cuotas_max_pagadas: cuotasMaxPagadas,
            solo_morosos: soloMorosos
          },
          estado: enviar ? 'enviando' : 'borrador',
          programada_para: programadaPara,
          total_audiencia: totalAudiencia,
          total_excluidos: 0,
          total_elegibles: totalElegibles
        })
        .select()
        .single();

      if (error) throw error;

      if (enviar && campana && telefonosElegibles.length > 0) {
        const { data: contactosExistentes } = await supabase
          .from('contactos')
          .select('id, telefono')
          .in('telefono', telefonosElegibles);

        const telefonosExistentes = new Set(contactosExistentes?.map(c => c.telefono) || []);
        const telefonosNuevos = telefonosElegibles.filter(t => !telefonosExistentes.has(t));

        if (telefonosNuevos.length > 0) {
          const { data: inscripcionesData } = await supabase
            .from('inscripciones_psi')
            .select('telefono, nombre, email')
            .in('telefono', telefonosNuevos)
            .range(0, 50000);

          const contactosNuevos = inscripcionesData?.map(i => ({
            telefono: i.telefono,
            nombre: i.nombre,
            email: i.email,
            origen: 'psi_api',
            tipo: 'alumno'
          })) || [];

          if (contactosNuevos.length > 0) {
            await supabase.from('contactos').upsert(contactosNuevos, { onConflict: 'telefono' });
          }
        }

        const { data: todosContactos } = await supabase
          .from('contactos')
          .select('id, telefono')
          .in('telefono', telefonosElegibles);

        const envios = todosContactos?.map(c => ({
          campana_id: campana.id,
          contacto_id: c.id,
          telefono: c.telefono,
          estado: 'pendiente'
        })) || [];

        if (envios.length > 0) {
          await supabase.from('remarketing_envios').insert(envios);

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
  }, [cursoCodigo, estadosSeleccionados, fechaInscripcionDesde, fechaInscripcionHasta, cuotasMinPagadas, cuotasMaxPagadas, soloMorosos]);

  return (
    <div className="flex-1 flex flex-col h-full bg-slate-50 dark:bg-slate-950">
      <div className="h-14 border-b border-slate-200 dark:border-slate-800 bg-white dark:bg-slate-900 flex items-center justify-between px-6">
        <div className="flex items-center gap-4">
          <Link href="/crm/remarketing" className="p-2 hover:bg-slate-100 dark:hover:bg-slate-800 rounded-lg">
            <ArrowLeft size={20} className="text-slate-600 dark:text-slate-400" />
          </Link>
          <div>
            <h1 className="text-lg font-semibold text-slate-800 dark:text-white">Nueva Campaña - Alumnos</h1>
            <p className="text-xs text-slate-500">Remarketing para alumnos de PSI</p>
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

      <div className="flex-1 overflow-auto p-6">
        <div className="max-w-4xl mx-auto space-y-6">

          <div className="bg-purple-50 dark:bg-purple-500/10 border border-purple-200 dark:border-purple-500/30 rounded-xl p-4">
            <div className="flex items-start gap-3">
              <GraduationCap className="text-purple-600 mt-0.5" size={20} />
              <div>
                <p className="text-sm font-medium text-purple-800 dark:text-purple-300">Remarketing para Alumnos</p>
                <p className="text-xs text-purple-600 dark:text-purple-400 mt-1">
                  Esta campaña usa datos de <strong>API PSI</strong> (inscripciones_psi).
                  Podés segmentar por estado del alumno, curso, fechas y cuotas pagadas.
                </p>
              </div>
            </div>
          </div>

          <div className="bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 rounded-xl p-6">
            <h2 className="text-sm font-semibold text-slate-800 dark:text-white mb-4">Información básica</h2>
            <div className="space-y-4">
              <div>
                <label className="block text-sm font-medium text-slate-700 dark:text-slate-300 mb-1">Nombre de la campaña *</label>
                <input
                  type="text"
                  value={nombre}
                  onChange={(e) => setNombre(e.target.value)}
                  placeholder="Ej: Egresados AT - Nuevo curso avanzado"
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

          <div className="bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 rounded-xl p-6">
            <h2 className="text-sm font-semibold text-slate-800 dark:text-white mb-4 flex items-center gap-2">
              <Users size={16} />
              Estado del alumno *
              <span className="text-xs font-normal text-slate-500">(podés seleccionar varios)</span>
            </h2>
            <div className="grid gap-3">
              {ESTADOS_ALUMNO.map((estado) => {
                const isSelected = estadosSeleccionados.includes(estado.id);
                return (
                  <button
                    key={estado.id}
                    onClick={() => toggleEstado(estado.id)}
                    className={`w-full p-4 rounded-lg border-2 text-left transition-all ${
                      isSelected
                        ? 'border-purple-500 bg-purple-50 dark:bg-purple-500/10'
                        : 'border-slate-200 dark:border-slate-700 hover:border-slate-300 dark:hover:border-slate-600'
                    }`}
                  >
                    <div className="flex items-start gap-3">
                      <span className="text-xl">{estado.icono}</span>
                      <div className="flex-1">
                        <p className={`font-medium ${isSelected ? 'text-purple-700 dark:text-purple-300' : 'text-slate-700 dark:text-slate-300'}`}>
                          {estado.nombre}
                        </p>
                        <p className="text-xs text-slate-500 mt-0.5">{estado.descripcion}</p>
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
          </div>

          <div className="bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 rounded-xl p-6">
            <h2 className="text-sm font-semibold text-slate-800 dark:text-white mb-4 flex items-center gap-2">
              <GraduationCap size={16} />
              Filtrar por curso
            </h2>
            <select
              value={cursoCodigo}
              onChange={(e) => setCursoCodigo(e.target.value)}
              className="w-full px-4 py-2 text-sm border border-slate-200 dark:border-slate-700 rounded-lg bg-white dark:bg-slate-800 text-slate-800 dark:text-white focus:outline-none focus:ring-2 focus:ring-purple-500"
            >
              <option value="">Todos los cursos</option>
              {cursosAlumnos.map((curso) => (
                <option key={curso.curso_codigo} value={curso.curso_codigo}>
                  {curso.curso_nombre} ({curso.total.toLocaleString()} inscripciones)
                </option>
              ))}
            </select>
            <p className="text-xs text-slate-500 mt-2">Dejá vacío para incluir alumnos de todos los cursos</p>
          </div>

          <div className="bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 rounded-xl p-6">
            <h2 className="text-sm font-semibold text-slate-800 dark:text-white mb-4 flex items-center gap-2">
              <Filter size={16} />
              Filtros adicionales
            </h2>
            <div className="space-y-6">
              <div>
                <label className="block text-sm font-medium text-slate-700 dark:text-slate-300 mb-2 flex items-center gap-2">
                  <Calendar size={14} />
                  Fecha de inscripción
                </label>
                <div className="grid grid-cols-2 gap-4">
                  <div>
                    <label className="block text-xs text-slate-500 mb-1">Desde</label>
                    <input
                      type="date"
                      value={fechaInscripcionDesde}
                      onChange={(e) => setFechaInscripcionDesde(e.target.value)}
                      className="w-full px-4 py-2 text-sm border border-slate-200 dark:border-slate-700 rounded-lg bg-white dark:bg-slate-800 text-slate-800 dark:text-white"
                    />
                  </div>
                  <div>
                    <label className="block text-xs text-slate-500 mb-1">Hasta</label>
                    <input
                      type="date"
                      value={fechaInscripcionHasta}
                      onChange={(e) => setFechaInscripcionHasta(e.target.value)}
                      className="w-full px-4 py-2 text-sm border border-slate-200 dark:border-slate-700 rounded-lg bg-white dark:bg-slate-800 text-slate-800 dark:text-white"
                    />
                  </div>
                </div>
              </div>

              <div>
                <label className="block text-sm font-medium text-slate-700 dark:text-slate-300 mb-2">
                  Porcentaje de cuotas pagadas
                </label>
                <div className="grid grid-cols-2 gap-4 mb-3">
                  <div>
                    <label className="block text-xs text-slate-500 mb-1">Mínimo %</label>
                    <input
                      type="number"
                      value={cuotasMinPagadas ?? ''}
                      onChange={(e) => setCuotasMinPagadas(e.target.value ? parseInt(e.target.value) : null)}
                      placeholder="0"
                      min={0}
                      max={100}
                      disabled={soloMorosos}
                      className="w-full px-4 py-2 text-sm border border-slate-200 dark:border-slate-700 rounded-lg bg-white dark:bg-slate-800 text-slate-800 dark:text-white disabled:opacity-50"
                    />
                  </div>
                  <div>
                    <label className="block text-xs text-slate-500 mb-1">Máximo %</label>
                    <input
                      type="number"
                      value={cuotasMaxPagadas ?? ''}
                      onChange={(e) => setCuotasMaxPagadas(e.target.value ? parseInt(e.target.value) : null)}
                      placeholder="100"
                      min={0}
                      max={100}
                      disabled={soloMorosos}
                      className="w-full px-4 py-2 text-sm border border-slate-200 dark:border-slate-700 rounded-lg bg-white dark:bg-slate-800 text-slate-800 dark:text-white disabled:opacity-50"
                    />
                  </div>
                </div>
                <label className="flex items-center gap-3 cursor-pointer">
                  <input
                    type="checkbox"
                    checked={soloMorosos}
                    onChange={(e) => {
                      setSoloMorosos(e.target.checked);
                      if (e.target.checked) {
                        setCuotasMinPagadas(null);
                        setCuotasMaxPagadas(null);
                      }
                    }}
                    className="w-4 h-4 rounded border-slate-300 text-purple-600 focus:ring-purple-500"
                  />
                  <div>
                    <span className="text-sm font-medium text-slate-700 dark:text-slate-300">💰 Solo morosos</span>
                    <p className="text-xs text-slate-500">Pagaron algo pero no completaron (cuotas_pagadas {'>'} 0 y {'<'} total)</p>
                  </div>
                </label>
              </div>
            </div>

            <div className="mt-6 pt-4 border-t border-slate-100 dark:border-slate-800">
              <button
                onClick={calcularElegibles}
                disabled={calculando || estadosSeleccionados.length === 0}
                className="flex items-center gap-2 px-4 py-2 bg-purple-600 hover:bg-purple-700 text-white text-sm font-medium rounded-lg disabled:opacity-50 disabled:cursor-not-allowed"
              >
                <RefreshCw size={16} className={calculando ? 'animate-spin' : ''} />
                {calculando ? 'Calculando...' : 'Calcular audiencia'}
              </button>
            </div>

            {previewCalculado && (
              <div className="mt-4 grid grid-cols-2 gap-4">
                <div className="bg-slate-50 dark:bg-slate-800 rounded-lg p-4 text-center">
                  <p className="text-2xl font-bold text-slate-800 dark:text-white">{totalAudiencia.toLocaleString()}</p>
                  <p className="text-xs text-slate-500">Inscripciones encontradas</p>
                </div>
                <div className="bg-green-50 dark:bg-green-500/10 rounded-lg p-4 text-center">
                  <p className="text-2xl font-bold text-green-600">{totalElegibles.toLocaleString()}</p>
                  <p className="text-xs text-slate-500">Teléfonos únicos</p>
                </div>
              </div>
            )}
          </div>

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

          <div className="flex justify-end pb-6">
            <button
              onClick={() => crearCampana(true)}
              disabled={guardando || !previewCalculado || totalElegibles === 0}
              className="flex items-center gap-2 px-6 py-2.5 bg-green-600 hover:bg-green-700 text-white text-sm font-medium rounded-lg disabled:opacity-50 disabled:cursor-not-allowed"
            >
              <Send size={16} />
              {guardando ? 'Creando...' : `Crear y enviar a ${totalElegibles.toLocaleString()} contactos`}
            </button>
          </div>

        </div>
      </div>
    </div>
  );
}
