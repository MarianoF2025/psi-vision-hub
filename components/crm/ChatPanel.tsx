'use client';

import { useState, useEffect, useRef } from 'react';
import { User } from '@/lib/types';
import {
  Conversation,
  Message,
  ConversationStatus,
} from '@/lib/types/crm';
import { Send, Paperclip, Smile, MoreVertical, Check, CheckCheck, UserPlus } from 'lucide-react';
import { createClient } from '@/lib/supabase/client';
import { format } from 'date-fns';
import StatusSelector from './StatusSelector';
import AssignmentModal from './AssignmentModal';

interface ChatPanelProps {
  conversation: Conversation | null;
  user: User | null;
  onUpdateConversation: () => void;
}

export default function ChatPanel({ conversation, user, onUpdateConversation }: ChatPanelProps) {
  const [messages, setMessages] = useState<Message[]>([]);
  const [newMessage, setNewMessage] = useState('');
  const [sending, setSending] = useState(false);
  const [showAssignmentModal, setShowAssignmentModal] = useState(false);
  const messagesEndRef = useRef<HTMLDivElement>(null);
  const supabase = createClient();

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

  // Scroll automático al final cuando cambian los mensajes
  useEffect(() => {
    if (messages.length > 0) {
      // Usar setTimeout para asegurar que el DOM se actualizó
      setTimeout(() => {
        scrollToBottom();
      }, 100);
    }
  }, [messages]);

  // Scroll automático cuando se carga una nueva conversación
  useEffect(() => {
    if (conversation) {
      setTimeout(() => {
        scrollToBottom();
      }, 200);
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
      const transformedMessages: Message[] = (data || []).map((msg: any) => ({
        ...msg,
        conversation_id: msg.conversacion_id,
        content: msg.mensaje,
        from_phone: msg.remitente_nombre || msg.remitente,
        // Usar remitente_tipo si está disponible, sino comparar por teléfono
        is_from_contact: msg.remitente_tipo === 'contact' || 
                        msg.remitente === conversation.telefono || 
                        msg.remitente === conversation.contactos?.telefono,
      }));
      
      setMessages(transformedMessages);
    } catch (error) {
      console.error('Error loading messages:', error);
    }
  };

  const scrollToBottom = () => {
    if (messagesEndRef.current) {
      messagesEndRef.current.scrollIntoView({ 
        behavior: 'smooth',
        block: 'end',
        inline: 'nearest'
      });
    }
  };

  // Scroll automático cuando se envía un mensaje
  useEffect(() => {
    if (messages.length > 0 && !sending) {
      setTimeout(() => {
        scrollToBottom();
      }, 150);
    }
  }, [messages.length, sending]);

  const handleSendMessage = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!conversation || !newMessage.trim() || sending) return;

    setSending(true);
    try {
      // Enviar mensaje a través de la API
      const response = await fetch('/api/messages/send', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          conversacion_id: conversation.id,
          mensaje: newMessage.trim(),
          remitente: user?.email || 'system',
        }),
      });

      if (!response.ok) throw new Error('Error al enviar mensaje');

      setNewMessage('');
      await loadMessages();
      onUpdateConversation();
    } catch (error) {
      console.error('Error sending message:', error);
      alert('Error al enviar el mensaje. Por favor, intenta de nuevo.');
    } finally {
      setSending(false);
    }
  };

  if (!conversation) {
    return (
      <div className="flex-1 flex items-center justify-center bg-gray-50">
        <div className="text-center">
          <p className="text-gray-500 text-lg">Selecciona una conversación</p>
          <p className="text-gray-400 text-sm mt-2">
            Elige una conversación de la lista para comenzar a chatear
          </p>
        </div>
      </div>
    );
  }

  const contactName = conversation.contactos?.nombre || conversation.contactos?.telefono || conversation.telefono || 'Contacto';

  return (
    <div className="flex-1 flex flex-col bg-white">
      {/* Header del chat */}
      <div className="p-4 border-b border-gray-200 flex items-center justify-between bg-white">
        <div className="flex items-center gap-3">
          <div className="w-10 h-10 rounded-full bg-blue-100 flex items-center justify-center">
            <span className="text-sm font-medium text-blue-700">
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
            className="p-2 rounded-lg hover:bg-gray-100 transition-colors"
            title="Asignar conversación"
          >
            <UserPlus className="w-5 h-5 text-gray-600" />
          </button>
          <button className="p-2 rounded-lg hover:bg-gray-100 transition-colors">
            <MoreVertical className="w-5 h-5 text-gray-600" />
          </button>
        </div>
      </div>

      {/* Selector de estado */}
      {conversation && (
        <div className="px-4 py-2 border-b border-gray-200 bg-gray-50">
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

      {/* Área de mensajes con scroll automático */}
      <div 
        className="flex-1 overflow-y-auto bg-gray-50 p-4 space-y-4"
        style={{ 
          scrollBehavior: 'smooth',
          overscrollBehavior: 'contain'
        }}
      >
        {messages.map((message) => {
          // Determinar si el mensaje es del contacto
          const contactPhone = conversation.contactos?.telefono || conversation.telefono;
          const isFromContact = message.remitente === contactPhone;
          const messageDate = format(new Date(message.timestamp), 'HH:mm');
          const messageContent = message.mensaje || '';

          return (
            <div
              key={message.id}
              className={`flex ${isFromContact ? 'justify-start' : 'justify-end'}`}
            >
              <div
                className={`max-w-[70%] rounded-lg px-4 py-2 ${
                  isFromContact
                    ? 'bg-white border border-gray-200'
                    : 'bg-primary text-white'
                }`}
              >
                <p className={`text-sm ${isFromContact ? 'text-gray-900' : 'text-white'}`}>
                  {messageContent}
                </p>
                <div
                  className={`flex items-center gap-1 mt-1 text-xs ${
                    isFromContact ? 'text-gray-500' : 'text-white/70'
                  }`}
                >
                  <span>{messageDate}</span>
                  {!isFromContact && (
                    <span>
                      {message.estado === 'read' ? (
                        <CheckCheck className="w-3 h-3 inline" />
                      ) : message.estado === 'delivered' ? (
                        <CheckCheck className="w-3 h-3 inline opacity-50" />
                      ) : (
                        <Check className="w-3 h-3 inline" />
                      )}
                    </span>
                  )}
                </div>
              </div>
            </div>
          );
        })}
        <div ref={messagesEndRef} />
      </div>

      {/* Input de mensaje */}
      <div className="p-4 border-t border-gray-200 bg-white">
        <form onSubmit={handleSendMessage} className="flex items-end gap-2">
          <div className="flex-1 flex items-end gap-2">
            <button
              type="button"
              className="p-2 rounded-lg hover:bg-gray-100 transition-colors"
              title="Adjuntar archivo"
            >
              <Paperclip className="w-5 h-5 text-gray-600" />
            </button>
            <div className="flex-1 relative">
              <textarea
                value={newMessage}
                onChange={(e) => setNewMessage(e.target.value)}
                onKeyDown={(e) => {
                  if (e.key === 'Enter' && !e.shiftKey) {
                    e.preventDefault();
                    handleSendMessage(e);
                  }
                }}
                placeholder="Escribe un mensaje..."
                rows={1}
                className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-primary focus:border-primary resize-none"
                style={{ minHeight: '40px', maxHeight: '120px' }}
              />
            </div>
            <button
              type="button"
              className="p-2 rounded-lg hover:bg-gray-100 transition-colors"
              title="Emojis"
            >
              <Smile className="w-5 h-5 text-gray-600" />
            </button>
          </div>
          <button
            type="submit"
            disabled={!newMessage.trim() || sending}
            className="p-2 bg-primary hover:bg-primary-dark text-white rounded-lg transition-colors disabled:opacity-50 disabled:cursor-not-allowed"
          >
            <Send className="w-5 h-5" />
          </button>
        </form>
      </div>
    </div>
  );
}

