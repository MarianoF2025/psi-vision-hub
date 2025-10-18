// src/components/crm/MessageGroup.tsx - Agrupación de mensajes por fecha
'use client'

import { useMemo } from 'react'
import type { Message } from '@/lib/supabase'
import MessageBubble from './MessageBubble'

interface MessageGroupProps {
  messages: Message[]
  isOutgoing: boolean
}

export default function MessageGroup({ messages, isOutgoing }: MessageGroupProps) {
  // Función para formatear fecha
  const formatDate = (timestamp: string) => {
    const date = new Date(timestamp)
    const now = new Date()
    const today = new Date(now.getFullYear(), now.getMonth(), now.getDate())
    const yesterday = new Date(today.getTime() - 24 * 60 * 60 * 1000)
    const messageDate = new Date(date.getFullYear(), date.getMonth(), date.getDate())

    if (messageDate.getTime() === today.getTime()) {
      return 'Hoy'
    } else if (messageDate.getTime() === yesterday.getTime()) {
      return 'Ayer'
    } else {
      return date.toLocaleDateString('es-ES', { 
        day: 'numeric', 
        month: 'long',
        year: date.getFullYear() !== now.getFullYear() ? 'numeric' : undefined
      })
    }
  }

  // Función para formatear hora
  const formatTime = (timestamp: string) => {
    return new Date(timestamp).toLocaleTimeString('es-ES', {
      hour: '2-digit',
      minute: '2-digit'
    })
  }

  // Agrupar mensajes por fecha
  const groupedMessages = useMemo(() => {
    const groups: { [key: string]: Message[] } = {}
    
    messages.forEach(message => {
      const date = new Date(message.timestamp)
      const dateKey = date.toDateString()
      
      if (!groups[dateKey]) {
        groups[dateKey] = []
      }
      groups[dateKey].push(message)
    })

    return groups
  }, [messages])

  return (
    <div className="space-y-6">
      {Object.entries(groupedMessages).map(([dateKey, dayMessages]) => (
        <div key={dateKey} className="space-y-4">
          {/* Separador de fecha */}
          <div className="flex items-center justify-center">
            <div className="bg-gray-100 text-gray-600 text-xs px-3 py-1 rounded-full">
              {formatDate(dayMessages[0].timestamp)}
            </div>
          </div>

          {/* Mensajes del día */}
          <div className="space-y-2">
            {dayMessages.map((message, index) => {
              const prevMessage = index > 0 ? dayMessages[index - 1] : null
              const nextMessage = index < dayMessages.length - 1 ? dayMessages[index + 1] : null
              
              // Determinar si mostrar timestamp
              const showTimestamp = !nextMessage || 
                new Date(message.timestamp).getTime() - new Date(nextMessage.timestamp).getTime() > 5 * 60 * 1000 // 5 minutos

              return (
                <MessageBubble
                  key={message.id}
                  message={message}
                  showTimestamp={showTimestamp}
                  isFirstInGroup={!prevMessage || prevMessage.remitente !== message.remitente}
                  isLastInGroup={!nextMessage || nextMessage.remitente !== message.remitente}
                />
              )
            })}
          </div>
        </div>
      ))}
    </div>
  )
}



