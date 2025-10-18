// lib/supabase.ts
import { createClient } from '@supabase/supabase-js'

const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL!
const supabaseAnonKey = process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!

export const supabase = createClient(supabaseUrl, supabaseAnonKey)

// Types basados en tu documentación de Supabase
export interface Conversation {
  id: string
  chatwoot_conversation_id: number
  inbox_id: number
  inbox_name: string
  telefono: string
  nombre: string
  area: string
  subetiqueta: string
  estado: 'Nuevo' | 'Seguimiento' | 'NR' | 'Silencioso' | 'Pend_pago' | 'Alumna'
  assignee_id?: number
  assignee_name?: string
  ultimo_mensaje: string
  ts_ultimo_mensaje: string
  total_mensajes: number
  sin_asignar: boolean
  activa: boolean
}

export interface Message {
  id: string
  conversacion_id: string
  chatwoot_conversation_id: number
  chatwoot_message_id: number
  mensaje: string
  timestamp: string
  remitente: 'user' | 'agent'
  origen: string
  attachments?: any[]
  is_incoming: boolean
  is_outgoing: boolean
}

export interface Contact {
  id: string
  nombre: string
  telefono: string
  email?: string
  estado: string
  geo?: string
  consent: boolean
  created_at: string
  updated_at: string
}