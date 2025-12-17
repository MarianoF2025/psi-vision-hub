'use client';

import { useState, useEffect, useRef } from 'react';
import { useParams, useRouter, useSearchParams } from 'next/navigation';
import { ArrowLeft, Save, BookOpen, List, Megaphone, BarChart3, Plus, Trash2, Eye, X, Link2, Award, HeartHandshake, TrendingUp, Baby, Puzzle, GraduationCap, User, Brain, ChevronDown, Circle, DollarSign, Calendar, Clock, Medal, Briefcase, Home, FileText, ClipboardList, Users, MousePointerClick, Target, UserX, RefreshCw } from 'lucide-react';

interface Curso {
  id: string;
  codigo: string;
  nombre: string;
  descripcion?: string;
  activo: boolean;
  mensaje_bienvenida?: string;
  mensaje_saludo?: string;
  tipo_formacion?: string;
  categoria?: string;
  inscripciones_abiertas?: boolean;
  disponible_entrada_directa?: boolean;
  info_precio?: string;
  info_fechas?: string;
  info_duracion?: string;
  info_certificacion?: string;
  info_salida_laboral?: string;
  info_modalidad?: string;
  info_contenido?: string;
  info_requisitos?: string;
}

interface MenuOpcion {
  id: string;
  curso_id: string;
  orden: number;
  emoji?: string;
  titulo: string;
  subtitulo?: string;
  tipo: 'info' | 'derivar' | 'inscribir';
  campo_info?: string;
  respuesta_custom?: string;
  mostrar_menu_despues: boolean;
  mensaje_derivacion?: string;
  activo: boolean;
}

interface Anuncio {
  id: string;
  ad_id: string;
  curso_id: string;
  nombre?: string;
  activo: boolean;
  ejecuciones: number;
}

interface StatsData {
  resumen: {
    leads_mes_actual: number;
    leads_mes_anterior: number;
    variacion_leads: number;
    leads_total: number;
    tasa_engagement: number;
    tasa_abandono: number;
    total_interacciones: number;
    inscripciones: number;
    derivaciones: number;
    info_requests: number;
    tasa_inscripcion: number;
    tasa_derivacion: number;
  };
  opciones: Array<{
    id: string;
    orden: number;
    emoji: string;
    titulo: string;
    tipo: string;
    activo: boolean;
    veces_elegida: number;
    ctr: number;
  }>;
  anuncios: Array<{
    id: string;
    ad_id: string;
    nombre: string;
    activo: boolean;
    ejecuciones: number;
    leads: number;
    engagement: number;
    inscripciones: number;
    tasa_inscripcion: number;
  }>;
}

const API_URL = '/api/automatizaciones';

const CAMPOS_INFO = [
  { value: 'info_precio', label: 'Precio', icon: DollarSign, color: 'text-green-600' },
  { value: 'info_fechas', label: 'Fechas', icon: Calendar, color: 'text-blue-600' },
  { value: 'info_duracion', label: 'Duración', icon: Clock, color: 'text-purple-600' },
  { value: 'info_certificacion', label: 'Certificación', icon: Medal, color: 'text-amber-600' },
  { value: 'info_salida_laboral', label: 'Salida Laboral', icon: Briefcase, color: 'text-indigo-600' },
  { value: 'info_modalidad', label: 'Modalidad', icon: Home, color: 'text-teal-600' },
  { value: 'info_contenido', label: 'Contenido', icon: FileText, color: 'text-orange-600' },
  { value: 'info_requisitos', label: 'Requisitos', icon: ClipboardList, color: 'text-rose-600' },
];

const CATEGORIAS = [
  { value: 'acompanamiento_terapeutico', label: 'Acompañamiento Terapéutico', icon: HeartHandshake, color: 'text-pink-500', bg: 'bg-pink-50' },
  { value: 'coaching_crecimiento', label: 'Coaching y Crecimiento Personal', icon: TrendingUp, color: 'text-green-500', bg: 'bg-green-50' },
  { value: 'crianza', label: 'Crianza', icon: Baby, color: 'text-orange-500', bg: 'bg-orange-50' },
  { value: 'discapacidad_neurodiversidad', label: 'Discapacidad y Neurodiversidad', icon: Puzzle, color: 'text-indigo-500', bg: 'bg-indigo-50' },
  { value: 'educacion', label: 'Educación', icon: GraduationCap, color: 'text-cyan-500', bg: 'bg-cyan-50' },
  { value: 'gerontologia', label: 'Gerontología', icon: User, color: 'text-amber-600', bg: 'bg-amber-50' },
  { value: 'psicologia_salud_mental', label: 'Psicología y Salud Mental', icon: Brain, color: 'text-rose-500', bg: 'bg-rose-50' },
];

export default function CursoDetailPage() {
  const params = useParams();
  const router = useRouter();
  const searchParams = useSearchParams();
  const cursoId = params.id as string;
  const isNew = cursoId === 'nuevo';

  const [activeTab, setActiveTab] = useState(searchParams.get('tab') || 'info');
  const [curso, setCurso] = useState<Curso | null>(null);
  const [opciones, setOpciones] = useState<MenuOpcion[]>([]);
  const [anuncios, setAnuncios] = useState<Anuncio[]>([]);
  const [loading, setLoading] = useState(!isNew);
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [success, setSuccess] = useState<string | null>(null);

  // Stats
  const [stats, setStats] = useState<StatsData | null>(null);
  const [loadingStats, setLoadingStats] = useState(false);

  // Dropdown categoría
  const [openCatDropdown, setOpenCatDropdown] = useState(false);
  const catDropdownRef = useRef<HTMLDivElement>(null);

  // Modal anuncio
  const [showAnuncioModal, setShowAnuncioModal] = useState(false);
  const [nuevoAnuncio, setNuevoAnuncio] = useState({ ad_id: '', nombre: '' });
  const [savingAnuncio, setSavingAnuncio] = useState(false);

  const [formData, setFormData] = useState<Partial<Curso>>({
    codigo: '', nombre: '', descripcion: '', mensaje_bienvenida: '', mensaje_saludo: '',
    tipo_formacion: 'curso', categoria: '', inscripciones_abiertas: true, disponible_entrada_directa: false,
    info_precio: '', info_fechas: '', info_duracion: '', info_certificacion: '',
    info_salida_laboral: '', info_modalidad: '',
  });

  useEffect(() => {
    function handleClickOutside(event: MouseEvent) {
      if (catDropdownRef.current && !catDropdownRef.current.contains(event.target as Node)) {
        setOpenCatDropdown(false);
      }
    }
    document.addEventListener('mousedown', handleClickOutside);
    return () => document.removeEventListener('mousedown', handleClickOutside);
  }, []);

  useEffect(() => {
    if (!isNew) cargarCurso();
  }, [cursoId]);

  useEffect(() => {
    if (activeTab === 'stats' && !stats && !isNew) {
      cargarStats();
    }
  }, [activeTab]);

  async function cargarCurso() {
    try {
      const res = await fetch(`${API_URL}?path=cursos/${cursoId}/completo`);
      const data = await res.json();
      if (data.success) {
        setCurso(data.data);
        setFormData(data.data);
        setOpciones(data.data.opciones || []);
        setAnuncios(data.data.anuncios || []);
      } else {
        setError('Curso no encontrado');
      }
    } catch (err) {
      setError('Error cargando curso');
    } finally {
      setLoading(false);
    }
  }

  async function cargarStats() {
    setLoadingStats(true);
    try {
      const res = await fetch(`${API_URL}?path=stats/cursos/${cursoId}/detalle`);
      const data = await res.json();
      if (data.success) {
        setStats(data.data);
      }
    } catch (err) {
      console.error('Error cargando stats:', err);
    } finally {
      setLoadingStats(false);
    }
  }

  async function guardarCurso() {
    setSaving(true);
    setError(null);
    try {
      const url = isNew ? `${API_URL}?path=cursos` : `${API_URL}?path=cursos/${cursoId}`;
      const method = isNew ? 'POST' : 'PUT';
      const res = await fetch(url, {
        method, headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(formData)
      });
      const data = await res.json();
      if (data.success) {
        setSuccess('Curso guardado exitosamente');
        if (isNew) router.push(`/crm/automatizaciones/cursos/${data.data.id}`);
        else setCurso(data.data);
        setTimeout(() => setSuccess(null), 3000);
      } else {
        setError(data.error || 'Error guardando');
      }
    } catch (err) {
      setError('Error de conexión');
    } finally {
      setSaving(false);
    }
  }

  async function agregarOpcion() {
    const nuevaOpcion = { titulo: 'Nueva opción', tipo: 'info' as const, campo_info: 'info_precio', emoji: '📌', mostrar_menu_despues: true };
    try {
      const res = await fetch(`${API_URL}?path=cursos/${cursoId}/opciones`, {
        method: 'POST', headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(nuevaOpcion)
      });
      const data = await res.json();
      if (data.success) setOpciones([...opciones, data.data]);
    } catch (err) { console.error(err); }
  }

  async function actualizarOpcion(id: string, cambios: Partial<MenuOpcion>) {
    try {
      const res = await fetch(`${API_URL}?path=opciones/${id}`, {
        method: 'PUT', headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(cambios)
      });
      const data = await res.json();
      if (data.success) setOpciones(opciones.map(o => o.id === id ? data.data : o));
    } catch (err) { console.error(err); }
  }

  async function eliminarOpcion(id: string) {
    if (!confirm('¿Eliminar esta opción?')) return;
    try {
      const res = await fetch(`${API_URL}?path=opciones/${id}`, { method: 'DELETE' });
      const data = await res.json();
      if (data.success) setOpciones(opciones.filter(o => o.id !== id));
    } catch (err) { console.error(err); }
  }

  async function toggleOpcion(id: string) {
    try {
      const res = await fetch(`${API_URL}?path=opciones/${id}/toggle`, { method: 'PATCH' });
      const data = await res.json();
      if (data.success) setOpciones(opciones.map(o => o.id === id ? { ...o, activo: data.data.activo } : o));
    } catch (err) { console.error(err); }
  }

  async function vincularAnuncio() {
    if (!nuevoAnuncio.ad_id.trim()) { setError('El ID del anuncio es requerido'); return; }
    setSavingAnuncio(true);
    setError(null);
    try {
      const res = await fetch(`${API_URL}?path=anuncios`, {
        method: 'POST', headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ ad_id: nuevoAnuncio.ad_id.trim(), curso_id: cursoId, nombre: nuevoAnuncio.nombre.trim() || null })
      });
      const data = await res.json();
      if (data.success) {
        setAnuncios([...anuncios, data.data]);
        setShowAnuncioModal(false);
        setNuevoAnuncio({ ad_id: '', nombre: '' });
        setSuccess('Anuncio vinculado exitosamente');
        setTimeout(() => setSuccess(null), 3000);
      } else {
        setError(data.error || 'Error vinculando anuncio');
      }
    } catch (err) {
      setError('Error de conexión');
    } finally {
      setSavingAnuncio(false);
    }
  }

  async function desvincularAnuncio(id: string) {
    if (!confirm('¿Desvincular este anuncio del curso?')) return;
    try {
      const res = await fetch(`${API_URL}?path=anuncios/${id}`, { method: 'DELETE' });
      const data = await res.json();
      if (data.success) {
        setAnuncios(anuncios.filter(a => a.id !== id));
        setSuccess('Anuncio desvinculado');
        setTimeout(() => setSuccess(null), 3000);
      }
    } catch (err) { console.error(err); }
  }

  async function toggleAnuncio(id: string) {
    try {
      const res = await fetch(`${API_URL}?path=anuncios/${id}/toggle`, { method: 'PATCH' });
      const data = await res.json();
      if (data.success) setAnuncios(anuncios.map(a => a.id === id ? { ...a, activo: data.data.activo } : a));
    } catch (err) { console.error(err); }
  }

  const selectedCategoria = CATEGORIAS.find(c => c.value === formData.categoria);
  const getCampoInfo = (value: string) => CAMPOS_INFO.find(c => c.value === value);

  if (loading) return <div className="flex items-center justify-center h-full"><div className="animate-spin w-8 h-8 border-4 border-blue-500 border-t-transparent rounded-full" /></div>;

  const tabs = [
    { id: 'info', label: 'Información', icon: BookOpen },
    { id: 'menu', label: 'Menú', icon: List, disabled: isNew },
    { id: 'anuncios', label: 'Anuncios', icon: Megaphone, disabled: isNew },
    { id: 'stats', label: 'Estadísticas', icon: BarChart3, disabled: isNew },
  ];

  const mesActual = new Date().toLocaleDateString('es-AR', { month: 'long', year: 'numeric' });

  return (
    <div className="p-6 max-w-5xl mx-auto h-full overflow-y-auto">
      {/* Header */}
      <div className="flex items-center gap-4 mb-6">
        <button onClick={() => router.push('/crm/automatizaciones')} className="p-2 hover:bg-gray-100 rounded-lg">
          <ArrowLeft className="w-5 h-5" />
        </button>
        <div className="flex-1">
          <h1 className="text-2xl font-bold">{isNew ? 'Nuevo Curso' : formData.nombre}</h1>
          {!isNew && <span className="text-sm text-gray-500">Código: {formData.codigo}</span>}
        </div>
        <button onClick={guardarCurso} disabled={saving} className="flex items-center gap-2 bg-blue-600 text-white px-4 py-2 rounded-lg hover:bg-blue-700 disabled:opacity-50">
          <Save className="w-5 h-5" />
          {saving ? 'Guardando...' : 'Guardar'}
        </button>
      </div>

      {error && <div className="bg-red-50 border border-red-200 text-red-700 px-4 py-3 rounded-lg mb-4">{error}</div>}
      {success && <div className="bg-green-50 border border-green-200 text-green-700 px-4 py-3 rounded-lg mb-4">{success}</div>}

      {/* Tabs */}
      <div className="flex gap-1 mb-6 bg-gray-100 p-1 rounded-lg">
        {tabs.map(tab => (
          <button key={tab.id} onClick={() => !tab.disabled && setActiveTab(tab.id)} disabled={tab.disabled}
            className={`flex items-center gap-2 px-4 py-2 rounded-md transition flex-1 justify-center ${activeTab === tab.id ? 'bg-white shadow text-blue-600' : 'text-gray-600 hover:text-gray-900'} ${tab.disabled ? 'opacity-50 cursor-not-allowed' : ''}`}>
            <tab.icon className="w-4 h-4" />{tab.label}
          </button>
        ))}
      </div>

      <div className="bg-white rounded-xl shadow-sm border p-6">
        {/* INFO TAB */}
        {activeTab === 'info' && (
          <div className="space-y-6">
            <div className="grid grid-cols-2 gap-4">
              <div>
                <label className="block text-sm font-medium mb-1">Código *</label>
                <input type="text" value={formData.codigo || ''} onChange={e => setFormData({ ...formData, codigo: e.target.value.toUpperCase() })}
                  className="w-full px-3 py-2 border rounded-lg" placeholder="AT, TEA, HIP..." disabled={!isNew} />
              </div>
              <div>
                <label className="block text-sm font-medium mb-1">Nombre *</label>
                <input type="text" value={formData.nombre || ''} onChange={e => setFormData({ ...formData, nombre: e.target.value })}
                  className="w-full px-3 py-2 border rounded-lg" placeholder="Acompañante Terapéutico" />
              </div>
            </div>
            <div>
              <label className="block text-sm font-medium mb-1">Descripción</label>
              <textarea value={formData.descripcion || ''} onChange={e => setFormData({ ...formData, descripcion: e.target.value })}
                className="w-full px-3 py-2 border rounded-lg" rows={2} />
            </div>
            <div>
              <label className="block text-sm font-medium mb-1">Mensaje de Saludo (previo al menú)</label>
              <textarea value={formData.mensaje_saludo || ''} onChange={e => setFormData({ ...formData, mensaje_saludo: e.target.value })}
                className="w-full px-3 py-2 border rounded-lg" rows={2} placeholder="¡Hola! 👋 Gracias por escribirnos..." />
              <p className="text-xs text-gray-500 mt-1">Se envía como mensaje separado antes del menú</p>
            </div>
            <div>
              <label className="block text-sm font-medium mb-1">Mensaje de Bienvenida (menú)</label>
              <textarea value={formData.mensaje_bienvenida || ''} onChange={e => setFormData({ ...formData, mensaje_bienvenida: e.target.value })}
                className="w-full px-3 py-2 border rounded-lg" rows={3} placeholder="¡Hola! 👋 Gracias por tu interés en..." />
            </div>
            <hr />
            <h3 className="font-semibold">Configuración</h3>
            <div>
              <label className="block text-sm font-medium mb-2">Tipo de Formación</label>
              <div className="flex gap-3">
                <button type="button" onClick={() => setFormData({ ...formData, tipo_formacion: 'curso' })}
                  className={`flex-1 flex items-center justify-center gap-2 px-4 py-3 border-2 rounded-lg font-medium transition ${formData.tipo_formacion === 'curso' ? 'border-blue-500 bg-blue-50 text-blue-700' : 'border-gray-200 text-gray-600 hover:border-gray-300'}`}>
                  <BookOpen className="w-5 h-5" /> Curso
                </button>
                <button type="button" onClick={() => setFormData({ ...formData, tipo_formacion: 'especializacion' })}
                  className={`flex-1 flex items-center justify-center gap-2 px-4 py-3 border-2 rounded-lg font-medium transition ${formData.tipo_formacion === 'especializacion' ? 'border-purple-500 bg-purple-50 text-purple-700' : 'border-gray-200 text-gray-600 hover:border-gray-300'}`}>
                  <Award className="w-5 h-5" /> Especialización
                </button>
              </div>
            </div>
            <div>
              <label className="block text-sm font-medium mb-2">Categoría</label>
              <div className="relative" ref={catDropdownRef}>
                <button type="button" onClick={() => setOpenCatDropdown(!openCatDropdown)}
                  className="w-full flex items-center justify-between gap-2 border rounded-lg px-3 py-2.5 bg-white hover:bg-gray-50 transition">
                  <div className="flex items-center gap-2">
                    {selectedCategoria ? (<><selectedCategoria.icon className={`w-5 h-5 ${selectedCategoria.color}`} /><span>{selectedCategoria.label}</span></>) : (<><Circle className="w-5 h-5 text-gray-300" /><span className="text-gray-500">Seleccionar categoría...</span></>)}
                  </div>
                  <ChevronDown className={`w-4 h-4 text-gray-400 transition-transform ${openCatDropdown ? 'rotate-180' : ''}`} />
                </button>
                {openCatDropdown && (
                  <div className="absolute z-20 w-full mt-1 bg-white border rounded-lg shadow-lg max-h-64 overflow-y-auto">
                    {CATEGORIAS.map(cat => (
                      <div key={cat.value} onClick={() => { setFormData({ ...formData, categoria: cat.value }); setOpenCatDropdown(false); }}
                        className={`flex items-center gap-2 px-3 py-2.5 hover:bg-gray-50 cursor-pointer ${formData.categoria === cat.value ? 'bg-gray-50' : ''}`}>
                        <cat.icon className={`w-5 h-5 ${cat.color}`} /><span>{cat.label}</span>
                      </div>
                    ))}
                  </div>
                )}
              </div>
            </div>
            <div className="flex gap-6">
              <label className="flex items-center gap-3 cursor-pointer">
                <div className={`relative inline-flex h-6 w-11 items-center rounded-full transition-colors ${formData.inscripciones_abiertas ? 'bg-green-500' : 'bg-gray-300'}`}
                  onClick={() => setFormData({ ...formData, inscripciones_abiertas: !formData.inscripciones_abiertas })}>
                  <span className={`inline-block h-4 w-4 transform rounded-full bg-white transition-transform ${formData.inscripciones_abiertas ? 'translate-x-6' : 'translate-x-1'}`} />
                </div>
                <div><span className="text-sm font-medium">Inscripciones Abiertas</span><p className="text-xs text-gray-500">Aparece disponible para inscripción</p></div>
              </label>
              <label className="flex items-center gap-3 cursor-pointer">
                <div className={`relative inline-flex h-6 w-11 items-center rounded-full transition-colors ${formData.disponible_entrada_directa ? 'bg-green-500' : 'bg-gray-300'}`}
                  onClick={() => setFormData({ ...formData, disponible_entrada_directa: !formData.disponible_entrada_directa })}>
                  <span className={`inline-block h-4 w-4 transform rounded-full bg-white transition-transform ${formData.disponible_entrada_directa ? 'translate-x-6' : 'translate-x-1'}`} />
                </div>
                <div><span className="text-sm font-medium">Entrada Directa</span><p className="text-xs text-gray-500">Aparece en el menú cuando escriben a Ventas</p></div>
              </label>
            </div>
            <hr />
            <h3 className="font-semibold">Información del Curso</h3>
            <p className="text-sm text-gray-500 mb-4">Estos textos se envían cuando el usuario selecciona la opción correspondiente</p>
            {CAMPOS_INFO.map(campo => (
              <div key={campo.value}>
                <label className="flex items-center gap-2 text-sm font-medium mb-1"><campo.icon className={`w-4 h-4 ${campo.color}`} />{campo.label}</label>
                <textarea value={(formData as any)[campo.value] || ''} onChange={e => setFormData({ ...formData, [campo.value]: e.target.value })}
                  className="w-full px-3 py-2 border rounded-lg text-sm" rows={4} placeholder={`Texto para ${campo.label}...`} />
              </div>
            ))}
          </div>
        )}

        {/* MENU TAB */}
        {activeTab === 'menu' && (
          <div>
            <div className="flex justify-between items-center mb-4">
              <h3 className="font-semibold">Opciones del Menú</h3>
              <button onClick={agregarOpcion} className="flex items-center gap-2 text-blue-600 hover:text-blue-700"><Plus className="w-4 h-4" /> Agregar opción</button>
            </div>
            {opciones.length === 0 ? (
              <div className="text-center py-8 text-gray-500">No hay opciones. Agregá una para empezar.</div>
            ) : (
              <div className="space-y-3">
                {opciones.sort((a, b) => a.orden - b.orden).map(opcion => {
                  const campoSeleccionado = getCampoInfo(opcion.campo_info || '');
                  return (
                    <div key={opcion.id} className={`border rounded-lg p-4 ${opcion.activo ? 'bg-white' : 'bg-gray-50 opacity-60'}`}>
                      <div className="flex items-start gap-3">
                        <div className="flex-1 grid grid-cols-4 gap-3">
                          <input type="text" value={opcion.emoji || ''} onChange={e => actualizarOpcion(opcion.id, { emoji: e.target.value })} className="px-2 py-1 border rounded text-center w-16" placeholder="📌" />
                          <input type="text" value={opcion.titulo} onChange={e => actualizarOpcion(opcion.id, { titulo: e.target.value })} className="px-2 py-1 border rounded col-span-2" placeholder="Título" />
                          <select value={opcion.tipo} onChange={e => actualizarOpcion(opcion.id, { tipo: e.target.value as any })} className="px-2 py-1 border rounded">
                            <option value="info">Info</option><option value="derivar">Derivar</option><option value="inscribir">Inscribir</option>
                          </select>
                        </div>
                        <button onClick={() => toggleOpcion(opcion.id)} className={`p-1 rounded ${opcion.activo ? 'text-green-600' : 'text-gray-400'}`}><Eye className="w-5 h-5" /></button>
                        <button onClick={() => eliminarOpcion(opcion.id)} className="p-1 text-red-500 hover:text-red-700"><Trash2 className="w-5 h-5" /></button>
                      </div>
                      {opcion.tipo === 'info' && (
                        <div className="mt-3 ml-8 flex items-center gap-3">
                          <div className="flex items-center gap-2 border rounded px-2 py-1">
                            {campoSeleccionado && <campoSeleccionado.icon className={`w-4 h-4 ${campoSeleccionado.color}`} />}
                            <select value={opcion.campo_info || ''} onChange={e => actualizarOpcion(opcion.id, { campo_info: e.target.value })} className="text-sm bg-transparent border-none focus:ring-0 pr-6">
                              <option value="">Seleccionar campo...</option>
                              {CAMPOS_INFO.map(c => <option key={c.value} value={c.value}>{c.label}</option>)}
                            </select>
                          </div>
                          <label className="text-sm flex items-center gap-2">
                            <input type="checkbox" checked={opcion.mostrar_menu_despues} onChange={e => actualizarOpcion(opcion.id, { mostrar_menu_despues: e.target.checked })} className="rounded" />
                            Mostrar menú después
                          </label>
                        </div>
                      )}
                      {(opcion.tipo === 'derivar' || opcion.tipo === 'inscribir') && (
                        <div className="mt-3 ml-8">
                          <input type="text" value={opcion.mensaje_derivacion || ''} onChange={e => actualizarOpcion(opcion.id, { mensaje_derivacion: e.target.value })} className="w-full px-2 py-1 border rounded text-sm" placeholder="Mensaje antes de derivar..." />
                        </div>
                      )}
                    </div>
                  );
                })}
              </div>
            )}
          </div>
        )}

        {/* ANUNCIOS TAB */}
        {activeTab === 'anuncios' && (
          <div>
            <div className="flex justify-between items-center mb-4">
              <div><h3 className="font-semibold">Anuncios Vinculados</h3><p className="text-sm text-gray-500">Cuando un lead llegue desde estos anuncios, recibirá el menú de este curso.</p></div>
              <button onClick={() => setShowAnuncioModal(true)} className="flex items-center gap-2 bg-blue-600 text-white px-3 py-2 rounded-lg hover:bg-blue-700"><Link2 className="w-4 h-4" /> Vincular Anuncio</button>
            </div>
            {anuncios.length === 0 ? (
              <div className="text-center py-12 text-gray-500 border-2 border-dashed rounded-lg">
                <Megaphone className="w-12 h-12 mx-auto mb-3 text-gray-300" /><p>No hay anuncios vinculados a este curso.</p><p className="text-sm">Vinculá un anuncio de Meta Ads para activar el menú automático.</p>
              </div>
            ) : (
              <div className="space-y-3">
                {anuncios.map(anuncio => (
                  <div key={anuncio.id} className={`flex items-center justify-between p-4 border rounded-lg ${anuncio.activo ? 'bg-white' : 'bg-gray-50 opacity-60'}`}>
                    <div className="flex-1">
                      <div className="font-medium">{anuncio.nombre || `Anuncio ${anuncio.ad_id.slice(-8)}`}</div>
                      <div className="text-sm text-gray-500 font-mono">ID: {anuncio.ad_id}</div>
                      <div className="text-sm text-gray-400">{anuncio.ejecuciones} ejecuciones</div>
                    </div>
                    <div className="flex items-center gap-3">
                      <button onClick={() => toggleAnuncio(anuncio.id)} className={`relative inline-flex h-6 w-11 items-center rounded-full transition-colors ${anuncio.activo ? 'bg-green-500' : 'bg-gray-300'}`}>
                        <span className={`inline-block h-4 w-4 transform rounded-full bg-white transition-transform ${anuncio.activo ? 'translate-x-6' : 'translate-x-1'}`} />
                      </button>
                      <button onClick={() => desvincularAnuncio(anuncio.id)} className="p-2 text-red-500 hover:text-red-700 hover:bg-red-50 rounded-lg" title="Desvincular"><Trash2 className="w-5 h-5" /></button>
                    </div>
                  </div>
                ))}
              </div>
            )}
          </div>
        )}

        {/* STATS TAB */}
        {activeTab === 'stats' && (
          <div>
            <div className="flex justify-between items-center mb-6">
              <div>
                <h3 className="font-semibold text-lg">Estadísticas del Curso</h3>
                <p className="text-sm text-gray-500 capitalize">{mesActual}</p>
              </div>
              <button onClick={cargarStats} disabled={loadingStats} className="flex items-center gap-2 text-gray-600 hover:text-gray-900">
                <RefreshCw className={`w-4 h-4 ${loadingStats ? 'animate-spin' : ''}`} /> Actualizar
              </button>
            </div>

            {loadingStats ? (
              <div className="flex items-center justify-center py-12"><div className="animate-spin w-8 h-8 border-4 border-blue-500 border-t-transparent rounded-full" /></div>
            ) : !stats ? (
              <div className="text-center py-12 text-gray-500">No hay datos disponibles</div>
            ) : (
              <div className="space-y-6">
                {/* Cards resumen */}
                <div className="grid grid-cols-4 gap-4">
                  <div className="bg-gradient-to-br from-blue-50 to-blue-100 rounded-xl p-4">
                    <div className="flex items-center gap-2 text-blue-600 mb-2"><Users className="w-5 h-5" /><span className="text-sm font-medium">Leads</span></div>
                    <div className="text-3xl font-bold text-blue-700">{stats.resumen.leads_mes_actual}</div>
                    <div className={`text-sm mt-1 ${stats.resumen.variacion_leads >= 0 ? 'text-green-600' : 'text-red-600'}`}>
                      {stats.resumen.variacion_leads >= 0 ? '↑' : '↓'} {Math.abs(stats.resumen.variacion_leads)}% vs mes anterior
                    </div>
                  </div>
                  <div className="bg-gradient-to-br from-green-50 to-green-100 rounded-xl p-4">
                    <div className="flex items-center gap-2 text-green-600 mb-2"><MousePointerClick className="w-5 h-5" /><span className="text-sm font-medium">Engagement</span></div>
                    <div className="text-3xl font-bold text-green-700">{stats.resumen.tasa_engagement}%</div>
                    <div className="text-sm text-green-600 mt-1">interactuaron con el menú</div>
                  </div>
                  <div className="bg-gradient-to-br from-purple-50 to-purple-100 rounded-xl p-4">
                    <div className="flex items-center gap-2 text-purple-600 mb-2"><Target className="w-5 h-5" /><span className="text-sm font-medium">Inscripciones</span></div>
                    <div className="text-3xl font-bold text-purple-700">{stats.resumen.tasa_inscripcion}%</div>
                    <div className="text-sm text-purple-600 mt-1">{stats.resumen.inscripciones} pidieron inscribirse</div>
                  </div>
                  <div className="bg-gradient-to-br from-amber-50 to-amber-100 rounded-xl p-4">
                    <div className="flex items-center gap-2 text-amber-600 mb-2"><UserX className="w-5 h-5" /><span className="text-sm font-medium">Abandono</span></div>
                    <div className="text-3xl font-bold text-amber-700">{stats.resumen.tasa_abandono}%</div>
                    <div className="text-sm text-amber-600 mt-1">sin interacción</div>
                  </div>
                </div>

                {/* Rendimiento del menú */}
                <div className="border rounded-xl p-4">
                  <h4 className="font-semibold mb-4">Rendimiento del Menú</h4>
                  {stats.opciones.length === 0 ? (
                    <p className="text-gray-500 text-sm">No hay opciones configuradas</p>
                  ) : (
                    <div className="space-y-3">
                      {stats.opciones.map((op, idx) => {
                        const maxCTR = Math.max(...stats.opciones.map(o => o.ctr), 1);
                        const barWidth = (op.ctr / maxCTR) * 100;
                        const isTop = idx === 0 && op.ctr > 0;
                        return (
                          <div key={op.id} className="flex items-center gap-3">
                            <div className="w-8 text-center">{op.emoji}</div>
                            <div className="flex-1">
                              <div className="flex justify-between text-sm mb-1">
                                <span className="font-medium">{op.titulo}</span>
                                <span className="text-gray-600">{op.ctr}% ({op.veces_elegida})</span>
                              </div>
                              <div className="h-2 bg-gray-100 rounded-full overflow-hidden">
                                <div className={`h-full rounded-full ${op.tipo === 'inscribir' ? 'bg-purple-500' : op.tipo === 'derivar' ? 'bg-amber-500' : 'bg-blue-500'}`} style={{ width: `${barWidth}%` }} />
                              </div>
                            </div>
                            {isTop && <span className="text-yellow-500">⭐</span>}
                          </div>
                        );
                      })}
                    </div>
                  )}
                  <div className="flex gap-4 mt-4 pt-4 border-t text-xs text-gray-500">
                    <span className="flex items-center gap-1"><span className="w-3 h-3 bg-blue-500 rounded" /> Info</span>
                    <span className="flex items-center gap-1"><span className="w-3 h-3 bg-amber-500 rounded" /> Derivar</span>
                    <span className="flex items-center gap-1"><span className="w-3 h-3 bg-purple-500 rounded" /> Inscribir</span>
                  </div>
                </div>

                {/* Rendimiento por anuncio */}
                {stats.anuncios.length > 0 && (
                  <div className="border rounded-xl p-4">
                    <h4 className="font-semibold mb-4">Rendimiento por Anuncio</h4>
                    <div className="overflow-x-auto">
                      <table className="w-full text-sm">
                        <thead>
                          <tr className="text-left text-gray-500 border-b">
                            <th className="pb-2 font-medium">Anuncio</th>
                            <th className="pb-2 font-medium text-center">Leads</th>
                            <th className="pb-2 font-medium text-center">Engagement</th>
                            <th className="pb-2 font-medium text-center">Inscripciones</th>
                          </tr>
                        </thead>
                        <tbody>
                          {stats.anuncios.map((an, idx) => {
                            const isBest = stats.anuncios.length > 1 && an.tasa_inscripcion === Math.max(...stats.anuncios.map(a => a.tasa_inscripcion)) && an.tasa_inscripcion > 0;
                            return (
                              <tr key={an.id} className="border-b last:border-0">
                                <td className="py-3">
                                  <div className="font-medium">{an.nombre || `Anuncio ${an.ad_id.slice(-8)}`}</div>
                                  <div className="text-xs text-gray-400 font-mono">ID: ...{an.ad_id.slice(-8)}</div>
                                </td>
                                <td className="py-3 text-center font-medium">{an.leads}</td>
                                <td className="py-3 text-center">{an.engagement}%</td>
                                <td className="py-3 text-center">
                                  <span className="font-medium">{an.tasa_inscripcion}%</span>
                                  <span className="text-gray-400 ml-1">({an.inscripciones})</span>
                                  {isBest && <span className="ml-2 text-yellow-500">⭐</span>}
                                </td>
                              </tr>
                            );
                          })}
                        </tbody>
                      </table>
                    </div>
                  </div>
                )}

                {/* Totales */}
                <div className="bg-gray-50 rounded-xl p-4 text-sm text-gray-600">
                  <div className="flex justify-between">
                    <span>Total histórico: <strong>{stats.resumen.leads_total}</strong> leads</span>
                    <span>Total interacciones: <strong>{stats.resumen.total_interacciones}</strong></span>
                    <span>Derivaciones: <strong>{stats.resumen.derivaciones}</strong> ({stats.resumen.tasa_derivacion}%)</span>
                  </div>
                </div>
              </div>
            )}
          </div>
        )}
      </div>

      {/* Modal Vincular Anuncio */}
      {showAnuncioModal && (
        <div className="fixed inset-0 bg-black/50 flex items-center justify-center z-50">
          <div className="bg-white rounded-xl shadow-xl w-full max-w-md p-6">
            <div className="flex items-center justify-between mb-4">
              <h3 className="text-lg font-semibold">Vincular Anuncio</h3>
              <button onClick={() => setShowAnuncioModal(false)} className="p-1 hover:bg-gray-100 rounded"><X className="w-5 h-5" /></button>
            </div>
            <div className="space-y-4">
              <div>
                <label className="block text-sm font-medium mb-1">ID del Anuncio (Meta) *</label>
                <input type="text" value={nuevoAnuncio.ad_id} onChange={e => setNuevoAnuncio({ ...nuevoAnuncio, ad_id: e.target.value })} className="w-full px-3 py-2 border rounded-lg font-mono text-sm" placeholder="120208732918330123" />
                <p className="text-xs text-gray-500 mt-1">Encontralo en Meta Ads Manager → Columna "ID del anuncio"</p>
              </div>
              <div>
                <label className="block text-sm font-medium mb-1">Nombre (opcional)</label>
                <input type="text" value={nuevoAnuncio.nombre} onChange={e => setNuevoAnuncio({ ...nuevoAnuncio, nombre: e.target.value })} className="w-full px-3 py-2 border rounded-lg" placeholder="CTWA AT Marzo 2025" />
                <p className="text-xs text-gray-500 mt-1">Un nombre para identificar el anuncio fácilmente</p>
              </div>
            </div>
            <div className="flex gap-3 mt-6">
              <button onClick={() => setShowAnuncioModal(false)} className="flex-1 px-4 py-2 border rounded-lg hover:bg-gray-50">Cancelar</button>
              <button onClick={vincularAnuncio} disabled={savingAnuncio || !nuevoAnuncio.ad_id.trim()} className="flex-1 px-4 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700 disabled:opacity-50">{savingAnuncio ? 'Vinculando...' : 'Vincular'}</button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
