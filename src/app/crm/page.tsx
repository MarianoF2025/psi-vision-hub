// src/app/crm/page.tsx - CRM Rediseñado clonando Chatwoot
"use client"

import { useState, useEffect, useCallback, useMemo, useRef } from "react"
import ConversationsList from "@/components/crm/ConversationsList"
import MessagesPanel from "@/components/crm/MessagesPanel"
import ContactInfo from "@/components/crm/ContactInfo"
import { useConversations, useMessages, useMessageSender, useConversationUpdater, useDirectWebhook } from "@/hooks"
import type { Conversation } from "@/lib/supabase"

// Componente principal
function CrmPage() {
  // Estados
  const [activeId, setActiveId] = useState<string>("")
  const [collapsed, setCollapsed] = useState<boolean>(false)
  const [activeSidebarItem, setActiveSidebarItem] = useState<string>("Administración")
  const [activeFunctionItem, setActiveFunctionItem] = useState<string>("")
  
  // Filtros para conversaciones
  const [selectedInbox, setSelectedInbox] = useState<number>()
  const [showOnlyMine, setShowOnlyMine] = useState(false)
  
  // Estado de errores
  const [sendError, setSendError] = useState<string | null>(null)

  // Hooks de Supabase
  const { 
    conversations, 
    loading: conversationsLoading, 
    error: conversationsError,
    isRealtimeConnected: conversationsRealtimeConnected
  } = useConversations(selectedInbox, showOnlyMine ? 1 : undefined)

  // Buscar el chatwoot_conversation_id de la conversación activa
  const activeChatwootId = useMemo(() => {
    if (!activeId) return undefined
    const conv = conversations.find(c => c.id === activeId)
    return conv?.chatwoot_conversation_id
  }, [activeId, conversations])

  const { 
    messages, 
    loading: messagesLoading, 
    error: messagesError,
    isRealtimeConnected: messagesRealtimeConnected
  } = useMessages(activeChatwootId)

  // Debug logs (solo cuando cambia activeId para evitar spam)
  useEffect(() => {
    if (activeId) {
      console.log('🔄 Active ID cambió:', activeId)
      console.log('🔄 Active Chatwoot ID:', activeChatwootId, 'Type:', typeof activeChatwootId)
    }
  }, [activeId, activeChatwootId])
  
  useEffect(() => {
    if (conversations.length > 0) {
      console.log('📋 Conversaciones cargadas:', conversations.length)
      console.log('📋 Primera conversación:', conversations[0])
    }
  }, [conversations])
  
  useEffect(() => {
    if (messages.length > 0) {
      console.log('📝 Mensajes cargados:', messages.length)
      console.log('📝 Primer mensaje:', messages[0])
    }
  }, [messages])

  // Establecer la primera conversación como activa cuando se cargan las conversaciones
  useEffect(() => {
    if (!activeId && conversations.length > 0) {
      console.log('🎯 Setting first conversation as active:', conversations[0].id)
      console.log('🎯 chatwoot_conversation_id:', conversations[0].chatwoot_conversation_id)
      setActiveId(conversations[0].id)
    }
  }, [conversations, activeId])

  const { sendMessage, sending: sendingMessage } = useMessageSender()
  const { updateEstado, updateAssignee } = useConversationUpdater()
  const { sendDirectToWebhook } = useDirectWebhook()

  // Conversación seleccionada
  const selectedConversation = useMemo(() => {
    return conversations.find(conv => conv.id === activeId) || null
  }, [conversations, activeId])

  // Handlers
  const handleSelectConversation = useCallback((conversation: Conversation) => {
    console.log('Selecting conversation:', conversation.id)
    setActiveId(conversation.id)
    setSendError(null)
  }, [])

  const handleUpdateEstado = useCallback(async (conversationId: string, newEstado: string) => {
    try {
      await updateEstado(conversationId, newEstado)
    } catch (error) {
      console.error('Error updating conversation:', error)
    }
  }, [updateEstado])

  const handleSendMessage = useCallback(async (messageText: string, attachedFiles?: File[]) => {
    if (!selectedConversation || !messageText.trim()) return

    try {
      setSendError(null)
      
      // Enviar mensaje directo via webhook
      await sendDirectToWebhook({
        conversationId: selectedConversation.id,
        message: messageText,
        attachments: attachedFiles || []
      })
    } catch (error) {
      console.error('Error sending message:', error)
      setSendError('Error al enviar mensaje')
    }
  }, [selectedConversation, sendDirectToWebhook])

  // Función para obtener color del avatar
  const getAvatarColor = (name: string) => {
    const colors = [
      'bg-purple-500', 'bg-blue-500', 'bg-green-500', 'bg-yellow-500',
      'bg-red-500', 'bg-pink-500', 'bg-indigo-500', 'bg-teal-500'
    ]
    const index = name.charCodeAt(0) % colors.length
    return colors[index]
  }

  return (
    <div className="h-screen flex overflow-hidden bg-white" style={{ height: '864px', maxHeight: '864px' }}>
      {/* COLUMNA 1: SIDEBAR IZQUIERDA (250px) - MANTENER COMO ESTÁ */}
      <div className={`bg-white border-r border-gray-200 flex flex-col transition-all duration-300 ${
        collapsed ? 'w-[72px]' : 'w-[250px]'
      }`}>
        {/* Header */}
        <div className="h-16 border-b border-gray-200 flex items-center justify-between px-4">
          {!collapsed && (
            <h1 className="text-lg font-semibold text-gray-900">PSI Vision Hub</h1>
          )}
          <button
            onClick={() => setCollapsed(!collapsed)}
            className="p-2 hover:bg-gray-100 rounded transition-colors"
          >
            <svg className="w-5 h-5 text-gray-600" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M4 6h16M4 12h16M4 18h16" />
            </svg>
          </button>
        </div>

        {/* Resumen HOY */}
        {!collapsed && (
        <div className="p-4 border-b border-gray-200">
            <h2 className="text-sm font-semibold text-gray-700 mb-3">RESUMEN HOY</h2>
            <div className="grid grid-cols-2 gap-2 text-xs">
              <div className="bg-blue-50 p-2 rounded">
                <div className="font-semibold text-blue-600">45</div>
                <div className="text-blue-500">Activos</div>
              </div>
              <div className="bg-yellow-50 p-2 rounded">
                <div className="font-semibold text-yellow-600">12</div>
                <div className="text-yellow-500">Pendientes</div>
            </div>
              <div className="bg-green-50 p-2 rounded">
                <div className="font-semibold text-green-600">23</div>
                <div className="text-green-500">Cerrados</div>
            </div>
              <div className="bg-purple-50 p-2 rounded">
                <div className="font-semibold text-purple-600">8</div>
                <div className="text-purple-500">Conversiones</div>
            </div>
            </div>
          </div>
        )}

        {/* Áreas principales con scroll */}
        <div className="flex-1 overflow-y-auto">
          {[
            { id: 'Ventas', icon: '💬', label: 'Ventas', stats: 'Leads 24, Seguimientos 12, Conversiones 3' },
            { id: 'Alumnos', icon: '💼', label: 'Alumnos', stats: 'Activos 156, Pendientes 8' },
            { id: 'Administración', icon: '📈', label: 'Administración', stats: 'Usuarios 12, Reportes 5, Configuración' },
            { id: 'Comunidad', icon: '👥', label: 'Comunidad', stats: 'Grupos WhatsApp 8, Eventos 3, Recursos 15' }
          ].map((area) => (
            <div key={area.id} className="border-b border-gray-100">
              <button
                onClick={() => setActiveSidebarItem(area.id)}
                className={`w-full flex items-center gap-2 p-3 hover:bg-gray-50 transition-colors ${
                  activeSidebarItem === area.id ? 'bg-blue-50 text-blue-600' : 'text-gray-700'
                }`}
              >
                <span className="text-lg">{area.icon}</span>
                {!collapsed && (
                  <div className="flex-1 text-left">
                    <div className="font-medium">{area.label}</div>
                    <div className="text-xs text-gray-500 mt-1">{area.stats}</div>
                  </div>
                )}
              </button>
            </div>
          ))}

          {/* Separador */}
          <div className="my-4 h-px bg-gray-200" />

          {/* FUNCIONES */}
          {!collapsed && (
            <div className="px-4 py-2 text-xs font-semibold text-gray-500">FUNCIONES</div>
          )}
          
          {[
            { id: 'CRM Inbox', icon: '📥', label: 'CRM Inbox' },
            { id: 'Contactos', icon: '👤', label: 'Contactos' },
            { id: 'Dashboard', icon: '📊', label: 'Dashboard' }
          ].map((func) => (
            <div key={func.id} className="border-b border-gray-100">
              <button
                onClick={() => setActiveFunctionItem(func.id)}
                className={`w-full flex items-center gap-2 p-3 hover:bg-gray-50 transition-colors ${
                  activeFunctionItem === func.id ? 'bg-blue-50 text-blue-600' : 'text-gray-700'
                }`}
              >
                <span className="text-lg">{func.icon}</span>
                {!collapsed && (
                  <span className="text-gray-700">{func.label}</span>
                )}
              </button>
            </div>
          ))}
        </div>
      </div>
      
      {/* COLUMNA 2: LISTA DE CONVERSACIONES (380px) */}
      <div className="w-[380px] bg-white border-r border-gray-200 flex flex-col">
        {conversationsError ? (
          <div className="p-4 text-center">
            <div className="text-red-500 text-sm mb-2">Error al cargar conversaciones</div>
            <div className="text-xs text-gray-500">{conversationsError}</div>
            <button 
              onClick={() => window.location.reload()} 
              className="mt-2 px-3 py-1 bg-blue-500 text-white text-xs rounded hover:bg-blue-600"
            >
              Reintentar
            </button>
          </div>
        ) : conversationsLoading ? (
          <div className="p-4 text-center text-gray-500">Cargando conversaciones...</div>
        ) : conversations.length === 0 ? (
          <div className="p-4 text-center">
            <div className="text-gray-500 text-sm mb-2">No hay conversaciones</div>
            <div className="text-xs text-gray-400">Las conversaciones aparecerán aquí cuando lleguen mensajes</div>
          </div>
        ) : (
          <ConversationsList
          conversations={conversations}
          selectedConversationId={activeId}
            onSelectConversation={handleSelectConversation}
            loading={conversationsLoading}
          isRealtimeConnected={conversationsRealtimeConnected}
          currentMessages={messages}
          currentConversationId={activeId}
        />
        )}
      </div>
      
      {/* COLUMNA 3: PANEL DE MENSAJES (1290px) */}
      <div className="flex-1 flex flex-col bg-white">
        {messagesError ? (
          <div className="flex-1 flex items-center justify-center">
            <div className="text-center">
              <div className="text-red-500 text-sm mb-2">Error al cargar mensajes</div>
              <div className="text-xs text-gray-500 mb-4">{messagesError}</div>
              <button 
                onClick={() => window.location.reload()} 
                className="px-3 py-1 bg-blue-500 text-white text-xs rounded hover:bg-blue-600"
              >
                Reintentar
              </button>
            </div>
          </div>
        ) : (
          <MessagesPanel
            conversation={selectedConversation}
          messages={messages}
            loading={messagesLoading}
            error={messagesError}
            isRealtimeConnected={messagesRealtimeConnected}
          onSendMessage={handleSendMessage}
            sendError={sendError}
            onUpdateEstado={handleUpdateEstado}
        />
        )}
      </div>
      
      {/* COLUMNA 4: INFORMACIÓN DEL CONTACTO (320px) */}
      <div className="w-[320px] border-l border-gray-200 bg-white">
        <ContactInfo
          contact={selectedConversation}
        onUpdateContact={handleUpdateEstado}
      />
      </div>
    </div>
  )
}

export default CrmPage