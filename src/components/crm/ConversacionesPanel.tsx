'use client';

import { useEffect, useState, useRef } from 'react';
import { useCRMStore } from '@/stores/crm-store';
import { supabase } from '@/lib/supabase';
import { INBOXES, type Conversacion } from '@/types/crm';
import { cn, timeAgo, getInitials, getWindowTimeLeft } from '@/lib/utils';
import { useAuth } from '@/contexts/AuthContext';
import { useUserPermissions, canAccessInbox } from '@/lib/permissions';
import { Search, Plus, Clock, X, MessageSquarePlus, Phone, Users, GraduationCap, Building2, Calendar, ChevronDown, Pin, Tag } from 'lucide-react';

interface Contacto {
  id: string;
  nombre: string | null;
  telefono: string;
  email: string | null;
}

interface EtiquetaGlobal {
  id: string;
  nombre: string;
  color: string;
}

const LINEAS_SALIDA = [
  { id: 'administracion', nombre: 'Admin', icon: Building2, color: 'bg-purple-500' },
  { id: 'alumnos', nombre: 'Alumnos', icon: GraduationCap, color: 'bg-green-500' },
  { id: 'comunidad', nombre: 'Comunidad', icon: Users, color: 'bg-orange-500' },
];

export default function ConversacionesPanel() {
  const {
    inboxActual, conversacionActual, setConversacionActual,
    filtroConversaciones, setFiltroConversaciones,
    busquedaConversaciones, setBusquedaConversaciones,
    setContador, usuario
  } = useCRMStore();

  const { user } = useAuth();
  const { permissions } = useUserPermissions(user?.email);

  const [conversaciones, setConversaciones] = useState<Conversacion[]>([]);
  const [loading, setLoading] = useState(true);
  const [mostrarNuevoChat, setMostrarNuevoChat] = useState(false);
  const [busquedaContacto, setBusquedaContacto] = useState('');
  const [contactos, setContactos] = useState<Contacto[]>([]);
  const [buscandoContactos, setBuscandoContactos] = useState(false);
  const [creandoChat, setCreandoChat] = useState(false);
  const [numeroNuevo, setNumeroNuevo] = useState('');

  const lineasFiltradas = LINEAS_SALIDA.filter(linea => canAccessInbox(permissions, linea.id));
  const [lineaSeleccionada, setLineaSeleccionada] = useState(lineasFiltradas[0]?.id || 'administracion');

  // Estado para filtro de fechas (rango)
  const [fechaDesde, setFechaDesde] = useState<string>('');
  const [fechaHasta, setFechaHasta] = useState<string>('');
  const [mostrarFiltroFecha, setMostrarFiltroFecha] = useState(false);

  // Estado para filtro de etiquetas
  const [etiquetasGlobales, setEtiquetasGlobales] = useState<EtiquetaGlobal[]>([]);
  const [etiquetasSeleccionadas, setEtiquetasSeleccionadas] = useState<string[]>([]);
  const [mostrarFiltroEtiquetas, setMostrarFiltroEtiquetas] = useState(false);
  const [contactosConEtiquetas, setContactosConEtiquetas] = useState<string[]>([]);

  const modalRef = useRef<HTMLDivElement>(null);
  const filtroFechaRef = useRef<HTMLDivElement>(null);
  const filtroEtiquetasRef = useRef<HTMLDivElement>(null);
  const inboxConfig = INBOXES.find(i => i.id === inboxActual);

  const tieneFiltroFecha = fechaDesde !== '' || fechaHasta !== '';

  const formatearFechaDisplay = (fecha: string): string => {
    if (!fecha) return '';
    const [year, month, day] = fecha.split('-');
    return `${day}/${month}`;
  };

  const getTextoFiltroFecha = (): string => {
    if (!tieneFiltroFecha) return 'Filtrar por fecha';
    if (fechaDesde && fechaHasta) return `${formatearFechaDisplay(fechaDesde)} - ${formatearFechaDisplay(fechaHasta)}`;
    if (fechaDesde) return `Desde ${formatearFechaDisplay(fechaDesde)}`;
    if (fechaHasta) return `Hasta ${formatearFechaDisplay(fechaHasta)}`;
    return 'Filtrar por fecha';
  };

  const limpiarFiltroFecha = () => {
    setFechaDesde('');
    setFechaHasta('');
  };

  const ordenarConversaciones = (convs: Conversacion[]): Conversacion[] => {
    return [...convs].sort((a, b) => {
      if (a.fijada && !b.fijada) return -1;
      if (!a.fijada && b.fijada) return 1;
      const fechaA = new Date(a.ts_ultimo_mensaje || 0).getTime();
      const fechaB = new Date(b.ts_ultimo_mensaje || 0).getTime();
      return fechaB - fechaA;
    });
  };

  useEffect(() => {
    if (lineasFiltradas.length > 0 && !lineasFiltradas.find(l => l.id === lineaSeleccionada)) {
      setLineaSeleccionada(lineasFiltradas[0].id);
    }
  }, [lineasFiltradas, lineaSeleccionada]);

  // Cargar etiquetas globales
  useEffect(() => {
    const cargarEtiquetas = async () => {
      const { data } = await supabase
        .from('etiquetas_globales')
        .select('id, nombre, color')
        .eq('activa', true)
        .order('nombre');
      if (data) setEtiquetasGlobales(data);
    };
    cargarEtiquetas();
  }, []);

  // Cargar contactos que tienen las etiquetas seleccionadas
  useEffect(() => {
    const cargarContactosConEtiquetas = async () => {
      if (etiquetasSeleccionadas.length === 0) {
        setContactosConEtiquetas([]);
        return;
      }

      const { data } = await supabase
        .from('contacto_etiquetas')
        .select('contacto_id')
        .in('etiqueta_id', etiquetasSeleccionadas);

      if (data) {
        const uniqueContactos = [...new Set(data.map(d => d.contacto_id))];
        setContactosConEtiquetas(uniqueContactos);
      }
    };
    cargarContactosConEtiquetas();
  }, [etiquetasSeleccionadas]);

  useEffect(() => {
    const cargarConversaciones = async (inicial = false) => {
      if (inicial) setLoading(true);
      let query = supabase.from('conversaciones').select('*').order('ts_ultimo_mensaje', { ascending: false });

      if (inboxActual !== 'wsp4') query = query.eq('area', inboxActual);
      if (filtroConversaciones === 'sin_asignar') query = query.is('agente_asignado_id', null);
      else if (filtroConversaciones === 'mias' && usuario?.id) query = query.eq('agente_asignado_id', usuario.id);
      if (busquedaConversaciones.trim()) query = query.or(`nombre.ilike.%${busquedaConversaciones}%,telefono.ilike.%${busquedaConversaciones}%`);

      // Filtro por rango de fechas
      if (fechaDesde) {
        const desde = new Date(fechaDesde);
        desde.setHours(0, 0, 0, 0);
        query = query.gte('ts_ultimo_mensaje', desde.toISOString());
      }
      if (fechaHasta) {
        const hasta = new Date(fechaHasta);
        hasta.setHours(23, 59, 59, 999);
        query = query.lte('ts_ultimo_mensaje', hasta.toISOString());
      }

      // Filtrar por etiquetas (contactos que tienen esas etiquetas)
      if (etiquetasSeleccionadas.length > 0 && contactosConEtiquetas.length > 0) {
        query = query.in('contacto_id', contactosConEtiquetas);
      } else if (etiquetasSeleccionadas.length > 0 && contactosConEtiquetas.length === 0) {
        // Si hay etiquetas seleccionadas pero ningún contacto las tiene, no mostrar nada
        setConversaciones([]);
        setContador(inboxActual, 0);
        setLoading(false);
        return;
      }

      const { data } = await query;
      if (data) {
        setConversaciones(ordenarConversaciones(data));
        setContador(inboxActual, data.filter(c => (c.mensajes_no_leidos || 0) > 0).length);
      }
      setLoading(false);
    };
    cargarConversaciones(true);
    const channel = supabase.channel(`conversaciones-${inboxActual}`)
      .on('postgres_changes', { event: '*', schema: 'public', table: 'conversaciones' }, () => cargarConversaciones())
      .subscribe();
    return () => { supabase.removeChannel(channel); };
  }, [inboxActual, filtroConversaciones, busquedaConversaciones, usuario?.id, setContador, fechaDesde, fechaHasta, etiquetasSeleccionadas, contactosConEtiquetas]);

  useEffect(() => {
    const buscar = async () => {
      if (!busquedaContacto.trim() || busquedaContacto.length < 2) { setContactos([]); return; }
      setBuscandoContactos(true);
      const { data } = await supabase.from('contactos').select('id, nombre, telefono, email')
        .or(`nombre.ilike.%${busquedaContacto}%,telefono.ilike.%${busquedaContacto}%`).limit(10);
      setContactos(data || []);
      setBuscandoContactos(false);
    };
    const timeout = setTimeout(buscar, 300);
    return () => clearTimeout(timeout);
  }, [busquedaContacto]);

  useEffect(() => {
    const handleClickOutside = (e: MouseEvent) => {
      if (modalRef.current && !modalRef.current.contains(e.target as Node)) setMostrarNuevoChat(false);
      if (filtroFechaRef.current && !filtroFechaRef.current.contains(e.target as Node)) setMostrarFiltroFecha(false);
      if (filtroEtiquetasRef.current && !filtroEtiquetasRef.current.contains(e.target as Node)) setMostrarFiltroEtiquetas(false);
    };
    if (mostrarNuevoChat || mostrarFiltroFecha || mostrarFiltroEtiquetas) document.addEventListener('mousedown', handleClickOutside);
    return () => document.removeEventListener('mousedown', handleClickOutside);
  }, [mostrarNuevoChat, mostrarFiltroFecha, mostrarFiltroEtiquetas]);

  const normalizarTelefono = (tel: string): string => {
    let numero = tel.replace(/\D/g, '');
    if (numero.startsWith('0')) numero = numero.substring(1);
    if (numero.length === 10 && !numero.startsWith('54')) numero = '54' + numero;
    if (!numero.startsWith('+')) numero = '+' + numero;
    return numero;
  };

  const formatPhone = (phone: string) => {
    if (!phone) return '';
    const cleaned = phone.replace(/\D/g, '');
    if (cleaned.length > 10) return `+${cleaned.slice(0, 2)} ${cleaned.slice(2, 4)} ${cleaned.slice(4, 8)}-${cleaned.slice(8)}`;
    return phone;
  };

  const iniciarChatConContacto = async (contacto: Contacto) => {
    setCreandoChat(true);
    const { data: convExistente } = await supabase.from('conversaciones').select('*')
      .eq('contacto_id', contacto.id).eq('area', lineaSeleccionada).single();
    if (convExistente) {
      setConversacionActual(convExistente);
      setMostrarNuevoChat(false);
      setBusquedaContacto('');
      setCreandoChat(false);
      return;
    }
    const { data: nuevaConv } = await supabase.from('conversaciones').insert({
      contacto_id: contacto.id, telefono: contacto.telefono, nombre: contacto.nombre,
      estado: 'nueva', prioridad: 'media', canal: 'whatsapp',
      area: lineaSeleccionada, linea_origen: lineaSeleccionada, inbox_fijo: lineaSeleccionada, origen: 'crm'
    }).select().single();
    if (nuevaConv) setConversacionActual(nuevaConv);
    setMostrarNuevoChat(false);
    setBusquedaContacto('');
    setCreandoChat(false);
  };

  const iniciarChatConNumero = async () => {
    if (!numeroNuevo.trim()) return;
    setCreandoChat(true);
    const telefonoNormalizado = normalizarTelefono(numeroNuevo);
    const { data: contactoExistente } = await supabase.from('contactos').select('*').eq('telefono', telefonoNormalizado).single();
    let contactoId: string;
    if (contactoExistente) {
      contactoId = contactoExistente.id;
      const { data: convExistente } = await supabase.from('conversaciones').select('*')
        .eq('contacto_id', contactoId).eq('area', lineaSeleccionada).single();
      if (convExistente) {
        setConversacionActual(convExistente);
        setMostrarNuevoChat(false);
        setNumeroNuevo('');
        setCreandoChat(false);
        return;
      }
    } else {
      const { data: nuevoContacto, error } = await supabase.from('contactos')
        .insert({ telefono: telefonoNormalizado, origen: 'crm', activo: true }).select().single();
      if (error || !nuevoContacto) { alert('Error al crear el contacto'); setCreandoChat(false); return; }
      contactoId = nuevoContacto.id;
    }
    const { data: nuevaConv } = await supabase.from('conversaciones').insert({
      contacto_id: contactoId, telefono: telefonoNormalizado,
      estado: 'nueva', prioridad: 'media', canal: 'whatsapp',
      area: lineaSeleccionada, linea_origen: lineaSeleccionada, inbox_fijo: lineaSeleccionada, origen: 'crm'
    }).select().single();
    if (nuevaConv) setConversacionActual(nuevaConv);
    setMostrarNuevoChat(false);
    setNumeroNuevo('');
    setCreandoChat(false);
  };

  const toggleEtiqueta = (etiquetaId: string) => {
    setEtiquetasSeleccionadas(prev =>
      prev.includes(etiquetaId)
        ? prev.filter(id => id !== etiquetaId)
        : [...prev, etiquetaId]
    );
  };

  const limpiarFiltroEtiquetas = () => {
    setEtiquetasSeleccionadas([]);
    setMostrarFiltroEtiquetas(false);
  };

  const etiquetasSeleccionadasInfo = etiquetasGlobales.filter(e => etiquetasSeleccionadas.includes(e.id));

  return (
    <div className="w-72 h-full flex flex-col bg-white dark:bg-slate-900 border-r border-slate-200 dark:border-slate-800 flex-shrink-0">
      <div className="flex-shrink-0 p-3 border-b border-slate-200 dark:border-slate-800">
        <div className="flex items-center justify-between mb-2">
          <h2 className="font-semibold text-sm text-slate-800 dark:text-white">{inboxConfig?.nombre || 'Conversaciones'}</h2>
          <div className="flex gap-1">
            <button className="p-1.5 rounded-md hover:bg-slate-100 dark:hover:bg-slate-800 text-slate-500"><Search size={14} /></button>
            <button onClick={() => setMostrarNuevoChat(true)} className="p-1.5 rounded-md bg-indigo-500 hover:bg-indigo-600 text-white" title="Nuevo chat"><Plus size={14} /></button>
          </div>
        </div>
        <div className="relative mb-2">
          <Search size={12} className="absolute left-2.5 top-1/2 -translate-y-1/2 text-slate-400" />
          <input type="text" placeholder="Buscar..." value={busquedaConversaciones} onChange={(e) => setBusquedaConversaciones(e.target.value)}
            className="w-full pl-7 pr-2 py-1.5 text-xs bg-slate-100 dark:bg-slate-800 border-0 rounded-md focus:ring-1 focus:ring-indigo-500 text-slate-800 dark:text-white placeholder-slate-400" />
        </div>

        <div className="flex gap-1 mb-2">
          {(['todas', 'sin_asignar', 'mias'] as const).map((filtro) => (
            <button key={filtro} onClick={() => setFiltroConversaciones(filtro)}
              className={cn('px-2 py-0.5 text-[10px] font-medium rounded-full transition-colors',
                filtroConversaciones === filtro ? 'bg-indigo-100 dark:bg-indigo-500/20 text-indigo-600 dark:text-indigo-400' : 'text-slate-500 hover:bg-slate-100 dark:hover:bg-slate-800')}>
              {filtro === 'todas' ? 'Todas' : filtro === 'sin_asignar' ? 'Sin asignar' : 'Mías'}
            </button>
          ))}
        </div>

        {/* Filtro de fecha - Rango */}
        <div className="relative mb-2" ref={filtroFechaRef}>
          <button
            onClick={() => setMostrarFiltroFecha(!mostrarFiltroFecha)}
            className={cn(
              'w-full flex items-center justify-between px-2 py-1.5 text-[10px] rounded-md border transition-colors',
              tieneFiltroFecha
                ? 'border-indigo-300 bg-indigo-50 dark:bg-indigo-500/10 text-indigo-600 dark:text-indigo-400'
                : 'border-slate-200 dark:border-slate-700 text-slate-500 hover:bg-slate-50 dark:hover:bg-slate-800'
            )}
          >
            <div className="flex items-center gap-1.5">
              <Calendar size={12} />
              <span>{getTextoFiltroFecha()}</span>
            </div>
            <div className="flex items-center gap-1">
              {tieneFiltroFecha && (
                <button
                  onClick={(e) => { e.stopPropagation(); limpiarFiltroFecha(); }}
                  className="p-0.5 hover:bg-indigo-200 dark:hover:bg-indigo-500/20 rounded"
                >
                  <X size={10} />
                </button>
              )}
              <ChevronDown size={12} className={cn('transition-transform', mostrarFiltroFecha && 'rotate-180')} />
            </div>
          </button>

          {mostrarFiltroFecha && (
            <div className="absolute top-full left-0 right-0 mt-1 bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-700 rounded-lg shadow-lg z-10 p-3">
              <div className="space-y-3">
                <div>
                  <label className="block text-[10px] font-medium text-slate-500 dark:text-slate-400 mb-1">
                    Desde
                  </label>
                  <input
                    type="date"
                    value={fechaDesde}
                    onChange={(e) => setFechaDesde(e.target.value)}
                    max={fechaHasta || undefined}
                    className="w-full px-2 py-1.5 text-[11px] bg-slate-100 dark:bg-slate-800 border-0 rounded-md focus:ring-1 focus:ring-indigo-500 text-slate-800 dark:text-white"
                  />
                </div>
                <div>
                  <label className="block text-[10px] font-medium text-slate-500 dark:text-slate-400 mb-1">
                    Hasta
                  </label>
                  <input
                    type="date"
                    value={fechaHasta}
                    onChange={(e) => setFechaHasta(e.target.value)}
                    min={fechaDesde || undefined}
                    className="w-full px-2 py-1.5 text-[11px] bg-slate-100 dark:bg-slate-800 border-0 rounded-md focus:ring-1 focus:ring-indigo-500 text-slate-800 dark:text-white"
                  />
                </div>
                {tieneFiltroFecha && (
                  <button
                    onClick={() => { limpiarFiltroFecha(); setMostrarFiltroFecha(false); }}
                    className="w-full py-1.5 text-[10px] text-slate-500 hover:text-slate-700 dark:hover:text-slate-300 hover:bg-slate-100 dark:hover:bg-slate-800 rounded-md transition-colors"
                  >
                    Limpiar filtro
                  </button>
                )}
              </div>
            </div>
          )}
        </div>

        {/* Filtro de etiquetas */}
        <div className="relative" ref={filtroEtiquetasRef}>
          <button
            onClick={() => setMostrarFiltroEtiquetas(!mostrarFiltroEtiquetas)}
            className={cn(
              'w-full flex items-center justify-between px-2 py-1.5 text-[10px] rounded-md border transition-colors',
              etiquetasSeleccionadas.length > 0
                ? 'border-purple-300 bg-purple-50 dark:bg-purple-500/10 text-purple-600 dark:text-purple-400'
                : 'border-slate-200 dark:border-slate-700 text-slate-500 hover:bg-slate-50 dark:hover:bg-slate-800'
            )}
          >
            <div className="flex items-center gap-1.5 flex-1 min-w-0">
              <Tag size={12} />
              {etiquetasSeleccionadas.length === 0 ? (
                <span>Filtrar por etiquetas</span>
              ) : (
                <div className="flex items-center gap-1 flex-1 min-w-0 overflow-hidden">
                  {etiquetasSeleccionadasInfo.slice(0, 2).map(et => (
                    <span
                      key={et.id}
                      className="px-1.5 py-0.5 rounded text-[9px] font-medium truncate"
                      style={{
                        backgroundColor: `${et.color}20`,
                        color: et.color
                      }}
                    >
                      {et.nombre}
                    </span>
                  ))}
                  {etiquetasSeleccionadas.length > 2 && (
                    <span className="text-[9px] text-purple-500">+{etiquetasSeleccionadas.length - 2}</span>
                  )}
                </div>
              )}
            </div>
            <div className="flex items-center gap-1">
              {etiquetasSeleccionadas.length > 0 && (
                <button
                  onClick={(e) => { e.stopPropagation(); limpiarFiltroEtiquetas(); }}
                  className="p-0.5 hover:bg-purple-200 dark:hover:bg-purple-500/20 rounded"
                >
                  <X size={10} />
                </button>
              )}
              <ChevronDown size={12} className={cn('transition-transform', mostrarFiltroEtiquetas && 'rotate-180')} />
            </div>
          </button>

          {mostrarFiltroEtiquetas && (
            <div className="absolute top-full left-0 right-0 mt-1 bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-700 rounded-lg shadow-lg z-10 py-1 max-h-48 overflow-y-auto">
              {etiquetasGlobales.length === 0 ? (
                <p className="px-3 py-2 text-[11px] text-slate-400">No hay etiquetas</p>
              ) : (
                etiquetasGlobales.map((etiqueta) => {
                  const isSelected = etiquetasSeleccionadas.includes(etiqueta.id);
                  return (
                    <button
                      key={etiqueta.id}
                      onClick={() => toggleEtiqueta(etiqueta.id)}
                      className={cn(
                        'w-full text-left px-3 py-1.5 text-[11px] transition-colors flex items-center gap-2',
                        isSelected
                          ? 'bg-purple-50 dark:bg-purple-500/10'
                          : 'hover:bg-slate-50 dark:hover:bg-slate-800'
                      )}
                    >
                      <span
                        className="w-3 h-3 rounded-full flex-shrink-0 flex items-center justify-center"
                        style={{ backgroundColor: isSelected ? etiqueta.color : 'transparent', border: `2px solid ${etiqueta.color}` }}
                      >
                        {isSelected && <span className="text-white text-[8px]">✓</span>}
                      </span>
                      <span className={cn('flex-1', isSelected ? 'font-medium' : '')} style={{ color: isSelected ? etiqueta.color : undefined }}>
                        {etiqueta.nombre}
                      </span>
                    </button>
                  );
                })
              )}
            </div>
          )}
        </div>

        {!loading && (
          <div className="mt-2 text-[10px] text-slate-400 text-center">
            {conversaciones.length} conversacion{conversaciones.length !== 1 ? 'es' : ''}
          </div>
        )}
      </div>

      <div className="flex-1 overflow-y-auto min-h-0">
        {loading ? (<div className="p-3 text-center text-slate-400 text-xs">Cargando...</div>
        ) : conversaciones.length === 0 ? (<div className="p-3 text-center text-slate-400 text-xs">No hay conversaciones</div>
        ) : conversaciones.map((conv) => {
          const isSelected = conversacionActual?.id === conv.id;
          const windowInfo = getWindowTimeLeft(conv.ventana_24h_fin, conv.ventana_72h_fin);
          return (
            <div key={conv.id} onClick={() => setConversacionActual(conv)}
              className={cn('p-2 border-b border-slate-100 dark:border-slate-800 cursor-pointer transition-colors',
                isSelected ? 'bg-indigo-50 dark:bg-indigo-500/10' : 'hover:bg-slate-50 dark:hover:bg-slate-800/50',
                conv.fijada && 'bg-amber-50/50 dark:bg-amber-500/5')}>
              <div className="flex gap-2">
                <div className="w-8 h-8 rounded-full bg-gradient-to-br from-indigo-400 to-purple-400 flex items-center justify-center text-white text-[10px] font-medium flex-shrink-0 relative">
                  {getInitials(conv.nombre || conv.telefono)}
                  {conv.fijada && (
                    <div className="absolute -top-1 -right-1 w-4 h-4 bg-amber-400 rounded-full flex items-center justify-center shadow-sm">
                      <Pin size={9} className="text-amber-900 fill-amber-900" />
                    </div>
                  )}
                </div>
                <div className="flex-1 min-w-0">
                  <div className="flex items-center justify-between gap-1">
                    <div className="flex items-center gap-1 min-w-0">
                      <span className="font-medium text-xs text-slate-800 dark:text-white truncate">{conv.nombre || conv.telefono}</span>
                    </div>
                    <span className="text-[10px] text-slate-400 flex-shrink-0">{timeAgo(conv.ts_ultimo_mensaje)}</span>
                  </div>
                  <div className="flex items-center gap-1 mt-0.5 flex-wrap">
                    {conv.es_lead_meta && <span className="px-1 py-0.5 bg-blue-100 dark:bg-blue-500/20 text-blue-600 dark:text-blue-400 text-[8px] font-medium rounded">META</span>}
                    {inboxActual === 'wsp4' && conv.area && conv.area !== 'wsp4' && (
                      <span className="px-1 py-0.5 bg-slate-100 dark:bg-slate-700 text-slate-600 dark:text-slate-300 text-[8px] font-medium rounded capitalize">{conv.area}</span>
                    )}
                    <span className={cn('px-1 py-0.5 text-[8px] font-medium rounded',
                      conv.estado === 'nueva' && 'bg-green-100 dark:bg-green-500/20 text-green-600',
                      conv.estado === 'activa' && 'bg-blue-100 dark:bg-blue-500/20 text-blue-600',
                      conv.estado === 'esperando' && 'bg-amber-100 dark:bg-amber-500/20 text-amber-600',
                      conv.estado === 'derivada' && 'bg-purple-100 dark:bg-purple-500/20 text-purple-600'
                    )}>{conv.estado}</span>
                    {windowInfo && <span className={cn('flex items-center gap-0.5 text-[8px]', windowInfo.color)}><Clock size={8} />{windowInfo.texto}</span>}
                    {conv.asignado_nombre && <span className="px-1 py-0.5 bg-emerald-100 dark:bg-emerald-500/20 text-emerald-600 dark:text-emerald-400 text-[8px] font-medium rounded">👤 {conv.asignado_nombre}</span>}
                  </div>
                  <p className="text-[10px] text-slate-500 truncate mt-0.5">{conv.ultimo_mensaje || 'Sin mensajes'}</p>
                </div>
                {(conv.mensajes_no_leidos || 0) > 0 && (
                  <div className="flex-shrink-0 self-center">
                    <span className="min-w-[16px] h-4 px-1 bg-indigo-500 text-white text-[10px] font-medium rounded-full flex items-center justify-center">{conv.mensajes_no_leidos}</span>
                  </div>
                )}
              </div>
            </div>
          );
        })}
      </div>

      {mostrarNuevoChat && (
        <div className="fixed inset-0 bg-black/50 flex items-center justify-center z-50">
          <div ref={modalRef} className="bg-white dark:bg-slate-900 rounded-2xl w-[400px] max-h-[85vh] flex flex-col shadow-2xl">
            <div className="p-4 border-b border-slate-200 dark:border-slate-800 flex items-center justify-between">
              <div className="flex items-center gap-2">
                <MessageSquarePlus size={20} className="text-indigo-500" />
                <h3 className="font-semibold text-slate-800 dark:text-white">Nuevo Chat</h3>
              </div>
              <button onClick={() => { setMostrarNuevoChat(false); setBusquedaContacto(''); setNumeroNuevo(''); }}
                className="p-1 hover:bg-slate-100 dark:hover:bg-slate-800 rounded-full">
                <X size={18} className="text-slate-400" />
              </button>
            </div>

            <div className="p-4 flex-1 overflow-y-auto">
              <div className="mb-4">
                <label className="text-xs font-medium text-slate-600 dark:text-slate-400 mb-2 block">Enviar desde</label>
                {lineasFiltradas.length === 0 ? (
                  <div className="text-center py-4 text-sm text-slate-500">
                    No tienes permisos para enviar mensajes
                  </div>
                ) : (
                  <div className="grid grid-cols-3 gap-2">
                    {lineasFiltradas.map((linea) => {
                      const Icon = linea.icon;
                      const isSelected = lineaSeleccionada === linea.id;
                      return (
                        <button key={linea.id} onClick={() => setLineaSeleccionada(linea.id)}
                          className={cn('flex flex-col items-center gap-1.5 p-3 rounded-xl border-2 transition-all',
                            isSelected ? 'border-indigo-500 bg-indigo-50 dark:bg-indigo-500/10' : 'border-slate-200 dark:border-slate-700 hover:border-slate-300')}>
                          <div className={cn('w-9 h-9 rounded-full flex items-center justify-center text-white', linea.color)}>
                            <Icon size={18} />
                          </div>
                          <span className={cn('text-[11px] font-medium', isSelected ? 'text-indigo-600 dark:text-indigo-400' : 'text-slate-600 dark:text-slate-400')}>
                            {linea.nombre}
                          </span>
                        </button>
                      );
                    })}
                  </div>
                )}
                {lineasFiltradas.length > 0 && (
                  <p className="text-[10px] text-green-600 mt-2 text-center">✓ Evolution API (sin costo)</p>
                )}
              </div>

              <div className="flex items-center gap-3 my-3">
                <div className="flex-1 h-px bg-slate-200 dark:bg-slate-700" />
                <span className="text-[10px] text-slate-400">Destinatario</span>
                <div className="flex-1 h-px bg-slate-200 dark:bg-slate-700" />
              </div>

              <div className="mb-3">
                <label className="text-xs font-medium text-slate-600 dark:text-slate-400 mb-1 block">Buscar contacto</label>
                <div className="relative">
                  <Search size={14} className="absolute left-3 top-1/2 -translate-y-1/2 text-slate-400" />
                  <input type="text" value={busquedaContacto} onChange={(e) => setBusquedaContacto(e.target.value)}
                    placeholder="Nombre o teléfono..." className="w-full pl-9 pr-3 py-2 bg-slate-100 dark:bg-slate-800 border-0 rounded-lg text-sm" />
                </div>
              </div>

              {busquedaContacto.length >= 2 && (
                <div className="mb-3">
                  {buscandoContactos ? (<p className="text-xs text-slate-400 text-center py-2">Buscando...</p>
                  ) : contactos.length === 0 ? (<p className="text-xs text-slate-400 text-center py-2">No se encontraron</p>
                  ) : (
                    <div className="space-y-1 max-h-32 overflow-y-auto">
                      {contactos.map((c) => (
                        <button key={c.id} onClick={() => iniciarChatConContacto(c)} disabled={creandoChat}
                          className="w-full flex items-center gap-3 p-2 hover:bg-slate-50 dark:hover:bg-slate-800 rounded-lg transition-colors text-left">
                          <div className="w-8 h-8 rounded-full bg-gradient-to-br from-indigo-400 to-purple-400 flex items-center justify-center text-white text-xs font-medium">
                            {getInitials(c.nombre || c.telefono)}
                          </div>
                          <div className="flex-1 min-w-0">
                            <p className="text-sm font-medium text-slate-800 dark:text-white truncate">{c.nombre || 'Sin nombre'}</p>
                            <p className="text-xs text-slate-500">{formatPhone(c.telefono)}</p>
                          </div>
                        </button>
                      ))}
                    </div>
                  )}
                </div>
              )}

              <div className="flex items-center gap-3 my-3">
                <div className="flex-1 h-px bg-slate-200 dark:bg-slate-700" />
                <span className="text-[10px] text-slate-400">o numero nuevo</span>
                <div className="flex-1 h-px bg-slate-200 dark:bg-slate-700" />
              </div>

              <div>
                <div className="flex gap-2">
                  <div className="relative flex-1">
                    <Phone size={14} className="absolute left-3 top-1/2 -translate-y-1/2 text-slate-400" />
                    <input type="tel" value={numeroNuevo} onChange={(e) => setNumeroNuevo(e.target.value)}
                      placeholder="Ej: 1155667788" className="w-full pl-9 pr-3 py-2 bg-slate-100 dark:bg-slate-800 border-0 rounded-lg text-sm"
                      onKeyDown={(e) => e.key === 'Enter' && iniciarChatConNumero()} />
                  </div>
                  <button onClick={iniciarChatConNumero} disabled={!numeroNuevo.trim() || creandoChat || lineasFiltradas.length === 0}
                    className="px-4 py-2 bg-indigo-500 text-white rounded-lg text-sm font-medium hover:bg-indigo-600 disabled:opacity-50 disabled:cursor-not-allowed">
                    {creandoChat ? '...' : 'Iniciar'}
                  </button>
                </div>
                <p className="text-[10px] text-slate-400 mt-1">Con o sin codigo de pais (+54)</p>
              </div>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
