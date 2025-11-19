'use client';

import { useState, useEffect, useRef } from 'react';
import { Conversation, InboxType } from '@/lib/types/crm';
import { User } from '@/lib/types';
import { Search, Filter, MoreVertical } from 'lucide-react';
import { formatDistanceToNow } from 'date-fns';
import { createClient } from '@/lib/supabase/client';

interface ConversationListProps {
  conversations: Conversation[];
  selectedConversation: Conversation | null;
  onSelectConversation: (conversation: Conversation) => void;
  selectedInbox: InboxType;
  loading: boolean;
  user: User | null;
}

export default function ConversationList({
  conversations,
  selectedConversation,
  onSelectConversation,
  selectedInbox,
  loading,
  user,
}: ConversationListProps) {
  const [searchQuery, setSearchQuery] = useState('');
  const [filterStatus, setFilterStatus] = useState<string>('all');
  const [filterTab, setFilterTab] = useState<'mine' | 'unassigned' | 'all'>('mine');
  const [lastMessages, setLastMessages] = useState<Record<string, string>>({});
  const listContainerRef = useRef<HTMLDivElement>(null);
  const supabase = createClient();

  // Cargar último mensaje de cada conversación
  useEffect(() => {
    const loadLastMessages = async () => {
      const messagesMap: Record<string, string> = {};
      
      for (const conv of conversations) {
        try {
          const { data, error } = await supabase
            .from('mensajes')
            .select('mensaje')
            .eq('conversacion_id', conv.id)
            .order('timestamp', { ascending: false })
            .limit(1)
            .single();

          if (!error && data) {
            messagesMap[conv.id] = data.mensaje;
          }
        } catch (error) {
          // Ignorar errores individuales
        }
      }

      setLastMessages(messagesMap);
    };

    if (conversations.length > 0) {
      loadLastMessages();
    }
  }, [conversations]);

  const filteredConversations = conversations.filter((conv) => {
    const contactName = conv.contactos?.nombre || '';
    const contactPhone = conv.contactos?.telefono || conv.telefono || '';
    const lastMsg = lastMessages[conv.id] || '';

    const matchesSearch =
      contactName.toLowerCase().includes(searchQuery.toLowerCase()) ||
      contactPhone.includes(searchQuery) ||
      lastMsg.toLowerCase().includes(searchQuery.toLowerCase());

    const matchesStatus = filterStatus === 'all' || conv.estado === filterStatus;

    // Filtro por tab
    let matchesTab = true;
    if (filterTab === 'mine') {
      matchesTab = !!conv.asignado_a && conv.asignado_a === user?.id;
    } else if (filterTab === 'unassigned') {
      matchesTab = !conv.asignado_a;
    }

    return matchesSearch && matchesStatus && matchesTab;
  });

  const getStatusColor = (status: string) => {
    switch (status?.toLowerCase()) {
      case 'nueva':
        return 'bg-blue-100 text-blue-700';
      case 'activa':
        return 'bg-green-100 text-green-700';
      case 'esperando':
        return 'bg-yellow-100 text-yellow-700';
      case 'resuelta':
        return 'bg-gray-100 text-gray-700';
      case 'cerrada':
        return 'bg-gray-200 text-gray-600';
      default:
        return 'bg-gray-100 text-gray-700';
    }
  };

  const mineCount = conversations.filter((c) => c.asignado_a === user?.id).length;
  const unassignedCount = conversations.filter((c) => !c.asignado_a).length;
  const allCount = conversations.length;

  // Scroll automático al inicio cuando cambian las conversaciones o el inbox
  useEffect(() => {
    if (listContainerRef.current && !loading && filteredConversations.length > 0) {
      // Scroll suave al inicio (donde están las conversaciones más recientes)
      requestAnimationFrame(() => {
        setTimeout(() => {
          if (listContainerRef.current) {
            listContainerRef.current.scrollTo({
              top: 0,
              behavior: 'smooth',
            });
          }
        }, 100);
      });
    }
  }, [selectedInbox, filteredConversations.length, loading]);

  // Scroll automático cuando se agregan nuevas conversaciones
  useEffect(() => {
    if (listContainerRef.current && conversations.length > 0) {
      // Solo hacer scroll si el usuario está cerca del inicio (top)
      const container = listContainerRef.current;
      const isNearTop = container.scrollTop < 100;
      
      if (isNearTop) {
        requestAnimationFrame(() => {
          setTimeout(() => {
            if (listContainerRef.current) {
              listContainerRef.current.scrollTo({
                top: 0,
                behavior: 'smooth',
              });
            }
          }, 150);
        });
      }
    }
  }, [conversations.length]);

  return (
    <div className="w-[300px] bg-white border-r border-gray-200 flex flex-col">
      {/* Header */}
      <div className="p-4 border-b border-gray-200 space-y-3">
        <div className="flex items-center justify-between">
          <h2 className="text-lg font-semibold text-gray-900">Conversaciones</h2>
          <div className="flex items-center gap-2">
            <button className="p-1.5 rounded-lg hover:bg-gray-100 transition-colors">
              <Filter className="w-4 h-4 text-gray-600" />
            </button>
            <button className="p-1.5 rounded-lg hover:bg-gray-100 transition-colors">
              <MoreVertical className="w-4 h-4 text-gray-600" />
            </button>
          </div>
        </div>

        {/* Barra de búsqueda */}
        <div className="relative">
          <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 w-4 h-4 text-gray-400" />
          <input
            type="text"
            placeholder="Buscar conversaciones..."
            value={searchQuery}
            onChange={(e) => setSearchQuery(e.target.value)}
            className="w-full pl-10 pr-3 py-2 border border-gray-300 rounded-lg text-sm focus:ring-2 focus:ring-primary focus:border-primary"
          />
        </div>

        {/* Filtro de estado */}
        <select
          value={filterStatus}
          onChange={(e) => setFilterStatus(e.target.value)}
          className="w-full text-xs border border-gray-300 rounded px-2 py-1 focus:ring-1 focus:ring-primary"
        >
          <option value="all">Todos los estados</option>
          <option value="nueva">Nueva</option>
          <option value="activa">Activa</option>
          <option value="esperando">Esperando</option>
          <option value="resuelta">Resuelta</option>
          <option value="cerrada">Cerrada</option>
        </select>

        {/* Tabs */}
        <div className="flex gap-1 border-b border-gray-200 -mb-3">
          <button
            onClick={() => setFilterTab('mine')}
            className={`px-3 py-1.5 text-xs font-medium transition-colors ${
              filterTab === 'mine'
                ? 'text-primary border-b-2 border-primary'
                : 'text-gray-600 hover:text-gray-900'
            }`}
          >
            Mías ({mineCount})
          </button>
          <button
            onClick={() => setFilterTab('unassigned')}
            className={`px-3 py-1.5 text-xs font-medium transition-colors ${
              filterTab === 'unassigned'
                ? 'text-primary border-b-2 border-primary'
                : 'text-gray-600 hover:text-gray-900'
            }`}
          >
            Sin asignar ({unassignedCount})
          </button>
          <button
            onClick={() => setFilterTab('all')}
            className={`px-3 py-1.5 text-xs font-medium transition-colors ${
              filterTab === 'all'
                ? 'text-primary border-b-2 border-primary'
                : 'text-gray-600 hover:text-gray-900'
            }`}
          >
            Todos ({allCount})
          </button>
        </div>
      </div>

      {/* Lista de conversaciones con scroll automático */}
      <div 
        ref={listContainerRef}
        className="flex-1 overflow-y-auto"
        style={{ 
          scrollBehavior: 'smooth',
          overscrollBehavior: 'contain'
        }}
      >
        {loading ? (
          <div className="flex items-center justify-center h-full">
            <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-primary"></div>
          </div>
        ) : filteredConversations.length === 0 ? (
          <div className="flex flex-col items-center justify-center h-full text-center p-4">
            <p className="text-sm text-gray-500">No hay conversaciones</p>
            <p className="text-xs text-gray-400 mt-1">
              {searchQuery ? 'Intenta con otros términos de búsqueda' : 'Las nuevas conversaciones aparecerán aquí'}
            </p>
          </div>
        ) : (
          <div className="divide-y divide-gray-100">
            {filteredConversations.map((conversation) => {
              const isSelected = selectedConversation?.id === conversation.id;
              const contactName = conversation.contactos?.nombre || conversation.telefono || 'Sin nombre';
              const contactPhone = conversation.contactos?.telefono || conversation.telefono || '';
              const lastMessageTime = conversation.ts_ultimo_mensaje
                ? formatDistanceToNow(new Date(conversation.ts_ultimo_mensaje), {
                    addSuffix: true,
                  })
                : '';
              const lastMessage = lastMessages[conversation.id] || '';

              return (
                <button
                  key={conversation.id}
                  onClick={() => onSelectConversation(conversation)}
                  className={`w-full p-3 text-left hover:bg-gray-50 transition-colors ${
                    isSelected ? 'bg-primary/5 border-l-4 border-primary' : ''
                  }`}
                >
                  <div className="flex items-start gap-3">
                    {/* Avatar */}
                    <div className="w-10 h-10 rounded-full bg-blue-100 flex items-center justify-center flex-shrink-0">
                      <span className="text-sm font-medium text-blue-700">
                        {contactName.charAt(0).toUpperCase()}
                      </span>
                    </div>

                    {/* Contenido */}
                    <div className="flex-1 min-w-0">
                      <div className="flex items-center justify-between gap-2 mb-1">
                        <span className="text-sm font-medium text-gray-900 truncate">
                          {contactName}
                        </span>
                        {lastMessageTime && (
                          <span className="text-xs text-gray-500 flex-shrink-0">
                            {lastMessageTime}
                          </span>
                        )}
                      </div>

                      <div className="flex items-center gap-2 mb-1">
                        {lastMessage && (
                          <p className="text-xs text-gray-600 truncate flex-1">
                            {lastMessage}
                          </p>
                        )}
                        {conversation.unread_count && conversation.unread_count > 0 && (
                          <span className="bg-primary text-white text-xs px-1.5 py-0.5 rounded-full flex-shrink-0">
                            {conversation.unread_count}
                          </span>
                        )}
                      </div>

                      <div className="flex items-center gap-2">
                        <span className={`text-xs px-2 py-0.5 rounded ${getStatusColor(conversation.estado)}`}>
                          {conversation.estado || 'activa'}
                        </span>
                        {contactPhone && (
                          <span className="text-xs text-gray-500 truncate">
                            {contactPhone}
                          </span>
                        )}
                        {!conversation.asignado_a && (
                          <span className="text-xs px-2 py-0.5 rounded bg-red-100 text-red-700">
                            Sin asignar
                          </span>
                        )}
                      </div>
                    </div>
                  </div>
                </button>
              );
            })}
          </div>
        )}
      </div>
    </div>
  );
}
