'use client';

import { useEffect, useState, useRef, useCallback } from 'react';
import { useRouter } from 'next/navigation';
import { supabase } from '@/lib/supabase';
import { cn, formatPhone, getInitials, timeAgo } from '@/lib/utils';
import {
  Search, Plus, Download, MoreHorizontal, ChevronDown,
  Pencil, Trash2, MessageSquare, X, User, Phone, Mail, Tag,
  AlertTriangle, Check, ArrowUpDown, RefreshCw,
  ChevronLeft, ChevronRight
} from 'lucide-react';

interface Contacto {
  id: string;
  telefono: string;
  nombre?: string;
  email?: string;
  pais?: string;
  origen?: string;
  activo?: boolean;
  created_at: string;
  updated_at?: string;
  resultado?: string;
  etiquetas?: string[];
  notas?: string;
  tipo?: string;
  estado_lead?: string;
}

interface Filtros {
  busqueda: string;
  resultado: string;
  origen: string;
  pais: string;
  activo: string;
  ordenar: string;
}

const RESULTADOS = [
  { value: '', label: 'En proceso', color: 'bg-slate-100 text-slate-600 dark:bg-slate-500/20 dark:text-slate-400' },
  { value: 'INS', label: 'Inscripto/Alumno', color: 'bg-emerald-100 text-emerald-600 dark:bg-emerald-500/20 dark:text-emerald-400' },
  { value: 'NOINT', label: 'No interesado', color: 'bg-red-100 text-red-600 dark:bg-red-500/20 dark:text-red-400' },
  { value: 'NOCONT', label: 'No contactado', color: 'bg-orange-100 text-orange-600 dark:bg-orange-500/20 dark:text-orange-400' },
  { value: 'NR+', label: 'No responde plus', color: 'bg-slate-100 text-slate-600 dark:bg-slate-500/20 dark:text-slate-400' },
];

const ORIGENES = [
  { value: 'whatsapp', label: 'WhatsApp' },
  { value: 'web', label: 'Web' },
  { value: 'meta_ads', label: 'Meta Ads' },
  { value: 'manual', label: 'Manual' },
  { value: 'importado', label: 'Importado' },
];

const ORDENAR_OPTIONS = [
  { value: 'created_desc', label: 'Más recientes' },
  { value: 'created_asc', label: 'Más antiguos' },
  { value: 'nombre_asc', label: 'Nombre A-Z' },
  { value: 'nombre_desc', label: 'Nombre Z-A' },
  { value: 'updated_desc', label: 'Última actividad' },
];

const POR_PAGINA = 50;

export default function ContactosPage() {
  const router = useRouter();
  const [contactos, setContactos] = useState<Contacto[]>([]);
  const [loading, setLoading] = useState(true);
  const [totalContactos, setTotalContactos] = useState(0);
  const [pagina, setPagina] = useState(1);
  
  const [filtros, setFiltros] = useState<Filtros>({
    busqueda: '',
    resultado: '',
    origen: '',
    pais: '',
    activo: '',
    ordenar: 'created_desc',
  });
  
  const [paisesUnicos, setPaisesUnicos] = useState<string[]>([]);
  const [origenesUnicos, setOrigenesUnicos] = useState<string[]>([]);
  
  const [menuAbierto, setMenuAbierto] = useState<string | null>(null);
  const [modalEditar, setModalEditar] = useState<Contacto | null>(null);
  const [modalEliminar, setModalEliminar] = useState<Contacto | null>(null);
  const [modalNuevo, setModalNuevo] = useState(false);
  const [guardando, setGuardando] = useState(false);
  const [mensaje, setMensaje] = useState<{ tipo: 'success' | 'error'; texto: string } | null>(null);
  const menuRef = useRef<HTMLTableCellElement>(null);

  useEffect(() => {
    const cargarOpciones = async () => {
      const { data: paises } = await supabase
        .from('contactos')
        .select('pais')
        .not('pais', 'is', null)
        .not('pais', 'eq', '');
      
      if (paises) {
        const uniquePaises = [...new Set(paises.map(p => p.pais).filter(Boolean))].sort();
        setPaisesUnicos(uniquePaises as string[]);
      }
      
      const { data: origenes } = await supabase
        .from('contactos')
        .select('origen')
        .not('origen', 'is', null)
        .not('origen', 'eq', '');
      
      if (origenes) {
        const uniqueOrigenes = [...new Set(origenes.map(o => o.origen).filter(Boolean))].sort();
        setOrigenesUnicos(uniqueOrigenes as string[]);
      }
    };
    cargarOpciones();
  }, []);

  const [debouncedBusqueda, setDebouncedBusqueda] = useState('');
  useEffect(() => {
    const timer = setTimeout(() => {
      setDebouncedBusqueda(filtros.busqueda);
      setPagina(1);
    }, 300);
    return () => clearTimeout(timer);
  }, [filtros.busqueda]);

  const cargarContactos = useCallback(async () => {
    setLoading(true);
    
    let query = supabase
      .from('contactos')
      .select('*', { count: 'exact' });
    
    if (debouncedBusqueda) {
      query = query.or(`nombre.ilike.%${debouncedBusqueda}%,telefono.ilike.%${debouncedBusqueda}%,email.ilike.%${debouncedBusqueda}%`);
    }
    
    if (filtros.resultado) {
      if (filtros.resultado === 'EN_PROCESO') {
        query = query.or('resultado.is.null,resultado.eq.');
      } else {
        query = query.eq('resultado', filtros.resultado);
      }
    }
    
    if (filtros.origen) {
      query = query.eq('origen', filtros.origen);
    }
    
    if (filtros.pais) {
      query = query.eq('pais', filtros.pais);
    }
    
    if (filtros.activo !== '') {
      query = query.eq('activo', filtros.activo === 'true');
    }
    
    const [campo, direccion] = filtros.ordenar.split('_');
    const ascending = direccion === 'asc';
    
    if (campo === 'created') {
      query = query.order('created_at', { ascending });
    } else if (campo === 'updated') {
      query = query.order('updated_at', { ascending, nullsFirst: false });
    } else if (campo === 'nombre') {
      query = query.order('nombre', { ascending, nullsFirst: false });
    }
    
    const from = (pagina - 1) * POR_PAGINA;
    const to = from + POR_PAGINA - 1;
    query = query.range(from, to);
    
    const { data, count, error } = await query;
    
    if (error) {
      console.error('Error cargando contactos:', error);
      setMensaje({ tipo: 'error', texto: 'Error al cargar contactos' });
    } else {
      setContactos(data || []);
      setTotalContactos(count || 0);
    }
    
    setLoading(false);
  }, [debouncedBusqueda, filtros.resultado, filtros.origen, filtros.pais, filtros.activo, filtros.ordenar, pagina]);

  useEffect(() => {
    cargarContactos();
  }, [cargarContactos]);

  useEffect(() => {
    const handleClickOutside = (e: MouseEvent) => {
      if (menuRef.current && !menuRef.current.contains(e.target as Node)) {
        setMenuAbierto(null);
      }
    };
    document.addEventListener('mousedown', handleClickOutside);
    return () => document.removeEventListener('mousedown', handleClickOutside);
  }, []);

  useEffect(() => {
    if (mensaje) {
      const timer = setTimeout(() => setMensaje(null), 3000);
      return () => clearTimeout(timer);
    }
  }, [mensaje]);

  const actualizarFiltro = (key: keyof Filtros, value: string) => {
    setFiltros(prev => ({ ...prev, [key]: value }));
    if (key !== 'busqueda') {
      setPagina(1);
    }
  };

  const limpiarFiltros = () => {
    setFiltros({
      busqueda: '',
      resultado: '',
      origen: '',
      pais: '',
      activo: '',
      ordenar: 'created_desc',
    });
    setPagina(1);
  };

  const filtrosActivos = [
    filtros.resultado,
    filtros.origen,
    filtros.pais,
    filtros.activo,
  ].filter(Boolean).length;

  const guardarContacto = async (contacto: Partial<Contacto>, esNuevo: boolean) => {
    setGuardando(true);
    try {
      if (esNuevo) {
        if (!contacto.telefono) {
          setMensaje({ tipo: 'error', texto: 'El teléfono es requerido' });
          setGuardando(false);
          return;
        }
        let telefono = contacto.telefono.replace(/\D/g, '');
        if (!telefono.startsWith('+')) {
          telefono = '+' + telefono;
        }
        const { error } = await supabase
          .from('contactos')
          .insert({ ...contacto, telefono });
        if (error) {
          if (error.code === '23505') {
            setMensaje({ tipo: 'error', texto: 'Ya existe un contacto con ese teléfono' });
          } else {
            setMensaje({ tipo: 'error', texto: error.message });
          }
          setGuardando(false);
          return;
        }
        setMensaje({ tipo: 'success', texto: 'Contacto creado correctamente' });
        setModalNuevo(false);
      } else {
        const { error } = await supabase
          .from('contactos')
          .update(contacto)
          .eq('id', contacto.id);
        if (error) {
          setMensaje({ tipo: 'error', texto: error.message });
          setGuardando(false);
          return;
        }
        setMensaje({ tipo: 'success', texto: 'Contacto actualizado correctamente' });
        setModalEditar(null);
      }
      await cargarContactos();
    } catch (err) {
      setMensaje({ tipo: 'error', texto: 'Error al guardar el contacto' });
    }
    setGuardando(false);
  };

  const eliminarContacto = async (id: string) => {
    setGuardando(true);
    try {
      const { error } = await supabase
        .from('contactos')
        .delete()
        .eq('id', id);
      if (error) {
        setMensaje({ tipo: 'error', texto: error.message });
      } else {
        setMensaje({ tipo: 'success', texto: 'Contacto eliminado correctamente' });
        await cargarContactos();
      }
    } catch (err) {
      setMensaje({ tipo: 'error', texto: 'Error al eliminar el contacto' });
    }
    setModalEliminar(null);
    setGuardando(false);
  };

  const verConversaciones = async (telefono: string) => {
    const { data } = await supabase
      .from('conversaciones')
      .select('id')
      .eq('telefono', telefono)
      .limit(1)
      .single();
    if (data) {
      router.push(`/crm?conversacion=${data.id}`);
    } else {
      setMensaje({ tipo: 'error', texto: 'No hay conversaciones con este contacto' });
    }
    setMenuAbierto(null);
  };

  const exportarCSV = () => {
    const headers = ['Nombre', 'Teléfono', 'Email', 'País', 'Origen', 'Resultado', 'Creado'];
    const rows = contactos.map(c => [
      c.nombre || '',
      c.telefono,
      c.email || '',
      c.pais || '',
      c.origen || '',
      RESULTADOS.find(r => r.value === c.resultado)?.label || 'En proceso',
      new Date(c.created_at).toLocaleDateString()
    ]);
    const csv = [headers, ...rows].map(row => row.join(',')).join('\n');
    const blob = new Blob([csv], { type: 'text/csv' });
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = `contactos_${new Date().toISOString().split('T')[0]}.csv`;
    a.click();
  };

  const getResultadoColor = (resultado?: string) => {
    const found = RESULTADOS.find(r => r.value === resultado);
    return found?.color || 'bg-slate-100 text-slate-600 dark:bg-slate-500/20 dark:text-slate-400';
  };

  const totalPaginas = Math.ceil(totalContactos / POR_PAGINA);

  return (
    <div className="flex-1 flex flex-col bg-slate-50 dark:bg-slate-950 overflow-hidden">
      {mensaje && (
        <div className={cn(
          "fixed top-4 right-4 z-50 px-4 py-3 rounded-lg shadow-lg flex items-center gap-2",
          mensaje.tipo === 'success' ? "bg-green-500 text-white" : "bg-red-500 text-white"
        )}>
          {mensaje.tipo === 'success' ? <Check size={18} /> : <AlertTriangle size={18} />}
          {mensaje.texto}
        </div>
      )}

      {/* Header */}
      <div className="bg-white dark:bg-slate-900 border-b border-slate-200 dark:border-slate-800 p-4">
        <div className="flex items-center justify-between mb-4">
          <div>
            <h1 className="text-xl font-bold text-slate-800 dark:text-white">Contactos</h1>
            <p className="text-sm text-slate-500 mt-0.5">
              {totalContactos.toLocaleString()} contactos en total
            </p>
          </div>
          <div className="flex gap-2">
            <button
              onClick={exportarCSV}
              className="px-4 py-2 bg-slate-100 dark:bg-slate-800 text-slate-600 dark:text-slate-300 rounded-lg text-sm font-medium flex items-center gap-2 hover:bg-slate-200 dark:hover:bg-slate-700 transition-colors"
            >
              <Download size={16} /> Exportar
            </button>
            <button
              onClick={() => setModalNuevo(true)}
              className="px-4 py-2 bg-indigo-500 text-white rounded-lg text-sm font-medium flex items-center gap-2 hover:bg-indigo-600 transition-colors"
            >
              <Plus size={16} /> Nuevo Contacto
            </button>
          </div>
        </div>

        {/* Filtros */}
        <div className="flex flex-wrap gap-3 items-center">
          <div className="relative flex-1 min-w-[200px] max-w-md">
            <Search size={16} className="absolute left-3 top-1/2 -translate-y-1/2 text-slate-400" />
            <input
              type="text"
              placeholder="Buscar por nombre, teléfono o email..."
              value={filtros.busqueda}
              onChange={(e) => actualizarFiltro('busqueda', e.target.value)}
              className="w-full pl-9 pr-8 py-2 bg-slate-100 dark:bg-slate-800 border-0 rounded-lg text-sm text-slate-800 dark:text-white placeholder:text-slate-400 focus:ring-2 focus:ring-indigo-500"
            />
            {filtros.busqueda && (
              <button
                onClick={() => actualizarFiltro('busqueda', '')}
                className="absolute right-3 top-1/2 -translate-y-1/2 text-slate-400 hover:text-slate-600"
              >
                <X size={14} />
              </button>
            )}
          </div>

          <div className="relative">
            <select
              value={filtros.resultado}
              onChange={(e) => actualizarFiltro('resultado', e.target.value)}
              className={cn(
                "appearance-none pl-3 pr-8 py-2 rounded-lg text-sm border-0 cursor-pointer transition-colors",
                filtros.resultado
                  ? "bg-indigo-100 dark:bg-indigo-500/20 text-indigo-700 dark:text-indigo-300"
                  : "bg-slate-100 dark:bg-slate-800 text-slate-600 dark:text-slate-300"
              )}
            >
              <option value="">Resultado</option>
              <option value="EN_PROCESO">En proceso</option>
              {RESULTADOS.filter(r => r.value).map(r => (
                <option key={r.value} value={r.value}>{r.label}</option>
              ))}
            </select>
            <ChevronDown size={14} className="absolute right-2 top-1/2 -translate-y-1/2 pointer-events-none text-slate-400" />
          </div>

          <div className="relative">
            <select
              value={filtros.origen}
              onChange={(e) => actualizarFiltro('origen', e.target.value)}
              className={cn(
                "appearance-none pl-3 pr-8 py-2 rounded-lg text-sm border-0 cursor-pointer transition-colors",
                filtros.origen
                  ? "bg-indigo-100 dark:bg-indigo-500/20 text-indigo-700 dark:text-indigo-300"
                  : "bg-slate-100 dark:bg-slate-800 text-slate-600 dark:text-slate-300"
              )}
            >
              <option value="">Origen</option>
              {origenesUnicos.map(o => (
                <option key={o} value={o}>
                  {ORIGENES.find(orig => orig.value === o)?.label || o}
                </option>
              ))}
            </select>
            <ChevronDown size={14} className="absolute right-2 top-1/2 -translate-y-1/2 pointer-events-none text-slate-400" />
          </div>

          {paisesUnicos.length > 0 && (
            <div className="relative">
              <select
                value={filtros.pais}
                onChange={(e) => actualizarFiltro('pais', e.target.value)}
                className={cn(
                  "appearance-none pl-3 pr-8 py-2 rounded-lg text-sm border-0 cursor-pointer transition-colors",
                  filtros.pais
                    ? "bg-indigo-100 dark:bg-indigo-500/20 text-indigo-700 dark:text-indigo-300"
                    : "bg-slate-100 dark:bg-slate-800 text-slate-600 dark:text-slate-300"
                )}
              >
                <option value="">País</option>
                {paisesUnicos.map(p => (
                  <option key={p} value={p}>{p}</option>
                ))}
              </select>
              <ChevronDown size={14} className="absolute right-2 top-1/2 -translate-y-1/2 pointer-events-none text-slate-400" />
            </div>
          )}

          <div className="relative">
            <select
              value={filtros.activo}
              onChange={(e) => actualizarFiltro('activo', e.target.value)}
              className={cn(
                "appearance-none pl-3 pr-8 py-2 rounded-lg text-sm border-0 cursor-pointer transition-colors",
                filtros.activo
                  ? "bg-indigo-100 dark:bg-indigo-500/20 text-indigo-700 dark:text-indigo-300"
                  : "bg-slate-100 dark:bg-slate-800 text-slate-600 dark:text-slate-300"
              )}
            >
              <option value="">Estado</option>
              <option value="true">Activos</option>
              <option value="false">Inactivos</option>
            </select>
            <ChevronDown size={14} className="absolute right-2 top-1/2 -translate-y-1/2 pointer-events-none text-slate-400" />
          </div>

          <div className="relative">
            <select
              value={filtros.ordenar}
              onChange={(e) => actualizarFiltro('ordenar', e.target.value)}
              className="appearance-none pl-3 pr-8 py-2 bg-slate-100 dark:bg-slate-800 text-slate-600 dark:text-slate-300 rounded-lg text-sm border-0 cursor-pointer"
            >
              {ORDENAR_OPTIONS.map(o => (
                <option key={o.value} value={o.value}>{o.label}</option>
              ))}
            </select>
            <ArrowUpDown size={14} className="absolute right-2 top-1/2 -translate-y-1/2 pointer-events-none text-slate-400" />
          </div>

          {filtrosActivos > 0 && (
            <button
              onClick={limpiarFiltros}
              className="px-3 py-2 text-sm text-slate-500 hover:text-slate-700 dark:hover:text-slate-300 flex items-center gap-1"
            >
              <X size={14} />
              Limpiar ({filtrosActivos})
            </button>
          )}

          <button
            onClick={cargarContactos}
            disabled={loading}
            className="p-2 text-slate-400 hover:text-slate-600 dark:hover:text-slate-300 hover:bg-slate-100 dark:hover:bg-slate-800 rounded-lg transition-colors"
            title="Refrescar"
          >
            <RefreshCw size={16} className={cn(loading && "animate-spin")} />
          </button>
        </div>
      </div>

      {/* Tabla */}
      <div className="flex-1 overflow-auto p-4">
        <div className="bg-white dark:bg-slate-900 rounded-xl border border-slate-200 dark:border-slate-800 overflow-hidden">
          <table className="w-full">
            <thead className="bg-slate-50 dark:bg-slate-800/50">
              <tr>
                <th className="text-left px-4 py-3 text-xs font-medium text-slate-500 uppercase">Contacto</th>
                <th className="text-left px-4 py-3 text-xs font-medium text-slate-500 uppercase">Teléfono</th>
                <th className="text-left px-4 py-3 text-xs font-medium text-slate-500 uppercase">Origen</th>
                <th className="text-left px-4 py-3 text-xs font-medium text-slate-500 uppercase">Resultado</th>
                <th className="text-left px-4 py-3 text-xs font-medium text-slate-500 uppercase">Etiquetas</th>
                <th className="text-left px-4 py-3 text-xs font-medium text-slate-500 uppercase">Creado</th>
                <th className="px-4 py-3"></th>
              </tr>
            </thead>
            <tbody className="divide-y divide-slate-100 dark:divide-slate-800">
              {loading ? (
                <tr><td colSpan={7} className="px-4 py-12 text-center text-slate-400">
                  <RefreshCw size={24} className="animate-spin mx-auto mb-2" />
                  Cargando contactos...
                </td></tr>
              ) : contactos.length === 0 ? (
                <tr><td colSpan={7} className="px-4 py-12 text-center text-slate-400">
                  {filtrosActivos > 0 || debouncedBusqueda ? 'No se encontraron contactos con esos filtros' : 'No hay contactos'}
                </td></tr>
              ) : contactos.map((c) => (
                <tr key={c.id} className="hover:bg-slate-50 dark:hover:bg-slate-800/50 transition-colors">
                  <td className="px-4 py-3">
                    <div className="flex items-center gap-3">
                      <div className="w-9 h-9 rounded-full bg-gradient-to-br from-indigo-400 to-purple-400 flex items-center justify-center text-white text-sm font-medium shrink-0">
                        {getInitials(c.nombre || c.telefono)}
                      </div>
                      <div className="min-w-0">
                        <p className="font-medium text-slate-800 dark:text-white truncate">{c.nombre || 'Sin nombre'}</p>
                        {c.email && <p className="text-xs text-slate-500 truncate">{c.email}</p>}
                      </div>
                    </div>
                  </td>
                  <td className="px-4 py-3 text-sm text-slate-600 dark:text-slate-300 font-mono">{formatPhone(c.telefono)}</td>
                  <td className="px-4 py-3">
                    {c.origen && (
                      <span className="px-2 py-1 text-xs bg-slate-100 dark:bg-slate-700 text-slate-600 dark:text-slate-300 rounded">
                        {ORIGENES.find(o => o.value === c.origen)?.label || c.origen}
                      </span>
                    )}
                  </td>
                  <td className="px-4 py-3">
                    <span className={cn("px-2 py-1 text-xs font-medium rounded-full", getResultadoColor(c.resultado))}>
                      {RESULTADOS.find(r => r.value === c.resultado)?.label || 'En proceso'}
                    </span>
                  </td>
                  <td className="px-4 py-3">
                    <div className="flex gap-1 flex-wrap">
                      {(c.etiquetas || []).slice(0, 2).map((et) => (
                        <span key={et} className="px-2 py-0.5 text-xs bg-slate-100 dark:bg-slate-700 text-slate-600 dark:text-slate-300 rounded">
                          {et}
                        </span>
                      ))}
                      {(c.etiquetas || []).length > 2 && (
                        <span className="px-2 py-0.5 text-xs bg-slate-100 dark:bg-slate-700 text-slate-500 rounded">
                          +{(c.etiquetas || []).length - 2}
                        </span>
                      )}
                    </div>
                  </td>
                  <td className="px-4 py-3 text-sm text-slate-500">{timeAgo(c.created_at)}</td>
                  <td className="px-4 py-3 relative" ref={menuAbierto === c.id ? menuRef : null}>
                    <button
                      onClick={() => setMenuAbierto(menuAbierto === c.id ? null : c.id)}
                      className="p-1.5 hover:bg-slate-100 dark:hover:bg-slate-700 rounded transition-colors"
                    >
                      <MoreHorizontal size={16} className="text-slate-400" />
                    </button>
                    {menuAbierto === c.id && (
                      <div className="absolute right-0 top-full mt-1 w-48 bg-white dark:bg-slate-800 rounded-lg shadow-lg border border-slate-200 dark:border-slate-700 py-1 z-50">
                        <button
                          onClick={() => { setModalEditar(c); setMenuAbierto(null); }}
                          className="w-full px-4 py-2 text-left text-sm text-slate-700 dark:text-slate-300 hover:bg-slate-100 dark:hover:bg-slate-700 flex items-center gap-2"
                        >
                          <Pencil size={14} /> Editar contacto
                        </button>
                        <button
                          onClick={() => verConversaciones(c.telefono)}
                          className="w-full px-4 py-2 text-left text-sm text-slate-700 dark:text-slate-300 hover:bg-slate-100 dark:hover:bg-slate-700 flex items-center gap-2"
                        >
                          <MessageSquare size={14} /> Ver conversaciones
                        </button>
                        <hr className="my-1 border-slate-200 dark:border-slate-700" />
                        <button
                          onClick={() => { setModalEliminar(c); setMenuAbierto(null); }}
                          className="w-full px-4 py-2 text-left text-sm text-red-600 dark:text-red-400 hover:bg-red-50 dark:hover:bg-red-500/10 flex items-center gap-2"
                        >
                          <Trash2 size={14} /> Eliminar contacto
                        </button>
                      </div>
                    )}
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>

        {/* Paginación */}
        <div className="mt-4 flex items-center justify-between">
          <p className="text-sm text-slate-500">
            Mostrando {contactos.length > 0 ? ((pagina - 1) * POR_PAGINA) + 1 : 0} - {Math.min(pagina * POR_PAGINA, totalContactos)} de {totalContactos.toLocaleString()} contactos
          </p>
          
          {totalPaginas > 1 && (
            <div className="flex items-center gap-2">
              <button
                onClick={() => setPagina(p => Math.max(1, p - 1))}
                disabled={pagina === 1}
                className="p-2 rounded-lg hover:bg-slate-100 dark:hover:bg-slate-800 disabled:opacity-50 disabled:cursor-not-allowed transition-colors"
              >
                <ChevronLeft size={18} className="text-slate-600 dark:text-slate-400" />
              </button>
              
              <div className="flex items-center gap-1">
                {Array.from({ length: Math.min(5, totalPaginas) }, (_, i) => {
                  let pageNum;
                  if (totalPaginas <= 5) {
                    pageNum = i + 1;
                  } else if (pagina <= 3) {
                    pageNum = i + 1;
                  } else if (pagina >= totalPaginas - 2) {
                    pageNum = totalPaginas - 4 + i;
                  } else {
                    pageNum = pagina - 2 + i;
                  }
                  return (
                    <button
                      key={pageNum}
                      onClick={() => setPagina(pageNum)}
                      className={cn(
                        "w-8 h-8 rounded-lg text-sm font-medium transition-colors",
                        pagina === pageNum
                          ? "bg-indigo-500 text-white"
                          : "text-slate-600 dark:text-slate-400 hover:bg-slate-100 dark:hover:bg-slate-800"
                      )}
                    >
                      {pageNum}
                    </button>
                  );
                })}
              </div>
              
              <button
                onClick={() => setPagina(p => Math.min(totalPaginas, p + 1))}
                disabled={pagina === totalPaginas}
                className="p-2 rounded-lg hover:bg-slate-100 dark:hover:bg-slate-800 disabled:opacity-50 disabled:cursor-not-allowed transition-colors"
              >
                <ChevronRight size={18} className="text-slate-600 dark:text-slate-400" />
              </button>
            </div>
          )}
        </div>
      </div>

      {/* Modales */}
      {(modalEditar || modalNuevo) && (
        <ModalContacto
          contacto={modalEditar || undefined}
          onClose={() => { setModalEditar(null); setModalNuevo(false); }}
          onSave={(c) => guardarContacto(c, modalNuevo)}
          guardando={guardando}
        />
      )}

      {modalEliminar && (
        <div className="fixed inset-0 bg-black/50 flex items-center justify-center z-50">
          <div className="bg-white dark:bg-slate-900 rounded-xl p-6 w-full max-w-md mx-4 shadow-xl">
            <div className="flex items-center gap-3 mb-4">
              <div className="w-10 h-10 rounded-full bg-red-100 dark:bg-red-500/20 flex items-center justify-center">
                <AlertTriangle className="text-red-500" size={20} />
              </div>
              <h2 className="text-lg font-semibold text-slate-800 dark:text-white">Eliminar contacto</h2>
            </div>
            <p className="text-slate-600 dark:text-slate-400 mb-6">
              ¿Estás seguro de que querés eliminar a <strong>{modalEliminar.nombre || modalEliminar.telefono}</strong>?
              Esta acción no se puede deshacer.
            </p>
            <div className="flex gap-3 justify-end">
              <button
                onClick={() => setModalEliminar(null)}
                className="px-4 py-2 text-slate-600 dark:text-slate-300 hover:bg-slate-100 dark:hover:bg-slate-800 rounded-lg transition-colors"
              >
                Cancelar
              </button>
              <button
                onClick={() => eliminarContacto(modalEliminar.id)}
                disabled={guardando}
                className="px-4 py-2 bg-red-500 text-white rounded-lg hover:bg-red-600 disabled:opacity-50 transition-colors"
              >
                {guardando ? 'Eliminando...' : 'Eliminar'}
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}

function ModalContacto({
  contacto,
  onClose,
  onSave,
  guardando
}: {
  contacto?: Contacto;
  onClose: () => void;
  onSave: (c: Partial<Contacto>) => void;
  guardando: boolean;
}) {
  const [form, setForm] = useState({
    id: contacto?.id || '',
    nombre: contacto?.nombre || '',
    telefono: contacto?.telefono || '',
    email: contacto?.email || '',
    resultado: contacto?.resultado || '',
    notas: contacto?.notas || '',
  });

  const esNuevo = !contacto;

  return (
    <div className="fixed inset-0 bg-black/50 flex items-center justify-center z-50">
      <div className="bg-white dark:bg-slate-900 rounded-xl w-full max-w-lg mx-4 shadow-xl">
        <div className="flex items-center justify-between p-4 border-b border-slate-200 dark:border-slate-800">
          <h2 className="text-lg font-semibold text-slate-800 dark:text-white">
            {esNuevo ? 'Nuevo Contacto' : 'Editar Contacto'}
          </h2>
          <button onClick={onClose} className="p-1 hover:bg-slate-100 dark:hover:bg-slate-800 rounded transition-colors">
            <X size={20} className="text-slate-400" />
          </button>
        </div>

        <div className="p-4 space-y-4">
          <div>
            <label className="block text-sm font-medium text-slate-700 dark:text-slate-300 mb-1">Nombre</label>
            <div className="relative">
              <User size={16} className="absolute left-3 top-1/2 -translate-y-1/2 text-slate-400" />
              <input
                type="text"
                value={form.nombre}
                onChange={(e) => setForm({ ...form, nombre: e.target.value })}
                placeholder="Nombre del contacto"
                className="w-full pl-9 pr-4 py-2 bg-slate-100 dark:bg-slate-800 border-0 rounded-lg text-sm text-slate-800 dark:text-white"
              />
            </div>
          </div>

          <div>
            <label className="block text-sm font-medium text-slate-700 dark:text-slate-300 mb-1">
              Teléfono {esNuevo && <span className="text-red-500">*</span>}
            </label>
            <div className="relative">
              <Phone size={16} className="absolute left-3 top-1/2 -translate-y-1/2 text-slate-400" />
              <input
                type="tel"
                value={form.telefono}
                onChange={(e) => setForm({ ...form, telefono: e.target.value })}
                placeholder="+54 9 11 1234-5678"
                disabled={!esNuevo}
                className={cn(
                  "w-full pl-9 pr-4 py-2 bg-slate-100 dark:bg-slate-800 border-0 rounded-lg text-sm text-slate-800 dark:text-white",
                  !esNuevo && "opacity-60 cursor-not-allowed"
                )}
              />
            </div>
            {!esNuevo && <p className="text-xs text-slate-500 mt-1">El teléfono no se puede modificar</p>}
          </div>

          <div>
            <label className="block text-sm font-medium text-slate-700 dark:text-slate-300 mb-1">Email</label>
            <div className="relative">
              <Mail size={16} className="absolute left-3 top-1/2 -translate-y-1/2 text-slate-400" />
              <input
                type="email"
                value={form.email}
                onChange={(e) => setForm({ ...form, email: e.target.value })}
                placeholder="email@ejemplo.com"
                className="w-full pl-9 pr-4 py-2 bg-slate-100 dark:bg-slate-800 border-0 rounded-lg text-sm text-slate-800 dark:text-white"
              />
            </div>
          </div>

          <div>
            <label className="block text-sm font-medium text-slate-700 dark:text-slate-300 mb-1">Resultado</label>
            <div className="relative">
              <Tag size={16} className="absolute left-3 top-1/2 -translate-y-1/2 text-slate-400" />
              <select
                value={form.resultado}
                onChange={(e) => setForm({ ...form, resultado: e.target.value })}
                className="w-full pl-9 pr-4 py-2 bg-slate-100 dark:bg-slate-800 border-0 rounded-lg text-sm text-slate-800 dark:text-white appearance-none"
              >
                {RESULTADOS.map(r => (
                  <option key={r.value} value={r.value}>{r.label}</option>
                ))}
              </select>
            </div>
          </div>

          <div>
            <label className="block text-sm font-medium text-slate-700 dark:text-slate-300 mb-1">Notas</label>
            <textarea
              value={form.notas}
              onChange={(e) => setForm({ ...form, notas: e.target.value })}
              placeholder="Notas adicionales sobre el contacto..."
              rows={3}
              className="w-full px-4 py-2 bg-slate-100 dark:bg-slate-800 border-0 rounded-lg text-sm text-slate-800 dark:text-white resize-none"
            />
          </div>
        </div>

        <div className="flex gap-3 justify-end p-4 border-t border-slate-200 dark:border-slate-800">
          <button
            onClick={onClose}
            className="px-4 py-2 text-slate-600 dark:text-slate-300 hover:bg-slate-100 dark:hover:bg-slate-800 rounded-lg transition-colors"
          >
            Cancelar
          </button>
          <button
            onClick={() => onSave(form)}
            disabled={guardando}
            className="px-4 py-2 bg-indigo-500 text-white rounded-lg hover:bg-indigo-600 disabled:opacity-50 transition-colors"
          >
            {guardando ? 'Guardando...' : (esNuevo ? 'Crear Contacto' : 'Guardar Cambios')}
          </button>
        </div>
      </div>
    </div>
  );
}
