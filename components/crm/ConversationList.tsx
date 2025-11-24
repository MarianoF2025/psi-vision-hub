'use client';

import { useState, useEffect, useRef, FormEvent } from 'react';
import { Conversation, InboxType, Contact } from '@/lib/types/crm';
import { User } from '@/lib/types';
// Iconos modernos de react-icons
import {
  HiOutlineSearch,
  HiOutlineFilter,
  HiOutlineDotsVertical,
  HiOutlineChat,
  HiOutlinePlusSm,
  HiOutlineX,
  HiOutlineUserGroup,
  HiOutlineUserAdd,
} from 'react-icons/hi';
import { formatDistanceToNow } from 'date-fns';
import { createClient } from '@/lib/supabase/client';
import { getAreaFromInbox, getInboxFromArea } from '@/lib/crm/inboxMap';

interface ConversationListProps {
  conversations: Conversation[];
  selectedConversation: Conversation | null;
  onSelectConversation: (conversation: Conversation) => void;
  selectedInbox: InboxType;
  loading: boolean;
  user: User | null;
  onChangeInbox?: (inbox: InboxType) => void;
  onConversationCreated?: (conversation: Conversation) => void;
}

export default function ConversationList({
  conversations,
  selectedConversation,
  onSelectConversation,
  selectedInbox,
  loading,
  user,
  onChangeInbox,
  onConversationCreated,
}: ConversationListProps) {
  const [searchQuery, setSearchQuery] = useState('');
  const [filterStatus, setFilterStatus] = useState<string>('all');
  const [filterTab, setFilterTab] = useState<'mine' | 'unassigned' | 'all'>('mine');
  const [filterDays, setFilterDays] = useState<string>('all');
  const [sortOrder, setSortOrder] = useState<'newest' | 'oldest'>('newest');
  const [lastMessages, setLastMessages] = useState<Record<string, string>>({});
  const [showNewChatPanel, setShowNewChatPanel] = useState(false);
  const [showNewConversationModal, setShowNewConversationModal] = useState(false);
  const [newContactPhone, setNewContactPhone] = useState('');
  const [newContactName, setNewContactName] = useState('');
  const [creationError, setCreationError] = useState<string | null>(null);
  const [creatingConversation, setCreatingConversation] = useState(false);
  const [contacts, setContacts] = useState<Contact[]>([]);
  const [contactsLoading, setContactsLoading] = useState(false);
  const [contactsError, setContactsError] = useState<string | null>(null);
  const listContainerRef = useRef<HTMLDivElement>(null);
  const newChatSearchRef = useRef<HTMLInputElement>(null);
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

    // Filtro por días desde última conversación
    let matchesDays = true;
    if (filterDays !== 'all' && conv.ts_ultimo_mensaje) {
      const lastMessageDate = new Date(conv.ts_ultimo_mensaje);
      const daysAgo = Math.floor((Date.now() - lastMessageDate.getTime()) / (1000 * 60 * 60 * 24));
      matchesDays = daysAgo <= parseInt(filterDays);
    }

    return matchesSearch && matchesStatus && matchesTab && matchesDays;
  }).sort((a, b) => {
    // Ordenamiento por fecha
    if (!a.ts_ultimo_mensaje && !b.ts_ultimo_mensaje) return 0;
    if (!a.ts_ultimo_mensaje) return 1;
    if (!b.ts_ultimo_mensaje) return -1;
    
    const dateA = new Date(a.ts_ultimo_mensaje).getTime();
    const dateB = new Date(b.ts_ultimo_mensaje).getTime();
    
    return sortOrder === 'newest' ? dateB - dateA : dateA - dateB;
  });

  const getStatusColor = (status: string) => {
    switch (status?.toLowerCase()) {
      case 'nueva':
        return 'bg-primary-50 text-gray-800 border border-primary-200';
      case 'activa':
        return 'bg-green-50 text-green-700 border border-green-200';
      case 'esperando':
        return 'bg-yellow-50 text-yellow-700 border border-yellow-200';
      case 'resuelta':
        return 'bg-gray-50 text-gray-700 border border-gray-200';
      case 'cerrada':
        return 'bg-gray-100 text-gray-600 border border-gray-300';
      default:
        return 'bg-gray-50 text-gray-700 border border-gray-200';
    }
  };

  const openOrCreateConversationForContact = async (contact: Contact) => {
    try {
      const { data: existingConversation, error: existingConvError } = await supabase
        .from('conversaciones')
        .select(`
          *,
          contactos (
            id,
            telefono,
            nombre
          )
        `)
        .eq('contacto_id', contact.id)
        .order('ts_ultimo_mensaje', { ascending: false, nullsFirst: false })
        .limit(1)
        .maybeSingle();

      if (existingConvError && existingConvError.code !== 'PGRST116') {
        throw existingConvError;
      }

      if (existingConversation) {
        setShowNewChatPanel(false);
        const targetInbox = getInboxFromArea(existingConversation.area);
        if (targetInbox && targetInbox !== selectedInbox) {
          onChangeInbox?.(targetInbox);
        }
        onSelectConversation(existingConversation as Conversation);
        return;
      }

      const areaValue = getAreaFromInbox(selectedInbox);
      const payload: Record<string, any> = {
        contacto_id: contact.id,
        telefono: contact.telefono,
        area: areaValue,
        estado: 'activa',
        ts_ultimo_mensaje: new Date().toISOString(),
      };

      if (user?.id) {
        payload.asignado_a = user.id;
      }

      const attemptInsert = async (insertPayload: Record<string, any>) =>
        supabase
          .from('conversaciones')
          .insert(insertPayload)
          .select(`
            *,
            contactos (
              id,
              telefono,
              nombre
            )
          `)
          .single();

      let { data: insertedConversation, error: conversationError } = await attemptInsert(payload);

      if (conversationError && conversationError.message?.includes('asignado_a')) {
        const { asignado_a, ...fallbackPayload } = payload;
        ({ data: insertedConversation, error: conversationError } = await attemptInsert(fallbackPayload));
      }

      if (conversationError || !insertedConversation) {
        throw conversationError || new Error('No se pudo crear la conversación');
      }

      setShowNewChatPanel(false);
      onSelectConversation(insertedConversation as Conversation);
      onConversationCreated?.(insertedConversation as Conversation);
    } catch (error: any) {
      console.error('Error al abrir conversación:', error);
      setCreationError(error?.message || 'No se pudo abrir la conversación');
    }
  };

  const mineCount = conversations.filter((c) => c.asignado_a === user?.id).length;
  const unassignedCount = conversations.filter((c) => !c.asignado_a).length;
  const allCount = conversations.length;

  const handleCreateConversation = async (event: FormEvent) => {
    event.preventDefault();
    setCreationError(null);
    const sanitizedPhone = newContactPhone.replace(/[^\d+]/g, '');

    if (!sanitizedPhone || sanitizedPhone.length < 8) {
      setCreationError('Ingresa un teléfono válido con al menos 8 dígitos.');
      return;
    }

    setCreatingConversation(true);

    try {
      const { data: existingContact, error: contactError } = await supabase
        .from('contactos')
        .select('*')
        .eq('telefono', sanitizedPhone)
        .maybeSingle();

      if (contactError && contactError.code !== 'PGRST116') {
        throw contactError;
      }

      let finalContact = existingContact;

      if (!finalContact) {
        const { data: newContact, error: insertContactError } = await supabase
          .from('contactos')
          .insert({
            telefono: sanitizedPhone,
            nombre: newContactName.trim() || sanitizedPhone,
          })
          .select()
          .single();

        if (insertContactError) {
          throw insertContactError;
        }

        finalContact = newContact;
      }

      if (!finalContact) {
        throw new Error('No se pudo crear el contacto.');
      }

      const { data: existingConversation, error: existingConvError } = await supabase
        .from('conversaciones')
        .select(`
          *,
          contactos (
            id,
            telefono,
            nombre
          )
        `)
        .eq('contacto_id', finalContact.id)
        .order('ts_ultimo_mensaje', { ascending: false, nullsFirst: false })
        .limit(1)
        .maybeSingle();

      if (existingConvError && existingConvError.code !== 'PGRST116') {
        throw existingConvError;
      }

      if (existingConversation) {
        setShowNewConversationModal(false);
        setNewContactPhone('');
        setNewContactName('');
        setCreationError(null);

        const targetInbox = getInboxFromArea(existingConversation.area);
        if (targetInbox && targetInbox !== selectedInbox) {
          onChangeInbox?.(targetInbox);
        }

        onSelectConversation(existingConversation as Conversation);
        onConversationCreated?.(existingConversation as Conversation);
        return;
      }

      await openOrCreateConversationForContact({
        id: finalContact.id,
        telefono: sanitizedPhone,
        nombre: finalContact.nombre,
      } as Contact);

      setShowNewConversationModal(false);
      setNewContactPhone('');
      setNewContactName('');
      setCreationError(null);
      return;
    } catch (error: any) {
      console.error('Error creating conversation:', error);
      setCreationError(error?.message || 'No se pudo crear la conversación.');
    } finally {
      setCreatingConversation(false);
    }
  };

  const frequentConversations = conversations.slice(0, 5);
  const filteredContacts = contacts.filter((contact) => {
    if (!searchQuery) return true;
    const normalized = searchQuery.toLowerCase();
    return (
      (contact.nombre || '').toLowerCase().includes(normalized) ||
      (contact.telefono || '').toLowerCase().includes(normalized)
    );
  });

  const normalizedPhoneSearch = searchQuery.replace(/[\s-]/g, '');
  const canCreateFromSearch =
    /^\+?\d{6,}$/.test(normalizedPhoneSearch) &&
    !contacts.some((c) => c.telefono?.replace(/[\s-]/g, '') === normalizedPhoneSearch);

  const openContactModalFromSearch = () => {
    setShowNewChatPanel(false);
    setShowNewConversationModal(true);
    setNewContactPhone(searchQuery);
    setNewContactName('');
    setCreationError(null);
  };

  // Scroll automático al inicio - SIMPLE Y DIRECTO
  useEffect(() => {
    if (listContainerRef.current && !loading && filteredConversations.length > 0) {
      // Scroll directo al inicio
      listContainerRef.current.scrollTop = 0;
    }
  }, [selectedInbox, loading]);

  // Scroll automático cuando se agregan nuevas conversaciones
  useEffect(() => {
    if (listContainerRef.current && conversations.length > 0) {
      const container = listContainerRef.current;
      // Solo hacer scroll si el usuario está cerca del inicio (top)
      if (container.scrollTop < 100) {
        container.scrollTop = 0;
      }
    }
  }, [conversations.length]);

  // Cargar contactos al abrir panel estilo WhatsApp
  useEffect(() => {
    if (!showNewChatPanel) return;

    const loadContacts = async () => {
      try {
        setContactsLoading(true);
        setContactsError(null);

        const { data, error } = await supabase
          .from('contactos')
          .select('id, nombre, telefono')
          .order('nombre', { ascending: true, nullsFirst: false })
          .limit(200);

        if (error) {
          setContactsError('No se pudieron cargar los contactos');
          return;
        }

        setContacts(data || []);
      } catch (error: any) {
        console.error('Error cargando contactos:', error);
        setContactsError(error?.message || 'Error inesperado al cargar contactos');
      } finally {
        setContactsLoading(false);
      }
    };

    loadContacts();
    const timeout = setTimeout(() => newChatSearchRef.current?.focus(), 150);
    return () => clearTimeout(timeout);
  }, [showNewChatPanel, supabase]);

  return (
    <div className="w-[300px] bg-white border-r border-gray-200 flex flex-col h-screen relative">
      {/* Header */}
      <div className="p-4 border-b border-gray-200 space-y-3 flex-shrink-0">
        <div className="flex items-center justify-between">
          <div className="flex items-center gap-3">
            <h2 className="text-lg font-semibold text-gray-900">Conversaciones</h2>
            <button
              onClick={() => {
                setShowNewChatPanel(true);
                setCreationError(null);
              }}
              className="inline-flex items-center gap-1.5 rounded-full bg-emerald-500 px-3 py-1 text-xs font-semibold text-white shadow-sm hover:bg-emerald-600 focus:outline-none focus:ring-2 focus:ring-emerald-400"
              title="Nuevo chat estilo WhatsApp"
            >
              <HiOutlinePlusSm className="w-4 h-4" />
              Nueva
            </button>
          </div>
          <div className="flex items-center gap-2">
            <button className="p-1.5 rounded-lg hover:bg-gray-100 transition-colors">
              <HiOutlineFilter className="w-4 h-4 text-gray-600" />
            </button>
            <button className="p-1.5 rounded-lg hover:bg-gray-100 transition-colors">
              <HiOutlineDotsVertical className="w-4 h-4 text-gray-600" />
            </button>
          </div>
        </div>

        {/* Barra de búsqueda */}
        <div className="relative">
          <HiOutlineSearch className="absolute left-3 top-1/2 transform -translate-y-1/2 w-4 h-4 text-gray-400" />
          <input
            type="text"
            placeholder="Buscar conversaciones..."
            value={searchQuery}
            onChange={(e) => setSearchQuery(e.target.value)}
            className="w-full pl-10 pr-3 py-2 border border-gray-300 rounded-lg text-sm focus:ring-2 focus:ring-primary focus:border-primary"
          />
        </div>

        <div className="grid grid-cols-2 gap-2">
          {/* Filtro de estado */}
          <select
            value={filterStatus}
            onChange={(e) => setFilterStatus(e.target.value)}
            className="w-full text-xs border border-gray-300 rounded px-2 py-1 focus:ring-1 focus:ring-primary text-gray-900"
          >
            <option value="all">Todos los estados</option>
            <option value="nueva">Nueva</option>
            <option value="activa">Activa</option>
            <option value="esperando">Esperando</option>
            <option value="resuelta">Resuelta</option>
            <option value="cerrada">Cerrada</option>
          </select>

          {/* Filtro por días desde última conversación */}
          <select
            value={filterDays}
            onChange={(e) => setFilterDays(e.target.value)}
            className="w-full text-xs border border-gray-300 rounded px-2 py-1 focus:ring-1 focus:ring-primary text-gray-900"
          >
            <option value="all">Cualquier fecha</option>
            <option value="1">Últimas 24 horas</option>
            <option value="7">Últimos 7 días</option>
            <option value="15">Últimos 15 días</option>
            <option value="20">Últimos 20 días</option>
            <option value="30">Últimos 30 días</option>
            <option value="60">Últimos 60 días</option>
            <option value="90">Últimos 90 días</option>
          </select>
        </div>

        {/* Ordenamiento */}
        <div className="flex items-center gap-2">
          <span className="text-xs text-gray-600">Ordenar:</span>
          <select
            value={sortOrder}
            onChange={(e) => setSortOrder(e.target.value as 'newest' | 'oldest')}
            className="flex-1 text-xs border border-gray-300 rounded px-2 py-1 focus:ring-1 focus:ring-primary text-gray-900"
          >
            <option value="newest">Más recientes primero</option>
            <option value="oldest">Más antiguos primero</option>
          </select>
        </div>

        {/* Tabs */}
        <div className="flex gap-1 border-b border-gray-200 -mb-3">
          <button
            onClick={() => setFilterTab('mine')}
            className={`px-3 py-1.5 text-xs font-medium transition-colors ${
              filterTab === 'mine'
                ? 'text-primary border-b-2 border-primary font-semibold'
                : 'text-gray-600 hover:text-gray-900'
            }`}
          >
            Mías ({mineCount})
          </button>
          <button
            onClick={() => setFilterTab('unassigned')}
            className={`px-3 py-1.5 text-xs font-medium transition-colors ${
              filterTab === 'unassigned'
                ? 'text-primary border-b-2 border-primary font-semibold'
                : 'text-gray-600 hover:text-gray-900'
            }`}
          >
            Sin asignar ({unassignedCount})
          </button>
          <button
            onClick={() => setFilterTab('all')}
            className={`px-3 py-1.5 text-xs font-medium transition-colors ${
              filterTab === 'all'
                ? 'text-primary border-b-2 border-primary font-semibold'
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
        className="flex-1 overflow-y-auto overflow-x-hidden"
        style={{ minHeight: 0 }}
      >
        {loading ? (
          <div className="flex items-center justify-center h-full">
            <div className="flex flex-col items-center gap-3">
              <div className="animate-spin rounded-full h-10 w-10 border-3 border-primary border-t-transparent"></div>
              <p className="text-xs text-gray-500">Cargando conversaciones...</p>
            </div>
          </div>
        ) : filteredConversations.length === 0 ? (
          <div className="flex flex-col items-center justify-center h-full text-center p-4">
            <div className="w-16 h-16 rounded-full bg-gray-100 flex items-center justify-center mb-3">
              <HiOutlineChat className="w-8 h-8 text-gray-400" />
            </div>
            <p className="text-sm font-medium text-gray-500">No hay conversaciones</p>
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
                  className={`w-full p-3 text-left hover:bg-gray-50 active:bg-gray-100 transition-all duration-150 ${
                    isSelected ? 'bg-primary-50 border-l-4 border-primary' : ''
                  }`}
                >
                  <div className="flex items-start gap-3">
                    {/* Avatar */}
                    <div className="w-10 h-10 rounded-full bg-gradient-to-br from-pink-400 to-pink-500 flex items-center justify-center flex-shrink-0 shadow-sm">
                      <span className="text-sm font-medium text-white">
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

                      <div className="flex items-center gap-2 flex-wrap">
                        <span className={`text-xs px-2 py-0.5 rounded ${getStatusColor(conversation.estado)}`}>
                          {conversation.estado || 'activa'}
                        </span>
                        {contactPhone && (
                          <span className="text-xs text-gray-600 truncate bg-gray-50 px-2 py-0.5 rounded border border-gray-200">
                            {contactPhone}
                          </span>
                        )}
                        {!conversation.asignado_a && (
                          <span className="text-xs px-2 py-0.5 rounded bg-primary-50 text-gray-800 border border-primary-200">
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

      {showNewChatPanel && (
        <div
          className="absolute inset-0 z-20 flex items-start justify-center bg-gray-900/10 backdrop-blur-[1px] px-3 py-4"
          onClick={() => setShowNewChatPanel(false)}
        >
          <div
            className="w-full rounded-2xl bg-white shadow-2xl border border-gray-200 max-h-[calc(100%-2rem)] overflow-hidden flex flex-col"
            onClick={(e) => e.stopPropagation()}
          >
            <div className="flex items-center justify-between px-4 py-3 border-b border-gray-100">
              <div>
                <p className="text-sm font-semibold text-gray-900">Nuevo chat</p>
                <p className="text-xs text-gray-500">Buscar un nombre o número</p>
              </div>
              <button
                className="p-2 rounded-full hover:bg-gray-100"
                onClick={() => setShowNewChatPanel(false)}
              >
                <HiOutlineX className="w-4 h-4 text-gray-500" />
              </button>
            </div>

            <div className="px-4 py-3 border-b border-gray-100">
              <div className="relative">
                <HiOutlineSearch className="absolute left-3 top-1/2 -translate-y-1/2 text-gray-400 w-4 h-4" />
                <input
                  ref={newChatSearchRef}
                  type="text"
                  value={searchQuery}
                  onChange={(e) => setSearchQuery(e.target.value)}
                  placeholder="Buscar un nombre o número"
                  className="w-full rounded-full border border-gray-200 pl-9 pr-3 py-2 text-sm text-gray-900 placeholder:text-gray-400 focus:border-emerald-500 focus:ring-2 focus:ring-emerald-500/30"
                />
              </div>
            </div>

            <div className="px-4 py-2 space-y-2 border-b border-gray-100">
              <button
                className="w-full flex items-center gap-3 rounded-xl px-3 py-2 text-sm text-gray-700 hover:bg-gray-50"
                onClick={() => alert('Funcionalidad de grupos en desarrollo')}
              >
                <span className="w-9 h-9 rounded-full bg-primary-50 text-primary flex items-center justify-center">
                  <HiOutlineUserGroup className="w-4 h-4" />
                </span>
                <span className="font-medium">Nuevo grupo</span>
              </button>
              <button
                className="w-full flex items-center gap-3 rounded-xl px-3 py-2 text-sm text-gray-700 hover:bg-gray-50"
                onClick={() => {
                  setShowNewChatPanel(false);
                  setShowNewConversationModal(true);
                  setCreationError(null);
                }}
              >
                <span className="w-9 h-9 rounded-full bg-primary-50 text-primary flex items-center justify-center">
                  <HiOutlineUserAdd className="w-4 h-4" />
                </span>
                <span className="font-medium">Nuevo contacto</span>
              </button>
            </div>

            <div className="flex-1 overflow-y-auto">
              {canCreateFromSearch && (
                <button
                  className="w-full flex items-center gap-3 px-4 py-2 text-sm text-emerald-600 hover:bg-emerald-50"
                  onClick={openContactModalFromSearch}
                >
                  <span className="w-9 h-9 rounded-full bg-emerald-100 text-emerald-600 flex items-center justify-center font-semibold">
                    +
                  </span>
                  <div className="text-left">
                    <p className="font-semibold">Mensaje a {searchQuery}</p>
                    <p className="text-xs text-gray-500">Crear contacto nuevo y comenzar chat</p>
                  </div>
                </button>
              )}

              {frequentConversations.length > 0 && (
                <div className="px-4 py-3">
                  <p className="text-xs font-semibold text-gray-500 uppercase mb-2">Frecuentes</p>
                  <div className="space-y-1">
                    {frequentConversations.map((conv) => (
                      <button
                        key={conv.id}
                        onClick={() => {
                          setShowNewChatPanel(false);
                          onSelectConversation(conv);
                        }}
                        className="w-full flex items-center gap-3 rounded-xl px-3 py-2 text-left hover:bg-gray-50"
                      >
                        <div className="w-9 h-9 rounded-full bg-gradient-to-br from-pink-400 to-pink-500 flex items-center justify-center text-white text-sm font-medium">
                          {(conv.contactos?.nombre || conv.telefono || 'S').charAt(0).toUpperCase()}
                        </div>
                        <div className="flex-1 min-w-0">
                          <p className="text-sm font-medium text-gray-900 truncate">
                            {conv.contactos?.nombre || conv.telefono || 'Sin nombre'}
                          </p>
                          <p className="text-xs text-gray-500 truncate">
                            {conv.telefono || conv.contactos?.telefono || ''}
                          </p>
                        </div>
                      </button>
                    ))}
                  </div>
                </div>
              )}

              <div className="px-4 py-3">
                <p className="text-xs font-semibold text-gray-500 uppercase mb-2">Todos los contactos</p>
                {contactsLoading ? (
                  <p className="text-xs text-gray-500">Cargando contactos...</p>
                ) : contactsError ? (
                  <p className="text-xs text-red-500">{contactsError}</p>
                ) : filteredContacts.length === 0 ? (
                  <p className="text-xs text-gray-500">No hay contactos que coincidan</p>
                ) : (
                  <div className="space-y-1">
                    {filteredContacts.map((contact) => (
                      <button
                        key={contact.id}
                        onClick={() => openOrCreateConversationForContact(contact)}
                        className="w-full flex items-center gap-3 rounded-xl px-3 py-2 text-left hover:bg-gray-50"
                      >
                        <div className="w-9 h-9 rounded-full bg-gray-100 flex items-center justify-center text-gray-600 font-semibold text-sm">
                          {(contact.nombre || contact.telefono || 'S').charAt(0).toUpperCase()}
                        </div>
                        <div className="flex-1 min-w-0">
                          <p className="text-sm font-medium text-gray-900 truncate">
                            {contact.nombre || 'Sin nombre'}
                          </p>
                          <p className="text-xs text-gray-500 truncate">{contact.telefono}</p>
                        </div>
                      </button>
                    ))}
                  </div>
                )}
              </div>
            </div>
          </div>
        </div>
      )}

      {showNewConversationModal && (
        <div className="fixed inset-0 z-50 bg-gray-900/40 flex items-center justify-center px-4 py-6">
          <div className="bg-white w-full max-w-md rounded-2xl shadow-2xl p-6 relative">
            <button
              onClick={() => {
                setShowNewConversationModal(false);
                setCreationError(null);
              }}
              className="absolute top-4 right-4 p-2 rounded-full hover:bg-gray-100 text-gray-500 transition-colors"
              title="Cerrar"
            >
              <HiOutlineX className="w-5 h-5" />
            </button>

            <div className="flex items-center gap-3 mb-4">
              <div className="w-12 h-12 rounded-full bg-emerald-500 flex items-center justify-center">
                <HiOutlineChat className="w-6 h-6 text-white" />
              </div>
              <div>
                <p className="text-base font-semibold text-gray-900">Nueva conversación</p>
                <p className="text-sm text-gray-500">Se creará en {selectedInbox}</p>
              </div>
            </div>

            <form className="space-y-4" onSubmit={handleCreateConversation}>
              <div>
                <label className="text-xs font-medium text-gray-600 uppercase tracking-wide">
                  Número de WhatsApp
                </label>
                <input
                  type="tel"
                  required
                  value={newContactPhone}
                  onChange={(e) => setNewContactPhone(e.target.value)}
                  placeholder="Ej. +5491122334455"
                  className="mt-1 w-full rounded-lg border border-gray-300 px-3 py-2 text-sm text-gray-900 placeholder:text-gray-400 focus:border-emerald-500 focus:ring-2 focus:ring-emerald-500/30"
                />
              </div>

              <div>
                <label className="text-xs font-medium text-gray-600 uppercase tracking-wide">
                  Nombre del contacto (opcional)
                </label>
                <input
                  type="text"
                  value={newContactName}
                  onChange={(e) => setNewContactName(e.target.value)}
                  placeholder="Cómo quieres identificarlo"
                  className="mt-1 w-full rounded-lg border border-gray-300 px-3 py-2 text-sm text-gray-900 placeholder:text-gray-400 focus:border-emerald-500 focus:ring-2 focus:ring-emerald-500/30"
                />
              </div>

              {creationError && (
                <p className="text-xs text-red-500 bg-red-50 border border-red-100 rounded-lg px-3 py-2">
                  {creationError}
                </p>
              )}

              <div className="flex items-center justify-end gap-3 pt-2">
                <button
                  type="button"
                  onClick={() => {
                    setShowNewConversationModal(false);
                    setCreationError(null);
                  }}
                  className="text-sm font-medium text-gray-600 hover:text-gray-900"
                >
                  Cancelar
                </button>
                <button
                  type="submit"
                  disabled={creatingConversation}
                  className="inline-flex items-center gap-2 rounded-full bg-emerald-500 px-5 py-2 text-sm font-semibold text-white shadow-sm hover:bg-emerald-600 disabled:opacity-70"
                >
                  {creatingConversation ? 'Creando...' : 'Crear y abrir'}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}
    </div>
  );
}
