'use client';

import { useEffect, useRef, useState } from 'react';
import { useCRMStore } from '@/stores/crm-store';
import { useAuth } from '@/contexts/AuthContext';
import { supabase } from '@/lib/supabase';
import { type Mensaje } from '@/types/crm';
import { cn, formatMessageTime, getInitials } from '@/lib/utils';
import { LinkPreview, extractUrls } from './LinkPreview';
import { Search, User, MoreVertical, Smile, Paperclip, Mic, Send, X, MessageSquare, Reply, Copy, Trash2, Pin, Star, Forward, CheckSquare, Share2, Plus, Play, Pause, Download } from 'lucide-react';

interface RespuestaRapida { id: string; atajo: string; titulo: string; contenido: string; }
interface ArchivoSeleccionado { file: File; preview: string | null; tipo: 'image' | 'video' | 'document' | 'audio'; }

interface MensajeCompleto extends Mensaje {
  reacciones?: { emoji: string; usuario_id: string; created_at: string }[];
  destacado?: boolean;
  fijado?: boolean;
  mensaje_citado_contenido?: string;
  mensaje_citado_remitente?: string;
  media_url?: string;
  media_type?: 'image' | 'video' | 'document' | 'audio';
  whatsapp_message_id?: string;
  whatsapp_context_id?: string;
  mensaje_citado_id?: string;
}

const REACCIONES = ['👍', '❤️', '😂', '😮', '😢', '🙏'];

const EMOJI_CATEGORIES = [
  { name: '😀', emojis: ['😀','😃','😄','😁','😅','😂','🤣','😊','😇','🙂','😉','😌','😍','🥰','😘','😗','😙','😚','😋','😛','😜','🤪','😝','🤑','🤗','🤭','🤫','🤔','🤐','🤨','😐','😑','😶','😏','😒','🙄','😬','🤥','😔','😪','🤤','😴','😷','🤒','🤕','🤢','🤮','🤧','🥵','🥶','🥴','😵','🤯','🤠','🥳','😎','🤓','🧐'] },
  { name: '❤️', emojis: ['❤️','🧡','💛','💚','💙','💜','🖤','🤍','🤎','💔','❣️','💕','💞','💓','💗','💖','💘','💝','💟','💋','💯','💢','💥','💫','💦','💨','💣','💬','🗨️','🗯️','💭','💤','🔥','✨','🌟','⭐','🌈','☀️','🌙','⚡','❄️','🌊','🌸','🌺','🌻','🌹','🪷','💐','🍀'] },
  { name: '👋', emojis: ['👋','🤚','🖐️','✋','🖖','👌','🤌','🤏','✌️','🤞','🤟','🤘','🤙','👈','👉','👆','👇','☝️','👍','👎','✊','👊','🤛','🤜','👏','🙌','👐','🤲','🤝','🙏','✍️','💅','🤳','💪','🦾','🦿','🦵','🦶','👂','🦻','👃','🧠','👀','👁️','👅','👄','🫶','🫰','🫵'] },
  { name: '🎉', emojis: ['🎉','🎊','🎈','🎁','🎀','🏆','🥇','🥈','🥉','⚽','🏀','🏈','⚾','🎾','🏐','🎱','🎮','🕹️','🎲','🎭','🎨','🎬','🎤','🎧','🎼','🎹','🥁','🎷','🎺','🎸','🎻','🎵','🎶','🎙️','📷','📸','📹','🎥','📽️','📺','📻','🎞️'] },
  { name: '🍕', emojis: ['🍕','🍔','🍟','🌭','🍿','🥓','🥚','🍳','🧇','🥞','🍞','🥐','🥖','🧀','🥗','🥙','🥪','🌮','🌯','🍝','🍜','🍲','🍛','🍣','🍱','🥟','🍤','🍙','🍚','🍘','🍥','🍧','🍨','🍦','🧁','🍰','🎂','🍮','🍭','🍬','🍫','🍩','🍪','☕','🍵','🥤','🧋','🍺','🍻','🥂','🍷','🍸','🍹'] },
  { name: '✅', emojis: ['✅','❌','⭕','❗','❓','❕','❔','‼️','⁉️','💲','©️','®️','™️','🔴','🟠','🟡','🟢','🔵','🟣','🟤','⚫','⚪','🔶','🔷','🔸','🔹','🔺','🔻','▪️','▫️','⬛','⬜','🟥','🟧','🟨','🟩','🟦','🟪','🟫','➡️','⬅️','⬆️','⬇️','↗️','↘️','↙️','↖️','↕️','↔️','🔄','🔃'] },
];

const DocIcons = {
  pdf: () => (<svg viewBox="0 0 40 40" className="w-10 h-10"><rect x="4" y="2" width="32" height="36" rx="2" fill="#E53935" /><path d="M12 8h16v4H12z" fill="#FFCDD2" /><text x="20" y="28" textAnchor="middle" fill="white" fontSize="10" fontWeight="bold">PDF</text></svg>),
  word: () => (<svg viewBox="0 0 40 40" className="w-10 h-10"><rect x="4" y="2" width="32" height="36" rx="2" fill="#1565C0" /><text x="20" y="26" textAnchor="middle" fill="white" fontSize="16" fontWeight="bold">W</text></svg>),
  excel: () => (<svg viewBox="0 0 40 40" className="w-10 h-10"><rect x="4" y="2" width="32" height="36" rx="2" fill="#2E7D32" /><text x="20" y="26" textAnchor="middle" fill="white" fontSize="16" fontWeight="bold">X</text></svg>),
  powerpoint: () => (<svg viewBox="0 0 40 40" className="w-10 h-10"><rect x="4" y="2" width="32" height="36" rx="2" fill="#D84315" /><text x="20" y="26" textAnchor="middle" fill="white" fontSize="16" fontWeight="bold">P</text></svg>),
  text: () => (<svg viewBox="0 0 40 40" className="w-10 h-10"><rect x="4" y="2" width="32" height="36" rx="2" fill="#546E7A" /><path d="M10 12h20M10 18h20M10 24h14" stroke="white" strokeWidth="2" /></svg>),
  zip: () => (<svg viewBox="0 0 40 40" className="w-10 h-10"><rect x="4" y="2" width="32" height="36" rx="2" fill="#FFA000" /><path d="M18 8h4v4h-4zM18 14h4v4h-4zM18 20h4v4h-4zM16 26h8v6h-8z" fill="white" /></svg>),
  generic: () => (<svg viewBox="0 0 40 40" className="w-10 h-10"><rect x="4" y="2" width="32" height="36" rx="2" fill="#78909C" /><path d="M12 14h16M12 20h16M12 26h10" stroke="white" strokeWidth="2" /></svg>),
};

const getDocIcon = (ext: string) => {
  const map: Record<string, keyof typeof DocIcons> = { pdf:'pdf',doc:'word',docx:'word',odt:'word',rtf:'word',xls:'excel',xlsx:'excel',ods:'excel',csv:'excel',ppt:'powerpoint',pptx:'powerpoint',odp:'powerpoint',txt:'text',md:'text',log:'text',zip:'zip',rar:'zip','7z':'zip',tar:'zip',gz:'zip' };
  const IconComponent = DocIcons[map[ext.toLowerCase()] || 'generic'];
  return <IconComponent />;
};

function getTipoArchivo(mimeType: string): 'image' | 'video' | 'document' | 'audio' {
  if (mimeType.startsWith('image/')) return 'image';
  if (mimeType.startsWith('video/')) return 'video';
  if (mimeType.startsWith('audio/')) return 'audio';
  return 'document';
}

function formatFileSize(bytes: number): string {
  if (bytes < 1024) return bytes + ' B';
  if (bytes < 1024 * 1024) return (bytes / 1024).toFixed(1) + ' KB';
  return (bytes / (1024 * 1024)).toFixed(1) + ' MB';
}

export default function ChatPanel() {
  const { conversacionActual, panelInfoAbierto, togglePanelInfo, mensajeEnRespuesta, setMensajeEnRespuesta } = useCRMStore();
  const { user } = useAuth();
  const userId = user?.id || null;
  const [mensajes, setMensajes] = useState<MensajeCompleto[]>([]);
  const [texto, setTexto] = useState('');
  const [enviando, setEnviando] = useState(false);
  const [respuestasRapidas, setRespuestasRapidas] = useState<RespuestaRapida[]>([]);
  const [mostrarSugerencias, setMostrarSugerencias] = useState(false);
  const [sugerenciasFiltradas, setSugerenciasFiltradas] = useState<RespuestaRapida[]>([]);
  const [indiceSugerencia, setIndiceSugerencia] = useState(0);
  const [copiado, setCopiado] = useState(false);
  const [mensajesSeleccionados, setMensajesSeleccionados] = useState<Set<string>>(new Set());
  const [modoSeleccion, setModoSeleccion] = useState(false);
  const [archivoSeleccionado, setArchivoSeleccionado] = useState<ArchivoSeleccionado | null>(null);
  const [subiendoArchivo, setSubiendoArchivo] = useState(false);
  const [grabandoAudio, setGrabandoAudio] = useState(false);
  const [tiempoGrabacion, setTiempoGrabacion] = useState(0);
  const [mostrarEmojis, setMostrarEmojis] = useState(false);
  const [categoriaEmoji, setCategoriaEmoji] = useState(0);
  const [audioPlaying, setAudioPlaying] = useState<string | null>(null);
  const [audioProgress, setAudioProgress] = useState<Record<string, number>>({});
  const [audioDuration, setAudioDuration] = useState<Record<string, number>>({});

  const [menuVisible, setMenuVisible] = useState(false);
  const [menuPosition, setMenuPosition] = useState({ x: 0, y: 0 });
  const [menuMensaje, setMenuMensaje] = useState<MensajeCompleto | null>(null);

  const mediaRecorderRef = useRef<MediaRecorder | null>(null);
  const audioChunksRef = useRef<Blob[]>([]);
  const timerRef = useRef<NodeJS.Timeout | null>(null);
  const audioRefs = useRef<Record<string, HTMLAudioElement>>({});
  const messagesEndRef = useRef<HTMLDivElement>(null);
  const textareaRef = useRef<HTMLTextAreaElement>(null);
  const chatContainerRef = useRef<HTMLDivElement>(null);
  const fileInputRef = useRef<HTMLInputElement>(null);
  const emojiContainerRef = useRef<HTMLDivElement>(null);
  const menuRef = useRef<HTMLDivElement>(null);

  const insertarEmoji = (emoji: string) => {
    const textarea = textareaRef.current;
    if (textarea) {
      const start = textarea.selectionStart;
      const end = textarea.selectionEnd;
      const newText = texto.substring(0, start) + emoji + texto.substring(end);
      setTexto(newText);
      setTimeout(() => { textarea.selectionStart = textarea.selectionEnd = start + emoji.length; textarea.focus(); }, 0);
    } else {
      setTexto(texto + emoji);
    }
  };

  const handleClickAdjuntar = () => { fileInputRef.current?.click(); };

  const handleFileSelect = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;
    if (file.size > 16 * 1024 * 1024) { alert('El archivo es demasiado grande. Máximo 16MB.'); return; }
    const tipo = getTipoArchivo(file.type);
    let preview: string | null = null;
    if (tipo === 'image' || tipo === 'video') { preview = URL.createObjectURL(file); }
    setArchivoSeleccionado({ file, preview, tipo });
    e.target.value = '';
  };

  const cancelarArchivo = () => {
    if (archivoSeleccionado?.preview) { URL.revokeObjectURL(archivoSeleccionado.preview); }
    setArchivoSeleccionado(null);
  };

  const subirArchivo = async (file: File): Promise<string | null> => {
    try {
      if (file.type.startsWith("audio/")) {
        const formData = new FormData();
        formData.append("file", file);
        formData.append("conversacion_id", conversacionActual?.id || "");
        const response = await fetch("/api/audio/convert", { method: "POST", body: formData });
        if (!response.ok) return null;
        const result = await response.json();
        return result.url;
      }
      const timestamp = Date.now();
      const extension = file.name.split(".").pop() || "bin";
      const fileName = `${conversacionActual?.id}/${timestamp}.${extension}`;
      const { error } = await supabase.storage.from("media").upload(fileName, file, { cacheControl: "3600", upsert: false });
      if (error) return null;
      const { data: urlData } = supabase.storage.from("media").getPublicUrl(fileName);
      return urlData.publicUrl;
    } catch { return null; }
  };

  const formatTiempoGrabacion = (segundos: number): string => {
    const mins = Math.floor(segundos / 60);
    const secs = segundos % 60;
    return `${mins}:${secs.toString().padStart(2, "0")}`;
  };

  const iniciarGrabacion = async () => {
    try {
      const stream = await navigator.mediaDevices.getUserMedia({ audio: true });
      const mediaRecorder = new MediaRecorder(stream);
      mediaRecorderRef.current = mediaRecorder;
      audioChunksRef.current = [];
      mediaRecorder.ondataavailable = (e) => { if (e.data.size > 0) audioChunksRef.current.push(e.data); };
      mediaRecorder.onstop = async () => {
        stream.getTracks().forEach(track => track.stop());
        const audioBlob = new Blob(audioChunksRef.current, { type: "audio/mp4" });
        const audioFile = new File([audioBlob], `audio_${Date.now()}.m4a`, { type: "audio/mp4" });
        setArchivoSeleccionado({ file: audioFile, preview: null, tipo: "audio" });
      };
      mediaRecorder.start();
      setGrabandoAudio(true);
      setTiempoGrabacion(0);
      timerRef.current = setInterval(() => setTiempoGrabacion(t => t + 1), 1000);
    } catch { alert("No se pudo acceder al micrófono"); }
  };

  const detenerGrabacion = () => {
    if (mediaRecorderRef.current && grabandoAudio) {
      mediaRecorderRef.current.stop();
      setGrabandoAudio(false);
      if (timerRef.current) clearInterval(timerRef.current);
    }
  };

  const cancelarGrabacion = () => {
    if (mediaRecorderRef.current && grabandoAudio) {
      mediaRecorderRef.current.stop();
      audioChunksRef.current = [];
      setGrabandoAudio(false);
      if (timerRef.current) clearInterval(timerRef.current);
      setTiempoGrabacion(0);
    }
  };

  useEffect(() => {
    const cerrarMenu = (e: MouseEvent) => {
      if (menuVisible && menuRef.current && !menuRef.current.contains(e.target as Node)) {
        setMenuVisible(false);
      }
    };
    if (menuVisible) {
      setTimeout(() => { document.addEventListener('click', cerrarMenu); }, 10);
    }
    return () => { document.removeEventListener('click', cerrarMenu); };
  }, [menuVisible]);

  useEffect(() => {
    const handleClickOutside = (e: MouseEvent) => {
      if (mostrarEmojis && emojiContainerRef.current && !emojiContainerRef.current.contains(e.target as Node)) {
        setMostrarEmojis(false);
      }
    };
    document.addEventListener('mousedown', handleClickOutside);
    return () => document.removeEventListener('mousedown', handleClickOutside);
  }, [mostrarEmojis]);

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
    const marcarLeido = async () => { await supabase.from('conversaciones').update({ mensajes_no_leidos: 0 }).eq('id', conversacionActual.id); };
    cargarMensajes();
    marcarLeido();
    const channel = supabase.channel(`chat-${conversacionActual.id}`)
      .on('postgres_changes', { event: 'INSERT', schema: 'public', table: 'mensajes', filter: `conversacion_id=eq.${conversacionActual.id}` }, () => { cargarMensajes(); })
      .on('postgres_changes', { event: '*', schema: 'public', table: 'mensaje_reacciones' }, () => { cargarMensajes(); })
      .on('postgres_changes', { event: 'UPDATE', schema: 'public', table: 'conversaciones', filter: `id=eq.${conversacionActual.id}` }, (payload: any) => {
        const nuevoMsg = payload.new?.ultimo_mensaje;
        if (nuevoMsg && nuevoMsg !== ultimoMensajeCargado) { ultimoMensajeCargado = nuevoMsg; cargarMensajes(); }
      })
      .subscribe();
    return () => { supabase.removeChannel(channel); };
  }, [conversacionActual?.id]);

  useEffect(() => { messagesEndRef.current?.scrollIntoView({ behavior: 'smooth' }); }, [mensajes]);
  useEffect(() => { return () => { if (archivoSeleccionado?.preview) { URL.revokeObjectURL(archivoSeleccionado.preview); } }; }, [archivoSeleccionado]);

  const abrirMenuContextual = (e: React.MouseEvent, msg: MensajeCompleto) => {
    e.preventDefault();
    e.stopPropagation();
    setMenuPosition({ x: e.clientX, y: e.clientY });
    setMenuMensaje(msg);
    setMenuVisible(true);
  };

  const cerrarMenu = () => {
    setMenuVisible(false);
    setMenuMensaje(null);
  };

  const reaccionar = async (emoji: string) => {
    if (!menuMensaje || !userId || !conversacionActual) return;
    const msgId = menuMensaje.id;
    const { data: existingExact } = await supabase.from('mensaje_reacciones').select('id').eq('mensaje_id', msgId).eq('usuario_id', userId).eq('emoji', emoji).maybeSingle();
    if (existingExact) {
      await supabase.from('mensaje_reacciones').delete().eq('id', existingExact.id);
      try {
        await fetch('/api/mensajes/reaccion', { method: 'POST', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify({ mensaje_id: msgId, emoji: '', telefono: conversacionActual.telefono }) });
      } catch (e) { console.error('Error quitando reaccion en WhatsApp:', e); }
    } else {
      await supabase.from('mensaje_reacciones').delete().eq('mensaje_id', msgId).eq('usuario_id', userId);
      await supabase.from('mensaje_reacciones').insert({ mensaje_id: msgId, usuario_id: userId, emoji });
      try {
        await fetch('/api/mensajes/reaccion', { method: 'POST', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify({ mensaje_id: msgId, emoji, telefono: conversacionActual.telefono }) });
      } catch (e) { console.error('Error enviando reaccion a WhatsApp:', e); }
    }
    const { data } = await supabase.from('vw_mensajes_completos').select('*').eq('conversacion_id', conversacionActual?.id).eq('eliminado', false).order('timestamp', { ascending: true });
    if (data) setMensajes(data);
    cerrarMenu();
  };

  const responderMensaje = () => {
    if (menuMensaje) {
      setMensajeEnRespuesta(menuMensaje);
      textareaRef.current?.focus();
    }
    cerrarMenu();
  };

  const copiarMensaje = async () => {
    if (menuMensaje?.mensaje) {
      await navigator.clipboard.writeText(menuMensaje.mensaje);
      setCopiado(true);
      setTimeout(() => setCopiado(false), 2000);
    }
    cerrarMenu();
  };

  const reenviarMensaje = () => { alert('Función de reenvío próximamente'); cerrarMenu(); };

  const destacarMensaje = async () => {
    if (!menuMensaje || !userId) return;
    const msgId = menuMensaje.id;
    if (menuMensaje.destacado) {
      await supabase.from('mensajes_destacados').delete().eq('mensaje_id', msgId).eq('usuario_id', userId);
    } else {
      await supabase.from('mensajes_destacados').insert({ mensaje_id: msgId, usuario_id: userId });
    }
    const { data } = await supabase.from('vw_mensajes_completos').select('*').eq('conversacion_id', conversacionActual?.id).eq('eliminado', false).order('timestamp', { ascending: true });
    if (data) setMensajes(data);
    cerrarMenu();
  };

  const fijarMensaje = async () => {
    if (!menuMensaje || !userId || !conversacionActual?.id) return;
    const msgId = menuMensaje.id;
    if (menuMensaje.fijado) {
      await supabase.from('mensajes_fijados').delete().eq('mensaje_id', msgId).eq('conversacion_id', conversacionActual.id);
    } else {
      await supabase.from('mensajes_fijados').insert({ mensaje_id: msgId, conversacion_id: conversacionActual.id, usuario_id: userId });
    }
    const { data } = await supabase.from('vw_mensajes_completos').select('*').eq('conversacion_id', conversacionActual?.id).eq('eliminado', false).order('timestamp', { ascending: true });
    if (data) setMensajes(data);
    cerrarMenu();
  };

  const eliminarMensaje = async () => {
    if (!menuMensaje || !userId) return;
    if (!confirm('¿Eliminar este mensaje?')) { cerrarMenu(); return; }
    await supabase.from('mensajes').update({ eliminado: true, eliminado_ts: new Date().toISOString(), eliminado_por: userId }).eq('id', menuMensaje.id);
    setMensajes((prev) => prev.filter((m) => m.id !== menuMensaje.id));
    cerrarMenu();
  };

  const seleccionarMensaje = () => {
    if (menuMensaje) {
      setModoSeleccion(true);
      setMensajesSeleccionados(new Set([menuMensaje.id]));
    }
    cerrarMenu();
  };

  const toggleSeleccion = (id: string) => {
    const nuevo = new Set(mensajesSeleccionados);
    if (nuevo.has(id)) nuevo.delete(id);
    else nuevo.add(id);
    setMensajesSeleccionados(nuevo);
    if (nuevo.size === 0) setModoSeleccion(false);
  };

  const eliminarSeleccionados = async () => {
    if (!userId || mensajesSeleccionados.size === 0) return;
    if (!confirm(`¿Eliminar ${mensajesSeleccionados.size} mensajes?`)) return;
    for (const id of mensajesSeleccionados) {
      await supabase.from('mensajes').update({ eliminado: true, eliminado_ts: new Date().toISOString(), eliminado_por: userId }).eq('id', id);
    }
    setMensajes(prev => prev.filter(m => !mensajesSeleccionados.has(m.id)));
    setModoSeleccion(false);
    setMensajesSeleccionados(new Set());
  };

  const compartirMensaje = async () => {
    if (menuMensaje?.mensaje && navigator.share) {
      try { await navigator.share({ text: menuMensaje.mensaje }); } catch {}
    }
    cerrarMenu();
  };

  const enviarMensaje = async () => {
    if ((!texto.trim() && !archivoSeleccionado) || !conversacionActual || enviando) return;
    setEnviando(true);
    setSubiendoArchivo(!!archivoSeleccionado);
    try {
      let mediaUrl: string | null = null;
      let mediaType: string | null = null;
      if (archivoSeleccionado) {
        mediaUrl = await subirArchivo(archivoSeleccionado.file);
        if (!mediaUrl) { alert('Error al subir el archivo. Intenta de nuevo.'); setEnviando(false); setSubiendoArchivo(false); return; }
        mediaType = archivoSeleccionado.tipo;
      }
      
      const respuestaId = mensajeEnRespuesta?.id;
      
      const response = await fetch('/api/mensajes/enviar', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          telefono: conversacionActual.telefono,
          mensaje: texto.trim() || (archivoSeleccionado ? archivoSeleccionado.file.name : ''),
          conversacion_id: conversacionActual.id,
          linea_origen: conversacionActual.linea_origen,
          inbox_fijo: conversacionActual.inbox_fijo,
          desconectado_wsp4: conversacionActual.desconectado_wsp4,
          respuesta_a: respuestaId,
          media_url: mediaUrl,
          media_type: mediaType
        }),
      });
      
      if (response.ok) {
        const result = await response.json();
        if (respuestaId && result.mensaje_id) {
          await supabase.from('mensajes').update({ 
            mensaje_citado_id: respuestaId
          }).eq('id', result.mensaje_id);
        }
      }
      
      setTexto('');
      setMensajeEnRespuesta(null);
      cancelarArchivo();
    } catch (e) { console.error(e); alert('Error al enviar mensaje'); }
    setEnviando(false);
    setSubiendoArchivo(false);
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

  const formatAudioTime = (seconds: number): string => {
    if (!seconds || isNaN(seconds)) return "0:00";
    const mins = Math.floor(seconds / 60);
    const secs = Math.floor(seconds % 60);
    return `${mins}:${secs.toString().padStart(2, "0")}`;
  };

  const toggleAudio = (msgId: string, url: string) => {
    const audio = audioRefs.current[msgId];
    if (!audio) {
      const newAudio = new Audio(url);
      audioRefs.current[msgId] = newAudio;
      newAudio.onloadedmetadata = () => setAudioDuration(prev => ({ ...prev, [msgId]: newAudio.duration }));
      newAudio.ontimeupdate = () => setAudioProgress(prev => ({ ...prev, [msgId]: newAudio.currentTime }));
      newAudio.onended = () => { setAudioPlaying(null); setAudioProgress(prev => ({ ...prev, [msgId]: 0 })); };
      newAudio.play();
      setAudioPlaying(msgId);
    } else if (audioPlaying === msgId) {
      audio.pause();
      setAudioPlaying(null);
    } else {
      Object.entries(audioRefs.current).forEach(([id, a]) => { if (id !== msgId) a.pause(); });
      audio.play();
      setAudioPlaying(msgId);
    }
  };

  const seekAudio = (msgId: string, e: React.MouseEvent<HTMLDivElement>) => {
    const audio = audioRefs.current[msgId];
    if (!audio) return;
    const rect = e.currentTarget.getBoundingClientRect();
    const percent = (e.clientX - rect.left) / rect.width;
    audio.currentTime = percent * audio.duration;
  };

  const renderMultimedia = (msg: MensajeCompleto) => {
    if (!msg.media_url || !msg.media_type) return null;
    const isOut = msg.direccion === 'saliente' || msg.direccion === 'outbound';
    switch (msg.media_type) {
      case 'image':
        return (<div className="mb-1 rounded-lg overflow-hidden"><img src={msg.media_url} alt="Imagen" className="max-w-full max-h-60 object-contain cursor-pointer hover:opacity-90" onClick={() => window.open(msg.media_url, '_blank')} /></div>);
      case 'video':
        return (<div className="mb-1 rounded-lg overflow-hidden"><video src={msg.media_url} controls className="max-w-full max-h-60" preload="metadata" /></div>);
      case 'audio':
        const isPlaying = audioPlaying === msg.id;
        const progress = audioProgress[msg.id] || 0;
        const duration = audioDuration[msg.id] || 0;
        const progressPercent = duration > 0 ? (progress / duration) * 100 : 0;
        return (
          <div className={cn("mb-1 p-2 rounded-lg flex items-center gap-3 min-w-[220px]", isOut ? "bg-indigo-400/20" : "bg-slate-100 dark:bg-slate-700")}>
            <button onClick={() => toggleAudio(msg.id, msg.media_url!)} className={cn("w-10 h-10 rounded-full flex items-center justify-center flex-shrink-0 transition-colors", isOut ? "bg-indigo-400/40 hover:bg-indigo-400/60" : "bg-slate-200 dark:bg-slate-600 hover:bg-slate-300 dark:hover:bg-slate-500")}>
              {isPlaying ? <Pause size={18} className={isOut ? "text-white" : "text-slate-600 dark:text-slate-200"} /> : <Play size={18} className={cn("ml-0.5", isOut ? "text-white" : "text-slate-600 dark:text-slate-200")} />}
            </button>
            <div className="flex-1 min-w-0">
              <div className={cn("h-1.5 rounded-full cursor-pointer relative", isOut ? "bg-indigo-300/40" : "bg-slate-300 dark:bg-slate-500")} onClick={(e) => seekAudio(msg.id, e)}>
                <div className={cn("h-full rounded-full transition-all", isOut ? "bg-white" : "bg-indigo-500")} style={{ width: `${progressPercent}%` }} />
              </div>
              <div className={cn("flex justify-between mt-1 text-[10px]", isOut ? "text-indigo-200" : "text-slate-500")}>
                <span>{formatAudioTime(progress)}</span>
                <span>{formatAudioTime(duration)}</span>
              </div>
            </div>
          </div>
        );
      case 'document':
        const ext = msg.media_url.split('.').pop()?.toLowerCase() || '';
        const fileName = (() => { try { return decodeURIComponent(msg.media_url).split('/').pop() || 'Archivo'; } catch { return 'Archivo'; } })();
        return (
          <a href={msg.media_url} target="_blank" rel="noopener noreferrer" className={cn("flex items-center gap-3 mb-1 p-2.5 rounded-lg transition-colors min-w-[200px]", isOut ? "bg-indigo-400/20 hover:bg-indigo-400/30" : "bg-slate-100 dark:bg-slate-700 hover:bg-slate-200 dark:hover:bg-slate-600")}>
            <div className="flex-shrink-0">{getDocIcon(ext)}</div>
            <div className="flex-1 min-w-0">
              <p className={cn("text-xs font-medium truncate", isOut ? "text-indigo-100" : "text-slate-700 dark:text-slate-200")}>{fileName}</p>
              <p className={cn("text-[10px]", isOut ? "text-indigo-200" : "text-slate-500")}>{ext.toUpperCase()} • Toca para abrir</p>
            </div>
            <Download size={16} className={cn("flex-shrink-0", isOut ? "text-indigo-200" : "text-slate-400")} />
          </a>
        );
      default: return null;
    }
  };

  const getMensajeCitado = (msg: MensajeCompleto) => {
    if (msg.mensaje_citado_contenido) {
      return {
        contenido: msg.mensaje_citado_contenido,
        remitente: msg.mensaje_citado_remitente || 'Mensaje'
      };
    }
    if (msg.mensaje_citado_id) {
      const citado = mensajes.find(m => m.id === msg.mensaje_citado_id);
      if (citado) {
        return {
          contenido: citado.mensaje || citado.media_type || 'Mensaje',
          remitente: citado.direccion === 'entrante' ? conversacionActual?.nombre || 'Usuario' : 'Tú'
        };
      }
    }
    if (msg.whatsapp_context_id) {
      const citado = mensajes.find(m => m.whatsapp_message_id === msg.whatsapp_context_id);
      if (citado) {
        return {
          contenido: citado.mensaje || citado.media_type || 'Mensaje',
          remitente: citado.direccion === 'entrante' ? conversacionActual?.nombre || 'Usuario' : 'Tú'
        };
      }
    }
    return null;
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
      <input ref={fileInputRef} type="file" accept="image/*,video/*,audio/*,.pdf,.doc,.docx,.xls,.xlsx,.txt" onChange={handleFileSelect} className="hidden" />

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

      <div ref={chatContainerRef} className="flex-1 overflow-y-auto px-4 py-2 min-h-0">
        {mensajes.map((msg) => {
          const isOut = msg.direccion === 'saliente' || msg.direccion === 'outbound';
          const isSelected = mensajesSeleccionados.has(msg.id);
          const hasReacciones = msg.reacciones && msg.reacciones.length > 0;
          const mensajeCitado = getMensajeCitado(msg);
          
          return (
            <div
              key={msg.id}
              className={cn('flex group', isOut ? 'justify-end' : 'justify-start', isSelected && 'bg-indigo-50 dark:bg-indigo-500/10 -mx-4 px-4', hasReacciones ? 'mb-4' : 'mb-1')}
              onContextMenu={(e) => { if (!modoSeleccion) { abrirMenuContextual(e, msg); } }}
              onClick={() => modoSeleccion && toggleSeleccion(msg.id)}
            >
              {modoSeleccion && (
                <div className={cn('flex items-center mr-2', isOut && 'order-2 ml-2 mr-0')}>
                  <div className={cn('w-5 h-5 rounded-full border-2 flex items-center justify-center transition-colors', isSelected ? 'bg-indigo-500 border-indigo-500' : 'border-slate-300 dark:border-slate-600')}>
                    {isSelected && <span className="text-white text-xs">✓</span>}
                  </div>
                </div>
              )}
              <div className="relative max-w-[65%]">
                {mensajeCitado && (
                  <div className={cn('text-[11px] px-2 py-1 rounded-t-lg border-l-2 border-indigo-400 mb-0.5', isOut ? 'bg-white/90 text-slate-700' : 'bg-slate-200 dark:bg-slate-700 text-slate-600 dark:text-slate-300')}>
                    <p className="font-medium text-[10px]">{mensajeCitado.remitente}</p>
                    <p className="truncate">{mensajeCitado.contenido}</p>
                  </div>
                )}
                <div className={cn('rounded-lg px-2 py-1 shadow-sm cursor-pointer text-[13px] leading-[18px] relative', isOut ? 'bg-indigo-500 text-white rounded-tr-sm' : 'bg-white dark:bg-slate-800 text-slate-800 dark:text-white rounded-tl-sm', mensajeCitado && 'rounded-t-none')}>
                  <div className="absolute -top-1 -right-1 flex gap-0.5">
                    {msg.fijado && <span className="bg-amber-400 text-amber-900 rounded-full p-0.5"><Pin size={10} /></span>}
                    {msg.destacado && <span className="bg-yellow-400 text-yellow-900 rounded-full p-0.5"><Star size={10} /></span>}
                  </div>
                  {renderMultimedia(msg)}
                  {msg.mensaje && (
                    <>
                      <p className="whitespace-pre-wrap break-words">{msg.mensaje}</p>
                      {extractUrls(msg.mensaje).slice(0, 1).map((linkUrl) => (
                        <LinkPreview key={linkUrl} url={linkUrl} isOutgoing={isOut} />
                      ))}
                    </>
                  )}
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
      </div>

      {menuVisible && (
        <div ref={menuRef} className="fixed bg-white dark:bg-slate-800 rounded-xl shadow-2xl border border-slate-200 dark:border-slate-700 overflow-hidden z-[9999] w-52" style={{ left: menuPosition.x, top: menuPosition.y }}>
          <div className="flex items-center justify-between px-2 py-2 border-b border-slate-100 dark:border-slate-700">
            {REACCIONES.map((emoji) => (
              <button key={emoji} onClick={(e) => { e.stopPropagation(); reaccionar(emoji); }} className="w-8 h-8 flex items-center justify-center hover:bg-slate-100 dark:hover:bg-slate-700 rounded-full text-lg transition-transform hover:scale-125">{emoji}</button>
            ))}
            <button className="w-8 h-8 flex items-center justify-center hover:bg-slate-100 dark:hover:bg-slate-700 rounded-full"><Plus size={16} className="text-slate-400" /></button>
          </div>
          <div className="py-1">
            <button onClick={responderMensaje} className="w-full px-3 py-2 text-left hover:bg-slate-50 dark:hover:bg-slate-700 flex items-center gap-3 text-[13px] text-slate-700 dark:text-slate-200"><Reply size={16} className="text-slate-400" /> Responder</button>
            <button onClick={copiarMensaje} className="w-full px-3 py-2 text-left hover:bg-slate-50 dark:hover:bg-slate-700 flex items-center gap-3 text-[13px] text-slate-700 dark:text-slate-200"><Copy size={16} className="text-slate-400" /> {copiado ? '¡Copiado!' : 'Copiar'}</button>
            <button onClick={reenviarMensaje} className="w-full px-3 py-2 text-left hover:bg-slate-50 dark:hover:bg-slate-700 flex items-center gap-3 text-[13px] text-slate-700 dark:text-slate-200"><Forward size={16} className="text-slate-400" /> Reenviar</button>
            <button onClick={destacarMensaje} className="w-full px-3 py-2 text-left hover:bg-slate-50 dark:hover:bg-slate-700 flex items-center gap-3 text-[13px] text-slate-700 dark:text-slate-200"><Star size={16} className={menuMensaje?.destacado ? 'text-yellow-500 fill-yellow-500' : 'text-slate-400'} /> {menuMensaje?.destacado ? 'Quitar destacado' : 'Destacar'}</button>
            <button onClick={fijarMensaje} className="w-full px-3 py-2 text-left hover:bg-slate-50 dark:hover:bg-slate-700 flex items-center gap-3 text-[13px] text-slate-700 dark:text-slate-200"><Pin size={16} className={menuMensaje?.fijado ? 'text-amber-500 fill-amber-500' : 'text-slate-400'} /> {menuMensaje?.fijado ? 'Desfijar' : 'Fijar'}</button>
            <button onClick={eliminarMensaje} className="w-full px-3 py-2 text-left hover:bg-slate-50 dark:hover:bg-slate-700 flex items-center gap-3 text-[13px] text-slate-700 dark:text-slate-200"><Trash2 size={16} className="text-slate-400" /> Eliminar para mí</button>
            <button onClick={seleccionarMensaje} className="w-full px-3 py-2 text-left hover:bg-slate-50 dark:hover:bg-slate-700 flex items-center gap-3 text-[13px] text-slate-700 dark:text-slate-200"><CheckSquare size={16} className="text-slate-400" /> Seleccionar</button>
            <button onClick={compartirMensaje} className="w-full px-3 py-2 text-left hover:bg-slate-50 dark:hover:bg-slate-700 flex items-center gap-3 text-[13px] text-slate-700 dark:text-slate-200"><Share2 size={16} className="text-slate-400" /> Compartir</button>
          </div>
        </div>
      )}

      {mensajeEnRespuesta && (
        <div className="px-3 py-1 bg-slate-50 dark:bg-slate-800 border-t border-slate-200 dark:border-slate-700 flex items-center gap-2 flex-shrink-0">
          <div className="w-0.5 h-7 bg-indigo-500 rounded-full" />
          <div className="flex-1 min-w-0">
            <p className="text-[10px] text-indigo-600 dark:text-indigo-400 font-medium">Respondiendo a</p>
            <p className="text-[11px] text-slate-600 dark:text-slate-300 truncate">{mensajeEnRespuesta.mensaje || mensajeEnRespuesta.media_type || 'Mensaje'}</p>
          </div>
          <button onClick={() => setMensajeEnRespuesta(null)} className="p-0.5 hover:bg-slate-200 dark:hover:bg-slate-700 rounded"><X size={12} className="text-slate-400" /></button>
        </div>
      )}

      {archivoSeleccionado && (
        <div className="px-3 py-2 bg-slate-50 dark:bg-slate-800 border-t border-slate-200 dark:border-slate-700 flex items-center gap-3 flex-shrink-0">
          <div className="relative">
            {archivoSeleccionado.tipo === 'image' && archivoSeleccionado.preview ? (
              <img src={archivoSeleccionado.preview} alt="Preview" className="w-14 h-14 object-cover rounded-lg" />
            ) : archivoSeleccionado.tipo === 'video' && archivoSeleccionado.preview ? (
              <div className="w-14 h-14 bg-slate-200 dark:bg-slate-700 rounded-lg flex items-center justify-center relative">
                <video src={archivoSeleccionado.preview} className="w-14 h-14 object-cover rounded-lg" />
                <Play size={20} className="absolute text-white drop-shadow-lg" />
              </div>
            ) : archivoSeleccionado.tipo === 'audio' ? (
              <div className="w-14 h-14 bg-purple-100 dark:bg-purple-500/20 rounded-lg flex items-center justify-center"><Mic size={24} className="text-purple-500" /></div>
            ) : (
              <div className="w-14 h-14 flex items-center justify-center">{getDocIcon(archivoSeleccionado.file.name.split('.').pop() || '')}</div>
            )}
            <button onClick={cancelarArchivo} className="absolute -top-1.5 -right-1.5 w-5 h-5 bg-red-500 text-white rounded-full flex items-center justify-center hover:bg-red-600 shadow-sm"><X size={12} /></button>
          </div>
          <div className="flex-1 min-w-0">
            <p className="text-xs font-medium text-slate-700 dark:text-slate-200 truncate">{archivoSeleccionado.file.name}</p>
            <p className="text-[10px] text-slate-500">{formatFileSize(archivoSeleccionado.file.size)} • {archivoSeleccionado.tipo}</p>
          </div>
          {subiendoArchivo && (<div className="text-xs text-indigo-500 animate-pulse">Subiendo...</div>)}
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

        <div ref={emojiContainerRef} className="relative">
          <button onClick={() => setMostrarEmojis(!mostrarEmojis)} className={cn('p-1.5 rounded-full hover:bg-slate-100 dark:hover:bg-slate-800', mostrarEmojis ? 'text-indigo-500 bg-indigo-50 dark:bg-indigo-500/20' : 'text-slate-500')}><Smile size={18} /></button>
          {mostrarEmojis && (
            <div className="absolute bottom-full left-0 mb-2 bg-white dark:bg-slate-800 rounded-lg shadow-xl border border-slate-200 dark:border-slate-700 overflow-hidden z-50 w-80">
              <div className="flex border-b border-slate-100 dark:border-slate-700 px-1">
                {EMOJI_CATEGORIES.map((cat, idx) => (
                  <button key={idx} onClick={() => setCategoriaEmoji(idx)} className={cn('flex-1 py-2 text-lg hover:bg-slate-50 dark:hover:bg-slate-700 transition-colors rounded-t', categoriaEmoji === idx && 'bg-indigo-50 dark:bg-indigo-500/20')}>{cat.name}</button>
                ))}
              </div>
              <div className="p-2 h-52 overflow-y-auto">
                <div className="grid grid-cols-8 gap-1">
                  {EMOJI_CATEGORIES[categoriaEmoji].emojis.map((emoji, idx) => (
                    <button key={idx} onClick={() => insertarEmoji(emoji)} className="w-8 h-8 flex items-center justify-center hover:bg-slate-100 dark:hover:bg-slate-700 rounded text-xl transition-transform hover:scale-125">{emoji}</button>
                  ))}
                </div>
              </div>
            </div>
          )}
        </div>

        <button onClick={handleClickAdjuntar} className={cn('p-1.5 rounded-full hover:bg-slate-100 dark:hover:bg-slate-800', archivoSeleccionado ? 'text-indigo-500 bg-indigo-50 dark:bg-indigo-500/20' : 'text-slate-500')}><Paperclip size={18} /></button>

        <div className="flex-1">
          {grabandoAudio ? (
            <div className="flex items-center gap-3 px-3 py-1.5 bg-red-50 dark:bg-red-500/10 rounded-lg">
              <div className="w-3 h-3 bg-red-500 rounded-full animate-pulse" />
              <span className="text-red-600 dark:text-red-400 font-medium text-sm">{formatTiempoGrabacion(tiempoGrabacion)}</span>
              <span className="text-slate-500 text-xs">Grabando...</span>
              <button onClick={cancelarGrabacion} className="ml-auto p-1 hover:bg-red-100 dark:hover:bg-red-500/20 rounded-full"><X size={16} className="text-red-500" /></button>
            </div>
          ) : (
            <textarea ref={textareaRef} value={texto} onChange={(e) => setTexto(e.target.value)} onKeyDown={handleKeyDown} placeholder={archivoSeleccionado ? "Añade un mensaje (opcional)" : "Escribe un mensaje"} rows={1} className="w-full px-3 py-1.5 bg-slate-100 dark:bg-slate-800 border-0 rounded-lg resize-none text-[13px] text-slate-800 dark:text-white placeholder-slate-400 focus:ring-0 focus:outline-none" style={{ minHeight: '34px', maxHeight: '80px' }} />
          )}
        </div>

        <button onClick={grabandoAudio ? detenerGrabacion : (texto.trim() || archivoSeleccionado) ? enviarMensaje : iniciarGrabacion} disabled={enviando} className={cn("p-1.5 rounded-full transition-colors", grabandoAudio ? "bg-red-500 text-white hover:bg-red-600" : (texto.trim() || archivoSeleccionado) ? "bg-indigo-500 text-white hover:bg-indigo-600" : "hover:bg-slate-100 dark:hover:bg-slate-800 text-slate-500", enviando && "opacity-50 cursor-not-allowed")}>
          {enviando ? (<div className="w-[18px] h-[18px] border-2 border-white border-t-transparent rounded-full animate-spin" />) : grabandoAudio ? (<div className="w-4 h-4 bg-white rounded-sm" />) : (texto.trim() || archivoSeleccionado) ? (<Send size={18} />) : (<Mic size={18} />)}
        </button>
      </div>
    </div>
  );
}
