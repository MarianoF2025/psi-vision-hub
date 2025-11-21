import { Area, VentanaTipo } from './enums';

export interface Contacto {
  id: string;
  telefono: string;
  nombre?: string;
  metadata?: Record<string, any>;
  ultimo_menu_enviado?: string | null;
}

export interface Conversacion {
  id: string;
  contacto_id: string;
  telefono: string;
  area?: Area;
  inbox_id?: number | null;
  derivado_a?: string | null;
  inbox_destino?: string | null;
  estado?: string;
  router_estado?: string;
  submenu_actual?: string | null;
  bypass_wsp4?: boolean;
  numero_origen?: string | null;
  numero_activo?: string | null;
  ventana_24h_activa?: boolean;
  ventana_24h_inicio?: string | null;
  ventana_72h_activa?: boolean;
  ventana_72h_inicio?: string | null;
  es_lead_meta?: boolean;
  metadata?: Record<string, any>;
  ultimo_menu_enviado?: string | null;
  ticket_id?: string | null;
  countdown_24h?: string | null;
  ts_derivacion?: string | null;
}

export interface Mensaje {
  id?: string;
  conversacion_id: string;
  remitente: string;
  tipo: string;
  mensaje?: string;
  metadata?: Record<string, any>;
  ultimo_menu_enviado?: string | null;
  telefono?: string;
  timestamp?: string;
  whatsapp_message_id?: string;
}

export interface MenuResponse {
  reply: string;
  submenu?: string;
  area?: Area;
  derivar?: boolean;
  subetiqueta?: string;
}

export interface VentanaConfig {
  tipo: VentanaTipo;
  activa: boolean;
  inicio?: Date;
  fin?: Date;
}

export interface WebhookMessage {
  id: string;
  from: string;
  timestamp: string;
  type: string;
  text?: { body?: string };
  interactive?: {
    type: string;
    button_reply?: { id: string; title: string };
    list_reply?: { id: string; title: string };
  };
}

export interface WebhookPayload {
  messaging_product: string;
  metadata: {
    display_phone_number: string;
    phone_number_id: string;
  };
  messages: WebhookMessage[];
}
