// src/components/crm/ConversationsList.tsx - Clonando diseño exacto de Chatwoot
"use client"

import { useState } from "react"
import type { Conversation } from "@/lib/supabase"

interface ConversationsListProps {
  conversations: Conversation[]
  selectedConversationId: string
  onSelectConversation: (conversation: Conversation) => void
  loading: boolean
  isRealtimeConnected: boolean
  currentMessages: any[]
  currentConversationId: string
}

export default function ConversationsList({
  conversations,
  selectedConversationId,
  onSelectConversation,
  loading,
  isRealtimeConnected,
  currentMessages,
  currentConversationId
}: ConversationsListProps) {
  const [searchQuery, setSearchQuery] = useState("")
  const [activeTab, setActiveTab] = useState<"mias" | "sin-asignar" | "todos">("todos")

  // Función para obtener color del avatar
  const getAvatarColor = (name: string) => {
    const colors = [
      'bg-purple-500', 'bg-blue-500', 'bg-green-500', 'bg-yellow-500',
      'bg-red-500', 'bg-pink-500', 'bg-indigo-500', 'bg-teal-500'
    ]
    const index = name.charCodeAt(0) % colors.length
    return colors[index]
  }

  // Función para obtener iniciales
  const getInitials = (name: string) => {
    return name.split(' ').map(word => word.charAt(0)).join('').toUpperCase().substring(0, 2)
  }

  // Función para formatear tiempo relativo
  const formatRelativeTime = (dateString: string) => {
    const date = new Date(dateString)
    const now = new Date()
    const diffInHours = Math.floor((now.getTime() - date.getTime()) / (1000 * 60 * 60))
    
    if (diffInHours < 1) return "Ahora"
    if (diffInHours < 24) return `${diffInHours}h`
    if (diffInHours < 48) return "1d"
    return `${Math.floor(diffInHours / 24)}d`
  }

  // Filtrar conversaciones
  const filteredConversations = conversations.filter(conv => {
    const nombre = conv.persona?.nombre || conv.nombre || ''
    const telefono = conv.persona?.telefono || conv.telefono || ''
    const matchesSearch = nombre.toLowerCase().includes(searchQuery.toLowerCase()) ||
                         telefono.includes(searchQuery)
    
    switch (activeTab) {
      case "mias":
        return matchesSearch && conv.asignado_a === "admin@psivisionhub.com"
      case "sin-asignar":
        return matchesSearch && (!conv.asignado_a || conv.asignado_a === "")
      case "todos":
      default:
        return matchesSearch
    }
  })

  // Contar conversaciones por tab
  const countByTab = {
    mias: conversations.filter(conv => conv.asignado_a === "admin@psivisionhub.com").length,
    "sin-asignar": conversations.filter(conv => !conv.asignado_a || conv.asignado_a === "").length,
    todos: conversations.length
  }

  return (
    <div className="h-full flex flex-col bg-white">
      {/* Header - EXACTO de Chatwoot */}
      <div className="h-16 border-b border-gray-200 px-4 flex items-center justify-between">
        <h1 className="text-xl font-semibold text-gray-900">Conversaciones</h1>
        <div className="flex items-center gap-2">
          <button className="p-2 hover:bg-gray-100 rounded transition-colors">
            <svg className="h-4 w-4 text-gray-500" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M3 4a1 1 0 011-1h16a1 1 0 011 1v2.586a1 1 0 01-.293.707l-6.414 6.414a1 1 0 00-.293.707V17l-4 4v-6.586a1 1 0 00-.293-.707L3.293 7.293A1 1 0 013 6.586V4z" />
            </svg>
          </button>
          <button className="p-2 hover:bg-gray-100 rounded transition-colors">
            <svg className="h-4 w-4 text-gray-500" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M3 4h13M3 8h9m-9 4h6m4 0l4-4m0 0l4 4m-4-4v12" />
            </svg>
          </button>
          <button className="p-2 hover:bg-gray-100 rounded transition-colors">
            <svg className="h-4 w-4 text-gray-500" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 5l7 7-7 7" />
            </svg>
          </button>
        </div>
      </div>

      {/* Tabs de filtros - EXACTO de Chatwoot */}
      <div className="border-b border-gray-200 px-4 py-2 flex items-center gap-4">
        <button 
          onClick={() => setActiveTab("mias")}
          className={`text-sm font-medium pb-2 transition-colors ${
            activeTab === "mias" 
              ? "text-gray-900 border-b-2 border-blue-500" 
              : "text-gray-600 hover:text-gray-900"
          }`}
        >
          Mías <span className="ml-1 text-gray-500">({countByTab.mias})</span>
        </button>
        <button 
          onClick={() => setActiveTab("sin-asignar")}
          className={`text-sm font-medium pb-2 transition-colors ${
            activeTab === "sin-asignar" 
              ? "text-gray-900 border-b-2 border-blue-500" 
              : "text-gray-600 hover:text-gray-900"
          }`}
        >
          Sin asignar <span className="ml-1 text-gray-500">({countByTab["sin-asignar"]})</span>
        </button>
        <button 
          onClick={() => setActiveTab("todos")}
          className={`text-sm font-medium pb-2 transition-colors ${
            activeTab === "todos" 
              ? "text-gray-900 border-b-2 border-blue-500" 
              : "text-gray-600 hover:text-gray-900"
          }`}
        >
          Todos <span className="ml-1 text-gray-500">({countByTab.todos})</span>
        </button>
      </div>

      {/* Buscador - EXACTO de Chatwoot */}
      <div className="px-4 py-3">
        <div className="relative">
          <svg className="absolute left-3 top-2.5 h-4 w-4 text-gray-400" fill="none" stroke="currentColor" viewBox="0 0 24 24">
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M21 21l-6-6m2-5a7 7 0 11-14 0 7 7 0 0114 0z" />
          </svg>
          <input 
            type="text"
            placeholder="Buscar..."
            value={searchQuery}
            onChange={(e) => setSearchQuery(e.target.value)}
            className="w-full pl-9 pr-3 h-9 text-sm border border-gray-200 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-transparent"
          />
        </div>
      </div>

      {/* Lista de conversaciones - EXACTO de Chatwoot */}
      <div className="flex-1 overflow-y-auto">
        {loading ? (
          <div className="flex items-center justify-center h-full">
            <div className="flex flex-col items-center gap-2">
              <div className="w-8 h-8 border-4 border-blue-500 border-t-transparent rounded-full animate-spin"></div>
              <span className="text-gray-500 text-sm">Cargando conversaciones...</span>
            </div>
          </div>
        ) : filteredConversations.length === 0 ? (
          <div className="flex items-center justify-center h-full">
            <div className="text-center">
              <p className="text-gray-500 text-sm">No hay conversaciones</p>
              <p className="text-gray-400 text-xs mt-1">Selecciona un filtro diferente</p>
            </div>
          </div>
        ) : (
          <div className="space-y-0">
            {filteredConversations.map((conversation) => {
              const isSelected = conversation.id === selectedConversationId
              const lastMessage = currentMessages.length > 0 ? currentMessages[currentMessages.length - 1] : null
              
              return (
                <button
                  key={conversation.id}
                  onClick={() => onSelectConversation(conversation)}
                  className={`w-full px-4 py-3 flex items-start gap-3 hover:bg-gray-50 transition-colors border-l-4 ${
                    isSelected 
                      ? "bg-gray-50 border-l-blue-500" 
                      : "border-l-transparent hover:border-l-blue-500"
                  }`}
                >
                  {/* Avatar - EXACTO de Chatwoot */}
                  <div className={`w-10 h-10 rounded-full ${getAvatarColor(conversation.persona?.nombre || conversation.nombre || 'Usuario')} flex items-center justify-center text-white font-semibold text-sm flex-shrink-0`}>
                    {getInitials(conversation.persona?.nombre || conversation.nombre || 'Usuario')}
                  </div>
                  
                  {/* Info - EXACTO de Chatwoot */}
                  <div className="flex-1 min-w-0">
                    <div className="flex items-center justify-between mb-1">
                      <span className="font-semibold text-sm text-gray-900 truncate">
                        {conversation.persona?.nombre || conversation.nombre || conversation.persona?.telefono || conversation.telefono || 'Sin nombre'}
                      </span>
                      <span className="text-xs text-gray-500 flex-shrink-0 ml-2">
                        {formatRelativeTime(conversation.updated_at || conversation.created_at)}
                      </span>
                    </div>
                    <p className="text-xs text-gray-600 truncate mb-1">
                      {lastMessage?.contenido || lastMessage?.mensaje || lastMessage?.content || "Sin mensajes"}
                    </p>
                    <div className="flex items-center gap-1">
                      <span className="text-xs bg-blue-100 text-blue-700 px-1.5 py-0.5 rounded">
                        {conversation.inbox || "EME Automations"}
                      </span>
                    </div>
                  </div>
                </button>
              )
            })}
          </div>
        )}
      </div>

      {/* Status de conexión */}
      <div className="px-4 py-2 border-t border-gray-200">
        <div className="flex items-center gap-2">
          <div className={`w-2 h-2 rounded-full ${isRealtimeConnected ? 'bg-green-500' : 'bg-red-500'}`} />
          <span className="text-xs text-gray-500">
            {isRealtimeConnected ? 'Conectado' : 'Desconectado'}
          </span>
        </div>
      </div>
    </div>
  )
}

