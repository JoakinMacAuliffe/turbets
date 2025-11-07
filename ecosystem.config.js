module.exports = {
  apps: [{
    name: 'turbets',
    script: './server/server.js',
    instances: 1,
    autorestart: true,
    watch: false,
    max_memory_restart: '500M',
    env: {
      NODE_ENV: 'production'
    },
    error_file: '/root/.pm2/logs/turbets-error.log',
    out_file: '/root/.pm2/logs/turbets-out.log',
    log_date_format: 'YYYY-MM-DD HH:mm:ss Z',
    merge_logs: true,
    
    // Configuración de reintentos y estabilidad
    min_uptime: '10s',
    max_restarts: 10,
    restart_delay: 4000,
    
    // Kill timeout
    kill_timeout: 5000,
    listen_timeout: 10000,
    
    // Opciones de Node.js
    node_args: '--max-old-space-size=512'
  }]
};
