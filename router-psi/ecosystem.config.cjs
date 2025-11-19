const path = require('path');
const fs = require('fs');

// Cargar variables de entorno desde .env
const envPath = path.join(__dirname, '.env');
let envVars = {};

if (fs.existsSync(envPath)) {
  require('dotenv').config({ path: envPath });
  console.log(`✅ Archivo .env encontrado en: ${envPath}`);
} else {
  console.error(`❌ Archivo .env NO encontrado en: ${envPath}`);
}

// Copiar todas las variables de entorno necesarias
const envKeys = [
  'NODE_ENV', 'PORT', 'LOG_LEVEL', 'ANTILOOP_MINUTES',
  'WEBHOOK_VERIFY_TOKEN',
  'SUPABASE_URL', 'SUPABASE_ANON_KEY', 'SUPABASE_SERVICE_ROLE_KEY',
  'SUPABASE_STORAGE_BUCKET_AUDIOS', 'SUPABASE_STORAGE_BUCKET_DOCUMENTOS',
  'WHATSAPP_TOKEN', 'CLOUD_API_BASE_URL',
  'WSP4_PHONE_ID', 'VENTAS1_PHONE_ID', 'ADMIN_PHONE_ID', 'ALUMNOS_PHONE_ID', 'COMUNIDAD_PHONE_ID',
  'WSP4_NUMBER', 'VENTAS1_NUMBER',
  'N8N_WEBHOOK_ENVIOS_ROUTER_CRM', 'N8N_WEBHOOK_ENVIOS_ROUTER_ADMINISTRACION',
  'N8N_WEBHOOK_ENVIOS_ROUTER_ALUMNOS', 'N8N_WEBHOOK_ENVIOS_ROUTER_COMUNIDAD',
  'N8N_WEBHOOK_ENVIOS_ROUTER_VENTAS_1'
];

envKeys.forEach(key => {
  if (process.env[key]) {
    envVars[key] = process.env[key];
  } else {
    console.warn(`⚠️  Variable ${key} no encontrada en .env`);
  }
});

console.log(`📋 Variables cargadas: ${Object.keys(envVars).length} de ${envKeys.length}`);

module.exports = {
  apps: [
    {
      name: 'router-psi',
      script: './dist/app.js',
      cwd: __dirname,
      instances: 1,
      exec_mode: 'fork',
      env: {
        NODE_ENV: 'development',
        PORT: process.env.PORT || envVars.PORT || 3002,
        ...envVars,
      },
      env_production: {
        NODE_ENV: 'production',
        PORT: process.env.PORT || envVars.PORT || 3002,
        ...envVars,
      },
      watch: false,
      autorestart: true,
      max_memory_restart: '512M',
      out_file: './logs/pm2-out.log',
      error_file: './logs/pm2-error.log',
      merge_logs: true,
    },
  ],
};

