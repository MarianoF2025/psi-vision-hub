'use client';

import { useState, useEffect, useRef } from 'react';
import { useCRMStore } from '@/stores/crm-store';
import { supabase } from '@/lib/supabase';
import { cn, getInitials, getWindowTimeLeft, formatPhone } from '@/lib/utils';
import { 
  X, Clock, Plus, Camera, Edit2, Check, Mail, BookOpen, ChevronDown, 
  GraduationCap, CreditCard, AlertCircle, CheckCircle, ChevronRight,
  Calendar, DollarSign, TrendingUp
} from 'lucide-react';

const ESTADOS_CONV = ['nueva', 'activa', 'esperando', 'resuelta', 'cerrada'] as const;
const RESULTADOS = ['INS', 'NOINT', 'NOCONT', 'NR+'] as const;
const PAISES = ['AR', 'MX', 'CO', 'CL', 'PE', 'EC', 'UY', 'PY', 'BO', 'VE', 'ES', 'US', 'Otro'];

interface Contacto {
  id: string;
  nombre: string | null;
  telefono: string;
  email: string | null;
  foto_url: string | null;
  pais: string | null;
  ciudad: string | null;
  resultado: string | null;
  etiquetas: string[];
  notas: string | null;
}

interface EtiquetaGlobal {
  id: string;
  nombre: string;
  color: string;
}

interface EtiquetaAsignada {
  id: string;
  etiqueta_id: string;
  nombre: string;
  color: string;
}

interface InscripcionPSI {
  id: string;
  curso_codigo: string;
  curso_nombre: string;
  fecha_inscripcion: string;
  estado: string;
  cuotas_total: number;
  cuotas_pagadas: number;
  monto_total: number;
  monto_pagado: number;
  ultima_cuota_pagada: string | null;
}

export default function InfoContactoPanel() {
  const { conversacionActual, setConversacionActual, setPanelInfoAbierto } = useCRMStore();
  const [contacto, setContacto] = useState<Contacto | null>(null);
  const [loading, setLoading] = useState(true);
  const [guardando, setGuardando] = useState(false);
  const [editando, setEditando] = useState<string | null>(null);
  const [nota, setNota] = useState('');
  const [notas, setNotas] = useState<{id: string; contenido: string; created_at: string}[]>([]);

  // Campos editables
  const [nombre, setNombre] = useState('');
  const [email, setEmail] = useState('');
  const [pais, setPais] = useState('');
  const [ciudad, setCiudad] = useState('');
  const [cursoInfo, setCursoInfo] = useState<{nombre: string; codigo: string; cantidad: number} | null>(null);

  // Sistema de etiquetas globales
  const [etiquetasGlobales, setEtiquetasGlobales] = useState<EtiquetaGlobal[]>([]);
  const [etiquetasAsignadas, setEtiquetasAsignadas] = useState<EtiquetaAsignada[]>([]);
  const [mostrarDropdownEtiquetas, setMostrarDropdownEtiquetas] = useState(false);
  const dropdownRef = useRef<HTMLDivElement>(null);

  // Datos de alumno PSI
  const [inscripcionesPSI, setInscripcionesPSI] = useState<InscripcionPSI[]>([]);
  const [loadingPSI, setLoadingPSI] = useState(false);
  const [seccionPSIAbierta, setSeccionPSIAbierta] = useState(true);
  const [cursoExpandido, setCursoExpandido] = useState<string | null>(null);

  const fileInputRef = useRef<HTMLInputElement>(null);

  // Cerrar dropdown al hacer clic fuera
  useEffect(() => {
    const handleClickOutside = (event: MouseEvent) => {
      if (dropdownRef.current && !dropdownRef.current.contains(event.target as Node)) {
        setMostrarDropdownEtiquetas(false);
      }
    };
    document.addEventListener('mousedown', handleClickOutside);
    return () => document.removeEventListener('mousedown', handleClickOutside);
  }, []);

  // Cargar datos del contacto
  useEffect(() => {
    if (!conversacionActual?.contacto_id) {
      setContacto(null);
      setLoading(false);
      return;
    }

    const cargarContacto = async () => {
      setLoading(true);
      const { data, error } = await supabase
        .from('contactos')
        .select('*')
        .eq('id', conversacionActual.contacto_id)
        .single();

      if (data && !error) {
        setContacto({
          ...data,
          etiquetas: data.etiquetas || []
        });
        setNombre(data.nombre || '');
        setEmail(data.email || '');
        setPais(data.pais || '');
        setCiudad(data.ciudad || '');
      }
      setLoading(false);
    };

    const cargarNotas = async () => {
      const { data } = await supabase
        .from('notas_internas')
        .select('*')
        .eq('conversacion_id', conversacionActual.id)
        .order('created_at', { ascending: false })
        .limit(5);
      if (data) setNotas(data);
    };

    const cargarCursoInteres = async () => {
      const { data } = await supabase
        .from('v_contactos_cursos')
        .select('ultimo_curso_interes, ultimo_curso_codigo, cursos_consultados')
        .eq('contacto_id', conversacionActual.contacto_id)
        .single();
      if (data && data.ultimo_curso_interes) {
        setCursoInfo({
          nombre: data.ultimo_curso_interes,
          codigo: data.ultimo_curso_codigo,
          cantidad: data.cursos_consultados
        });
      } else {
        setCursoInfo(null);
      }
    };

    const cargarEtiquetasGlobales = async () => {
      const { data } = await supabase
        .from('etiquetas_globales')
        .select('id, nombre, color')
        .order('nombre');
      if (data) setEtiquetasGlobales(data);
    };

    const cargarEtiquetasAsignadas = async () => {
      const { data } = await supabase
        .from('contacto_etiquetas')
        .select(`
          id,
          etiqueta_id,
          etiquetas_globales (
            nombre,
            color
          )
        `)
        .eq('contacto_id', conversacionActual.contacto_id);

      if (data) {
        const asignadas: EtiquetaAsignada[] = data.map((item: any) => ({
          id: item.id,
          etiqueta_id: item.etiqueta_id,
          nombre: item.etiquetas_globales?.nombre || 'Sin nombre',
          color: item.etiquetas_globales?.color || '#6b7280'
        }));
        setEtiquetasAsignadas(asignadas);
      }
    };

    // Cargar datos de alumno PSI
    const cargarDatosPSI = async () => {
      if (!conversacionActual.telefono) return;
      
      setLoadingPSI(true);
      
      // Normalizar teléfono para búsqueda (puede venir con o sin +)
      const telefonoNormalizado = conversacionActual.telefono.replace(/\D/g, '');
      
      const { data, error } = await supabase
        .from('inscripciones_psi')
        .select('*')
        .or(`telefono.eq.${conversacionActual.telefono},telefono.eq.+${telefonoNormalizado},telefono.eq.${telefonoNormalizado}`)
        .order('fecha_inscripcion', { ascending: false });

      if (data && !error) {
        setInscripcionesPSI(data);
        // Expandir el primer curso por defecto si hay datos
        if (data.length > 0) {
          setCursoExpandido(data[0].id);
        }
      } else {
        setInscripcionesPSI([]);
      }
      setLoadingPSI(false);
    };

    cargarContacto();
    cargarNotas();
    cargarCursoInteres();
    cargarEtiquetasGlobales();
    cargarEtiquetasAsignadas();
    cargarDatosPSI();
  }, [conversacionActual?.contacto_id, conversacionActual?.id, conversacionActual?.telefono]);

  if (!conversacionActual) return null;

  const windowTime = getWindowTimeLeft(conversacionActual.ventana_24h_fin, conversacionActual.ventana_72h_fin);

  // Actualizar campo del CONTACTO
  const actualizarContacto = async (campo: string, valor: string | string[] | null) => {
    if (!contacto) return;
    setGuardando(true);

    const { error } = await supabase
      .from('contactos')
      .update({ [campo]: valor, updated_at: new Date().toISOString() })
      .eq('id', contacto.id);

    if (!error) {
      setContacto({ ...contacto, [campo]: valor });

      if (campo === 'nombre') {
        await supabase
          .from('conversaciones')
          .update({ nombre: valor })
          .eq('id', conversacionActual.id);
        setConversacionActual({ ...conversacionActual, nombre: valor as string });
      }
    }

    setGuardando(false);
    setEditando(null);
  };

  // Actualizar campo de la CONVERSACIÓN
  const actualizarConversacion = async (campo: string, valor: string) => {
    await supabase.from('conversaciones').update({ [campo]: valor }).eq('id', conversacionActual.id);
    setConversacionActual({ ...conversacionActual, [campo]: valor });
  };

  // Guardar nota
  const guardarNota = async () => {
    if (!nota.trim()) return;
    setGuardando(true);
    const { data } = await supabase
      .from('notas_internas')
      .insert({ conversacion_id: conversacionActual.id, contenido: nota })
      .select()
      .single();
    if (data) {
      setNotas([data, ...notas]);
    }
    setNota('');
    setGuardando(false);
  };

  // Subir foto
  const handleFotoChange = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file || !contacto) return;

    setGuardando(true);
    const fileName = `contactos/${contacto.id}/${Date.now()}.${file.name.split('.').pop()}`;

    const { error: uploadError } = await supabase.storage
      .from('media')
      .upload(fileName, file, { cacheControl: '3600', upsert: true });

    if (!uploadError) {
      const { data: urlData } = supabase.storage.from('media').getPublicUrl(fileName);
      await actualizarContacto('foto_url', urlData.publicUrl);
    }
    setGuardando(false);
  };

  // Asignar etiqueta (nuevo sistema)
  const asignarEtiqueta = async (etiquetaId: string) => {
    if (!contacto) return;

    const etiqueta = etiquetasGlobales.find(e => e.id === etiquetaId);
    if (!etiqueta) return;

    const { data, error } = await supabase
      .from('contacto_etiquetas')
      .insert({
        contacto_id: contacto.id,
        etiqueta_id: etiquetaId
      })
      .select('id')
      .single();

    if (!error && data) {
      setEtiquetasAsignadas([...etiquetasAsignadas, {
        id: data.id,
        etiqueta_id: etiquetaId,
        nombre: etiqueta.nombre,
        color: etiqueta.color
      }]);
    }
    setMostrarDropdownEtiquetas(false);
  };

  // Quitar etiqueta asignada (nuevo sistema)
  const quitarEtiquetaAsignada = async (asignacionId: string) => {
    const { error } = await supabase
      .from('contacto_etiquetas')
      .delete()
      .eq('id', asignacionId);

    if (!error) {
      setEtiquetasAsignadas(etiquetasAsignadas.filter(e => e.id !== asignacionId));
    }
  };

  // Etiquetas disponibles (no asignadas)
  const etiquetasDisponibles = etiquetasGlobales.filter(
    eg => !etiquetasAsignadas.some(ea => ea.etiqueta_id === eg.id)
  );

  // Helpers para datos PSI
  const getEstadoColor = (estado: string) => {
    switch (estado?.toLowerCase()) {
      case 'activo': return 'text-emerald-600 bg-emerald-100 dark:bg-emerald-500/20';
      case 'finalizado': return 'text-blue-600 bg-blue-100 dark:bg-blue-500/20';
      case 'baja': return 'text-red-600 bg-red-100 dark:bg-red-500/20';
      case 'pendiente': return 'text-amber-600 bg-amber-100 dark:bg-amber-500/20';
      default: return 'text-slate-600 bg-slate-100 dark:bg-slate-500/20';
    }
  };

  const calcularPorcentajePago = (pagado: number, total: number) => {
    if (!total || total === 0) return 0;
    return Math.round((pagado / total) * 100);
  };

  const tieneDeuda = (inscripcion: InscripcionPSI) => {
    return inscripcion.cuotas_pagadas < inscripcion.cuotas_total && inscripcion.estado?.toLowerCase() === 'activo';
  };

  // Resumen de datos PSI
  const resumenPSI = {
    totalCursos: inscripcionesPSI.length,
    cursosActivos: inscripcionesPSI.filter(i => i.estado?.toLowerCase() === 'activo').length,
    cursosFinalizados: inscripcionesPSI.filter(i => i.estado?.toLowerCase() === 'finalizado').length,
    conDeuda: inscripcionesPSI.filter(tieneDeuda).length,
    totalPagado: inscripcionesPSI.reduce((acc, i) => acc + (i.monto_pagado || 0), 0),
  };

  return (
    <div className="w-72 h-full bg-white dark:bg-slate-900 border-l border-slate-200 dark:border-slate-800 flex flex-col overflow-hidden">
      <input ref={fileInputRef} type="file" accept="image/*" onChange={handleFotoChange} className="hidden" />

      {/* Header */}
      <div className="p-3 border-b border-slate-200 dark:border-slate-800 flex items-center justify-between">
        <h3 className="font-semibold text-sm text-slate-800 dark:text-white">Info del Contacto</h3>
        <button onClick={() => setPanelInfoAbierto(false)} className="p-1 hover:bg-slate-100 dark:hover:bg-slate-800 rounded">
          <X size={14} className="text-slate-400" />
        </button>
      </div>

      <div className="flex-1 overflow-y-auto p-3 space-y-4">
        {loading ? (
          <div className="flex items-center justify-center py-8">
            <div className="w-6 h-6 border-2 border-indigo-500 border-t-transparent rounded-full animate-spin" />
          </div>
        ) : (
          <>
            {/* Avatar y nombre */}
            <div className="text-center">
              <div className="relative w-16 h-16 mx-auto mb-2">
                {contacto?.foto_url ? (
                  <img src={contacto.foto_url} alt="" className="w-16 h-16 rounded-full object-cover" />
                ) : (
                  <div className="w-16 h-16 rounded-full bg-gradient-to-br from-indigo-400 to-purple-400 flex items-center justify-center text-white text-xl font-medium">
                    {getInitials(contacto?.nombre || conversacionActual.telefono)}
                  </div>
                )}
                <button
                  onClick={() => fileInputRef.current?.click()}
                  className="absolute -bottom-1 -right-1 w-6 h-6 bg-indigo-500 rounded-full flex items-center justify-center text-white hover:bg-indigo-600 shadow-lg"
                >
                  <Camera size={12} />
                </button>
              </div>

              {/* Nombre editable */}
              {editando === 'nombre' ? (
                <div className="flex items-center gap-1 justify-center">
                  <input
                    type="text"
                    value={nombre}
                    onChange={(e) => setNombre(e.target.value)}
                    className="px-2 py-1 text-sm text-center bg-slate-100 dark:bg-slate-800 rounded border-0 w-32"
                    autoFocus
                  />
                  <button onClick={() => actualizarContacto('nombre', nombre)} className="p-1 text-green-500 hover:bg-green-50 rounded">
                    <Check size={14} />
                  </button>
                  <button onClick={() => setEditando(null)} className="p-1 text-slate-400 hover:bg-slate-100 rounded">
                    <X size={14} />
                  </button>
                </div>
              ) : (
                <div className="flex items-center justify-center gap-1 group">
                  <p className="font-semibold text-sm text-slate-800 dark:text-white">
                    {contacto?.nombre || 'Sin nombre'}
                  </p>
                  <button onClick={() => setEditando('nombre')} className="p-0.5 opacity-0 group-hover:opacity-100 hover:bg-slate-100 dark:hover:bg-slate-800 rounded">
                    <Edit2 size={10} className="text-slate-400" />
                  </button>
                </div>
              )}
              <p className="text-xs text-slate-500">{formatPhone(conversacionActual.telefono)}</p>
              
              {/* Badge de alumno PSI */}
              {inscripcionesPSI.length > 0 && (
                <div className="mt-2 inline-flex items-center gap-1 px-2 py-0.5 bg-purple-100 dark:bg-purple-500/20 text-purple-600 rounded-full text-[10px] font-medium">
                  <GraduationCap size={10} />
                  Alumno PSI
                </div>
              )}
            </div>

            {/* ========== SECCIÓN DATOS ALUMNO PSI ========== */}
            {inscripcionesPSI.length > 0 && (
              <div className="border border-purple-200 dark:border-purple-500/30 rounded-lg overflow-hidden">
                {/* Header colapsable */}
                <button
                  onClick={() => setSeccionPSIAbierta(!seccionPSIAbierta)}
                  className="w-full px-3 py-2 bg-purple-50 dark:bg-purple-500/10 flex items-center justify-between hover:bg-purple-100 dark:hover:bg-purple-500/20 transition-colors"
                >
                  <div className="flex items-center gap-2">
                    <GraduationCap size={14} className="text-purple-600" />
                    <span className="text-xs font-semibold text-purple-700 dark:text-purple-400">
                      Datos Alumno PSI
                    </span>
                  </div>
                  <div className="flex items-center gap-2">
                    {resumenPSI.conDeuda > 0 && (
                      <span className="px-1.5 py-0.5 bg-red-100 dark:bg-red-500/20 text-red-600 text-[9px] font-medium rounded">
                        {resumenPSI.conDeuda} con deuda
                      </span>
                    )}
                    <ChevronDown 
                      size={14} 
                      className={cn(
                        "text-purple-500 transition-transform",
                        seccionPSIAbierta && "rotate-180"
                      )} 
                    />
                  </div>
                </button>

                {seccionPSIAbierta && (
                  <div className="p-2 space-y-2">
                    {/* Resumen general */}
                    <div className="grid grid-cols-3 gap-1 text-center">
                      <div className="p-1.5 bg-slate-50 dark:bg-slate-800 rounded">
                        <p className="text-lg font-bold text-slate-800 dark:text-white">{resumenPSI.totalCursos}</p>
                        <p className="text-[9px] text-slate-500">Cursos</p>
                      </div>
                      <div className="p-1.5 bg-emerald-50 dark:bg-emerald-500/10 rounded">
                        <p className="text-lg font-bold text-emerald-600">{resumenPSI.cursosActivos}</p>
                        <p className="text-[9px] text-slate-500">Activos</p>
                      </div>
                      <div className="p-1.5 bg-blue-50 dark:bg-blue-500/10 rounded">
                        <p className="text-lg font-bold text-blue-600">{resumenPSI.cursosFinalizados}</p>
                        <p className="text-[9px] text-slate-500">Finalizados</p>
                      </div>
                    </div>

                    {/* Lista de cursos */}
                    <div className="space-y-1.5">
                      {inscripcionesPSI.map((inscripcion) => {
                        const porcentajePago = calcularPorcentajePago(inscripcion.monto_pagado, inscripcion.monto_total);
                        const estaExpandido = cursoExpandido === inscripcion.id;
                        const deuda = tieneDeuda(inscripcion);

                        return (
                          <div 
                            key={inscripcion.id} 
                            className={cn(
                              "border rounded-lg overflow-hidden transition-all",
                              deuda 
                                ? "border-red-200 dark:border-red-500/30" 
                                : "border-slate-200 dark:border-slate-700"
                            )}
                          >
                            {/* Header del curso */}
                            <button
                              onClick={() => setCursoExpandido(estaExpandido ? null : inscripcion.id)}
                              className="w-full px-2 py-1.5 flex items-center gap-2 hover:bg-slate-50 dark:hover:bg-slate-800 transition-colors"
                            >
                              <ChevronRight 
                                size={12} 
                                className={cn(
                                  "text-slate-400 transition-transform flex-shrink-0",
                                  estaExpandido && "rotate-90"
                                )} 
                              />
                              <div className="flex-1 text-left min-w-0">
                                <div className="flex items-center gap-1.5">
                                  <span className="text-[10px] font-bold text-indigo-600 dark:text-indigo-400">
                                    {inscripcion.curso_codigo}
                                  </span>
                                  <span className={cn(
                                    "px-1 py-0.5 text-[8px] font-medium rounded",
                                    getEstadoColor(inscripcion.estado)
                                  )}>
                                    {inscripcion.estado}
                                  </span>
                                  {deuda && (
                                    <AlertCircle size={10} className="text-red-500" />
                                  )}
                                </div>
                                <p className="text-[10px] text-slate-600 dark:text-slate-400 truncate">
                                  {inscripcion.curso_nombre}
                                </p>
                              </div>
                            </button>

                            {/* Detalles expandidos */}
                            {estaExpandido && (
                              <div className="px-2 pb-2 pt-1 border-t border-slate-100 dark:border-slate-800 space-y-2">
                                {/* Fecha inscripción */}
                                <div className="flex items-center gap-1.5 text-[10px]">
                                  <Calendar size={10} className="text-slate-400" />
                                  <span className="text-slate-500">Inscripción:</span>
                                  <span className="text-slate-700 dark:text-slate-300">
                                    {inscripcion.fecha_inscripcion 
                                      ? new Date(inscripcion.fecha_inscripcion).toLocaleDateString('es-AR', {
                                          day: '2-digit',
                                          month: 'short',
                                          year: 'numeric'
                                        })
                                      : '-'
                                    }
                                  </span>
                                </div>

                                {/* Cuotas */}
                                <div className="flex items-center gap-1.5 text-[10px]">
                                  <CreditCard size={10} className="text-slate-400" />
                                  <span className="text-slate-500">Cuotas:</span>
                                  <span className={cn(
                                    "font-medium",
                                    deuda ? "text-red-600" : "text-slate-700 dark:text-slate-300"
                                  )}>
                                    {inscripcion.cuotas_pagadas} / {inscripcion.cuotas_total}
                                  </span>
                                  {deuda && (
                                    <span className="text-red-500 text-[9px]">
                                      (debe {inscripcion.cuotas_total - inscripcion.cuotas_pagadas})
                                    </span>
                                  )}
                                </div>

                                {/* Barra de progreso de pago */}
                                <div>
                                  <div className="flex items-center justify-between text-[9px] mb-0.5">
                                    <span className="text-slate-500">Pago</span>
                                    <span className={cn(
                                      "font-medium",
                                      porcentajePago >= 100 ? "text-emerald-600" :
                                      porcentajePago >= 50 ? "text-amber-600" : "text-red-600"
                                    )}>
                                      {porcentajePago}%
                                    </span>
                                  </div>
                                  <div className="h-1.5 bg-slate-200 dark:bg-slate-700 rounded-full overflow-hidden">
                                    <div 
                                      className={cn(
                                        "h-full rounded-full transition-all",
                                        porcentajePago >= 100 ? "bg-emerald-500" :
                                        porcentajePago >= 50 ? "bg-amber-500" : "bg-red-500"
                                      )}
                                      style={{ width: `${Math.min(porcentajePago, 100)}%` }}
                                    />
                                  </div>
                                </div>

                                {/* Montos */}
                                <div className="flex items-center gap-1.5 text-[10px]">
                                  <DollarSign size={10} className="text-slate-400" />
                                  <span className="text-slate-500">Pagado:</span>
                                  <span className="text-emerald-600 font-medium">
                                    ${(inscripcion.monto_pagado || 0).toLocaleString('es-AR')}
                                  </span>
                                  <span className="text-slate-400">/</span>
                                  <span className="text-slate-600 dark:text-slate-400">
                                    ${(inscripcion.monto_total || 0).toLocaleString('es-AR')}
                                  </span>
                                </div>

                                {/* Última cuota pagada */}
                                {inscripcion.ultima_cuota_pagada && (
                                  <div className="flex items-center gap-1.5 text-[10px]">
                                    <CheckCircle size={10} className="text-emerald-500" />
                                    <span className="text-slate-500">Último pago:</span>
                                    <span className="text-slate-700 dark:text-slate-300">
                                      {new Date(inscripcion.ultima_cuota_pagada).toLocaleDateString('es-AR', {
                                        day: '2-digit',
                                        month: 'short',
                                        year: 'numeric'
                                      })}
                                    </span>
                                  </div>
                                )}
                              </div>
                            )}
                          </div>
                        );
                      })}
                    </div>

                    {/* Total histórico */}
                    <div className="pt-2 border-t border-slate-200 dark:border-slate-700">
                      <div className="flex items-center justify-between text-[10px]">
                        <span className="text-slate-500 flex items-center gap-1">
                          <TrendingUp size={10} />
                          Total histórico pagado:
                        </span>
                        <span className="font-bold text-emerald-600">
                          ${resumenPSI.totalPagado.toLocaleString('es-AR')}
                        </span>
                      </div>
                    </div>
                  </div>
                )}
              </div>
            )}
            {/* ========== FIN SECCIÓN PSI ========== */}

            {/* Email */}
            <div>
              <p className="text-[10px] font-semibold text-slate-400 uppercase mb-1">Email</p>
              {editando === 'email' ? (
                <div className="flex items-center gap-1">
                  <input
                    type="email"
                    value={email}
                    onChange={(e) => setEmail(e.target.value)}
                    placeholder="correo@ejemplo.com"
                    className="flex-1 px-2 py-1 text-xs bg-slate-100 dark:bg-slate-800 rounded border-0"
                    autoFocus
                  />
                  <button onClick={() => actualizarContacto('email', email || null)} className="p-1 text-green-500"><Check size={12} /></button>
                  <button onClick={() => setEditando(null)} className="p-1 text-slate-400"><X size={12} /></button>
                </div>
              ) : (
                <div className="flex items-center gap-2 group cursor-pointer" onClick={() => setEditando('email')}>
                  <Mail size={12} className="text-slate-400" />
                  <span className="text-xs text-slate-600 dark:text-slate-300 flex-1">
                    {contacto?.email || 'Sin email'}
                  </span>
                  <Edit2 size={10} className="text-slate-400 opacity-0 group-hover:opacity-100" />
                </div>
              )}
            </div>

            {/* País y Ciudad */}
            <div className="grid grid-cols-2 gap-2">
              <div>
                <p className="text-[10px] font-semibold text-slate-400 uppercase mb-1">País</p>
                <select
                  value={contacto?.pais || ''}
                  onChange={(e) => actualizarContacto('pais', e.target.value || null)}
                  className="w-full px-2 py-1 text-xs bg-slate-100 dark:bg-slate-800 rounded border-0"
                >
                  <option value="">-</option>
                  {PAISES.map(p => <option key={p} value={p}>{p}</option>)}
                </select>
              </div>
              <div>
                <p className="text-[10px] font-semibold text-slate-400 uppercase mb-1">Ciudad</p>
                {editando === 'ciudad' ? (
                  <div className="flex items-center gap-1">
                    <input
                      type="text"
                      value={ciudad}
                      onChange={(e) => setCiudad(e.target.value)}
                      className="flex-1 px-2 py-1 text-xs bg-slate-100 dark:bg-slate-800 rounded border-0"
                      autoFocus
                    />
                    <button onClick={() => actualizarContacto('ciudad', ciudad || null)} className="p-0.5 text-green-500"><Check size={10} /></button>
                  </div>
                ) : (
                  <div className="flex items-center gap-1 group cursor-pointer px-2 py-1 bg-slate-100 dark:bg-slate-800 rounded" onClick={() => setEditando('ciudad')}>
                    <span className="text-xs text-slate-600 dark:text-slate-300 flex-1 truncate">
                      {contacto?.ciudad || '-'}
                    </span>
                    <Edit2 size={8} className="text-slate-400 opacity-0 group-hover:opacity-100" />
                  </div>
                )}
              </div>
            </div>

            {/* Curso de interés - desde menu_interacciones */}
            <div>
              <p className="text-[10px] font-semibold text-slate-400 uppercase mb-1">Curso de Interés</p>
              <div className="flex items-center gap-2">
                <BookOpen size={12} className="text-slate-400" />
                {cursoInfo ? (
                  <div className="flex-1">
                    <span className="text-xs text-slate-600 dark:text-slate-300 font-medium">
                      {cursoInfo.nombre}
                    </span>
                    <span className="text-[10px] text-slate-400 ml-1">({cursoInfo.codigo})</span>
                    {cursoInfo.cantidad > 1 && (
                      <span className="text-[10px] text-purple-500 ml-2">+{cursoInfo.cantidad - 1} más</span>
                    )}
                  </div>
                ) : (
                  <span className="text-xs text-slate-400 italic">Sin interacción aún</span>
                )}
              </div>
            </div>

            <hr className="border-slate-200 dark:border-slate-700" />

            {/* Estado Conversación */}
            <div>
              <p className="text-[10px] font-semibold text-slate-400 uppercase mb-1.5">Estado Conversación</p>
              <div className="flex flex-wrap gap-1">
                {ESTADOS_CONV.map((e) => {
                  const colores: Record<string, { active: string; inactive: string }> = {
                    nueva: { active: 'border-blue-500 bg-blue-100 dark:bg-blue-500/20 text-blue-600', inactive: 'border-slate-200 dark:border-slate-700 text-slate-500 hover:border-blue-300' },
                    activa: { active: 'border-emerald-500 bg-emerald-100 dark:bg-emerald-500/20 text-emerald-600', inactive: 'border-slate-200 dark:border-slate-700 text-slate-500 hover:border-emerald-300' },
                    esperando: { active: 'border-amber-500 bg-amber-100 dark:bg-amber-500/20 text-amber-600', inactive: 'border-slate-200 dark:border-slate-700 text-slate-500 hover:border-amber-300' },
                    resuelta: { active: 'border-purple-500 bg-purple-100 dark:bg-purple-500/20 text-purple-600', inactive: 'border-slate-200 dark:border-slate-700 text-slate-500 hover:border-purple-300' },
                    cerrada: { active: 'border-slate-500 bg-slate-200 dark:bg-slate-500/20 text-slate-600', inactive: 'border-slate-200 dark:border-slate-700 text-slate-500 hover:border-slate-400' },
                  };
                  const color = colores[e] || colores.nueva;
                  return (
                    <button key={e} onClick={() => actualizarConversacion('estado', e)}
                      className={cn('px-2 py-0.5 text-[10px] font-medium rounded-full border transition-colors',
                        conversacionActual.estado === e ? color.active : color.inactive
                      )}>{e}</button>
                  );
                })}
              </div>
            </div>

            {/* Resultado (en contacto) */}
            <div>
              <p className="text-[10px] font-semibold text-slate-400 uppercase mb-1.5">Resultado</p>
              <div className="flex gap-1">
                {RESULTADOS.map((r) => (
                  <button key={r} onClick={() => actualizarContacto('resultado', contacto?.resultado === r ? null : r)}
                    className={cn('flex-1 px-1 py-1 text-[10px] font-medium rounded-md border transition-colors',
                      contacto?.resultado === r
                        ? 'border-indigo-500 bg-indigo-100 dark:bg-indigo-500/20 text-indigo-600'
                        : 'border-slate-200 dark:border-slate-700 text-slate-500 hover:border-indigo-300'
                    )}>{r}</button>
                ))}
              </div>
            </div>

            {/* Ventana */}
            {windowTime && (
              <div className={cn('p-2 rounded-lg border',
                windowTime.color.includes('emerald') ? 'border-emerald-200 bg-emerald-50 dark:bg-emerald-500/10' :
                windowTime.color.includes('amber') ? 'border-amber-200 bg-amber-50 dark:bg-amber-500/10' :
                'border-red-200 bg-red-50 dark:bg-red-500/10'
              )}>
                <div className="flex items-center gap-1.5 text-[10px] text-slate-500">
                  <Clock size={10} />
                  {windowTime.tipo === '72H' ? 'VENTANA 72H META' : 'VENTANA 24H'}
                </div>
                <div className={cn('text-xl font-bold mt-0.5', windowTime.color)}>{windowTime.texto}</div>
                <p className="text-[9px] text-slate-500 mt-0.5">Mensajes gratuitos</p>
              </div>
            )}

            {/* Etiquetas - Nuevo sistema con dropdown */}
            <div>
              <div className="flex items-center justify-between mb-1.5">
                <p className="text-[10px] font-semibold text-slate-400 uppercase">Etiquetas</p>
                <div className="relative" ref={dropdownRef}>
                  <button
                    onClick={() => setMostrarDropdownEtiquetas(!mostrarDropdownEtiquetas)}
                    className="p-0.5 hover:bg-slate-100 dark:hover:bg-slate-800 rounded flex items-center gap-0.5"
                    disabled={etiquetasDisponibles.length === 0}
                  >
                    <Plus size={12} className="text-slate-400" />
                    <ChevronDown size={10} className="text-slate-400" />
                  </button>

                  {/* Dropdown de etiquetas */}
                  {mostrarDropdownEtiquetas && etiquetasDisponibles.length > 0 && (
                    <div className="absolute right-0 top-full mt-1 w-40 bg-white dark:bg-slate-800 border border-slate-200 dark:border-slate-700 rounded-lg shadow-lg z-50 py-1 max-h-48 overflow-y-auto">
                      {etiquetasDisponibles.map((etiqueta) => (
                        <button
                          key={etiqueta.id}
                          onClick={() => asignarEtiqueta(etiqueta.id)}
                          className="w-full px-2 py-1.5 text-left hover:bg-slate-100 dark:hover:bg-slate-700 flex items-center gap-2"
                        >
                          <span
                            className="w-2.5 h-2.5 rounded-full flex-shrink-0"
                            style={{ backgroundColor: etiqueta.color }}
                          />
                          <span className="text-xs text-slate-700 dark:text-slate-300 truncate">
                            {etiqueta.nombre}
                          </span>
                        </button>
                      ))}
                    </div>
                  )}
                </div>
              </div>

              {/* Etiquetas asignadas */}
              <div className="flex flex-wrap gap-1">
                {etiquetasAsignadas.map((et) => (
                  <span
                    key={et.id}
                    className="px-1.5 py-0.5 text-[10px] rounded flex items-center gap-1 group"
                    style={{
                      backgroundColor: `${et.color}20`,
                      color: et.color,
                      border: `1px solid ${et.color}40`
                    }}
                  >
                    <span
                      className="w-1.5 h-1.5 rounded-full"
                      style={{ backgroundColor: et.color }}
                    />
                    {et.nombre}
                    <button
                      onClick={() => quitarEtiquetaAsignada(et.id)}
                      className="opacity-0 group-hover:opacity-100 hover:text-red-500 ml-0.5"
                    >
                      <X size={8} />
                    </button>
                  </span>
                ))}
                {etiquetasAsignadas.length === 0 && (
                  <span className="text-[10px] text-slate-400 italic">
                    {etiquetasGlobales.length > 0 ? 'Clic en + para agregar' : 'Sin etiquetas disponibles'}
                  </span>
                )}
              </div>
            </div>

            {/* Notas */}
            <div>
              <p className="text-[10px] font-semibold text-slate-400 uppercase mb-1.5">Notas Internas</p>
              <textarea
                value={nota}
                onChange={(e) => setNota(e.target.value)}
                placeholder="Agregar nota..."
                rows={2}
                className="w-full px-2 py-1.5 text-xs bg-slate-100 dark:bg-slate-800 border-0 rounded-md text-slate-800 dark:text-white resize-none"
              />
              <button
                onClick={guardarNota}
                disabled={guardando || !nota.trim()}
                className="w-full mt-1 py-1 bg-indigo-500 text-white text-[10px] font-medium rounded-md disabled:opacity-50 hover:bg-indigo-600"
              >
                {guardando ? 'Guardando...' : 'Guardar nota'}
              </button>

              {/* Notas guardadas */}
              {notas.length > 0 && (
                <div className="mt-2 space-y-1 max-h-24 overflow-y-auto">
                  {notas.map((n) => (
                    <div key={n.id} className="p-1.5 bg-yellow-50 dark:bg-yellow-500/10 rounded text-[10px]">
                      <p className="text-slate-700 dark:text-slate-300">{n.contenido}</p>
                      <p className="text-[8px] text-slate-400 mt-0.5">
                        {new Date(n.created_at).toLocaleDateString('es-AR', { day: '2-digit', month: 'short', hour: '2-digit', minute: '2-digit' })}
                      </p>
                    </div>
                  ))}
                </div>
              )}
            </div>
          </>
        )}
      </div>
    </div>
  );
}
