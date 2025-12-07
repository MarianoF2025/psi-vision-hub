// ===========================================
// TIPOS BASADOS EN ESQUEMA REAL DE SUPABASE
// Generado: 2025-01-XX
// ===========================================

// CONTACTOS
export interface Contacto {
  id: string;
  nombre: string | null;
  telefono: string;
  email: string | null;
  notas: string | null;
  origen: string | null;
  activo: boolean;
  created_at: string;
  updated_at: string;
  utm_source: string | null;
  utm_campaign: string | null;
  etiquetas: any[]; // jsonb
  documento: string | null;
  cursos: any[]; // jsonb
}

export interface ContactoInsert {
  telefono: string;
  nombre?: string | null;
  email?: string | null;
  notas?: string | null;
  origen?: string | null;
  activo?: boolean;
  utm_source?: string | null;
  utm_campaign?: string | null;
  etiquetas?: any[];
  documento?: string | null;
  cursos?: any[];
}

// CONVERSACIONES
export interface Conversacion {
  id: string;
  contacto_id: string | null;
  agente_id: string | null;
  estado: string; // 'activa', 'cerrada', 'derivada', etc.
  prioridad: string; // 'baja', 'media', 'alta', 'urgente'
  canal: string; // 'whatsapp'
  ultimo_mensaje: string | null;
  ultimo_mensaje_at: string | null;
  created_at: string;
  updated_at: string;
  telefono: string | null;
  area: string | null; // 'wsp4', 'ventas', 'alumnos', 'admin', 'comunidad'
  etiqueta: string | null; // singular
  origen: string | null;
  ventana_72h_activa: boolean;
  ventana_72h_inicio: string | null;
  ventana_72h_fin: string | null;
  router_estado: string | null; // 'menu_principal', 'submenu_admin', etc.
  ventana_24h_activa: boolean;
  ventana_24h_inicio: string | null;
  ventana_24h_fin: string | null;
  metadata: Record<string, any> | null;
  es_lead_meta: boolean;
  menu_actual: string | null;
  proxy_activo: boolean;
  area_proxy: string | null;
  leida: boolean | null;
  linea_origen: string | null;
  etiquetas: string[]; // ARRAY
  router_opcion_actual: string | null;
  router_historial: string[]; // ARRAY
  ventana_atencion: string | null;
}

export interface ConversacionInsert {
  telefono: string;
  contacto_id?: string | null;
  estado?: string;
  prioridad?: string;
  canal?: string;
  area?: string | null;
  etiqueta?: string | null;
  origen?: string | null;
  ventana_72h_activa?: boolean;
  ventana_72h_inicio?: string | null;
  ventana_72h_fin?: string | null;
  router_estado?: string | null;
  ventana_24h_activa?: boolean;
  ventana_24h_inicio?: string | null;
  ventana_24h_fin?: string | null;
  metadata?: Record<string, any> | null;
  es_lead_meta?: boolean;
  menu_actual?: string | null;
  linea_origen?: string | null;
  etiquetas?: string[];
  router_opcion_actual?: string | null;
  router_historial?: string[];
}

export interface ConversacionUpdate {
  estado?: string;
  area?: string | null;
  etiqueta?: string | null;
  router_estado?: string | null;
  menu_actual?: string | null;
  router_opcion_actual?: string | null;
  router_historial?: string[];
  ultimo_mensaje?: string | null;
  ultimo_mensaje_at?: string | null;
  ventana_24h_activa?: boolean;
  ventana_24h_inicio?: string | null;
  ventana_24h_fin?: string | null;
  ventana_72h_activa?: boolean;
  ventana_72h_inicio?: string | null;
  ventana_72h_fin?: string | null;
  proxy_activo?: boolean;
  area_proxy?: string | null;
  leida?: boolean | null;
  etiquetas?: string[];
  metadata?: Record<string, any> | null;
}

// MENSAJES
export interface Mensaje {
  id: string;
  conversacion_id: string;
  remitente_id: string | null;
  tipo: string; // 'texto', 'audio', 'imagen', 'documento', 'video', 'sticker'
  metadata: Record<string, any>;
  leido: boolean;
  enviado: boolean;
  created_at: string;
  remitente_tipo: string | null; // 'user', 'agent', 'system'
  media_url: string | null;
  media_type: string | null;
  duracion: number | null;
  direccion: string | null; // 'entrante', 'saliente'
  mensaje: string | null;
  whatsapp_message_id: string | null;
  reenviado: boolean;
  mensaje_original_id: string | null;
  via_proxy: boolean;
  area_proxy: string | null;
  menu_mostrado: string | null;
  opcion_seleccionada: string | null;
}

export interface MensajeInsert {
  conversacion_id: string;
  mensaje?: string | null;
  tipo?: string;
  direccion?: string | null;
  remitente_tipo?: string | null;
  remitente_id?: string | null;
  media_url?: string | null;
  media_type?: string | null;
  duracion?: number | null;
  whatsapp_message_id?: string | null;
  metadata?: Record<string, any>;
  menu_mostrado?: string | null;
  opcion_seleccionada?: string | null;
  via_proxy?: boolean;
  area_proxy?: string | null;
}

// DERIVACIONES
export interface Derivacion {
  id: string;
  conversacion_id: string | null;
  telefono: string;
  requiere_proxy: boolean | null;
  status: string; // 'enviada', 'recibida', 'procesada'
  created_at: string;
  area_origen: string | null;
  area_destino: string | null;
  motivo: string | null; // 'menu_selection', 'timeout', 'manual'
  menu_option_selected: string | null;
}

export interface DerivacionInsert {
  telefono: string;
  conversacion_id?: string | null;
  area_origen?: string | null;
  area_destino?: string | null;
  motivo?: string | null;
  menu_option_selected?: string | null;
  requiere_proxy?: boolean | null;
  status?: string;
}

// TICKETS
export interface Ticket {
  id: string;
  conversacion_id: string | null;
  telefono: string;
  ticket_id: string;
  area: string;
  estado: string; // 'abierto', 'asignado', 'resuelto', 'cerrado'
  prioridad: string; // 'baja', 'normal', 'alta', 'urgente'
  metadata: Record<string, any> | null;
  created_at: string;
  updated_at: string;
  asignado_a: number | null;
  notas_resolucion: string | null;
}

export interface TicketInsert {
  telefono: string;
  ticket_id: string;
  area: string;
  conversacion_id?: string | null;
  estado?: string;
  prioridad?: string;
  metadata?: Record<string, any> | null;
  asignado_a?: number | null;
}

// AUDIT_LOG
export interface AuditLog {
  id: string;
  accion: string;
  created_at: string;
  tabla_afectada: string | null;
  registro_id: string | null;
  valores_anteriores: Record<string, any> | null;
  valores_nuevos: Record<string, any> | null;
  ip_address: string | null;
  motivo: string | null;
  user_id: string | null;
}

export interface AuditLogInsert {
  accion: string;
  tabla_afectada?: string | null;
  registro_id?: string | null;
  valores_anteriores?: Record<string, any> | null;
  valores_nuevos?: Record<string, any> | null;
  ip_address?: string | null;
  motivo?: string | null;
  user_id?: string | null;
}

// ===========================================
// TIPOS DE APLICACIÓN
// ===========================================

// Mensaje entrante de WhatsApp (desde n8n/Evolution)
export interface WhatsAppIncoming {
  telefono: string;
  mensaje: string;
  nombre?: string;
  timestamp?: string;
  messageId?: string;
  mediaType?: string;
  mediaUrl?: string;
  linea?: string; // 'wsp4', 'ventas1', etc.
  // UTM params (si vienen de Meta Ads)
  utm_source?: string;
  utm_campaign?: string;
  es_lead_meta?: boolean;
}

// Respuesta del Router
export interface RouterResponse {
  success: boolean;
  action: 'menu' | 'submenu' | 'derivacion' | 'mensaje' | 'error';
  mensajeRespuesta?: string; // Opcional - ya no se retorna para evitar duplicación en n8n
  yaEnviado?: boolean; // Flag indicando que el mensaje ya fue enviado vía webhook
  derivacion?: {
    area: string;
    subetiqueta?: string;
    requiere_proxy: boolean;
  };
  conversacionId?: string;
  contactoId?: string;
  error?: string;
}

// Estados del Router
export type RouterEstado = 
  | 'menu_principal'
  | 'submenu_admin'
  | 'submenu_alumnos'
  | 'submenu_ventas'
  | 'submenu_comunidad'
  | 'derivado'
  | 'esperando_respuesta';

// Áreas de derivación
export type Area = 'wsp4' | 'admin' | 'alumnos' | 'ventas' | 'comunidad' | 'revisar';


