'use client';

import { useState, useRef, useEffect, useCallback } from 'react';
import {
  Send, Sparkles, Copy, Check, Paperclip, X, FileText,
  Image as ImageIcon, Loader2, Plus, MessageSquare, ChevronLeft,
} from 'lucide-react';

// ============================================
// TIPOS
// ============================================

interface Mensaje {
  id: string;
  rol: 'user' | 'assistant';
  contenido: string;
  timestamp: Date;
  archivos?: ArchivoAdjunto[];
}

interface ArchivoAdjunto {
  nombre: string;
  tipo: string;
  base64: string;
  preview?: string;
}

interface ConversacionHistorial {
  id: string;
  titulo: string;
  resumen: string;
  created_at: string;
  updated_at: string;
}

// ============================================
// COMPONENTE PRINCIPAL
// ============================================

export default function PupyPage() {
  const [mensajes, setMensajes] = useState<Mensaje[]>([]);
  const [input, setInput] = useState('');
  const [isLoading, setIsLoading] = useState(false);
  const [copiedId, setCopiedId] = useState<string | null>(null);
  const [archivosAdjuntos, setArchivosAdjuntos] = useState<ArchivoAdjunto[]>([]);
  const fileInputRef = useRef<HTMLInputElement>(null);
  const [historial, setHistorial] = useState<ConversacionHistorial[]>([]);
  const [showHistorial, setShowHistorial] = useState(false);
  const [conversacionId, setConversacionId] = useState<string | null>(null);
  const [guardadoEnCurso, setGuardadoEnCurso] = useState(false);
  const [ultimoGuardado, setUltimoGuardado] = useState(0);
  const [inicializado, setInicializado] = useState(false);

  const mensajesRef = useRef<Mensaje[]>([]);
  const conversacionIdRef = useRef<string | null>(null);
  const messagesEndRef = useRef<HTMLDivElement>(null);
  const textareaRef = useRef<HTMLTextAreaElement>(null);

  useEffect(() => { mensajesRef.current = mensajes; }, [mensajes]);
  useEffect(() => { conversacionIdRef.current = conversacionId; }, [conversacionId]);

  // ============================================
  // GUARDAR / ACTUALIZAR CONVERSACIÓN
  // ============================================

  const guardarConversacionActual = useCallback(async (msgs?: Mensaje[]) => {
    const mensajesAGuardar = msgs || mensajesRef.current;
    if (mensajesAGuardar.length < 2 || guardadoEnCurso) return null;

    setGuardadoEnCurso(true);
    try {
      const res = await fetch('/tableros/api/pupi', {
        method: 'PUT',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          mensajes: mensajesAGuardar.map(m => ({
            rol: m.rol, contenido: m.contenido, timestamp: m.timestamp.toISOString(),
          })),
          usuario: 'nina@psi.com.ar',
          conversacion_id: conversacionIdRef.current,
        }),
      });
      const data = await res.json();
      if (data.success && data.conversacion_id) {
        setConversacionId(data.conversacion_id);
        conversacionIdRef.current = data.conversacion_id;
        setUltimoGuardado(mensajesAGuardar.length);
        console.log('[Pupy UI] Guardado OK:', data.conversacion_id);
        return data.conversacion_id;
      }
    } catch (e) {
      console.error('[Pupy UI] Error guardando:', e);
    } finally {
      setGuardadoEnCurso(false);
    }
    return null;
  }, [guardadoEnCurso]);

  // Auto-guardar cada 4 mensajes nuevos
  useEffect(() => {
    if (mensajes.length >= 2 && mensajes.length - ultimoGuardado >= 4) {
      guardarConversacionActual(mensajes);
    }
  }, [mensajes.length, ultimoGuardado, guardarConversacionActual, mensajes]);

  // Guardar al cerrar pestaña
  useEffect(() => {
    const handleBeforeUnload = () => {
      if (mensajesRef.current.length >= 2 && mensajesRef.current.length !== ultimoGuardado) {
        const payload = JSON.stringify({
          mensajes: mensajesRef.current.map(m => ({
            rol: m.rol, contenido: m.contenido, timestamp: m.timestamp.toISOString(),
          })),
          usuario: 'nina@psi.com.ar',
          accion: 'guardar',
          conversacion_id: conversacionIdRef.current,
        });
        navigator.sendBeacon('/tableros/api/pupi', payload);
      }
    };
    window.addEventListener('beforeunload', handleBeforeUnload);
    return () => window.removeEventListener('beforeunload', handleBeforeUnload);
  }, [ultimoGuardado]);

  // ============================================
  // SCROLL Y TEXTAREA
  // ============================================

  const scrollToBottom = useCallback(() => {
    messagesEndRef.current?.scrollIntoView({ behavior: 'smooth' });
  }, []);

  useEffect(() => { scrollToBottom(); }, [mensajes, scrollToBottom]);

  const ajustarTextarea = useCallback(() => {
    const el = textareaRef.current;
    if (el) { el.style.height = 'auto'; el.style.height = Math.min(el.scrollHeight, 200) + 'px'; }
  }, []);

  useEffect(() => { ajustarTextarea(); }, [input, ajustarTextarea]);

  // ============================================
  // INICIALIZACIÓN: cargar historial + última conversación
  // ============================================

  useEffect(() => {
    inicializar();
  }, []);

  const inicializar = async () => {
    try {
      // 1. Cargar historial
      const res = await fetch('/tableros/api/pupi?usuario=nina@psi.com.ar&modo=historial&limit=20');
      const data = await res.json();
      if (data.success && data.conversaciones) {
        setHistorial(data.conversaciones);

        // 2. Si hay conversaciones, cargar la más reciente
        if (data.conversaciones.length > 0) {
          const ultima = data.conversaciones[0];
          await cargarConversacionPorId(ultima.id);
        }
      }
    } catch {
      // Silencioso
    } finally {
      setInicializado(true);
    }
  };

  const cargarHistorial = async () => {
    try {
      const res = await fetch('/tableros/api/pupi?usuario=nina@psi.com.ar&modo=historial&limit=20');
      const data = await res.json();
      if (data.success && data.conversaciones) {
        setHistorial(data.conversaciones);
      }
    } catch { /* silencioso */ }
  };

  const cargarConversacionPorId = async (convId: string) => {
    try {
      const res = await fetch('/tableros/api/pupi?modo=cargar&id=' + convId);
      const data = await res.json();
      if (data.success && data.conversacion?.mensajes) {
        const msgs: Mensaje[] = data.conversacion.mensajes.map((m: any, i: number) => ({
          id: 'hist-' + i + '-' + Date.now(),
          rol: m.rol as 'user' | 'assistant',
          contenido: m.contenido,
          timestamp: new Date(m.timestamp || data.conversacion.created_at),
        }));
        setMensajes(msgs);
        setConversacionId(convId);
        conversacionIdRef.current = convId;
        setUltimoGuardado(msgs.length);
      }
    } catch { /* silencioso */ }
  };

  const cargarConversacion = async (convId: string) => {
    // Guardar actual antes de cambiar
    if (mensajes.length >= 2 && mensajes.length !== ultimoGuardado) {
      await guardarConversacionActual(mensajes);
    }
    await cargarConversacionPorId(convId);
    setShowHistorial(false);
    // Refrescar historial
    cargarHistorial();
  };

  // ============================================
  // ENVIAR MENSAJE
  // ============================================

  const enviarMensaje = async () => {
    const texto = input.trim();
    if (!texto && archivosAdjuntos.length === 0) return;
    if (isLoading) return;

    const mensajeUsuario: Mensaje = {
      id: 'user-' + Date.now(),
      rol: 'user',
      contenido: texto,
      timestamp: new Date(),
      archivos: archivosAdjuntos.length > 0 ? [...archivosAdjuntos] : undefined,
    };

    setMensajes(prev => [...prev, mensajeUsuario]);
    setInput('');
    setArchivosAdjuntos([]);
    setIsLoading(true);
    if (textareaRef.current) textareaRef.current.style.height = 'auto';

    try {
      const todosLosMensajes = [...mensajes, mensajeUsuario];
      const mensajesParaApi = todosLosMensajes.map(m => {
        const msg: any = { rol: m.rol, contenido: m.contenido };
        if (m.archivos && m.archivos.length > 0) {
          const partes: any[] = [];
          for (const archivo of m.archivos) {
            if (archivo.tipo.startsWith('image/')) {
              partes.push({ type: 'image', source: { type: 'base64', media_type: archivo.tipo, data: archivo.base64 } });
            } else if (archivo.tipo === 'application/pdf') {
              partes.push({ type: 'document', source: { type: 'base64', media_type: archivo.tipo, data: archivo.base64 } });
            }
          }
          if (m.contenido) partes.push({ type: 'text', text: m.contenido });
          msg.contenido_multimodal = partes;
        }
        return msg;
      });

      const res = await fetch('/tableros/api/pupi', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ mensajes: mensajesParaApi, usuario: 'nina@psi.com.ar' }),
      });

      const data = await res.json();

      if (data.success && data.respuesta) {
        setMensajes(prev => [...prev, {
          id: 'asst-' + Date.now(),
          rol: 'assistant',
          contenido: data.respuesta,
          timestamp: new Date(),
        }]);
      } else {
        setMensajes(prev => [...prev, {
          id: 'err-' + Date.now(),
          rol: 'assistant',
          contenido: 'Perdón, tuve un problema procesando tu mensaje. ¿Podés intentar de nuevo?',
          timestamp: new Date(),
        }]);
      }
    } catch {
      setMensajes(prev => [...prev, {
        id: 'err-' + Date.now(),
        rol: 'assistant',
        contenido: 'Error de conexión. Verificá que el servidor esté corriendo.',
        timestamp: new Date(),
      }]);
    } finally {
      setIsLoading(false);
    }
  };

  // ============================================
  // ARCHIVOS ADJUNTOS
  // ============================================

  const handleFileSelect = (e: React.ChangeEvent<HTMLInputElement>) => {
    const files = e.target.files;
    if (!files) return;
    Array.from(files).forEach(file => {
      if (file.size > 10 * 1024 * 1024) { alert('El archivo ' + file.name + ' supera los 10MB.'); return; }
      const reader = new FileReader();
      reader.onload = () => {
        const base64Full = reader.result as string;
        setArchivosAdjuntos(prev => [...prev, {
          nombre: file.name, tipo: file.type,
          base64: base64Full.split(',')[1],
          preview: file.type.startsWith('image/') ? base64Full : undefined,
        }]);
      };
      reader.readAsDataURL(file);
    });
    if (fileInputRef.current) fileInputRef.current.value = '';
  };

  const removeArchivo = (index: number) => {
    setArchivosAdjuntos(prev => prev.filter((_, i) => i !== index));
  };

  // ============================================
  // COPIAR
  // ============================================

  const copiarTexto = (texto: string, id: string) => {
    navigator.clipboard.writeText(texto).then(() => {
      setCopiedId(id);
      setTimeout(() => setCopiedId(null), 2000);
    });
  };

  // ============================================
  // NUEVA CONVERSACIÓN
  // ============================================

  const nuevaConversacion = async () => {
    if (mensajes.length >= 2 && mensajes.length !== ultimoGuardado) {
      await guardarConversacionActual(mensajes);
    }
    setMensajes([]);
    setConversacionId(null);
    conversacionIdRef.current = null;
    setUltimoGuardado(0);
    setArchivosAdjuntos([]);
    cargarHistorial();
  };

  // ============================================
  // FORMATEO MARKDOWN SIMPLE
  // ============================================

  const formatearMd = (texto: string) => {
    if (!texto) return '';
    return texto
      .replace(/&/g, '&amp;').replace(/</g, '&lt;').replace(/>/g, '&gt;')
      .replace(/\*\*(.*?)\*\*/g, '<strong>$1</strong>')
      .replace(/\*(.*?)\*/g, '<em>$1</em>')
      .replace(/`([^`]+)`/g, '<code class="bg-slate-700 px-1 py-0.5 rounded text-sm">$1</code>')
      .replace(/^### (.*$)/gm, '<h3 class="text-base font-semibold mt-3 mb-1">$1</h3>')
      .replace(/^## (.*$)/gm, '<h2 class="text-lg font-semibold mt-4 mb-1">$1</h2>')
      .replace(/^# (.*$)/gm, '<h1 class="text-xl font-bold mt-4 mb-2">$1</h1>')
      .replace(/^- (.*$)/gm, '<li class="ml-4 list-disc">$1</li>')
      .replace(/^(\d+)\. (.*$)/gm, '<li class="ml-4 list-decimal">$1. $2</li>')
      .replace(/\n/g, '<br/>');
  };

  // ============================================
  // RENDER
  // ============================================

  const mensajeVacio = mensajes.length === 0 && inicializado;

  return (
    <div className="flex h-screen bg-[#0a0a0f] text-white overflow-hidden">
      {/* SIDEBAR HISTORIAL */}
      <div className={`${showHistorial ? 'w-80' : 'w-0'} transition-all duration-300 bg-[#0f0f18] border-r border-slate-800/50 overflow-hidden flex flex-col`}>
        <div className="p-4 border-b border-slate-800/50 flex items-center justify-between">
          <h3 className="text-sm font-medium text-slate-300">Conversaciones</h3>
          <button onClick={() => setShowHistorial(false)} className="text-slate-500 hover:text-slate-300">
            <ChevronLeft className="w-4 h-4" />
          </button>
        </div>
        <div className="flex-1 overflow-y-auto p-2 space-y-1">
          {historial.map(conv => (
            <button
              key={conv.id}
              onClick={() => cargarConversacion(conv.id)}
              className={`w-full text-left p-3 rounded-lg text-sm transition-colors ${
                conversacionId === conv.id
                  ? 'bg-[#e63946]/20 text-white'
                  : 'text-slate-400 hover:bg-slate-800/50 hover:text-slate-200'
              }`}
            >
              <div className="font-medium truncate">{conv.titulo || 'Sin título'}</div>
              <div className="text-xs text-slate-500 mt-1">
                {new Date(conv.updated_at || conv.created_at).toLocaleDateString('es-AR', { day: 'numeric', month: 'short', hour: '2-digit', minute: '2-digit' })}
              </div>
            </button>
          ))}
          {historial.length === 0 && (
            <div className="text-center text-slate-600 text-sm py-8">Sin conversaciones previas</div>
          )}
        </div>
      </div>

      {/* CHAT PRINCIPAL */}
      <div className="flex-1 flex flex-col min-w-0">
        {/* Header */}
        <div className="px-6 py-3 border-b border-slate-800/50 flex items-center justify-between bg-[#0a0a0f]/80 backdrop-blur-sm">
          <div className="flex items-center gap-3">
            <button onClick={() => setShowHistorial(!showHistorial)} className="text-slate-400 hover:text-white transition-colors" title="Historial">
              <MessageSquare className="w-5 h-5" />
            </button>
            <div className="flex items-center gap-2">
              <div className="w-8 h-8 rounded-full bg-gradient-to-br from-[#e63946] to-[#c62d3a] flex items-center justify-center">
                <Sparkles className="w-4 h-4 text-white" />
              </div>
              <div>
                <h1 className="text-sm font-semibold text-white">Pupy</h1>
                <p className="text-xs text-slate-500">Asesora estratégica IA</p>
              </div>
            </div>
          </div>
          <button onClick={nuevaConversacion} className="flex items-center gap-1.5 px-3 py-1.5 text-xs rounded-lg bg-slate-800 hover:bg-slate-700 text-slate-300 transition-colors" title="Nueva conversación">
            <Plus className="w-3.5 h-3.5" />
            Nueva
          </button>
        </div>

        {/* Mensajes */}
        <div className="flex-1 overflow-y-auto px-4 py-6">
          <div className="max-w-3xl mx-auto space-y-6">
            {/* Estado vacío */}
            {mensajeVacio && (
              <div className="flex flex-col items-center justify-center h-full min-h-[400px] text-center">
                <div className="w-16 h-16 rounded-full bg-gradient-to-br from-[#e63946] to-[#c62d3a] flex items-center justify-center mb-6">
                  <Sparkles className="w-8 h-8 text-white" />
                </div>
                <h2 className="text-xl font-semibold text-white mb-2">Hola, Nina</h2>
                <p className="text-slate-400 max-w-md">
                  Soy Pupy, tu asesora estratégica. Preguntame sobre marketing, ventas, alumnos o cualquier tema del negocio.
                </p>
                <div className="mt-8 grid grid-cols-1 sm:grid-cols-2 gap-3 w-full max-w-lg">
                  {['¿Cómo están las campañas?', '¿Cuántos alumnos activos hay?', '¿Qué oportunidades de cross-sell tenemos?', '¿Hay alertas pendientes?'].map((s, i) => (
                    <button key={i} onClick={() => setInput(s)} className="p-3 text-sm text-left rounded-xl bg-slate-800/50 hover:bg-slate-800 text-slate-300 hover:text-white border border-slate-700/50 transition-all">
                      {s}
                    </button>
                  ))}
                </div>
              </div>
            )}

            {/* Cargando inicial */}
            {!inicializado && (
              <div className="flex flex-col items-center justify-center h-full min-h-[400px]">
                <Loader2 className="w-8 h-8 animate-spin text-[#e63946] mb-4" />
                <p className="text-slate-500 text-sm">Cargando conversación...</p>
              </div>
            )}

            {/* Mensajes */}
            {mensajes.map(m => (
              <div key={m.id} className={`flex ${m.rol === 'user' ? 'justify-end' : 'justify-start'}`}>
                <div className={`max-w-[85%] ${m.rol === 'user'
                  ? 'bg-[#e63946] text-white rounded-2xl rounded-br-md px-4 py-3'
                  : 'text-slate-200'
                }`}>
                  {m.archivos && m.archivos.length > 0 && (
                    <div className="mb-2 flex flex-wrap gap-2">
                      {m.archivos.map((a, i) => (
                        <div key={i} className="flex items-center gap-1.5 bg-black/20 rounded-lg px-2 py-1 text-xs">
                          {a.tipo.startsWith('image/') ? <ImageIcon className="w-3 h-3" /> : <FileText className="w-3 h-3" />}
                          <span className="truncate max-w-[150px]">{a.nombre}</span>
                        </div>
                      ))}
                    </div>
                  )}
                  <div
                    className={`text-sm leading-relaxed ${m.rol === 'assistant' ? 'prose prose-invert prose-sm max-w-none' : ''}`}
                    dangerouslySetInnerHTML={{ __html: formatearMd(m.contenido) }}
                  />
                  {m.rol === 'assistant' && (
                    <div className="mt-2 flex items-center gap-2">
                      <button onClick={() => copiarTexto(m.contenido, m.id)} className="text-slate-600 hover:text-slate-400 transition-colors" title="Copiar">
                        {copiedId === m.id ? <Check className="w-3.5 h-3.5 text-green-400" /> : <Copy className="w-3.5 h-3.5" />}
                      </button>
                    </div>
                  )}
                </div>
              </div>
            ))}

            {isLoading && (
              <div className="flex justify-start">
                <div className="flex items-center gap-2 text-slate-400 text-sm">
                  <Loader2 className="w-4 h-4 animate-spin" />
                  <span>Pupy está analizando datos...</span>
                </div>
              </div>
            )}

            <div ref={messagesEndRef} />
          </div>
        </div>

        {/* Archivos adjuntos preview */}
        {archivosAdjuntos.length > 0 && (
          <div className="px-4 py-2 border-t border-slate-800/50">
            <div className="max-w-3xl mx-auto flex flex-wrap gap-2">
              {archivosAdjuntos.map((a, i) => (
                <div key={i} className="flex items-center gap-2 bg-slate-800 rounded-lg px-3 py-1.5 text-sm">
                  {a.preview ? <img src={a.preview} alt="" className="w-6 h-6 rounded object-cover" /> : <FileText className="w-4 h-4 text-slate-400" />}
                  <span className="text-slate-300 truncate max-w-[150px]">{a.nombre}</span>
                  <button onClick={() => removeArchivo(i)} className="text-slate-500 hover:text-red-400"><X className="w-3.5 h-3.5" /></button>
                </div>
              ))}
            </div>
          </div>
        )}

        {/* Input */}
        <div className="px-4 py-4 border-t border-slate-800/50 bg-[#0a0a0f]">
          <div className="max-w-3xl mx-auto">
            <div className="flex items-end gap-2 bg-[#12121a] rounded-2xl border border-slate-800/50 focus-within:border-[#e63946]/50 transition-colors px-4 py-3">
              <input type="file" ref={fileInputRef} onChange={handleFileSelect} accept="image/*,.pdf" multiple className="hidden" />
              <button onClick={() => fileInputRef.current?.click()} className="text-slate-500 hover:text-slate-300 transition-colors mb-0.5" title="Adjuntar archivo">
                <Paperclip className="w-5 h-5" />
              </button>
              <textarea
                ref={textareaRef} value={input}
                onChange={e => setInput(e.target.value)}
                onKeyDown={e => { if (e.key === 'Enter' && !e.shiftKey) { e.preventDefault(); enviarMensaje(); } }}
                placeholder="Preguntale a Pupy..."
                rows={1}
                className="flex-1 bg-transparent text-white text-sm resize-none outline-none placeholder-slate-600 max-h-[200px]"
              />
              <button onClick={enviarMensaje} disabled={isLoading || (!input.trim() && archivosAdjuntos.length === 0)} className="text-slate-500 hover:text-[#e63946] disabled:opacity-30 disabled:hover:text-slate-500 transition-colors mb-0.5">
                <Send className="w-5 h-5" />
              </button>
            </div>
            <div className="text-center mt-2">
              <span className="text-xs text-slate-600">Pupy puede cometer errores. Verificá la información importante.</span>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}
