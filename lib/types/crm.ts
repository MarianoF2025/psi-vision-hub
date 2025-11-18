// Tipos para el sistema CRM-COM - Estructura real de Supabase

export type InboxType = 'Ventas' | 'Alumnos' | 'Administración' | 'Comunidad' | 'PSI Principal';

export type ConversationStatus = 'nueva' | 'activa' | 'esperando' | 'resuelta' | 'cerrada';

export type MessageType = 'text' | 'image' | 'video' | 'audio' | 'document' | 'location' | 'contact';

// Estructura real de Supabase: contactos
export interface Contact {
  id: string;
  telefono: string;
  nombre?: string;
  email?: string;
  area?: string;
  estado?: string;
  created_at?: string;
  updated_at?: string;
  last_activity?: string;
  origen?: string;
  ubicacion?: string;
  notas?: string;
}

// Estructura real de Supabase: mensajes
export interface Message {
  id: string;
  conversacion_id: string;
  mensaje: string;
  remitente: string;
  timestamp: string;
  tipo?: MessageType;
  estado?: 'sent' | 'delivered' | 'read';
  metadata?: Record<string, any>;
}

// Estructura real de Supabase: conversaciones
export interface Conversation {
  id: string;
  contacto_id: string;
  area: string;
  estado: string;
  inbox_id?: string;
  telefono: string;
  ts_ultimo_mensaje?: string;
  asignado_a?: string;
  created_at?: string;
  updated_at?: string;
  // Relaciones
  contactos?: Contact;
  // Campos calculados para UI
  last_message?: string;
  unread_count?: number;
  messages?: Message[];
}

export interface InboxStats {
  inbox: InboxType;
  total: number;
  unread: number;
  active: number;
}

