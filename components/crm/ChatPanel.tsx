'use client';

import { useState, useEffect, useRef } from 'react';
import { User } from '@/lib/types';
import {
  Conversation,
  Message,
  ConversationStatus,
} from '@/lib/types/crm';
// Iconos modernos de react-icons
import { 
  HiOutlinePaperClip, 
  HiOutlineEmojiHappy, 
  HiOutlineDotsVertical, 
  HiCheck, 
  HiCheckCircle,
  HiOutlineUserAdd,
  HiX,
  HiOutlineChat,
  HiOutlineInformationCircle,
  HiOutlineChevronRight,
  HiOutlinePencil,
  HiOutlineTrash,
  HiOutlineReply,
  HiOutlineThumbUp,
  HiOutlineMicrophone,
  HiOutlineClipboardCopy,
  HiOutlineStar,
  HiStar,
  HiOutlineBookmark,
  HiBookmark,
  HiOutlineShare,
  HiOutlineArrowRight,
  HiOutlineSearch,
  HiOutlinePaperAirplane,
  HiPaperAirplane
} from 'react-icons/hi';
import { createClient } from '@/lib/supabase/client';
import { format } from 'date-fns';
import StatusSelector from './StatusSelector';
import AssignmentModal from './AssignmentModal';

interface ChatPanelProps {
  conversation: Conversation | null;
  user: User | null;
  onUpdateConversation: () => void;
  onToggleContactInfo?: () => void;
  isContactInfoOpen?: boolean;
}

// Emojis comunes para el selector
const EMOJI_CATEGORIES = {
  'Frecuentes': ['😀', '😂', '😊', '😍', '🤔', '👍', '❤️', '🙏', '😅', '😢'],
  'Emociones': ['😀', '😃', '😄', '😁', '😆', '😅', '😂', '🤣', '😊', '😇', '🙂', '🙃', '😉', '😌', '😍', '🥰', '😘', '😗', '😙', '😚'],
  'Gestos': ['👍', '👎', '👌', '✌️', '🤞', '🤟', '🤘', '🤙', '👏', '🙌', '👐', '🤲', '🤝', '🙏'],
  'Objetos': ['📱', '💻', '⌚', '📷', '🎥', '📺', '📻', '🔊', '📢', '📣', '📯', '🔔', '🔕'],
  'Símbolos': ['❤️', '💛', '💚', '💙', '💜', '🖤', '🤍', '🤎', '💔', '❣️', '💕', '💞', '💓', '💗', '💖', '💘', '💝'],
};

export default function ChatPanel({ 
  conversation, 
  user, 
  onUpdateConversation,
  onToggleContactInfo,
  isContactInfoOpen = true
}: ChatPanelProps) {
  const [messages, setMessages] = useState<Message[]>([]);
  const [newMessage, setNewMessage] = useState('');
  const [sending, setSending] = useState(false);
  const [showAssignmentModal, setShowAssignmentModal] = useState(false);
  const [showEmojiPicker, setShowEmojiPicker] = useState(false);
  const [emojiCategory, setEmojiCategory] = useState<keyof typeof EMOJI_CATEGORIES>('Frecuentes');
  const [quickReplies, setQuickReplies] = useState<Array<{ id: string; nombre: string; mensaje: string; codigo?: string }>>([]);
  const [showQuickReplySuggestions, setShowQuickReplySuggestions] = useState(false);
  const [quickReplyQuery, setQuickReplyQuery] = useState('');
  const [selectedQuickReplyIndex, setSelectedQuickReplyIndex] = useState(0);
  const [hoveredMessage, setHoveredMessage] = useState<string | null>(null);
  const [editingMessage, setEditingMessage] = useState<string | null>(null);
  const [editMessageText, setEditMessageText] = useState('');
  const [messageReactions, setMessageReactions] = useState<Record<string, string[]>>({});
  const [showReactionPicker, setShowReactionPicker] = useState<string | null>(null);
  const [isRecording, setIsRecording] = useState(false);
  const [recordingTime, setRecordingTime] = useState(0);
  const [contextMenu, setContextMenu] = useState<{ messageId: string; x: number; y: number } | null>(null);
  const [selectedMessages, setSelectedMessages] = useState<Set<string>>(new Set());
  const [replyingTo, setReplyingTo] = useState<Message | null>(null);
  const [starredMessages, setStarredMessages] = useState<Set<string>>(new Set());
  const [pinnedMessages, setPinnedMessages] = useState<Set<string>>(new Set());
  const [showForwardModal, setShowForwardModal] = useState(false);
  const [forwardMessage, setForwardMessage] = useState<Message | null>(null);
  const [forwardConversations, setForwardConversations] = useState<Conversation[]>([]);
  const [forwardSelectedConversation, setForwardSelectedConversation] = useState<Conversation | null>(null);
  const [forwardSearch, setForwardSearch] = useState('');
  const [forwardLoading, setForwardLoading] = useState(false);
  const [forwardSubmitting, setForwardSubmitting] = useState(false);
  const messagesContainerRef = useRef<HTMLDivElement>(null);
  const emojiPickerRef = useRef<HTMLDivElement>(null);
  const reactionPickerRef = useRef<HTMLDivElement>(null);
  const contextMenuRef = useRef<HTMLDivElement>(null);
  const textareaRef = useRef<HTMLTextAreaElement>(null);
  const recordingIntervalRef = useRef<NodeJS.Timeout | null>(null);
  const mediaRecorderRef = useRef<MediaRecorder | null>(null);
  const supabase = createClient();

  // Cargar respuestas rápidas
  useEffect(() => {
    loadQuickReplies();
  }, []);

  const loadQuickReplies = async () => {
    try {
      const { data, error } = await supabase
        .from('respuestas_rapidas')
        .select('id, nombre, mensaje, codigo')
        .order('nombre', { ascending: true });

      if (!error && data) {
        setQuickReplies(data);
      }
    } catch (error) {
      console.error('Error loading quick replies:', error);
    }
  };

  useEffect(() => {
    if (showForwardModal) {
      loadForwardConversations();
    }
  }, [showForwardModal]);

  const loadForwardConversations = async () => {
    try {
      setForwardLoading(true);
      const { data, error } = await supabase
        .from('conversaciones')
        .select(`
          *,
          contactos (
            id,
            nombre,
            telefono
          )
        `)
        .order('ts_ultimo_mensaje', { ascending: false, nullsFirst: false })
        .limit(100);

      if (error) {
        console.error('Error loading conversations for forward:', error);
        setForwardConversations([]);
        return;
      }

      setForwardConversations(data || []);
    } catch (error) {
      console.error('Error loading conversations for forward:', error);
      setForwardConversations([]);
    } finally {
      setForwardLoading(false);
    }
  };

  // Cargar mensajes cuando se selecciona una conversación
  useEffect(() => {
    if (conversation) {
      loadMessages();
      
      // Suscribirse a nuevos mensajes en tiempo real
      const channel = supabase
        .channel(`messages-${conversation.id}`)
        .on(
          'postgres_changes',
          {
            event: '*',
            schema: 'public',
            table: 'mensajes',
            filter: `conversacion_id=eq.${conversation.id}`,
          },
          () => {
            loadMessages();
            onUpdateConversation();
          }
        )
        .subscribe();

      return () => {
        supabase.removeChannel(channel);
      };
    } else {
      setMessages([]);
    }
  }, [conversation?.id]);

  const loadMessages = async () => {
    if (!conversation) return;

    try {
      const { data, error } = await supabase
        .from('mensajes')
        .select('*')
        .eq('conversacion_id', conversation.id)
        .order('timestamp', { ascending: true });

      if (error) throw error;
      
      // Transformar mensajes para la UI
      const transformedMessages: Message[] = (data || []).map((msg: any) => {
        const directionRaw = typeof msg.direccion === 'string' ? msg.direccion.toLowerCase() : undefined;
        const directionNormalized =
          directionRaw === 'entrante' || directionRaw === 'inbound'
            ? 'entrante'
            : directionRaw === 'saliente' || directionRaw === 'outbound'
            ? 'saliente'
            : undefined;

        const fallbackIsContact =
          msg.remitente_tipo === 'contact' ||
          msg.remitente === conversation.telefono ||
          msg.remitente === conversation.contactos?.telefono;

        const isFromContact = directionNormalized
          ? directionNormalized === 'entrante'
          : fallbackIsContact;

        return {
          ...msg,
          direccion: directionNormalized || msg.direccion,
          conversation_id: msg.conversacion_id,
          content: msg.mensaje,
          from_phone: msg.remitente_nombre || msg.remitente,
          is_from_contact: isFromContact,
        };
      });
      
      setMessages(transformedMessages);

      // Cargar reacciones de mensajes
      const reactionsMap: Record<string, string[]> = {};
      for (const msg of transformedMessages) {
        try {
          const { data: reactions } = await supabase
            .from('mensaje_reacciones')
            .select('emoji')
            .eq('mensaje_id', msg.id);
          
          if (reactions) {
            reactionsMap[msg.id] = reactions.map((r: any) => r.emoji);
          }
        } catch {
          // Ignorar errores de reacciones
        }
      }
      setMessageReactions(reactionsMap);

      // Cargar mensajes destacados
      try {
        const { data: starred } = await supabase
          .from('mensajes_destacados')
          .select('mensaje_id')
          .eq('usuario_id', user?.id);
        
        if (starred) {
          setStarredMessages(new Set(starred.map((s: any) => s.mensaje_id)));
        }
      } catch {
        // Ignorar errores
      }

      // Cargar mensajes fijados
      if (conversation) {
        try {
          const { data: pinned } = await supabase
            .from('mensajes_fijados')
            .select('mensaje_id')
            .eq('conversacion_id', conversation.id)
            .eq('usuario_id', user?.id);
          
          if (pinned) {
            setPinnedMessages(new Set(pinned.map((p: any) => p.mensaje_id)));
          }
        } catch {
          // Ignorar errores
        }
      }
    } catch (error) {
      console.error('Error loading messages:', error);
    }
  };

  // Scroll automático - desde abajo (con column-reverse, scrollTop = 0 es el final)
  useEffect(() => {
    if (messagesContainerRef.current && messages.length > 0) {
      const container = messagesContainerRef.current;
      // Con flex-direction: column-reverse, scrollTop = 0 muestra los mensajes más recientes
      container.scrollTop = 0;
    }
  }, [messages.length, conversation?.id]);

  // Scroll automático después de enviar mensaje
  useEffect(() => {
    if (messagesContainerRef.current && !sending && messages.length > 0) {
      const container = messagesContainerRef.current;
      // Pequeño delay para asegurar que el mensaje se renderizó
      setTimeout(() => {
        if (container) {
          // Con column-reverse, scrollTop = 0 es el final (mensajes más recientes)
          container.scrollTop = 0;
        }
      }, 50);
    }
  }, [sending, messages.length]);

  // Cerrar emoji picker al hacer click fuera
  useEffect(() => {
    const handleClickOutside = (event: MouseEvent) => {
      if (emojiPickerRef.current && !emojiPickerRef.current.contains(event.target as Node)) {
        setShowEmojiPicker(false);
      }
      if (reactionPickerRef.current && !reactionPickerRef.current.contains(event.target as Node)) {
        setShowReactionPicker(null);
      }
    };

    if (showEmojiPicker || showReactionPicker) {
      document.addEventListener('mousedown', handleClickOutside);
      return () => document.removeEventListener('mousedown', handleClickOutside);
    }
  }, [showEmojiPicker, showReactionPicker]);

  const insertEmoji = (emoji: string) => {
    setNewMessage(prev => prev + emoji);
    setShowEmojiPicker(false);
  };

  // Manejar autocompletado de respuestas rápidas
  const handleMessageChange = (e: React.ChangeEvent<HTMLTextAreaElement>) => {
    const value = e.target.value;
    setNewMessage(value);

    // Detectar si empieza con /
    if (value.startsWith('/')) {
      const query = value.slice(1).toLowerCase();
      setQuickReplyQuery(query);
      
      if (query.length > 0) {
        setShowQuickReplySuggestions(true);
        setSelectedQuickReplyIndex(0);
      } else {
        setShowQuickReplySuggestions(false);
      }
    } else {
      setShowQuickReplySuggestions(false);
      setQuickReplyQuery('');
    }
  };

  const filteredQuickReplies = quickReplies.filter(reply => {
    const codigo = (reply.codigo || reply.nombre.substring(0, 3)).toLowerCase();
    const nombre = reply.nombre.toLowerCase();
    const query = quickReplyQuery.toLowerCase();
    return codigo.startsWith(query) || nombre.includes(query);
  });

  const insertQuickReply = (reply: { mensaje: string }) => {
    setNewMessage(reply.mensaje);
    setShowQuickReplySuggestions(false);
    setQuickReplyQuery('');
    textareaRef.current?.focus();
  };

  const handleKeyDown = (e: React.KeyboardEvent<HTMLTextAreaElement>) => {
    // Si hay sugerencias de respuestas rápidas
    if (showQuickReplySuggestions && filteredQuickReplies.length > 0) {
      if (e.key === 'ArrowDown') {
        e.preventDefault();
        setSelectedQuickReplyIndex(prev => 
          prev < filteredQuickReplies.length - 1 ? prev + 1 : prev
        );
      } else if (e.key === 'ArrowUp') {
        e.preventDefault();
        setSelectedQuickReplyIndex(prev => prev > 0 ? prev - 1 : 0);
      } else if (e.key === 'Enter' || e.key === 'Tab') {
        e.preventDefault();
        if (filteredQuickReplies[selectedQuickReplyIndex]) {
          insertQuickReply(filteredQuickReplies[selectedQuickReplyIndex]);
        }
      } else if (e.key === 'Escape') {
        setShowQuickReplySuggestions(false);
        setQuickReplyQuery('');
      }
      return;
    }

    // Comportamiento normal para Enter
    if (e.key === 'Enter' && !e.shiftKey) {
      e.preventDefault();
      handleSendMessage(e);
    }
  };

  const handleSendMessage = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!conversation || !newMessage.trim() || sending) return;

    setSending(true);
    try {
      // Preparar datos del mensaje
      const messageData: any = {
        conversacion_id: conversation.id,
        mensaje: newMessage.trim(),
        remitente: user?.email || 'system',
      };

      // Si hay un mensaje al que responder, agregar referencia
      if (replyingTo) {
        messageData.mensaje_respuesta_id = replyingTo.id;
      }

      // Enviar mensaje a través de la API
      const response = await fetch('/api/messages/send', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(messageData),
      });

      if (!response.ok) throw new Error('Error al enviar mensaje');

      setNewMessage('');
      setReplyingTo(null);
      setShowQuickReplySuggestions(false);
      await loadMessages();
      onUpdateConversation();
    } catch (error) {
      console.error('Error sending message:', error);
      alert('Error al enviar el mensaje. Por favor, intenta de nuevo.');
    } finally {
      setSending(false);
    }
  };

  const handleEditMessage = async (messageId: string, newText: string) => {
    try {
      const { error } = await supabase
        .from('mensajes')
        .update({ 
          mensaje: newText,
          editado: true,
          updated_at: new Date().toISOString()
        })
        .eq('id', messageId);

      if (error) throw error;
      setEditingMessage(null);
      await loadMessages();
    } catch (error: any) {
      console.error('Error editing message:', error);
      alert(`Error: ${error.message || 'No se pudo editar el mensaje'}`);
    }
  };

  const handleDeleteMessage = async (messageId: string) => {
    if (!confirm('¿Estás seguro de eliminar este mensaje?')) return;

    try {
      const { error } = await supabase
        .from('mensajes')
        .update({ 
          eliminado: true,
          mensaje: '[Mensaje eliminado]',
          updated_at: new Date().toISOString()
        })
        .eq('id', messageId);

      if (error) throw error;
      await loadMessages();
    } catch (error: any) {
      console.error('Error deleting message:', error);
      alert(`Error: ${error.message || 'No se pudo eliminar el mensaje'}`);
    }
  };

  const handleAddReaction = async (messageId: string, emoji: string) => {
    const currentReactions = messageReactions[messageId] || [];
    const hasReaction = currentReactions.includes(emoji);
    try {
      const response = await fetch('/api/messages/react', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          mensaje_id: messageId,
          emoji,
          action: hasReaction ? 'remove' : 'add',
        }),
      });

      const data = await response.json().catch(() => ({}));

      if (!response.ok) {
        throw new Error(data?.error || 'No se pudo procesar la reacción');
      }

      setShowReactionPicker(null);
      await loadMessages();
    } catch (error: any) {
      console.error('Error procesando reacción:', error);
      alert(
        `Error al ${hasReaction ? 'eliminar' : 'agregar'} reacción: ${
          error?.message || 'Error desconocido'
        }`
      );
    }
  };

  // Emojis comunes para reacciones (estilo WhatsApp)
  const reactionEmojis = ['👍', '❤️', '😂', '😮', '😢', '🙏'];

  // Funciones del menú contextual
  const handleReply = (message: Message) => {
    try {
      if (!message) return;
      setReplyingTo(message);
      setContextMenu(null);
      setTimeout(() => {
        textareaRef.current?.focus();
      }, 100);
    } catch (error) {
      console.error('Error in handleReply:', error);
      setContextMenu(null);
    }
  };

  const handleStarMessage = async (messageId: string) => {
    try {
      const isStarred = starredMessages.has(messageId);
      
      if (isStarred) {
        const { error } = await supabase
          .from('mensajes_destacados')
          .delete()
          .eq('mensaje_id', messageId)
          .eq('usuario_id', user?.id);
        
        if (error) throw error;
        setStarredMessages(prev => {
          const newSet = new Set(prev);
          newSet.delete(messageId);
          return newSet;
        });
      } else {
        const { error } = await supabase
          .from('mensajes_destacados')
          .insert({
            mensaje_id: messageId,
            usuario_id: user?.id,
          });
        
        if (error) throw error;
        setStarredMessages(prev => new Set(prev).add(messageId));
      }
      setContextMenu(null);
    } catch (error: any) {
      console.error('Error starring message:', error);
      if (!error.message?.includes('does not exist')) {
        alert(`Error: ${error.message || 'No se pudo destacar el mensaje'}`);
      }
    }
  };

  const handlePinMessage = async (messageId: string) => {
    if (!conversation || !user?.id) {
      setContextMenu(null);
      return;
    }
    
    try {
      const isPinned = pinnedMessages.has(messageId);
      
      if (isPinned) {
        const { error } = await supabase
          .from('mensajes_fijados')
          .delete()
          .eq('mensaje_id', messageId)
          .eq('conversacion_id', conversation.id)
          .eq('usuario_id', user.id);
        
        if (error && !error.message?.includes('does not exist')) throw error;
        setPinnedMessages(prev => {
          const newSet = new Set(prev);
          newSet.delete(messageId);
          return newSet;
        });
      } else {
        const { error } = await supabase
          .from('mensajes_fijados')
          .insert({
            mensaje_id: messageId,
            conversacion_id: conversation.id,
            usuario_id: user.id,
          });
        
        if (error && !error.message?.includes('does not exist')) throw error;
        setPinnedMessages(prev => new Set(prev).add(messageId));
      }
      setContextMenu(null);
    } catch (error: any) {
      console.error('Error pinning message:', error);
      setContextMenu(null);
    }
  };

  const handleForwardMessage = (messageId: string) => {
    const message = messages.find(m => m.id === messageId);
    if (!message) {
      setContextMenu(null);
      return;
    }

    setForwardMessage(message);
    setForwardSelectedConversation(null);
    setForwardSearch('');
    setShowForwardModal(true);
    setContextMenu(null);
  };

  const filteredForwardConversations = forwardConversations.filter((conv) => {
    if (!forwardSearch) return true;
    const query = forwardSearch.toLowerCase();
    const contactName = conv.contactos?.nombre || '';
    const phone = conv.contactos?.telefono || conv.telefono || '';
    return (
      contactName.toLowerCase().includes(query) ||
      phone.toLowerCase().includes(query)
    );
  });

  const handleConfirmForward = async () => {
    if (!forwardSelectedConversation || !forwardMessage) return;

    try {
      setForwardSubmitting(true);
      const response = await fetch('/api/messages/send', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          conversacion_id: forwardSelectedConversation.id,
          mensaje: forwardMessage.mensaje,
          mensaje_original_id: forwardMessage.id,
          reenviado: true,
          remitente: user?.email || 'system',
        }),
      });

      const data = await response.json().catch(() => ({}));
      if (!response.ok || data?.error) {
        throw new Error(data?.error || 'No se pudo reenviar el mensaje');
      }

      if (forwardSelectedConversation.id === conversation?.id) {
        loadMessages();
      }

      setShowForwardModal(false);
      setForwardMessage(null);
      setForwardSelectedConversation(null);
      setForwardSearch('');
    } catch (error: any) {
      console.error('Error reenviando mensaje:', error);
      alert(error?.message || 'No se pudo reenviar el mensaje');
    } finally {
      setForwardSubmitting(false);
    }
  };

  const handleSelectMessage = (messageId: string) => {
    try {
      setSelectedMessages(prev => {
        const newSet = new Set(prev);
        if (newSet.has(messageId)) {
          newSet.delete(messageId);
        } else {
          newSet.add(messageId);
        }
        return newSet;
      });
      setContextMenu(null);
    } catch (error) {
      console.error('Error selecting message:', error);
      setContextMenu(null);
    }
  };

  const handleShareMessage = async (messageId: string) => {
    try {
      const message = messages.find(m => m.id === messageId);
      if (!message) {
        setContextMenu(null);
        return;
      }

      if (navigator.share) {
        await navigator.share({
          title: 'Mensaje del CRM',
          text: message.mensaje || '',
        });
      } else {
        // Fallback: copiar al portapapeles
        await navigator.clipboard.writeText(message.mensaje || '');
        alert('Mensaje copiado al portapapeles');
      }
      setContextMenu(null);
    } catch (error: any) {
      console.error('Error sharing:', error);
      // Si el usuario cancela el share, no mostrar error
      if (error.name !== 'AbortError') {
        // Fallback: copiar al portapapeles
        try {
          const message = messages.find(m => m.id === messageId);
          if (message) {
            await navigator.clipboard.writeText(message?.mensaje || '');
            alert('Mensaje copiado al portapapeles');
          }
        } catch (clipboardError) {
          console.error('Error copying to clipboard:', clipboardError);
        }
      }
      setContextMenu(null);
    }
  };

  // Funciones para grabación de audio
  const formatRecordingTime = (seconds: number) => {
    const mins = Math.floor(seconds / 60);
    const secs = seconds % 60;
    return `${mins}:${secs.toString().padStart(2, '0')}`;
  };

  const handleStartRecording = async () => {
    try {
      const stream = await navigator.mediaDevices.getUserMedia({ audio: true });
      const mediaRecorder = new MediaRecorder(stream);
      const audioChunks: Blob[] = [];

      mediaRecorder.ondataavailable = (event) => {
        if (event.data.size > 0) {
          audioChunks.push(event.data);
        }
      };

      mediaRecorder.onstop = async () => {
        const audioBlob = new Blob(audioChunks, { type: 'audio/webm' });
        // Aquí puedes enviar el audio a tu servidor
        // Por ahora, solo mostramos un mensaje
        console.log('Audio grabado:', audioBlob);
        // TODO: Implementar envío de audio
        alert('Funcionalidad de audio en desarrollo. El audio se enviará próximamente.');
        
        // Detener el stream
        stream.getTracks().forEach(track => track.stop());
      };

      mediaRecorder.start();
      mediaRecorderRef.current = mediaRecorder;
      setIsRecording(true);
      setRecordingTime(0);

      // Iniciar contador
      recordingIntervalRef.current = setInterval(() => {
        setRecordingTime(prev => prev + 1);
      }, 1000);
    } catch (error) {
      console.error('Error al iniciar grabación:', error);
      alert('No se pudo acceder al micrófono. Por favor, verifica los permisos.');
    }
  };

  const handleStopRecording = () => {
    if (mediaRecorderRef.current && isRecording) {
      mediaRecorderRef.current.stop();
      setIsRecording(false);
      
      if (recordingIntervalRef.current) {
        clearInterval(recordingIntervalRef.current);
        recordingIntervalRef.current = null;
      }
      
      setRecordingTime(0);
    }
  };

  // Limpiar al desmontar
  useEffect(() => {
    return () => {
      if (recordingIntervalRef.current) {
        clearInterval(recordingIntervalRef.current);
      }
      if (mediaRecorderRef.current && isRecording) {
        mediaRecorderRef.current.stop();
      }
    };
  }, []);

  const handleMarkAsUnread = async () => {
    if (!conversation) return;

    try {
      const { error } = await supabase
        .from('conversaciones')
        .update({ 
          leida: false,
          updated_at: new Date().toISOString()
        })
        .eq('id', conversation.id);

      if (error) throw error;
      onUpdateConversation();
    } catch (error: any) {
      console.error('Error marking as unread:', error);
    }
  };

  if (!conversation) {
    return (
      <div className="flex-1 flex items-center justify-center bg-gray-50">
        <div className="text-center max-w-md px-4">
          <div className="w-20 h-20 rounded-full bg-gradient-to-br from-primary-100 to-primary-200 flex items-center justify-center mx-auto mb-4">
            <HiOutlineChat className="w-10 h-10 text-primary" />
          </div>
          <p className="text-gray-700 text-lg font-semibold mb-2">Selecciona una conversación</p>
          <p className="text-gray-500 text-sm">
            Elige una conversación de la lista para comenzar a chatear
          </p>
        </div>
      </div>
    );
  }

  const contactName = conversation.contactos?.nombre || conversation.contactos?.telefono || conversation.telefono || 'Contacto';

  return (
    <div className="flex-1 flex flex-col bg-white" style={{ minHeight: 0, height: '100%' }}>
      {/* Header del chat */}
      <div className="p-4 border-b border-gray-200 flex items-center justify-between bg-white flex-shrink-0 shadow-sm">
        <div className="flex items-center gap-3">
          <div className="w-10 h-10 rounded-full bg-gradient-to-br from-pink-400 to-pink-500 flex items-center justify-center shadow-sm">
            <span className="text-sm font-medium text-white">
              {contactName.charAt(0).toUpperCase()}
            </span>
          </div>
          <div>
            <h3 className="text-sm font-semibold text-gray-900">{contactName}</h3>
            <p className="text-xs text-gray-500">
              {conversation.contactos?.telefono || conversation.telefono || 'Sin teléfono'}
            </p>
          </div>
        </div>
        <div className="flex items-center gap-2">
          <button
            onClick={() => setShowAssignmentModal(true)}
            className="p-2 rounded-lg hover:bg-gray-100 active:bg-gray-200 transition-all duration-150"
            title="Asignar conversación"
          >
            <HiOutlineUserAdd className="w-5 h-5 text-gray-600" />
          </button>
          {onToggleContactInfo && (
            <button
              onClick={onToggleContactInfo}
              className={`p-2 rounded-lg transition-all duration-150 ${
                isContactInfoOpen
                  ? 'bg-primary-50 hover:bg-primary-100 active:bg-primary-200'
                  : 'hover:bg-gray-100 active:bg-gray-200'
              }`}
              title={isContactInfoOpen ? 'Ocultar información de contacto' : 'Mostrar información de contacto'}
            >
              <HiOutlineInformationCircle className={`w-5 h-5 transition-colors ${
                isContactInfoOpen ? 'text-gray-800' : 'text-gray-600'
              }`} />
            </button>
          )}
          <button 
            onClick={handleMarkAsUnread}
            className="p-2 rounded-lg hover:bg-gray-100 active:bg-gray-200 transition-all duration-150"
            title="Marcar como no leído"
          >
            <HiOutlineChat className="w-5 h-5 text-gray-600" />
          </button>
          <button className="p-2 rounded-lg hover:bg-gray-100 active:bg-gray-200 transition-all duration-150">
            <HiOutlineDotsVertical className="w-5 h-5 text-gray-600" />
          </button>
        </div>
      </div>

      {/* Selector de estado */}
      {conversation && (
        <div className="px-4 py-2 border-b border-gray-200 bg-gray-50 flex-shrink-0">
          <div className="flex items-center justify-between">
            <span className="text-xs font-medium text-gray-700">Estado:</span>
            <StatusSelector
              conversationId={conversation.id}
              currentStatus={
                (conversation.estado as ConversationStatus) || 'activa'
              }
              onUpdate={onUpdateConversation}
            />
          </div>
        </div>
      )}

      {/* Modal de asignación */}
      <AssignmentModal
        conversation={conversation}
        isOpen={showAssignmentModal}
        onClose={() => setShowAssignmentModal(false)}
        onUpdate={onUpdateConversation}
      />

      {/* Área de mensajes con scroll automático y rápido - desde abajo hacia arriba */}
      <div 
        ref={messagesContainerRef}
        className="flex-1 overflow-y-auto overflow-x-hidden p-4"
        style={{ 
          minHeight: 0,
          backgroundColor: '#EFEAE2',
          backgroundImage: 'url("data:image/svg+xml,%3Csvg width=\'100\' height=\'100\' xmlns=\'http://www.w3.org/2000/svg\'%3E%3Cdefs%3E%3Cpattern id=\'grid\' width=\'100\' height=\'100\' patternUnits=\'userSpaceOnUse\'%3E%3Cpath d=\'M 100 0 L 0 0 0 100\' fill=\'none\' stroke=\'%23e5e5e5\' stroke-width=\'0.5\' opacity=\'0.2\'/%3E%3C/pattern%3E%3C/defs%3E%3Crect width=\'100\' height=\'100\' fill=\'url(%23grid)\'/%3E%3C/svg%3E")',
          scrollBehavior: 'smooth',
          overscrollBehavior: 'contain',
          display: 'flex',
          flexDirection: 'column-reverse'
        }}
      >
        <div className="flex flex-col-reverse gap-3">
        {messages.slice().reverse().map((message, index) => {
          // Determinar si el mensaje es del contacto
          const contactPhone = conversation.contactos?.telefono || conversation.telefono;
          const direction = typeof message.direccion === 'string' ? message.direccion.toLowerCase() : undefined;
          const isFromContact = direction
            ? direction === 'entrante' || direction === 'inbound'
            : message.remitente === contactPhone;
          const messageDate = format(new Date(message.timestamp), 'HH:mm');
          const messageContent = message.mensaje || '';
          
          // Agrupar mensajes consecutivos del mismo remitente
          const prevMessage = index > 0 ? messages[index - 1] : null;
          const showAvatar = !prevMessage || prevMessage.remitente !== message.remitente;
          const isConsecutive = prevMessage && prevMessage.remitente === message.remitente;

          const reactions = messageReactions[message.id] || [];
          const isEditing = editingMessage === message.id;
          const isOwnMessage = !isFromContact;

          return (
            <div
              key={message.id}
              className={`flex items-end gap-2 w-full ${isFromContact ? 'justify-start' : 'justify-end'} transition-opacity duration-200 group ${
                selectedMessages.has(message.id) ? 'ring-2 ring-blue-500 rounded-lg p-1 -m-1' : ''
              }`}
              onMouseEnter={() => setHoveredMessage(message.id)}
              onMouseLeave={() => setHoveredMessage(null)}
              onContextMenu={(e) => {
                try {
                  e.preventDefault();
                  e.stopPropagation();
                  if (!conversation) return;
                  
                  setContextMenu({
                    messageId: message.id,
                    x: e.clientX,
                    y: e.clientY
                  });
                } catch (error) {
                  console.error('Error opening context menu:', error);
                }
              }}
              onClick={() => {
                if (selectedMessages.size > 0) {
                  handleSelectMessage(message.id);
                }
              }}
            >
              {isFromContact && showAvatar && (
                <div className="w-8 h-8 rounded-full bg-gradient-to-br from-pink-400 to-pink-500 flex items-center justify-center flex-shrink-0 shadow-sm">
                  <span className="text-xs font-medium text-white">
                    {contactName.charAt(0).toUpperCase()}
                  </span>
                </div>
              )}
              {isFromContact && !showAvatar && <div className="w-8 flex-shrink-0" />}
              {!isFromContact && <div className="w-8 flex-shrink-0" />}
              <div className={`flex flex-col gap-1 ${isFromContact ? 'items-start' : 'items-end'} max-w-[75%]`}>
                <div
                  className={`rounded-2xl px-4 py-2.5 shadow-sm transition-all duration-200 hover:shadow-md relative ${
                    isFromContact
                      ? 'bg-white rounded-tl-sm'
                      : 'bg-[#DCF8C6] rounded-tr-sm'
                  } ${isConsecutive ? 'mt-0.5' : 'mt-1'}`}
                >
                  {isEditing ? (
                    <div className="flex flex-col gap-2">
                      <textarea
                        value={editMessageText}
                        onChange={(e) => setEditMessageText(e.target.value)}
                        className="w-full px-2 py-1 text-sm border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 text-gray-900"
                        rows={2}
                        autoFocus
                      />
                      <div className="flex gap-2 justify-end">
                        <button
                          onClick={() => {
                            setEditingMessage(null);
                            setEditMessageText('');
                          }}
                          className="text-xs px-2 py-1 text-gray-600 hover:text-gray-900"
                        >
                          Cancelar
                        </button>
                        <button
                          onClick={() => handleEditMessage(message.id, editMessageText)}
                          className="text-xs px-2 py-1 bg-primary text-white rounded hover:bg-primary-dark"
                        >
                          Guardar
                        </button>
                      </div>
                    </div>
                  ) : (
                    <>
                      {/* Indicador de reenviado */}
                      {message.reenviado && (
                        <div className="text-[11px] uppercase tracking-wide text-gray-500 mb-1 flex items-center gap-1">
                          <HiOutlineArrowRight className="w-3 h-3" />
                          Reenviado
                        </div>
                      )}

                      {/* Mensaje al que se responde */}
                      {message.mensaje_respuesta_id && (() => {
                        const repliedMessage = messages.find(m => m.id === message.mensaje_respuesta_id);
                        if (!repliedMessage) return null;
                        return (
                          <div className="mb-2 pl-3 border-l-4 border-primary bg-primary-50 rounded py-1">
                            <p className="text-xs font-medium text-gray-800">
                              {repliedMessage.remitente === contactPhone ? contactName : 'Tú'}
                            </p>
                            <p className="text-xs text-gray-800 truncate">
                              {repliedMessage.mensaje || ''}
                            </p>
                          </div>
                        );
                      })()}
                      
                      {/* Indicadores de destacado y fijado */}
                      <div className="flex items-center gap-1 mb-1">
                        {starredMessages.has(message.id) && (
                          <HiStar className="w-3 h-3 text-yellow-500" />
                        )}
                        {pinnedMessages.has(message.id) && (
                          <HiBookmark className="w-3 h-3 text-primary" />
                        )}
                      </div>
                      
                      <p className={`text-sm leading-relaxed whitespace-pre-wrap break-words ${
                        isFromContact ? 'text-gray-900' : 'text-gray-900'
                      }`}>
                        {messageContent}
                      </p>
                      <div
                        className={`flex items-center gap-1.5 mt-1.5 text-xs ${
                          isFromContact ? 'text-gray-500' : 'text-gray-600'
                        }`}
                      >
                        <span>{messageDate}</span>
                        {message.editado && (
                          <span className="text-gray-400 italic">(editado)</span>
                        )}
                        {!isFromContact && (
                          <span className="flex items-center">
                            {message.estado === 'read' ? (
                              <HiCheckCircle className="w-3.5 h-3.5 text-primary" />
                            ) : message.estado === 'delivered' ? (
                              <HiCheckCircle className="w-3.5 h-3.5 text-gray-400" />
                            ) : (
                              <HiCheck className="w-3.5 h-3.5 text-gray-400" />
                            )}
                          </span>
                        )}
                      </div>
                      
                      {/* Reacciones dentro de la burbuja - estilo WhatsApp */}
                      {reactions.length > 0 && (
                        <div className={`absolute flex gap-0.5 ${isFromContact ? '-bottom-2 -right-1' : '-bottom-2 -left-1'} z-10`}>
                          {reactions.map((emoji, idx) => (
                            <button
                              key={idx}
                              onClick={(e) => {
                                e.stopPropagation();
                                handleAddReaction(message.id, emoji);
                              }}
                              className="w-5 h-5 rounded-full bg-white border border-gray-300 flex items-center justify-center text-[10px] hover:scale-110 transition-transform shadow-sm"
                              title="Click para quitar reacción"
                            >
                              {emoji}
                            </button>
                          ))}
                        </div>
                      )}
                    </>
                  )}
                </div>
              </div>
            </div>
          );
        })}
        </div>
        
        {/* Menú contextual - estilo WhatsApp Web */}
        {contextMenu && conversation && user && (() => {
          try {
            if (!contextMenu?.messageId || !messages || messages.length === 0) {
              setContextMenu(null);
              return null;
            }
            
            const contextMessage = messages.find(m => m && m.id === contextMenu.messageId);
            if (!contextMessage) {
              setContextMenu(null);
              return null;
            }
            
            const contactPhone = conversation.contactos?.telefono || conversation.telefono || '';
            const isContextOwnMessage = contextMessage.remitente !== contactPhone;
            const contextMessageContent = contextMessage.mensaje || '';
            
            return (
              <div
                ref={contextMenuRef}
                className="fixed bg-white rounded-lg shadow-2xl border border-gray-200 py-2 z-50 min-w-[200px]"
                style={{
                  left: `${Math.min(contextMenu.x, typeof window !== 'undefined' ? window.innerWidth - 220 : contextMenu.x)}px`,
                  top: `${Math.max(contextMenu.y - 300, 10)}px`,
                }}
                onClick={(e) => e.stopPropagation()}
                onMouseDown={(e) => e.stopPropagation()}
              >
              <button
                onClick={() => {
                  handleReply(contextMessage);
                }}
                className="w-full px-4 py-2 text-left text-sm text-gray-700 hover:bg-gray-100 flex items-center gap-3"
              >
                <HiOutlineReply className="w-4 h-4" />
                Responder
              </button>
              <button
                onClick={() => {
                  navigator.clipboard.writeText(contextMessageContent);
                  setContextMenu(null);
                }}
                className="w-full px-4 py-2 text-left text-sm text-gray-700 hover:bg-gray-100 flex items-center gap-3"
              >
                <HiOutlineClipboardCopy className="w-4 h-4" />
                Copiar
              </button>
              <button
                onClick={() => {
                  handleForwardMessage(contextMenu.messageId);
                }}
                className="w-full px-4 py-2 text-left text-sm text-gray-700 hover:bg-gray-100 flex items-center gap-3"
              >
                <HiOutlineArrowRight className="w-4 h-4" />
                Reenviar
              </button>
              <button
                onClick={() => {
                  handleStarMessage(contextMenu.messageId);
                }}
                className={`w-full px-4 py-2 text-left text-sm hover:bg-gray-100 flex items-center gap-3 ${
                  starredMessages.has(contextMenu.messageId) ? 'text-yellow-600' : 'text-gray-700'
                }`}
              >
                {starredMessages.has(contextMenu.messageId) ? (
                  <HiStar className="w-4 h-4 text-yellow-600" />
                ) : (
                  <HiOutlineStar className="w-4 h-4" />
                )}
                Destacar
              </button>
              <button
                onClick={() => {
                  handlePinMessage(contextMenu.messageId);
                }}
                className={`w-full px-4 py-2 text-left text-sm hover:bg-gray-100 flex items-center gap-3 ${
                  pinnedMessages.has(contextMenu.messageId) ? 'text-primary' : 'text-gray-700'
                }`}
              >
                {pinnedMessages.has(contextMenu.messageId) ? (
                  <HiBookmark className="w-4 h-4 text-primary" />
                ) : (
                  <HiOutlineBookmark className="w-4 h-4" />
                )}
                Fijar
              </button>
              {isContextOwnMessage && (
                <>
                  <button
                    onClick={() => {
                      setEditingMessage(contextMenu.messageId);
                      setEditMessageText(contextMessageContent);
                      setContextMenu(null);
                    }}
                    className="w-full px-4 py-2 text-left text-sm text-gray-700 hover:bg-gray-100 flex items-center gap-3"
                  >
                    <HiOutlinePencil className="w-4 h-4" />
                    Editar
                  </button>
                  <button
                    onClick={() => {
                      handleDeleteMessage(contextMenu.messageId);
                      setContextMenu(null);
                    }}
                    className="w-full px-4 py-2 text-left text-sm text-gray-800 hover:bg-primary-50 flex items-center gap-3"
                  >
                    <HiOutlineTrash className="w-4 h-4" />
                    Eliminar para mí
                  </button>
                </>
              )}
              <button
                onClick={() => {
                  handleSelectMessage(contextMenu.messageId);
                }}
                className={`w-full px-4 py-2 text-left text-sm hover:bg-gray-100 flex items-center gap-3 ${
                  selectedMessages.has(contextMenu.messageId) ? 'text-primary' : 'text-gray-700'
                }`}
              >
                <div className={`w-4 h-4 border-2 rounded flex items-center justify-center ${
                  selectedMessages.has(contextMenu.messageId) ? 'bg-primary border-primary' : 'border-gray-400'
                }`}>
                  {selectedMessages.has(contextMenu.messageId) && (
                    <HiCheck className="w-3 h-3 text-white" />
                  )}
                </div>
                Seleccionar
              </button>
              <button
                onClick={() => {
                  handleShareMessage(contextMenu.messageId);
                }}
                className="w-full px-4 py-2 text-left text-sm text-gray-700 hover:bg-gray-100 flex items-center gap-3"
              >
                <HiOutlineShare className="w-4 h-4" />
                Compartir
              </button>
              <div className="border-t border-gray-200 my-1"></div>
              <div className="flex items-center gap-1 px-2">
                {['👍', '❤️', '😂', '😮', '😢', '🙏'].map((emoji) => (
                  <button
                    key={emoji}
                    onClick={() => {
                      handleAddReaction(contextMenu.messageId, emoji);
                      setContextMenu(null);
                    }}
                    className="p-2 hover:bg-gray-100 rounded-full transition-colors text-lg"
                  >
                    {emoji}
                  </button>
                ))}
              </div>
            </div>
            );
          } catch (error) {
            console.error('Error rendering context menu:', error);
            setContextMenu(null);
            return null;
          }
        })()}
        
        {messages.length === 0 && (
          <div className="flex items-center justify-center h-full">
            <div className="text-center">
              <p className="text-gray-400 text-sm">No hay mensajes aún</p>
              <p className="text-gray-300 text-xs mt-1">Comienza la conversación</p>
            </div>
          </div>
        )}
      </div>

      {/* Input de mensaje */}
      <div className="p-4 border-t border-gray-200 bg-white flex-shrink-0 shadow-lg">
        {/* Selector de emojis */}
        {showEmojiPicker && (
          <div
            ref={emojiPickerRef}
            className="absolute bottom-20 left-4 right-4 bg-white border border-gray-200 rounded-lg shadow-xl p-4 z-50 transform transition-all duration-200"
            style={{ maxHeight: '300px' }}
          >
            <div className="flex items-center justify-between mb-3">
              <h4 className="text-sm font-semibold text-gray-700">Emojis</h4>
              <button
                onClick={() => setShowEmojiPicker(false)}
                className="p-1 rounded hover:bg-gray-100 transition-colors"
              >
                <HiX className="w-4 h-4 text-gray-500" />
              </button>
            </div>
            <div className="flex gap-2 mb-3 border-b border-gray-200 pb-2">
              {Object.keys(EMOJI_CATEGORIES).map((cat) => (
                <button
                  key={cat}
                  onClick={() => setEmojiCategory(cat as keyof typeof EMOJI_CATEGORIES)}
                  className={`px-3 py-1 text-xs rounded-lg transition-colors ${
                    emojiCategory === cat
                      ? 'bg-primary text-white'
                      : 'bg-gray-100 text-gray-700 hover:bg-gray-200'
                  }`}
                >
                  {cat}
                </button>
              ))}
            </div>
            <div className="grid grid-cols-8 gap-2 overflow-y-auto" style={{ maxHeight: '200px' }}>
              {EMOJI_CATEGORIES[emojiCategory].map((emoji) => (
                <button
                  key={emoji}
                  onClick={() => insertEmoji(emoji)}
                  className="text-2xl hover:bg-gray-100 rounded-lg p-2 transition-colors active:scale-90"
                  title={emoji}
                >
                  {emoji}
                </button>
              ))}
            </div>
          </div>
        )}
        
        <form onSubmit={handleSendMessage} className="flex items-end gap-2 px-2">
          {/* Botón emoji - izquierda (como WhatsApp Web) */}
          <button
            type="button"
            onClick={() => setShowEmojiPicker(!showEmojiPicker)}
            className={`p-2.5 rounded-full transition-all duration-150 flex-shrink-0 ${
              showEmojiPicker 
                ? 'bg-primary-100 text-primary' 
                : 'hover:bg-gray-100 active:bg-gray-200 text-gray-600'
            }`}
            title="Emojis"
          >
            <HiOutlineEmojiHappy className="w-5 h-5" />
          </button>

          {/* Campo de texto - centro */}
          <div className="flex-1 relative">
            <textarea
              ref={textareaRef}
              value={newMessage}
              onChange={handleMessageChange}
              onKeyDown={handleKeyDown}
              placeholder="Escribe un mensaje"
              rows={1}
              className="w-full px-4 py-2.5 border border-gray-300 rounded-2xl focus:ring-2 focus:ring-primary focus:border-primary resize-none transition-all duration-200 text-gray-900"
              style={{ 
                minHeight: '44px', 
                maxHeight: '120px',
                lineHeight: '1.5'
              }}
            />
            
            {/* Sugerencias de respuestas rápidas */}
            {showQuickReplySuggestions && filteredQuickReplies.length > 0 && (
              <div className="absolute bottom-full left-0 right-0 mb-2 bg-white border border-gray-200 rounded-lg shadow-xl max-h-60 overflow-y-auto z-50">
                {filteredQuickReplies.map((reply, index) => {
                  const codigo = reply.codigo || reply.nombre.substring(0, 3).toUpperCase();
                  return (
                    <button
                      key={reply.id}
                      onClick={() => insertQuickReply(reply)}
                      className={`w-full text-left px-4 py-2 hover:bg-gray-50 transition-colors ${
                        index === selectedQuickReplyIndex ? 'bg-primary-50 border-l-4 border-primary' : ''
                      }`}
                    >
                      <div className="flex items-center justify-between">
                        <div className="flex-1">
                          <div className="flex items-center gap-2">
                            <span className="text-xs font-mono text-gray-500">/{codigo}</span>
                            <span className="text-sm font-medium text-gray-900">{reply.nombre}</span>
                          </div>
                          <p className="text-xs text-gray-600 mt-0.5 truncate">{reply.mensaje.substring(0, 50)}...</p>
                        </div>
                      </div>
                    </button>
                  );
                })}
              </div>
            )}
          </div>

          {/* Botón adjuntar - solo cuando no hay texto (como WhatsApp Web) */}
          {!newMessage.trim() && (
            <button
              type="button"
              className="p-2.5 rounded-full hover:bg-gray-100 active:bg-gray-200 transition-all duration-150 flex-shrink-0"
              title="Adjuntar archivo"
            >
              <HiOutlinePaperClip className="w-5 h-5 text-gray-600" />
            </button>
          )}

          {/* Botón enviar/micrófono - derecha */}
          {newMessage.trim() ? (
            <button
              type="submit"
              disabled={sending}
              className="p-2.5 bg-primary hover:bg-primary-dark text-white rounded-full transition-all duration-200 disabled:opacity-50 disabled:cursor-not-allowed active:scale-95 shadow-md hover:shadow-lg disabled:shadow-none flex-shrink-0"
              title="Enviar mensaje"
            >
              {sending ? (
                <div className="w-5 h-5 border-2 border-white border-t-transparent rounded-full animate-spin" />
              ) : (
                <HiPaperAirplane className="w-5 h-5" />
              )}
            </button>
          ) : (
            <button
              type="button"
              onMouseDown={handleStartRecording}
              onMouseUp={handleStopRecording}
              onMouseLeave={handleStopRecording}
              onTouchStart={handleStartRecording}
              onTouchEnd={handleStopRecording}
              className={`p-2.5 rounded-full transition-all duration-200 flex-shrink-0 ${
                isRecording 
                  ? 'bg-primary hover:bg-primary-dark text-white animate-pulse' 
                  : 'bg-primary hover:bg-primary-dark text-white'
              } shadow-md hover:shadow-lg active:scale-95`}
              title={isRecording ? `Grabando... ${formatRecordingTime(recordingTime)}` : "Mantén presionado para grabar audio"}
            >
              {isRecording ? (
                <div className="flex items-center gap-1">
                  <div className="w-2 h-2 bg-white rounded-full animate-pulse"></div>
                  <span className="text-xs font-medium">{formatRecordingTime(recordingTime)}</span>
                </div>
              ) : (
                <HiOutlineMicrophone className="w-5 h-5" />
              )}
            </button>
          )}
        </form>
      </div>

      {showForwardModal && forwardMessage && (
        <div className="fixed inset-0 z-50 bg-gray-900/40 flex items-center justify-center px-4 py-8">
          <div className="bg-white w-full max-w-lg rounded-2xl shadow-2xl p-6 relative">
            <button
              onClick={() => {
                setShowForwardModal(false);
                setForwardSelectedConversation(null);
                setForwardMessage(null);
              }}
              className="absolute top-4 right-4 p-2 rounded-full hover:bg-gray-100 text-gray-500"
            >
              <HiX className="w-5 h-5" />
            </button>
            <h3 className="text-lg font-semibold text-gray-900 mb-1">Reenviar mensaje</h3>
            <p className="text-sm text-gray-500 mb-4">Selecciona una conversación destino</p>

            <div className="bg-gray-50 border border-gray-200 rounded-lg p-3 mb-4">
              <p className="text-xs text-gray-500 uppercase mb-1">Mensaje</p>
              <p className="text-sm text-gray-800 whitespace-pre-wrap break-words">
                {forwardMessage.mensaje}
              </p>
            </div>

            <div>
              <label className="text-xs font-medium text-gray-600 uppercase tracking-wide">
                Buscar conversación
              </label>
              <div className="relative mt-1">
                <HiOutlineSearch className="absolute left-3 top-1/2 -translate-y-1/2 text-gray-400 w-4 h-4" />
                <input
                  type="text"
                  value={forwardSearch}
                  onChange={(e) => setForwardSearch(e.target.value)}
                  placeholder="Nombre o número"
                  className="w-full rounded-full border border-gray-200 pl-9 pr-3 py-2 text-sm text-gray-900 placeholder:text-gray-400 focus:border-primary focus:ring-2 focus:ring-primary/30"
                />
              </div>
            </div>

            <div className="mt-4 max-h-72 overflow-y-auto space-y-2">
              {forwardLoading ? (
                <p className="text-xs text-gray-500">Cargando conversaciones...</p>
              ) : filteredForwardConversations.length === 0 ? (
                <p className="text-xs text-gray-500">No hay conversaciones que coincidan.</p>
              ) : (
                filteredForwardConversations.map((conv) => {
                  const contactLabel = conv.contactos?.nombre || conv.telefono || 'Sin nombre';
                  const phoneLabel = conv.contactos?.telefono || conv.telefono || '';
                  const isSelected = forwardSelectedConversation?.id === conv.id;
                  return (
                    <button
                      key={conv.id}
                      onClick={() => setForwardSelectedConversation(conv)}
                      className={`w-full text-left rounded-xl border px-3 py-2 flex flex-col transition-colors ${
                        isSelected
                          ? 'border-primary bg-primary-50 text-gray-900'
                          : 'border-gray-200 hover:bg-gray-50'
                      }`}
                    >
                      <span className="text-sm font-medium truncate">{contactLabel}</span>
                      <span className="text-xs text-gray-500 truncate">{phoneLabel}</span>
                    </button>
                  );
                })
              )}
            </div>

            <div className="mt-5 flex items-center justify-end gap-3">
              <button
                onClick={() => {
                  setShowForwardModal(false);
                  setForwardSelectedConversation(null);
                  setForwardMessage(null);
                }}
                className="text-sm font-medium text-gray-600 hover:text-gray-900"
              >
                Cancelar
              </button>
              <button
                onClick={handleConfirmForward}
                disabled={!forwardSelectedConversation || forwardSubmitting}
                className="inline-flex items-center gap-2 rounded-full bg-primary px-5 py-2 text-sm font-semibold text-white shadow-sm hover:bg-primary-dark disabled:opacity-70 disabled:cursor-not-allowed"
              >
                {forwardSubmitting ? 'Reenviando...' : 'Reenviar'}
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}

