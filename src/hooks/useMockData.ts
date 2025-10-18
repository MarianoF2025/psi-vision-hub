// src/hooks/useMockData.ts - Datos de prueba para el CRM
'use client'

import { useState, useEffect } from 'react'
import type { Conversation, Message } from '../lib/supabase'

export function useMockConversations() {
  const [conversations, setConversations] = useState<Conversation[]>([])
  const [loading, setLoading] = useState(true)

  useEffect(() => {
    // Simular carga de datos
    setTimeout(() => {
      const mockConversations: Conversation[] = [
        {
          id: '1',
          chatwoot_conversation_id: 1,
          chatwoot_contact_id: 1,
          nombre: '5491130643690',
          telefono: '+5491130643690',
          email: 'contacto1@example.com',
          canal: 'whatsapp',
          area: 'ventas',
          estado: 'abierto',
          inbox_id: 1,
          inbox_name: 'EME Automations',
          inbox: 'EME Automations',
          asignado_a: 'admin@psivisionhub.com',
          total_mensajes: 4,
          ultimo_mensaje: 'Menú principal 1 Administración 2 Alumnos 3 Inscripciones 4 Comunidad 5 Otra consulta',
          ts_ultimo_mensaje: new Date().toISOString(),
          ultima_actividad: new Date().toISOString(),
          created_at: new Date(Date.now() - 86400000).toISOString(), // 1 día atrás
          updated_at: new Date().toISOString()
        },
        {
          id: '2',
          chatwoot_conversation_id: 2,
          chatwoot_contact_id: 2,
          nombre: 'Nina Dulcich F',
          telefono: '+5491123456789',
          email: 'nina@example.com',
          canal: 'whatsapp',
          area: 'alumnos',
          estado: 'pendiente',
          inbox_id: 1,
          inbox_name: 'EME Automations',
          inbox: 'EME Automations',
          asignado_a: '',
          total_mensajes: 2,
          ultimo_mensaje: 'Hola, necesito información sobre los cursos',
          ts_ultimo_mensaje: new Date(Date.now() - 3600000).toISOString(), // 1 hora atrás
          ultima_actividad: new Date(Date.now() - 3600000).toISOString(),
          created_at: new Date(Date.now() - 172800000).toISOString(), // 2 días atrás
          updated_at: new Date(Date.now() - 3600000).toISOString()
        },
        {
          id: '3',
          chatwoot_conversation_id: 3,
          chatwoot_contact_id: 3,
          nombre: 'Mariano',
          telefono: '+5491134567890',
          email: 'mariano@example.com',
          canal: 'whatsapp',
          area: 'comunidad',
          estado: 'nuevo',
          inbox_id: 1,
          inbox_name: 'EME Automations',
          inbox: 'EME Automations',
          asignado_a: '',
          total_mensajes: 1,
          ultimo_mensaje: '¿Cuándo es el próximo evento?',
          ts_ultimo_mensaje: new Date(Date.now() - 1800000).toISOString(), // 30 min atrás
          ultima_actividad: new Date(Date.now() - 1800000).toISOString(),
          created_at: new Date(Date.now() - 1800000).toISOString(),
          updated_at: new Date(Date.now() - 1800000).toISOString()
        }
      ]
      
      setConversations(mockConversations)
      setLoading(false)
    }, 1000)
  }, [])

  return {
    conversations,
    loading,
    error: null,
    refetch: () => {},
    isRealtimeConnected: true
  }
}

export function useMockMessages(conversationId?: string) {
  const [messages, setMessages] = useState<Message[]>([])
  const [loading, setLoading] = useState(false)

  useEffect(() => {
    if (!conversationId) {
      setMessages([])
      return
    }

    setLoading(true)
    
    // Simular carga de mensajes
    setTimeout(() => {
      const mockMessages: Message[] = [
        {
          id: '1',
          conversacion_id: conversationId,
          chatwoot_message_id: 1,
          mensaje: 'Menú principal 1 Administración 2 Alumnos 3 Inscripciones 4 Comunidad 5 Otra consulta Respondé con 1-5 para continuar. Escribí **0** para volver a este menú en cualquier momento.',
          contenido: 'Menú principal 1 Administración 2 Alumnos 3 Inscripciones 4 Comunidad 5 Otra consulta Respondé con 1-5 para continuar. Escribí **0** para volver a este menú en cualquier momento.',
          timestamp: new Date(Date.now() - 3600000).toISOString(),
          fecha_creacion: new Date(Date.now() - 3600000).toISOString(),
          remitente: 'EME Automations',
          sender_name: 'EME Automations',
          nombre: 'EME Automations',
          origen: 'inbound',
          tipo: 'inbound',
          sender_type: 'bot',
          created_at: new Date(Date.now() - 3600000).toISOString(),
          chatwoot_conversation_id: parseInt(conversationId),
          inbox_id: 1,
          inbox_name: 'EME Automations'
        },
        {
          id: '2',
          conversacion_id: conversationId,
          chatwoot_message_id: 2,
          mensaje: '=333333',
          contenido: '=333333',
          timestamp: new Date(Date.now() - 1800000).toISOString(),
          fecha_creacion: new Date(Date.now() - 1800000).toISOString(),
          remitente: 'Usuario',
          sender_name: 'Usuario',
          nombre: 'Usuario',
          origen: 'outbound',
          tipo: 'outbound',
          sender_type: 'agent',
          created_at: new Date(Date.now() - 1800000).toISOString(),
          chatwoot_conversation_id: parseInt(conversationId),
          inbox_id: 1,
          inbox_name: 'EME Automations'
        }
      ]
      
      setMessages(mockMessages)
      setLoading(false)
    }, 500)
  }, [conversationId])

  return {
    messages,
    loading,
    error: null,
    refetch: () => {},
    isRealtimeConnected: true,
    addTemporaryMessage: () => {},
    removeTemporaryMessage: () => {},
    replaceTemporaryMessage: () => {}
  }
}

