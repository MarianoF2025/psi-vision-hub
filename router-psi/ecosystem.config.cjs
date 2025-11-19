const path = require('path');
const fs = require('fs');

// Cargar variables de entorno desde .env si existe
let envVars = {};
const envPath = path.join(__dirname, '.env');
if (fs.existsSync(envPath)) {
  const envContent = fs.readFileSync(envPath, 'utf8');
  envContent.split('\n').forEach(line => {
    const trimmed = line.trim();
    if (trimmed && !trimmed.startsWith('#')) {
      const [key, ...valueParts] = trimmed.split('=');
      if (key && valueParts.length > 0) {
        const value = valueParts.join('=').replace(/^["']|["']$/g, '');
        envVars[key.trim()] = value.trim();
      }
    }
  });
}

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

