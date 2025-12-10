require('dotenv').config();
module.exports = {
  apps: [{
    name: 'psi-router',
    script: 'dist/index.js',
    cwd: '/opt/psi-vision-hub/centralwap-router',
    env: {
      NODE_ENV: 'production',
      PORT: process.env.PORT || '3000',
      
      // Supabase
      SUPABASE_URL: process.env.SUPABASE_URL,
      SUPABASE_SERVICE_KEY: process.env.SUPABASE_SERVICE_KEY,
      
      // Webhook legacy
      WEBHOOK_ENVIO_MENSAJE: process.env.WEBHOOK_ENVIO_MENSAJE,
      
      // Webhooks Derivación v3.3
      N8N_WEBHOOK_DERIVACION_ADMIN: process.env.N8N_WEBHOOK_DERIVACION_ADMIN,
      N8N_WEBHOOK_DERIVACION_ALUMNOS: process.env.N8N_WEBHOOK_DERIVACION_ALUMNOS,
      N8N_WEBHOOK_DERIVACION_VENTAS: process.env.N8N_WEBHOOK_DERIVACION_VENTAS,
      N8N_WEBHOOK_DERIVACION_COMUNIDAD: process.env.N8N_WEBHOOK_DERIVACION_COMUNIDAD,
      
      // Webhook Envío WSP4
      N8N_WEBHOOK_ENVIO_WSP4: process.env.N8N_WEBHOOK_ENVIO_WSP4
    },
    instances: 1,
    autorestart: true,
    watch: false,
    max_memory_restart: '1G',
    error_file: './logs/psi-router-error.log',
    out_file: './logs/psi-router-out.log',
    log_date_format: 'YYYY-MM-DD HH:mm:ss Z'
  }]
};
