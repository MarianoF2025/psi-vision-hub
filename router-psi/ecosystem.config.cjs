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
        PORT: process.env.PORT || 3002,
      },
      env_production: {
        NODE_ENV: 'production',
        PORT: process.env.PORT || 3002,
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

