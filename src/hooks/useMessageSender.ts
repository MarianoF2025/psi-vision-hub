// src/hooks/useMessageSender.ts
'use client'

import { useState, useCallback } from 'react'
import { supabase, type MessageAttachment } from '../lib/supabase'

interface UseMessageSenderReturn {
  sendMessage: (
    chatwootConversationId: number, 
    content: string, 
    files?: File[]
  ) => Promise<void>
  sending: boolean
  uploadProgress: number
}

export function useMessageSender(): UseMessageSenderReturn {
  const [sending, setSending] = useState(false)
  const [uploadProgress, setUploadProgress] = useState(0)

  const uploadFileToStorage = async (
    file: File, 
    chatwootConversationId: number
  ): Promise<MessageAttachment | null> => {
    try {
      // Generar nombre único para el archivo
      const timestamp = Date.now()
      const randomString = Math.random().toString(36).substring(7)
      const fileExtension = file.name.split('.').pop()
      const fileName = `${chatwootConversationId}/${timestamp}-${randomString}.${fileExtension}`

      console.log('Subiendo archivo a storage:', fileName)

      // Subir archivo a Supabase Storage
      const { data: uploadData, error: uploadError } = await supabase.storage
        .from('crm-attachments')
        .upload(fileName, file, {
          cacheControl: '3600',
          upsert: false
        })

      if (uploadError) {
        console.error('Error al subir archivo:', uploadError)
        throw uploadError
      }

      console.log('Archivo subido exitosamente:', uploadData)

      // Obtener URL pública del archivo
      const { data: publicUrlData } = supabase.storage
        .from('crm-attachments')
        .getPublicUrl(fileName)

      const publicUrl = publicUrlData.publicUrl

      // Determinar tipo de archivo
      let fileType: 'image' | 'video' | 'document' | 'other' = 'other'
      if (file.type.startsWith('image/')) fileType = 'image'
      else if (file.type.startsWith('video/')) fileType = 'video'
      else if (
        file.type.includes('pdf') || 
        file.type.includes('document') || 
        file.type.includes('spreadsheet') ||
        file.type.includes('text')
      ) fileType = 'document'

      return {
        url: publicUrl,
        type: fileType,
        name: file.name,
        size: file.size,
        mimeType: file.type
      }
    } catch (error) {
      console.error('Error en uploadFileToStorage:', error)
      return null
    }
  }

  const sendMessage = useCallback(async (
    chatwootConversationId: number, 
    content: string,
    files?: File[]
  ): Promise<void> => {
    try {
      setSending(true)
      setUploadProgress(0)
      
      console.log('Enviando mensaje:', { 
        chatwootConversationId, 
        content, 
        filesCount: files?.length || 0 
      })

      // Subir archivos a storage si existen
      const attachments: MessageAttachment[] = []
      if (files && files.length > 0) {
        console.log(`Subiendo ${files.length} archivo(s)...`)
        
        for (let i = 0; i < files.length; i++) {
          const file = files[i]
          setUploadProgress(Math.round(((i + 1) / files.length) * 100))
          
          const attachment = await uploadFileToStorage(file, chatwootConversationId)
          if (attachment) {
            attachments.push(attachment)
          }
        }
        
        console.log('Archivos subidos:', attachments)
      }

      // Determinar tipo de mensaje
      let messageType = 'text'
      if (attachments.length > 0) {
        // Si hay adjuntos, determinar tipo basado en el primer adjunto
        const firstAttachment = attachments[0]
        if (firstAttachment.type === 'image') messageType = 'image'
        else if (firstAttachment.type === 'video') messageType = 'video'
        else if (firstAttachment.type === 'document') messageType = 'document'
      }
      
      // PRUEBA: Primero intentar con parámetros mínimos
      console.log('🔍 Intentando RPC con parámetros mínimos...')
      const simpleParams = {
        p_chatwoot_conversation_id: chatwootConversationId,
        p_mensaje: content || 'Mensaje de prueba',
        p_remitente: 'Agente',
        p_origen: 'CRM'
      }
      
      console.log('🔍 Parámetros simples:', simpleParams)
      const { data, error } = await supabase.rpc('enviar_mensaje', simpleParams)
      console.log('🔍 Respuesta RPC simple:', { data, error })
      
      if (error) {
        console.error('❌ ERROR RPC enviar_mensaje:', {
          error: error,
          message: error.message || 'Sin mensaje',
          details: error.details || 'Sin detalles',
          hint: error.hint || 'Sin hint',
          code: error.code || 'Sin código',
          params: simpleParams
        })

        // Por ahora, simplemente lanzar el error para ver qué está pasando
        throw error
      }

      console.log('Mensaje enviado exitosamente:', data)
      setUploadProgress(100)
      
    } catch (error) {
      console.error('Error sending message:', {
        error: error,
        message: error instanceof Error ? error.message : 'Error desconocido',
        stack: error instanceof Error ? error.stack : undefined,
        chatwootConversationId,
        content: content.substring(0, 50) + '...',
        filesCount: files?.length || 0
      })
      throw error
    } finally {
      setSending(false)
      setTimeout(() => setUploadProgress(0), 1000)
    }
  }, [])

  return {
    sendMessage,
    sending,
    uploadProgress
  }
}
