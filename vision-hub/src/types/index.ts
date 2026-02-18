// Tipos para PSI Vision Hub

export interface User {
  id: string;
  email: string;
  nombre: string;
  rol: 'admin' | 'ventas' | 'marketing' | 'operaciones';
  areas_acceso: string[];
}

export interface Metrica {
  id: string;
  area: string;
  metrica: string;
  valor: number;
  valor_anterior: number | null;
  periodo: 'hoy' | 'semana' | 'mes' | 'año';
  metadata?: Record<string, unknown>;
  updated_at: string;
}

export interface AgentInsight {
  id: string;
  agente: 'marketing' | 'ventas' | 'alumnos' | 'admin' | 'lc' | 'pupi';
  tipo: 'alerta' | 'recomendacion' | 'prediccion' | 'metrica';
  titulo: string;
  contenido: {
    mensaje: string;
    datos?: Record<string, unknown>;
    accion_sugerida?: string;
  };
  severidad: 'alta' | 'media' | 'baja';
  score: number;
  dashboard_link?: string;
  activo: boolean;
  created_at: string;
  expires_at?: string;
}

export interface AdsData {
  id: string;
  plataforma: 'meta' | 'google' | 'tiktok';
  campaign_id?: string;
  ad_id?: string;
  fecha: string;
  spend: number;
  impressions: number;
  clicks: number;
  reach: number;
  conversions: number;
  ctr: number;
  cpc: number;
  cpm: number;
  moneda: string;
  created_at: string;
}

export interface PupyConversation {
  id: string;
  user_email: string;
  messages: PupyMessage[];
  created_at: string;
  updated_at: string;
}

export interface PupyMessage {
  role: 'user' | 'assistant';
  content: string;
  timestamp: string;
}

export interface KPIData {
  titulo: string;
  valor: number | string;
  valorAnterior?: number;
  formato?: 'numero' | 'porcentaje' | 'moneda' | 'texto';
  tendencia?: 'up' | 'down' | 'neutral';
  periodo?: string;
}

export interface AlertaUI {
  id: string;
  tipo: 'alerta' | 'recomendacion' | 'prediccion';
  severidad: 'alta' | 'media' | 'baja';
  titulo: string;
  mensaje: string;
  area: string;
  accion?: string;
  link?: string;
  score?: number;
  timestamp: string;
}

export interface TareaDelDia {
  id: string;
  titulo: string;
  prioridad: 'alta' | 'media' | 'baja';
  area: string;
  completada: boolean;
}
