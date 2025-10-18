// src/hooks/useDirectWebhook.ts - Hook para enviar mensajes directo al webhook
'use client'

import { useState, useCallback } from 'react'

interface DirectWebhookParams {
  conversationId: string
  message: string
  attachments?: any[]
  messageType?: string
}

interface DirectWebhookReturn {
  sendDirectToWebhook: (params: DirectWebhookParams) => Promise<boolean>
  loading: boolean
  error: string | null
}

export function useDirectWebhook(): DirectWebhookReturn {
  const [loading, setLoading] = useState(false)
  const [error, setError] = useState<string | null>(null)

  const sendDirectToWebhook = useCallback(async ({
    conversationId,
    message,
    attachments = [],
    messageType = 'text'
  }: DirectWebhookParams): Promise<boolean> => {
    try {
      setLoading(true)
      setError(null)

      console.log('🚀 Enviando directo al webhook (saltando RPC)...')

      // Llamar directamente al webhook n8n
      const webhookData = {
        conversation_id: conversationId,
        message: message,
        attachments: attachments,
        message_type: messageType,
        rpc_data: { 
          bypass_rpc: true,
          timestamp: new Date().toISOString(),
          source: 'crm_direct'
        }
      }
      
      console.log('🌐 Enviando al webhook:', webhookData)
      
      const webhookResponse = await fetch('https://n8n.psivisionhub.com/webhook/crm/enviar-mensaje', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify(webhookData)
      })

      if (!webhookResponse.ok) {
        const errorText = await webhookResponse.text()
        console.error('❌ Error en webhook directo:', {
          status: webhookResponse.status,
          statusText: webhookResponse.statusText,
          error: errorText
        })
        throw new Error(`Error en webhook: ${webhookResponse.status} - ${errorText}`)
      }

      const responseData = await webhookResponse.json()
      console.log('✅ Webhook directo exitoso:', responseData)
      
      return true

    } catch (err) {
      const errorMessage = err instanceof Error ? err.message : 'Error desconocido'
      console.error('❌ Error en envío directo:', errorMessage)
      setError(errorMessage)
      return false
    } finally {
      setLoading(false)
    }
  }, [])

  return {
    sendDirectToWebhook,
    loading,
    error
  }
}
