// ================================
// TIPOS CORE DEL SISTEMA
// ================================

// Enums que coinciden con la base de datos
export type AreaType =
  | 'wsp4'
  | 'ventas'
  | 'alumnos'
  | 'admin'
  | 'comunidad'
  | 'revisar';

export type EstadoConversacion =
  | 'activo'
  | 'derivado'
  | 'cerrado'
  | 'timeout_24h'
  | 'desconectado';

export type TipoInteraccion =
  | 'mensaje_entrante'
  | 'mensaje_saliente'
  | 'derivacion'
  | 'timeout'
  | 'evento_sistema'
  | 'menu_mostrado';

export type TipoMultimedia =
  | 'audio'
  | 'imagen'
  | 'documento'
  | 'video'
  | 'sticker'
  | 'contacto'
  | 'ubicacion';

// Input del sistema
export interface MensajeEntrante {
  // Datos básicos del mensaje
  telefono: string; // Formato E.164 (+5491134567890)
  contenido: string; // Texto del mensaje
  whatsapp_message_id: string; // ID único de WhatsApp
  timestamp: Date; // Momento del mensaje

  // Multimedia opcional
  multimedia?: {
    tipo: TipoMultimedia;
    url: string;
    metadata?: {
      filename?: string;
      mimetype?: string;
      size?: number;
      duration?: number; // Para audio/video
    };
  };

  // Context de entrada
  metadata?: {
    // UTM tracking para Meta Ads
    utm_campaign?: string;
    utm_source?: string;
    utm_medium?: string;
    utm_content?: string;
    utm_term?: string;

    // Context técnico
    request_id?: string;
    session_id?: string;
    ip_address?: string;
    user_agent?: string;

    // Origen del mensaje
    webhook_source?: 'evolution' | 'meta' | 'manual';
    instance_name?: string;
  };
}

// Context completo de conversación
export interface ContextoConversacion {
  // Identificadores
  id: string; // UUID de conversación
  telefono: string; // Teléfono normalizado E.164

  // Estado actual
  area_actual: AreaType; // Área donde está ahora
  estado: EstadoConversacion; // Estado de la conversación
  subetiqueta?: string; // Subetiqueta específica

  // Navegación de menús
  menu_actual?: string; // Menú que se mostró último
  ultima_opcion_seleccionada?: string; // Última opción elegida
  nivel_menu: number; // 0=principal, 1=submenu

  // Control de timeouts (CRÍTICO PARA PSI)
  countdown_24h?: Date; // Cuándo expira ventana WhatsApp
  ts_ultima_derivacion?: Date; // Última vez que se derivó
  ts_ultima_interaccion: Date; // Última actividad

  // Meta Ads tracking
  es_lead_meta: boolean; // Si viene de Meta Ads
  ventana_72h_activa: boolean; // Si tiene ventana de 72h
  ts_ventana_72h_fin?: Date; // Cuándo expira ventana Meta
  utm_campaign?: string; // Campaña de origen

  // Control manual (FUNCIONALIDAD CRÍTICA PSI)
  desconectado_wsp4: boolean; // Si está desconectado del router
  assignee_id?: number; // Usuario humano asignado
  assignee_name?: string; // Nombre del usuario asignado

  // Proxy para derivaciones automáticas (CRÍTICO PARA DERIVACIONES)
  proxy_activo?: boolean; // Si el proxy está activo
  area_proxy?: string; // Área a la que se redirigen automáticamente los mensajes

  // Anti-loop protection (CRÍTICO PARA UX)
  ultimo_mensaje_automatico?: Date; // Último mensaje auto enviado
  contador_mensajes_automaticos: number; // Cuántos mensajes auto seguidos

  // Metadata y métricas
  origen: string; // De dónde vino originalmente
  numero_derivaciones: number; // Cuántas veces se derivó
  metadata: Record<string, any>; // Datos adicionales flexibles
}

// Resultado de evaluación de estado
export interface EstadoEvaluado {
  // Acción determinada
  accion:
    | 'mostrar_menu'
    | 'derivar'
    | 'continuar_conversacion'
    | 'mensaje_cortesia'
    | 'timeout'
    | 'error';

  // Si requiere derivación
  area_destino?: AreaType;
  subetiqueta?: string;
  requiere_derivacion: boolean;

  // Control de menús
  menu_a_mostrar?: string; // 'principal', 'admin', 'ventas', etc.

  // Flags de control
  es_mensaje_automatico: boolean; // Si la respuesta es automática
  antiloop_activo: boolean; // Si está en período de anti-loop
  timeout_activo: boolean; // Si hay timeouts vencidos

  // Context y debugging
  razon: string; // Por qué se tomó esta decisión
  metadata?: Record<string, any>; // Datos adicionales
}

// Acción procesada lista para ejecutar
export interface AccionProcesada {
  // Tipo de respuesta
  tipo: 'menu' | 'derivacion' | 'mensaje' | 'error' | 'silencioso';

  // Contenido para enviar
  contenido: string; // Texto del mensaje (vacío si es silencioso)

  // Control de persistencia
  requiere_persistencia: boolean; // Si hay que guardar cambios

  // Datos para persistir
  datos_persistencia?: {
    area_destino?: AreaType;
    subetiqueta?: string;
    motivo?: string; // Razón de la derivación
    crear_ticket?: boolean; // Si crear ticket de derivación
    actualizar_menu?: {
      menu_actual: string;
      nivel_menu: number;
    };
  };

  // Metadata para debugging
  metadata?: Record<string, any>;
}

// Resultado final de persistencia
export interface ResultadoPersistencia {
  // Éxito general
  success: boolean;

  // Acciones realizadas
  mensaje_enviado: boolean; // Si se envió por WhatsApp
  ticket_creado?: string; // ID del ticket creado
  conversacion_actualizada: boolean; // Si se actualizó la conversación
  interaccion_registrada: boolean; // Si se guardó la interacción

  // En caso de error
  error?: string; // Mensaje de error
  rollback_aplicado?: boolean; // Si se hizo rollback
}

// Configuración del sistema
export interface CentralwapConfig {
  // Conexiones
  supabase: {
    url: string;
    service_key: string;
    anon_key: string;
  };

  // WhatsApp
  whatsapp: {
    provider: 'evolution' | 'cloud_api';
    evolution: {
      api_url: string;
      api_key: string;
      instance_name: string;
      webhook_secret?: string;
    };
    meta?: {
      phone_number_id: string;
      access_token: string;
      verify_token?: string;
      base_url?: string;
    };
  };

  // Comportamiento del sistema (VALORES CRÍTICOS PSI)
  sistema: {
    timeout_24h_minutos: number; // 1440 (24 horas)
    antiloop_minutos: number; // 15
    max_derivaciones: number; // 5
    max_mensajes_automaticos: number; // 3
    rate_limit_por_minuto: number; // 60
  };

  // SLA por área (TIEMPOS REALES PSI)
  sla: {
    ventas_minutos: number; // 15
    alumnos_minutos: number; // 30
    admin_minutos: number; // 60
    comunidad_minutos: number; // 120
  };

  // Logging y monitoreo
  logging: {
    level: 'debug' | 'info' | 'warn' | 'error';
    sentry_dsn?: string;
    structured: boolean; // True para JSON logs
  };

  // Webhooks N8N para notificar a inboxs
  webhooks?: {
    administracion?: string;
    alumnos?: string;
    ventas?: string;
    comunidad?: string;
    crm?: string;
  };

  // Webhooks N8N para procesar derivaciones (Router → n8n → Supabase → CRM)
  webhooks_ingesta_derivaciones?: {
    administracion?: string;
    alumnos?: string;
    ventas?: string;
    comunidad?: string;
    wsp4?: string;
  };
}


