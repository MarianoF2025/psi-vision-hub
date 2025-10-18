// hooks/useConversationUpdater.ts
import { useState } from 'react'
import { supabase } from '@/lib/supabase'

export function useConversationUpdater() {
  const [updating, setUpdating] = useState(false)

  async function updateEstado(conversacionId: string, estado: string) {
    try {
      setUpdating(true)
      const { error } = await supabase
        .from('conversacion')
        .update({ estado })
        .eq('id', conversacionId)

      if (error) {
        console.error('Error updating estado:', error)
        throw error
      }
    } catch (err) {
      throw new Error(err instanceof Error ? err.message : 'Error al actualizar estado')
    } finally {
      setUpdating(false)
    }
  }

  async function updateAssignee(conversacionId: string, assigneeId: number, assigneeName: string) {
    try {
      setUpdating(true)
      const { error } = await supabase
        .from('conversacion')
        .update({ 
          assignee_id: assigneeId,
          assignee_name: assigneeName 
        })
        .eq('id', conversacionId)

      if (error) {
        console.error('Error updating assignee:', error)
        throw error
      }
    } catch (err) {
      throw new Error(err instanceof Error ? err.message : 'Error al asignar conversación')
    } finally {
      setUpdating(false)
    }
  }

  return { updateEstado, updateAssignee, updating }
}