'use client';

import { useState, useRef, useEffect, useCallback } from 'react';
import {
  Send,
  Sparkles,
  Copy,
  Check,
  Paperclip,
  X,
  FileText,
  Image as ImageIcon,
  Loader2,
  Plus,
  MessageSquare,
  ChevronLeft,
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
}

// ============================================
// COMPONENTE PRINCIPAL
// ============================================

export default function PupyPage() {
  // Estado del chat
  const [mensajes, setMensajes] = useState<Mensaje[]>([]);
  const [input, setInput] = useState('');
  const [isLoading, setIsLoading] = useState(false);
  const [copiedId, setCopiedId] = useState<string | null>(null);

  // Estado de archivos adjuntos
  const [archivosAdjuntos, setArchivosAdjuntos] = useState<ArchivoAdjunto[]>([]);
  const fileInputRef = useRef<HTMLInputElement>(null);

  // Estado del sidebar de historial
  const [historial, setHistorial] = useState<ConversacionHistorial[]>([]);
  const [showHistorial, setShowHistorial] = useState(false);

  // Morning briefing
  const [briefingCargado, setBriefingCargado] = useState(false);

  // Auto-guardado
  const [ultimoGuardado, setUltimoGuardado] = useState(0);
  const mensajesRef = useRef<Mensaje[]>([]);

  // Refs
  const messagesEndRef = useRef<HTMLDivElement>(null);
  const textareaRef = useRef<HTMLTextAreaElement>(null);

  // Mantener ref sincronizado para beforeunload
  useEffect(() => {
    mensajesRef.current = mensajes;
  }, [mensajes]);

  // ============================================
  // AUTO-GUARDADO
  // ============================================

  const guardarConversacionActual = useCallback(async (msgs?: Mensaje[]) => {
    const mensajesAGuardar = msgs || mensajesRef.current;
    if (mensajesAGuardar.length < 2) return;

    try {
      await fetch('/tableros/api/pupi', {
        method: 'PUT',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          mensajes: mensajesAGuardar.map(m => ({
            rol: m.rol,
            contenido: m.contenido,
            timestamp: m.timestamp.toISOString(),
          })),
          usuario: 'nina@psi.com.ar',
          accion: 'guardar',
        }),
      });
      setUltimoGuardado(mensajesAGuardar.length);
    } catch {
      // Silencioso
    }
  }, []);

  // Auto-guardar cada 4 mensajes nuevos
  useEffect(() => {
    if (mensajes.length >= 2 && mensajes.length - ultimoGuardado >= 4) {
      guardarConversacionActual(mensajes);
    }
  }, [mensajes.length, ultimoGuardado, guardarConversacionActual, mensajes]);

  // Guardar al cerrar pestaña / navegar fuera
  useEffect(() => {
    const handleBeforeUnload = () => {
      if (mensajesRef.current.length >= 2 && mensajesRef.current.length !== ultimoGuardado) {
        const payload = JSON.stringify({
          mensajes: mensajesRef.current.map(m => ({
            rol: m.rol,
            contenido: m.contenido,
            timestamp: m.timestamp.toISOString(),
          })),
          usuario: 'nina@psi.com.ar',
          accion: 'guardar',
        });
        // sendBeacon es fire-and-forget, funciona al cerrar pestaña
        navigator.sendBeacon('/tableros/api/pupi', payload);
      }
    };

    window.addEventListener('beforeunload', handleBeforeUnload);
    return () => window.removeEventListener('beforeunload', handleBeforeUnload);
  }, [ultimoGuardado]);

  // ============================================
  // SCROLL Y TEXTAREA AUTO-RESIZE
  // ============================================

  const scrollToBottom = useCallback(() => {
    messagesEndRef.current?.scrollIntoView({ behavior: 'smooth' });
  }, []);

  useEffect(() => {
    scrollToBottom();
  }, [mensajes, scrollToBottom]);

  const ajustarTextarea = useCallback(() => {
    const el = textareaRef.current;
    if (el) {
      el.style.height = 'auto';
      el.style.height = Math.min(el.scrollHeight, 200) + 'px';
    }
  }, []);

  useEffect(() => {
    ajustarTextarea();
  }, [input, ajustarTextarea]);

  // ============================================
  // MORNING BRIEFING AL ABRIR
  // ============================================

  useEffect(() => {
    if (!briefingCargado) {
      cargarBriefing();
      cargarHistorial();
    }
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  const cargarBriefing = async () => {
    setBriefingCargado(true);
    setIsLoading(true);

    try {
      const res = await fetch('/tableros/api/pupi?usuario=nina@psi.com.ar');
      const data = await res.json();

      if (data.success && data.briefing) {
        setMensajes([{
          id: 'briefing-' + Date.now(),
          rol: 'assistant',
          contenido: data.briefing,
          timestamp: new Date(),
        }]);
      } else {
        setMensajes([{
          id: 'welcome-' + Date.now(),
          rol: 'assistant',
          contenido: '¡Hola! Soy **Pupy**, tu asesora estratégica. ¿En qué puedo ayudarte hoy?',
          timestamp: new Date(),
        }]);
      }
    } catch {
      setMensajes([{
        id: 'welcome-' + Date.now(),
        rol: 'assistant',
        contenido: '¡Hola! Soy **Pupy**, tu asesora estratégica. ¿En qué puedo ayudarte hoy?',
        timestamp: new Date(),
      }]);
    } finally {
      setIsLoading(false);
    }
  };

  // ============================================
  // HISTORIAL DE CONVERSACIONES
  // ============================================

  const cargarHistorial = async () => {
    try {
      const res = await fetch('/tableros/api/pupi?usuario=nina@psi.com.ar&modo=historial&limit=20');
      const data = await res.json();
      if (data.success && data.conversaciones) {
        setHistorial(data.conversaciones);
      }
    } catch {
      // Silencioso
    }
  };

  const cargarConversacion = async (convId: string) => {
    // Guardar conversación actual antes de cambiar
    if (mensajes.length >= 2 && mensajes.length !== ultimoGuardado) {
      await guardarConversacionActual(mensajes);
    }

    try {
      setIsLoading(true);
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
        setUltimoGuardado(msgs.length); // Ya está guardada, no re-guardar
        setBriefingCargado(true);
        setShowHistorial(false);
      }
    } catch {
      // Silencioso
    } finally {
      setIsLoading(false);
    }
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

    if (textareaRef.current) {
      textareaRef.current.style.height = 'auto';
    }

    try {
      const mensajesParaApi = [...mensajes, mensajeUsuario]
        .filter(m => m.id !== mensajes[0]?.id || mensajes[0]?.rol !== 'assistant')
        .map(m => {
          const msg: any = { rol: m.rol, contenido: m.contenido };

          if (m.archivos && m.archivos.length > 0) {
            const partes: any[] = [];
            for (const archivo of m.archivos) {
              if (archivo.tipo.startsWith('image/')) {
                partes.push({
                  type: 'image',
                  source: { type: 'base64', media_type: archivo.tipo, data: archivo.base64 }
                });
              } else if (archivo.tipo === 'application/pdf') {
                partes.push({
                  type: 'document',
                  source: { type: 'base64', media_type: archivo.tipo, data: archivo.base64 }
                });
              }
            }
            if (m.contenido) {
              partes.push({ type: 'text', text: m.contenido });
            }
            msg.contenido_multimodal = partes;
          }
          return msg;
        });

      const res = await fetch('/tableros/api/pupi', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          mensajes: mensajesParaApi,
          usuario: 'nina@psi.com.ar',
        }),
      });

      const data = await res.json();

      if (data.success && data.respuesta) {
        setMensajes(prev => [...prev, {
          id: 'assistant-' + Date.now(),
          rol: 'assistant',
          contenido: data.respuesta,
          timestamp: new Date(),
        }]);
      } else {
        setMensajes(prev => [...prev, {
          id: 'error-' + Date.now(),
          rol: 'assistant',
          contenido: 'Perdón, tuve un problema procesando tu consulta. ¿Podés intentar de nuevo?',
          timestamp: new Date(),
        }]);
      }
    } catch {
      setMensajes(prev => [...prev, {
        id: 'error-' + Date.now(),
        rol: 'assistant',
        contenido: 'Hubo un error de conexión. Verificá que el servidor esté funcionando.',
        timestamp: new Date(),
      }]);
    } finally {
      setIsLoading(false);
    }
  };

  // ============================================
  // MANEJO DE ARCHIVOS
  // ============================================

  const handleFileSelect = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const files = e.target.files;
    if (!files) return;

    for (const file of Array.from(files)) {
      const tiposPermitidos = ['image/jpeg', 'image/png', 'image/gif', 'image/webp', 'application/pdf'];
      if (!tiposPermitidos.includes(file.type)) {
        alert(`Tipo no soportado: ${file.type}. Pupy acepta imágenes (JPG, PNG, GIF, WEBP) y PDFs.`);
        continue;
      }
      if (file.size > 20 * 1024 * 1024) {
        alert(`${file.name} es demasiado grande. Máximo 20MB.`);
        continue;
      }

      const base64 = await fileToBase64(file);
      const preview = file.type.startsWith('image/') ? URL.createObjectURL(file) : undefined;

      setArchivosAdjuntos(prev => [...prev, { nombre: file.name, tipo: file.type, base64, preview }]);
    }

    if (fileInputRef.current) fileInputRef.current.value = '';
  };

  const fileToBase64 = (file: File): Promise<string> => {
    return new Promise((resolve, reject) => {
      const reader = new FileReader();
      reader.onload = () => {
        const result = reader.result as string;
        resolve(result.split(',')[1]);
      };
      reader.onerror = reject;
      reader.readAsDataURL(file);
    });
  };

  const removerArchivo = (index: number) => {
    setArchivosAdjuntos(prev => {
      const nuevo = [...prev];
      if (nuevo[index]?.preview) URL.revokeObjectURL(nuevo[index].preview!);
      nuevo.splice(index, 1);
      return nuevo;
    });
  };

  // ============================================
  // NUEVA CONVERSACIÓN
  // ============================================

  const nuevaConversacion = async () => {
    // Guardar conversación actual
    if (mensajes.length >= 2 && mensajes.length !== ultimoGuardado) {
      await guardarConversacionActual(mensajes);
    }

    // Reset
    setMensajes([]);
    setBriefingCargado(false);
    setArchivosAdjuntos([]);
    setInput('');
    setUltimoGuardado(0);

    // Refrescar historial y cargar nuevo briefing
    cargarHistorial();
    cargarBriefing();
  };

  // ============================================
  // COPIAR MENSAJE
  // ============================================

  const copiarMensaje = (id: string, contenido: string) => {
    navigator.clipboard.writeText(contenido);
    setCopiedId(id);
    setTimeout(() => setCopiedId(null), 2000);
  };

  // ============================================
  // HANDLE SUBMIT
  // ============================================

  const handleKeyDown = (e: React.KeyboardEvent) => {
    if (e.key === 'Enter' && !e.shiftKey) {
      e.preventDefault();
      enviarMensaje();
    }
  };

  // ============================================
  // RENDER MARKDOWN BÁSICO
  // ============================================

  const renderMarkdown = (text: string): string => {
    return text
      .split('\n')
      .map(line => {
        if (line.startsWith('### ')) return `<h4 class="text-sm font-semibold text-gray-900 mt-3 mb-1">${line.slice(4)}</h4>`;
        if (line.startsWith('## ')) return `<h3 class="text-sm font-semibold text-gray-900 mt-4 mb-1">${line.slice(3)}</h3>`;
        if (line.startsWith('- ')) return `<div class="flex gap-2 ml-1 my-0.5"><span class="text-gray-400 mt-px">•</span><span>${line.slice(2)}</span></div>`;
        if (line.trim() === '') return '<div class="h-2"></div>';
        return `<p class="my-1">${line}</p>`;
      })
      .join('')
      .replace(/\*\*(.*?)\*\*/g, '<strong>$1</strong>')
      .replace(/\*(.*?)\*/g, '<em>$1</em>')
      .replace(/⚠️/g, '<span class="text-amber-500">⚠️</span>');
  };

  // ============================================
  // RENDER
  // ============================================

  return (
    <div className="flex h-screen bg-white">
      {/* Sidebar de historial */}
      {showHistorial && (
        <div className="w-64 border-r border-gray-200 bg-gray-50 flex flex-col">
          <div className="p-3 border-b border-gray-200 flex items-center justify-between">
            <span className="text-sm font-medium text-gray-700">Conversaciones</span>
            <button
              onClick={() => setShowHistorial(false)}
              className="p-1 text-gray-400 hover:text-gray-600 rounded"
            >
              <ChevronLeft className="w-4 h-4" />
            </button>
          </div>
          <div className="flex-1 overflow-y-auto p-2">
            {historial.length === 0 ? (
              <p className="text-xs text-gray-400 text-center mt-4">Las conversaciones guardadas aparecerán acá</p>
            ) : (
              historial.map(conv => (
                <button
                  key={conv.id}
                  onClick={() => cargarConversacion(conv.id)}
                  className="w-full text-left p-2 rounded-lg hover:bg-gray-100 mb-1 transition-colors"
                >
                  <p className="text-xs font-medium text-gray-700 truncate">{conv.titulo}</p>
                  <p className="text-[10px] text-gray-400 mt-0.5 truncate">{conv.resumen}</p>
                  <p className="text-[9px] text-gray-300 mt-0.5">
                    {new Date(conv.created_at).toLocaleDateString('es-AR', { day: 'numeric', month: 'short', hour: '2-digit', minute: '2-digit' })}
                  </p>
                </button>
              ))
            )}
          </div>
        </div>
      )}

      {/* Chat principal */}
      <div className="flex-1 flex flex-col min-w-0">
        {/* Header */}
        <div className="h-14 border-b border-gray-200 flex items-center justify-between px-4 flex-shrink-0">
          <div className="flex items-center gap-3">
            {!showHistorial && (
              <button
                onClick={() => setShowHistorial(true)}
                className="p-1.5 text-gray-400 hover:text-gray-600 hover:bg-gray-100 rounded-lg transition-colors"
                title="Ver historial"
              >
                <MessageSquare className="w-4 h-4" />
              </button>
            )}
            <div className="flex items-center gap-2">
              <div className="w-8 h-8 rounded-lg bg-gradient-to-br from-[#e63946] to-[#c1121f] flex items-center justify-center">
                <Sparkles className="w-4 h-4 text-white" />
              </div>
              <div>
                <h1 className="text-sm font-semibold text-gray-900">Pupy</h1>
                <p className="text-[10px] text-gray-400">Asesora Estratégica IA</p>
              </div>
            </div>
          </div>
          <button
            onClick={nuevaConversacion}
            className="flex items-center gap-1.5 px-3 py-1.5 text-xs text-gray-500 hover:text-gray-700 hover:bg-gray-100 rounded-lg transition-colors"
            title="Nueva conversación"
          >
            <Plus className="w-3.5 h-3.5" />
            Nueva
          </button>
        </div>

        {/* Área de mensajes */}
        <div className="flex-1 overflow-y-auto">
          <div className="max-w-3xl mx-auto px-4 py-6">
            {/* Estado vacío */}
            {mensajes.length === 0 && !isLoading && (
              <div className="flex flex-col items-center justify-center h-full min-h-[60vh]">
                <div className="w-12 h-12 rounded-2xl bg-gradient-to-br from-[#e63946] to-[#c1121f] flex items-center justify-center mb-4">
                  <Sparkles className="w-6 h-6 text-white" />
                </div>
                <h2 className="text-lg font-medium text-gray-900 mb-1">Pupy</h2>
                <p className="text-sm text-gray-400 mb-8">Tu asesora estratégica de PSI</p>
              </div>
            )}

            {/* Loading del briefing */}
            {mensajes.length === 0 && isLoading && (
              <div className="flex flex-col items-center justify-center h-full min-h-[60vh]">
                <div className="w-12 h-12 rounded-2xl bg-gradient-to-br from-[#e63946] to-[#c1121f] flex items-center justify-center mb-4 animate-pulse">
                  <Sparkles className="w-6 h-6 text-white" />
                </div>
                <p className="text-sm text-gray-400">Pupy está analizando los datos...</p>
              </div>
            )}

            {/* Mensajes */}
            {mensajes.map((mensaje) => (
              <div key={mensaje.id} className="mb-6">
                {mensaje.rol === 'user' && (
                  <div className="flex justify-end mb-2">
                    <div className="max-w-[85%]">
                      {mensaje.archivos && mensaje.archivos.length > 0 && (
                        <div className="flex flex-wrap gap-2 mb-2 justify-end">
                          {mensaje.archivos.map((archivo, i) => (
                            <div key={i} className="flex items-center gap-1.5 px-2 py-1 bg-gray-100 rounded-lg">
                              {archivo.tipo.startsWith('image/') ? (
                                <ImageIcon className="w-3 h-3 text-gray-500" />
                              ) : (
                                <FileText className="w-3 h-3 text-gray-500" />
                              )}
                              <span className="text-[10px] text-gray-600 max-w-[120px] truncate">{archivo.nombre}</span>
                            </div>
                          ))}
                        </div>
                      )}
                      <div className="bg-[#e63946] text-white rounded-2xl rounded-br-md px-4 py-2.5">
                        <p className="text-sm whitespace-pre-wrap">{mensaje.contenido}</p>
                      </div>
                    </div>
                  </div>
                )}

                {mensaje.rol === 'assistant' && (
                  <div className="flex gap-3">
                    <div className="w-7 h-7 rounded-lg bg-gradient-to-br from-[#e63946] to-[#c1121f] flex items-center justify-center flex-shrink-0 mt-0.5">
                      <Sparkles className="w-3.5 h-3.5 text-white" />
                    </div>
                    <div className="flex-1 min-w-0">
                      <div
                        className="text-sm text-gray-800 leading-relaxed prose prose-sm max-w-none prose-strong:text-gray-900 prose-p:my-1"
                        dangerouslySetInnerHTML={{ __html: renderMarkdown(mensaje.contenido) }}
                      />
                      <div className="flex items-center gap-2 mt-2">
                        <button
                          onClick={() => copiarMensaje(mensaje.id, mensaje.contenido)}
                          className="text-[10px] text-gray-300 hover:text-gray-500 flex items-center gap-1 transition-colors"
                        >
                          {copiedId === mensaje.id ? (
                            <><Check className="w-3 h-3" /> Copiado</>
                          ) : (
                            <><Copy className="w-3 h-3" /> Copiar</>
                          )}
                        </button>
                      </div>
                    </div>
                  </div>
                )}
              </div>
            ))}

            {/* Indicador de carga */}
            {isLoading && mensajes.length > 0 && (
              <div className="flex gap-3 mb-6">
                <div className="w-7 h-7 rounded-lg bg-gradient-to-br from-[#e63946] to-[#c1121f] flex items-center justify-center flex-shrink-0">
                  <Sparkles className="w-3.5 h-3.5 text-white animate-pulse" />
                </div>
                <div className="flex items-center gap-2 text-sm text-gray-400">
                  <Loader2 className="w-3.5 h-3.5 animate-spin" />
                  Pupy está analizando...
                </div>
              </div>
            )}

            <div ref={messagesEndRef} />
          </div>
        </div>

        {/* Archivos adjuntos preview */}
        {archivosAdjuntos.length > 0 && (
          <div className="px-4 pb-2">
            <div className="max-w-3xl mx-auto flex flex-wrap gap-2">
              {archivosAdjuntos.map((archivo, index) => (
                <div key={index} className="relative group">
                  {archivo.preview ? (
                    <div className="w-16 h-16 rounded-lg overflow-hidden border border-gray-200">
                      <img src={archivo.preview} alt={archivo.nombre} className="w-full h-full object-cover" />
                    </div>
                  ) : (
                    <div className="w-16 h-16 rounded-lg border border-gray-200 flex flex-col items-center justify-center bg-gray-50">
                      <FileText className="w-5 h-5 text-gray-400" />
                      <span className="text-[8px] text-gray-400 mt-0.5">PDF</span>
                    </div>
                  )}
                  <button
                    onClick={() => removerArchivo(index)}
                    className="absolute -top-1.5 -right-1.5 w-4 h-4 bg-gray-700 text-white rounded-full flex items-center justify-center opacity-0 group-hover:opacity-100 transition-opacity"
                  >
                    <X className="w-2.5 h-2.5" />
                  </button>
                  <p className="text-[8px] text-gray-400 text-center mt-0.5 max-w-[64px] truncate">{archivo.nombre}</p>
                </div>
              ))}
            </div>
          </div>
        )}

        {/* Input area */}
        <div className="border-t border-gray-100 bg-white px-4 py-3">
          <div className="max-w-3xl mx-auto">
            <div className="relative flex items-end gap-2 bg-gray-50 border border-gray-200 rounded-2xl px-3 py-2 focus-within:border-[#e63946] focus-within:ring-1 focus-within:ring-[#e63946]/20 transition-all">
              <button
                onClick={() => fileInputRef.current?.click()}
                className="p-1.5 text-gray-400 hover:text-gray-600 rounded-lg hover:bg-gray-100 transition-colors flex-shrink-0 mb-0.5"
                title="Adjuntar imagen o PDF"
                disabled={isLoading}
              >
                <Paperclip className="w-4 h-4" />
              </button>
              <input
                ref={fileInputRef}
                type="file"
                className="hidden"
                accept="image/jpeg,image/png,image/gif,image/webp,application/pdf"
                multiple
                onChange={handleFileSelect}
              />
              <textarea
                ref={textareaRef}
                value={input}
                onChange={(e) => setInput(e.target.value)}
                onKeyDown={handleKeyDown}
                placeholder="Preguntale a Pupy..."
                rows={1}
                className="flex-1 bg-transparent text-sm text-gray-800 placeholder-gray-400 resize-none focus:outline-none max-h-[200px] py-1.5"
                disabled={isLoading}
              />
              <button
                onClick={enviarMensaje}
                disabled={(!input.trim() && archivosAdjuntos.length === 0) || isLoading}
                className="p-1.5 bg-[#e63946] text-white rounded-lg hover:bg-[#c1121f] transition-colors disabled:opacity-30 disabled:cursor-not-allowed flex-shrink-0 mb-0.5"
              >
                <Send className="w-4 h-4" />
              </button>
            </div>
            <p className="text-[10px] text-gray-300 text-center mt-1.5">
              Pupy analiza datos en tiempo real · Podés adjuntar imágenes y PDFs
            </p>
          </div>
        </div>
      </div>
    </div>
  );
}
