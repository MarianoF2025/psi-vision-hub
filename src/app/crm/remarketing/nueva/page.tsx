'use client';

import { useState, useEffect } from 'react';
import { supabase } from '@/lib/supabase';
import { useRouter } from 'next/navigation';
import { ArrowLeft, Save, Send, Clock, Users, Filter, Calendar } from 'lucide-react';
import Link from 'next/link';

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

export default function NuevaCampanaPage() {
  const router = useRouter();
  
  
  const [guardando, setGuardando] = useState(false);
  const [etiquetas, setEtiquetas] = useState<Etiqueta[]>([]);
  const [templates, setTemplates] = useState<Template[]>([]);
  const [calculando, setCalculando] = useState(false);
  
  const [nombre, setNombre] = useState('');
  const [descripcion, setDescripcion] = useState('');
  const [cursoExcluir, setCursoExcluir] = useState('');
  const [templateSeleccionado, setTemplateSeleccionado] = useState('');
  const [etiquetasSeleccionadas, setEtiquetasSeleccionadas] = useState<string[]>([]);
  const [tipoEnvio, setTipoEnvio] = useState<'manual' | 'programado'>('manual');
  const [fechaProgramada, setFechaProgramada] = useState('');
  const [horaProgramada, setHoraProgramada] = useState('09:00');
  
  const [totalAudiencia, setTotalAudiencia] = useState(0);
  const [totalExcluidos, setTotalExcluidos] = useState(0);
  const [totalElegibles, setTotalElegibles] = useState(0);
  const [previewCalculado, setPreviewCalculado] = useState(false);

  const cursosDisponibles = [
    { codigo: 'AT', nombre: 'Acompañante Terapéutico' },
    { codigo: 'APA', nombre: 'Aprendizaje y Psicología del Adulto' },
    { codigo: 'PNIE', nombre: 'Psiconeuroinmunoendocrinología' },
    { codigo: 'COACHING', nombre: 'Coaching Ontológico' },
    { codigo: 'MINDFULNESS', nombre: 'Mindfulness' },
  ];

  useEffect(() => {
    cargarDatos();
  }, []);

  const cargarDatos = async () => {
    const { data: etiquetasData } = await supabase
      .from('etiquetas')
      .select('*')
      .order('nombre');
    if (etiquetasData) setEtiquetas(etiquetasData);

    const { data: templatesData } = await supabase
      .from('remarketing_templates')
      .select('*')
      .eq('estado', 'activo')
      .order('nombre');
    if (templatesData) setTemplates(templatesData);
  };

  const toggleEtiqueta = (id: string) => {
    setEtiquetasSeleccionadas(prev =>
      prev.includes(id) ? prev.filter(e => e !== id) : [...prev, id]
    );
    setPreviewCalculado(false);
  };

  const calcularElegibles = async () => {
    if (etiquetasSeleccionadas.length === 0) {
      alert('Seleccioná al menos una etiqueta para la audiencia');
      return;
    }
    setCalculando(true);
    try {
      const { data: contactosData, error } = await supabase
        .from('contacto_etiquetas')
        .select('contacto_id, contactos!inner(telefono)')
        .in('etiqueta_id', etiquetasSeleccionadas);
      if (error) throw error;
      const telefonosUnicos = [...new Set(contactosData?.map((c: any) => c.contactos?.telefono).filter(Boolean))];
      setTotalAudiencia(telefonosUnicos.length);
      if (cursoExcluir) {
        const excluidos = Math.floor(telefonosUnicos.length * 0.1);
        setTotalExcluidos(excluidos);
        setTotalElegibles(telefonosUnicos.length - excluidos);
      } else {
        setTotalExcluidos(0);
        setTotalElegibles(telefonosUnicos.length);
      }
      setPreviewCalculado(true);
    } catch (error) {
      console.error('Error calculando elegibles:', error);
      alert('Error al calcular audiencia');
    } finally {
      setCalculando(false);
    }
  };

  const guardarCampana = async (enviarAhora: boolean = false) => {
    if (!nombre.trim()) {
      alert('Ingresá un nombre para la campaña');
      return;
    }
    if (etiquetasSeleccionadas.length === 0) {
      alert('Seleccioná al menos una etiqueta para la audiencia');
      return;
    }
    if (enviarAhora && !previewCalculado) {
      alert('Calculá los elegibles antes de enviar');
      return;
    }
    if (tipoEnvio === 'programado' && !fechaProgramada) {
      alert('Seleccioná fecha y hora para el envío programado');
      return;
    }
    setGuardando(true);
    try {
      const cursoData = cursosDisponibles.find(c => c.codigo === cursoExcluir);
      const templateData = templates.find(t => t.id === templateSeleccionado);
      let programadaPara = null;
      if (tipoEnvio === 'programado' && fechaProgramada) {
        programadaPara = `${fechaProgramada}T${horaProgramada}:00`;
      }
      const { error } = await supabase
        .from('remarketing_campanas')
        .insert({
          nombre: nombre.trim(),
          descripcion: descripcion.trim(),
          curso_codigo: cursoExcluir || null,
          curso_nombre: cursoData?.nombre || null,
          template_nombre: templateData?.nombre || null,
          template_id: templateSeleccionado || null,
          audiencia_filtros: { etiquetas: etiquetasSeleccionadas },
          estado: enviarAhora ? 'enviando' : (tipoEnvio === 'programado' ? 'programada' : 'borrador'),
          programada_para: programadaPara,
          total_audiencia: totalAudiencia,
          total_excluidos: totalExcluidos,
          total_elegibles: totalElegibles,
        });
      if (error) throw error;
      if (enviarAhora) {
        alert(`Campaña creada. Se enviarán ${totalElegibles} mensajes.`);
      }
      router.push('/crm/remarketing');
    } catch (error) {
      console.error('Error guardando campaña:', error);
      alert('Error al guardar la campaña');
    } finally {
      setGuardando(false);
    }
  };

  return (
    <div className="flex-1 flex flex-col h-full bg-slate-50 dark:bg-slate-950">
      <div className="h-14 border-b border-slate-200 dark:border-slate-800 bg-white dark:bg-slate-900 flex items-center justify-between px-6">
        <div className="flex items-center gap-4">
          <Link href="/crm/remarketing" className="p-2 hover:bg-slate-100 dark:hover:bg-slate-800 rounded-lg">
            <ArrowLeft size={20} className="text-slate-600 dark:text-slate-400" />
          </Link>
          <div>
            <h1 className="text-lg font-semibold text-slate-800 dark:text-white">Nueva Campaña</h1>
            <p className="text-xs text-slate-500">Configurá y enviá tu campaña de remarketing</p>
          </div>
        </div>
        <button
          onClick={() => guardarCampana(false)}
          disabled={guardando}
          className="flex items-center gap-2 px-4 py-2 border border-slate-200 dark:border-slate-700 text-slate-700 dark:text-slate-300 text-sm font-medium rounded-lg hover:bg-slate-100 dark:hover:bg-slate-800 disabled:opacity-50"
        >
          <Save size={16} />
          Guardar borrador
        </button>
      </div>

      <div className="flex-1 overflow-auto p-6">
        <div className="max-w-4xl mx-auto space-y-6">
          
          <div className="bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 rounded-xl p-6">
            <h2 className="text-sm font-semibold text-slate-800 dark:text-white mb-4">Información básica</h2>
            <div className="space-y-4">
              <div>
                <label className="block text-sm font-medium text-slate-700 dark:text-slate-300 mb-1">Nombre de la campaña *</label>
                <input
                  type="text"
                  value={nombre}
                  onChange={(e) => setNombre(e.target.value)}
                  placeholder="Ej: Promo AT Marzo 2026"
                  className="w-full px-4 py-2 text-sm border border-slate-200 dark:border-slate-700 rounded-lg bg-white dark:bg-slate-800 text-slate-800 dark:text-white focus:outline-none focus:ring-2 focus:ring-indigo-500"
                />
              </div>
              <div>
                <label className="block text-sm font-medium text-slate-700 dark:text-slate-300 mb-1">Descripción (opcional)</label>
                <textarea
                  value={descripcion}
                  onChange={(e) => setDescripcion(e.target.value)}
                  placeholder="Descripción interna..."
                  rows={2}
                  className="w-full px-4 py-2 text-sm border border-slate-200 dark:border-slate-700 rounded-lg bg-white dark:bg-slate-800 text-slate-800 dark:text-white focus:outline-none focus:ring-2 focus:ring-indigo-500 resize-none"
                />
              </div>
            </div>
          </div>

          <div className="bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 rounded-xl p-6">
            <h2 className="text-sm font-semibold text-slate-800 dark:text-white mb-4 flex items-center gap-2">
              <Users size={16} />
              Audiencia
            </h2>
            <div className="space-y-4">
              <div>
                <label className="block text-sm font-medium text-slate-700 dark:text-slate-300 mb-2">Etiquetas para la audiencia *</label>
                <div className="flex flex-wrap gap-2">
                  {etiquetas.map((etiqueta) => (
                    <button
                      key={etiqueta.id}
                      onClick={() => toggleEtiqueta(etiqueta.id)}
                      className={`px-3 py-1.5 rounded-full text-sm font-medium transition-colors ${
                        etiquetasSeleccionadas.includes(etiqueta.id)
                          ? 'bg-indigo-600 text-white'
                          : 'bg-slate-100 dark:bg-slate-800 text-slate-700 dark:text-slate-300 hover:bg-slate-200 dark:hover:bg-slate-700'
                      }`}
                    >
                      {etiqueta.nombre}
                    </button>
                  ))}
                  {etiquetas.length === 0 && <p className="text-sm text-slate-500">No hay etiquetas disponibles</p>}
                </div>
              </div>
              <div>
                <label className="block text-sm font-medium text-slate-700 dark:text-slate-300 mb-1">Excluir inscriptos en curso</label>
                <select
                  value={cursoExcluir}
                  onChange={(e) => { setCursoExcluir(e.target.value); setPreviewCalculado(false); }}
                  className="w-full px-4 py-2 text-sm border border-slate-200 dark:border-slate-700 rounded-lg bg-white dark:bg-slate-800 text-slate-800 dark:text-white focus:outline-none focus:ring-2 focus:ring-indigo-500"
                >
                  <option value="">No excluir ningún curso</option>
                  {cursosDisponibles.map((curso) => (
                    <option key={curso.codigo} value={curso.codigo}>{curso.nombre}</option>
                  ))}
                </select>
              </div>
              <div className="pt-4 border-t border-slate-100 dark:border-slate-800">
                <button
                  onClick={calcularElegibles}
                  disabled={calculando || etiquetasSeleccionadas.length === 0}
                  className="flex items-center gap-2 px-4 py-2 bg-slate-100 dark:bg-slate-800 hover:bg-slate-200 dark:hover:bg-slate-700 text-slate-700 dark:text-slate-300 text-sm font-medium rounded-lg disabled:opacity-50"
                >
                  <Filter size={16} />
                  {calculando ? 'Calculando...' : 'Calcular elegibles'}
                </button>
                {previewCalculado && (
                  <div className="mt-4 grid grid-cols-3 gap-4">
                    <div className="bg-slate-50 dark:bg-slate-800 rounded-lg p-4 text-center">
                      <p className="text-2xl font-bold text-slate-800 dark:text-white">{totalAudiencia.toLocaleString()}</p>
                      <p className="text-xs text-slate-500">Audiencia total</p>
                    </div>
                    <div className="bg-red-50 dark:bg-red-500/10 rounded-lg p-4 text-center">
                      <p className="text-2xl font-bold text-red-600">-{totalExcluidos.toLocaleString()}</p>
                      <p className="text-xs text-slate-500">Excluidos</p>
                    </div>
                    <div className="bg-green-50 dark:bg-green-500/10 rounded-lg p-4 text-center">
                      <p className="text-2xl font-bold text-green-600">{totalElegibles.toLocaleString()}</p>
                      <p className="text-xs text-slate-500">Elegibles</p>
                    </div>
                  </div>
                )}
              </div>
            </div>
          </div>

          <div className="bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 rounded-xl p-6">
            <h2 className="text-sm font-semibold text-slate-800 dark:text-white mb-4">Template de WhatsApp</h2>
            <select
              value={templateSeleccionado}
              onChange={(e) => setTemplateSeleccionado(e.target.value)}
              className="w-full px-4 py-2 text-sm border border-slate-200 dark:border-slate-700 rounded-lg bg-white dark:bg-slate-800 text-slate-800 dark:text-white focus:outline-none focus:ring-2 focus:ring-indigo-500"
            >
              <option value="">Seleccionar template...</option>
              {templates.map((template) => (
                <option key={template.id} value={template.id}>{template.nombre}</option>
              ))}
            </select>
          </div>

          <div className="bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 rounded-xl p-6">
            <h2 className="text-sm font-semibold text-slate-800 dark:text-white mb-4">Tipo de envío</h2>
            <div className="grid grid-cols-2 gap-4 mb-4">
              <button
                onClick={() => setTipoEnvio('manual')}
                className={`p-4 rounded-lg border-2 transition-colors ${
                  tipoEnvio === 'manual' ? 'border-indigo-600 bg-indigo-50 dark:bg-indigo-500/10' : 'border-slate-200 dark:border-slate-700'
                }`}
              >
                <Send size={24} className={tipoEnvio === 'manual' ? 'text-indigo-600 mb-2' : 'text-slate-400 mb-2'} />
                <p className={`font-medium ${tipoEnvio === 'manual' ? 'text-indigo-600' : 'text-slate-700 dark:text-slate-300'}`}>Envío manual</p>
                <p className="text-xs text-slate-500 mt-1">Enviás cuando quieras</p>
              </button>
              <button
                onClick={() => setTipoEnvio('programado')}
                className={`p-4 rounded-lg border-2 transition-colors ${
                  tipoEnvio === 'programado' ? 'border-indigo-600 bg-indigo-50 dark:bg-indigo-500/10' : 'border-slate-200 dark:border-slate-700'
                }`}
              >
                <Clock size={24} className={tipoEnvio === 'programado' ? 'text-indigo-600 mb-2' : 'text-slate-400 mb-2'} />
                <p className={`font-medium ${tipoEnvio === 'programado' ? 'text-indigo-600' : 'text-slate-700 dark:text-slate-300'}`}>Programar envío</p>
                <p className="text-xs text-slate-500 mt-1">Se envía automáticamente</p>
              </button>
            </div>
            {tipoEnvio === 'programado' && (
              <div className="grid grid-cols-2 gap-4 p-4 bg-slate-50 dark:bg-slate-800 rounded-lg">
                <div>
                  <label className="block text-sm font-medium text-slate-700 dark:text-slate-300 mb-1">Fecha</label>
                  <input type="date" value={fechaProgramada} onChange={(e) => setFechaProgramada(e.target.value)} min={new Date().toISOString().split('T')[0]} className="w-full px-4 py-2 text-sm border border-slate-200 dark:border-slate-700 rounded-lg bg-white dark:bg-slate-900 text-slate-800 dark:text-white focus:outline-none focus:ring-2 focus:ring-indigo-500" />
                </div>
                <div>
                  <label className="block text-sm font-medium text-slate-700 dark:text-slate-300 mb-1">Hora</label>
                  <input type="time" value={horaProgramada} onChange={(e) => setHoraProgramada(e.target.value)} className="w-full px-4 py-2 text-sm border border-slate-200 dark:border-slate-700 rounded-lg bg-white dark:bg-slate-900 text-slate-800 dark:text-white focus:outline-none focus:ring-2 focus:ring-indigo-500" />
                </div>
              </div>
            )}
          </div>

          <div className="flex justify-end gap-3 pb-6">
            <Link href="/crm/remarketing" className="px-6 py-2.5 border border-slate-200 dark:border-slate-700 text-slate-700 dark:text-slate-300 text-sm font-medium rounded-lg hover:bg-slate-100 dark:hover:bg-slate-800">
              Cancelar
            </Link>
            {tipoEnvio === 'manual' ? (
              <button
                onClick={() => guardarCampana(true)}
                disabled={guardando || !previewCalculado}
                className="flex items-center gap-2 px-6 py-2.5 bg-green-600 hover:bg-green-700 text-white text-sm font-medium rounded-lg disabled:opacity-50"
              >
                <Send size={16} />
                {guardando ? 'Enviando...' : `Enviar a ${totalElegibles.toLocaleString()} contactos`}
              </button>
            ) : (
              <button
                onClick={() => guardarCampana(false)}
                disabled={guardando || !fechaProgramada}
                className="flex items-center gap-2 px-6 py-2.5 bg-indigo-600 hover:bg-indigo-700 text-white text-sm font-medium rounded-lg disabled:opacity-50"
              >
                <Calendar size={16} />
                {guardando ? 'Guardando...' : 'Programar campaña'}
              </button>
            )}
          </div>
        </div>
      </div>
    </div>
  );
}
