// hooks/useMessages.ts
import { useState, useEffect } from 'react'
import { supabase, type Message } from '@/lib/supabase'

export function useMessages(chatwootConversationId?: number) {
  const [messages, setMessages] = useState<Message[]>([])
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState<string | null>(null)

  useEffect(() => {
    if (chatwootConversationId) {
      fetchMessages()
    } else {
      setMessages([])
      setLoading(false)
    }
  }, [chatwootConversationId])

  async function fetchMessages() {
    if (!chatwootConversationId) return

    try {
      setLoading(true)
      const { data, error } = await supabase
        .from('vw_mensajes_conversacion')
        .select('*')
        .eq('chatwoot_conversation_id', chatwootConversationId)
        .order('timestamp', { ascending: true })

      if (error) {
        console.error('Error fetching messages:', error)
        throw error
      }
      
      setMessages(data || [])
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Error desconocido')
    } finally {
      setLoading(false)
    }
  }

  return { messages, loading, error, refetch: fetchMessages }
}