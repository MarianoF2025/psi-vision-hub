// src/app/crm/components/ChatView.tsx
'use client'

import { useState, useRef, useEffect } from 'react'
import { Paperclip, Smile, Hash, AtSign, Send, CheckCheck, ArrowDown } from 'lucide-react'
import type { Conversation, Message } from '@/lib/supabase'
import MessageDateGroup from '@/components/crm/MessageDateGroup'

interface ChatViewProps {
  conversation: Conversation | null
  messages: Message[]
  messagesLoading: boolean
  messagesError: string | null
  onSendMessage: (content: string) => void
  sending: boolean
  uploadProgress?: number
  isRealtimeConnected?: boolean
}

export default function ChatView({
  conversation,
  messages,
  messagesLoading,
  messagesError,
  onSendMessage,
  sending,
  uploadProgress = 0,
  isRealtimeConnected = false
}: ChatViewProps) {
  const [messageInput, setMessageInput] = useState('')
  const [showScrollButton, setShowScrollButton] = useState(false)
  const [newMessagesCount, setNewMessagesCount] = useState(0)
  const messagesContainerRef = useRef<HTMLDivElement>(null)
  const messagesEndRef = useRef<HTMLDivElement>(null)
  const lastMessageCountRef = useRef(messages.length)

  // Función para hacer scroll al final
  const scrollToBottom = (force = false) => {
    if (messagesEndRef.current) {
      messagesEndRef.current.scrollIntoView({ behavior: 'smooth' })
      if (force) {
        setNewMessagesCount(0)
        setShowScrollButton(false)
      }
    }
  }

  // Detectar si el usuario está al final del scroll
  const handleScroll = () => {
    if (messagesContainerRef.current) {
      const { scrollTop, scrollHeight, clientHeight } = messagesContainerRef.current
      const isAtBottom = scrollHeight - scrollTop - clientHeight < 50
      setShowScrollButton(!isAtBottom && messages.length > 0)
    }
  }

  // Auto-scroll cuando llegan nuevos mensajes
  useEffect(() => {
    if (messages.length > lastMessageCountRef.current) {
      const newMessages = messages.length - lastMessageCountRef.current
      setNewMessagesCount(prev => prev + newMessages)
      
      // Solo auto-scroll si el usuario está cerca del final
      if (messagesContainerRef.current) {
        const { scrollTop, scrollHeight, clientHeight } = messagesContainerRef.current
        const isNearBottom = scrollHeight - scrollTop - clientHeight < 100
        
        if (isNearBottom) {
          setTimeout(() => scrollToBottom(), 100)
          setNewMessagesCount(0)
        }
      }
    }
    lastMessageCountRef.current = messages.length
  }, [messages.length])

  // Auto-scroll cuando se carga una nueva conversación
  useEffect(() => {
    if (conversation?.id) {
      setTimeout(() => scrollToBottom(), 100)
      setNewMessagesCount(0)
      setShowScrollButton(false)
    }
  }, [conversation?.id])

  const handleSendMessage = () => {
    if (messageInput.trim() && !sending) {
      onSendMessage(messageInput.trim())
      setMessageInput('')
      // Scroll al final después de enviar
      setTimeout(() => scrollToBottom(), 100)
    }
  }

  const handleKeyPress = (e: React.KeyboardEvent) => {
    if (e.key === 'Enter' && !e.shiftKey) {
      e.preventDefault()
      handleSendMessage()
    }
  }

  if (!conversation) {
    return (
      <div className="flex-1 bg-white flex items-center justify-center">
        <div className="text-center text-gray-500">
          <p className="text-lg">Selecciona una conversación</p>
          <p className="text-sm mt-2">para comenzar a chatear</p>
        </div>
      </div>
    )
  }

  return (
    <div className="flex-1 bg-white flex flex-col">
      {/* Header del chat */}
      <div className="p-4 border-b border-gray-200 bg-white">
        <div className="flex items-center justify-between">
          <div className="flex items-center gap-3">
            <div className="w-10 h-10 bg-blue-500 rounded-full flex items-center justify-center">
              <span className="text-white font-semibold">
                {conversation.nombre.charAt(0).toUpperCase()}
              </span>
            </div>
            <div>
              <h3 className="font-semibold text-gray-900">{conversation.nombre}</h3>
              <div className="flex items-center gap-2">
                <span className={`px-2 py-1 text-xs rounded-full ${
                  conversation.estado === 'Nuevo' ? 'bg-green-100 text-green-800' :
                  conversation.estado === 'Seguimiento' ? 'bg-yellow-100 text-yellow-800' :
                  conversation.estado === 'Pend_pago' ? 'bg-orange-100 text-orange-800' :
                  'bg-gray-100 text-gray-800'
                }`}>
                  {conversation.estado}
                </span>
                <span className="text-sm text-gray-500">{conversation.telefono}</span>
              </div>
            </div>
          </div>
          <div className="flex items-center gap-2">
            <button className="p-2 hover:bg-gray-100 rounded-lg">
              <span className="text-gray-600">📞</span>
            </button>
            <button className="p-2 hover:bg-gray-100 rounded-lg">
              <span className="text-gray-600">📹</span>
            </button>
            <button className="p-2 hover:bg-gray-100 rounded-lg">
              <span className="text-gray-600">ℹ️</span>
            </button>
          </div>
        </div>
      </div>

      {/* Área de mensajes */}
      <div 
        ref={messagesContainerRef}
        className="flex-1 overflow-y-auto p-4 space-y-4 bg-gray-50 relative"
        onScroll={handleScroll}
      >
        {messagesLoading ? (
          <div className="flex justify-center items-center h-full">
            <div className="text-gray-500">Cargando mensajes...</div>
          </div>
        ) : messagesError ? (
          <div className="flex justify-center items-center h-full">
            <div className="text-red-500 text-center">
              <p>Error al cargar mensajes</p>
              <p className="text-sm mt-1">{messagesError}</p>
            </div>
          </div>
        ) : messages.length === 0 ? (
          <div className="flex justify-center items-center h-full">
            <div className="text-gray-500 text-center">
              <p>No hay mensajes aún</p>
              <p className="text-sm mt-1">Envía el primer mensaje para comenzar</p>
            </div>
          </div>
        ) : (
          <>
            <MessageDateGroup 
              messages={messages} 
              isOutgoing={false} 
            />
            <div ref={messagesEndRef} />
          </>
        )}

        {/* Botón flotante de nuevos mensajes */}
        {showScrollButton && (
          <button
            onClick={() => scrollToBottom(true)}
            className="absolute bottom-4 left-1/2 transform -translate-x-1/2 bg-blue-500 hover:bg-blue-600 text-white px-4 py-2 rounded-full shadow-lg flex items-center gap-2 transition-all duration-200 z-20"
          >
            <ArrowDown size={16} />
            <span className="text-sm font-medium">
              {newMessagesCount > 0 ? `Nuevos mensajes (${newMessagesCount})` : 'Nuevos mensajes'}
            </span>
          </button>
        )}
      </div>

      {/* Input de mensaje */}
      <div className="p-4 border-t border-gray-200 bg-white">
        <div className="flex items-end gap-2">
          <div className="flex items-center gap-1">
            <button className="p-2 hover:bg-gray-100 rounded-lg">
              <Paperclip size={20} className="text-gray-500" />
            </button>
            <button className="p-2 hover:bg-gray-100 rounded-lg">
              <Smile size={20} className="text-gray-500" />
            </button>
            <button className="p-2 hover:bg-gray-100 rounded-lg">
              <Hash size={20} className="text-gray-500" />
            </button>
            <button className="p-2 hover:bg-gray-100 rounded-lg">
              <AtSign size={20} className="text-gray-500" />
            </button>
          </div>
          
          <div className="flex-1">
            <textarea
              value={messageInput}
              onChange={(e) => setMessageInput(e.target.value)}
              onKeyPress={handleKeyPress}
              placeholder="Escribe un mensaje..."
              className="w-full p-3 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent resize-none"
              rows={1}
              style={{ minHeight: '44px', maxHeight: '120px' }}
            />
          </div>
          
          <button
            onClick={handleSendMessage}
            disabled={!messageInput.trim() || sending}
            className="p-3 bg-blue-500 text-white rounded-lg hover:bg-blue-600 disabled:opacity-50 disabled:cursor-not-allowed transition-colors"
          >
            <Send size={20} />
          </button>
        </div>
      </div>
    </div>
  )
}
