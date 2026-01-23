// ==========================================
// TIPOS CRM PSI - CENTRALWAP
// ==========================================

export type InboxType = 'wsp4' | 'ventas' | 'ventas_api' | 'alumnos' | 'admin' | 'comunidad';
export type EstadoConversacion = 'nueva' | 'activa' | 'esperando' | 'derivada' | 'resuelta' | 'cerrada';
export type EstadoLead = 'nuevo' | 'contactado' | 'interesado' | 'negociando' | 'ganado' | 'perdido' | 'no_responde';
export type Resultado = 'INS' | 'NOINT' | 'NOCONT' | 'NOEX' | 'NR+';
export type TipoMensaje = 'text' | 'image' | 'video' | 'document' | 'audio' | 'sticker' | 'location' | 'contact';
export type DireccionMensaje = 'entrante' | 'saliente' | 'outbound';
export type TipoRemitente = 'contacto' | 'agente' | 'sistema';

export interface Conversacion {
  id: string;
  telefono: string;
  contacto_id?: string;
  nombre?: string;
  estado: EstadoConversacion;
  area?: InboxType;
  agente_id?: string;
  assignee_name?: string;
  prioridad?: string;
  ventana_24h_activa?: boolean;
  ventana_24h_inicio?: string;
  ventana_24h_fin?: string;
  ventana_72h_activa?: boolean;
  ventana_72h_inicio?: string;
  ventana_72h_fin?: string;
  origen?: string;
  linea_origen?: InboxType;
  canal?: string;
  es_lead_meta?: boolean;
  desconectado_wsp4?: boolean;
  desconectado_por?: string;
  desconectado_ts?: string;
  inbox_fijo?: InboxType;
  fijada?: boolean;
  fijada_orden?: number;
  marcado_no_leido?: boolean;
  mensajes_no_leidos?: number;
  ultimo_mensaje?: string;
  ultimo_mensaje_at?: string;
  ultimo_mensaje_preview?: string;
  estado_lead?: string;
  resultado?: string;
  agente_asignado_id?: string;
  etiquetas?: string[];
  ts_ultimo_mensaje?: string;
  etiqueta?: string;
  subetiqueta?: string;
  // Campos de asignación
  asignado_a?: string;
  asignado_nombre?: string;
  asignado_ts?: string;
  created_at?: string;
  updated_at?: string;
}

export interface Mensaje {
  id: string;
  conversacion_id: string;
  whatsapp_message_id?: string;
  mensaje?: string;
  tipo: TipoMensaje;
  media_url?: string;
  media_type?: string;
  duracion?: number;
  direccion: DireccionMensaje;
  remitente_tipo?: TipoRemitente;
  remitente_id?: string;
  remitente_nombre?: string;
  enviado?: boolean;
  enviado_ts?: string;
  entregado?: boolean;
  entregado_ts?: string;
  leido?: boolean;
  leido_ts?: string;
  fallido?: boolean;
  error_mensaje?: string;
  editado?: boolean;
  editado_ts?: string;
  contenido_original?: string;
  eliminado?: boolean;
  eliminado_para_todos?: boolean;
  eliminado_ts?: string;
  eliminado_por?: string;
  reenviado?: boolean;
  mensaje_original_id?: string;
  mensaje_citado?: string;
  citado_remitente?: string;
  reacciones?: { emoji: string; usuario_id: string }[];
  destacado?: boolean;
  fijado?: boolean;
  timestamp?: string;
  created_at?: string;
}

export interface Contacto {
  id: string;
  telefono: string;
  nombre?: string;
  email?: string;
  documento?: string;
  foto_url?: string;
  about?: string;
  tipo?: string;
  origen?: string;
  estado_lead?: EstadoLead;
  resultado?: Resultado;
  resultado_ts?: string;
  resultado_notas?: string;
  curso_interes?: string;
  pais?: string;
  ciudad?: string;
  timezone?: string;
  consent_marketing?: boolean;
  etiquetas?: any;
  notas?: string;
  activo?: boolean;
  created_at?: string;
  updated_at?: string;
}

export interface Profile {
  id: string;
  nombre: string;
  email?: string;
  avatar_url?: string;
  rol?: string;
  areas?: string[];
  activo?: boolean;
}

export interface Etiqueta {
  id: string;
  nombre: string;
  color: string;
  categoria?: string;
  descripcion?: string;
  activa?: boolean;
}

export interface RespuestaRapida {
  id: string;
  nombre: string;
  atajo: string;
  contenido: string;
  categoria?: string;
  uso_count?: number;
  activa?: boolean;
}

export interface NotaInterna {
  id: string;
  contacto_id?: string;
  conversacion_id?: string;
  usuario_id: string;
  contenido: string;
  created_at: string;
}

export interface InboxConfig {
  id: InboxType;
  nombre: string;
  icono: string;
  colorLight: string;
  colorDark: string;
  gradiente: string;
}

export const INBOXES: InboxConfig[] = [
  { id: 'wsp4', nombre: 'PSI Principal', icono: '🏠', colorLight: 'bg-indigo-100 text-indigo-700', colorDark: 'bg-indigo-500/20 text-indigo-400', gradiente: 'from-indigo-500 to-purple-500' },
  { id: 'ventas', nombre: 'Ventas', icono: '💰', colorLight: 'bg-amber-100 text-amber-700', colorDark: 'bg-amber-500/20 text-amber-400', gradiente: 'from-amber-500 to-orange-500' },
  { id: 'ventas_api', nombre: 'Ventas Api', icono: '📢', colorLight: 'bg-orange-100 text-orange-700', colorDark: 'bg-orange-500/20 text-orange-400', gradiente: 'from-orange-500 to-red-500' },
  { id: 'alumnos', nombre: 'Alumnos', icono: '🎓', colorLight: 'bg-emerald-100 text-emerald-700', colorDark: 'bg-emerald-500/20 text-emerald-400', gradiente: 'from-emerald-500 to-teal-500' },
  { id: 'admin', nombre: 'Administración', icono: '📋', colorLight: 'bg-blue-100 text-blue-700', colorDark: 'bg-blue-500/20 text-blue-400', gradiente: 'from-blue-500 to-indigo-500' },
  { id: 'comunidad', nombre: 'Comunidad', icono: '👥', colorLight: 'bg-purple-100 text-purple-700', colorDark: 'bg-purple-500/20 text-purple-400', gradiente: 'from-purple-500 to-pink-500' }
];

export const ESTADO_COLORS = {
  nueva: { light: 'bg-blue-100 text-blue-700', dark: 'bg-blue-500/20 text-blue-400' },
  activa: { light: 'bg-emerald-100 text-emerald-700', dark: 'bg-emerald-500/20 text-emerald-400' },
  esperando: { light: 'bg-amber-100 text-amber-700', dark: 'bg-amber-500/20 text-amber-400' },
  derivada: { light: 'bg-orange-100 text-orange-700', dark: 'bg-orange-500/20 text-orange-400' },
  resuelta: { light: 'bg-purple-100 text-purple-700', dark: 'bg-purple-500/20 text-purple-400' },
  cerrada: { light: 'bg-slate-200 text-slate-600', dark: 'bg-slate-500/20 text-slate-400' }
};

export const WEBHOOKS: Record<InboxType, string> = {
  wsp4: process.env.NEXT_PUBLIC_WEBHOOK_WSP4 || 'https://n8n.psi.com/webhook/wsp4/enviar',
  ventas: process.env.NEXT_PUBLIC_WEBHOOK_VENTAS || 'https://n8n.psi.com/webhook/ventas/enviar',
  ventas_api: process.env.NEXT_PUBLIC_WEBHOOK_VENTAS_API || 'https://n8n.psi.com/webhook/ventas_api/enviar',
  alumnos: process.env.NEXT_PUBLIC_WEBHOOK_ALUMNOS || 'https://n8n.psi.com/webhook/alumnos/enviar',
  admin: process.env.NEXT_PUBLIC_WEBHOOK_ADMIN || 'https://n8n.psi.com/webhook/admin/enviar',
  comunidad: process.env.NEXT_PUBLIC_WEBHOOK_COMUNIDAD || 'https://n8n.psi.com/webhook/comunidad/enviar'
};

// ==========================================
// MENSAJES PROGRAMADOS
// ==========================================

export type LineaEvolution = 'ventas' | 'administracion' | 'alumnos' | 'comunidad';
export type EstadoMensajeProgramado = 'pendiente' | 'enviado' | 'fallido' | 'cancelado';

export interface MensajeProgramado {
  id: string;
  conversacion_id: string;
  contacto_id?: string;
  telefono: string;
  nombre_contacto?: string;
  mensaje?: string;
  media_url?: string;
  media_type?: 'image' | 'document' | null;
  media_filename?: string;
  linea_envio: LineaEvolution;
  instancia_evolution: string;
  programado_para: string;
  estado: EstadoMensajeProgramado;
  error_mensaje?: string;
  enviado_at?: string;
  creado_por: string;
  creado_por_nombre?: string;
  created_at: string;
  updated_at: string;
  cancelado_at?: string;
  cancelado_por?: string;
}

export const LINEAS_EVOLUTION: { id: LineaEvolution; nombre: string; instancia: string; icono: string; color: string }[] = [
  { id: 'ventas', nombre: 'Ventas', instancia: 'PSI Ventas', icono: '💰', color: 'amber' },
  { id: 'administracion', nombre: 'Administración', instancia: 'EME Automations', icono: '📋', color: 'blue' },
  { id: 'alumnos', nombre: 'Alumnos', instancia: 'PSI Alumnos', icono: '🎓', color: 'emerald' },
  { id: 'comunidad', nombre: 'Comunidad', instancia: 'PSI Comunidad', icono: '👥', color: 'purple' },
];
