"use strict";
var __importDefault = (this && this.__importDefault) || function (mod) {
    return (mod && mod.__esModule) ? mod : { "default": mod };
};
Object.defineProperty(exports, "__esModule", { value: true });
exports.Env = void 0;
const dotenv_1 = __importDefault(require("dotenv"));
const path_1 = __importDefault(require("path"));
const fs_1 = __importDefault(require("fs"));
const joi_1 = __importDefault(require("joi"));
const logger_1 = require("../utils/logger");
// Cargar .env desde el directorio de trabajo actual (router-psi)
// PM2 ejecuta desde router-psi según cwd en ecosystem.config.cjs
const envPath = path_1.default.join(process.cwd(), '.env');
// Cargar .env de forma explícita
if (fs_1.default.existsSync(envPath)) {
    const result = dotenv_1.default.config({ path: envPath, override: true });
    if (result.error) {
        logger_1.Logger.warn(`Error cargando .env: ${result.error.message}`);
    }
    else if (result.parsed) {
        // Asegurar que todas las variables se asignen a process.env
        for (const [key, value] of Object.entries(result.parsed)) {
            if (!process.env[key]) {
                process.env[key] = value;
            }
        }
        logger_1.Logger.info(`✅ Variables de entorno cargadas desde ${envPath} (${Object.keys(result.parsed).length} variables)`);
    }
}
else {
    logger_1.Logger.warn(`Archivo .env no encontrado en ${envPath}`);
}
const envSchema = joi_1.default.object({
    NODE_ENV: joi_1.default.string().valid('development', 'production', 'test').default('development'),
    PORT: joi_1.default.number().default(3002),
    LOG_LEVEL: joi_1.default.string().default('info'),
    WEBHOOK_VERIFY_TOKEN: joi_1.default.string().required(),
    ANTILOOP_MINUTES: joi_1.default.number().default(15),
    SUPABASE_URL: joi_1.default.string().uri().required(),
    SUPABASE_ANON_KEY: joi_1.default.string().required(),
    SUPABASE_SERVICE_ROLE_KEY: joi_1.default.string().required(),
    SUPABASE_STORAGE_BUCKET_AUDIOS: joi_1.default.string().default('audios'),
    SUPABASE_STORAGE_BUCKET_DOCUMENTOS: joi_1.default.string().default('documentos'),
    WHATSAPP_TOKEN: joi_1.default.string().required(),
    CLOUD_API_BASE_URL: joi_1.default.string().uri().required(),
    WSP4_PHONE_ID: joi_1.default.string().required(),
    VENTAS1_PHONE_ID: joi_1.default.string().required(),
    ADMIN_PHONE_ID: joi_1.default.string().required(),
    ALUMNOS_PHONE_ID: joi_1.default.string().required(),
    COMUNIDAD_PHONE_ID: joi_1.default.string().required(),
    WSP4_NUMBER: joi_1.default.string().required(),
    VENTAS1_NUMBER: joi_1.default.string().required(),
    N8N_WEBHOOK_ENVIOS_ROUTER_CRM: joi_1.default.string().uri().required(),
    N8N_WEBHOOK_ENVIOS_ROUTER_ADMINISTRACION: joi_1.default.string().uri().required(),
    N8N_WEBHOOK_ENVIOS_ROUTER_ALUMNOS: joi_1.default.string().uri().required(),
    N8N_WEBHOOK_ENVIOS_ROUTER_COMUNIDAD: joi_1.default.string().uri().required(),
    N8N_WEBHOOK_ENVIOS_ROUTER_VENTAS_1: joi_1.default.string().uri().required(),
}).unknown();
const { error, value } = envSchema.validate(process.env, { abortEarly: false });
if (error) {
    logger_1.Logger.error(' Error validando variables de entorno', { details: error.details });
    throw error;
}
exports.Env = {
    nodeEnv: value.NODE_ENV,
    port: Number(value.PORT),
    logLevel: value.LOG_LEVEL,
    verifyToken: value.WEBHOOK_VERIFY_TOKEN,
    antiLoopMinutes: Number(value.ANTILOOP_MINUTES),
    supabase: {
        url: value.SUPABASE_URL,
        anonKey: value.SUPABASE_ANON_KEY,
        serviceKey: value.SUPABASE_SERVICE_ROLE_KEY,
        buckets: {
            audios: value.SUPABASE_STORAGE_BUCKET_AUDIOS,
            documentos: value.SUPABASE_STORAGE_BUCKET_DOCUMENTOS,
        },
    },
    whatsapp: {
        token: value.WHATSAPP_TOKEN,
        baseUrl: value.CLOUD_API_BASE_URL,
        phoneIds: {
            wsp4: value.WSP4_PHONE_ID,
            ventas1: value.VENTAS1_PHONE_ID,
            administracion: value.ADMIN_PHONE_ID,
            alumnos: value.ALUMNOS_PHONE_ID,
            comunidad: value.COMUNIDAD_PHONE_ID,
        },
        numbers: {
            wsp4: value.WSP4_NUMBER,
            ventas1: value.VENTAS1_NUMBER,
        },
    },
    webhooks: {
        crm: value.N8N_WEBHOOK_ENVIOS_ROUTER_CRM,
        administracion: value.N8N_WEBHOOK_ENVIOS_ROUTER_ADMINISTRACION,
        alumnos: value.N8N_WEBHOOK_ENVIOS_ROUTER_ALUMNOS,
        comunidad: value.N8N_WEBHOOK_ENVIOS_ROUTER_COMUNIDAD,
        ventas1: value.N8N_WEBHOOK_ENVIOS_ROUTER_VENTAS_1,
    },
};
