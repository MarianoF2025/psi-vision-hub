// src/hooks/useConversationUpdater.ts
'use client'

import { useState, useCallback } from 'react'
import { supabase } from '../lib/supabase'

interface UseConversationUpdaterReturn {
  updateEstado: (conversationId: string, estado: string) => Promise<void>
  updateAssignee: (conversationId: string, assigneeId: number, assigneeName: string) => Promise<void>
  updating: boolean
}

export function useConversationUpdater(): UseConversationUpdaterReturn {
  const [updating, setUpdating] = useState(false)

  const updateEstado = useCallback(async (conversationId: string, estado: string): Promise<void> => {
    try {
      setUpdating(true)
      
      // Actualizar directamente en la tabla conversacion
      const { error } = await supabase
        .from('conversacion')
        .update({ 
          estado: estado,
          updated_at: new Date().toISOString()
        })
        .eq('id', conversationId)
      
      if (error) {
        console.error('Error actualizando estado en conversacion:', error)
        throw new Error(`Error al actualizar estado: ${error.message}`)
      }
      
      console.log('Estado actualizado exitosamente:', { conversationId, estado })
      
    } catch (error) {
      console.error('Error updating estado:', error)
      throw error
    } finally {
      setUpdating(false)
    }
  }, [])

  const updateAssignee = useCallback(async (conversationId: string, assigneeId: number, assigneeName: string): Promise<void> => {
    try {
      setUpdating(true)
      
      // Actualizar directamente en la tabla conversacion
      const { error } = await supabase
        .from('conversacion')
        .update({ 
          assignee_id: assigneeId,
          assignee_name: assigneeName,
          updated_at: new Date().toISOString()
        })
        .eq('id', conversationId)
      
      if (error) {
        console.error('Error actualizando asignado en conversacion:', error)
        throw new Error(`Error al actualizar asignado: ${error.message}`)
      }
      
      console.log('Asignado actualizado exitosamente:', { conversationId, assigneeId, assigneeName })
      
    } catch (error) {
      console.error('Error updating assignee:', error)
      throw error
    } finally {
      setUpdating(false)
    }
  }, [])

  return {
    updateEstado,
    updateAssignee,
    updating
  }
}
