// PM2 Ecosystem Configuration
// For process management with PM2

module.exports = {
  apps: [
    {
      name: 'wealth-wars-backend',
      script: './src/start-services.ts',
      cwd: './packages/backend',
      interpreter: 'node',
      interpreter_args: '--loader ts-node/esm',
      
      // Instances
      instances: 1,
      exec_mode: 'fork',
      
      // Restart policy
      autorestart: true,
      watch: false,
      max_restarts: 10,
      min_uptime: '10s',
      restart_delay: 5000,
      
      // Logging
      error_file: './packages/backend/logs/error.log',
      out_file: './packages/backend/logs/out.log',
      log_date_format: 'YYYY-MM-DD HH:mm:ss Z',
      merge_logs: true,
      
      // Environment
      env: {
        NODE_ENV: 'production',
        // Other env vars loaded from .env file
      },
      
      // Monitoring
      max_memory_restart: '2G',
      
      // Graceful shutdown
      kill_timeout: 10000,
      listen_timeout: 5000,
    }
  ]
};
