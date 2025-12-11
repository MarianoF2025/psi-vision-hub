'use client';

import { useState, useEffect, useRef } from 'react';
import { useCRMStore } from '@/stores/crm-store';
import { supabase } from '@/lib/supabase';
import { cn, getInitials, getWindowTimeLeft, formatPhone } from '@/lib/utils';
import { X, Clock, Plus, Unlink, Camera, Save, Edit2, Check, MapPin, Mail, User, BookOpen, Building } from 'lucide-react';

const ESTADOS_CONV = ['nueva', 'activa', 'esperando', 'resuelta', 'cerrada'] as const;
const ESTADOS_LEAD = ['nuevo', 'seguimiento', 'nr', 'silencioso', 'pend_pago', 'alumna'] as const;
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
  estado_lead: string | null;
  resultado: string | null;
  curso_interes: string | null;
  etiquetas: string[];
  notas: string | null;
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
  const [cursoInteres, setCursoInteres] = useState('');
  const [nuevaEtiqueta, setNuevaEtiqueta] = useState('');
  const [mostrarAgregarEtiqueta, setMostrarAgregarEtiqueta] = useState(false);
  
  const fileInputRef = useRef<HTMLInputElement>(null);

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
        setCursoInteres(data.curso_interes || '');
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

    cargarContacto();
    cargarNotas();
  }, [conversacionActual?.contacto_id, conversacionActual?.id]);

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
      
      // Si es el nombre, también actualizar en conversación
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

  // Agregar etiqueta
  const agregarEtiqueta = async () => {
    if (!nuevaEtiqueta.trim() || !contacto) return;
    const nuevasEtiquetas = [...(contacto.etiquetas || []), nuevaEtiqueta.trim()];
    await actualizarContacto('etiquetas', nuevasEtiquetas);
    setNuevaEtiqueta('');
    setMostrarAgregarEtiqueta(false);
  };

  // Quitar etiqueta
  const quitarEtiqueta = async (etiqueta: string) => {
    if (!contacto) return;
    const nuevasEtiquetas = (contacto.etiquetas || []).filter(e => e !== etiqueta);
    await actualizarContacto('etiquetas', nuevasEtiquetas);
  };

  // Desconectar router
  const desconectar = async () => {
    if (confirm('¿Desconectar del Router? El contacto ya no pasará por el menú automático.')) {
      await supabase.from('conversaciones').update({ 
        desconectado_wsp4: true, 
        inbox_fijo: conversacionActual.area 
      }).eq('id', conversacionActual.id);
      setConversacionActual({ 
        ...conversacionActual, 
        desconectado_wsp4: true, 
        inbox_fijo: conversacionActual.area 
      });
    }
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
            </div>

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

            {/* Curso de interés */}
            <div>
              <p className="text-[10px] font-semibold text-slate-400 uppercase mb-1">Curso de Interés</p>
              {editando === 'curso' ? (
                <div className="flex items-center gap-1">
                  <input
                    type="text"
                    value={cursoInteres}
                    onChange={(e) => setCursoInteres(e.target.value)}
                    placeholder="Ej: Acompañante Terapéutico"
                    className="flex-1 px-2 py-1 text-xs bg-slate-100 dark:bg-slate-800 rounded border-0"
                    autoFocus
                  />
                  <button onClick={() => actualizarContacto('curso_interes', cursoInteres || null)} className="p-1 text-green-500"><Check size={12} /></button>
                  <button onClick={() => setEditando(null)} className="p-1 text-slate-400"><X size={12} /></button>
                </div>
              ) : (
                <div className="flex items-center gap-2 group cursor-pointer" onClick={() => setEditando('curso')}>
                  <BookOpen size={12} className="text-slate-400" />
                  <span className="text-xs text-slate-600 dark:text-slate-300 flex-1">
                    {contacto?.curso_interes || 'Sin definir'}
                  </span>
                  <Edit2 size={10} className="text-slate-400 opacity-0 group-hover:opacity-100" />
                </div>
              )}
            </div>

            <hr className="border-slate-200 dark:border-slate-700" />

            {/* Estado Conversación */}
            <div>
              <p className="text-[10px] font-semibold text-slate-400 uppercase mb-1.5">Estado Conversación</p>
              <div className="flex flex-wrap gap-1">
                {ESTADOS_CONV.map((e) => (
                  <button key={e} onClick={() => actualizarConversacion('estado', e)}
                    className={cn('px-2 py-0.5 text-[10px] font-medium rounded-full border transition-colors',
                      conversacionActual.estado === e 
                        ? 'border-indigo-500 bg-indigo-100 dark:bg-indigo-500/20 text-indigo-600' 
                        : 'border-slate-200 dark:border-slate-700 text-slate-500 hover:border-indigo-300'
                    )}>{e}</button>
                ))}
              </div>
            </div>

            {/* Estado Lead (en contacto) */}
            <div>
              <p className="text-[10px] font-semibold text-slate-400 uppercase mb-1.5">Estado del Lead</p>
              <select 
                value={contacto?.estado_lead || 'nuevo'} 
                onChange={(e) => actualizarContacto('estado_lead', e.target.value)}
                className="w-full px-2 py-1.5 text-xs bg-slate-100 dark:bg-slate-800 border-0 rounded-md text-slate-800 dark:text-white"
              >
                {ESTADOS_LEAD.map(e => (
                  <option key={e} value={e}>{e.charAt(0).toUpperCase() + e.slice(1).replace('_', ' ')}</option>
                ))}
              </select>
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

            {/* Etiquetas */}
            <div>
              <div className="flex items-center justify-between mb-1.5">
                <p className="text-[10px] font-semibold text-slate-400 uppercase">Etiquetas</p>
                <button 
                  onClick={() => setMostrarAgregarEtiqueta(!mostrarAgregarEtiqueta)}
                  className="p-0.5 hover:bg-slate-100 dark:hover:bg-slate-800 rounded"
                >
                  <Plus size={12} className="text-slate-400" />
                </button>
              </div>
              {mostrarAgregarEtiqueta && (
                <div className="flex items-center gap-1 mb-2">
                  <input
                    type="text"
                    value={nuevaEtiqueta}
                    onChange={(e) => setNuevaEtiqueta(e.target.value)}
                    placeholder="Nueva etiqueta"
                    className="flex-1 px-2 py-1 text-xs bg-slate-100 dark:bg-slate-800 rounded border-0"
                    onKeyDown={(e) => e.key === 'Enter' && agregarEtiqueta()}
                    autoFocus
                  />
                  <button onClick={agregarEtiqueta} className="p-1 text-green-500"><Check size={12} /></button>
                  <button onClick={() => setMostrarAgregarEtiqueta(false)} className="p-1 text-slate-400"><X size={12} /></button>
                </div>
              )}
              <div className="flex flex-wrap gap-1">
                {(contacto?.etiquetas || []).map((et) => (
                  <span key={et} className="px-1.5 py-0.5 bg-slate-100 dark:bg-slate-700 text-slate-600 dark:text-slate-300 text-[10px] rounded flex items-center gap-1 group">
                    {et}
                    <button onClick={() => quitarEtiqueta(et)} className="opacity-0 group-hover:opacity-100 hover:text-red-500">
                      <X size={8} />
                    </button>
                  </span>
                ))}
                {(!contacto?.etiquetas || contacto.etiquetas.length === 0) && (
                  <span className="text-[10px] text-slate-400">Sin etiquetas</span>
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

            {/* Desconectar */}
            {!conversacionActual.desconectado_wsp4 && (
              <button 
                onClick={desconectar} 
                className="w-full py-1.5 border border-red-300 text-red-500 text-[10px] font-medium rounded-md hover:bg-red-50 dark:hover:bg-red-500/10 flex items-center justify-center gap-1"
              >
                <Unlink size={12} /> Desconectar del Router
              </button>
            )}
          </>
        )}
      </div>
    </div>
  );
}
