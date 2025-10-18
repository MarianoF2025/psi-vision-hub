// src/components/crm/MessageBubble.tsx - Clonando diseño exacto de Chatwoot
"use client"

interface MessageBubbleProps {
  message: any
  isOutbound: boolean
  showAvatar?: boolean
}

export default function MessageBubble({ message, isOutbound, showAvatar = true }: MessageBubbleProps) {
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

  // Función para formatear fecha
  const formatMessageTime = (dateString: string) => {
    const date = new Date(dateString)
    return date.toLocaleTimeString('es-ES', { 
      hour: '2-digit', 
      minute: '2-digit',
      hour12: true 
    })
  }

  // Obtener contenido del mensaje
  const messageContent = message.contenido || message.mensaje || message.content || 'Sin contenido'
  const messageTime = message.created_at || message.fecha_creacion || new Date().toISOString()
  const senderName = message.sender_name || message.nombre || 'Usuario'

  if (isOutbound) {
    // Mensaje saliente (derecha) - EXACTO de Chatwoot
    return (
      <div className="flex items-start gap-2 mb-4 justify-end">
        <div className="max-w-[70%]">
          <div className="bg-blue-500 text-white rounded-lg px-4 py-2">
            <p className="text-sm leading-relaxed">{messageContent}</p>
          </div>
          <span className="text-xs text-gray-500 mt-1 block text-right">
            {formatMessageTime(messageTime)}
          </span>
        </div>
        {showAvatar && (
          <div className="w-8 h-8 rounded-full bg-blue-500 flex items-center justify-center text-white text-xs font-semibold flex-shrink-0">
            {getInitials(senderName)}
          </div>
        )}
      </div>
    )
  } else {
    // Mensaje entrante (izquierda) - EXACTO de Chatwoot
    return (
      <div className="flex items-start gap-2 mb-4">
        {showAvatar && (
          <div className={`w-8 h-8 rounded-full ${getAvatarColor(senderName)} flex items-center justify-center text-white text-xs font-semibold flex-shrink-0`}>
            {getInitials(senderName)}
          </div>
        )}
        <div className="max-w-[70%]">
          <div className="bg-gray-100 rounded-lg px-4 py-2">
            <p className="text-sm leading-relaxed text-gray-900">{messageContent}</p>
          </div>
          <span className="text-xs text-gray-500 mt-1 block">
            {formatMessageTime(messageTime)}
          </span>
        </div>
      </div>
    )
  }
}