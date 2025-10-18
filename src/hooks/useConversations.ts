
// src/hooks/useConversations.ts
'use client'

import { useState, useEffect, useCallback, useRef } from 'react'
import { supabase, type Conversation } from '../lib/supabase'
import { useRealtimeConversations } from './useRealtime'

interface UseConversationsReturn {
  conversations: Conversation[]
  loading: boolean
  error: string | null
  refetch: () => void
  isRealtimeConnected: boolean
}

export function useConversations(
  inboxId?: number,
  assigneeId?: number
): UseConversationsReturn {
  const [conversations, setConversations] = useState<Conversation[]>([])
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState<string | null>(null)
  const [isRefreshing, setIsRefreshing] = useState(false)
  const lastFetchTimeRef = useRef<number>(0)

  const fetchConversations = useCallback(async (isRealtimeUpdate = false) => {
    try {
      if (!isRealtimeUpdate) {
        setLoading(true)
      } else {
        setIsRefreshing(true)
      }
      setError(null)
      
      // Evitar múltiples fetches simultáneos
      const now = Date.now()
      if (isRealtimeUpdate && now - lastFetchTimeRef.current < 2000) {
        console.log('Evitando fetch duplicado de conversaciones')
        return
      }
      
      console.log('Fetching conversations with filters:', { inboxId, assigneeId }, isRealtimeUpdate ? '(realtime)' : '')
      
      // Llamada real a Supabase - usando la tabla conversaciones directamente
      console.log('Consultando tabla conversaciones')
      let query = supabase
        .from('conversacion')
        .select('*')
        .order('created_at', { ascending: false })
        .limit(50)

      // Aplicar filtros si existen (comentado porque estos campos no existen en la estructura)
      // if (inboxId) {
      //   query = query.eq('inbox_id', inboxId)
      // }
      
      // if (assigneeId) {
      //   query = query.eq('assignee_id', assigneeId)
      // }

      const { data, error } = await query

      // DEBUG TEMPORALMENTE DESACTIVADO
      // console.log('=== DEBUG CONVERSACIONES ===')
      // console.log('Datos recibidos de vw_conversaciones_activas_inbox:', data)
      // if (data && data.length > 0) {
      //   const mariano = data.find(c => c.nombre === 'Mariano')
      //   if (mariano) {
      //     console.log('Datos de Mariano:', {
      //       nombre: mariano.nombre,
      //       ultimo_mensaje: mariano.ultimo_mensaje,
      //       ts_ultimo_mensaje: mariano.ts_ultimo_mensaje,
      //       last_message_at: mariano.last_message_at,
      //       ultima_actividad: mariano.ultima_actividad,
      //       updated_at: mariano.updated_at
      //     })
      //   }
      // }
      // console.log('=== FIN DEBUG ===')

      if (error) {
        console.error('Supabase conversations error:', {
          message: error.message,
          details: error.details,
          hint: error.hint,
          code: error.code
        })
        throw error
      }

      setConversations(data || [])
      lastFetchTimeRef.current = now
    } catch (err) {
      const errorMessage = err instanceof Error ? err.message : 'Error desconocido'
      setError(errorMessage)
      console.error('Error fetching conversations:', {
        inboxId,
        assigneeId,
        error: err,
        message: errorMessage
      })
    } finally {
      setLoading(false)
      setIsRefreshing(false)
    }
  }, [inboxId, assigneeId])

  // Suscripción a cambios en tiempo real
  const { isConnected } = useRealtimeConversations(() => {
    fetchConversations(true)
  })

  // Fallback: polling si el realtime no está conectado
  useEffect(() => {
    if (isConnected) return
    console.warn('Realtime no disponible. Activando polling de conversaciones cada 6s...')
    const id = setInterval(() => fetchConversations(true), 6000)
    return () => clearInterval(id)
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [isConnected])

  useEffect(() => {
    fetchConversations()
  }, [inboxId, assigneeId, fetchConversations])

  return {
    conversations,
    loading,
    error,
    refetch: () => fetchConversations(false),
    isRealtimeConnected: isConnected
  }
}
