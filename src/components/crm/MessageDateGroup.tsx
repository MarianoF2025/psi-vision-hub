import React from 'react'
import { Message } from '@/lib/supabase'
import MessageBubble from './MessageBubble'

interface MessageDateGroupProps {
  messages: Message[]
  isOutgoing: boolean
}

export default function MessageDateGroup({ messages, isOutgoing }: MessageDateGroupProps) {
  // Función para formatear fecha del separador
  const formatDateSeparator = (date: Date) => {
    const now = new Date()
    const today = new Date(now.getFullYear(), now.getMonth(), now.getDate())
    const yesterday = new Date(today)
    yesterday.setDate(yesterday.getDate() - 1)
    const messageDate = new Date(date.getFullYear(), date.getMonth(), date.getDate())

    if (messageDate.getTime() === today.getTime()) {
      return 'Hoy'
    } else if (messageDate.getTime() === yesterday.getTime()) {
      return 'Ayer'
    } else {
      return date.toLocaleDateString('es-ES', { day: '2-digit', month: '2-digit', year: 'numeric' })
    }
  }

  // Agrupar mensajes por fecha
  const groupedMessages = messages.reduce((groups, message) => {
    const messageDate = new Date(message.created_at)
    const dateKey = messageDate.toDateString()
    
    if (!groups[dateKey]) {
      groups[dateKey] = {
        date: messageDate,
        messages: []
      }
    }
    groups[dateKey].messages.push(message)
    return groups
  }, {} as Record<string, { date: Date; messages: Message[] }>)

  // Ordenar fechas
  const sortedDates = Object.keys(groupedMessages).sort((a, b) => {
    return new Date(a).getTime() - new Date(b).getTime()
  })

  return (
    <div className="space-y-6">
      {sortedDates.map((dateKey) => {
        const group = groupedMessages[dateKey]
        return (
          <div key={dateKey} className="space-y-4">
            {/* Separador de fecha */}
            <div className="flex items-center justify-center my-4">
              <div className="flex items-center gap-4 w-full">
                <div className="flex-1 h-px bg-gray-300"></div>
                <span className="text-sm text-gray-500 bg-white px-3 py-1 rounded-full border border-gray-200">
                  {formatDateSeparator(group.date)}
                </span>
                <div className="flex-1 h-px bg-gray-300"></div>
              </div>
            </div>

            {/* Mensajes del día */}
            <div className="space-y-2">
              {group.messages.map((message, index) => (
                <MessageBubble
                  key={message.id}
                  message={message}
                  showTimestamp={true}
                  isFirstInGroup={index === 0}
                  isLastInGroup={index === group.messages.length - 1}
                />
              ))}
            </div>
          </div>
        )
      })}
    </div>
  )
}