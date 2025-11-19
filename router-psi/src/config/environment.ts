import dotenv from 'dotenv';
import path from 'path';
import Joi from 'joi';
import { Logger } from '../utils/logger';

// Cargar .env desde el directorio de trabajo actual (router-psi)
// PM2 ejecuta desde router-psi según cwd en ecosystem.config.cjs
const envPath = path.join(process.cwd(), '.env');
const result = dotenv.config({ path: envPath });

if (result.error) {
  Logger.warn(`No se pudo cargar .env desde ${envPath}, usando variables de entorno del sistema`);
} else {
  Logger.info(`✅ Variables de entorno cargadas desde ${envPath}`);
}

const envSchema = Joi.object({
  NODE_ENV: Joi.string().valid('development', 'production', 'test').default('development'),
  PORT: Joi.number().default(3002),
  LOG_LEVEL: Joi.string().default('info'),
  WEBHOOK_VERIFY_TOKEN: Joi.string().required(),
  ANTILOOP_MINUTES: Joi.number().default(15),

  SUPABASE_URL: Joi.string().uri().required(),
  SUPABASE_ANON_KEY: Joi.string().required(),
  SUPABASE_SERVICE_ROLE_KEY: Joi.string().required(),
  SUPABASE_STORAGE_BUCKET_AUDIOS: Joi.string().default('audios'),
  SUPABASE_STORAGE_BUCKET_DOCUMENTOS: Joi.string().default('documentos'),

  WHATSAPP_TOKEN: Joi.string().required(),
  CLOUD_API_BASE_URL: Joi.string().uri().required(),
  WSP4_PHONE_ID: Joi.string().required(),
  VENTAS1_PHONE_ID: Joi.string().required(),
  ADMIN_PHONE_ID: Joi.string().required(),
  ALUMNOS_PHONE_ID: Joi.string().required(),
  COMUNIDAD_PHONE_ID: Joi.string().required(),
  WSP4_NUMBER: Joi.string().required(),
  VENTAS1_NUMBER: Joi.string().required(),

  N8N_WEBHOOK_ENVIOS_ROUTER_CRM: Joi.string().uri().required(),
  N8N_WEBHOOK_ENVIOS_ROUTER_ADMINISTRACION: Joi.string().uri().required(),
  N8N_WEBHOOK_ENVIOS_ROUTER_ALUMNOS: Joi.string().uri().required(),
  N8N_WEBHOOK_ENVIOS_ROUTER_COMUNIDAD: Joi.string().uri().required(),
  N8N_WEBHOOK_ENVIOS_ROUTER_VENTAS_1: Joi.string().uri().required(),
}).unknown();

const { error, value } = envSchema.validate(process.env, { abortEarly: false });

if (error) {
  Logger.error(' Error validando variables de entorno', { details: error.details });
  throw error;
}

export const Env = {
  nodeEnv: value.NODE_ENV as string,
  port: Number(value.PORT),
  logLevel: value.LOG_LEVEL as string,
  verifyToken: value.WEBHOOK_VERIFY_TOKEN as string,
  antiLoopMinutes: Number(value.ANTILOOP_MINUTES),
  supabase: {
    url: value.SUPABASE_URL as string,
    anonKey: value.SUPABASE_ANON_KEY as string,
    serviceKey: value.SUPABASE_SERVICE_ROLE_KEY as string,
    buckets: {
      audios: value.SUPABASE_STORAGE_BUCKET_AUDIOS as string,
      documentos: value.SUPABASE_STORAGE_BUCKET_DOCUMENTOS as string,
    },
  },
  whatsapp: {
    token: value.WHATSAPP_TOKEN as string,
    baseUrl: value.CLOUD_API_BASE_URL as string,
    phoneIds: {
      wsp4: value.WSP4_PHONE_ID as string,
      ventas1: value.VENTAS1_PHONE_ID as string,
      administracion: value.ADMIN_PHONE_ID as string,
      alumnos: value.ALUMNOS_PHONE_ID as string,
      comunidad: value.COMUNIDAD_PHONE_ID as string,
    },
    numbers: {
      wsp4: value.WSP4_NUMBER as string,
      ventas1: value.VENTAS1_NUMBER as string,
    },
  },
  webhooks: {
    crm: value.N8N_WEBHOOK_ENVIOS_ROUTER_CRM as string,
    administracion: value.N8N_WEBHOOK_ENVIOS_ROUTER_ADMINISTRACION as string,
    alumnos: value.N8N_WEBHOOK_ENVIOS_ROUTER_ALUMNOS as string,
    comunidad: value.N8N_WEBHOOK_ENVIOS_ROUTER_COMUNIDAD as string,
    ventas1: value.N8N_WEBHOOK_ENVIOS_ROUTER_VENTAS_1 as string,
  },
};
