// CENTRALWAP AUTOMATIONS - Types

export interface Curso {
  id: string;
  codigo: string;
  nombre: string;
  descripcion?: string;
  activo: boolean;
  tipo_formacion?: 'curso' | 'especializacion';
  disponible_entrada_directa?: boolean;
  inscripciones_abiertas?: boolean;
  categoria?: string;
  mensaje_bienvenida?: string;
  mensaje_saludo?: string;
  imagen_url?: string;
  info_precio?: string;
  info_fechas?: string;
  info_duracion?: string;
  info_certificacion?: string;
  info_salida_laboral?: string;
  info_modalidad?: string;
  info_contenido?: string;
  info_requisitos?: string;
  info_custom_1?: string;
  info_custom_1_label?: string;
  info_custom_2?: string;
  info_custom_2_label?: string;
  info_custom_3?: string;
  info_custom_3_label?: string;
  metadata?: Record<string, any>;
  created_at?: string;
  updated_at?: string;
}

export interface CursoCreate {
  codigo: string;
  nombre: string;
  descripcion?: string;
  mensaje_bienvenida?: string;
  mensaje_saludo?: string;
  imagen_url?: string;
  info_precio?: string;
  info_fechas?: string;
  info_duracion?: string;
  info_certificacion?: string;
  info_salida_laboral?: string;
  info_modalidad?: string;
  info_contenido?: string;
  info_requisitos?: string;
}

export interface CursoUpdate extends Partial<CursoCreate> {
  activo?: boolean;
}

export type TipoOpcion = 'info' | 'derivar' | 'inscribir';

export interface MenuOpcion {
  id: string;
  curso_id: string;
  orden: number;
  emoji?: string;
  titulo: string;
  subtitulo?: string;
  tipo: TipoOpcion;
  campo_info?: string;
  respuesta_custom?: string;
  mostrar_menu_despues: boolean;
  mensaje_derivacion?: string;
  prioridad_derivacion?: 'normal' | 'alta';
  activo: boolean;
  tipo_formacion?: 'curso' | 'especializacion';
  disponible_entrada_directa?: boolean;
  inscripciones_abiertas?: boolean;
  categoria?: string;
  created_at?: string;
  updated_at?: string;
}

export interface MenuOpcionCreate {
  curso_id: string;
  orden?: number;
  emoji?: string;
  titulo: string;
  subtitulo?: string;
  tipo: TipoOpcion;
  campo_info?: string;
  respuesta_custom?: string;
  mostrar_menu_despues?: boolean;
  mensaje_derivacion?: string;
  prioridad_derivacion?: 'normal' | 'alta';
}

export interface MenuOpcionUpdate extends Partial<Omit<MenuOpcionCreate, 'curso_id'>> {
  activo?: boolean;
}

export interface ConfigCTWA {
  id: string;
  ad_id: string;
  curso_id: string;
  nombre?: string;
  activo: boolean;
  tipo_formacion?: 'curso' | 'especializacion';
  disponible_entrada_directa?: boolean;
  inscripciones_abiertas?: boolean;
  categoria?: string;
  ejecuciones: number;
  meta_campaign_id?: string;
  meta_adset_id?: string;
  meta_headline?: string;
  created_at?: string;
  updated_at?: string;
}

export interface ConfigCTWACreate {
  ad_id: string;
  curso_id: string;
  nombre?: string;
  meta_campaign_id?: string;
  meta_adset_id?: string;
  meta_headline?: string;
}

export type EstadoSesion = 'activo' | 'derivado' | 'finalizado';

export interface MenuSesion {
  id: string;
  conversacion_id?: string;
  telefono: string;
  curso_id?: string;
  config_ctwa_id?: string;
  estado: EstadoSesion;
  ad_id?: string;
  ctwa_clid?: string;
  mensaje_inicial?: string;
  interacciones: number;
  ultima_actividad: string;
  created_at?: string;
  updated_at?: string;
}

export interface MenuInteraccion {
  id: string;
  contacto_id?: string;
  conversacion_id?: string;
  telefono: string;
  curso_id?: string;
  opcion_id?: string;
  curso_codigo?: string;
  curso_nombre?: string;
  opcion_titulo?: string;
  tipo_opcion?: TipoOpcion;
  config_ctwa_id?: string;
  ad_id?: string;
  ctwa_clid?: string;
  respuesta_enviada: boolean;
  derivado: boolean;
  created_at?: string;
}

export interface CTRCurso {
  id: string;
  codigo: string;
  nombre: string;
  activo: boolean;
  tipo_formacion?: 'curso' | 'especializacion';
  disponible_entrada_directa?: boolean;
  inscripciones_abiertas?: boolean;
  categoria?: string;
  total_leads: number;
  total_interacciones: number;
  ctr_promedio: number;
  leads_este_mes: number;
  ultima_interaccion?: string;
}

export interface CTROpcion {
  opcion_id: string;
  curso_id: string;
  curso_codigo: string;
  curso_nombre: string;
  orden: number;
  emoji?: string;
  titulo: string;
  tipo: TipoOpcion;
  activo: boolean;
  tipo_formacion?: 'curso' | 'especializacion';
  disponible_entrada_directa?: boolean;
  inscripciones_abiertas?: boolean;
  categoria?: string;
  veces_elegida: number;
  ctr_opcion: number;
}

export interface Automatizacion {
  id: string;
  ad_id: string;
  nombre?: string;
  activo: boolean;
  tipo_formacion?: 'curso' | 'especializacion';
  disponible_entrada_directa?: boolean;
  inscripciones_abiertas?: boolean;
  categoria?: string;
  ejecuciones: number;
  created_at: string;
  curso_id: string;
  curso_codigo: string;
  curso_nombre: string;
  opciones_activas: number;
  leads_generados: number;
  ctr_anuncio: number;
}

export interface WhatsAppListMessage {
  messaging_product: 'whatsapp';
  recipient_type: 'individual';
  to: string;
  type: 'interactive';
  interactive: {
    type: 'list';
    header?: { type: 'text'; text: string };
    body: { text: string };
    footer?: { text: string };
    action: {
      button: string;
      sections: WhatsAppListSection[];
    };
  };
}

export interface WhatsAppListSection {
  title: string;
  rows: WhatsAppListRow[];
}

export interface WhatsAppListRow {
  id: string;
  title: string;
  description?: string;
}

export interface WhatsAppTextMessage {
  messaging_product: 'whatsapp';
  recipient_type: 'individual';
  to: string;
  type: 'text';
  text: { preview_url?: boolean; body: string };
}

export interface ApiResponse<T = any> {
  success: boolean;
  data?: T;
  error?: string;
  message?: string;
}

export interface EnviarMenuRequest {
  telefono: string;
  curso_id?: string;
  ad_id?: string;
  ctwa_clid?: string;
  conversacion_id?: string;
  mensaje_inicial?: string;
  nombre_contacto?: string;
}

export interface ProcesarSeleccionRequest {
  telefono: string;
  opcion_id: string;
  conversacion_id?: string;
  nombre_contacto?: string;
}

export interface ReordenarOpcionesRequest {
  opciones: Array<{ id: string; orden: number }>;
}
