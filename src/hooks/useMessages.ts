// ⚠️ CRÍTICO: Este hook usa 2 queries para cargar mensajes
// 1. Busca UUID en tabla 'conversacion' usando chatwoot_conversation_id
// 2. Busca mensajes en tabla 'interaccion' usando ese UUID
// NO MODIFICAR sin consultar SUPABASE_SCHEMA.md

'use client'
// src/hooks/useMessages.ts
'use client'

import { useState, useEffect, useCallback, useRef } from 'react'
import { supabase, type Message } from '../lib/supabase'
import { useRealtimeMessages } from './useRealtime'

interface UseMessagesReturn {
  messages: Message[]
  loading: boolean
  error: string | null
  refetch: () => void
  isRealtimeConnected: boolean
  addTemporaryMessage: (message: Message) => void
  removeTemporaryMessage: (tempId: string) => void
  replaceTemporaryMessage: (tempId: string, realMessage: Message) => void
}

export function useMessages(chatwootConversationId?: number): UseMessagesReturn {
  const [messages, setMessages] = useState<Message[]>([])
  const [loading, setLoading] = useState(false)
  const [error, setError] = useState<string | null>(null)
  const [isRefreshing, setIsRefreshing] = useState(false)
  const [conversationUuid, setConversationUuid] = useState<string | null>(null)
  const lastFetchTimeRef = useRef<number>(0)

  const fetchMessages = useCallback(async (isRealtimeUpdate = false) => {
    if (!chatwootConversationId) {
      setMessages([])
      return
    }

    // Evitar múltiples fetches simultáneos
    const now = Date.now()
    if (isRealtimeUpdate && now - lastFetchTimeRef.current < 1000) {
      console.log('Evitando fetch duplicado de mensajes')
      return
    }

    try {
      if (!isRealtimeUpdate) {
        setLoading(true)
      } else {
        setIsRefreshing(true)
      }
      setError(null)
      
      
      // Paso 1: Obtener el UUID de la conversación
      const { data: conversacionData, error: conversacionError } = await supabase
        .from('conversacion')
        .select('id')
        .eq('chatwoot_conversation_id', chatwootConversationId)
        .single()


      if (conversacionError) {
        console.error('❌ Error buscando conversación:', conversacionError)
        console.error('❌ Detalles del error:', {
          message: conversacionError.message,
          details: conversacionError.details,
          hint: conversacionError.hint,
          code: conversacionError.code
        })
        throw conversacionError
      }

      if (!conversacionData) {
        console.error('❌ No se encontró conversación con chatwoot_conversation_id:', chatwootConversationId)
        setMessages([])
        return
      }

      setConversationUuid(conversacionData.id)
      
      // Paso 2: Buscar mensajes con el UUID
      const { data, error } = await supabase
        .from('interaccion')
        .select('*')
        .eq('conversacion_id', conversacionData.id)
        .order('created_at', { ascending: true })

      
      if (error) {
        console.error('❌ Error en mensajes:', error.message)
      }
      
      
      // if (data && data.length > 0) {
      //   const ultimoMensaje = data[data.length - 1] // El último mensaje
      //   console.log('Último mensaje real:', {
      //     id: ultimoMensaje.id,
      //     mensaje: ultimoMensaje.mensaje,
      //     timestamp: ultimoMensaje.timestamp,
      //     created_at: ultimoMensaje.created_at,
      //     autor: ultimoMensaje.autor
      //   })
      // }
      // console.log('=== FIN DEBUG MENSAJES ===')

      if (error) {
        console.error('Supabase error details:', {
          message: error.message,
          details: error.details,
          hint: error.hint,
          code: error.code
        })
        throw error
      }

      setMessages(data || [])
      lastFetchTimeRef.current = now
    } catch (err) {
      const errorMessage = err instanceof Error ? err.message : 'Error desconocido'
      setError(errorMessage)
      console.error('Error fetching messages:', {
        conversationId: chatwootConversationId,
        error: err,
        message: errorMessage
      })
    } finally {
      setLoading(false)
      setIsRefreshing(false)
    }
  }, [chatwootConversationId])

  // Suscripción a cambios en tiempo real
  const { isConnected } = useRealtimeMessages(conversationUuid, () => {
    fetchMessages(true)
  })

  // Fallback: polling si el realtime no está conectado
  useEffect(() => {
    if (!chatwootConversationId) return
    if (isConnected) return

    console.warn('Realtime no disponible. Activando polling de mensajes cada 2s...')
    const id = setInterval(() => fetchMessages(true), 2000)
    return () => clearInterval(id)
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [isConnected, chatwootConversationId])

  useEffect(() => {
    fetchMessages()
  }, [chatwootConversationId, fetchMessages])

  // Funciones para manejar mensajes temporales
  const addTemporaryMessage = useCallback((message: Message) => {
    setMessages(prev => [...prev, message])
  }, [])

  const removeTemporaryMessage = useCallback((tempId: string) => {
    setMessages(prev => prev.filter(msg => msg.id !== tempId))
  }, [])

  const replaceTemporaryMessage = useCallback((tempId: string, realMessage: Message) => {
    setMessages(prev => prev.map(msg => 
      msg.id === tempId ? realMessage : msg
    ))
  }, [])

  return {
    messages,
    loading,
    error,
    refetch: () => fetchMessages(false),
    isRealtimeConnected: isConnected,
    addTemporaryMessage,
    removeTemporaryMessage,
    replaceTemporaryMessage
  }
}
