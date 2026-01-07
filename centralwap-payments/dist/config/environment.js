"use strict";
var __importDefault = (this && this.__importDefault) || function (mod) {
    return (mod && mod.__esModule) ? mod : { "default": mod };
};
Object.defineProperty(exports, "__esModule", { value: true });
exports.config = void 0;
exports.validateConfig = validateConfig;
const dotenv_1 = __importDefault(require("dotenv"));
dotenv_1.default.config();
exports.config = {
    // Server
    port: parseInt(process.env.PORT || '3005'),
    nodeEnv: process.env.NODE_ENV || 'development',
    baseUrl: process.env.BASE_URL || 'http://localhost:3005',
    // Supabase
    supabase: {
        url: process.env.SUPABASE_URL || '',
        serviceKey: process.env.SUPABASE_SERVICE_KEY || '',
    },
    // MercadoPago
    mercadopago: {
        accessToken: process.env.MERCADOPAGO_ACCESS_TOKEN || '',
        publicKey: process.env.MERCADOPAGO_PUBLIC_KEY || '',
    },
    // SIRO (Banco Roela)
    siro: {
        apiKey: process.env.SIRO_API_KEY || '',
        comercioId: process.env.SIRO_COMERCIO_ID || '',
        apiUrl: process.env.SIRO_API_URL || 'https://apisiro.bancoroela.com.ar',
    },
    // Stripe
    stripe: {
        secretKey: process.env.STRIPE_SECRET_KEY || '',
        publishableKey: process.env.STRIPE_PUBLISHABLE_KEY || '',
        webhookSecret: process.env.STRIPE_WEBHOOK_SECRET || '',
    },
    // DLocal
    dlocal: {
        apiKey: process.env.DLOCAL_API_KEY || '',
        secretKey: process.env.DLOCAL_SECRET_KEY || '',
        apiUrl: process.env.DLOCAL_API_URL || 'https://api.dlocal.com',
    },
    // n8n Webhooks
    webhooks: {
        pagoConfirmado: process.env.N8N_WEBHOOK_PAGO_CONFIRMADO || '',
        envioMensaje: process.env.N8N_WEBHOOK_ENVIO || '',
    },
    // Frontend
    frontendUrl: process.env.FRONTEND_URL || 'https://psivisionhub.com',
};
// Validar configuración crítica
function validateConfig() {
    const errors = [];
    if (!exports.config.supabase.url)
        errors.push('SUPABASE_URL no configurado');
    if (!exports.config.supabase.serviceKey)
        errors.push('SUPABASE_SERVICE_KEY no configurado');
    return errors;
}
//# sourceMappingURL=environment.js.map