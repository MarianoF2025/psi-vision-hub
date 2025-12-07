// ===========================================
// ENVIRONMENT CONFIG - Variables de Entorno
// Versión 3.3 - Con webhooks por área
// ===========================================

export const environment = {
  // Supabase
  SUPABASE_URL: process.env.SUPABASE_URL || '',
  SUPABASE_SERVICE_KEY: process.env.SUPABASE_SERVICE_KEY || process.env.SUPABASE_ANON_KEY || '',

  // Webhook genérico (legacy)
  WEBHOOK_ENVIO_MENSAJE: process.env.WEBHOOK_ENVIO_MENSAJE || null,

  // Webhooks Derivación v3.3 (Router → n8n por área)
  N8N_WEBHOOK_DERIVACION_ADMIN: process.env.N8N_WEBHOOK_DERIVACION_ADMIN || null,
  N8N_WEBHOOK_DERIVACION_ALUMNOS: process.env.N8N_WEBHOOK_DERIVACION_ALUMNOS || null,
  N8N_WEBHOOK_DERIVACION_VENTAS: process.env.N8N_WEBHOOK_DERIVACION_VENTAS || null,
  N8N_WEBHOOK_DERIVACION_COMUNIDAD: process.env.N8N_WEBHOOK_DERIVACION_COMUNIDAD || null,

  // Webhook Envío WSP4 (regla "por donde entra, sale")
  N8N_WEBHOOK_ENVIO_WSP4: process.env.N8N_WEBHOOK_ENVIO_WSP4 || null,

  // Server
  PORT: parseInt(process.env.PORT || '3000', 10),
  NODE_ENV: process.env.NODE_ENV || 'development',
};

// Validar variables críticas
if (!environment.SUPABASE_URL || !environment.SUPABASE_SERVICE_KEY) {
  console.error('[Environment] ⚠️ Faltan variables de entorno críticas para Supabase');
}

// Validar webhooks v3.3
const webhooksDerivacion = [
  { key: 'N8N_WEBHOOK_DERIVACION_ADMIN', value: environment.N8N_WEBHOOK_DERIVACION_ADMIN },
  { key: 'N8N_WEBHOOK_DERIVACION_ALUMNOS', value: environment.N8N_WEBHOOK_DERIVACION_ALUMNOS },
  { key: 'N8N_WEBHOOK_DERIVACION_VENTAS', value: environment.N8N_WEBHOOK_DERIVACION_VENTAS },
  { key: 'N8N_WEBHOOK_DERIVACION_COMUNIDAD', value: environment.N8N_WEBHOOK_DERIVACION_COMUNIDAD },
];

webhooksDerivacion.forEach(({ key, value }) => {
  if (value) {
    console.log(`[Environment] ✅ ${key} configurado`);
  } else {
    console.warn(`[Environment] ⚠️ ${key} no configurado`);
  }
});

if (environment.N8N_WEBHOOK_ENVIO_WSP4) {
  console.log('[Environment] ✅ N8N_WEBHOOK_ENVIO_WSP4 configurado');
} else {
  console.warn('[Environment] ⚠️ N8N_WEBHOOK_ENVIO_WSP4 no configurado');
}
