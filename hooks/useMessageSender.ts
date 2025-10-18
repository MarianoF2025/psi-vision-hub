// hooks/useMessageSender.ts
import { useState } from 'react'
import { supabase } from '@/lib/supabase'

export function useMessageSender() {
  const [sending, setSending] = useState(false)
  const [error, setError] = useState<string | null>(null)

  async function sendMessage(
    conversacionId: string,
    mensaje: string,
    agentId: number = 5,
    agentName: string = 'Usuario'
  ) {
    try {
      setSending(true)
      setError(null)

      // Llamar función RPC según tu documentación
      const { data, error } = await supabase.rpc('enviar_mensaje', {
        p_conversacion_id: conversacionId,
        p_mensaje: mensaje,
        p_remitente: 'agent',
        p_agent_id: agentId,
        p_agent_name: agentName
      })

      if (error) {
        console.error('Error sending message:', error)
        throw error
      }
      
      return data
    } catch (err) {
      const errorMessage = err instanceof Error ? err.message : 'Error al enviar mensaje'
      setError(errorMessage)
      throw new Error(errorMessage)
    } finally {
      setSending(false)
    }
  }

  return { sendMessage, sending, error }
}