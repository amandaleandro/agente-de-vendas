module.exports = {
  apps: [
    {
      name: 'fezinha',
      script: './index.js',
      instances: 1, // Manter apenas 1 instância para WhatsApp
      autorestart: true,
      watch: false,
      max_memory_restart: '500M',
      env: {
        NODE_ENV: 'production',
        LOG_LEVEL: 'info',
        DEBUG: 'false',
      },
      env_development: {
        NODE_ENV: 'development',
        LOG_LEVEL: 'debug',
        DEBUG: 'true',
      },
      error_file: './logs/pm2-error.log',
      out_file: './logs/pm2-out.log',
      log_date_format: 'YYYY-MM-DD HH:mm:ss Z',
      merge_logs: true,

      // Monitoramento
      monitoring: true,
      health_check: {
        endpoint: 'http://localhost:3099/api/health',
        interval: 30000,
        timeout: 5000,
        failures: 3,
      },
    },
  ],

  deploy: {
    production: {
      user: 'node',
      host: 'seu-servidor.com',
      ref: 'origin/main',
      repo: 'seu-repositorio.git',
      path: '/var/www/fezinha',
      'post-deploy': 'npm install && npm start',
    },
  },
};
