// src/components/crm/ChatView.tsx - Actualizado para Supabase
'use client'

import { useState, useEffect, useRef, useCallback } from 'react'
import { Send, Hash, AtSign, Loader2, ArrowDown } from 'lucide-react'
import type { Conversation, Message } from '@/lib/supabase'
import EmojiPicker from './EmojiPicker'
import FileUploadButton from './FileUploadButton'
import FilePreview, { type FileWithPreview } from './FilePreview'
import DragDropZone from './DragDropZone'
import MessageHeader from './MessageHeader'
import MessageDateGroup from './MessageDateGroup'

interface ChatViewProps {
  conversation: Conversation | null
  messages: Message[]
  messagesLoading: boolean
  messagesError: string | null
  onSendMessage: (content: string, files?: File[]) => Promise<void>
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
  const [newMessage, setNewMessage] = useState('')
  const [selectedFiles, setSelectedFiles] = useState<FileWithPreview[]>([])
  const [showScrollButton, setShowScrollButton] = useState(false)
  const [newMessagesCount, setNewMessagesCount] = useState(0)
  const messagesEndRef = useRef<HTMLDivElement>(null)
  const textareaRef = useRef<HTMLTextAreaElement>(null)
  const messagesContainerRef = useRef<HTMLDivElement>(null)
  const lastMessageCountRef = useRef(0)

  // Función para hacer scroll al final
  const scrollToBottom = useCallback((force = false) => {
    const container = messagesContainerRef.current
    if (container) {
      // Solo hacer scroll si el usuario está cerca del final o si es forzado
      const { scrollTop, scrollHeight, clientHeight } = container
      const isNearBottom = scrollHeight - scrollTop - clientHeight < 100
      
      if (force || isNearBottom) {
        // Usar requestAnimationFrame para asegurar que el DOM esté actualizado
        requestAnimationFrame(() => {
          if (container) {
            container.scrollTop = container.scrollHeight
            setShowScrollButton(false)
            setNewMessagesCount(0) // Limpiar contador cuando se hace scroll al final
          }
        })
      }
    }
  }, [])

  // Auto-scroll cuando cambian los mensajes
  useEffect(() => {
    if (messages.length > 0) {
      const timer = setTimeout(() => {
        scrollToBottom(true) // Forzar scroll para mensajes nuevos
      }, 50)
      return () => clearTimeout(timer)
    }
  }, [messages.length, scrollToBottom])

  // Auto-scroll cuando se envía un mensaje
  useEffect(() => {
    if (!sending && newMessage === '') {
      const timer = setTimeout(() => {
        scrollToBottom(true) // Forzar scroll después de enviar
      }, 100)
      return () => clearTimeout(timer)
    }
  }, [sending, newMessage, scrollToBottom])

  // Auto-scroll cuando se carga la conversación
  useEffect(() => {
    if (conversation && messages.length > 0) {
      // Inicializar contador de mensajes
      lastMessageCountRef.current = messages.length
      setNewMessagesCount(0)
      
      const timer = setTimeout(() => {
        scrollToBottom(true) // Forzar scroll al cargar conversación
      }, 200)
      return () => clearTimeout(timer)
    }
  }, [conversation?.id, scrollToBottom])

  // Auto-resize del textarea
  useEffect(() => {
    if (textareaRef.current) {
      textareaRef.current.style.height = 'auto'
      textareaRef.current.style.height = textareaRef.current.scrollHeight + 'px'
    }
  }, [newMessage])

  // Detectar si el usuario está en la parte inferior del chat
  useEffect(() => {
    const container = messagesContainerRef.current
    if (!container) return

    const handleScroll = () => {
      const { scrollTop, scrollHeight, clientHeight } = container
      const isAtBottom = scrollHeight - scrollTop - clientHeight < 50
      setShowScrollButton(!isAtBottom)
    }

    // Verificar estado inicial
    handleScroll()

    container.addEventListener('scroll', handleScroll, { passive: true })
    return () => container.removeEventListener('scroll', handleScroll)
  }, [messages.length])

  // Auto-scroll cuando llegan mensajes nuevos por realtime
  useEffect(() => {
    if (messages.length > 0) {
      // Contar mensajes nuevos
      if (messages.length > lastMessageCountRef.current) {
        const newCount = messages.length - lastMessageCountRef.current
        setNewMessagesCount(prev => prev + newCount)
        lastMessageCountRef.current = messages.length
      }

      // Hacer scroll inmediatamente y luego con delay
      scrollToBottom(true)
      const timer = setTimeout(() => {
        scrollToBottom(true) // Siempre hacer scroll para mensajes nuevos
      }, 50)
      return () => clearTimeout(timer)
    }
  }, [messages, scrollToBottom])

  // Auto-scroll cuando cambia el estado de realtime (mensajes nuevos llegando)
  useEffect(() => {
    if (messages.length > 0 && isRealtimeConnected) {
      const timer = setTimeout(() => {
        scrollToBottom(true) // Forzar scroll cuando se conecta realtime
      }, 200)
      return () => clearTimeout(timer)
    }
  }, [isRealtimeConnected, messages.length, scrollToBottom])

  // Auto-scroll adicional para asegurar que funcione
  useEffect(() => {
    if (messages.length > 0) {
      const timer = setTimeout(() => {
        scrollToBottom(true)
      }, 300)
      return () => clearTimeout(timer)
    }
  }, [messages.length, scrollToBottom])

  const handleSendMessage = async () => {
    console.log('🔍 CHATVIEW: handleSendMessage llamado con:', {
      newMessage: newMessage.substring(0, 50),
      selectedFilesCount: selectedFiles.length,
      conversation: conversation ? {
        id: conversation.id,
        chatwoot_conversation_id: conversation.chatwoot_conversation_id,
        nombre: conversation.nombre
      } : null,
      sending
    })

    if ((!newMessage.trim() && selectedFiles.length === 0) || !conversation || sending) {
      console.log('🔍 CHATVIEW: Validación falló:', {
        hasMessage: !!newMessage.trim(),
        hasFiles: selectedFiles.length > 0,
        hasConversation: !!conversation,
        isSending: sending
      })
      return
    }

    const messageToSend = newMessage.trim()
    const filesToSend = selectedFiles.map(f => f.file)
    
    console.log('🔍 CHATVIEW: Preparando envío:', {
      messageToSend: messageToSend.substring(0, 50),
      filesToSend: filesToSend.length,
      conversationId: conversation.chatwoot_conversation_id
    })
    
    // Limpiar inputs inmediatamente para mejor UX
    setNewMessage('')
    setSelectedFiles([])

    try {
      console.log('🔍 CHATVIEW: Llamando a onSendMessage...')
      // Enviar mensaje con archivos adjuntos
      await onSendMessage(messageToSend, filesToSend)
      console.log('✅ CHATVIEW: onSendMessage completado exitosamente')

      // Limpiar previews
      selectedFiles.forEach(fileData => {
        if (fileData.preview) {
          URL.revokeObjectURL(fileData.preview)
        }
      })

      // Forzar scroll después de enviar
      setTimeout(() => {
        scrollToBottom(true)
      }, 100)
    } catch (error) {
      console.error('Error enviando mensaje:', {
        error: error,
        message: error instanceof Error ? error.message : 'Error desconocido',
        stack: error instanceof Error ? error.stack : undefined,
        conversationId: conversation?.id,
        chatwootConversationId: conversation?.chatwoot_conversation_id,
        messageToSend: messageToSend.substring(0, 50) + '...',
        filesCount: filesToSend?.length || 0
      })
      // Si hay error, restaurar el mensaje (pero no los archivos por seguridad)
      setNewMessage(messageToSend)
    }
  }

  const handleKeyPress = (e: React.KeyboardEvent) => {
    // Evitar enviar mientras se está componiendo (IME) o con Shift
    // y permitir Enter para enviar
    // @ts-expect-error: algunos navegadores exponen isComposing
    if (e.key === 'Enter' && !e.shiftKey && !e.isComposing) {
      e.preventDefault()
      handleSendMessage()
    }
  }

  const handleEmojiSelect = (emoji: string) => {
    setNewMessage(prev => prev + emoji)
    textareaRef.current?.focus()
  }

  const handleFilesSelected = (files: FileWithPreview[]) => {
    setSelectedFiles(prev => [...prev, ...files])
  }

  const handleFilesDropped = (files: FileWithPreview[]) => {
    setSelectedFiles(prev => [...prev, ...files])
  }

  const handleRemoveFile = (index: number) => {
    setSelectedFiles(prev => {
      const newFiles = [...prev]
      const removed = newFiles.splice(index, 1)[0]
      // Limpiar URL de preview
      if (removed.preview) {
        URL.revokeObjectURL(removed.preview)
      }
      return newFiles
    })
  }

  // Limpiar previews al desmontar
  useEffect(() => {
    return () => {
      selectedFiles.forEach(fileData => {
        if (fileData.preview) {
          URL.revokeObjectURL(fileData.preview)
        }
      })
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [])

  if (!conversation) {
    return (
      <div className="flex-1 flex items-center justify-center bg-gray-50">
        <div className="text-center text-gray-500">
          <p className="text-lg mb-2">Selecciona una conversación</p>
          <p className="text-sm">Elige una conversación de la lista para comenzar</p>
        </div>
      </div>
    )
  }

  return (
    <div className="flex flex-col h-full bg-white">
      {/* Header compacto */}
      <MessageHeader 
        conversation={conversation} 
        isRealtimeConnected={isRealtimeConnected}
      />

      {/* Área de mensajes - OCUPA TODO EL ESPACIO DISPONIBLE */}
      <div ref={messagesContainerRef} className="flex-1 overflow-y-auto p-4 bg-gray-50">
          {messagesLoading ? (
            <div className="flex items-center justify-center h-full">
              <div className="flex flex-col items-center gap-2">
                <Loader2 className="w-8 h-8 text-blue-500 animate-spin" />
                <span className="text-gray-500">Cargando mensajes...</span>
              </div>
            </div>
          ) : messagesError ? (
            <div className="flex items-center justify-center h-full">
              <div className="text-red-500 text-center">
                <p>Error al cargar mensajes:</p>
                <p className="text-sm mt-1">{messagesError}</p>
              </div>
            </div>
          ) : messages.length === 0 ? (
            <div className="flex items-center justify-center h-full">
              <div className="text-gray-500 text-center">
                <p>No hay mensajes en esta conversación</p>
                <p className="text-sm mt-2">Envía el primer mensaje para comenzar</p>
              </div>
            </div>
          ) : (
            <div className="space-y-4">
              <MessageDateGroup messages={messages} isOutgoing={false} />
              <div ref={messagesEndRef} />
            </div>
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

          {/* Botón de test removido para limpiar la interfaz */}
        </div>

      {/* Preview de archivos */}
      <FilePreview files={selectedFiles} onRemove={handleRemoveFile} />

      {/* Indicador de progreso de upload */}
      {uploadProgress > 0 && uploadProgress < 100 && (
        <div className="px-4 py-2 bg-blue-50 border-t border-blue-100">
          <div className="flex items-center gap-2">
            <div className="flex-1">
              <div className="flex justify-between text-xs text-blue-700 mb-1">
                <span>Subiendo archivos...</span>
                <span>{uploadProgress}%</span>
              </div>
              <div className="w-full bg-blue-200 rounded-full h-2">
                <div 
                  className="bg-blue-600 h-2 rounded-full transition-all duration-300"
                  style={{ width: `${uploadProgress}%` }}
                />
              </div>
            </div>
          </div>
        </div>
      )}

      {/* Input de envío - PEGADO AL FONDO COMO CHATWOOT */}
      <DragDropZone onFilesDropped={handleFilesDropped}>
        <div className="border-t border-gray-200 bg-white p-4">
        <div className="flex items-end gap-2">
          {/* Botones de la izquierda - COMPACTOS */}
          <div className="flex gap-1">
            <button 
              type="button"
              className="h-9 w-9 flex items-center justify-center hover:bg-gray-100 rounded transition-colors"
              title="Adjuntar archivo"
            >
              <FileUploadButton onFilesSelected={handleFilesSelected} disabled={sending} />
            </button>
            <button 
              type="button"
              className="h-9 w-9 flex items-center justify-center hover:bg-gray-100 rounded transition-colors"
              title="Emoji"
            >
              <EmojiPicker onEmojiSelect={handleEmojiSelect} />
            </button>
            <button 
              type="button"
              className="h-9 w-9 flex items-center justify-center hover:bg-gray-100 rounded transition-colors"
              title="Plantillas rápidas"
            >
              <Hash size={16} className="text-gray-500" />
            </button>
            <button 
              type="button"
              className="h-9 w-9 flex items-center justify-center hover:bg-gray-100 rounded transition-colors"
              title="Mencionar agente"
            >
              <AtSign size={16} className="text-gray-500" />
            </button>
          </div>
          
          {/* Textarea - ESTILO CHATWOOT */}
          <div className="flex-1">
            <textarea
              ref={textareaRef}
              value={newMessage}
              onChange={(e) => setNewMessage(e.target.value)}
              onKeyDown={handleKeyPress}
              placeholder="Escribe un mensaje..."
              className="w-full p-3 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent resize-none text-gray-900 placeholder:text-gray-400 bg-white min-h-[40px] max-h-[120px]"
              rows={1}
              disabled={sending}
            />
          </div>
          
          {/* Botón de envío - COMPACTO */}
          <button
            onClick={handleSendMessage}
            disabled={(!newMessage.trim() && selectedFiles.length === 0) || sending}
            className="h-9 w-9 bg-blue-500 text-white rounded hover:bg-blue-600 disabled:opacity-50 disabled:cursor-not-allowed flex items-center justify-center transition-colors"
            title="Enviar mensaje"
          >
            {sending ? (
              <Loader2 size={16} className="animate-spin" />
            ) : (
              <Send size={16} />
            )}
          </button>
        </div>
        </div>
      </DragDropZone>
    </div>
  )
}