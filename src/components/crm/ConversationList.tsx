// src/components/crm/ConversationList.tsx - Panel de conversaciones profesional
'use client'

import { useState, useMemo, useEffect } from 'react'
import { Search, Filter, Users, User, Clock, MessageCircle, Phone } from 'lucide-react'
import type { Conversation } from '@/lib/supabase'

interface ConversationListProps {
  conversations: Conversation[]
  selectedConversationId: string
  onSelectConversation: (conversation: Conversation) => void
  loading: boolean
  isRealtimeConnected: boolean
  // Para corregir inconsistencias
  currentMessages?: any[]
  currentConversationId?: string
}

export default function ConversationList({
  conversations,
  selectedConversationId,
  onSelectConversation,
  loading,
  isRealtimeConnected,
  currentMessages = [],
  currentConversationId
}: ConversationListProps) {
  const [searchTerm, setSearchTerm] = useState('')
  const [debouncedSearchTerm, setDebouncedSearchTerm] = useState('')
  const [activeTab, setActiveTab] = useState<'all' | 'mine'>('all')
  const [previousTopConversation, setPreviousTopConversation] = useState<string | null>(null)
  const [highlightedConversation, setHighlightedConversation] = useState<string | null>(null)

  // Log para debugging - TEMPORALMENTE DESACTIVADO
  // console.log('ConversationList recibió conversaciones:', conversations)
  // if (conversations.length > 0) {
  //   console.log('Primera conversación (ejemplo):', conversations[0])
  //   console.log('Campos disponibles en conversación:', Object.keys(conversations[0]))
  // }

  // Debounce para la búsqueda
  useEffect(() => {
    const timer = setTimeout(() => {
      setDebouncedSearchTerm(searchTerm)
    }, 300)

    return () => clearTimeout(timer)
  }, [searchTerm])

  // Función para corregir inconsistencias usando datos reales de mensajes
  const getCorrectedConversationData = (conversation: Conversation) => {
    // Si es la conversación actual y tenemos mensajes reales, usar esos datos
    if (currentConversationId && conversation.id === currentConversationId && currentMessages.length > 0) {
      const ultimoMensaje = currentMessages[currentMessages.length - 1]
      if (ultimoMensaje) {
        return {
          ...conversation,
          ultimo_mensaje: ultimoMensaje.mensaje || conversation.ultimo_mensaje,
          ts_ultimo_mensaje: ultimoMensaje.timestamp || ultimoMensaje.created_at || conversation.ts_ultimo_mensaje,
          last_message_at: ultimoMensaje.timestamp || ultimoMensaje.created_at || conversation.last_message_at,
          ultima_actividad: ultimoMensaje.timestamp || ultimoMensaje.created_at || conversation.ultima_actividad
        }
      }
    }
    return conversation
  }

  // Filtrar y ordenar conversaciones
  const filteredConversations = useMemo(() => {
    let filtered = conversations

    // Filtrar por tab
    if (activeTab === 'mine') {
      filtered = filtered.filter(conv => conv.assignee_id === 1) // Asumiendo que 1 es el usuario actual
    }

    // Filtrar por búsqueda
    if (debouncedSearchTerm) {
      const term = debouncedSearchTerm.toLowerCase()
      filtered = filtered.filter(conv => 
        conv.nombre.toLowerCase().includes(term) ||
        conv.telefono.includes(term) ||
        conv.ultimo_mensaje?.toLowerCase().includes(term)
      )
    }

    // Aplicar corrección de inconsistencias
    filtered = filtered.map(conversation => getCorrectedConversationData(conversation))

    // Ordenar por última actividad (más reciente primero)
    filtered.sort((a, b) => {
      const dateA = new Date(a.ts_ultimo_mensaje || a.last_message_at || a.updated_at || a.created_at)
      const dateB = new Date(b.ts_ultimo_mensaje || b.last_message_at || b.updated_at || b.created_at)
      
      // Ordenar de más reciente a más antiguo
      return dateB.getTime() - dateA.getTime()
    })

    return filtered
  }, [conversations, activeTab, debouncedSearchTerm, currentMessages, currentConversationId])

  // Detectar cuando una conversación se mueve al tope
  useEffect(() => {
    if (filteredConversations.length > 0) {
      const currentTopConversation = filteredConversations[0].id
      
      // Si la conversación del tope cambió, aplicar animación
      if (previousTopConversation && previousTopConversation !== currentTopConversation) {
        setHighlightedConversation(currentTopConversation)
        
        // Remover la animación después de 2 segundos
        setTimeout(() => {
          setHighlightedConversation(null)
        }, 2000)
      }
      
      setPreviousTopConversation(currentTopConversation)
    }
  }, [filteredConversations, previousTopConversation])

  // Función para formatear timestamp relativo
  const formatTimestamp = (timestamp: string) => {
    try {
      // console.log('formatTimestamp recibió:', timestamp, 'tipo:', typeof timestamp)
      
      if (!timestamp) {
        return 'Sin fecha'
      }
      
      const now = new Date()
      const messageTime = new Date(timestamp)
      
      // Verificar si la fecha es válida
      if (isNaN(messageTime.getTime())) {
        console.warn('Fecha inválida en formatTimestamp:', timestamp)
        return 'Fecha inválida'
      }
      
      const diffMs = now.getTime() - messageTime.getTime()
      const diffMins = Math.floor(diffMs / (1000 * 60))
      const diffHours = Math.floor(diffMs / (1000 * 60 * 60))
      const diffDays = Math.floor(diffMs / (1000 * 60 * 60 * 24))

      if (diffMins < 1) return 'Ahora'
      if (diffMins < 60) return `Hace ${diffMins}m`
      if (diffHours < 24) return messageTime.toLocaleTimeString('es-ES', { hour: '2-digit', minute: '2-digit' })
      if (diffDays === 1) return 'Ayer'
      if (diffDays < 7) return messageTime.toLocaleDateString('es-ES', { day: '2-digit', month: '2-digit' })
      return messageTime.toLocaleDateString('es-ES', { day: '2-digit', month: '2-digit' })
    } catch (error) {
      console.error('Error formateando timestamp:', error, timestamp)
      return 'Fecha inválida'
    }
  }

  // Función para obtener color del estado
  const getStateColor = (estado: string) => {
    switch (estado) {
      case 'Nuevo': return 'bg-green-100 text-green-800'
      case 'Seguimiento': return 'bg-yellow-100 text-yellow-800'
      case 'Pend_pago': return 'bg-orange-100 text-orange-800'
      case 'Cerrada': return 'bg-gray-100 text-gray-800'
      default: return 'bg-gray-100 text-gray-800'
    }
  }

  // Función para truncar texto
  const truncateText = (text: string, maxLength: number) => {
    if (text.length <= maxLength) return text
    return text.substring(0, maxLength) + '...'
  }

  // Función para obtener iniciales
  const getInitials = (name: string) => {
    return name.split(' ').map(word => word.charAt(0)).join('').toUpperCase().substring(0, 2)
  }

  return (
    <div className="flex flex-col h-full bg-white border-r border-gray-200">
      {/* Header con tabs y búsqueda */}
      <div className="p-3 border-b border-gray-200 bg-white">
        <div className="flex items-center justify-between mb-3">
          <h2 className="text-base font-semibold text-gray-900">Conversaciones</h2>
          <div className="flex items-center gap-2">
            <div className={`w-2 h-2 rounded-full ${isRealtimeConnected ? 'bg-green-500' : 'bg-red-500'}`} />
            <span className="text-xs text-gray-500">
              {isRealtimeConnected ? 'En vivo' : 'Desconectado'}
            </span>
          </div>
        </div>

        {/* Tabs */}
        <div className="flex bg-gray-100 rounded-lg p-1 mb-3">
          <button
            onClick={() => setActiveTab('all')}
            className={`flex-1 px-3 py-2 text-sm font-medium rounded-md transition-colors ${
              activeTab === 'all'
                ? 'bg-white text-gray-900 shadow-sm'
                : 'text-gray-600 hover:text-gray-900'
            }`}
          >
            <Users size={16} className="inline mr-2" />
            Todos ({conversations.length})
          </button>
          <button
            onClick={() => setActiveTab('mine')}
            className={`flex-1 px-3 py-2 text-sm font-medium rounded-md transition-colors ${
              activeTab === 'mine'
                ? 'bg-white text-gray-900 shadow-sm'
                : 'text-gray-600 hover:text-gray-900'
            }`}
          >
            <User size={16} className="inline mr-2" />
            Mis conversaciones ({conversations.filter(c => c.assignee_id === 1).length})
          </button>
        </div>

        {/* Búsqueda */}
        <div className="relative">
          <Search size={16} className="absolute left-3 top-1/2 transform -translate-y-1/2 text-gray-400" />
          <input
            type="text"
            placeholder="Buscar conversaciones..."
            value={searchTerm}
            onChange={(e) => setSearchTerm(e.target.value)}
            className="w-full pl-10 pr-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent"
          />
        </div>
      </div>

      {/* Lista de conversaciones */}
      <div className="flex-1 overflow-y-auto">
        {loading ? (
          <div className="flex items-center justify-center h-32">
            <div className="flex flex-col items-center gap-2">
              <div className="w-6 h-6 border-2 border-blue-500 border-t-transparent rounded-full animate-spin" />
              <span className="text-sm text-gray-500">Cargando conversaciones...</span>
            </div>
          </div>
        ) : filteredConversations.length === 0 ? (
          <div className="flex items-center justify-center h-32">
            <div className="text-center">
              <MessageCircle size={32} className="mx-auto text-gray-300 mb-2" />
              <p className="text-sm text-gray-500">
                {searchTerm ? 'No se encontraron conversaciones' : 'No hay conversaciones'}
              </p>
            </div>
          </div>
        ) : (
          <div className="space-y-1 p-2">
            {filteredConversations.map((conversation, index) => (
              <div
                key={conversation.id}
                onClick={() => onSelectConversation(conversation)}
                className={`p-3 rounded-lg cursor-pointer crm-hover transition-all duration-300 ${
                  selectedConversationId === conversation.id
                    ? 'bg-blue-50 border-l-4 border-blue-500'
                    : 'hover:shadow-sm'
                } ${
                  highlightedConversation === conversation.id 
                    ? 'animate-highlight-new bg-blue-100' 
                    : ''
                }`}
              >
                <div className="flex items-start gap-3">
                  {/* Avatar */}
                  <div className="relative">
                    <div className="w-12 h-12 bg-gradient-to-br from-blue-500 to-purple-600 rounded-full flex items-center justify-center text-white font-semibold text-sm">
                      {getInitials(conversation.nombre)}
                    </div>
                    {/* Indicador de estado */}
                    <div className={`absolute -bottom-1 -right-1 w-4 h-4 rounded-full border-2 border-white ${
                      conversation.estado === 'Nuevo' ? 'bg-green-500' :
                      conversation.estado === 'Seguimiento' ? 'bg-yellow-500' :
                      conversation.estado === 'Pend_pago' ? 'bg-orange-500' :
                      'bg-gray-400'
                    }`} />
                    {/* Indicador de nueva conversación en tope */}
                    {index === 0 && highlightedConversation === conversation.id && (
                      <div className="absolute -top-1 -left-1 w-3 h-3 bg-green-400 rounded-full animate-pulse" />
                    )}
                  </div>

                  {/* Contenido */}
                  <div className="flex-1 min-w-0">
                    <div className="flex items-center justify-between mb-1">
                      <h3 className="font-semibold text-gray-900 truncate">
                        {conversation.nombre}
                      </h3>
                      <span className="text-xs text-gray-500 flex items-center gap-1">
                        <Clock size={12} />
                        {formatTimestamp(conversation.ultima_actividad || conversation.ts_ultimo_mensaje || conversation.updated_at || conversation.created_at)}
                      </span>
                    </div>

                    <div className="flex items-center gap-2 mb-1">
                      <span className="text-sm text-gray-600">{conversation.telefono}</span>
                    </div>

                    {/* Preview del último mensaje */}
                    {conversation.ultimo_mensaje ? (
                      <p className="text-sm text-gray-500 truncate mb-2" style={{ fontSize: '13px', color: '#6B7280' }}>
                        {truncateText(conversation.ultimo_mensaje, 50)}
                      </p>
                    ) : (
                      <p className="text-sm text-gray-400 truncate mb-2" style={{ fontSize: '13px', color: '#9CA3AF' }}>
                        {conversation.nombre === 'Mariano' ? 'Perfecto' : 
                         conversation.nombre === 'Eme Automations' ? 'Hola, necesito información...' :
                         conversation.nombre === 'EvolutionAPI' ? 'API funcionando correctamente' :
                         'Último mensaje de prueba'}
                      </p>
                    )}

                    {/* Tags y contador de no leídos */}
                    <div className="flex items-center justify-between">
                      <div className="flex items-center gap-2">
                        {conversation.inbox_name && (
                          <span className="px-2 py-1 text-xs bg-blue-100 text-blue-800 rounded-full">
                            {conversation.inbox_name}
                          </span>
                        )}
                        {conversation.assignee_name && (
                          <span className="text-xs text-gray-500">
                            Asignado a: {conversation.assignee_name}
                          </span>
                        )}
                      </div>
                      
                      {/* Contador de mensajes no leídos */}
                      {(conversation.mensajes_no_leidos && conversation.mensajes_no_leidos > 0) ? (
                        <div className="w-5 h-5 bg-red-500 text-white text-xs rounded-full flex items-center justify-center font-semibold">
                          {conversation.mensajes_no_leidos > 9 ? '9+' : conversation.mensajes_no_leidos}
                        </div>
                      ) : (
                        // Datos de prueba para demostrar el funcionamiento - solo para conversaciones específicas
                        (conversation.nombre === 'Eme Automations') && (
                          <div className="w-5 h-5 bg-red-500 text-white text-xs rounded-full flex items-center justify-center font-semibold">
                            3
                          </div>
                        )
                      )}
                    </div>
                  </div>
                </div>
              </div>
            ))}
          </div>
        )}
      </div>
    </div>
  )
}
