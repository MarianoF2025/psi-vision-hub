import dotenv from 'dotenv';
import path from 'path';
import { CentralwapConfig } from '../types';

// Cargar .env
const envPath = path.join(process.cwd(), '.env');
dotenv.config({ path: envPath, override: true });

// Validar y construir configuración
export const config: CentralwapConfig = {
  supabase: {
    url: process.env.SUPABASE_URL || '',
    service_key: process.env.SUPABASE_SERVICE_KEY || '',
    anon_key: process.env.SUPABASE_ANON_KEY || '',
  },

  whatsapp: {
    provider: (process.env.WHATSAPP_PROVIDER as 'evolution' | 'cloud_api') || 'cloud_api',
    evolution: {
      api_url: process.env.EVOLUTION_API_URL || '',
      api_key: process.env.EVOLUTION_API_KEY || '',
      instance_name: process.env.EVOLUTION_INSTANCE_NAME || '',
      webhook_secret: process.env.WEBHOOK_SECRET,
    },
    meta: process.env.META_ACCESS_TOKEN
      ? {
          phone_number_id: process.env.META_PHONE_NUMBER_ID || '',
          access_token: process.env.META_ACCESS_TOKEN,
          verify_token: process.env.META_VERIFY_TOKEN || '',
          base_url: process.env.CLOUD_API_BASE_URL || 'https://graph.facebook.com/v24.0',
        }
      : undefined,
  },

  sistema: {
    timeout_24h_minutos: parseInt(process.env.TIMEOUT_24H_MINUTOS || '1440', 10),
    antiloop_minutos: parseInt(process.env.ANTILOOP_MINUTOS || '15', 10),
    max_derivaciones: parseInt(process.env.MAX_DERIVACIONES_POR_CONVERSACION || '5', 10),
    max_mensajes_automaticos: parseInt(
      process.env.MAX_MENSAJES_AUTOMATICOS_CONSECUTIVOS || '3',
      10
    ),
    rate_limit_por_minuto: parseInt(process.env.API_RATE_LIMIT_PER_MINUTE || '60', 10),
  },

  sla: {
    ventas_minutos: parseInt(process.env.SLA_VENTAS_MINUTOS || '15', 10),
    alumnos_minutos: parseInt(process.env.SLA_ALUMNOS_MINUTOS || '30', 10),
    admin_minutos: parseInt(process.env.SLA_ADMIN_MINUTOS || '60', 10),
    comunidad_minutos: parseInt(process.env.SLA_COMUNIDAD_MINUTOS || '120', 10),
  },

  logging: {
    level: (process.env.LOG_LEVEL as 'debug' | 'info' | 'warn' | 'error') || 'info',
    sentry_dsn: process.env.SENTRY_DSN,
    structured: true,
  },

  // Webhooks N8N para notificar a inboxs
  webhooks: {
    administracion: process.env.N8N_WEBHOOK_ENVIOS_ROUTER_ADMINISTRACION || '',
    alumnos: process.env.N8N_WEBHOOK_ENVIOS_ROUTER_ALUMNOS || '',
    ventas: process.env.N8N_WEBHOOK_ENVIOS_ROUTER_VENTAS_1 || '',
    comunidad: process.env.N8N_WEBHOOK_ENVIOS_ROUTER_COMUNIDAD || '',
    crm: process.env.N8N_WEBHOOK_ENVIOS_ROUTER_CRM || '',
  },

  // Webhooks N8N para procesar derivaciones (Router → n8n → Supabase → CRM)
  webhooks_ingesta_derivaciones: {
    administracion: process.env.N8N_WEBHOOK_INGESTA_ROUTER_ADMINISTRACION || '',
    alumnos: process.env.N8N_WEBHOOK_INGESTA_ROUTER_ALUMNOS || '',
    ventas: process.env.N8N_WEBHOOK_INGESTA_ROUTER_VENTAS || '',
    comunidad: process.env.N8N_WEBHOOK_INGESTA_ROUTER_COMUNIDAD || '',
    wsp4: process.env.N8N_WEBHOOK_INGESTA_ROUTER_WSP4 || '',
  },
};

// Validar variables críticas
const requiredVars = [
  'SUPABASE_URL',
  'SUPABASE_SERVICE_KEY',
  'SUPABASE_ANON_KEY',
  'META_ACCESS_TOKEN',
  'META_PHONE_NUMBER_ID',
];

for (const varName of requiredVars) {
  if (!process.env[varName]) {
    throw new Error(`Variable de entorno requerida faltante: ${varName}`);
  }
}


