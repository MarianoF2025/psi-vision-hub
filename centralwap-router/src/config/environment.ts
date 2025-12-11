// ===========================================
// ENVIRONMENT CONFIG - Variables de Entorno
// Versión 3.4 - Con webhooks envío por línea
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
  
  // Webhooks Envío v3.4 (para líneas secundarias)
  N8N_WEBHOOK_ENVIO_ADMIN: process.env.N8N_WEBHOOK_ENVIO_ADMIN || null,
  N8N_WEBHOOK_ENVIO_ALUMNOS: process.env.N8N_WEBHOOK_ENVIO_ALUMNOS || null,
  N8N_WEBHOOK_ENVIO_COMUNIDAD: process.env.N8N_WEBHOOK_ENVIO_COMUNIDAD || null,
  N8N_WEBHOOK_ENVIO_VENTAS: process.env.N8N_WEBHOOK_ENVIO_VENTAS || null,
  
  // Server
  PORT: parseInt(process.env.PORT || '3000', 10),
  NODE_ENV: process.env.NODE_ENV || 'development',
};

// Validar variables críticas
if (!environment.SUPABASE_URL || !environment.SUPABASE_SERVICE_KEY) {
  console.error('[Environment] ⚠️ Faltan variables de entorno críticas para Supabase');
}

// Log de webhooks configurados
console.log('[Environment] Webhooks configurados:');
console.log(`  - Derivación Admin: ${environment.N8N_WEBHOOK_DERIVACION_ADMIN ? '✅' : '❌'}`);
console.log(`  - Derivación Alumnos: ${environment.N8N_WEBHOOK_DERIVACION_ALUMNOS ? '✅' : '❌'}`);
console.log(`  - Derivación Ventas: ${environment.N8N_WEBHOOK_DERIVACION_VENTAS ? '✅' : '❌'}`);
console.log(`  - Derivación Comunidad: ${environment.N8N_WEBHOOK_DERIVACION_COMUNIDAD ? '✅' : '❌'}`);
console.log(`  - Envío WSP4: ${environment.N8N_WEBHOOK_ENVIO_WSP4 ? '✅' : '❌'}`);
console.log(`  - Envío Admin: ${environment.N8N_WEBHOOK_ENVIO_ADMIN ? '✅' : '❌'}`);
console.log(`  - Envío Alumnos: ${environment.N8N_WEBHOOK_ENVIO_ALUMNOS ? '✅' : '❌'}`);
console.log(`  - Envío Comunidad: ${environment.N8N_WEBHOOK_ENVIO_COMUNIDAD ? '✅' : '❌'}`);
console.log(`  - Envío Ventas: ${environment.N8N_WEBHOOK_ENVIO_VENTAS ? '✅' : '❌'}`);
