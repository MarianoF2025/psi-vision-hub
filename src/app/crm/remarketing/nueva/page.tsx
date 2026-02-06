'use client';

import { useState, useEffect } from 'react';
import { supabase } from '@/lib/supabase';
import { useRouter } from 'next/navigation';
import { 
  ArrowLeft, Save, Send, Clock, Users, Filter, Target, RefreshCw, 
  GraduationCap, BookOpen, UserX, DollarSign, Search, X,
  MessageCircle, UserMinus, PhoneOff, RotateCcw, Layers, UsersRound
} from 'lucide-react';
import Link from 'next/link';

interface Curso {
  codigo: string;
  nombre: string;
}

interface Template {
  id: string;
  nombre: string;
  categoria: string;
}

interface AudienciaResult {
  total_encontrados: number;
  desglose: {
    egresado: number;
    cursando: number;
    baja: number;
    moroso: number;
    comunidad: number;
  };
  excluidos: number;
  audiencia_final: number;
  telefonos: string[];
}

const ESTADOS_ALUMNO = [
  { id: 'egresado', nombre: 'Egresados', descripcion: 'Finalizaron el curso', icono: GraduationCap },
  { id: 'cursando', nombre: 'Cursando', descripcion: 'Alumno activo actualmente', icono: BookOpen },
  { id: 'baja', nombre: 'Bajas', descripcion: 'Se dio de baja del curso', icono: UserX },
];

const SEGMENTOS_LEADS = [
  { id: 'abandono_menu', nombre: 'Abandonó menú', descripcion: 'Consultó pero no pidió hablar', icono: MessageCircle },
  { id: 'derivado_sin_cierre', nombre: 'Derivado sin cierre', descripcion: 'Habló con vendedora pero no se inscribió', icono: UserMinus },
  { id: 'no_responde', nombre: 'No responde', descripcion: 'Intentamos contactar sin éxito', icono: PhoneOff },
  { id: 'perdido_recuperable', nombre: 'Perdido recuperable', descripcion: 'Dijo que no, hace más de 30 días', icono: RotateCcw },
  { id: 'multi_interes', nombre: 'Multi-interés', descripcion: 'Consultó 2 o más cursos', icono: Layers },
];

export default function NuevaCampanaPage() {
  const router = useRouter();
  const [guardando, setGuardando] = useState(false);
  const [cursos, setCursos] = useState<Curso[]>([]);
  const [templates, setTemplates] = useState<Template[]>([]);
  const [calculando, setCalculando] = useState(false);
  const [busquedaCurso, setBusquedaCurso] = useState('');

  // Form state
  const [nombre, setNombre] = useState('');
  const [descripcion, setDescripcion] = useState('');
  const [cursosSeleccionados, setCursosSeleccionados] = useState<string[]>([]);
  const [cohorteMode, setCohorteMode] = useState<'todas' | 'especificas'>('todas');
  const [cohortesAnio, setCohortesAnio] = useState<number[]>([]);
  const [cohortesMes, setCohortesMes] = useState<number[]>([]);
  const [estadosAlumno, setEstadosAlumno] = useState<string[]>([]);
  const [soloMorosos, setSoloMorosos] = useState(false);
  const [segmentosLeads, setSegmentosLeads] = useState<string[]>([]);
  const [incluirComunidad, setIncluirComunidad] = useState(false);
  const [excluirInscriptos, setExcluirInscriptos] = useState(true);
  const [diasAntiguedad, setDiasAntiguedad] = useState<number | null>(null);
  const [templateSeleccionado, setTemplateSeleccionado] = useState('');
  const [tipoEnvio, setTipoEnvio] = useState<'manual' | 'programado'>('manual');
  const [fechaProgramada, setFechaProgramada] = useState('');
  const [horaProgramada, setHoraProgramada] = useState('09:00');

  // Resultados
  const [audienciaResult, setAudienciaResult] = useState<AudienciaResult | null>(null);
  const [previewCalculado, setPreviewCalculado] = useState(false);

  useEffect(() => {
    cargarDatos();
  }, []);

  const cargarDatos = async () => {
    const { data: cursosData } = await supabase
      .from('cursos')
      .select('codigo, nombre')
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

  const toggleCurso = (codigo: string) => {
    setCursosSeleccionados(prev =>
      prev.includes(codigo) ? prev.filter(c => c !== codigo) : [...prev, codigo]
    );
  };

  const toggleEstadoAlumno = (id: string) => {
    setEstadosAlumno(prev =>
      prev.includes(id) ? prev.filter(e => e !== id) : [...prev, id]
    );
  };

  const toggleSegmentoLead = (id: string) => {
    setSegmentosLeads(prev =>
      prev.includes(id) ? prev.filter(s => s !== id) : [...prev, id]
    );
  };

  const cursosFiltrados = cursos.filter(c =>
    c.nombre.toLowerCase().includes(busquedaCurso.toLowerCase()) ||
    c.codigo.toLowerCase().includes(busquedaCurso.toLowerCase())
  );

  const calcularAudiencia = async () => {
    if (estadosAlumno.length === 0 && segmentosLeads.length === 0 && !incluirComunidad) {
      alert('Seleccioná al menos un tipo de audiencia');
      return;
    }

    setCalculando(true);
    setPreviewCalculado(false);

    try {
      const { data, error } = await supabase.rpc('calcular_audiencia_unificada', {
        p_cursos_codigos: cursosSeleccionados.length > 0 ? cursosSeleccionados : null,
        p_cohortes_anio: cohorteMode === 'especificas' && cohortesAnio.length > 0 ? cohortesAnio : null,
        p_cohortes_mes: cohorteMode === 'especificas' && cohortesMes.length > 0 ? cohortesMes : null,
        p_estados: estadosAlumno.length > 0 ? estadosAlumno : null,
        p_incluir_comunidad: incluirComunidad,
        p_solo_morosos: soloMorosos,
        p_excluir_cursando_otros: false
      });

      if (error) throw error;

      setAudienciaResult(data);
      setPreviewCalculado(true);
    } catch (error) {
      console.error('Error calculando audiencia:', error);
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
    if (!previewCalculado || !audienciaResult || audienciaResult.audiencia_final === 0) {
      alert('Calculá la audiencia antes de continuar');
      return;
    }

    setGuardando(true);
    try {
      let programadaPara = null;
      if (tipoEnvio === 'programado' && fechaProgramada) {
        programadaPara = `${fechaProgramada}T${horaProgramada}:00`;
      }

      const { data: campana, error } = await supabase
        .from('remarketing_campanas')
        .insert({
          nombre: nombre.trim(),
          descripcion: descripcion.trim() || null,
          tipo: 'unificada',
          curso_codigo: cursosSeleccionados.join(',') || null,
          curso_nombre: cursosSeleccionados.map(c => cursos.find(cur => cur.codigo === c)?.nombre).join(', ') || null,
          template_nombre: templates.find(t => t.id === templateSeleccionado)?.nombre || null,
          template_id: templateSeleccionado || null,
          audiencia_filtros: {
            cursos: cursosSeleccionados,
            cohortes_anio: cohortesAnio,
            cohortes_mes: cohortesMes,
            estados_alumno: estadosAlumno,
            solo_morosos: soloMorosos,
            segmentos_leads: segmentosLeads,
            incluir_comunidad: incluirComunidad,
            excluir_inscriptos: excluirInscriptos,
            dias_antiguedad: diasAntiguedad
          },
          estado: enviar ? 'enviando' : 'borrador',
          programada_para: programadaPara,
          total_audiencia: audienciaResult.total_encontrados,
          total_excluidos: audienciaResult.excluidos,
          total_elegibles: audienciaResult.audiencia_final
        })
        .select()
        .single();

      if (error) throw error;

      if (enviar && campana && audienciaResult.telefonos.length > 0) {
        const { data: contactosExistentes } = await supabase
          .from('contactos')
          .select('id, telefono')
          .in('telefono', audienciaResult.telefonos);

        const envios = contactosExistentes?.map(c => ({
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
  }, [cursosSeleccionados, cohortesAnio, cohortesMes, estadosAlumno, soloMorosos, segmentosLeads, incluirComunidad, excluirInscriptos, diasAntiguedad]);

  const aniosDisponibles = [2021, 2022, 2023, 2024, 2025, 2026];
  const mesesDisponibles = [
    { num: 1, nombre: 'Ene' }, { num: 2, nombre: 'Feb' }, { num: 3, nombre: 'Mar' },
    { num: 4, nombre: 'Abr' }, { num: 5, nombre: 'May' }, { num: 6, nombre: 'Jun' },
    { num: 7, nombre: 'Jul' }, { num: 8, nombre: 'Ago' }, { num: 9, nombre: 'Sep' },
    { num: 10, nombre: 'Oct' }, { num: 11, nombre: 'Nov' }, { num: 12, nombre: 'Dic' }
  ];

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
            <p className="text-xs text-slate-500">Remarketing WhatsApp</p>
          </div>
        </div>
        <button
          onClick={() => crearCampana(false)}
          disabled={guardando}
          className="flex items-center gap-2 px-4 py-2 border border-slate-200 dark:border-slate-700 text-slate-700 dark:text-slate-300 text-sm font-medium rounded-lg hover:bg-slate-100 dark:hover:bg-slate-800 disabled:opacity-50"
        >
          <Save size={16} />
          Guardar borrador
        </button>
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
                  placeholder="Ej: Egresados AT - Promoción Febrero"
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

          {/* CURSOS */}
          <div className="bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 rounded-xl p-6">
            <div className="flex items-center justify-between mb-4">
              <h2 className="text-sm font-semibold text-slate-800 dark:text-white flex items-center gap-2">
                <Target size={16} className="text-purple-600" />
                Cursos objetivo
              </h2>
              {cursosSeleccionados.length > 0 && (
                <button
                  onClick={() => setCursosSeleccionados([])}
                  className="text-xs text-purple-600 hover:text-purple-700"
                >
                  Deseleccionar todos
                </button>
              )}
            </div>

            {/* Buscador */}
            <div className="relative mb-4">
              <Search size={16} className="absolute left-3 top-1/2 -translate-y-1/2 text-slate-400" />
              <input
                type="text"
                value={busquedaCurso}
                onChange={(e) => setBusquedaCurso(e.target.value)}
                placeholder="Buscar curso..."
                className="w-full pl-9 pr-4 py-2 text-sm border border-slate-200 dark:border-slate-700 rounded-lg bg-white dark:bg-slate-800 text-slate-800 dark:text-white focus:outline-none focus:ring-2 focus:ring-purple-500"
              />
            </div>

            {/* Chips seleccionados */}
            {cursosSeleccionados.length > 0 && (
              <div className="flex flex-wrap gap-2 mb-4">
                {cursosSeleccionados.map(codigo => {
                  const curso = cursos.find(c => c.codigo === codigo);
                  return (
                    <span
                      key={codigo}
                      className="inline-flex items-center gap-1 px-3 py-1 bg-purple-100 dark:bg-purple-500/20 text-purple-700 dark:text-purple-300 text-sm rounded-full"
                    >
                      {curso?.codigo || codigo}
                      <button onClick={() => toggleCurso(codigo)} className="hover:text-purple-900">
                        <X size={14} />
                      </button>
                    </span>
                  );
                })}
              </div>
            )}

            {/* Lista de cursos */}
            <div className="max-h-48 overflow-y-auto border border-slate-200 dark:border-slate-700 rounded-lg">
              {cursosFiltrados.slice(0, 20).map(curso => (
                <button
                  key={curso.codigo}
                  onClick={() => toggleCurso(curso.codigo)}
                  className={`w-full px-4 py-2 text-left text-sm border-b border-slate-100 dark:border-slate-800 last:border-0 transition-colors ${
                    cursosSeleccionados.includes(curso.codigo)
                      ? 'bg-purple-50 dark:bg-purple-500/10 text-purple-700 dark:text-purple-300'
                      : 'hover:bg-slate-50 dark:hover:bg-slate-800 text-slate-700 dark:text-slate-300'
                  }`}
                >
                  <span className="font-medium">{curso.codigo}</span>
                  <span className="text-slate-500 ml-2">- {curso.nombre}</span>
                </button>
              ))}
              {cursosFiltrados.length > 20 && (
                <p className="px-4 py-2 text-xs text-slate-500">+{cursosFiltrados.length - 20} cursos más...</p>
              )}
            </div>

            {/* Cohortes */}
            <div className="mt-4 pt-4 border-t border-slate-100 dark:border-slate-800">
              <label className="block text-sm font-medium text-slate-700 dark:text-slate-300 mb-2">Cohorte</label>
              <div className="flex items-center gap-4 mb-3">
                <label className="flex items-center gap-2 cursor-pointer">
                  <input
                    type="radio"
                    checked={cohorteMode === 'todas'}
                    onChange={() => setCohorteMode('todas')}
                    className="text-purple-600"
                  />
                  <span className="text-sm text-slate-700 dark:text-slate-300">Todas</span>
                </label>
                <label className="flex items-center gap-2 cursor-pointer">
                  <input
                    type="radio"
                    checked={cohorteMode === 'especificas'}
                    onChange={() => setCohorteMode('especificas')}
                    className="text-purple-600"
                  />
                  <span className="text-sm text-slate-700 dark:text-slate-300">Específicas</span>
                </label>
              </div>

              {cohorteMode === 'especificas' && (
                <div className="space-y-3">
                  <div>
                    <label className="block text-xs text-slate-500 mb-1">Años</label>
                    <div className="flex flex-wrap gap-2">
                      {aniosDisponibles.map(anio => (
                        <button
                          key={anio}
                          onClick={() => setCohortesAnio(prev => prev.includes(anio) ? prev.filter(a => a !== anio) : [...prev, anio])}
                          className={`px-3 py-1 text-sm rounded-lg border transition-colors ${
                            cohortesAnio.includes(anio)
                              ? 'bg-purple-600 border-purple-600 text-white'
                              : 'border-slate-200 dark:border-slate-700 text-slate-700 dark:text-slate-300 hover:border-purple-300'
                          }`}
                        >
                          {anio}
                        </button>
                      ))}
                    </div>
                  </div>
                  <div>
                    <label className="block text-xs text-slate-500 mb-1">Meses</label>
                    <div className="flex flex-wrap gap-2">
                      {mesesDisponibles.map(mes => (
                        <button
                          key={mes.num}
                          onClick={() => setCohortesMes(prev => prev.includes(mes.num) ? prev.filter(m => m !== mes.num) : [...prev, mes.num])}
                          className={`px-3 py-1 text-sm rounded-lg border transition-colors ${
                            cohortesMes.includes(mes.num)
                              ? 'bg-purple-600 border-purple-600 text-white'
                              : 'border-slate-200 dark:border-slate-700 text-slate-700 dark:text-slate-300 hover:border-purple-300'
                          }`}
                        >
                          {mes.nombre}
                        </button>
                      ))}
                    </div>
                  </div>
                </div>
              )}
            </div>
          </div>

          {/* ALUMNOS */}
          <div className="bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 rounded-xl p-6">
            <h2 className="text-sm font-semibold text-slate-800 dark:text-white mb-4 flex items-center gap-2">
              <GraduationCap size={16} className="text-green-600" />
              Alumnos
            </h2>
            <div className="grid grid-cols-2 gap-3">
              {ESTADOS_ALUMNO.map(estado => {
                const Icon = estado.icono;
                const isSelected = estadosAlumno.includes(estado.id);
                return (
                  <button
                    key={estado.id}
                    onClick={() => toggleEstadoAlumno(estado.id)}
                    className={`p-4 rounded-lg border-2 text-left transition-all ${
                      isSelected
                        ? 'border-purple-500 bg-purple-50 dark:bg-purple-500/10'
                        : 'border-slate-200 dark:border-slate-700 hover:border-slate-300'
                    }`}
                  >
                    <div className="flex items-start gap-3">
                      <Icon size={20} className={isSelected ? 'text-purple-600' : 'text-slate-400'} />
                      <div className="flex-1">
                        <p className={`font-medium text-sm ${isSelected ? 'text-purple-700 dark:text-purple-300' : 'text-slate-700 dark:text-slate-300'}`}>
                          {estado.nombre}
                        </p>
                        <p className="text-xs text-slate-500 mt-0.5">{estado.descripcion}</p>
                      </div>
                      <div className={`w-5 h-5 rounded border-2 flex items-center justify-center ${
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

            {/* Morosos */}
            <div className="mt-4 pt-4 border-t border-slate-100 dark:border-slate-800">
              <label className="flex items-center gap-3 cursor-pointer">
                <input
                  type="checkbox"
                  checked={soloMorosos}
                  onChange={(e) => setSoloMorosos(e.target.checked)}
                  className="w-4 h-4 rounded border-slate-300 text-purple-600 focus:ring-purple-500"
                />
                <div className="flex items-center gap-2">
                  <DollarSign size={16} className="text-red-500" />
                  <div>
                    <span className="text-sm font-medium text-slate-700 dark:text-slate-300">Solo morosos</span>
                    <p className="text-xs text-slate-500">Debe cuotas (pagó parcial)</p>
                  </div>
                </div>
              </label>
            </div>
          </div>

          {/* LEADS */}
          <div className="bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 rounded-xl p-6 opacity-50">
            <h2 className="text-sm font-semibold text-slate-800 dark:text-white mb-4 flex items-center gap-2">
              <Target size={16} className="text-blue-600" />
              Leads
              <span className="text-xs font-normal text-slate-500 ml-2">(próximamente)</span>
            </h2>
            <div className="grid grid-cols-2 gap-3">
              {SEGMENTOS_LEADS.map(segmento => {
                const Icon = segmento.icono;
                return (
                  <button
                    key={segmento.id}
                    disabled
                    className="p-4 rounded-lg border-2 border-slate-200 dark:border-slate-700 text-left cursor-not-allowed"
                  >
                    <div className="flex items-start gap-3">
                      <Icon size={20} className="text-slate-300" />
                      <div className="flex-1">
                        <p className="font-medium text-sm text-slate-400">{segmento.nombre}</p>
                        <p className="text-xs text-slate-400 mt-0.5">{segmento.descripcion}</p>
                      </div>
                    </div>
                  </button>
                );
              })}
            </div>
          </div>

          {/* COMUNIDAD */}
          <div className="bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 rounded-xl p-6">
            <h2 className="text-sm font-semibold text-slate-800 dark:text-white mb-4 flex items-center gap-2">
              <UsersRound size={16} className="text-amber-600" />
              Comunidad LC
              <span className="text-xs font-normal text-slate-500 ml-2">(no aplica cursos)</span>
            </h2>
            <label className="flex items-center gap-3 cursor-pointer">
              <input
                type="checkbox"
                checked={incluirComunidad}
                onChange={(e) => setIncluirComunidad(e.target.checked)}
                className="w-4 h-4 rounded border-slate-300 text-purple-600 focus:ring-purple-500"
              />
              <div>
                <span className="text-sm font-medium text-slate-700 dark:text-slate-300">Incluir toda la comunidad</span>
                <p className="text-xs text-slate-500">3,679 contactos de Comunidad LC</p>
              </div>
            </label>
          </div>

          {/* FILTROS */}
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
                  <p className="text-xs text-slate-500">No enviar a leads que ya se inscribieron</p>
                </div>
              </label>

              <div>
                <label className="block text-sm font-medium text-slate-700 dark:text-slate-300 mb-1">
                  Solo últimos X días
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

            {/* Botón calcular */}
            <div className="mt-6 pt-4 border-t border-slate-100 dark:border-slate-800">
              <button
                onClick={calcularAudiencia}
                disabled={calculando || (estadosAlumno.length === 0 && segmentosLeads.length === 0 && !incluirComunidad)}
                className="flex items-center gap-2 px-4 py-2 bg-purple-600 hover:bg-purple-700 text-white text-sm font-medium rounded-lg disabled:opacity-50 disabled:cursor-not-allowed"
              >
                <RefreshCw size={16} className={calculando ? 'animate-spin' : ''} />
                {calculando ? 'Calculando...' : 'Calcular audiencia'}
              </button>
            </div>

            {/* Preview */}
            {previewCalculado && audienciaResult && (
              <div className="mt-4">
                <div className="grid grid-cols-3 gap-4 mb-4">
                  <div className="bg-slate-50 dark:bg-slate-800 rounded-lg p-4 text-center">
                    <p className="text-2xl font-bold text-slate-800 dark:text-white">{audienciaResult.total_encontrados.toLocaleString()}</p>
                    <p className="text-xs text-slate-500">Total</p>
                  </div>
                  <div className="bg-red-50 dark:bg-red-500/10 rounded-lg p-4 text-center">
                    <p className="text-2xl font-bold text-red-600">-{audienciaResult.excluidos}</p>
                    <p className="text-xs text-slate-500">Duplicados</p>
                  </div>
                  <div className="bg-green-50 dark:bg-green-500/10 rounded-lg p-4 text-center">
                    <p className="text-2xl font-bold text-green-600">{audienciaResult.audiencia_final.toLocaleString()}</p>
                    <p className="text-xs text-slate-500">Final</p>
                  </div>
                </div>

                {/* Desglose */}
                <div className="bg-slate-50 dark:bg-slate-800 rounded-lg p-4">
                  <p className="text-xs font-medium text-slate-600 dark:text-slate-400 mb-2">Desglose:</p>
                  <div className="flex flex-wrap gap-3 text-xs">
                    {audienciaResult.desglose.egresado > 0 && (
                      <span className="text-green-600">🎓 {audienciaResult.desglose.egresado} egresados</span>
                    )}
                    {audienciaResult.desglose.cursando > 0 && (
                      <span className="text-blue-600">📚 {audienciaResult.desglose.cursando} cursando</span>
                    )}
                    {audienciaResult.desglose.baja > 0 && (
                      <span className="text-amber-600">⚠️ {audienciaResult.desglose.baja} bajas</span>
                    )}
                    {audienciaResult.desglose.moroso > 0 && (
                      <span className="text-red-600">💰 {audienciaResult.desglose.moroso} morosos</span>
                    )}
                    {audienciaResult.desglose.comunidad > 0 && (
                      <span className="text-purple-600">👥 {audienciaResult.desglose.comunidad} comunidad</span>
                    )}
                  </div>
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
              disabled={guardando || !previewCalculado || !audienciaResult || audienciaResult.audiencia_final === 0}
              className="flex items-center gap-2 px-6 py-2.5 bg-green-600 hover:bg-green-700 text-white text-sm font-medium rounded-lg disabled:opacity-50 disabled:cursor-not-allowed"
            >
              <Send size={16} />
              {guardando ? 'Creando...' : `Crear y enviar a ${audienciaResult?.audiencia_final.toLocaleString() || 0} contactos`}
            </button>
          </div>

        </div>
      </div>
    </div>
  );
}
