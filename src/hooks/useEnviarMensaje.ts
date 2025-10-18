// src/hooks/useEnviarMensaje.ts - Hook para envío de mensajes vía Chatwoot
'use client'

import { useState, useCallback } from 'react'
import { supabase } from '../lib/supabase'
import type { Message } from '../lib/supabase'

interface EnviarMensajeParams {
  conversationId: string
  message: string
  attachments?: any[]
  messageType?: string
}

interface EnviarMensajeReturn {
  enviarMensaje: (params: EnviarMensajeParams) => Promise<Message | null>
  loading: boolean
  error: string | null
}

export function useEnviarMensaje(): EnviarMensajeReturn {
  const [loading, setLoading] = useState(false)
  const [error, setError] = useState<string | null>(null)

  const enviarMensaje = useCallback(async ({
    conversationId,
    message,
    attachments = [],
    messageType = 'text'
  }: EnviarMensajeParams): Promise<Message | null> => {
    try {
      setLoading(true)
      setError(null)

      console.log('🚀 Iniciando envío de mensaje:', {
        conversationId,
        message: message.substring(0, 50) + '...',
        attachments: attachments.length,
        messageType
      })

      // PASO 1: Llamar a Supabase RPC para insertar en BD
      console.log('📝 Paso 1: Insertando mensaje en BD via RPC...')
      
      // Preparar parámetros para la función RPC existente
      const rpcParams: Record<string, unknown> = {
        p_chatwoot_conversation_id: parseInt(conversationId), // Convertir a number
        p_mensaje: message,
        p_remitente: 'Agente',
        p_origen: 'CRM',
        p_attachments: attachments.length > 0 ? attachments : null,
        p_message_type: messageType
      }
      
      const { data: rpcData, error: rpcError } = await supabase.rpc('enviar_mensaje', rpcParams)

      if (rpcError) {
        console.error('❌ Error en RPC enviar_mensaje:', rpcError)
        
        // Reintento: algunos RPC esperan jsonb explícito como string
        if (attachments.length > 0) {
          const retryParams = {
            ...rpcParams,
            p_attachments: JSON.stringify(attachments)
          }
          const { data: retryData, error: retryError } = await supabase.rpc('enviar_mensaje', retryParams)
          if (retryError) {
            console.error('❌ Reintento RPC (attachments como string) falló:', retryError)
            
            // Segundo reintento: enviar SIN attachments
            const retryParams2 = {
              ...rpcParams,
              p_attachments: null
            }
            const { data: retryData2, error: retryError2 } = await supabase.rpc('enviar_mensaje', retryParams2)
            if (retryError2) {
              console.error('❌ Segundo reintento RPC (sin attachments) falló:', retryError2)
              
              // Tercer reintento: también omitir p_message_type
              const retryParams3: Record<string, unknown> = { ...retryParams2 }
              delete retryParams3.p_message_type
              const { data: retryData3, error: retryError3 } = await supabase.rpc('enviar_mensaje', retryParams3)
              if (retryError3) {
                console.error('❌ Tercer reintento RPC falló:', retryError3)
                throw new Error(`Error en BD: ${retryError3.message}`)
              }
              console.log('✅ RPC exitoso en tercer reintento:', retryData3)
            } else {
              console.log('✅ RPC exitoso en segundo reintento:', retryData2)
            }
          } else {
            console.log('✅ RPC exitoso en reintento:', retryData)
          }
        } else {
          throw new Error(`Error en BD: ${rpcError.message}`)
        }
      }

      console.log('✅ Paso 1 completado. Datos RPC:', rpcData)

      // PASO 2: Llamar a webhook n8n para enviar a Chatwoot
      console.log('🌐 Paso 2: Enviando a n8n webhook...')
      const webhookResponse = await fetch('https://n8n.psivisionhub.com/webhook/crm/enviar-mensaje', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          conversation_id: conversationId,
          message: message,
          attachments: attachments,
          message_type: messageType,
          rpc_data: rpcData // Datos retornados por Supabase
        })
      })

      if (!webhookResponse.ok) {
        const errorText = await webhookResponse.text()
        console.error('❌ Error en webhook n8n:', {
          status: webhookResponse.status,
          statusText: webhookResponse.statusText,
          error: errorText
        })
        throw new Error(`Error en webhook: ${webhookResponse.status} - ${errorText}`)
      }

      const webhookData = await webhookResponse.json()
      console.log('✅ Paso 2 completado. Respuesta n8n:', webhookData)

      // PASO 3: Crear mensaje temporal para optimistic update
      const mensajeTemporal: Message = {
        id: `temp_${Date.now()}`,
        chatwoot_conversation_id: conversationId,
        mensaje: message,
        timestamp: new Date().toISOString(),
        autor: 'agent', // Asumimos que es del agente
        attachments: attachments,
        message_type: messageType,
        created_at: new Date().toISOString(),
        updated_at: new Date().toISOString()
      }

      console.log('✅ Mensaje temporal creado:', mensajeTemporal.id)
      return mensajeTemporal

    } catch (err) {
      const errorMessage = err instanceof Error ? err.message : 'Error desconocido'
      console.error('❌ Error completo en envío:', errorMessage)
      setError(errorMessage)
      return null
    } finally {
      setLoading(false)
    }
  }, [])

  return {
    enviarMensaje,
    loading,
    error
  }
}
