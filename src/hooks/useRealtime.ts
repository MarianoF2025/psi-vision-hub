// src/hooks/useRealtime.ts
'use client'

import { useEffect, useRef, useCallback, useState } from 'react'
import { supabase } from '../lib/supabase'
import type { RealtimeChannel } from '@supabase/supabase-js'

export interface RealtimeSubscription {
  table: string
  event: 'INSERT' | 'UPDATE' | 'DELETE' | '*'
  schema?: string
  filter?: string
}

export interface UseRealtimeOptions {
  subscriptions: RealtimeSubscription[]
  onInsert?: (payload: any) => void
  onUpdate?: (payload: any) => void
  onDelete?: (payload: any) => void
  onError?: (error: Error) => void
  enabled?: boolean
}

export function useRealtime({
  subscriptions,
  onInsert,
  onUpdate,
  onDelete,
  onError,
  enabled = false // TEMPORALMENTE DESACTIVADO PARA DEBUGGING
}: UseRealtimeOptions) {
  const channelRef = useRef<RealtimeChannel | null>(null)
  const reconnectTimeoutRef = useRef<NodeJS.Timeout | null>(null)
  const [isConnected, setIsConnected] = useState(false)

  const createChannel = useCallback(() => {
    if (!enabled) return

    // Limpiar canal existente
    if (channelRef.current) {
      supabase.removeChannel(channelRef.current)
    }

    const channelName = `realtime-${Date.now()}-${Math.random().toString(36).substr(2, 9)}`
    const channel = supabase.channel(channelName)

    // Configurar suscripciones
    subscriptions.forEach(sub => {
      const { table, event, schema = 'public', filter } = sub

      const config: any = {
        event: event === '*' ? '*' : event, // Mantener mayúsculas según API
        schema,
        table
      }
      if (filter) config.filter = filter

      channel.on(
        'postgres_changes',
        config,
        (payload) => {
          console.log(`Realtime ${config.event} en ${table}:`, payload)

          try {
            switch (payload.eventType) {
              case 'INSERT':
                onInsert?.(payload)
                break
              case 'UPDATE':
                onUpdate?.(payload)
                break
              case 'DELETE':
                onDelete?.(payload)
                break
            }
          } catch (error) {
            console.error('Error procesando evento realtime:', error)
            onError?.(error as Error)
          }
        }
      )
    })

    // Suscribirse al canal
    channel.subscribe((status) => {
      console.log('Canal realtime suscrito:', status)
      if (status === 'SUBSCRIBED') {
        setIsConnected(true)
        console.log('✅ Realtime conectado exitosamente')
      } else if (status === 'CHANNEL_ERROR') {
        setIsConnected(false)
        console.warn('⚠️ Realtime no disponible, usando polling como fallback')
        // No llamar onError para evitar interrumpir el funcionamiento
      } else if (status === 'CLOSED') {
        setIsConnected(false)
      }
    })

    channelRef.current = channel
  }, [subscriptions, onInsert, onUpdate, onDelete, onError, enabled])

  useEffect(() => {
    if (enabled) {
      createChannel()
    }

    return () => {
      // Cleanup
      if (reconnectTimeoutRef.current) {
        clearTimeout(reconnectTimeoutRef.current)
      }
      
      if (channelRef.current) {
        console.log('Limpiando canal realtime...')
        supabase.removeChannel(channelRef.current)
        channelRef.current = null
      }
    }
  }, [enabled, createChannel])

  const reconnect = useCallback(() => {
    console.log('Reconectando manualmente...')
    createChannel()
  }, [createChannel])

  return {
    reconnect,
    isConnected
  }
}

// Hook específico para mensajes
export function useRealtimeMessages(
  conversationId: string | null | undefined,
  onMessageChange: () => void
) {
  return useRealtime({
    subscriptions: [
      {
        table: 'interaccion',
        event: 'INSERT',
        filter: `conversacion_id=eq.${conversationId}`
      },
      {
        table: 'interaccion',
        event: 'UPDATE',
        filter: `conversacion_id=eq.${conversationId}`
      }
    ],
    onInsert: (payload) => {
      console.log('Nuevo mensaje recibido:', payload)
      onMessageChange()
    },
    onUpdate: (payload) => {
      console.log('Mensaje actualizado:', payload)
      onMessageChange()
    },
    enabled: !!conversationId
  })
}

// Hook específico para conversaciones
export function useRealtimeConversations(
  onConversationChange: () => void
) {
  return useRealtime({
    subscriptions: [
      {
        table: 'conversacion',
        event: 'UPDATE'
      },
      {
        table: 'conversacion',
        event: 'INSERT'
      }
    ],
    onInsert: (payload) => {
      console.log('Nueva conversación:', payload)
      onConversationChange()
    },
    onUpdate: (payload) => {
      console.log('Conversación actualizada:', payload)
      onConversationChange()
    }
  })
}
