// hooks/useConversations.ts
import { useState, useEffect } from 'react'
import { supabase, type Conversation } from '@/lib/supabase'

export function useConversations(inboxId?: number, assigneeId?: number) {
  const [conversations, setConversations] = useState<Conversation[]>([])
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState<string | null>(null)

  useEffect(() => {
    fetchConversations()
  }, [inboxId, assigneeId])

  async function fetchConversations() {
    try {
      setLoading(true)
      let query = supabase
        .from('vw_conversaciones_activas_inbox')
        .select('*')
        .order('ts_ultimo_mensaje', { ascending: false })

      // Filtros dinámicos según tu documentación
      if (inboxId) {
        query = query.eq('inbox_id', inboxId)
      }
      
      if (assigneeId) {
        query = query.eq('assignee_id', assigneeId)
      }

      const { data, error } = await query

      if (error) {
        console.error('Error fetching conversations:', error)
        throw error
      }
      
      setConversations(data || [])
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Error desconocido')
    } finally {
      setLoading(false)
    }
  }

  return { conversations, loading, error, refetch: fetchConversations }
}