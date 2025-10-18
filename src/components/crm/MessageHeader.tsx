// src/components/crm/MessageHeader.tsx - Header profesional del chat
'use client'

import { useState } from 'react'
import { Phone, Video, MoreVertical, Copy, Edit3, User, Clock, MessageCircle } from 'lucide-react'
import type { Conversation } from '@/lib/supabase'

interface MessageHeaderProps {
  conversation: Conversation
  isRealtimeConnected: boolean
}

export default function MessageHeader({ conversation, isRealtimeConnected }: MessageHeaderProps) {
  const [showMenu, setShowMenu] = useState(false)
  const [isEditing, setIsEditing] = useState(false)
  const [editedName, setEditedName] = useState(conversation.nombre)

  // Función para copiar teléfono
  const copyPhone = () => {
    navigator.clipboard.writeText(conversation.telefono)
    // Aquí podrías agregar un toast de confirmación
  }

  // Función para obtener color del estado
  const getStateColor = (estado: string) => {
    switch (estado) {
      case 'Nuevo': return 'bg-green-100 text-green-800 border-green-200'
      case 'Seguimiento': return 'bg-yellow-100 text-yellow-800 border-yellow-200'
      case 'Pend_pago': return 'bg-orange-100 text-orange-800 border-orange-200'
      case 'Cerrada': return 'bg-gray-100 text-gray-800 border-gray-200'
      default: return 'bg-gray-100 text-gray-800 border-gray-200'
    }
  }

  // Función para obtener iniciales
  const getInitials = (name: string) => {
    return name.split(' ').map(word => word.charAt(0)).join('').toUpperCase().substring(0, 2)
  }

  return (
    <div className="flex items-center justify-between px-4 py-3 border-b border-gray-200 bg-white h-[60px]">
      {/* Información del contacto - COMPACTO */}
      <div className="flex items-center gap-3">
        {/* Avatar más pequeño */}
        <div className="relative">
          <div className="w-8 h-8 bg-gradient-to-br from-blue-500 to-purple-600 rounded-full flex items-center justify-center text-white font-semibold text-sm">
            {getInitials(conversation.nombre)}
          </div>
          {/* Indicador de estado */}
          <div className={`absolute -bottom-0.5 -right-0.5 w-3 h-3 rounded-full border-2 border-white ${
            conversation.estado === 'Nuevo' ? 'bg-green-500' :
            conversation.estado === 'Seguimiento' ? 'bg-yellow-500' :
            conversation.estado === 'Pend_pago' ? 'bg-orange-500' :
            'bg-gray-400'
          }`} />
        </div>

        {/* Detalles compactos */}
        <div className="flex items-center gap-2">
          {isEditing ? (
            <div className="flex items-center gap-1">
              <input
                type="text"
                value={editedName}
                onChange={(e) => setEditedName(e.target.value)}
                className="text-base font-semibold text-gray-900 bg-transparent border-b border-gray-300 focus:border-blue-500 focus:outline-none"
                autoFocus
              />
              <button
                onClick={() => setIsEditing(false)}
                className="text-green-600 hover:text-green-700 text-xs"
              >
                ✓
              </button>
              <button
                onClick={() => {
                  setEditedName(conversation.nombre)
                  setIsEditing(false)
                }}
                className="text-red-600 hover:text-red-700 text-xs"
              >
                ✕
              </button>
            </div>
          ) : (
            <div className="flex items-center gap-1">
              <h2 className="text-base font-semibold text-gray-900">{conversation.nombre}</h2>
              <button
                onClick={() => setIsEditing(true)}
                className="text-gray-400 hover:text-gray-600"
              >
                <Edit3 size={12} />
              </button>
            </div>
          )}
          
          <span className={`px-2 py-0.5 text-xs rounded-full border ${getStateColor(conversation.estado)}`}>
            {conversation.estado}
          </span>
        </div>
        
        <span className="text-xs text-gray-500">{conversation.telefono}</span>
      </div>
      
      {/* Botones de acción - COMPACTOS */}
      <div className="flex items-center gap-1">
        {/* Estado de conexión */}
        <div className="flex items-center gap-1 mr-3">
          <div className={`w-2 h-2 rounded-full ${isRealtimeConnected ? 'bg-green-500' : 'bg-red-500'}`} />
          <span className="text-xs text-gray-500">
            {isRealtimeConnected ? 'En vivo' : 'Desconectado'}
          </span>
        </div>

        {/* Botones de acción más pequeños */}
        <button className="p-1.5 hover:bg-gray-100 rounded transition-colors" title="Llamar">
          <Phone size={16} className="text-gray-600" />
        </button>
        <button className="p-1.5 hover:bg-gray-100 rounded transition-colors" title="Videollamada">
          <Video size={16} className="text-gray-600" />
        </button>
        
        {/* Menú de opciones */}
        <div className="relative">
          <button
            onClick={() => setShowMenu(!showMenu)}
            className="p-1.5 hover:bg-gray-100 rounded transition-colors"
            title="Más opciones"
          >
            <MoreVertical size={16} className="text-gray-600" />
          </button>
          
          {showMenu && (
            <div className="absolute right-0 top-full mt-2 w-48 bg-white border border-gray-200 rounded-lg shadow-lg z-10">
              <div className="py-1">
                <button className="w-full px-4 py-2 text-left text-sm text-gray-700 hover:bg-gray-100">
                  Marcar como leído
                </button>
                <button className="w-full px-4 py-2 text-left text-sm text-gray-700 hover:bg-gray-100">
                  Archivar conversación
                </button>
                <button className="w-full px-4 py-2 text-left text-sm text-gray-700 hover:bg-gray-100">
                  Bloquear contacto
                </button>
                <hr className="my-1" />
                <button className="w-full px-4 py-2 text-left text-sm text-red-600 hover:bg-red-50">
                  Eliminar conversación
                </button>
              </div>
            </div>
          )}
        </div>
      </div>
    </div>
  )
}
