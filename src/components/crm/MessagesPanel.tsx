// src/components/crm/MessagesPanel.tsx - Clonando diseño exacto de Chatwoot
"use client"

import { useState, useRef, useEffect } from "react"
import MessageBubble from "./MessageBubble"
import MessageInput from "@/components/crm/MessageInput"
import type { Conversation } from "@/lib/supabase"

interface MessagesPanelProps {
  conversation: Conversation | null
  messages: any[]
  loading: boolean
  error: string | null
  isRealtimeConnected: boolean
  onSendMessage: (message: string, files?: File[]) => void
  sendError: string | null
  onUpdateEstado: (conversationId: string, newEstado: string) => void
}

export default function MessagesPanel({
  conversation,
  messages,
  loading,
  error,
  isRealtimeConnected,
  onSendMessage,
  sendError,
  onUpdateEstado
}: MessagesPanelProps) {
  const [messageText, setMessageText] = useState("")
  const [attachedFiles, setAttachedFiles] = useState<File[]>([])
  const messagesEndRef = useRef<HTMLDivElement>(null)

  // Auto-scroll al final de los mensajes
  useEffect(() => {
    messagesEndRef.current?.scrollIntoView({ behavior: 'smooth' })
  }, [messages])

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

  // Handler para enviar mensaje
  const handleSendMessage = () => {
    if (messageText.trim() || attachedFiles.length > 0) {
      onSendMessage(messageText, attachedFiles)
      setMessageText("")
      setAttachedFiles([])
    }
  }

  // Handler para archivos
  const handleFilesSelected = (files: File[]) => {
    setAttachedFiles(prev => [...prev, ...files])
  }

  const handleRemoveFile = (index: number) => {
    setAttachedFiles(prev => prev.filter((_, i) => i !== index))
  }

  return (
    <div className="h-full flex flex-col bg-white">
      {conversation ? (
        <>
          {/* Header conversación - EXACTO de Chatwoot */}
          <div className="h-16 border-b border-gray-200 px-6 flex items-center justify-between">
            {/* Info contacto */}
            <div className="flex items-center gap-3">
              <div className={`w-10 h-10 rounded-full ${getAvatarColor(conversation.persona?.nombre || conversation.nombre || 'Usuario')} flex items-center justify-center text-white font-semibold text-sm`}>
                {getInitials(conversation.persona?.nombre || conversation.nombre || 'Usuario')}
              </div>
              <div>
                <div className="flex items-center gap-2">
                  <h2 className="font-semibold text-gray-900">{conversation.persona?.nombre || conversation.nombre || conversation.persona?.telefono || conversation.telefono || 'Sin nombre'}</h2>
                  <span className="w-2 h-2 rounded-full bg-green-500"></span>
                  <span className="text-xs text-gray-500">Activa</span>
                </div>
                <p className="text-xs text-gray-500">{conversation.persona?.telefono || conversation.telefono}</p>
              </div>
            </div>
            
            {/* Botones acción - EXACTO de Chatwoot */}
            <div className="flex items-center gap-2">
              <button className="p-2 hover:bg-gray-100 rounded transition-colors">
                <svg className="h-4 w-4 text-gray-500" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M3 5a2 2 0 012-2h3.28a1 1 0 01.948.684l1.498 4.493a1 1 0 01-.502 1.21l-2.257 1.13a11.042 11.042 0 005.516 5.516l1.13-2.257a1 1 0 011.21-.502l4.493 1.498a1 1 0 01.684.949V19a2 2 0 01-2 2h-1C9.716 21 3 14.284 3 6V5z" />
                </svg>
              </button>
              <button className="p-2 hover:bg-gray-100 rounded transition-colors">
                <svg className="h-4 w-4 text-gray-500" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M15 10l4.553-2.276A1 1 0 0121 8.618v6.764a1 1 0 01-1.447.894L15 14M5 18h8a2 2 0 002-2V8a2 2 0 00-2-2H5a2 2 0 00-2 2v8a2 2 0 002 2z" />
                </svg>
              </button>
              <button className="p-2 hover:bg-gray-100 rounded transition-colors">
                <svg className="h-4 w-4 text-gray-500" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 5v.01M12 12v.01M12 19v.01M12 6a1 1 0 110-2 1 1 0 010 2zm0 7a1 1 0 110-2 1 1 0 010 2zm0 7a1 1 0 110-2 1 1 0 010 2z" />
                </svg>
              </button>
            </div>
          </div>

          {/* Área de mensajes - EXACTO de Chatwoot */}
          <div className="flex-1 overflow-y-auto px-6 py-4">
            {loading ? (
              <div className="flex items-center justify-center h-full">
                <div className="flex flex-col items-center gap-2">
                  <div className="w-8 h-8 border-4 border-blue-500 border-t-transparent rounded-full animate-spin"></div>
                  <span className="text-gray-500 text-sm">Cargando mensajes...</span>
                </div>
              </div>
            ) : error ? (
              <div className="flex items-center justify-center h-full">
                <div className="text-center">
                  <p className="text-red-500 text-sm">Error al cargar mensajes</p>
                  <p className="text-gray-400 text-xs mt-1">{error}</p>
                </div>
              </div>
            ) : messages.length === 0 ? (
              <div className="flex items-center justify-center h-full">
                <div className="text-center">
                  <p className="text-gray-500 text-sm">No hay mensajes en esta conversación</p>
                  <p className="text-gray-400 text-xs mt-1">Envía el primer mensaje para comenzar</p>
                </div>
              </div>
            ) : (
              <div className="space-y-4">
                {messages.map((message: any, index) => (
                  <MessageBubble 
                    key={index} 
                    message={message} 
                    isOutbound={message.tipo === 'outbound' || message.sender_type === 'agent'}
                    showAvatar={true}
                  />
                ))}
                <div ref={messagesEndRef} />
              </div>
            )}
          </div>

          {/* Input de mensaje - EXACTO de Chatwoot */}
          <div className="border-t border-gray-200 bg-white px-6 py-4">
            <MessageInput
              messageText={messageText}
              onMessageChange={setMessageText}
              onSendMessage={handleSendMessage}
              attachedFiles={attachedFiles}
              onFilesSelected={handleFilesSelected}
              onRemoveFile={handleRemoveFile}
              disabled={loading}
            />
            
            {/* Error de envío */}
            {sendError && (
              <div className="mt-2 text-red-500 text-xs">
                {sendError}
              </div>
            )}
          </div>
        </>
      ) : (
        /* Estado sin conversación seleccionada - EXACTO de Chatwoot */
        <div className="flex-1 flex items-center justify-center bg-gray-50">
          <div className="text-center">
            <div className="w-16 h-16 bg-gray-200 rounded-full flex items-center justify-center mx-auto mb-4">
              <svg className="w-8 h-8 text-gray-400" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M8 12h.01M12 12h.01M16 12h.01M21 12c0 4.418-4.03 8-9 8a9.863 9.863 0 01-4.255-.949L3 20l1.395-3.72C3.512 15.042 3 13.574 3 12c0-4.418 4.03-8 9-8s9 3.582 9 8z" />
              </svg>
            </div>
            <h3 className="text-lg font-semibold text-gray-900 mb-2">Selecciona una conversación</h3>
            <p className="text-gray-500 text-sm">Elige una conversación de la lista para comenzar a chatear</p>
          </div>
        </div>
      )}
    </div>
  )
}
