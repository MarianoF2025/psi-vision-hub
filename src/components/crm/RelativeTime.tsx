import { useMemo } from 'react'

interface RelativeTimeProps {
  timestamp: string
  className?: string
}

export default function RelativeTime({ timestamp, className = '' }: RelativeTimeProps) {
  const relativeTime = useMemo(() => {
    const now = new Date()
    const messageTime = new Date(timestamp)
    const diffInMs = now.getTime() - messageTime.getTime()
    const diffInMinutes = Math.floor(diffInMs / (1000 * 60))
    const diffInHours = Math.floor(diffInMs / (1000 * 60 * 60))
    const diffInDays = Math.floor(diffInMs / (1000 * 60 * 60 * 24))

    // Si es hoy
    if (messageTime.toDateString() === now.toDateString()) {
      if (diffInMinutes < 1) return 'Ahora'
      if (diffInMinutes < 60) return `Hace ${diffInMinutes} min`
      return messageTime.toLocaleTimeString('es-ES', { 
        hour: '2-digit', 
        minute: '2-digit' 
      })
    }

    // Si es ayer
    const yesterday = new Date(now)
    yesterday.setDate(yesterday.getDate() - 1)
    if (messageTime.toDateString() === yesterday.toDateString()) {
      return 'Ayer'
    }

    // Si es esta semana
    if (diffInDays < 7) {
      return messageTime.toLocaleDateString('es-ES', { 
        weekday: 'long' 
      })
    }

    // Si es más antiguo
    return messageTime.toLocaleDateString('es-ES', { 
      day: '2-digit', 
      month: '2-digit' 
    })
  }, [timestamp])

  return (
    <span className={`text-xs text-gray-500 ${className}`}>
      {relativeTime}
    </span>
  )
}



