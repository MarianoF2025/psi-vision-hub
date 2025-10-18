// src/lib/supabase.ts - Configuración de Supabase
import { createClient } from '@supabase/supabase-js'

// Usa variables de entorno oficiales. Si no existen, cae al dominio custom como respaldo.
const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL || 'https://supabase.psivisionhub.com'
const supabaseAnonKey = process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY || 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.ewogICJyb2xlIjogImFub24iLAogICJpc3MiOiAic3VwYWJhc2UiLAogICJpYXQiOiAxNzE1MDUwODAwLAogICJleHAiOiAxODcyODE3MjAwCn0.i8AVHAYiNTjVThTnD6gUltUDKAgaqlUXEyRgXwZIbmg'

// Cliente de Supabase (la librería construye la URL de Realtime a partir de supabaseUrl)
export const supabase = createClient(supabaseUrl, supabaseAnonKey)

export interface Conversation {
  id: string
  chatwoot_conversation_id: number
  chatwoot_contact_id: number
  nombre: string
  telefono: string
  email?: string
  canal: string
  area: string
  subetiqueta?: string
  estado: string
  inbox_id: number
  inbox_name: string
  inbox?: string
  assignee_id?: number
  assignee_name?: string
  asignado_a?: string
  total_mensajes: number
  ultimo_mensaje: string
  ts_ultimo_mensaje: string
  mensajes_no_leidos?: number
  ultima_actividad: string
  created_at: string
  updated_at: string
}

export interface MessageAttachment {
  url: string
  type: 'image' | 'video' | 'document' | 'other'
  name: string
  size: number
  mimeType: string
}

export interface Message {
  id: string
  conversacion_id: string
  chatwoot_message_id: number
  mensaje: string
  contenido?: string
  content?: string
  timestamp: string
  fecha_creacion?: string
  remitente: string
  sender_name?: string
  nombre?: string
  origen: string
  tipo?: string
  sender_type?: string
  created_at: string
  chatwoot_conversation_id: number
  inbox_id: number
  inbox_name: string
  assignee_id?: number
  assignee_name?: string
  attachments?: MessageAttachment[]
  message_type?: string
}

export interface Inbox {
  id: number
  name: string
  channel_type: string
  created_at: string
}

export interface Agent {
  id: number
  name: string
  email: string
  role: string
  created_at: string
}

// Configuración de Supabase (simulada por ahora)
export const supabaseConfig = {
  url: process.env.NEXT_PUBLIC_SUPABASE_URL || 'https://your-project.supabase.co',
  anonKey: process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY || 'your-anon-key'
}

// Estados válidos para conversaciones
export const CONVERSATION_STATES = [
  'Nuevo',
  'Seguimiento', 
  'NR',
  'Silencioso',
  'Pend_pago',
  'Alumna'
] as const

export type ConversationState = typeof CONVERSATION_STATES[number]

// Áreas válidas
export const CONVERSATION_AREAS = [
  'WSP4',
  'Ads', 
  'LC',
  'Admin'
] as const

export type ConversationArea = typeof CONVERSATION_AREAS[number]
