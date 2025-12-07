'use client';

import { useEffect, useRef, useState } from 'react';
import { useCRMStore } from '@/stores/crm-store';
import { supabase } from '@/lib/supabase';
import { type Mensaje } from '@/types/crm';
import { cn, formatMessageTime, getInitials } from '@/lib/utils';
import { Search, User, MoreVertical, Smile, Paperclip, Mic, Send, X, MessageSquare, Reply, Copy, Trash2, Pin, Star, Forward, CheckSquare, Share2, Plus } from 'lucide-react';

interface RespuestaRapida { id: string; atajo: string; titulo: string; contenido: string; }
interface MenuContextual { visible: boolean; x: number; y: number; mensaje: MensajeCompleto | null; }

interface MensajeCompleto extends Mensaje {
  reacciones?: { emoji: string; usuario_id: string; created_at: string }[];
  destacado?: boolean;
  fijado?: boolean;
  mensaje_citado_contenido?: string;
  mensaje_citado_remitente?: string;
}

const REACCIONES = ['👍', '❤️', '😂', '😮', '😢', '🙏'];

export default function ChatPanel() {
  const { conversacionActual, panelInfoAbierto, togglePanelInfo, mensajeEnRespuesta, setMensajeEnRespuesta } = useCRMStore();
  const [userId, setUserId] = useState<string | null>(null);
  useEffect(() => { supabase.auth.getUser().then(({ data }) => setUserId(data.user?.id || null)); }, []);
  const [mensajes, setMensajes] = useState<MensajeCompleto[]>([]);
  const [texto, setTexto] = useState('');
  const [enviando, setEnviando] = useState(false);
  const [respuestasRapidas, setRespuestasRapidas] = useState<RespuestaRapida[]>([]);
  const [mostrarSugerencias, setMostrarSugerencias] = useState(false);
  const [sugerenciasFiltradas, setSugerenciasFiltradas] = useState<RespuestaRapida[]>([]);
  const [indiceSugerencia, setIndiceSugerencia] = useState(0);
  const [menuContextual, setMenuContextual] = useState<MenuContextual>({ visible: false, x: 0, y: 0, mensaje: null });
  const [copiado, setCopiado] = useState(false);
  const [mensajesSeleccionados, setMensajesSeleccionados] = useState<Set<string>>(new Set());
  const [modoSeleccion, setModoSeleccion] = useState(false);
  const messagesEndRef = useRef<HTMLDivElement>(null);
  const textareaRef = useRef<HTMLTextAreaElement>(null);
  const chatContainerRef = useRef<HTMLDivElement>(null);
  

  useEffect(() => {
    const handleClick = () => setMenuContextual({ visible: false, x: 0, y: 0, mensaje: null });
    document.addEventListener('click', handleClick);
    return () => document.removeEventListener('click', handleClick);
  }, []);

  useEffect(() => {
    const cargar = async () => {
      const { data } = await supabase.from('respuestas_predefinidas').select('*').order('atajo');
      if (data) setRespuestasRapidas(data);
    };
    cargar();
  }, []);

  useEffect(() => {
    const match = texto.match(/\/(\S*)$/);
    if (match) {
      const busqueda = match[1].toLowerCase();
      const filtradas = respuestasRapidas.filter(r => r.atajo?.toLowerCase().includes(busqueda) || r.titulo?.toLowerCase().includes(busqueda) || r.contenido?.toLowerCase().includes(busqueda)).slice(0, 5);
      setSugerenciasFiltradas(filtradas);
      setMostrarSugerencias(filtradas.length > 0);
      setIndiceSugerencia(0);
    } else { setMostrarSugerencias(false); }
  }, [texto, respuestasRapidas]);

  const insertarRespuesta = (r: RespuestaRapida) => { setTexto(texto.replace(/\/\S*$/, r.contenido)); setMostrarSugerencias(false); textareaRef.current?.focus(); };

  useEffect(() => {
    if (!conversacionActual?.id) { setMensajes([]); return; }
    let ultimoMensajeCargado = '';
    const cargarMensajes = async () => {
      const { data } = await supabase.from('vw_mensajes_completos').select('*').eq('conversacion_id', conversacionActual.id).eq('eliminado', false).order('timestamp', { ascending: true });
      if (data) setMensajes(data);
    };
    const marcarLeido = async () => {
      await supabase.from('conversaciones').update({ mensajes_no_leidos: 0 }).eq('id', conversacionActual.id);
    };
    cargarMensajes();
    marcarLeido();
    const channel = supabase.channel(`chat-${conversacionActual.id}`)
      .on('postgres_changes', { event: 'UPDATE', schema: 'public', table: 'conversaciones', filter: `id=eq.${conversacionActual.id}` }, (payload: any) => {
        const nuevoMsg = payload.new?.ultimo_mensaje;
        if (nuevoMsg && nuevoMsg !== ultimoMensajeCargado) {
          ultimoMensajeCargado = nuevoMsg;
          console.log('Nuevo mensaje detectado');
          cargarMensajes();
        }
      })
      .subscribe((status) => { console.log('ChatPanel subscribe:', status); });
    return () => { supabase.removeChannel(channel); };
  }, [conversacionActual?.id]);
  useEffect(() => { messagesEndRef.current?.scrollIntoView({ behavior: 'smooth' }); }, [mensajes]);

  const handleContextMenu = (e: React.MouseEvent, msg: MensajeCompleto) => {
    e.preventDefault();
    const rect = chatContainerRef.current?.getBoundingClientRect();
    if (rect) {
      let x = e.clientX - rect.left;
      let y = e.clientY - rect.top;
      if (x + 200 > rect.width) x = rect.width - 210;
      if (y + 350 > rect.height) y = rect.height - 360;
      setMenuContextual({ visible: true, x, y, mensaje: msg });
    }
  };

  const reaccionar = async (emoji: string) => {
    if (!menuContextual.mensaje || !userId) return;
    const msgId = menuContextual.mensaje.id;
    const { data: existing } = await supabase.from('mensaje_reacciones').select('id, emoji').eq('mensaje_id', msgId).eq('usuario_id', userId).single();
    if (existing) {
      if (existing.emoji === emoji) await supabase.from('mensaje_reacciones').delete().eq('id', existing.id);
      else await supabase.from('mensaje_reacciones').update({ emoji }).eq('id', existing.id);
    } else {
      await supabase.from('mensaje_reacciones').insert({ mensaje_id: msgId, usuario_id: userId, emoji });
    }
    const { data } = await supabase.from('vw_mensajes_completos').select('*').eq('conversacion_id', conversacionActual?.id).eq('eliminado', false).order('timestamp', { ascending: true });
    if (data) setMensajes(data);
    setMenuContextual({ visible: false, x: 0, y: 0, mensaje: null });
  };

  const responderMensaje = () => { if (menuContextual.mensaje) { setMensajeEnRespuesta(menuContextual.mensaje); textareaRef.current?.focus(); } setMenuContextual({ visible: false, x: 0, y: 0, mensaje: null }); };
  const copiarMensaje = async () => { if (menuContextual.mensaje?.mensaje) { await navigator.clipboard.writeText(menuContextual.mensaje.mensaje); setCopiado(true); setTimeout(() => setCopiado(false), 2000); } setMenuContextual({ visible: false, x: 0, y: 0, mensaje: null }); };
  const reenviarMensaje = () => { alert('Función de reenvío próximamente'); setMenuContextual({ visible: false, x: 0, y: 0, mensaje: null }); };

  const destacarMensaje = async () => { 
    if (!menuContextual.mensaje || !userId) return;
    const msgId = menuContextual.mensaje.id;
    if (menuContextual.mensaje.destacado) await supabase.from('mensajes_destacados').delete().eq('mensaje_id', msgId).eq('usuario_id', userId);
    else await supabase.from('mensajes_destacados').insert({ mensaje_id: msgId, usuario_id: userId });
    const { data } = await supabase.from('vw_mensajes_completos').select('*').eq('conversacion_id', conversacionActual?.id).eq('eliminado', false).order('timestamp', { ascending: true });
    if (data) setMensajes(data);
    setMenuContextual({ visible: false, x: 0, y: 0, mensaje: null }); 
  };

  const fijarMensaje = async () => { 
    if (!menuContextual.mensaje || !userId || !conversacionActual?.id) return;
    const msgId = menuContextual.mensaje.id;
    if (menuContextual.mensaje.fijado) await supabase.from('mensajes_fijados').delete().eq('mensaje_id', msgId).eq('conversacion_id', conversacionActual.id);
    else await supabase.from('mensajes_fijados').insert({ mensaje_id: msgId, conversacion_id: conversacionActual.id, usuario_id: userId });
    const { data } = await supabase.from('vw_mensajes_completos').select('*').eq('conversacion_id', conversacionActual?.id).eq('eliminado', false).order('timestamp', { ascending: true });
    if (data) setMensajes(data);
    setMenuContextual({ visible: false, x: 0, y: 0, mensaje: null }); 
  };

  const eliminarMensaje = async () => { 
    if (!menuContextual.mensaje || !userId) return;
    if (!confirm('¿Eliminar este mensaje?')) { setMenuContextual({ visible: false, x: 0, y: 0, mensaje: null }); return; }
    await supabase.from('mensajes').update({ eliminado: true, eliminado_ts: new Date().toISOString(), eliminado_por: userId }).eq('id', menuContextual.mensaje.id);
    setMensajes((prev) => prev.filter((m) => m.id !== menuContextual.mensaje!.id)); 
    setMenuContextual({ visible: false, x: 0, y: 0, mensaje: null }); 
  };

  const seleccionarMensaje = () => { if (menuContextual.mensaje) { setModoSeleccion(true); setMensajesSeleccionados(new Set([menuContextual.mensaje.id])); } setMenuContextual({ visible: false, x: 0, y: 0, mensaje: null }); };
  const toggleSeleccion = (id: string) => { const nuevo = new Set(mensajesSeleccionados); if (nuevo.has(id)) nuevo.delete(id); else nuevo.add(id); setMensajesSeleccionados(nuevo); if (nuevo.size === 0) setModoSeleccion(false); };

  const eliminarSeleccionados = async () => {
    if (!userId || mensajesSeleccionados.size === 0) return;
    if (!confirm(`¿Eliminar ${mensajesSeleccionados.size} mensajes?`)) return;
    for (const id of mensajesSeleccionados) { await supabase.from('mensajes').update({ eliminado: true, eliminado_ts: new Date().toISOString(), eliminado_por: userId }).eq('id', id); }
    setMensajes(prev => prev.filter(m => !mensajesSeleccionados.has(m.id)));
    setModoSeleccion(false); setMensajesSeleccionados(new Set());
  };

  const compartirMensaje = async () => { if (menuContextual.mensaje?.mensaje && navigator.share) { try { await navigator.share({ text: menuContextual.mensaje.mensaje }); } catch {} } setMenuContextual({ visible: false, x: 0, y: 0, mensaje: null }); };

  const enviarMensaje = async () => {
    if (!texto.trim() || !conversacionActual || enviando) return;
    setEnviando(true);
    try {
      const respuestaId = mensajeEnRespuesta?.id;
      const response = await fetch('/api/mensajes/enviar', { method: 'POST', headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ telefono: conversacionActual.telefono, mensaje: texto.trim(), conversacion_id: conversacionActual.id, linea_origen: conversacionActual.linea_origen, inbox_fijo: conversacionActual.inbox_fijo, desconectado_wsp4: conversacionActual.desconectado_wsp4, respuesta_a: respuestaId }),
      });
      if (respuestaId && response.ok) { const result = await response.json(); if (result.mensaje_id) { await supabase.from('mensajes_respuestas').insert({ mensaje_id: respuestaId, mensaje_respuesta_id: result.mensaje_id }); } }
      setTexto(''); setMensajeEnRespuesta(null);
    } catch (e) { console.error(e); }
    setEnviando(false);
  };

  const handleKeyDown = (e: React.KeyboardEvent) => {
    if (mostrarSugerencias) {
      if (e.key === 'ArrowDown') { e.preventDefault(); setIndiceSugerencia((p) => (p + 1) % sugerenciasFiltradas.length); }
      else if (e.key === 'ArrowUp') { e.preventDefault(); setIndiceSugerencia((p) => (p - 1 + sugerenciasFiltradas.length) % sugerenciasFiltradas.length); }
      else if (e.key === 'Enter' || e.key === 'Tab') { e.preventDefault(); insertarRespuesta(sugerenciasFiltradas[indiceSugerencia]); }
      else if (e.key === 'Escape') setMostrarSugerencias(false);
    } else if (e.key === 'Enter' && !e.shiftKey) { e.preventDefault(); enviarMensaje(); }
  };

  const getTicks = (msg: MensajeCompleto) => {
    if (msg.direccion === 'entrante') return null;
    const estado = msg.leido ? 'leido' : msg.entregado ? 'entregado' : msg.enviado ? 'enviado' : 'pendiente';
    return estado === 'enviado' ? <span className="text-indigo-200">✓</span> : estado === 'entregado' ? <span className="text-indigo-200">✓✓</span> : estado === 'leido' ? <span className="text-white">✓✓</span> : <span className="text-indigo-200">○</span>;
  };

  const renderReacciones = (msg: MensajeCompleto) => {
    if (!msg.reacciones || msg.reacciones.length === 0) return null;
    const grouped: Record<string, number> = {};
    msg.reacciones.forEach(r => { grouped[r.emoji] = (grouped[r.emoji] || 0) + 1; });
    const isOut = msg.direccion === 'saliente' || msg.direccion === 'outbound';
    return (
      <div className={cn('absolute -bottom-3 flex gap-0.5', isOut ? 'left-1' : 'right-1')}>
        {Object.entries(grouped).map(([emoji, count]) => (
          <span key={emoji} className="bg-white dark:bg-slate-700 rounded-full px-1.5 py-0.5 shadow-sm text-xs flex items-center gap-0.5 border border-slate-100 dark:border-slate-600">
            {emoji}{count > 1 && <span className="text-[10px] text-slate-500">{count}</span>}
          </span>
        ))}
      </div>
    );
  };

  if (!conversacionActual) {
    return (
      <div className="flex-1 flex items-center justify-center bg-slate-50 dark:bg-slate-950 h-full">
        <div className="text-center">
          <div className="w-12 h-12 rounded-full bg-slate-200 dark:bg-slate-800 flex items-center justify-center mx-auto mb-3"><Send size={18} className="text-slate-400" /></div>
          <p className="text-slate-500 text-sm">Selecciona una conversación</p>
        </div>
      </div>
    );
  }

  return (
    <div className="flex-1 flex flex-col bg-slate-100 dark:bg-slate-950 h-full min-w-0 overflow-hidden">
      <div className="h-11 px-3 flex items-center justify-between bg-white dark:bg-slate-900 border-b border-slate-200 dark:border-slate-800 flex-shrink-0">
        {modoSeleccion ? (
          <div className="flex items-center gap-3 w-full">
            <button onClick={() => { setModoSeleccion(false); setMensajesSeleccionados(new Set()); }} className="p-1.5 hover:bg-slate-100 dark:hover:bg-slate-800 rounded-md"><X size={18} className="text-slate-500" /></button>
            <span className="text-sm text-slate-700 dark:text-slate-300">{mensajesSeleccionados.size} seleccionados</span>
            <div className="ml-auto flex items-center gap-1">
              <button className="p-1.5 hover:bg-slate-100 dark:hover:bg-slate-800 rounded-md text-slate-500"><Forward size={18} /></button>
              <button className="p-1.5 hover:bg-slate-100 dark:hover:bg-slate-800 rounded-md text-slate-500"><Star size={18} /></button>
              <button onClick={eliminarSeleccionados} className="p-1.5 hover:bg-red-50 dark:hover:bg-red-500/10 rounded-md text-red-500"><Trash2 size={18} /></button>
            </div>
          </div>
        ) : (
          <>
            <div className="flex items-center gap-2">
              <div className="w-8 h-8 rounded-full bg-gradient-to-br from-indigo-400 to-purple-400 flex items-center justify-center text-white text-[10px] font-medium">{getInitials(conversacionActual.nombre || conversacionActual.telefono)}</div>
              <div>
                <p className="font-medium text-[13px] text-slate-800 dark:text-white leading-tight">{conversacionActual.nombre || conversacionActual.telefono}</p>
                <p className="text-[11px] text-slate-500 leading-tight">{conversacionActual.telefono}</p>
              </div>
            </div>
            <div className="flex items-center gap-0.5">
              <button className="p-1.5 rounded-md hover:bg-slate-100 dark:hover:bg-slate-800 text-slate-500"><Search size={16} /></button>
              <button onClick={togglePanelInfo} className={cn('p-1.5 rounded-md transition-colors', panelInfoAbierto ? 'bg-indigo-100 dark:bg-indigo-500/20 text-indigo-600' : 'hover:bg-slate-100 dark:hover:bg-slate-800 text-slate-500')}><User size={16} /></button>
              <button className="p-1.5 rounded-md hover:bg-slate-100 dark:hover:bg-slate-800 text-slate-500"><MoreVertical size={16} /></button>
            </div>
          </>
        )}
      </div>

      <div ref={chatContainerRef} className="flex-1 overflow-y-auto px-4 py-2 relative min-h-0">
        {mensajes.map((msg) => {
          const isOut = msg.direccion === 'saliente' || msg.direccion === 'outbound';
          const isSelected = mensajesSeleccionados.has(msg.id);
          const hasReacciones = msg.reacciones && msg.reacciones.length > 0;
          return (
            <div key={msg.id} className={cn('flex group', isOut ? 'justify-end' : 'justify-start', isSelected && 'bg-indigo-50 dark:bg-indigo-500/10 -mx-4 px-4', hasReacciones ? 'mb-4' : 'mb-1')} onContextMenu={(e) => !modoSeleccion && handleContextMenu(e, msg)} onClick={() => modoSeleccion && toggleSeleccion(msg.id)}>
              {modoSeleccion && (
                <div className={cn('flex items-center mr-2', isOut && 'order-2 ml-2 mr-0')}>
                  <div className={cn('w-5 h-5 rounded-full border-2 flex items-center justify-center transition-colors', isSelected ? 'bg-indigo-500 border-indigo-500' : 'border-slate-300 dark:border-slate-600')}>{isSelected && <span className="text-white text-xs">✓</span>}</div>
                </div>
              )}
              <div className="relative max-w-[65%]">
                {msg.mensaje_citado_contenido && (
                  <div className={cn('text-[11px] px-2 py-1 rounded-t-lg border-l-2 border-indigo-400 mb-0.5', isOut ? 'bg-indigo-400/30 text-indigo-100' : 'bg-slate-200 dark:bg-slate-700 text-slate-600 dark:text-slate-300')}>
                    <p className="font-medium text-[10px]">{msg.mensaje_citado_remitente || 'Mensaje'}</p>
                    <p className="truncate">{msg.mensaje_citado_contenido}</p>
                  </div>
                )}
                <div className={cn('rounded-lg px-2 py-1 shadow-sm cursor-pointer text-[13px] leading-[18px] relative', isOut ? 'bg-indigo-500 text-white rounded-tr-sm' : 'bg-white dark:bg-slate-800 text-slate-800 dark:text-white rounded-tl-sm', msg.mensaje_citado_contenido && 'rounded-t-none')}>
                  <div className="absolute -top-1 -right-1 flex gap-0.5">
                    {msg.fijado && <span className="bg-amber-400 text-amber-900 rounded-full p-0.5"><Pin size={10} /></span>}
                    {msg.destacado && <span className="bg-yellow-400 text-yellow-900 rounded-full p-0.5"><Star size={10} /></span>}
                  </div>
                  <p className="whitespace-pre-wrap break-words">{msg.mensaje}</p>
                  <div className={cn('flex items-center justify-end gap-1 -mb-0.5', isOut ? 'text-indigo-200' : 'text-slate-400')}>
                    <span className="text-[10px]">{formatMessageTime(msg.timestamp || msg.created_at || new Date().toISOString())}</span>
                    {getTicks(msg)}
                  </div>
                </div>
                {renderReacciones(msg)}
              </div>
            </div>
          );
        })}
        <div ref={messagesEndRef} />
        {menuContextual.visible && (
          <div className="absolute bg-white dark:bg-slate-800 rounded-xl shadow-xl border border-slate-200 dark:border-slate-700 overflow-hidden z-50 w-48" style={{ left: menuContextual.x, top: menuContextual.y }} onClick={(e) => e.stopPropagation()}>
            <div className="flex items-center justify-between px-2 py-2 border-b border-slate-100 dark:border-slate-700">
              {REACCIONES.map((emoji) => (<button key={emoji} onClick={() => reaccionar(emoji)} className="w-8 h-8 flex items-center justify-center hover:bg-slate-100 dark:hover:bg-slate-700 rounded-full text-lg transition-transform hover:scale-125">{emoji}</button>))}
              <button className="w-8 h-8 flex items-center justify-center hover:bg-slate-100 dark:hover:bg-slate-700 rounded-full"><Plus size={16} className="text-slate-400" /></button>
            </div>
            <div className="py-1">
              <button onClick={responderMensaje} className="w-full px-3 py-2 text-left hover:bg-slate-50 dark:hover:bg-slate-700 flex items-center gap-3 text-[13px] text-slate-700 dark:text-slate-200"><Reply size={16} className="text-slate-400" /> Responder</button>
              <button onClick={copiarMensaje} className="w-full px-3 py-2 text-left hover:bg-slate-50 dark:hover:bg-slate-700 flex items-center gap-3 text-[13px] text-slate-700 dark:text-slate-200"><Copy size={16} className="text-slate-400" /> {copiado ? '¡Copiado!' : 'Copiar'}</button>
              <button onClick={reenviarMensaje} className="w-full px-3 py-2 text-left hover:bg-slate-50 dark:hover:bg-slate-700 flex items-center gap-3 text-[13px] text-slate-700 dark:text-slate-200"><Forward size={16} className="text-slate-400" /> Reenviar</button>
              <button onClick={destacarMensaje} className="w-full px-3 py-2 text-left hover:bg-slate-50 dark:hover:bg-slate-700 flex items-center gap-3 text-[13px] text-slate-700 dark:text-slate-200"><Star size={16} className={menuContextual.mensaje?.destacado ? 'text-yellow-500 fill-yellow-500' : 'text-slate-400'} /> {menuContextual.mensaje?.destacado ? 'Quitar destacado' : 'Destacar'}</button>
              <button onClick={fijarMensaje} className="w-full px-3 py-2 text-left hover:bg-slate-50 dark:hover:bg-slate-700 flex items-center gap-3 text-[13px] text-slate-700 dark:text-slate-200"><Pin size={16} className={menuContextual.mensaje?.fijado ? 'text-amber-500 fill-amber-500' : 'text-slate-400'} /> {menuContextual.mensaje?.fijado ? 'Desfijar' : 'Fijar'}</button>
              <button onClick={eliminarMensaje} className="w-full px-3 py-2 text-left hover:bg-slate-50 dark:hover:bg-slate-700 flex items-center gap-3 text-[13px] text-slate-700 dark:text-slate-200"><Trash2 size={16} className="text-slate-400" /> Eliminar para mí</button>
              <button onClick={seleccionarMensaje} className="w-full px-3 py-2 text-left hover:bg-slate-50 dark:hover:bg-slate-700 flex items-center gap-3 text-[13px] text-slate-700 dark:text-slate-200"><CheckSquare size={16} className="text-slate-400" /> Seleccionar</button>
              <button onClick={compartirMensaje} className="w-full px-3 py-2 text-left hover:bg-slate-50 dark:hover:bg-slate-700 flex items-center gap-3 text-[13px] text-slate-700 dark:text-slate-200"><Share2 size={16} className="text-slate-400" /> Compartir</button>
            </div>
          </div>
        )}
      </div>

      {mensajeEnRespuesta && (
        <div className="px-3 py-1 bg-slate-50 dark:bg-slate-800 border-t border-slate-200 dark:border-slate-700 flex items-center gap-2 flex-shrink-0">
          <div className="w-0.5 h-7 bg-indigo-500 rounded-full" />
          <div className="flex-1 min-w-0">
            <p className="text-[10px] text-indigo-600 dark:text-indigo-400 font-medium">Respondiendo a</p>
            <p className="text-[11px] text-slate-600 dark:text-slate-300 truncate">{mensajeEnRespuesta.mensaje}</p>
          </div>
          <button onClick={() => setMensajeEnRespuesta(null)} className="p-0.5 hover:bg-slate-200 dark:hover:bg-slate-700 rounded"><X size={12} className="text-slate-400" /></button>
        </div>
      )}

      <div className="px-3 py-2 bg-white dark:bg-slate-900 border-t border-slate-200 dark:border-slate-800 flex items-center gap-1.5 flex-shrink-0 relative">
        {mostrarSugerencias && (
          <div className="absolute bottom-full left-3 right-3 mb-1 bg-white dark:bg-slate-800 rounded-lg shadow-lg border border-slate-200 dark:border-slate-700 overflow-hidden z-10">
            <div className="p-1.5 border-b border-slate-100 dark:border-slate-700 flex items-center gap-1.5"><MessageSquare size={10} className="text-indigo-500" /><span className="text-[10px] font-medium text-slate-500">Respuestas rápidas</span></div>
            {sugerenciasFiltradas.map((r, idx) => (
              <button key={r.id} onClick={() => insertarRespuesta(r)} className={cn('w-full px-2 py-1 text-left hover:bg-slate-50 dark:hover:bg-slate-700', idx === indiceSugerencia && 'bg-indigo-50 dark:bg-indigo-500/20')}>
                <div className="flex items-center gap-1.5"><code className="px-1 py-0.5 bg-indigo-100 dark:bg-indigo-500/20 text-indigo-600 dark:text-indigo-400 text-[9px] rounded font-mono">{r.atajo}</code>{r.titulo && <span className="text-[10px] font-medium text-slate-700 dark:text-slate-200">{r.titulo}</span>}</div>
                <p className="text-[9px] text-slate-500 mt-0.5 truncate">{r.contenido}</p>
              </button>
            ))}
          </div>
        )}
        <button className="p-1.5 rounded-full hover:bg-slate-100 dark:hover:bg-slate-800 text-slate-500"><Smile size={18} /></button>
        <button className="p-1.5 rounded-full hover:bg-slate-100 dark:hover:bg-slate-800 text-slate-500"><Paperclip size={18} /></button>
        <div className="flex-1">
          <textarea ref={textareaRef} value={texto} onChange={(e) => setTexto(e.target.value)} onKeyDown={handleKeyDown} placeholder="Escribe un mensaje" rows={1} className="w-full px-3 py-1.5 bg-slate-100 dark:bg-slate-800 border-0 rounded-lg resize-none text-[13px] text-slate-800 dark:text-white placeholder-slate-400 focus:ring-0 focus:outline-none" style={{ minHeight: '34px', maxHeight: '80px' }} />
        </div>
        <button onClick={texto.trim() ? enviarMensaje : undefined} disabled={enviando} className={cn('p-1.5 rounded-full transition-colors', texto.trim() ? 'bg-indigo-500 text-white hover:bg-indigo-600' : 'hover:bg-slate-100 dark:hover:bg-slate-800 text-slate-500')}>{texto.trim() ? <Send size={18} /> : <Mic size={18} />}</button>
      </div>
    </div>
  );
}
